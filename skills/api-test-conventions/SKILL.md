---
name: api-test-conventions
description: How to write tests for a small Express API using node:test, node:assert and supertest. Use when writing, extending, or fixing API tests (e.g. "add a test for POST /users", "write tests for the health route"), or when the test-writer agent is producing tests.
---

# API test conventions

These are the house rules for tests in Express projects like `course-api/`. Follow them exactly so new tests look like the existing ones and run with `npm test`.

## Stack

- Test runner: Node's built-in `node:test` (run with `npm test`, which is `node --test`).
- Assertions: `node:assert` — prefer `assert.equal`, `assert.deepEqual`, `assert.ok`.
- HTTP: `supertest` against the exported `app` — never start a real server or open a port.

## File layout

- One file per resource: `tests/<resource>.test.js` (e.g. `tests/users.test.js`, `tests/health.test.js`).
- Add to the existing file for that resource rather than creating a second one.

## Template

```js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const store = require('../db/store');

test.beforeEach(() => store.reset());

test('POST /users returns 400 when email is missing', async () => {
  const res = await request(app).post('/users').send({ name: 'No Email' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: 'name and email are required' });
});
```

## Rules

1. **Reset state** — always `test.beforeEach(() => store.reset())` so every test starts from the seed data.
2. **Name tests** as `"METHOD /path <expected result> [when <condition>]"`.
3. **One behaviour per test.** Assert the status code first, then the body.
4. **Cover every status path** a route can return: success (200/201), bad input (400), missing record (404).
5. **Error bodies** must match the shape `{ "error": "message" }` — assert it with `assert.ok(res.body.error)` or an exact `deepEqual`.
6. **Don't assert volatile values** (e.g. `uptime`); assert their type instead (`typeof res.body.uptime === 'number'`).
7. **Never edit app code to make a test pass.** A failing test that reveals a real bug is a valid result — report it.
