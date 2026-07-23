import { resolveSecret } from '../core/secrets.js';
import { getOrCreateGatewaySession } from '../session/session.js';
import { runAgentTurn } from '../agent/runtime.js';
import { isAuthorized, tryBind } from './common.js';

function endpoint(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function api(token, method, body = {}, fetchImpl = fetch) {
  const response = await fetchImpl(endpoint(token, method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload?.description || `Telegram HTTP ${response.status}`);
  return payload.result;
}

export async function doctorTelegram(config, { fetchImpl = fetch } = {}) {
  const token = resolveSecret(config.secretRef);
  if (!token) return { ok: false, error: 'secret_unavailable' };
  try {
    const me = await api(token, 'getMe', {}, fetchImpl);
    return { ok: true, bot: { id: me.id, username: me.username, name: me.first_name }, binding: config.binding?.status || 'unbound' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function sendTelegram(config, chatId, text, { fetchImpl = fetch } = {}) {
  const token = resolveSecret(config.secretRef);
  return api(token, 'sendMessage', { chat_id: chatId, text: String(text).slice(0, 4096) }, fetchImpl);
}

export async function runTelegramGateway({ paths, config, workspace = process.cwd(), fetchImpl = fetch, signal, onEvent }) {
  const token = resolveSecret(config.secretRef);
  if (!token) throw new Error('Telegram token is unavailable');
  let offset = config.runtime?.offset || 0;
  onEvent?.({ event: 'telegram.started' });
  while (!signal?.aborted) {
    try {
      const updates = await api(token, 'getUpdates', { offset, timeout: 25, allowed_updates: ['message'] }, fetchImpl);
      for (const update of updates || []) {
        offset = Math.max(offset, update.update_id + 1);
        const message = update.message;
        if (!message?.text) continue;
        const userId = message.from?.id;
        const chatId = message.chat?.id;
        const bind = tryBind(paths, config, userId, message.text);
        if (bind.bound) {
          await sendTelegram(config, chatId, 'Crimson Odyssey is now bound to this owner.', { fetchImpl });
          continue;
        }
        if (!isAuthorized(config, userId)) {
          onEvent?.({ event: 'telegram.unauthorized', userId: String(userId) });
          continue;
        }
        const session = getOrCreateGatewaySession(paths, 'telegram', chatId);
        const result = await runAgentTurn({ workspace, session, text: message.text, fetchImpl, onActivity: onEvent });
        await sendTelegram(config, chatId, result.answer, { fetchImpl });
      }
      config.runtime = { ...(config.runtime || {}), offset };
    } catch (error) {
      onEvent?.({ event: 'telegram.error', error: error.message });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  onEvent?.({ event: 'telegram.stopped' });
}
