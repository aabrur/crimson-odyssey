import { getProvider } from './catalog.js';
import { resolveSecret } from '../core/secrets.js';

function openAIMessages(system, messages) {
  return [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages.map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content }))
  ];
}

async function parseError(response) {
  let detail = '';
  try {
    const payload = await response.json();
    detail = payload?.error?.message || payload?.message || JSON.stringify(payload);
  } catch {
    detail = await response.text().catch(() => '');
  }
  return `${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 300)}` : ''}`;
}

export function createModelClient(modelConfig, rootConfig = {}, { fetchImpl = fetch } = {}) {
  const provider = getProvider(modelConfig.provider);
  const providerConfig = rootConfig?.providers?.[provider.id] || {};
  const baseUrl = modelConfig.baseUrl || providerConfig.baseUrl || provider.baseUrl;
  const secretRef = modelConfig.secretRef || providerConfig.secretRef || (provider.secretEnv ? `env:${provider.secretEnv}` : null);

  async function send({ system = '', messages = [], temperature = 0.2, maxTokens = 4096 }) {
    if (!modelConfig.model) throw new Error('No model is selected. Run crimson setup or use /model.');
    const key = resolveSecret(secretRef);
    if (provider.secretEnv && !key && !['ollama', 'lmstudio'].includes(provider.id)) {
      throw new Error(`No credential is available for ${provider.name}`);
    }
    if (!baseUrl) throw new Error(`No base URL is configured for ${provider.name}`);

    if (provider.kind === 'anthropic') {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelConfig.model,
          system,
          messages: messages.map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content })),
          max_tokens: maxTokens,
          temperature
        })
      });
      if (!response.ok) throw new Error(await parseError(response));
      const payload = await response.json();
      return {
        text: (payload.content || []).map((item) => item?.text || '').join(''),
        usage: payload.usage || null,
        raw: payload
      };
    }

    if (provider.kind === 'ollama') {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: openAIMessages(system, messages),
          stream: false,
          options: { temperature }
        })
      });
      if (!response.ok) throw new Error(await parseError(response));
      const payload = await response.json();
      return { text: payload?.message?.content || '', usage: payload?.eval_count ? { output_tokens: payload.eval_count } : null, raw: payload };
    }

    const headers = { 'content-type': 'application/json' };
    if (key) headers.authorization = `Bearer ${key}`;
    if (provider.id === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/aabrur/crimson-odyssey';
      headers['X-Title'] = 'Crimson Odyssey';
    }
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelConfig.model,
        messages: openAIMessages(system, messages),
        temperature,
        max_tokens: maxTokens
      })
    });
    if (!response.ok) throw new Error(await parseError(response));
    const payload = await response.json();
    return {
      text: payload?.choices?.[0]?.message?.content || '',
      usage: payload?.usage || null,
      raw: payload
    };
  }

  return { provider, send };
}
