export function decodeInput(data) {
  const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data || '');
  if (text === '\u0003') return { type: 'ctrl-c' };
  if (text === '\u0002') return { type: 'ctrl-b' };
  if (text === '\r' || text === '\n') return { type: 'enter' };
  if (text === '\t') return { type: 'tab' };
  if (text === '\x1b') return { type: 'escape' };
  if (text === '\x7f' || text === '\b') return { type: 'backspace' };
  if (text === '\x1b[A') return { type: 'up' };
  if (text === '\x1b[B') return { type: 'down' };
  if (text === '\x1b[C') return { type: 'right' };
  if (text === '\x1b[D') return { type: 'left' };
  if (text === '\x1b[5~') return { type: 'page-up' };
  if (text === '\x1b[6~') return { type: 'page-down' };
  if (text === '\x1b[H' || text === '\x1b[1~') return { type: 'home' };
  if (text === '\x1b[F' || text === '\x1b[4~') return { type: 'end' };
  const mouse = text.match(/\x1b\[<(?<button>\d+);(?<x>\d+);(?<y>\d+)(?<state>[Mm])/);
  if (mouse) return { type: 'mouse', button: Number(mouse.groups.button), x: Number(mouse.groups.x), y: Number(mouse.groups.y), state: mouse.groups.state };
  if (/^[\x20-\x7E\u0080-\uFFFF]+$/.test(text)) return { type: 'text', text };
  return { type: 'unknown', text };
}

export function mouseDirection(button) {
  if (button === 64) return 'up';
  if (button === 65) return 'down';
  return null;
}
