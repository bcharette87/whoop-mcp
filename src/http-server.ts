import express, { Request, Response } from "express";
import crypto from "node:crypto";
import { createWhoopClient } from "./api/client.js";
import { createWhoopServer } from "./server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const BASE_URL = process.env.WHOOP_REDIRECT_URI?.replace("/callback", "") || `http://localhost:${PORT}`;
const CLIENT_ID = process.env.WHOOP_CLIENT_ID!;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET!;
const REDIRECT_URI = process.env.WHOOP_REDIRECT_URI!;

const tokenStore = new Map<string, string>();
const pendingStates = new Map<string, string>();

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
    redirect_uris: req.body?.redirect_uris || [],
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
    res.send("✅ Connexion WHOOP réussie! Retourne dans Claude et réessaie.");
  } catch (_err) {
    res.status(500).send("Erreur lors de l'authentification WHOOP.");
  }
});

app.post("/token", express.urlencoded({ extended: false }), (req: Request, res: Response): void => {
  const body = req.body as Record<string, string>;
  const code = body?.code ?? (req.query as Record<string, string>)?.code;
  
  console.log("Token request - code:", code);
  console.log("Token store has code:", code ? tokenStore.has(code) : false);
  
  const accessToken = code ? tokenStore.get(code) : undefined;
  
  console.log("Access token found:", !!accessToken);
  
  if (!accessToken) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }
  res.json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    scope: "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline",
  });
});

app.all("/mcp", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const sessionToken = authHeader.replace("Bearer ", "");
  const accessToken = tokenStore.get(sessionToken);
  if (!accessToken) {
    res.setHeader("WWW-Authenticate", `Bearer realm="${BASE_URL}"`);
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const client = createWhoopClient({ accessToken, onTokenRefresh: async () => accessToken });
  const server = createWhoopServer(client);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Route racine pour MCP
app.post("/", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const sessionToken = authHeader.replace("Bearer ", "");
  const accessToken = tokenStore.get(sessionToken);
  if (!accessToken) {
    res.setHeader("WWW-Authenticate", `Bearer realm="${BASE_URL}"`);
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const client = createWhoopClient({ accessToken, onTokenRefresh: async () => accessToken });
  const server = createWhoopServer(client);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const sessionToken = authHeader.replace("Bearer ", "");
  const accessToken = tokenStore.get(sessionToken);
  if (!accessToken) {
    res.setHeader("WWW-Authenticate", `Bearer realm="${BASE_URL}"`);
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const client = createWhoopClient({ accessToken, onTokenRefresh: async () => accessToken });
  const server = createWhoopServer(client);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(PORT, () => {
  console.log(`Whoop MCP server running on http://0.0.0.0:${PORT}`);
});
