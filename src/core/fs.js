import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function readText(path, fallback = '') {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return fallback;
  }
}

export function readJSON(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export function atomicWrite(path, content, { mode } = {}) {
  ensureDir(dirname(path));
  const temp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temp, content, mode ? { encoding: 'utf8', mode } : 'utf8');
  renameSync(temp, path);
  return path;
}

export function writeJSON(path, value, options = {}) {
  return atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`, options);
}

export function removeIfExists(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

export function safeName(value, fallback = 'item') {
  const out = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || fallback;
}

export function redact(value) {
  const text = String(value || '');
  if (text.length <= 8) return '*'.repeat(text.length);
  return `${text.slice(0, 3)}...${text.slice(-3)}`;
}
