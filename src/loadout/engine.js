import { existsSync, readFileSync, readdirSync, statSync, cpSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { BUILTIN_SKILLS } from './catalog.js';
import { readJSON, writeJSON, ensureDir, safeName } from '../core/fs.js';

export const SLOT_LIMITS = { weapon: 1, armor: 1, accessory: 2, magic: 2 };

export function defaultLoadout() {
  return {
    version: 1,
    name: 'default',
    slots: {
      weapon: ['crimson-core'],
      armor: ['production-guard'],
      accessory: ['natural-writing'],
      magic: []
    },
    updatedAt: new Date().toISOString()
  };
}

function loadExternalSkill(dir) {
  const jsonFile = join(dir, 'skill.json');
  const markdownFile = join(dir, 'SKILL.md');
  if (existsSync(jsonFile)) {
    const skill = readJSON(jsonFile, null);
    if (!skill) return null;
    return { ...skill, source: skill.source || 'external', path: dir };
  }
  if (existsSync(markdownFile)) {
    const text = readFileSync(markdownFile, 'utf8');
    const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    const meta = {};
    let instructions = text;
    if (frontmatter) {
      instructions = frontmatter[2].trim();
      for (const line of frontmatter[1].split(/\r?\n/)) {
        const index = line.indexOf(':');
        if (index > 0) meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
      }
    }
    return {
      id: safeName(meta.id || basename(dir)),
      name: meta.name || basename(dir),
      version: meta.version || '0.0.0',
      source: 'external',
      slots: String(meta.slots || 'accessory').split(',').map((item) => item.trim()),
      description: meta.description || instructions.split('\n').find(Boolean) || 'External skill',
      trigger: String(meta.trigger || '').split(',').map((item) => item.trim()).filter(Boolean),
      permissions: String(meta.permissions || '').split(',').map((item) => item.trim()).filter(Boolean),
      contextCost: meta.contextCost || 'medium',
      instructions,
      path: dir
    };
  }
  return null;
}

export function loadSkillCatalog(paths) {
  const external = [];
  if (existsSync(paths.skills)) {
    for (const name of readdirSync(paths.skills)) {
      const dir = join(paths.skills, name);
      if (!statSync(dir).isDirectory()) continue;
      const skill = loadExternalSkill(dir);
      if (skill) external.push(skill);
    }
  }
  return [...BUILTIN_SKILLS, ...external];
}

export function validateSkill(skill) {
  const errors = [];
  if (!skill?.id) errors.push('id is required');
  if (!skill?.name) errors.push('name is required');
  if (!Array.isArray(skill?.slots) || !skill.slots.length) errors.push('slots must contain at least one slot');
  for (const slot of skill?.slots || []) if (!SLOT_LIMITS[slot]) errors.push(`unknown slot: ${slot}`);
  if (!skill?.instructions) errors.push('instructions are required');
  return { valid: errors.length === 0, errors };
}

export function installSkill(sourcePath, paths) {
  const source = resolve(sourcePath);
  if (!existsSync(source) || !statSync(source).isDirectory()) throw new Error('Skill source must be an existing directory');
  const skill = loadExternalSkill(source);
  const validation = validateSkill(skill);
  if (!validation.valid) throw new Error(`Invalid skill: ${validation.errors.join(', ')}`);
  const destination = join(paths.skills, safeName(skill.id));
  ensureDir(paths.skills);
  cpSync(source, destination, { recursive: true, force: true });
  return { ...skill, path: destination };
}

export function loadLoadout(paths, name = 'default') {
  const file = join(paths.loadouts, `${safeName(name)}.json`);
  const loaded = readJSON(file, null);
  if (loaded) return loaded;
  const created = defaultLoadout();
  writeJSON(file, created);
  return created;
}

export function saveLoadout(paths, loadout) {
  loadout.updatedAt = new Date().toISOString();
  writeJSON(join(paths.loadouts, `${safeName(loadout.name || 'default')}.json`), loadout);
  return loadout;
}

export function equipSkill(paths, { loadoutName = 'default', skillId, slot }) {
  const catalog = loadSkillCatalog(paths);
  const skill = catalog.find((item) => item.id === skillId);
  if (!skill) throw new Error(`Skill not installed: ${skillId}`);
  if (!skill.slots.includes(slot)) throw new Error(`${skill.name} cannot be equipped as ${slot}`);
  const loadout = loadLoadout(paths, loadoutName);
  loadout.slots ||= {};
  loadout.slots[slot] ||= [];
  const without = loadout.slots[slot].filter((id) => id !== skillId);
  if (without.length >= SLOT_LIMITS[slot]) without.shift();
  loadout.slots[slot] = [...without, skillId];
  saveLoadout(paths, loadout);
  return loadout;
}

export function unequipSkill(paths, { loadoutName = 'default', skillId, slot }) {
  const loadout = loadLoadout(paths, loadoutName);
  loadout.slots[slot] = (loadout.slots[slot] || []).filter((id) => id !== skillId);
  saveLoadout(paths, loadout);
  return loadout;
}

export function resolveEquipped(loadout, catalog) {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  return Object.fromEntries(Object.entries(SLOT_LIMITS).map(([slot]) => [
    slot,
    (loadout.slots?.[slot] || []).map((id) => byId.get(id)).filter(Boolean)
  ]));
}

function matches(skill, text) {
  if (skill.trigger?.includes('always')) return true;
  const lower = String(text || '').toLowerCase();
  return (skill.trigger || []).some((trigger) => lower.includes(String(trigger).toLowerCase()));
}

export function composeLoadoutContext({ paths, loadoutName = 'default', text = '', turnIndex = 0 }) {
  const catalog = loadSkillCatalog(paths);
  const loadout = loadLoadout(paths, loadoutName);
  const equipped = resolveEquipped(loadout, catalog);
  const fullBootstrap = turnIndex === 0;
  const active = [
    ...equipped.weapon,
    ...equipped.armor,
    ...equipped.accessory.filter((skill) => fullBootstrap || matches(skill, text)),
    ...equipped.magic.filter((skill) => fullBootstrap || matches(skill, text))
  ];
  const unique = [...new Map(active.map((skill) => [skill.id, skill])).values()];
  const sections = unique.map((skill) => {
    const detail = fullBootstrap || ['weapon', 'armor'].some((slot) => equipped[slot].some((item) => item.id === skill.id));
    return detail
      ? `[${skill.name} | ${skill.id}]\n${skill.instructions}`
      : `[${skill.name}] ${skill.description}`;
  });
  return { loadout, equipped, active: unique, context: sections.join('\n\n'), fullBootstrap };
}

export function loadoutPreview(paths, name = 'default') {
  const catalog = loadSkillCatalog(paths);
  const loadout = loadLoadout(paths, name);
  const equipped = resolveEquipped(loadout, catalog);
  return { loadout, equipped, limits: SLOT_LIMITS };
}
