---
description: Simplify code for clarity and maintainability — reduce complexity without changing behavior
---

Invoke the code-simplification skill.

Simplify recently changed code (or the specified scope) while preserving exact behavior:

1. **Read CLAUDE.md** and study project conventions (naming, patterns, boundaries)
2. **Identify the target code** — recent changes unless a broader scope is specified
3. **Understand the code's purpose**, callers, edge cases, and test coverage before touching it
4. **Scan for simplification opportunities specific to this project:**
   - Deep nesting in tool handlers → guard clauses or early returns
   - Long functions → split by responsibility (e.g., separate URL building from API calling)
   - Duplicated query-param construction across tools → shared helper in `src/api/`
   - Duplicated error handling patterns → use the `safeTool` wrapper consistently
   - Nested ternaries → if/else or switch
   - Generic names → descriptive names matching WHOOP domain (e.g., `data` → `recoveryRecords`)
   - Dead code → remove after confirming no callers
   - Unused imports → remove
   - Complex type assertions → proper type narrowing with Zod
5. **Apply each simplification incrementally** — run tests after each change:
   - `npm test` — all 169+ tests still pass
   - `npm run typecheck` — no type errors introduced
   - `npm run build` — compiles cleanly
6. **Verify the diff is clean** — no unrelated changes mixed in

If tests fail after a simplification, revert that change and reconsider the approach.

Use the code-review-and-quality skill (or the `/review` command) to validate the result.

**Do not:**
- Change public API signatures without updating all callers and tests
- Mix simplification with new features or bug fixes
- Remove error handling or edge case coverage
- Use `any` to simplify types — find the proper type instead
