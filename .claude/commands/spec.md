---
description: Start spec-driven development — write or update the WHOOP MCP server specification before writing code
---

Invoke the spec-driven-development skill.

Begin by understanding what the user wants to build or change. If creating a new spec, ask clarifying questions about:

1. **Objective** — What WHOOP data does the user want to access via MCP?
2. **MCP Tools** — Which WHOOP API endpoints should be exposed? What input schemas?
3. **OAuth & Auth** — Scopes needed? Token storage approach?
4. **Tech constraints** — TypeScript strict, no `any`, Zod validation, Vitest, no runtime deps beyond SDK + Zod
5. **Boundaries** — What to always do, ask first about, and never do

Then generate a structured spec covering:

- **Objective and target users** (AI assistants like Claude Desktop)
- **MCP tool definitions** (name, description, input schema, WHOOP endpoint, response shape)
- **Project structure** (one tool per file, handler + Zod schema co-located)
- **Code conventions** (kebab-case files, PascalCase types, camelCase functions, snake_case MCP tools)
- **Testing strategy** (TDD, mock WHOOP API with `vi.fn()`, coverage targets >80% auth/api, >70% overall)
- **Security boundaries** (tokens at `~/.whoop-mcp/tokens.json` with 0600, no secrets in code, no real API in tests)

Reference the WHOOP API:
- Base URL: `https://api.prod.whoop.com/developer`
- OAuth: `https://api.prod.whoop.com/oauth/oauth2/auth` and `.../token`
- Scopes: `read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement`

Save the spec to `docs/specs/whoop-mcp-server.md` and confirm with the user before proceeding.
If updating an existing spec, read `docs/specs/whoop-mcp-server.md` first and make targeted changes.
