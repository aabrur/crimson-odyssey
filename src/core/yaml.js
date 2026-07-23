function scalar(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const text = String(value);
  if (!text || /[:#\n\r\[\]{}]|^\s|\s$/.test(text) || ['true', 'false', 'null'].includes(text.toLowerCase())) {
    return JSON.stringify(text);
  }
  return text;
}

export function stringifyYAML(value, depth = 0) {
  const pad = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const nested = stringifyYAML(item, depth + 1).split('\n');
        return `${pad}- ${nested[0].trimStart()}${nested.length > 1 ? `\n${nested.slice(1).join('\n')}` : ''}`;
      }
      return `${pad}- ${scalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return `${pad}{}`;
    return entries.map(([key, item]) => {
      if (item && typeof item === 'object') {
        const nested = stringifyYAML(item, depth + 1);
        return `${pad}${key}:\n${nested}`;
      }
      return `${pad}${key}: ${scalar(item)}`;
    }).join('\n');
  }
  return `${pad}${scalar(value)}`;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (!value) return '';
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try { return JSON.parse(value.startsWith("'") ? `"${value.slice(1, -1).replace(/"/g, '\\"')}"` : value); } catch { return value.slice(1, -1); }
  }
  if (value === '[]') return [];
  if (value === '{}') return {};
  return value;
}

export function parseYAML(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim() && !line.trimStart().startsWith('#'));
  if (!lines.length) return {};
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trim();
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).value;

    if (trimmed.startsWith('- ')) {
      if (!Array.isArray(parent)) continue;
      parent.push(parseScalar(trimmed.slice(2)));
      continue;
    }

    const split = trimmed.indexOf(':');
    if (split < 0) continue;
    const key = trimmed.slice(0, split).trim();
    const rest = trimmed.slice(split + 1).trim();
    if (rest) {
      parent[key] = parseScalar(rest);
      continue;
    }

    const next = lines[index + 1];
    const nextTrimmed = next?.trim() || '';
    const child = nextTrimmed.startsWith('- ') ? [] : {};
    parent[key] = child;
    stack.push({ indent, value: child });
  }
  return root;
}
