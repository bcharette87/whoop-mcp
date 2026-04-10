# Project: whoop-mcp

An MCP (Model Context Protocol) server that wraps the WHOOP REST API, enabling AI assistants to query health and fitness data through natural conversation.

## Tech Stack

- **Language:** TypeScript ~5.x (strict mode, no `any`)
- **Runtime:** Node.js >= 18 (native `fetch`)
- **MCP SDK:** `@modelcontextprotocol/sdk` (latest)
- **Validation:** Zod (for MCP tool input schemas)
- **Test Framework:** Vitest
- **Lint:** ESLint + `@typescript-eslint`
- **Formatter:** Prettier
- **Build:** `tsc` (no bundler)
- **Package Manager:** npm
- **No other runtime dependencies.** Keep the dependency tree minimal.

## Commands

```bash
npm install          # Install dependencies
npm run build        # Build TypeScript
npm run dev          # Run in development (tsx)
npm test             # Run tests
npm test -- --coverage  # Tests with coverage
npm run lint         # Lint
npm run lint:fix     # Lint + fix
npm run format       # Format with Prettier
npm run typecheck    # Type check (no emit)
node dist/index.js   # Run MCP server (production)
```

## Project Structure

```
src/
├── index.ts                    # Entry point — creates MCP server, authenticates, starts stdio
├── server.ts                   # MCP server setup and tool registration
├── auth/
│   ├── oauth.ts                # OAuth2 Authorization Code flow
│   ├── token-store.ts          # Read/write/refresh tokens (~/.whoop-mcp/tokens.json)
│   └── callback-server.ts      # Temporary local HTTP server for OAuth callback
├── api/
│   ├── client.ts               # WHOOP API HTTP client (fetch + auth headers + retry)
│   ├── types.ts                # TypeScript types for all WHOOP API responses
│   └── endpoints.ts            # Endpoint URL constants
└── tools/
    ├── get-profile.ts          # Tool: get_profile
    ├── get-recovery.ts         # Tool: get_recovery_collection
    ├── get-sleep.ts            # Tool: get_sleep_collection
    ├── get-workout.ts          # Tool: get_workout_collection
    ├── get-cycle.ts            # Tool: get_cycle_collection
    └── get-body-measurement.ts # Tool: get_body_measurement

tests/                          # Mirrors src/ structure
├── auth/
├── api/
└── tools/
```

## Code Conventions

### Naming
- **Files:** `kebab-case.ts`
- **Types/Interfaces:** `PascalCase` (e.g., `RecoveryRecord`, `SleepCollection`)
- **Functions:** `camelCase` (e.g., `getRecoveryCollection`)
- **Constants:** `SCREAMING_SNAKE_CASE` (e.g., `WHOOP_API_BASE_URL`)
- **MCP tool names:** `snake_case` (MCP convention, e.g., `get_recovery_collection`)

### Patterns
- Explicit return types on all exported functions
- Zod for tool input validation (MCP SDK convention)
- One tool per file — handler + schema co-located
- Functional style — no classes except where SDK requires
- Named exports (no default exports)
- Errors throw typed errors, never return error codes
- Tests co-located in `tests/` directory mirroring `src/`

### Example — Tool Implementation Pattern

```typescript
// src/tools/get-recovery.ts
import { z } from "zod";
import { WhoopClient } from "../api/client.js";
import type { RecoveryCollection } from "../api/types.js";

export const getRecoveryCollectionSchema = {
  name: "get_recovery_collection",
  description:
    "Get recovery scores for a date range. Returns HRV, resting heart rate, SpO2, and skin temp.",
  inputSchema: z.object({
    start: z.string().optional().describe("ISO 8601 start time (inclusive)"),
    end: z.string().optional().describe("ISO 8601 end time (exclusive)"),
    limit: z.number().optional().describe("Max records (1-25). Default 10."),
  }),
};

export async function getRecoveryCollection(
  client: WhoopClient,
  params: { start?: string; end?: string; limit?: number }
): Promise<RecoveryCollection> {
  const searchParams = new URLSearchParams();
  if (params.start) searchParams.set("start", params.start);
  if (params.end) searchParams.set("end", params.end);
  if (params.limit) searchParams.set("limit", String(params.limit));
  return client.get<RecoveryCollection>(`/v2/recovery?${searchParams.toString()}`);
}
```

## Testing

- **TDD:** Write tests before code (Prove-It pattern for bugs)
- **Mock the WHOOP API:** Never hit the real API in tests. Use `vi.fn()` to mock `fetch`.
- **Test hierarchy:** unit > integration > e2e (use the lowest level that captures the behavior)
- **Coverage target:** >80% on `src/auth/` and `src/api/`, >70% overall
- **Run `npm test` after every change**

## WHOOP API Reference

- **Base URL:** `https://api.prod.whoop.com/developer`
- **OAuth Auth URL:** `https://api.prod.whoop.com/oauth/oauth2/auth`
- **OAuth Token URL:** `https://api.prod.whoop.com/oauth/oauth2/token`
- **Required Scopes:** `read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement`
- **All endpoints use v2.** Date params use ISO 8601. Collections default `limit=10` (max 25).

| MCP Tool | Endpoint | Method |
|----------|----------|--------|
| `get_profile` | `/v2/user/profile/basic` | GET |
| `get_recovery_collection` | `/v2/recovery` | GET |
| `get_sleep_collection` | `/v2/activity/sleep` | GET |
| `get_workout_collection` | `/v2/activity/workout` | GET |
| `get_cycle_collection` | `/v2/cycle` | GET |
| `get_body_measurement` | `/v2/user/measurement/body` | GET |

## Boundaries

### Always
- Run `npm test` before every commit
- Validate all tool input with Zod schemas
- Store tokens in `~/.whoop-mcp/` with `0600` permissions
- Return helpful error messages (Claude needs to understand failures)
- Build in small, verifiable increments: implement → test → verify → commit

### Ask First
- Adding any runtime dependency beyond `@modelcontextprotocol/sdk` and `zod`
- Changing the token storage location or format
- Adding WHOOP API endpoints not in the MVP 6 tools
- Changing the OAuth flow
- Database schema changes

### Never
- Commit `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, or tokens
- Store tokens in a world-readable location
- Make real WHOOP API calls in automated tests
- Use `any` — strict TypeScript throughout
- Remove or skip failing tests without discussion
- Mix formatting changes with behavior changes

## Implementation Status

> **Current phase:** Tasks 1–3 complete — scaffold, API types, and token store in place.
> **Next task:** Task 4 — API Client (`src/api/client.ts`)
> **Plan:** `docs/plans/task-4-api-client.md`
> **Spec:** `docs/specs/whoop-mcp-server.md`
> **Implementation plan:** `docs/specs/implementation-plan.md`

## Active Task Context: Task 4 — API Client

### What We're Building
Thin HTTP client wrapper around native `fetch` for the WHOOP REST API. Injects OAuth Bearer token, prepends base URL, parses JSON, throws typed errors on non-2xx. No retry/re-auth — that's Task 8.

### API Surface
```typescript
interface WhoopClientOptions {
  accessToken: string;
  baseUrl?: string;        // defaults to WHOOP_API_BASE_URL — override for tests
}

interface WhoopClient {
  get<T>(path: string): Promise<T>;
}

class WhoopApiError extends Error {
  statusCode: number;
  statusText: string;
  body: unknown;
}

function createWhoopClient(options: WhoopClientOptions): WhoopClient;
```

### Files to Create
- `src/api/client.ts` — exports: `WhoopClient`, `WhoopClientOptions`, `WhoopApiError`, `createWhoopClient`
- `tests/api/client.test.ts` — tests for all of the above

### Key Design Decisions
- **Functional factory** `createWhoopClient()` returns `WhoopClient` object — no class for the client itself
- **`WhoopApiError` is a class** — enables `instanceof` checks, carries `statusCode`, `statusText`, `body`
- **`get<T>(path)`** is the only method — all 6 WHOOP endpoints are GET-only
- **Base URL prepended** — paths like `/v2/recovery` are relative, client adds `WHOOP_API_BASE_URL`
- **Token at construction** — `accessToken` passed once; new client created after refresh
- **No retry in MVP** — 429/401 handling is Task 8; the client just throws `WhoopApiError`
- **`baseUrl` override** — tests set a custom base URL to avoid prod URL in assertions

### Subtask Order (TDD — tests first)
1. **4a:** `WhoopApiError` class + tests (extends Error, carries structured data)
2. **4b:** `createWhoopClient()` + `get<T>()` happy path + tests (mocked fetch, auth header, JSON parse)
3. **4c:** Error handling for non-2xx + tests (401, 429, 500 → throw WhoopApiError)
4. **4d:** Edge cases + tests (network error, non-JSON error body, exports verification)
5. **4e:** Full pipeline green

### Dependencies (already complete)
- `src/api/endpoints.ts` ✅ — `WHOOP_API_BASE_URL` constant
- `src/api/types.ts` ✅ — response types used as `T` in `get<T>()`
- `src/auth/token-store.ts` ✅ — `OAuthTokens.access_token` passed to client at creation

### Consumed By (don't build these yet)
- `src/tools/*.ts` (Task 7a-7f) — `client.get<RecoveryCollection>(path)`
- `src/api/client.ts` (Task 8) — adds retry/re-auth wrapping
- `src/auth/oauth.ts` (Task 5) — may use client for token exchange

### Gotchas
- Mock `fetch` with `vi.stubGlobal("fetch", vi.fn())` — works with Node 18+ native fetch
- Error body: try `response.json()`, fall back to `response.text()` — WHOOP may return non-JSON errors
- Don't import token-store — the access token string is passed in, keeping client decoupled
- Spec example shows `WhoopClient` used as a type in tool signatures — match that interface shape

### Verification
```bash
npm test -- tests/api/client.test.ts       # After each subtask
npm test && npm run typecheck && npm run lint && npm run build  # After 4e (final)
```

## Implementation Order

1. Project scaffold (package.json, tsconfig, eslint, vitest)
2. WHOOP API types (`src/api/types.ts`, `src/api/endpoints.ts`)
3. Token store (`src/auth/token-store.ts`)
4. API client (`src/api/client.ts`)
5. OAuth flow (`src/auth/oauth.ts`, `src/auth/callback-server.ts`)
6. MCP server shell (`src/server.ts`)
7. Tool implementations (7a-7f, can be parallel after step 6)
8. Error handling (retry 429, re-auth 401)
9. Entry point + CLI (`src/index.ts`)
10. Docs + publish prep
