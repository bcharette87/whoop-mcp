---
description: Run TDD workflow — write failing tests, implement, verify. For bugs, use the Prove-It pattern.
---

Invoke the test-driven-development skill.

**For new features:**
1. Write tests that describe the expected behavior (they should FAIL)
2. Place tests in `tests/` mirroring `src/` structure (e.g., `tests/tools/get-recovery.test.ts`)
3. Mock the WHOOP API with `vi.fn()` — never make real HTTP calls
4. Implement the code to make them pass
5. Refactor while keeping tests green
6. Run full suite: `npm test`

**For bug fixes (Prove-It pattern):**
1. Write a test that reproduces the bug (must FAIL)
2. Confirm the test fails with `npm test`
3. Implement the fix
4. Confirm the test passes with `npm test`
5. Run the full test suite for regressions

**Testing conventions for this project:**
- Use Vitest (`describe`, `it`, `expect`, `vi.fn()`, `vi.mocked()`)
- Mock `fetch` globally for API client tests
- Use `InMemoryTransport` from `@modelcontextprotocol/sdk` for MCP server integration tests
- Test error paths: 401 (token expired), 429 (rate limited), network errors, invalid responses
- Test edge cases: empty collections, missing optional fields, pagination tokens

**Coverage targets:**
- `src/auth/` — >80% coverage
- `src/api/` — >80% coverage
- Overall — >70% coverage
- Check with: `npm test -- --coverage`

**After all tests pass:**
- `npm run typecheck` — no type errors
- `npm run build` — compiles cleanly
- `npm run lint` — no lint errors
