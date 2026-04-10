---
description: Implement the next task incrementally — TDD cycle with build, test, verify, commit
---

Invoke the incremental-implementation skill alongside the test-driven-development skill.

Pick the next pending task from `docs/specs/implementation-plan.md`. Check `CLAUDE.md` for current implementation status. For each task:

1. **Read the task's acceptance criteria** from the implementation plan
2. **Load relevant context** — existing code, patterns, types in `src/`, test patterns in `tests/`
3. **Write a failing test** for the expected behavior (RED — test fails, proving the feature doesn't exist yet):
   - Place tests in `tests/` mirroring `src/` structure
   - Mock the WHOOP API with `vi.fn()` — never hit real API
   - Use Vitest conventions (`describe`, `it`, `expect`, `vi.fn()`)
4. **Implement the minimum code** to pass the test (GREEN — test passes, feature works):
   - Follow project conventions: strict TypeScript, no `any`, named exports only
   - One tool per file with co-located Zod schema
   - Explicit return types on all exported functions
   - Functional style — no classes except where SDK requires
5. **Run the full test suite:** `npm test`
6. **Run the build:** `npm run build`
7. **Run type check:** `npm run typecheck`
8. **Run lint:** `npm run lint`
9. **Commit** with a descriptive message following the pattern: `feat: implement <component> — <brief description>`
10. **Update CLAUDE.md** implementation status if a task is complete
11. **Move to the next task** or stop if the user requested a single task

If any step fails, invoke the debugging-and-error-recovery skill:
- Read the error message carefully
- Check if it's a type error, test failure, or build error
- Fix the root cause, not the symptom
- Re-run verification before continuing

Key project constraints:
- WHOOP API base: `https://api.prod.whoop.com/developer`
- Token storage: `~/.whoop-mcp/tokens.json` with 0600 permissions
- MCP tool names use `snake_case`, files use `kebab-case`
- All stderr logging (stdout is the MCP stdio transport channel)
