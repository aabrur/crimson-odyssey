import { existsSync, readdirSync, readFileSync, appendFileSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ensureDir, readJSON, writeJSON, safeName } from '../core/fs.js';

export function createSession(paths, { id, platform = 'tui', gateway = null, conversationId = null } = {}) {
  ensureDir(paths.sessions);
  const sessionId = safeName(id || randomUUID());
  const meta = {
    id: sessionId,
    platform,
    gateway,
    conversationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    turnCount: 0,
    archived: false
  };
  writeJSON(join(paths.sessions, `${sessionId}.json`), meta);
  return meta;
}

export function sessionMeta(paths, id) {
  return readJSON(join(paths.sessions, `${safeName(id)}.json`), null);
}

export function sessionHistoryFile(paths, id) {
  return join(paths.histories, `${safeName(id)}.jsonl`);
}

export function appendMessage(paths, session, message) {
  ensureDir(paths.histories);
  const entry = {
    id: randomUUID(),
    time: new Date().toISOString(),
    role: message.role,
    content: String(message.content || ''),
    kind: message.kind || 'message',
    metadata: message.metadata || {}
  };
  appendFileSync(sessionHistoryFile(paths, session.id), `${JSON.stringify(entry)}\n`, 'utf8');
  session.turnCount = message.role === 'user' ? (session.turnCount || 0) + 1 : session.turnCount || 0;
  session.updatedAt = entry.time;
  writeJSON(join(paths.sessions, `${session.id}.json`), session);
  return entry;
}

export function readMessages(paths, id, { limit = 500 } = {}) {
  const file = sessionHistoryFile(paths, id);
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

export function listSessions(paths) {
  if (!existsSync(paths.sessions)) return [];
  return readdirSync(paths.sessions)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJSON(join(paths.sessions, name), null))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function gatewaySessionId(gateway, conversationId) {
  return safeName(`${gateway}-${conversationId}`);
}

export function getOrCreateGatewaySession(paths, gateway, conversationId) {
  const id = gatewaySessionId(gateway, conversationId);
  return sessionMeta(paths, id) || createSession(paths, { id, platform: 'gateway', gateway, conversationId: String(conversationId) });
}

export function pruneHistory(paths, days = 90, now = Date.now()) {
  const cutoff = now - Number(days) * 86400000;
  let removed = 0;
  for (const session of listSessions(paths)) {
    const updated = Date.parse(session.updatedAt || session.createdAt || 0);
    if (!session.archived && updated >= cutoff) continue;
    const metaFile = join(paths.sessions, `${session.id}.json`);
    const historyFile = sessionHistoryFile(paths, session.id);
    if (existsSync(metaFile)) rmSync(metaFile, { force: true });
    if (existsSync(historyFile)) rmSync(historyFile, { force: true });
    removed += 1;
  }
  return removed;
}

export function archiveSession(paths, id) {
  const meta = sessionMeta(paths, id);
  if (!meta) throw new Error(`Session not found: ${id}`);
  meta.archived = true;
  meta.updatedAt = new Date().toISOString();
  writeJSON(join(paths.sessions, `${meta.id}.json`), meta);
  return meta;
}
