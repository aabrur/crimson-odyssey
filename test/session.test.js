import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeWorkspace } from '../src/core/state.js';
import {
  createSession,
  appendMessage,
  readMessages,
  listSessions,
  getOrCreateGatewaySession,
  pruneHistory,
  archiveSession
} from '../src/session/session.js';
import { readJSON, writeJSON } from '../src/core/fs.js';
import { tempDir } from './helpers.js';

test('session persists messages and turn count', () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    const session = createSession(paths, { platform: 'tui' });
    appendMessage(paths, session, { role: 'user', content: 'hello' });
    appendMessage(paths, session, { role: 'assistant', content: 'hi' });
    const messages = readMessages(paths, session.id);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].content, 'hello');
    assert.equal(listSessions(paths)[0].turnCount, 1);
  } finally { tmp.cleanup(); }
});

test('gateway sessions are isolated by platform and conversation id', () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    const telegram = getOrCreateGatewaySession(paths, 'telegram', '123');
    const discord = getOrCreateGatewaySession(paths, 'discord', '123');
    assert.notEqual(telegram.id, discord.id);
    assert.equal(getOrCreateGatewaySession(paths, 'telegram', '123').id, telegram.id);
  } finally { tmp.cleanup(); }
});

test('archived and expired sessions are pruned by retention policy', () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    const old = createSession(paths, { id: 'old-session' });
    appendMessage(paths, old, { role: 'user', content: 'old' });
    const metaFile = join(paths.sessions, 'old-session.json');
    const meta = readJSON(metaFile);
    meta.updatedAt = '2020-01-01T00:00:00.000Z';
    writeJSON(metaFile, meta);
    const active = createSession(paths, { id: 'active-session' });
    appendMessage(paths, active, { role: 'user', content: 'active' });
    assert.equal(pruneHistory(paths, 90, Date.parse('2026-07-23T00:00:00.000Z')), 1);
    assert.deepEqual(listSessions(paths).map((item) => item.id), ['active-session']);
    archiveSession(paths, 'active-session');
    assert.equal(pruneHistory(paths, 90, Date.parse('2026-07-23T00:00:00.000Z')), 1);
    assert.equal(listSessions(paths).length, 0);
  } finally { tmp.cleanup(); }
});
