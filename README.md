# api-quality — a Claude Code plugin

A code-quality workflow for small Express APIs. One command reviews your routes, maps test coverage, and writes the missing tests — using three scoped subagents.

This repo is both the **plugin** and the **marketplace** that offers it. The sample API it's tested against lives in [`course-api/`](course-api/).

## Install

```
/plugin marketplace add dejohnson7127-sys/claude-multi-agent-workflow
/plugin install api-quality@dejohnson-plugins
```

Or load from a local checkout while developing:

```
claude --plugin-dir .
```

## Use

```
/api-quality:audit course-api/
```

| Step | What happens |
|------|--------------|
| 1 (parallel) | `code-reviewer` and `coverage-scout` read the API at the same time |
| 2 | Their reports are merged into one test plan |
| 3 | `test-writer` writes the tests in `tests/` and runs `npm test` |
| 4 | You get findings, coverage before/after, and any real bugs the new tests exposed |

## What's inside

| Component | Path | Purpose |
|-----------|------|---------|
| Manifest | `.claude-plugin/plugin.json` | Plugin name and version |
| Marketplace | `.claude-plugin/marketplace.json` | Lets the repo be added with `/plugin marketplace add` |
| Subagent | `agents/code-reviewer.md` | Read-only reviewer (sonnet) — bugs, validation gaps, convention breaks |
| Subagent | `agents/coverage-scout.md` | Read-only route→test mapper (haiku) |
| Subagent | `agents/test-writer.md` | Writes and runs tests (sonnet); only touches `tests/` |
| Command | `commands/audit.md` | The workflow: `/api-quality:audit` |
| Skill | `skills/api-test-conventions/SKILL.md` | House rules for `node:test` + `supertest` tests |
| Hook | `hooks/hooks.json` → `hooks/scripts/lint-on-edit.js` | Runs ESLint after every Write/Edit of a `.js` file; lint errors go back to Claude |

All components can also be used on their own — e.g. ask "what isn't tested in course-api?" and Claude can delegate to `coverage-scout`.

## Requirements

- Claude Code with plugin support
- Node.js (the hook is a Node script; it does nothing if the project has no ESLint installed)

## Versioning

Bump `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` when releasing changes, then run `/plugin marketplace update dejohnson-plugins`.

See [NOTES.md](NOTES.md) for design decisions (tool/model scoping and parallel vs. sequential steps).
