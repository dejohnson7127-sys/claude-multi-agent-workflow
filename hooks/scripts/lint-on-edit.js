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

const result = spawnSync(eslintBin, ['--format', 'stylish', absFile], {
  cwd: projectDir,
  encoding: 'utf8',
  timeout: 30000,
});

if (result.status === 1) {
  // ESLint exits 1 when there are lint errors.
  process.stderr.write(
    `[api-quality] ESLint found errors in ${path.relative(projectDir, absFile)}:\n` +
      (result.stdout || '') +
      '\nPlease fix these lint errors.\n'
  );
  process.exit(2);
}

process.exit(0);
