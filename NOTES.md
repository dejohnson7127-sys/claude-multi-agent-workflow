# NOTES — api-quality plugin

## What the plugin does

`api-quality` is a code-quality plugin for small Express APIs (built and tested against `course-api/`). One command, `/api-quality:audit`, runs a multi-agent workflow:

1. **`code-reviewer`** (read-only) and **`coverage-scout`** (read-only) inspect the API **in parallel**.
2. The command merges their reports into one test plan.
3. **`test-writer`** (can write) turns that plan into tests under `tests/`, runs `npm test`, and reports which failures are real app bugs.

It also ships:
- the **`api-test-conventions`** skill — the house rules for `node:test` + `supertest` tests, which `test-writer` follows;
- a **PostToolUse hook** that runs the project's ESLint on any `.js` file Claude writes or edits, and sends lint errors back to Claude (exit code 2) so they get fixed right away. The script is referenced as `${CLAUDE_PLUGIN_ROOT}/hooks/scripts/lint-on-edit.js`, so it works wherever the plugin is installed.

## How to install

From any Claude Code session:

```
/plugin marketplace add dejohnson7127-sys/claude-multi-agent-workflow
/plugin install api-quality@dejohnson-plugins
```

Then run it against the API:

```
cd course-api && npm install && cd ..
/api-quality:audit course-api/
```

For local development, load it straight from a checkout instead:

```
claude --plugin-dir .
```

and use `/reload-plugins` after editing any file.

## Scoping decision: why each subagent got its tools and model

| Agent | Tools | Model | Why |
|-------|-------|-------|-----|
| `code-reviewer` | Read, Grep, Glob | sonnet | Finding subtle bugs and convention breaks needs real reasoning, so it gets a capable model. But a reviewer should never "fix while reviewing" — that would mix two jobs and change code nobody approved — so it gets **read-and-search tools only**. |
| `coverage-scout` | Read, Grep, Glob | haiku | Matching routes to tests is mechanical lookup (grep for `router.put(`, grep tests for `.put('/users`). It doesn't need deep reasoning, so the **cheapest, fastest model** is enough, and it is also read-only. |
| `test-writer` | Read, Grep, Glob, Write, Edit, Bash | sonnet | It must create test files (**Write/Edit**) and prove they run (**Bash** for `npm test`). Its instructions restrict it to `tests/` and forbid changing app code, so a failing test that exposes a real bug is reported instead of being "fixed" by quietly changing the app. |

The key decision was keeping `code-reviewer` read-only even though it often knows the fix. Separating "find problems" from "change code" keeps the review honest and means the only agent that writes is the one whose output is verified by running the test suite.

## Orchestration decision: parallel vs. sequential

- **Parallel (Step 1):** `code-reviewer` and `coverage-scout` both only *read* the codebase and neither needs the other's output. Running them at the same time (two Task calls in one message) cuts wall-clock time roughly in half and there is no risk of them interfering, because neither writes anything.
- **Sequential (Steps 2–3):** `test-writer` depends on both reports — the coverage gaps tell it *which routes* lack tests and the review tells it *which behaviours* are risky. If it started early, it would guess at what to test and duplicate or miss cases. So the command waits for both Step 1 agents, merges their results into one deduplicated plan, and only then launches `test-writer`.
- **Last:** the final report runs after `test-writer` because it pairs failing tests with review findings to flag real bugs.

## Local test notes

- `node .github/scripts/validate-plugin.js` passes.
- The hook script was tested directly: a clean `routes/users.js` exits 0; a file with a syntax error exits 2 and prints the ESLint error.
- `course-api` baseline: 5 tests pass. Expected gaps the workflow should find include `POST /users` 400, `PUT /users/:id` 400, `GET /users/:id` 200, and the untested `/health` route.
