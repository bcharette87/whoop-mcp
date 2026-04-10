# Implementation Plan: WHOOP MCP Server

> Spec: `docs/specs/whoop-mcp-server.md`
> Created: 2026-04-10

---

## Phase 2: Plan — Technical Implementation Order

### Dependency Graph

```
                    ┌─────────────┐
                    │  1. Scaffold │ (package.json, tsconfig, eslint, vitest)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  2. Types    │ (WHOOP API response types)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐  ┌─▼──────────┐ │
       │  3. Token    │  │ 4. API     │ │
       │    Store     │  │   Client   │ │
       └──────┬──────┘  └─┬──────────┘ │
              │            │            │
       ┌──────▼──────┐    │            │
       │  5. OAuth    │────┘            │
       │    Flow      │                 │
       └──────┬──────┘                  │
              │                         │
       ┌──────▼─────────────────────────▼┐
       │  6. MCP Server + Tool Registration │
       └──────┬──────────────────────────┘
              │
    ┌─────────┼──────────┬──────────┬──────────┬──────────┐
    │         │          │          │          │          │
┌───▼──┐ ┌───▼──┐ ┌────▼───┐ ┌───▼──┐ ┌────▼───┐ ┌───▼────┐
│ 7a.  │ │ 7b.  │ │  7c.   │ │ 7d.  │ │  7e.   │ │  7f.   │
│Profile│ │Recov.│ │ Sleep  │ │Work. │ │ Cycle  │ │Body M. │
└──────┘ └──────┘ └────────┘ └──────┘ └────────┘ └────────┘
              │
       ┌──────▼──────┐
       │  8. Error    │ (rate limit retry, auth error handling)
       │   Handling   │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │  9. Entry    │ (index.ts, bin config, stdio transport)
       │   Point      │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │  10. Docs    │ (README, .env.example, LICENSE)
       │   + Publish  │
       └─────────────┘
```

### Implementation Order & Rationale

| # | Component | Why this order | Risk |
|---|-----------|---------------|------|
| **1** | Project scaffold | Everything depends on having a buildable, testable TypeScript project | 🟢 Low |
| **2** | WHOOP API types | Types are shared across all modules — define the contract first | 🟢 Low |
| **3** | Token store | Isolated module, no external dependencies, fully unit-testable | 🟢 Low |
| **4** | API client | Depends on types. Fetch wrapper with auth header injection. Testable with mocked fetch | 🟢 Low |
| **5** | OAuth flow | Depends on token store + API client. This is the hardest module — browser redirect, callback server, token exchange | 🟡 Medium |
| **6** | MCP server shell | Register tools with `@modelcontextprotocol/sdk`, wire up the server with stdio transport. No tool logic yet — just the skeleton | 🟢 Low |
| **7a-f** | Tool implementations | Each tool is independent. Can be built in parallel. Each depends on API client + types | 🟢 Low |
| **8** | Error handling | Cross-cutting: rate limit retry (429), auth error re-prompt (401), network errors. Applied to API client | 🟡 Medium |
| **9** | Entry point + CLI | Wire everything together. `index.ts` creates server, authenticates, starts stdio. `bin` field in package.json for `npx` | 🟢 Low |
| **10** | Docs + publish | README, .env.example, Claude Desktop config example, npm publish | 🟢 Low |

### What Can Be Parallel vs. Sequential

- **Sequential (must be in order):** 1 → 2 → 3 → 4 → 5 → 6 → 9 → 10
- **Parallel (after step 6):** All 6 tool implementations (7a-7f) can be built independently
- **Parallel (after step 4):** Error handling (8) can start alongside OAuth (5)

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| OAuth callback doesn't work in Claude Desktop's stdio lifecycle | 🔴 Blocks everything | Test OAuth flow standalone first (step 5), before wiring into MCP server |
| WHOOP API rate limits are very aggressive | 🟡 Degraded UX | Implement retry-after header parsing in error handling (step 8) |
| `@modelcontextprotocol/sdk` API has changed since we last checked | 🟡 Rework | Pin SDK version in package.json, check docs before starting step 6 |
| Token file permissions on Windows | 🟡 Cross-platform | Use `0600` on Unix, document Windows limitation. Single-platform (macOS) for MVP. |

### Verification Checkpoints

| After Step | Verification |
|------------|-------------|
| **1** | `npm run build` succeeds, `npm test` runs (0 tests, but framework works) |
| **3** | `npm test` — token store tests pass (read/write/refresh/file permissions) |
| **4** | `npm test` — API client tests pass (mocked fetch, auth headers, error codes) |
| **5** | `npm test` — OAuth tests pass. **Manual test:** run OAuth flow in terminal, authenticate with real WHOOP account, verify tokens saved |
| **6** | `npm run build` — MCP server compiles. Can list tools via MCP inspector |
| **7f** | `npm test` — all 6 tool tests pass |
| **8** | `npm test` — error handling tests pass (429 retry, 401 re-auth) |
| **9** | **Manual test:** `node dist/index.js` starts MCP server via stdio. Test with MCP inspector or Claude Desktop |
| **10** | README is complete. `npx whoop-mcp` works from a clean install. |

---

## Phase 3: Tasks

### Task 1: Project Scaffold
- [ ] **Task:** Initialize TypeScript project with build, test, lint, and format tooling
  - **Acceptance:** `npm run build`, `npm test`, `npm run lint`, `npm run format`, `npm run typecheck` all execute successfully
  - **Verify:** `npm run build && npm test && npm run typecheck`
  - **Files:**
    - `package.json` — scripts, dependencies, devDependencies, bin, main, types
    - `tsconfig.json` — strict mode, ESNext, NodeNext module resolution
    - `.eslintrc.json` — TypeScript ESLint config
    - `.prettierrc` — formatting rules
    - `.gitignore` — node_modules, dist, .env, *.tsbuildinfo
    - `.env.example` — WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REDIRECT_URI
    - `vitest.config.ts` — test configuration
    - `src/index.ts` — placeholder entry point (empty main function)

### Task 2: WHOOP API Types
- [ ] **Task:** Define TypeScript types for all WHOOP API responses used by our 6 tools
  - **Acceptance:** All types compile, match the WHOOP API OpenAPI spec, and cover the response shapes for profile, recovery, sleep, workout, cycle, and body measurement
  - **Verify:** `npm run typecheck`
  - **Files:**
    - `src/api/types.ts` — all WHOOP response types
    - `src/api/endpoints.ts` — endpoint URL constants and base URL

### Task 3: Token Store
- [ ] **Task:** Implement file-based token storage at `~/.whoop-mcp/tokens.json` with read, write, delete, and token expiry checking
  - **Acceptance:** Can save tokens, read them back, detect expired tokens, and file has `0600` permissions
  - **Verify:** `npm test -- tests/auth/token-store.test.ts`
  - **Files:**
    - `src/auth/token-store.ts`
    - `tests/auth/token-store.test.ts`

### Task 4: API Client
- [ ] **Task:** Build HTTP client wrapper around native `fetch` that injects OAuth bearer tokens and handles response parsing
  - **Acceptance:** Client sends correct Authorization header, parses JSON responses, throws typed errors for 4xx/5xx status codes
  - **Verify:** `npm test -- tests/api/client.test.ts`
  - **Files:**
    - `src/api/client.ts`
    - `tests/api/client.test.ts`

### Task 5: OAuth2 Flow
- [ ] **Task:** Implement OAuth2 Authorization Code flow with local callback server, browser open, code exchange, and token refresh
  - **Acceptance:** Full auth flow works: opens browser → user authorizes → callback captures code → exchanges for tokens → saves to token store. Refresh flow works when access token expires.
  - **Verify:** `npm test -- tests/auth/oauth.test.ts` + manual test with real WHOOP credentials
  - **Files:**
    - `src/auth/oauth.ts` — orchestrates the full flow
    - `src/auth/callback-server.ts` — temporary HTTP server for OAuth redirect
    - `tests/auth/oauth.test.ts`

### Task 6: MCP Server Shell
- [ ] **Task:** Set up MCP server with `@modelcontextprotocol/sdk`, register all 6 tools with their schemas (handlers as stubs initially)
  - **Acceptance:** MCP server starts on stdio transport, lists 6 tools with correct names and input schemas
  - **Verify:** `npm run build` + test with MCP inspector (`npx @modelcontextprotocol/inspector`)
  - **Files:**
    - `src/server.ts` — server creation and tool registration

### Task 7a: Tool — get_profile
- [ ] **Task:** Implement `get_profile` tool handler
  - **Acceptance:** Calls `/v2/user/profile/basic`, returns `{ user_id, email, first_name, last_name }`
  - **Verify:** `npm test -- tests/tools/get-profile.test.ts`
  - **Files:**
    - `src/tools/get-profile.ts`
    - `tests/tools/get-profile.test.ts`

### Task 7b: Tool — get_recovery_collection
- [ ] **Task:** Implement `get_recovery_collection` tool handler
  - **Acceptance:** Calls `/v2/recovery` with optional `start`, `end`, `limit` params. Returns paginated recovery records with scores.
  - **Verify:** `npm test -- tests/tools/get-recovery.test.ts`
  - **Files:**
    - `src/tools/get-recovery.ts`
    - `tests/tools/get-recovery.test.ts`

### Task 7c: Tool — get_sleep_collection
- [ ] **Task:** Implement `get_sleep_collection` tool handler
  - **Acceptance:** Calls `/v2/activity/sleep` with optional `start`, `end`, `limit` params. Returns paginated sleep records.
  - **Verify:** `npm test -- tests/tools/get-sleep.test.ts`
  - **Files:**
    - `src/tools/get-sleep.ts`
    - `tests/tools/get-sleep.test.ts`

### Task 7d: Tool — get_workout_collection
- [ ] **Task:** Implement `get_workout_collection` tool handler
  - **Acceptance:** Calls `/v2/activity/workout` with optional `start`, `end`, `limit` params. Returns paginated workout records.
  - **Verify:** `npm test -- tests/tools/get-workout.test.ts`
  - **Files:**
    - `src/tools/get-workout.ts`
    - `tests/tools/get-workout.test.ts`

### Task 7e: Tool — get_cycle_collection
- [ ] **Task:** Implement `get_cycle_collection` tool handler
  - **Acceptance:** Calls `/v2/cycle` with optional `start`, `end`, `limit` params. Returns paginated cycle records.
  - **Verify:** `npm test -- tests/tools/get-cycle.test.ts`
  - **Files:**
    - `src/tools/get-cycle.ts`
    - `tests/tools/get-cycle.test.ts`

### Task 7f: Tool — get_body_measurement
- [ ] **Task:** Implement `get_body_measurement` tool handler
  - **Acceptance:** Calls `/v2/user/measurement/body`. Returns `{ height_meter, weight_kilogram, max_heart_rate }`.
  - **Verify:** `npm test -- tests/tools/get-body-measurement.test.ts`
  - **Files:**
    - `src/tools/get-body-measurement.ts`
    - `tests/tools/get-body-measurement.test.ts`

### Task 8: Error Handling
- [ ] **Task:** Add retry logic for rate limits (429) and re-auth prompting for expired tokens (401) to the API client
  - **Acceptance:** 429 responses trigger retry with backoff (respects `Retry-After` header). 401 responses trigger token refresh, and if refresh fails, prompt user to re-authenticate. Network errors produce clear error messages.
  - **Verify:** `npm test -- tests/api/client.test.ts` (error path tests)
  - **Files:**
    - `src/api/client.ts` (modify — add retry/re-auth logic)
    - `tests/api/client.test.ts` (modify — add error path tests)

### Task 9: Entry Point + CLI
- [ ] **Task:** Wire everything together in `index.ts`. Start OAuth if needed, create API client, create MCP server, connect tools, start stdio transport.
  - **Acceptance:** `node dist/index.js` starts the MCP server. `npx whoop-mcp` works after npm publish. Claude Desktop can connect to it.
  - **Verify:** `npm run build && node dist/index.js` (manual test) + Claude Desktop config test
  - **Files:**
    - `src/index.ts` (modify — full implementation)
    - `package.json` (modify — ensure `bin` field is correct)

### Task 10: Documentation + Publish Prep
- [ ] **Task:** Write comprehensive README, finalize .env.example, add LICENSE, prepare for npm publish
  - **Acceptance:** README includes: description, features list, quickstart (Claude Desktop config), all available tools with descriptions, environment setup, contributing guide. Package is ready for `npm publish`.
  - **Verify:** Manual review. `npm pack` produces a clean tarball.
  - **Files:**
    - `README.md` (rewrite)
    - `LICENSE`
    - `package.json` (modify — description, keywords, repository, license fields)

---

## Execution Schedule

### Day 1 (Saturday): Foundation + Core
| Time | Tasks | Checkpoint |
|------|-------|-----------|
| Morning | Task 1 (Scaffold) + Task 2 (Types) | `npm run build && npm test` passes |
| Midday | Task 3 (Token Store) + Task 4 (API Client) | All unit tests pass |
| Afternoon | Task 5 (OAuth Flow) | Manual auth test with real WHOOP account |
| Evening | Task 6 (MCP Server Shell) + Task 7a (Profile) + Task 7b (Recovery) | MCP server starts, 2 tools work |

### Day 2 (Sunday): Complete + Ship
| Time | Tasks | Checkpoint |
|------|-------|-----------|
| Morning | Task 7c (Sleep) + Task 7d (Workout) + Task 7e (Cycle) + Task 7f (Body) | All 6 tools pass tests |
| Midday | Task 8 (Error Handling) + Task 9 (Entry Point) | End-to-end manual test works |
| Afternoon | Task 10 (Docs + Publish) | `npm pack` clean, README complete |
| Evening | Final test in Claude Desktop 🚀 | "How was my recovery this week?" gets a real answer |
