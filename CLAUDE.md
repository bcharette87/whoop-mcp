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

> **Current phase:** Tasks 1–2 complete — scaffold + API types in place.
> **Next task:** Task 3 — Token Store (`src/auth/token-store.ts`)
> **Plan:** `docs/plans/task-3-token-store.md`
> **Spec:** `docs/specs/whoop-mcp-server.md`
> **Implementation plan:** `docs/specs/implementation-plan.md`

## Active Task Context: Task 3 — Token Store

### What We're Building
File-based OAuth token storage at `~/.whoop-mcp/tokens.json`. Pure I/O module: save, load, delete tokens + expiry check. No dependencies on API client or OAuth — they depend on it.

### Token Shape
```typescript
interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;    // Unix epoch milliseconds (computed: Date.now() + expires_in * 1000)
  token_type: string;    // Typically "Bearer"
}
```

### Files to Create
- `src/auth/token-store.ts` — exports: `OAuthTokens` type, `isTokenExpired()`, `saveTokens()`, `loadTokens()`, `deleteTokens()`
- `tests/auth/token-store.test.ts` — tests for all of the above

### Key Design Decisions
- **`expires_at` (absolute ms)** not `expires_in` (relative) — makes expiry check a pure comparison
- **60-second buffer** on expiry — tokens considered expired 60s early to avoid mid-request failures
- **Directory `0700`, file `0600`** — security requirement (user-only access)
- **`loadTokens()` returns `null`** on missing file or invalid JSON — never throws
- **`deleteTokens()` is a no-op** if file doesn't exist — never throws
- **All functions accept optional `tokenDir`** override for testing (default: `~/.whoop-mcp/`)
- **Functional style** — no classes, named exports only
- **Tests use temp directories** — never touch `~/.whoop-mcp/`

### Subtask Order (TDD — tests first)
1. **3a:** `OAuthTokens` interface + `isTokenExpired()` pure function + tests
2. **3b:** `saveTokens()` + tests (creates dir 0700, writes file 0600)
3. **3c:** `loadTokens()` + tests (returns null on missing/malformed, round-trip with save)
4. **3d:** `deleteTokens()` + tests (removes file, no-op if missing)
5. **3e:** Verify `tokenDir` override works, full pipeline green

### Consumed By (don't build these yet)
- `src/auth/oauth.ts` (Task 5) — saves/reads tokens after auth flow
- `src/api/client.ts` (Task 4) — reads access_token for Authorization header
- `src/index.ts` (Task 9) — checks if tokens exist on startup

### Gotchas
- Use `node:fs/promises` (not `fs`) for async I/O
- Use `node:os` for `homedir()`, `node:path` for `join()`
- `isTokenExpired()` must be testable with fixed timestamps — accept optional `now` param or use `vi.useFakeTimers()`
- File permission tests: use `fs.stat()` to verify, may behave differently on CI
- Clean up temp dirs in `afterEach` with `fs.rm(dir, { recursive: true })`

### Verification
```bash
npm test -- tests/auth/token-store.test.ts  # After each subtask
npm test && npm run typecheck && npm run lint && npm run build  # After 3e (final)
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
