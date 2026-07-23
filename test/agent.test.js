import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeWorkspace, loadWorkspaceState } from '../src/core/state.js';
import { writeJSON } from '../src/core/fs.js';
import { createSession, readMessages } from '../src/session/session.js';
import { runAgentTurn } from '../src/agent/runtime.js';
import { tempDir, jsonResponse } from './helpers.js';

test('unified agent turn composes state, calls provider, and persists history', async () => {
  const tmp = tempDir();
  process.env.CRIMSON_CUSTOM_API_KEY = 'test-key';
  try {
    const paths = initializeWorkspace(tmp.dir);
    writeJSON(paths.model, {
      provider: 'custom',
      model: 'mock-model',
      baseUrl: 'http://localhost:8000/v1',
      secretRef: 'env:CRIMSON_CUSTOM_API_KEY'
    });
    const session = createSession(paths, { platform: 'test' });
    let requestBody = null;
    const result = await runAgentTurn({
      workspace: tmp.dir,
      session,
      text: 'Research this repository',
      fetchImpl: async (url, options) => {
        requestBody = JSON.parse(options.body);
        return jsonResponse({ choices: [{ message: { content: 'Verified answer' } }], usage: { total_tokens: 12 } });
      }
    });
    assert.equal(result.answer, 'Verified answer');
    assert.equal(requestBody.messages.at(-1).content, 'Research this repository');
    assert.equal(requestBody.messages[0].content.includes('Crimson Odyssey'), true);
    assert.equal(requestBody.messages[0].content.includes('ACTIVE LOADOUT'), true);
    const messages = readMessages(paths, session.id);
    assert.deepEqual(messages.map((item) => item.role), ['user', 'assistant']);
    assert.equal(loadWorkspaceState(tmp.dir).heartbeat.status, 'idle');
  } finally {
    delete process.env.CRIMSON_CUSTOM_API_KEY;
    tmp.cleanup();
  }
});

test('agent records model failures without silent fallback', async () => {
  const tmp = tempDir();
  process.env.CRIMSON_CUSTOM_API_KEY = 'test-key';
  try {
    const paths = initializeWorkspace(tmp.dir);
    writeJSON(paths.model, {
      provider: 'custom',
      model: 'failing-model',
      baseUrl: 'http://localhost:8000/v1',
      secretRef: 'env:CRIMSON_CUSTOM_API_KEY'
    });
    const session = createSession(paths, { platform: 'test' });
    await assert.rejects(() => runAgentTurn({
      workspace: tmp.dir,
      session,
      text: 'hello',
      fetchImpl: async () => jsonResponse({ error: { message: 'provider down' } }, { status: 503, statusText: 'Unavailable' })
    }), /provider down/);
    const state = loadWorkspaceState(tmp.dir);
    assert.equal(state.heartbeat.status, 'error');
    assert.equal(readMessages(paths, session.id).at(-1).kind, 'error');
  } finally {
    delete process.env.CRIMSON_CUSTOM_API_KEY;
    tmp.cleanup();
  }
});
