import { ansi, pad, stripAnsi, truncate, visibleLength, wrapText } from './ansi.js';

function colorRole(role) {
  if (role === 'user') return ansi.cyan;
  if (role === 'assistant') return ansi.crimson;
  if (role === 'error') return ansi.red;
  if (role === 'activity') return ansi.gray;
  return ansi.yellow;
}

export function conversationLines(messages, width) {
  const contentWidth = Math.max(12, width - 3);
  const lines = [];
  for (const message of messages || []) {
    const role = message.kind === 'error' ? 'error' : message.role || 'system';
    const label = role === 'user' ? 'YOU' : role === 'assistant' ? 'CRIMSON' : role.toUpperCase();
    lines.push(`${colorRole(role)}${ansi.bold}${label}${ansi.reset}`);
    const wrapped = wrapText(message.content, contentWidth);
    for (const line of wrapped) lines.push(`  ${line}`);
    lines.push('');
  }
  return lines;
}

function loadoutLines(equipped = {}) {
  const slotNames = [
    ['weapon', 'WEAPON'],
    ['armor', 'ARMOR'],
    ['accessory', 'ACCESSORIES'],
    ['magic', 'MAGIC']
  ];
  const lines = [];
  for (const [slot, title] of slotNames) {
    lines.push(`${ansi.dim}${title}${ansi.reset}`);
    const items = equipped[slot] || [];
    if (!items.length) lines.push('  Empty');
    for (const item of items) lines.push(`  ${truncate(item.name || item.id, 26)}`);
    lines.push('');
  }
  return lines;
}

export function sidebarLines(state, width) {
  const inner = Math.max(18, width - 3);
  const heartbeat = state.heartbeat || {};
  const model = state.model || {};
  const logs = state.logs || [];
  return [
    `${ansi.crimson}${ansi.bold}STATUS${ansi.reset}`,
    `  ${heartbeat.status || 'idle'}  ${heartbeat.health || 'healthy'}`,
    `  Session ${truncate(state.session?.id || 'none', inner - 10)}`,
    `  ${truncate(state.workspace || process.cwd(), inner - 2)}`,
    '',
    `${ansi.crimson}${ansi.bold}MODEL${ansi.reset}`,
    `  ${model.provider || 'not configured'}`,
    `  ${truncate(model.model || 'run /model', inner - 2)}`,
    '',
    `${ansi.crimson}${ansi.bold}LOADOUT${ansi.reset}`,
    ...loadoutLines(state.equipped),
    `${ansi.crimson}${ansi.bold}RECENT LOGS${ansi.reset}`,
    ...logs.slice(-20).reverse().flatMap((entry) => [
      `  ${truncate(entry.event || entry.message || '', inner - 2)}`,
      entry.detail?.message ? `  ${ansi.dim}${truncate(entry.detail.message, inner - 2)}${ansi.reset}` : null
    ].filter(Boolean))
  ];
}

function overlay(baseLines, modal, width, height) {
  if (!modal) return baseLines;
  const choices = modal.choices || [];
  const modalWidth = Math.min(Math.max(42, ...choices.map((choice) => visibleLength(choice.label || choice.value || '') + 8)), Math.max(30, width - 8));
  const visibleCount = Math.min(12, choices.length || 1);
  const modalHeight = Math.min(height - 4, visibleCount + 5);
  const left = Math.max(1, Math.floor((width - modalWidth) / 2));
  const top = Math.max(1, Math.floor((height - modalHeight) / 2));
  const box = [];
  box.push(`${ansi.bgDark}${ansi.crimson}${ansi.bold} ${truncate(modal.title || 'Select', modalWidth - 2)} ${ansi.reset}`);
  box.push(`${ansi.bgDark}${ansi.dim}${truncate(modal.subtitle || 'Use arrows, numbers, Enter, or Esc', modalWidth)}${ansi.reset}`);
  const start = Math.max(0, Math.min(modal.scroll || 0, Math.max(0, choices.length - visibleCount)));
  for (let i = 0; i < visibleCount; i += 1) {
    const choiceIndex = start + i;
    const choice = choices[choiceIndex];
    const selected = choiceIndex === (modal.index || 0);
    const prefix = selected ? `${ansi.bgCrimson}${ansi.white}>` : `${ansi.bgDark} `;
    const label = choice ? `${choiceIndex + 1}. ${choice.label || choice.value}` : '';
    box.push(`${prefix} ${pad(truncate(label, modalWidth - 3), modalWidth - 3)}${ansi.reset}`);
  }
  if (modal.mode === 'text') box.push(`${ansi.bgDark}${ansi.cyan}> ${pad(truncate(modal.input || '', modalWidth - 3), modalWidth - 3)}${ansi.reset}`);
  else box.push(`${ansi.bgDark}${ansi.dim}${pad(modal.footer || '0 custom  Enter select  Esc close', modalWidth)}${ansi.reset}`);

  const out = [...baseLines];
  for (let row = 0; row < box.length && top + row < height; row += 1) {
    const current = out[top + row] || ' '.repeat(width);
    const plain = stripAnsi(current).padEnd(width, ' ');
    out[top + row] = `${plain.slice(0, left)}${box[row]}${plain.slice(left + modalWidth)}`;
  }
  return out;
}

export function renderLayout(state, width = 100, height = 30) {
  const minHeight = 8;
  const h = Math.max(minHeight, height);
  const sidebarVisible = width >= (state.sidebarBreakpoint || 110) && state.sidebarOpen !== false;
  const sidebarWidth = sidebarVisible ? Math.min(state.sidebarWidth || 34, Math.floor(width * 0.36)) : 0;
  const dividerWidth = sidebarVisible ? 1 : 0;
  const mainWidth = Math.max(30, width - sidebarWidth - dividerWidth);
  const transcriptHeight = h - 3;
  const allConversation = conversationLines(state.messages || [], mainWidth - 1);
  const maxScroll = Math.max(0, allConversation.length - transcriptHeight);
  const scroll = Math.max(0, Math.min(state.scroll || 0, maxScroll));
  const end = Math.max(0, allConversation.length - scroll);
  const start = Math.max(0, end - transcriptHeight);
  const transcript = allConversation.slice(start, end);
  while (transcript.length < transcriptHeight) transcript.unshift('');

  const sidebarAll = sidebarVisible ? sidebarLines(state, sidebarWidth) : [];
  const sidebarMaxScroll = Math.max(0, sidebarAll.length - transcriptHeight);
  const sidebarScroll = Math.max(0, Math.min(state.sidebarScroll || 0, sidebarMaxScroll));
  const sidebarSlice = sidebarAll.slice(sidebarScroll, sidebarScroll + transcriptHeight);

  const lines = [];
  for (let row = 0; row < transcriptHeight; row += 1) {
    const main = pad(transcript[row] || '', mainWidth);
    if (sidebarVisible) {
      const side = pad(sidebarSlice[row] || '', sidebarWidth);
      lines.push(`${main}${ansi.dark}│${ansi.reset}${side}`);
    } else {
      lines.push(pad(main, width));
    }
  }

  const newBelow = scroll > 0 ? `  ${ansi.yellow}${scroll} lines below${ansi.reset}` : '';
  const composerPrompt = state.busy ? `${ansi.yellow}…${ansi.reset}` : `${ansi.crimson}❯${ansi.reset}`;
  lines.push(`${composerPrompt} ${pad(truncate(state.input || '', Math.max(1, width - 4 - visibleLength(newBelow))), Math.max(1, width - 4 - visibleLength(newBelow)))}${newBelow}`);
  const detail = ` ${ansi.dim}${state.focus || 'composer'} | ${state.heartbeat?.status || 'idle'} | ${state.model?.provider || 'no provider'}:${state.model?.model || 'no model'} | ${state.activeStage || 'ready'}${ansi.reset}`;
  lines.push(pad(detail, width));
  const legends = ` ${ansi.dim}/help  /model  /loadout  /session  Ctrl+B sidebar  PgUp/PgDn history  Tab focus  Ctrl+C exit${ansi.reset}`;
  lines.push(pad(legends, width));

  const withModal = overlay(lines, state.modal, width, h);
  return {
    text: withModal.slice(0, h).join('\n'),
    meta: { sidebarVisible, sidebarWidth, mainWidth, transcriptHeight, maxScroll, scroll, sidebarMaxScroll, sidebarScroll }
  };
}
