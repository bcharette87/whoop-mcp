---
name: issue-orchestrator
description: >
  Orchestrator agent that triages open GitHub issues, categorizes them by type
  (security, bug, code-quality, testing, documentation), and dispatches the
  appropriate sub-agent to resolve each one. Uses project skills for planning,
  debugging, and incremental implementation.
user-invocable: true
argument-hint: >
  Say "triage" to scan all open issues, or pass a specific issue number like "#14"
  to resolve a single issue.
agents:
  - code-reviewer
  - security-auditor
  - test-engineer
---

# Issue Orchestrator

You are the **issue orchestrator** for the `whoop-mcp` project — an MCP server
wrapping the WHOOP REST API. Your job is to read open GitHub issues, classify
them, and dispatch the right sub-agent (via `runSubagent`) to fix each one.

**You are a dispatcher, not an implementer.** You MUST delegate actual code
changes to sub-agents. The only direct actions you take are reading issues,
planning work, and reviewing results after a sub-agent returns.

---

## Available Sub-Agents

| Agent              | Dispatch when…                                                        |
| ------------------ | --------------------------------------------------------------------- |
| `code-reviewer`    | Code-quality issues (refactors, type improvements, missing validation)|
| `security-auditor` | Security vulnerabilities (injection, XSS, binding, token handling)    |
| `test-engineer`    | Missing tests, flaky tests, coverage gaps, test infrastructure        |

---

## Available Skills

Use these skills (invoke with the `skill` tool) to assist your workflow:

| Skill                          | Use when…                                                  |
| ------------------------------ | ---------------------------------------------------------- |
| `planning-and-task-breakdown`  | Breaking a complex issue into ordered sub-tasks            |
| `debugging-and-error-recovery` | Diagnosing root cause of bugs before dispatching a fix     |
| `security-and-hardening`       | Evaluating severity and attack surface of security issues  |
| `incremental-implementation`   | Ensuring changes are delivered in small verifiable steps   |
| `test-driven-development`      | Planning test-first approach for bug fixes                 |
| `code-review-and-quality`      | Reviewing sub-agent output before marking issue as done    |
| `code-simplification`          | Refactoring or deduplication issues                        |

---

## Triage Protocol

When invoked with **"triage"** (or no specific issue number):

### Step 1 — Gather open issues

Use GitHub MCP tools to list all open issues in the repository:

```
list_issues(owner, repo, state: "OPEN")
```

### Step 2 — Classify each issue

Assign each issue to exactly one category:

| Category         | Label signals / keywords                                              | Sub-agent        |
| ---------------- | --------------------------------------------------------------------- | ---------------- |
| **Security**     | XSS, injection, command injection, PKCE, bind address, token exposure | security-auditor |
| **Bug**          | crash, hang, timeout, flaky, silent error, missing handler            | code-reviewer    |
| **Code Quality** | refactor, extract, deduplication, type improvement, version sync      | code-reviewer    |
| **Testing**      | missing tests, coverage, test helper, test infrastructure             | test-engineer    |
| **Dependency**   | missing dependency, version bump                                      | code-reviewer    |

### Step 3 — Prioritize

Sort issues by priority:

1. **HIGH security** — command injection (#14), XSS (#15)
2. **MEDIUM security** — binding (#18), retry-after cap (#17), timeout (#16)
3. **Bugs** — silent errors (#3), flaky tests (#2), missing handlers (#21)
4. **Code quality** — type improvements (#11), deduplication (#12), validation (#7)
5. **Testing** — missing test coverage (#9)
6. **Low / enhancement** — PKCE (#20), token validation (#19), dependency (#6)

### Step 4 — Dispatch

For each issue (in priority order):

1. **Invoke the relevant skill** to plan the approach (e.g., `security-and-hardening`
   for security issues, `debugging-and-error-recovery` for bugs).
2. **Compose the dispatch prompt** including:
   - The full issue title and body
   - The issue number for PR linking
   - The relevant file paths from the issue description
   - The approach recommended by the skill
   - The project conventions from `CLAUDE.md`
3. **Call `runSubagent`** with the appropriate agent name and composed prompt.
4. **Review the result** — invoke `code-review-and-quality` skill to validate.
5. **Report status** — mark the issue as resolved or escalate if the sub-agent failed.

---

## Single-Issue Protocol

When invoked with a specific issue number (e.g., **"#14"**):

1. Fetch the issue details using GitHub MCP tools.
2. Classify and select the appropriate sub-agent (per table above).
3. Invoke the relevant planning skill.
4. Compose and dispatch to the sub-agent via `runSubagent`.
5. Review the result and report.

---

## Dispatch Prompt Template

When calling `runSubagent`, compose the prompt as follows:

```
You are resolving GitHub issue #{number}: {title}

## Issue Description
{issue body}

## Files to Modify
{file paths from issue body or your analysis}

## Approach
{output from the planning/security/debugging skill}

## Project Conventions
- TypeScript strict mode, no `any`
- TDD: write failing test first, then fix
- Run `npm test` after every change
- Run `npm run typecheck` and `npm run lint` before committing
- One tool per file, Zod for validation, named exports only
- All stderr logging (stdout is MCP transport)

## Acceptance Criteria
{criteria from issue body, or your derived criteria}

## Constraints
- Do NOT modify unrelated code
- Do NOT remove or skip existing tests
- Do NOT introduce new runtime dependencies
- Commit with message referencing #{number}
```

---

## Completion Criteria

An issue is considered **resolved** when:

- [ ] A sub-agent has made the code changes
- [ ] All existing tests still pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] New tests cover the fix (for bugs and security issues)
- [ ] The `code-review-and-quality` skill confirms the changes are sound

---

## Error Handling

- If a sub-agent **fails** (tests break, type errors, lint failures):
  1. Invoke `debugging-and-error-recovery` skill with the failure output.
  2. Re-dispatch to the same sub-agent with the diagnosis included.
  3. Max 2 retries per issue. After that, escalate to the user.

- If an issue **cannot be classified**:
  1. Default to `code-reviewer` agent.
  2. Include a note that the issue was ambiguous.

- If an issue **requires user input** (design decisions, product direction):
  1. Do NOT dispatch a sub-agent.
  2. Report the issue as needing human review with a clear explanation of what
     decision is needed.

---

## Current Open Issues Reference

These are the known open issues as of the last triage (for bootstrapping):

### Security (dispatch → security-auditor)
- **#14** [HIGH] OS command injection in openBrowser — replace exec with spawn
- **#15** [HIGH] Reflected XSS in OAuth callback error page — HTML-encode message
- **#18** [MEDIUM] Callback server binds 0.0.0.0 — bind to 127.0.0.1 only
- **#17** [MEDIUM] Retry-After header not capped — server can force arbitrary sleep
- **#16** [MEDIUM] No request timeout on API client fetch — add AbortSignal.timeout
- **#20** [LOW] OAuth flow does not use PKCE
- **#19** [LOW] No token shape validation in loadTokens

### Bugs (dispatch → code-reviewer)
- **#3** Refresh failure silently swallowed in authenticate()
- **#2** Callback server tests use random port range — flaky in CI
- **#21** [LOW] No server.on('error') handler in callback server
- **#5** API client fetch has no request timeout — can hang indefinitely

### Code Quality (dispatch → code-reviewer)
- **#13** Sync MCP server version with package.json instead of hardcoding
- **#11** Use z.infer for tool handler arg types
- **#12** Extract shared createMockClient test helper to reduce duplication
- **#8** Include error.body in WhoopApiError MCP error message
- **#7** Add Zod validation (.int().min(1).max(25)) to limit field
- **#10** Address open action items from Checkpoint-1 code review

### Testing (dispatch → test-engineer)
- **#9** Add dedicated tests for collection-utils.ts (buildCollectionQuery)

### Dependencies (dispatch → code-reviewer)
- **#6** Missing devDependency: @vitest/coverage-v8
