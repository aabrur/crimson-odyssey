import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('installers target the correct aabrur repository and require Node 22', () => {
  const ps = readFileSync('install.ps1', 'utf8');
  const sh = readFileSync('install.sh', 'utf8');
  assert.match(ps, /github:aabrur\/crimson-odyssey/);
  assert.match(sh, /github:aabrur\/crimson-odyssey/);
  assert.match(ps, /22/);
  assert.match(sh, /22/);
});
