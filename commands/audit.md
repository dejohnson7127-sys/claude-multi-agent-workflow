---
description: Run the full code-quality workflow on an Express API — parallel review + coverage scan, then write the missing tests, then report.
argument-hint: "[project-dir or file paths, default: course-api/]"
allowed-tools: Task, Read, Glob, Bash
---

Run the **api-quality audit** workflow on: $ARGUMENTS

If no argument was given, use `course-api/` as the project directory. If file paths were given, use their nearest folder containing `package.json` as the project directory and the paths as the review scope.

Follow these steps in order. Do not do the subagents' work yourself — delegate it.

## Step 1 — Inspect in parallel (independent work)

Launch these two subagents **at the same time, in a single message with two Task calls**. They both only read code and neither needs the other's output, so there is no reason to wait.

- **`code-reviewer`** — review the routes, store, and server file in the project directory (or the given paths). Ask it for its findings table and its "Behaviours that deserve a test" list.
- **`coverage-scout`** — map every route/status pair in the project directory to the existing tests and return the coverage table and gap list.

Wait until **both** have returned before continuing.

## Step 2 — Merge the results (depends on Step 1)

Combine the two reports into one deduplicated test plan:
- every gap from `coverage-scout`, plus
- every behaviour from `code-reviewer` that is not already covered.

Show the user the merged plan as a short numbered list. If the plan is empty, skip to Step 4.

## Step 3 — Write and run tests (depends on Step 2)

Launch **`test-writer`** with the project directory and the merged test plan from Step 2. It writes the tests under `tests/`, runs `npm test`, and reports which failures point to real application bugs. This must run after Steps 1–2, because it needs their findings to know what to test.

## Step 4 — Final report

Reply to the user with:

1. **Review findings** — the `code-reviewer` table (high severity first).
2. **Coverage** — before (from `coverage-scout`) and after (tests added by `test-writer`).
3. **Tests added** and the suite result.
4. **Real bugs found** — failing tests that expose app problems, each paired with the matching review finding if there is one.
5. **Suggested next step** — one line.

Do not edit application code in this workflow. Fixing bugs is a separate, user-approved step.
