import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { existsSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';
import { VERSION, PRODUCT, STUDIO, CODENAME } from './core/identity.js';
import { loadWorkspaceState, initializeWorkspace, readYamlFile, updateYamlFile } from './core/state.js';
import { runModelSetup, promptChoice } from './providers/picker.js';
import { fetchModels, PROVIDERS } from './providers/catalog.js';
import { runDoctor } from './doctor.js';
import { runTUI } from './tui/app.js';
import { createSession, listSessions, pruneHistory, archiveSession } from './session/session.js';
import { runAgentTurn } from './agent/runtime.js';
import { loadSkillCatalog, loadoutPreview, installSkill, equipSkill, unequipSkill, validateSkill } from './loadout/engine.js';
import { setSecret } from './core/secrets.js';
import { saveGatewayConfig, loadGatewayConfig, beginPairing } from './gateway/common.js';
import { doctorGateway, runGateway } from './gateway/index.js';
import { rollbackFile } from './core/revisions.js';
import { readJSON, writeJSON } from './core/fs.js';
import { readSecret } from './core/terminal.js';

function print(value = '') {
  stdout.write(`${value}\n`);
}

function usage() {
  return `${PRODUCT} v${VERSION} (${CODENAME})
${STUDIO}

Usage:
  crimson                         Open the adaptive TUI
  crimson setup                   Configure provider and model
  crimson doctor [--json] [--live]
  crimson fix                     Initialize and repair local state
  crimson status [--json]
  crimson run <prompt>            Run one agent turn
  crimson models [provider]       Show model catalog
  crimson loadout <command>       Manage skills and equipment
  crimson gateway <command>       Configure Telegram or Discord
  crimson soul <command>          View, edit, or rollback Soul
  crimson identity <command>      View, edit, or rollback Identity
  crimson session <command>       Manage sessions
  crimson --version

Run crimson <command> --help for command details.`;
}

function parseFlags(args) {
  const flags = new Set(args.filter((item) => item.startsWith('--')));
  return { flags, positional: args.filter((item) => !item.startsWith('--')) };
}

function printDoctor(report) {
  print(`${PRODUCT} doctor: ${report.status.toUpperCase()}`);
  print(`Workspace: ${report.workspace}\n`);
  for (const item of report.checks) {
    const icon = item.ok ? 'OK' : item.severity === 'warning' ? 'WARN' : 'FAIL';
    print(`[${icon}] ${item.name}: ${item.detail}`);
  }
  print(`\nPassed ${report.counts.passed}, warnings ${report.counts.warnings}, failed ${report.counts.failed}`);
}

async function commandDoctor(args, workspace) {
  const { flags } = parseFlags(args);
  const report = await runDoctor({ workspace, live: flags.has('--live'), doctorGateway });
  if (flags.has('--json')) print(JSON.stringify(report, null, 2));
  else printDoctor(report);
  return report.ok ? 0 : 1;
}

function commandStatus(args, workspace) {
  const state = loadWorkspaceState(workspace);
  const preview = loadoutPreview(state.paths, state.workspace.loadout || 'default');
  const status = {
    product: PRODUCT,
    version: VERSION,
    workspace: state.paths.workspace,
    stateRoot: state.paths.root,
    heartbeat: state.heartbeat,
    model: state.model,
    loadout: Object.fromEntries(Object.entries(preview.equipped).map(([slot, skills]) => [slot, skills.map((skill) => skill.id)])),
    sessions: listSessions(state.paths).length
  };
  if (args.includes('--json')) print(JSON.stringify(status, null, 2));
  else {
    print(`${PRODUCT} v${VERSION}`);
    print(`Workspace: ${status.workspace}`);
    print(`State: ${status.stateRoot}`);
    print(`Status: ${status.heartbeat.status || 'idle'} / ${status.heartbeat.health || 'healthy'}`);
    print(`Model: ${status.model.provider || 'none'} / ${status.model.model || 'none'}`);
    for (const [slot, ids] of Object.entries(status.loadout)) print(`${slot}: ${ids.join(', ') || 'empty'}`);
    print(`Sessions: ${status.sessions}`);
  }
  return 0;
}

async function commandRun(args, workspace) {
  const prompt = args.join(' ').trim();
  if (!prompt) throw new Error('Usage: crimson run <prompt>');
  const state = loadWorkspaceState(workspace);
  const session = createSession(state.paths, { platform: 'cli' });
  const result = await runAgentTurn({ workspace, session, text: prompt });
  print(result.answer);
  return 0;
}

async function commandModels(args, workspace) {
  const state = loadWorkspaceState(workspace);
  const providerId = args.find((item) => !item.startsWith('--')) || state.model.provider || 'openai';
  const refresh = args.includes('--refresh');
  const catalog = await fetchModels(providerId, state.config, { paths: state.paths, refresh });
  print(`${catalog.provider.name} models${catalog.fetchedAt ? `, fetched ${catalog.fetchedAt}` : ''}:`);
  if (!catalog.models.length) print('No models available. Run crimson setup or enter a custom model ID.');
  catalog.models.forEach((entry, index) => print(`${index + 1}. ${entry.id}${entry.tags.length ? ` [${entry.tags.join(', ')}]` : ''} [${entry.source}]`));
  return 0;
}

function loadoutHelp() {
  return `Loadout commands:
  crimson loadout list
  crimson loadout preview
  crimson loadout install <directory>
  crimson loadout validate [skill-id]
  crimson loadout equip <skill-id> <weapon|armor|accessory|magic>
  crimson loadout unequip <skill-id> <slot>`;
}

function commandLoadout(args, workspace) {
  const state = loadWorkspaceState(workspace);
  const [sub = 'preview', ...rest] = args;
  if (['--help', 'help'].includes(sub)) return print(loadoutHelp()) || 0;
  if (sub === 'list') {
    for (const skill of loadSkillCatalog(state.paths)) {
      const validation = validateSkill(skill);
      print(`${skill.id}\t${skill.name}\t${skill.slots.join(',')}\t${skill.source}\t${validation.valid ? 'valid' : 'invalid'}`);
    }
    return 0;
  }
  if (sub === 'preview') {
    const preview = loadoutPreview(state.paths, state.workspace.loadout || 'default');
    print(`Loadout: ${preview.loadout.name}`);
    for (const [slot, skills] of Object.entries(preview.equipped)) {
      print(`\n${slot.toUpperCase()}`);
      if (!skills.length) print('  Empty');
      for (const skill of skills) {
        print(`  ${skill.name} (${skill.id})`);
        print(`    ${skill.description}`);
        print(`    source=${skill.source}, context=${skill.contextCost}, permissions=${skill.permissions?.join(',') || 'none'}`);
      }
    }
    return 0;
  }
  if (sub === 'install') {
    if (!rest[0]) throw new Error('Usage: crimson loadout install <directory>');
    const skill = installSkill(rest[0], state.paths);
    print(`Installed ${skill.name} (${skill.id})`);
    return 0;
  }
  if (sub === 'validate') {
    const skills = loadSkillCatalog(state.paths).filter((skill) => !rest[0] || skill.id === rest[0]);
    if (!skills.length) throw new Error('No matching skill found');
    let invalid = 0;
    for (const skill of skills) {
      const result = validateSkill(skill);
      print(`${result.valid ? 'OK' : 'FAIL'} ${skill.id}${result.errors.length ? `: ${result.errors.join(', ')}` : ''}`);
      if (!result.valid) invalid += 1;
    }
    return invalid ? 1 : 0;
  }
  if (sub === 'equip') {
    const [skillId, slot] = rest;
    if (!skillId || !slot) throw new Error('Usage: crimson loadout equip <skill-id> <slot>');
    equipSkill(state.paths, { loadoutName: state.workspace.loadout || 'default', skillId, slot });
    print(`Equipped ${skillId} as ${slot}`);
    return 0;
  }
  if (sub === 'unequip') {
    const [skillId, slot] = rest;
    if (!skillId || !slot) throw new Error('Usage: crimson loadout unequip <skill-id> <slot>');
    unequipSkill(state.paths, { loadoutName: state.workspace.loadout || 'default', skillId, slot });
    print(`Unequipped ${skillId} from ${slot}`);
    return 0;
  }
  throw new Error(`Unknown loadout command: ${sub}`);
}

function gatewayHelp() {
  return `Gateway commands:
  crimson gateway add <telegram|discord>
  crimson gateway list
  crimson gateway doctor <id>
  crimson gateway bind <id>
  crimson gateway start <id>`;
}

async function commandGateway(args, workspace) {
  const state = loadWorkspaceState(workspace);
  const [sub = 'list', ...rest] = args;
  if (['--help', 'help'].includes(sub)) return print(gatewayHelp()) || 0;
  if (sub === 'list') {
    const names = existsSync(state.paths.gateways) ? readdirSync(state.paths.gateways).filter((name) => name.endsWith('.json')) : [];
    if (!names.length) print('No gateways configured.');
    for (const name of names) {
      const config = readJSON(`${state.paths.gateways}/${name}`, {});
      print(`${config.id}\t${config.type}\towner=${config.ownerUid}\tbinding=${config.binding?.status || 'unbound'}\tenabled=${config.enabled !== false}`);
    }
    return 0;
  }
  if (sub === 'add') {
    const requestedType = rest[0];
    const reader = readline.createInterface({ input: stdin, output: stdout });
    try {
      let type = requestedType;
      if (!['telegram', 'discord'].includes(type)) {
        type = (await promptChoice('Select gateway', [
          { label: 'Telegram', value: 'telegram' },
          { label: 'Discord', value: 'discord' }
        ], { rl: reader })).value;
      }
      const id = (await reader.question(`Gateway ID [${type}]: `)).trim() || type;
      reader.close();
      const token = await readSecret(`${type} bot token: `);
      if (!token) throw new Error('Bot token is required');
      const detailsReader = readline.createInterface({ input: stdin, output: stdout });
      const ownerUid = (await detailsReader.question('Owner UID: ')).trim();
      if (!ownerUid) throw new Error('Owner UID is required');
      const serverId = type === 'discord' ? (await detailsReader.question('Discord Server ID, optional: ')).trim() : null;
      const name = (await detailsReader.question(`Display name [${type}]: `)).trim() || type;
      detailsReader.close();
      const secretRef = setSecret(`${id}-bot-token`, token);
      const config = {
        id,
        type,
        name,
        secretRef,
        ownerUid,
        serverId: serverId || null,
        ownerOnly: true,
        enabled: true,
        createdAt: new Date().toISOString(),
        binding: { status: 'unbound' }
      };
      saveGatewayConfig(state.paths, config);
      const code = beginPairing(state.paths, config);
      print(`Gateway ${id} configured.`);
      print(`Start it with: crimson gateway start ${id}`);
      print(`Then send this message from owner UID ${ownerUid}: /bind ${code}`);
      print('The pairing code expires in 15 minutes.');
      return 0;
    } finally {
      try { reader.close(); } catch { /* already closed */ }
    }
  }
  const id = rest[0];
  if (!id) throw new Error(`Usage: crimson gateway ${sub} <id>`);
  if (sub === 'doctor') {
    const result = await doctorGateway(state.paths, id);
    print(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }
  if (sub === 'bind') {
    const config = loadGatewayConfig(state.paths, id);
    if (!config) throw new Error(`Gateway not found: ${id}`);
    const code = beginPairing(state.paths, config);
    print(`Send from owner UID ${config.ownerUid}: /bind ${code}`);
    print('The pairing code expires in 15 minutes.');
    return 0;
  }
  if (sub === 'start') {
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    print(`Starting gateway ${id}. Press Ctrl+C to stop.`);
    try {
      await runGateway(state.paths, id, {
        workspace,
        signal: controller.signal,
        onEvent(event) { print(`[${new Date().toISOString()}] ${event.event}${event.error ? `: ${event.error}` : ''}`); }
      });
      return 0;
    } finally {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
    }
  }
  throw new Error(`Unknown gateway command: ${sub}`);
}

function parseValue(current, raw) {
  if (Array.isArray(current)) return raw.split(',').map((item) => item.trim()).filter(Boolean);
  if (typeof current === 'boolean') return ['true', '1', 'yes', 'on'].includes(raw.toLowerCase());
  if (typeof current === 'number') return Number(raw);
  return raw;
}

function commandProfile(kind, args, workspace) {
  const state = loadWorkspaceState(workspace);
  const file = kind === 'soul' ? state.paths.soul : state.paths.identity;
  const current = readYamlFile(file, {});
  const [sub = 'show', ...rest] = args;
  if (sub === 'show') {
    print(JSON.stringify(current, null, 2));
    return 0;
  }
  if (sub === 'set') {
    const [key, ...valueParts] = rest;
    if (!key || !valueParts.length) throw new Error(`Usage: crimson ${kind} set <key> <value>`);
    current[key] = parseValue(current[key], valueParts.join(' '));
    updateYamlFile(file, current, state.paths.revisions);
    print(`${kind}.${key} updated.`);
    return 0;
  }
  if (sub === 'rollback') {
    const index = Number(rest[0] || 0);
    const revision = rollbackFile(file, state.paths.revisions, index);
    print(`Rolled back ${kind} from ${basename(revision)}.`);
    return 0;
  }
  throw new Error(`Unknown ${kind} command: ${sub}`);
}

function commandSession(args, workspace) {
  const state = loadWorkspaceState(workspace);
  const [sub = 'list', ...rest] = args;
  if (sub === 'list') {
    const sessions = listSessions(state.paths);
    if (!sessions.length) print('No sessions.');
    for (const session of sessions) print(`${session.id}\t${session.platform}\t${session.turnCount || 0} turns\t${session.updatedAt}\t${session.archived ? 'archived' : 'active'}`);
    return 0;
  }
  if (sub === 'new') {
    const session = createSession(state.paths, { platform: 'cli' });
    print(session.id);
    return 0;
  }
  if (sub === 'prune') {
    const days = Number(rest[0] || state.config.history?.retentionDays || 90);
    print(`Pruned ${pruneHistory(state.paths, days)} sessions older than ${days} days.`);
    return 0;
  }
  if (sub === 'archive') {
    if (!rest[0]) throw new Error('Usage: crimson session archive <id>');
    archiveSession(state.paths, rest[0]);
    print(`Archived ${rest[0]}.`);
    return 0;
  }
  throw new Error(`Unknown session command: ${sub}`);
}

async function commandFix(workspace) {
  const state = loadWorkspaceState(workspace);
  const days = state.config.history?.retentionDays || 90;
  const pruned = pruneHistory(state.paths, days);
  print(`State initialized at ${state.paths.root}`);
  print(`History retention: ${days} days, pruned ${pruned} expired sessions.`);
  const report = await runDoctor({ workspace });
  printDoctor(report);
  return report.ok ? 0 : 1;
}

export async function main(args = [], { workspace = process.cwd() } = {}) {
  if (args.includes('--version') || args[0] === 'version') {
    print(`${VERSION}`);
    return 0;
  }
  if (args.includes('--help') && !args[0]) {
    print(usage());
    return 0;
  }
  const [command, ...rest] = args;
  if (!command) return runTUI({ workspace });
  if (['help', '--help', '-h'].includes(command)) return print(usage()) || 0;
  initializeWorkspace(workspace);
  if (command === 'setup' || command === 'model') {
    const state = loadWorkspaceState(workspace);
    await runModelSetup(state, { refresh: true });
    return 0;
  }
  if (command === 'doctor') return commandDoctor(rest, workspace);
  if (command === 'fix') return commandFix(workspace);
  if (command === 'status') return commandStatus(rest, workspace);
  if (command === 'run' || command === 'ask') return commandRun(rest, workspace);
  if (command === 'models') return commandModels(rest, workspace);
  if (command === 'loadout' || command === 'skills') return commandLoadout(rest, workspace);
  if (command === 'gateway') return commandGateway(rest, workspace);
  if (command === 'soul') return commandProfile('soul', rest, workspace);
  if (command === 'identity') return commandProfile('identity', rest, workspace);
  if (command === 'session') return commandSession(rest, workspace);
  throw new Error(`Unknown command: ${command}. Run crimson --help.`);
}
