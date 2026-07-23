import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeWorkspace } from '../src/core/state.js';
import { fetchModels, classifyModel, getProvider } from '../src/providers/catalog.js';
import { createModelClient } from '../src/providers/client.js';
import { tempDir, jsonResponse } from './helpers.js';

test('provider registry contains the ten locked provider choices', () => {
  const ids = ['openai', 'anthropic', 'gemini', 'xai', 'mistral', 'groq', 'openrouter', 'ollama', 'lmstudio', 'custom'];
  for (const id of ids) assert.equal(getProvider(id).id, id);
});

test('model classification recognizes free, coding, fast, vision, and top hints', () => {
  assert.deepEqual(classifyModel('meta/model:free', 'openrouter'), ['free']);
  assert.equal(classifyModel('gpt-5.2-codex-mini', 'openai').includes('coding'), true);
  assert.equal(classifyModel('gpt-5.2-codex-mini', 'openai').includes('top'), true);
  assert.equal(classifyModel('gemini-flash-vision', 'gemini').includes('fast'), true);
  assert.equal(classifyModel('gemini-flash-vision', 'gemini').includes('vision'), true);
});

test('live OpenAI-compatible model catalog merges and caches results', async () => {
  const tmp = tempDir();
  process.env.OPENAI_API_KEY = 'test-key';
  try {
    const paths = initializeWorkspace(tmp.dir);
    const config = { models: { cacheTtlHours: 24 }, providers: { openai: { secretRef: 'env:OPENAI_API_KEY' } } };
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse({ data: [{ id: 'live-model-a' }, { id: 'live-model-b' }] });
    };
    const first = await fetchModels('openai', config, { paths, refresh: true, fetchImpl });
    assert.equal(first.models.some((item) => item.id === 'live-model-a'), true);
    const second = await fetchModels('openai', config, { paths, refresh: false, fetchImpl });
    assert.equal(second.fromCache, true);
    assert.equal(calls, 1);
  } finally {
    delete process.env.OPENAI_API_KEY;
    tmp.cleanup();
  }
});

test('Ollama catalog normalizes /api/tags payload', async () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    const result = await fetchModels('ollama', {}, {
      paths,
      refresh: true,
      fetchImpl: async () => jsonResponse({ models: [{ name: 'llama3.2:latest' }] })
    });
    assert.equal(result.models[0].id, 'llama3.2:latest');
    assert.equal(result.models[0].tags.includes('free'), true);
  } finally { tmp.cleanup(); }
});

test('OpenAI-compatible client builds chat completions request and parses answer', async () => {
  process.env.CRIMSON_CUSTOM_API_KEY = 'test-key';
  let request = null;
  try {
    const client = createModelClient({
      provider: 'custom',
      model: 'custom-model',
      baseUrl: 'http://localhost:8000/v1',
      secretRef: 'env:CRIMSON_CUSTOM_API_KEY'
    }, {}, {
      fetchImpl: async (url, options) => {
        request = { url, options, body: JSON.parse(options.body) };
        return jsonResponse({ choices: [{ message: { content: 'hello' } }], usage: { total_tokens: 7 } });
      }
    });
    const result = await client.send({ system: 'system', messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(request.url, 'http://localhost:8000/v1/chat/completions');
    assert.equal(request.body.model, 'custom-model');
    assert.equal(request.body.messages[0].role, 'system');
    assert.equal(result.text, 'hello');
  } finally { delete process.env.CRIMSON_CUSTOM_API_KEY; }
});

test('Anthropic client uses Messages API shape', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let request = null;
  try {
    const client = createModelClient({ provider: 'anthropic', model: 'claude-test', secretRef: 'env:ANTHROPIC_API_KEY' }, {}, {
      fetchImpl: async (url, options) => {
        request = { url, headers: options.headers, body: JSON.parse(options.body) };
        return jsonResponse({ content: [{ type: 'text', text: 'answer' }], usage: { input_tokens: 1, output_tokens: 2 } });
      }
    });
    const result = await client.send({ system: 'system', messages: [{ role: 'user', content: 'question' }] });
    assert.equal(request.url.endsWith('/v1/messages'), true);
    assert.equal(request.headers['x-api-key'], 'test-key');
    assert.equal(request.body.system, 'system');
    assert.equal(result.text, 'answer');
  } finally { delete process.env.ANTHROPIC_API_KEY; }
});

test('Ollama client uses local /api/chat endpoint without credential', async () => {
  let request = null;
  const client = createModelClient({ provider: 'ollama', model: 'llama3.2', baseUrl: 'http://127.0.0.1:11434' }, {}, {
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return jsonResponse({ message: { content: 'local answer' }, eval_count: 4 });
    }
  });
  const result = await client.send({ messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(request.url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(request.body.stream, false);
  assert.equal(result.text, 'local answer');
});
