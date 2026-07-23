import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir } from './fs.js';

const SECRET_PATTERNS = [
  /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/g,
  /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bAIza[A-Za-z0-9_-]{20,}\b/g
];

export function sanitizeLogText(value) {
  let out = String(value ?? '');
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, '[REDACTED]');
  return out;
}

export function createLogger(paths, { onEntry } = {}) {
  ensureDir(paths.logs);
  const file = join(paths.logs, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  return function log(level, event, detail = {}) {
    const entry = {
      time: new Date().toISOString(),
      level,
      event: sanitizeLogText(event),
      detail: JSON.parse(sanitizeLogText(JSON.stringify(detail)))
    };
    appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
    onEntry?.(entry);
    return entry;
  };
}
