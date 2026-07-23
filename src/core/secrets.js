import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { globalPaths } from './paths.js';
import { ensureDir, readJSON, writeJSON, safeName } from './fs.js';

const SERVICE = 'crimson-odyssey';

function commandExists(command) {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(checker, [command], { encoding: 'utf8', windowsHide: true }).status === 0;
}

export function keyringBackend() {
  if (process.platform === 'darwin' && commandExists('security')) return 'macos-keychain';
  if (process.platform === 'linux' && commandExists('secret-tool')) return 'secret-service';
  return null;
}

function keyringSet(name, value) {
  const backend = keyringBackend();
  if (backend === 'macos-keychain') {
    const result = spawnSync('security', ['add-generic-password', '-a', name, '-s', SERVICE, '-w', value, '-U'], { encoding: 'utf8', windowsHide: true });
    if (result.status === 0) return true;
  }
  if (backend === 'secret-service') {
    const result = spawnSync('secret-tool', ['store', '--label', `Crimson ${name}`, 'service', SERVICE, 'name', name], {
      input: value,
      encoding: 'utf8',
      windowsHide: true
    });
    if (result.status === 0) return true;
  }
  return false;
}

function keyringGet(name) {
  const backend = keyringBackend();
  if (backend === 'macos-keychain') {
    const result = spawnSync('security', ['find-generic-password', '-a', name, '-s', SERVICE, '-w'], { encoding: 'utf8', windowsHide: true });
    return result.status === 0 ? result.stdout.trim() : null;
  }
  if (backend === 'secret-service') {
    const result = spawnSync('secret-tool', ['lookup', 'service', SERVICE, 'name', name], { encoding: 'utf8', windowsHide: true });
    return result.status === 0 ? result.stdout.trim() : null;
  }
  return null;
}

function keyringDelete(name) {
  const backend = keyringBackend();
  if (backend === 'macos-keychain') {
    return spawnSync('security', ['delete-generic-password', '-a', name, '-s', SERVICE], { encoding: 'utf8', windowsHide: true }).status === 0;
  }
  if (backend === 'secret-service') {
    return spawnSync('secret-tool', ['clear', 'service', SERVICE, 'name', name], { encoding: 'utf8', windowsHide: true }).status === 0;
  }
  return false;
}

function loadMasterKey(home) {
  const paths = globalPaths(home);
  ensureDir(paths.home);
  if (!existsSync(paths.vaultKey)) {
    writeFileSync(paths.vaultKey, randomBytes(32), { mode: 0o600 });
    try { chmodSync(paths.vaultKey, 0o600); } catch { /* best effort on Windows */ }
  }
  const key = readFileSync(paths.vaultKey);
  if (key.length !== 32) throw new Error('Crimson vault key is invalid');
  return key;
}

function encrypt(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  };
}

function decrypt(record, key) {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(record.data, 'base64')), decipher.final()]).toString('utf8');
}

function vaultSet(name, value, home) {
  const paths = globalPaths(home);
  const vault = readJSON(paths.vault, { version: 1, entries: {} });
  vault.entries[name] = encrypt(value, loadMasterKey(home));
  writeJSON(paths.vault, vault, { mode: 0o600 });
  try { chmodSync(paths.vault, 0o600); } catch { /* best effort */ }
  return true;
}

function vaultGet(name, home) {
  const paths = globalPaths(home);
  const vault = readJSON(paths.vault, { entries: {} });
  const record = vault.entries?.[name];
  return record ? decrypt(record, loadMasterKey(home)) : null;
}

function vaultDelete(name, home) {
  const paths = globalPaths(home);
  const vault = readJSON(paths.vault, { version: 1, entries: {} });
  if (!vault.entries?.[name]) return false;
  delete vault.entries[name];
  writeJSON(paths.vault, vault, { mode: 0o600 });
  return true;
}

export function setSecret(name, value, { home } = {}) {
  const safe = safeName(name, 'secret');
  if (!value) throw new Error('Secret value cannot be empty');
  if (keyringSet(safe, value)) return `keyring:${safe}`;
  vaultSet(safe, value, home);
  return `vault:${safe}`;
}

export function resolveSecret(ref, { home } = {}) {
  if (!ref) return null;
  if (ref.startsWith('env:')) return process.env[ref.slice(4)] || null;
  if (ref.startsWith('keyring:')) return keyringGet(ref.slice(8));
  if (ref.startsWith('vault:')) return vaultGet(ref.slice(6), home);
  return null;
}

export function deleteSecret(ref, { home } = {}) {
  if (ref?.startsWith('keyring:')) return keyringDelete(ref.slice(8));
  if (ref?.startsWith('vault:')) return vaultDelete(ref.slice(6), home);
  return false;
}

export function secretStatus(ref, { home } = {}) {
  return { ref: ref || null, available: Boolean(resolveSecret(ref, { home })), backend: ref?.split(':')[0] || null };
}
