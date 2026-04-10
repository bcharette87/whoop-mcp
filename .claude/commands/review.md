---
description: Conduct a five-axis code review — correctness, readability, architecture, security, performance
---

Invoke the code-review-and-quality skill.

Review the current changes (staged, recent commits, or specified scope) across all five axes, tailored to this WHOOP MCP project:

1. **Correctness**
   - Does the code match the WHOOP API spec? Are endpoint URLs and response types correct?
   - Edge cases handled? Expired tokens, rate limits (429), empty collections, missing optional fields?
   - Tests adequate? Coverage targets met (>80% auth/api, >70% overall)?
   - Do Zod schemas match the WHOOP API's actual response shapes?

2. **Readability**
   - Naming conventions followed? `kebab-case` files, `PascalCase` types, `camelCase` functions, `snake_case` MCP tools, `SCREAMING_SNAKE_CASE` constants?
   - Clear, straightforward logic? No unnecessary complexity?
   - Consistent with existing patterns in the codebase?

3. **Architecture**
   - One tool per file with co-located Zod schema?
   - Functional style — no classes except where MCP SDK requires?
   - Named exports only (no default exports)?
   - No `any` — strict TypeScript throughout?
   - Clean separation: auth / api / tools / server / entry point?
   - `createWhoopServer(client)` is a pure factory — no transport, no env vars?

4. **Security**
   - Tokens stored at `~/.whoop-mcp/tokens.json` with `0600` permissions?
   - No secrets (client ID, client secret, tokens) in source code or version control?
   - OAuth redirect URI validated? No open redirect?
   - No shell injection in `openBrowser` (use `spawn` with arg arrays, not `exec`)?
   - Input validated with Zod before processing?

5. **Performance**
   - No unbounded pagination? Collections capped at `limit=25`?
   - Retry backoff for 429 (rate limit) respects `Retry-After` header?
   - No unnecessary API calls or redundant token refreshes?
   - Token refresh is atomic (no race conditions)?

**Output format:**
- Categorize findings as **Critical**, **Important**, or **Suggestion**
- Include specific `file:line` references
- Provide fix recommendations for each finding
- Save structured review to `docs/reviews/` (e.g., `docs/reviews/code-review-<scope>.md`)

Also consider dispatching the `code-reviewer` custom agent for automated review.
