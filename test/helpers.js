import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function tempDir(prefix = 'crimson-test-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return {
    dir,
    cleanup() { rmSync(dir, { recursive: true, force: true }); }
  };
}

export function jsonResponse(payload, { status = 200, statusText = 'OK' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async json() { return payload; },
    async text() { return JSON.stringify(payload); }
  };
}
