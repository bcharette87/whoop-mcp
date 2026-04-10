---
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering
---

Invoke the planning-and-task-breakdown skill.

Read the existing spec at `docs/specs/whoop-mcp-server.md` and the current codebase. Then:

1. **Enter plan mode** — read only, no code changes
2. **Identify the dependency graph** between components:
   - Types → Token Store → API Client → OAuth → MCP Server → Tools → Error Handling → Entry Point → Docs
3. **Slice work vertically** — one complete path per task (e.g., "token store end-to-end with tests"), not horizontal layers
4. **Write tasks with acceptance criteria:**
   - Each task has: description, acceptance criteria, verification command, files to create/modify
   - Verification is always runnable: `npm test -- <path>`, `npm run build`, `npm run typecheck`
5. **Identify what can be parallel vs. sequential:**
   - Sequential: scaffold → types → token store → client → OAuth → server → entry point → docs
   - Parallel: all 6 tool implementations (after server shell), error handling (after client)
6. **Add checkpoints between phases** — define what "done" looks like at each checkpoint
7. **Present the plan for human review**

Check implementation status in `CLAUDE.md` under "Implementation Status" to know what's already complete.

Save the plan to `docs/specs/implementation-plan.md`.

Do not write any code. This is a planning-only command.
