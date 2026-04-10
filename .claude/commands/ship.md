---
description: Run the pre-launch checklist and prepare for npm publish + Claude Desktop integration
---

Invoke the shipping-and-launch skill.

Run through the complete pre-launch checklist for the WHOOP MCP server:

1. **Code Quality**
   - [ ] `npm test` passes (full test suite, all green)
   - [ ] `npm test -- --coverage` meets targets (>80% auth/api, >70% overall)
   - [ ] `npm run build` compiles cleanly (no errors, no warnings)
   - [ ] `npm run typecheck` passes (strict mode, no `any`)
   - [ ] `npm run lint` passes (no ESLint errors)
   - [ ] `npm run format` — code is formatted (Prettier)
   - [ ] No TODO/FIXME comments left unresolved
   - [ ] No `console.log` in production code (use `console.error`/stderr only)

2. **Security**
   - [ ] `npm audit` reports no high/critical vulnerabilities
   - [ ] No secrets in source code (client ID, client secret, tokens)
   - [ ] `.gitignore` covers `.env`, `tokens.json`, `dist/`, `node_modules/`
   - [ ] Token file permissions are `0600` (not world-readable)
   - [ ] OAuth redirect URI is validated (no open redirect)
   - [ ] `openBrowser` in `src/auth/oauth.ts` uses `spawn` with arg arrays (no shell injection via `exec`)

3. **Packaging**
   - [ ] `package.json` has correct `bin` field: `"whoop-mcp": "dist/index.js"`
   - [ ] `dist/index.js` has `#!/usr/bin/env node` shebang
   - [ ] `npm pack` produces a clean tarball (inspect contents)
   - [ ] `npx whoop-mcp` works from a clean install
   - [ ] `package.json` has: name, version, description, keywords, repository, license, main, types

4. **Integration**
   - [ ] `node dist/index.js` starts the MCP server on stdio
   - [ ] All 6 MCP tools respond correctly via MCP Inspector:
     `npx @modelcontextprotocol/inspector node dist/index.js`
   - [ ] Claude Desktop config works:
     ```jsonc
     {
       "mcpServers": {
         "whoop": {
           "command": "npx",
           "args": ["whoop-mcp"],
           "env": {
             "WHOOP_CLIENT_ID": "your_client_id",
             "WHOOP_CLIENT_SECRET": "your_client_secret"
           }
         }
       }
     }
     ```
   - [ ] All stderr logging — stdout is reserved for MCP stdio transport
   - [ ] Graceful error messages when env vars are missing

5. **Documentation**
   - [ ] README includes: description, features, quickstart, Claude Desktop config, available tools, env setup
   - [ ] `.env.example` has all required variables documented
   - [ ] CHANGELOG updated with release notes
   - [ ] LICENSE file present (MIT or chosen license)

**If any check fails**, report the failure and help resolve it before proceeding.

**Rollback plan:** If npm publish introduces issues:
- `npm unpublish whoop-mcp@<version>` (within 72 hours)
- Or publish a patch version with the fix

After all checks pass, the package is ready for `npm publish`.
