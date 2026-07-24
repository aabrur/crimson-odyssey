import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function walk(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    if (['.crimson', '.git', 'node_modules'].includes(name)) continue;
    const path = join(root, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

test('repository text scan ignores local Crimson runtime data', () => {
  const root = mkdtempSync(join(tmpdir(), 'crimson-source-scan-'));
  try {
    mkdirSync(join(root, '.crimson', 'odyssey', 'histories'), { recursive: true });
    writeFileSync(join(root, '.crimson', 'odyssey', 'histories', 'runtime.jsonl'), 'runtime');
    writeFileSync(join(root, 'source.js'), 'source');
    assert.deepEqual(walk(root), [join(root, 'source.js')]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

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
