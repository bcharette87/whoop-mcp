import express, { Request, Response } from "express";
import crypto from "node:crypto";
import { createWhoopClient } from "./api/client.js";
import { createWhoopServer } from "./server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 8080;
const BASE_URL = process.env.WHOOP_REDIRECT_URI?.replace("/callback", "") || `http://localhost:${PORT}`;
const CLIENT_ID = process.env.WHOOP_CLIENT_ID!;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET!;
const REDIRECT_URI = process.env.WHOOP_REDIRECT_URI!;

const tokenStore = new Map<string, string>();
const pendingStates = new Map<string, string>();

// Session MCP persistante par token
interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createWhoopServer>;
}
const mcpSessions = new Map<string, McpSession>();

app.get("/.well-known/oauth-authorization-server", (_req: Request, res: Response): void => {
  res.json({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/authorize`,
    token_endpoint: `${BASE_URL}/token`,
    registration_endpoint: `${BASE_URL}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
  });
});

app.get("/.well-known/oauth-protected-resource", (_req: Request, res: Response): void => {
  res.json({
    resource: BASE_URL,
    authorization_servers: [BASE_URL],
  });
});

app.post("/register", (req: Request, res: Response): void => {
  const clientId = `claude-${crypto.randomUUID()}`;
  res.status(201).json({
    client_id: clientId,
    client_secret: "not-used",
    redirect_uris: (req.body as Record<string, string[]>)?.redirect_uris || [],
  });
});

app.get("/authorize", (req: Request, res: Response): void => {
  const { state, redirect_uri } = req.query as Record<string, string>;
  const whoopAuthUrl =
    `https://api.prod.whoop.com/oauth/oauth2/auth` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=read:recovery+read:cycles+read:sleep+read:workout+read:profile+read:body_measurement+offline` +
    `&state=${state}`;
  if (state && redirect_uri) {
    pendingStates.set(state, redirect_uri);
  }
  res.redirect(whoopAuthUrl);
});

app.get("/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query as Record<string, string | undefined>;
  try {
    const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code ?? "",
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    const tokens = await tokenRes.json() as { access_token: string };
    const sessionToken = crypto.randomUUID();
    tokenStore.set(sessionToken, tokens.access_token);
    const redirectUri = state ? pendingStates.get(state) : undefined;
    if (redirectUri && state) {
      pendingStates.delete(state);
      const separator = redirectUri.includes("?") ? "&" : "?";
      res.redirect(`${redirectUri}${separator}code=${sessionToken}&state=${state}`);
      return;
    }
    res.send("✅ Connexion WHOOP réussie!");
  } catch (_err) {
    res.status(500).send("Erreur lors de l'authentification WHOOP.");
  }
});

app.post("/token", (req: Request, res: Response): void => {
  const body = req.body as Record<string, string>;
  const code = body?.code;
  const whoopAccessToken = code ? tokenStore.get(code) : undefined;
  
  console.log("Token exchange - code:", code?.substring(0, 20));
  console.log("Token exchange - whoopToken found:", !!whoopAccessToken);
  console.log("Token exchange - whoopToken preview:", whoopAccessToken?.substring(0, 30));
  
  if (!whoopAccessToken || !code) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  // Créer un nouveau token de session et l'associer au vrai token WHOOP
  const newSessionToken = crypto.randomUUID();
  tokenStore.set(newSessionToken, whoopAccessToken);
  
  console.log("Token exchange - new session token:", newSessionToken.substring(0, 20));
  
  res.json({
    access_token: newSessionToken,
    token_type: "bearer",
    expires_in: 3600,
    scope: "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline",
  });
});

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization ?? "";
  const bearerToken = authHeader.replace("Bearer ", "").trim();
  const whoopToken = tokenStore.get(bearerToken);

  console.log("MCP - method:", req.method, "whoopToken found:", !!whoopToken);
  console.log("MCP - body:", JSON.stringify(req.body)?.substring(0, 200));
  console.log("MCP - mcp-session-id header:", req.headers["mcp-session-id"]);

  if (!whoopToken) {
    res.setHeader("WWW-Authenticate", `Bearer realm="${BASE_URL}"`);
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let session = sessionId ? mcpSessions.get(sessionId) : undefined;
  
  if (!session) {
    console.log("MCP - creating new session");
    const client = createWhoopClient({
      accessToken: whoopToken,
      onTokenRefresh: async () => whoopToken,
    });
    const server = createWhoopServer(client);
    const newSessionId = crypto.randomUUID();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });
    await server.connect(transport);
    session = { transport, server };
    mcpSessions.set(newSessionId, session);
    // Aussi indexer par bearerToken pour retrouver la session
    mcpSessions.set(bearerToken, session);
    res.setHeader("mcp-session-id", newSessionId);
  }

  await session.transport.handleRequest(req, res, req.body);
}

  // Créer ou réutiliser la session MCP
  let session = mcpSessions.get(bearerToken);
  if (!session) {
    console.log("MCP - creating new session");
    const client = createWhoopClient({
      accessToken: whoopToken,
      onTokenRefresh: async () => whoopToken,
    });
    const server = createWhoopServer(client);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    await server.connect(transport);
    session = { transport, server };
    mcpSessions.set(bearerToken, session);
  }

  await session.transport.handleRequest(req, res, req.body);
}

app.post("/mcp", handleMcpRequest);
app.get("/mcp", handleMcpRequest);
app.delete("/mcp", handleMcpRequest);
app.post("/", handleMcpRequest);
app.get("/", handleMcpRequest);

app.listen(PORT, () => {
  console.log(`Whoop MCP server running on http://0.0.0.0:${PORT}`);
});
