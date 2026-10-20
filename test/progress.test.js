import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDeal } from '../src/presets.js';
import { estimateQuality, inputStatus, sectionStatus, KEY_INPUTS, drivesOf } from '../src/progress.js';

test('a blank deal has no key inputs set', () => {
  const q = estimateQuality(newDeal(), new Set());
  assert.equal(q.set, 0);
  assert.ok(q.missing.length >= 5, 'customer, workflow, examples, model and budget are missing');
});

test('an input is "default" until the person touches it, then "set"', () => {
  const d = newDeal();
  d.rl.cycles = 3;
  const item = KEY_INPUTS.find((i) => i.path === 'rl.cycles');
  assert.equal(inputStatus(d, new Set(), item), 'default');
  assert.equal(inputStatus(d, new Set(['rl.cycles']), item), 'set');
});

test('a section needs input while any key field in it is missing', () => {
  const d = newDeal();
  assert.equal(sectionStatus(d, new Set(), 'customer'), 'needs');
});

test('every key input drives at least one panel metric', () => {
  for (const item of KEY_INPUTS) assert.ok(drivesOf(item.path).length > 0, item.path);
});

test('labour, cost and extension inputs move COGS and margin', () => {
  assert.ok(drivesOf('labor.fdeRate').includes('cogs'));
  assert.ok(drivesOf('extras.judgeApiPerCycle').includes('margin'));
});
