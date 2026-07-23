import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function walk(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    if (['.git', 'node_modules'].includes(name)) continue;
    const path = join(root, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

test('repository text contains no em dash character', () => {
  const violations = [];
  for (const path of walk(resolve('.'))) {
    try {
      const content = readFileSync(path, 'utf8');
      if (content.includes(String.fromCodePoint(0x2014))) violations.push(path);
    } catch { /* binary or unreadable */ }
  }
  assert.deepEqual(violations, []);
});
