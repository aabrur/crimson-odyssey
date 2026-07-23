import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeInput, mouseDirection } from '../src/tui/input.js';

test('keyboard input decoder recognizes navigation and control keys', () => {
  assert.deepEqual(decodeInput('\x1b[A'), { type: 'up' });
  assert.deepEqual(decodeInput('\x1b[B'), { type: 'down' });
  assert.deepEqual(decodeInput('\x1b[5~'), { type: 'page-up' });
  assert.deepEqual(decodeInput('\x1b[6~'), { type: 'page-down' });
  assert.deepEqual(decodeInput('\u0002'), { type: 'ctrl-b' });
  assert.deepEqual(decodeInput('\u0003'), { type: 'ctrl-c' });
  assert.deepEqual(decodeInput('hello'), { type: 'text', text: 'hello' });
});

test('mouse wheel decoder maps SGR mouse buttons', () => {
  const up = decodeInput('\x1b[<64;120;20M');
  const down = decodeInput('\x1b[<65;5;10M');
  assert.equal(up.type, 'mouse');
  assert.equal(up.x, 120);
  assert.equal(mouseDirection(up.button), 'up');
  assert.equal(mouseDirection(down.button), 'down');
});
