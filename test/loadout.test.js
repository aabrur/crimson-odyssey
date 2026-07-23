import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeWorkspace } from '../src/core/state.js';
import {
  SLOT_LIMITS,
  loadSkillCatalog,
  loadLoadout,
  equipSkill,
  installSkill,
  validateSkill,
  composeLoadoutContext,
  loadoutPreview
} from '../src/loadout/engine.js';
import { tempDir } from './helpers.js';

test('default Loadout has one Weapon and one Armor', () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    const loadout = loadLoadout(paths);
    assert.deepEqual(loadout.slots.weapon, ['crimson-core']);
    assert.deepEqual(loadout.slots.armor, ['production-guard']);
    assert.equal(SLOT_LIMITS.accessory, 2);
    assert.equal(SLOT_LIMITS.magic, 2);
  } finally { tmp.cleanup(); }
});

test('equipping respects slot capacity and replaces the oldest item', () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    equipSkill(paths, { skillId: 'software-engineer', slot: 'accessory' });
    equipSkill(paths, { skillId: 'deep-research', slot: 'accessory' });
    equipSkill(paths, { skillId: 'creative-director', slot: 'accessory' });
    const preview = loadoutPreview(paths);
    assert.equal(preview.equipped.accessory.length, 2);
    assert.deepEqual(preview.equipped.accessory.map((item) => item.id), ['deep-research', 'creative-director']);
  } finally { tmp.cleanup(); }
});

test('external SKILL.md installs, validates, and becomes equippable', () => {
  const tmp = tempDir();
  const source = tempDir('crimson-skill-');
  try {
    const paths = initializeWorkspace(tmp.dir);
    writeFileSync(join(source.dir, 'SKILL.md'), `---\nid: repo-auditor\nname: Repo Auditor\nversion: 1.0.0\nslots: magic, accessory\ntrigger: audit, repository\npermissions: filesystem\ncontextCost: medium\ndescription: Audit repositories with evidence.\n---\n\nInspect files, identify risks, and report verification evidence.\n`);
    const installed = installSkill(source.dir, paths);
    assert.equal(installed.id, 'repo-auditor');
    assert.equal(validateSkill(installed).valid, true);
    const catalog = loadSkillCatalog(paths);
    assert.equal(catalog.some((item) => item.id === 'repo-auditor'), true);
    equipSkill(paths, { skillId: 'repo-auditor', slot: 'magic' });
    assert.equal(loadoutPreview(paths).equipped.magic[0].id, 'repo-auditor');
  } finally {
    tmp.cleanup();
    source.cleanup();
  }
});

test('first turn performs full bootstrap and later turns select contextual Magic', () => {
  const tmp = tempDir();
  try {
    const paths = initializeWorkspace(tmp.dir);
    equipSkill(paths, { skillId: 'deep-research', slot: 'magic' });
    const first = composeLoadoutContext({ paths, text: 'hello', turnIndex: 0 });
    assert.equal(first.fullBootstrap, true);
    assert.equal(first.active.some((item) => item.id === 'deep-research'), true);
    const unrelated = composeLoadoutContext({ paths, text: 'write a greeting', turnIndex: 2 });
    assert.equal(unrelated.active.some((item) => item.id === 'deep-research'), false);
    const research = composeLoadoutContext({ paths, text: 'research the latest market evidence', turnIndex: 2 });
    assert.equal(research.active.some((item) => item.id === 'deep-research'), true);
  } finally { tmp.cleanup(); }
});
