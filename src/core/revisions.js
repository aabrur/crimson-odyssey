import { existsSync, readdirSync, copyFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';
import { ensureDir } from './fs.js';

export function snapshotFile(file, revisionsRoot) {
  if (!existsSync(file)) return null;
  const targetDir = join(revisionsRoot, basename(file));
  ensureDir(targetDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = join(targetDir, `${stamp}-${randomUUID()}.bak`);
  copyFileSync(file, target);
  return target;
}

export function listRevisions(file, revisionsRoot) {
  const dir = join(revisionsRoot, basename(file));
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith('.bak')).sort().reverse().map((name) => join(dir, name));
}

export function rollbackFile(file, revisionsRoot, index = 0) {
  const revisions = listRevisions(file, revisionsRoot);
  const selected = revisions[index];
  if (!selected) throw new Error('No revision is available for rollback');
  snapshotFile(file, revisionsRoot);
  copyFileSync(selected, file);
  return selected;
}
