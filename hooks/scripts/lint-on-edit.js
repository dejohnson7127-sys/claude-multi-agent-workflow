#!/usr/bin/env node
// PostToolUse hook for the api-quality plugin.
// After Claude writes or edits a .js file, lint it with the project's own ESLint.
// - Lint errors  -> exit 2, errors printed to stderr so Claude sees and fixes them.
// - Clean / no ESLint set up / not a .js file -> exit 0 silently.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function findUp(startDir, names) {
  let dir = startDir;
  while (true) {
    for (const name of names) {
      if (fs.existsSync(path.join(dir, name))) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

let input = {};
try {
  input = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

const filePath = input.tool_input && (input.tool_input.file_path || input.tool_input.path);
if (!filePath || !/\.(c|m)?js$/.test(filePath) || filePath.includes('node_modules')) {
  process.exit(0);
}

const absFile = path.isAbsolute(filePath) ? filePath : path.resolve(input.cwd || process.cwd(), filePath);
if (!fs.existsSync(absFile)) process.exit(0);

const projectDir = findUp(path.dirname(absFile), ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs']);
if (!projectDir) process.exit(0);

const eslintBin = path.join(projectDir, 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
if (!fs.existsSync(eslintBin)) process.exit(0); // ESLint not installed — don't block.

const TIMEOUT_MS = 30000;
const result = spawnSync(eslintBin, ['--format', 'stylish', absFile], {
  cwd: projectDir,
  encoding: 'utf8',
  timeout: TIMEOUT_MS,
});

const relFile = path.relative(projectDir, absFile);

function fail(message) {
  process.stderr.write(`[api-quality] ${message}\n`);
  process.exit(2);
}

// Spawn failures and timeouts: linting never completed, so don't report "clean".
if (result.error) {
  if (result.error.code === 'ETIMEDOUT') {
    fail(`ESLint timed out after ${TIMEOUT_MS / 1000}s on ${relFile}; the file was NOT lint-checked.`);
  }
  fail(`Could not run ESLint on ${relFile}: ${result.error.message}. The file was NOT lint-checked.`);
}
if (result.signal) {
  fail(`ESLint was killed (${result.signal}) while checking ${relFile}; the file was NOT lint-checked.`);
}

// ESLint exit codes: 0 = clean, 1 = lint errors, 2 = config or internal error.
if (result.status === 0) process.exit(0);

if (result.status === 1) {
  fail(`ESLint found errors in ${relFile}:\n${result.stdout || ''}\nPlease fix these lint errors.`);
}

fail(
  `ESLint failed to run on ${relFile} (exit code ${result.status}), likely a configuration or runtime error. ` +
    `The file was NOT lint-checked.\n${result.stderr || result.stdout || ''}`
);
