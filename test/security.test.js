import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function files(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    if (['.git', 'node_modules'].includes(name)) continue;
    const path = join(root, name);
    if (statSync(path).isDirectory()) out.push(...files(path));
    else out.push(path);
  }
  return out;
}

test('repository contains no raw high-confidence bot or API credentials', () => {
  const root = resolve('.');
  const patterns = [
    /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/,
    /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}\b/,
    /\bsk-[A-Za-z0-9_-]{24,}\b/,
    /\bAIza[A-Za-z0-9_-]{30,}\b/
  ];
  const violations = [];
  for (const path of files(root)) {
    if (!/\.(js|json|md|yml|yaml|ps1|sh|txt)$/.test(path) && !['LICENSE', '.gitignore'].includes(path.split('/').at(-1))) continue;
    const content = readFileSync(path, 'utf8');
    for (const pattern of patterns) if (pattern.test(content)) violations.push(path);
  }
  assert.deepEqual(violations, []);
});

test('workspace runtime directory is ignored by Git', () => {
  const content = readFileSync(resolve('.gitignore'), 'utf8');
  assert.match(content, /^\.crimson\/$/m);
  assert.match(content, /^\.env$/m);
});
