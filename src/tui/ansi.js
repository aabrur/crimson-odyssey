export const ESC = '\x1b[';

export const ansi = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  crimson: `${ESC}38;5;197m`,
  red: `${ESC}38;5;203m`,
  white: `${ESC}38;5;255m`,
  gray: `${ESC}38;5;245m`,
  dark: `${ESC}38;5;238m`,
  cyan: `${ESC}38;5;81m`,
  green: `${ESC}38;5;84m`,
  yellow: `${ESC}38;5;221m`,
  bgDark: `${ESC}48;5;234m`,
  bgCrimson: `${ESC}48;5;52m`
};

export function stripAnsi(value) {
  return String(value || '').replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

export function sanitizeTerminalText(value) {
  return String(value ?? '')
    .replace(/\x1B\][^\x07]*(?:\x07|\x1B\\)/g, '')
    .replace(/\x1B[P^_][\s\S]*?\x1B\\/g, '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function visibleLength(value) {
  return [...stripAnsi(value)].length;
}

export function pad(value, width) {
  const text = String(value || '');
  const length = visibleLength(text);
  if (length >= width) return truncate(text, width);
  return `${text}${' '.repeat(width - length)}`;
}

export function truncate(value, width, suffix = '…') {
  const plain = stripAnsi(value);
  if ([...plain].length <= width) return String(value || '');
  if (width <= [...suffix].length) return [...plain].slice(0, width).join('');
  return `${[...plain].slice(0, width - [...suffix].length).join('')}${suffix}`;
}

export function wrapText(value, width) {
  const text = sanitizeTerminalText(value);
  if (width <= 1) return [truncate(text, Math.max(1, width))];
  const out = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if ([...word].length > width) {
        if (line) { out.push(line); line = ''; }
        let rest = word;
        while ([...rest].length > width) {
          out.push([...rest].slice(0, width).join(''));
          rest = [...rest].slice(width).join('');
        }
        line = rest;
      } else if (!line) {
        line = word;
      } else if ([...line].length + 1 + [...word].length <= width) {
        line += ` ${word}`;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [''];
}
