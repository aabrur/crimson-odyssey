import { resolveSecret } from '../core/secrets.js';
import { getOrCreateGatewaySession } from '../session/session.js';
import { runAgentTurn } from '../agent/runtime.js';
import { isAuthorized, tryBind } from './common.js';

const API = 'https://discord.com/api/v10';
const INTENTS = 1 | 512 | 4096 | 32768;

async function discordApi(config, path, { method = 'GET', body, fetchImpl = fetch } = {}) {
  const token = resolveSecret(config.secretRef);
  if (!token) throw new Error('Discord token is unavailable');
  const response = await fetchImpl(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bot ${token}`,
      'content-type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || `Discord HTTP ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function doctorDiscord(config, { fetchImpl = fetch } = {}) {
  try {
    const user = await discordApi(config, '/users/@me', { fetchImpl });
    let guild = null;
    if (config.serverId) {
      try { guild = await discordApi(config, `/guilds/${config.serverId}`, { fetchImpl }); } catch { guild = null; }
    }
    return {
      ok: true,
      bot: { id: user.id, username: user.username },
      server: config.serverId ? (guild ? { id: guild.id, name: guild.name } : null) : null,
      binding: config.binding?.status || 'unbound'
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function sendDiscord(config, channelId, text, { fetchImpl = fetch } = {}) {
  return discordApi(config, `/channels/${channelId}/messages`, {
    method: 'POST',
    body: { content: String(text).slice(0, 2000), allowed_mentions: { parse: [] } },
    fetchImpl
  });
}

export async function runDiscordGateway({ paths, config, workspace = process.cwd(), fetchImpl = fetch, signal, onEvent }) {
  if (typeof WebSocket !== 'function') throw new Error('Discord Gateway requires Node.js 22 or a WebSocket implementation');
  const token = resolveSecret(config.secretRef);
  if (!token) throw new Error('Discord token is unavailable');
  const gateway = await discordApi(config, '/gateway/bot', { fetchImpl });
  const url = `${gateway.url || 'wss://gateway.discord.gg/'}?v=10&encoding=json`;
  let sequence = null;
  let heartbeatTimer = null;
  let sessionId = null;
  let resumeUrl = null;

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const close = () => {
      clearInterval(heartbeatTimer);
      try { socket.close(1000, 'shutdown'); } catch { /* best effort */ }
      resolve();
    };
    signal?.addEventListener('abort', close, { once: true });

    socket.addEventListener('open', () => onEvent?.({ event: 'discord.connected' }));
    socket.addEventListener('error', (event) => {
      const error = new Error(event?.message || 'Discord Gateway WebSocket error');
      onEvent?.({ event: 'discord.error', error: error.message });
    });
    socket.addEventListener('close', (event) => {
      clearInterval(heartbeatTimer);
      onEvent?.({ event: 'discord.closed', code: event.code, reason: event.reason });
      if (!signal?.aborted && event.code !== 1000) reject(new Error(`Discord Gateway closed with ${event.code}`));
      else resolve();
    });
    socket.addEventListener('message', async (event) => {
      try {
        const payload = JSON.parse(String(event.data));
        if (payload.s != null) sequence = payload.s;
        if (payload.op === 10) {
          const interval = payload.d.heartbeat_interval;
          heartbeatTimer = setInterval(() => socket.send(JSON.stringify({ op: 1, d: sequence })), interval);
          socket.send(JSON.stringify({
            op: 2,
            d: {
              token,
              intents: INTENTS,
              properties: { os: process.platform, browser: 'crimson-odyssey', device: 'crimson-odyssey' }
            }
          }));
          return;
        }
        if (payload.op === 7) {
          socket.close(4000, 'reconnect requested');
          return;
        }
        if (payload.op !== 0) return;
        if (payload.t === 'READY') {
          sessionId = payload.d.session_id;
          resumeUrl = payload.d.resume_gateway_url;
          onEvent?.({ event: 'discord.ready', sessionId, resumeUrl });
          return;
        }
        if (payload.t !== 'MESSAGE_CREATE') return;
        const message = payload.d;
        if (message.author?.bot || !message.content) return;
        const bind = tryBind(paths, config, message.author.id, message.content);
        if (bind.bound) {
          await sendDiscord(config, message.channel_id, 'Crimson Odyssey is now bound to this owner.', { fetchImpl });
          return;
        }
        if (!isAuthorized(config, message.author.id, { guildId: message.guild_id })) {
          onEvent?.({ event: 'discord.unauthorized', userId: message.author.id, guildId: message.guild_id || null });
          return;
        }
        const session = getOrCreateGatewaySession(paths, 'discord', message.channel_id);
        const result = await runAgentTurn({ workspace, session, text: message.content, fetchImpl, onActivity: onEvent });
        await sendDiscord(config, message.channel_id, result.answer, { fetchImpl });
      } catch (error) {
        onEvent?.({ event: 'discord.message_error', error: error.message });
      }
    });
  });
}
