import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeWorkspace } from '../src/core/state.js';
import { runDoctor } from '../src/doctor.js';
import { tempDir } from './helpers.js';

test('doctor initializes and reports a usable workspace with model warnings', async () => {
  const tmp = tempDir();
  try {
    initializeWorkspace(tmp.dir);
    const report = await runDoctor({ workspace: tmp.dir });
    assert.equal(report.ok, true);
    assert.equal(['warning', 'healthy'].includes(report.status), true);
    assert.equal(report.checks.some((item) => item.name === 'Workspace state' && item.ok), true);
    assert.equal(report.checks.some((item) => item.name === 'Model provider' && !item.ok), true);
  } finally { tmp.cleanup(); }
});
