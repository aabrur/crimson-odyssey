import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function walk(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    if (['node_modules', '.git'].includes(name)) continue;
    const path = join(root, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith('.js')) out.push(path);
  }
  return out;
}

const roots = ['src', 'bin', 'scripts', 'test'].map((dir) => resolve(dir));
const files = roots.flatMap(walk);
const errors = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) errors.push(`${file}\n${result.stderr}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Syntax verified: ${files.length} JavaScript files`);
