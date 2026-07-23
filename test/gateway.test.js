import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeWorkspace } from '../src/core/state.js';
import { beginPairing, tryBind, isAuthorized, saveGatewayConfig, loadGatewayConfig } from '../src/gateway/common.js';
import { doctorTelegram } from '../src/gateway/telegram.js';
import { doctorDiscord } from '../src/gateway/discord.js';
import { setSecret } from '../src/core/secrets.js';
import { tempDir, jsonResponse } from './helpers.js';

test('owner binding requires correct UID and expiring code', () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    const config = { id: 'telegram', type: 'telegram', ownerUid: '42', binding: { status: 'unbound' } };
    const code = beginPairing(paths, config);
    assert.equal(tryBind(paths, config, '99', `/bind ${code}`).reason, 'owner_mismatch');
    assert.equal(tryBind(paths, config, '42', '/bind BAD').reason, 'invalid_code');
    assert.equal(tryBind(paths, config, '42', `/bind ${code}`).bound, true);
    assert.equal(isAuthorized(config, '42'), true);
    assert.equal(isAuthorized(config, '99'), false);
  } finally { tmp.cleanup(); }
});

test('Discord authorization can be restricted to one server', () => {
  const config = { ownerUid: '42', serverId: '100', binding: { status: 'bound' } };
  assert.equal(isAuthorized(config, '42', { guildId: '100' }), true);
  assert.equal(isAuthorized(config, '42', { guildId: '101' }), false);
  assert.equal(isAuthorized(config, '99', { guildId: '100' }), false);
});

test('gateway config saves token reference but not raw token', () => {
  const tmp = tempDir();
  const oldPath = process.env.PATH;
  process.env.PATH = '';
  try {
    const paths = initializeWorkspace(tmp.dir);
    const ref = setSecret('test-bot', 'token-value', { home: tmp.dir });
    saveGatewayConfig(paths, { id: 'test', type: 'telegram', ownerUid: '1', secretRef: ref });
    const loaded = loadGatewayConfig(paths, 'test');
    assert.equal(loaded.secretRef, 'vault:test-bot');
    assert.equal(JSON.stringify(loaded).includes('token-value'), false);
  } finally {
    process.env.PATH = oldPath;
    tmp.cleanup();
  }
});

test('Telegram doctor verifies getMe through secret reference', async () => {
  process.env.TELEGRAM_TEST_TOKEN = 'token';
  try {
    const result = await doctorTelegram({ secretRef: 'env:TELEGRAM_TEST_TOKEN', binding: { status: 'bound' } }, {
      fetchImpl: async (url) => {
        assert.equal(url.includes('/getMe'), true);
        return jsonResponse({ ok: true, result: { id: 10, username: 'node10', first_name: 'Node-10' } });
      }
    });
    assert.equal(result.ok, true);
    assert.equal(result.bot.username, 'node10');
  } finally { delete process.env.TELEGRAM_TEST_TOKEN; }
});

test('Discord doctor verifies bot and configured server', async () => {
  process.env.DISCORD_TEST_TOKEN = 'token';
  try {
    const result = await doctorDiscord({ secretRef: 'env:DISCORD_TEST_TOKEN', serverId: '100', binding: { status: 'pending' } }, {
      fetchImpl: async (url, options) => {
        assert.equal(options.headers.authorization, 'Bot token');
        if (url.endsWith('/users/@me')) return jsonResponse({ id: '10', username: 'node10' });
        if (url.endsWith('/guilds/100')) return jsonResponse({ id: '100', name: 'Test Server' });
        return jsonResponse({}, { status: 404 });
      }
    });
    assert.equal(result.ok, true);
    assert.equal(result.server.name, 'Test Server');
  } finally { delete process.env.DISCORD_TEST_TOKEN; }
});
