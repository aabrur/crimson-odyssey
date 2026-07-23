import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { readJSON, writeJSON, safeName } from '../core/fs.js';

export function gatewayConfigFile(paths, id) {
  return join(paths.gateways, `${safeName(id)}.json`);
}

export function loadGatewayConfig(paths, id) {
  return readJSON(gatewayConfigFile(paths, id), null);
}

export function saveGatewayConfig(paths, config) {
  writeJSON(gatewayConfigFile(paths, config.id), config);
  return config;
}

export function createPairingCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

export function hashCode(code) {
  return createHash('sha256').update(String(code || '')).digest('hex');
}

export function beginPairing(paths, config, ttlMinutes = 15) {
  const code = createPairingCode();
  config.binding = {
    status: 'pending',
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + ttlMinutes * 60000).toISOString(),
    boundAt: null
  };
  saveGatewayConfig(paths, config);
  return code;
}

export function tryBind(paths, config, userId, text) {
  if (String(userId) !== String(config.ownerUid)) return { ok: false, reason: 'owner_mismatch' };
  if (config.binding?.status === 'bound') return { ok: true, alreadyBound: true };
  if (!config.binding?.codeHash || Date.parse(config.binding.expiresAt || 0) < Date.now()) return { ok: false, reason: 'expired' };
  const match = String(text || '').trim().match(/^\/bind\s+([A-Fa-f0-9]+)$/);
  if (!match || hashCode(match[1]) !== config.binding.codeHash) return { ok: false, reason: 'invalid_code' };
  config.binding = { status: 'bound', codeHash: null, expiresAt: null, boundAt: new Date().toISOString() };
  saveGatewayConfig(paths, config);
  return { ok: true, bound: true };
}

export function isAuthorized(config, userId, { guildId } = {}) {
  if (String(userId) !== String(config.ownerUid)) return false;
  if (config.serverId && guildId && String(guildId) !== String(config.serverId)) return false;
  return config.binding?.status === 'bound';
}
