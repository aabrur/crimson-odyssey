import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLayout, conversationLines } from '../src/tui/layout.js';
import { stripAnsi } from '../src/tui/ansi.js';

function baseState() {
  return {
    messages: [
      { role: 'user', content: 'Hello Crimson' },
      { role: 'assistant', content: 'Ready to work.' }
    ],
    input: 'type here',
    scroll: 0,
    sidebarScroll: 0,
    sidebarOpen: true,
    sidebarBreakpoint: 110,
    sidebarWidth: 34,
    focus: 'composer',
    heartbeat: { status: 'idle', health: 'healthy' },
    model: { provider: 'openai', model: 'gpt-test' },
    equipped: {
      weapon: [{ id: 'crimson-core', name: 'Crimson Core' }],
      armor: [{ id: 'production-guard', name: 'Production Guard' }],
      accessory: [],
      magic: []
    },
    logs: [],
    session: { id: 'session-1' },
    workspace: '/workspace',
    activeStage: 'ready'
  };
}

test('main TUI has no outer top or left frame', () => {
  const result = renderLayout(baseState(), 100, 24);
  const lines = stripAnsi(result.text).split('\n');
  assert.equal(lines[0].startsWith('┌'), false);
  assert.equal(lines[0].startsWith('│'), false);
  assert.equal(lines.every((line) => !line.startsWith('│')), true);
  assert.equal(lines.length, 24);
});

test('sidebar is hidden below breakpoint and visible in wide terminal', () => {
  assert.equal(renderLayout(baseState(), 100, 30).meta.sidebarVisible, false);
  const wide = renderLayout(baseState(), 140, 40);
  assert.equal(wide.meta.sidebarVisible, true);
  assert.equal(stripAnsi(wide.text).includes('STATUS'), true);
  assert.equal(stripAnsi(wide.text).includes('LOADOUT'), true);
  assert.equal(stripAnsi(wide.text).includes('MODEL'), true);
});

test('composer, detail, and legends occupy the final three rows', () => {
  const result = renderLayout(baseState(), 120, 30);
  const lines = stripAnsi(result.text).split('\n');
  assert.equal(lines.at(-3).trimStart().startsWith('❯'), true);
  assert.equal(lines.at(-2).includes('composer | idle | openai:gpt-test | ready'), true);
  assert.equal(lines.at(-1).includes('/help'), true);
});

test('conversation scroll clamps and reports lines below', () => {
  const state = baseState();
  state.messages = Array.from({ length: 30 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `message ${index}` }));
  state.scroll = 999;
  const result = renderLayout(state, 80, 20);
  assert.equal(result.meta.scroll, result.meta.maxScroll);
  assert.equal(stripAnsi(result.text).includes(`${result.meta.scroll} lines below`), true);
});

test('sidebar has an independent scroll range', () => {
  const state = baseState();
  state.logs = Array.from({ length: 50 }, (_, index) => ({ event: `log-${index}`, detail: {} }));
  state.sidebarScroll = 1000;
  const result = renderLayout(state, 140, 20);
  assert.equal(result.meta.sidebarVisible, true);
  assert.equal(result.meta.sidebarScroll, result.meta.sidebarMaxScroll);
  assert.equal(result.meta.scroll, 0);
});

test('layout matrix renders at required terminal sizes', () => {
  for (const [width, height] of [[80, 24], [100, 30], [120, 40], [140, 45], [160, 50], [200, 60]]) {
    const result = renderLayout(baseState(), width, height);
    const lines = result.text.split('\n');
    assert.equal(lines.length, height, `${width}x${height}`);
  }
});

test('conversation lines sanitize and wrap long content', () => {
  const lines = conversationLines([{ role: 'assistant', content: `hello\x1b[2J ${'word '.repeat(30)}` }], 30);
  assert.equal(lines.join('\n').includes('\x1b[2J'), false);
  assert.equal(lines.length > 3, true);
});

test('modal picker is rendered as an internal overlay without changing row count', () => {
  const state = baseState();
  state.modal = {
    title: 'Select Provider',
    choices: [{ label: 'OpenAI', value: 'openai' }, { label: 'Anthropic', value: 'anthropic' }],
    index: 1
  };
  const result = renderLayout(state, 120, 30);
  assert.equal(result.text.split('\n').length, 30);
  assert.equal(stripAnsi(result.text).includes('Select Provider'), true);
  assert.equal(stripAnsi(result.text).includes('2. Anthropic'), true);
});
