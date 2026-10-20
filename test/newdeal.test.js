// A blank deal must compute finite numbers, never pretend to be approved, and
// leave the parity-tested defaults untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { newDeal, starterDeal } from '../src/presets.js';
import { defaultDeal } from '../src/engine/defaults.js';

const catalog = loadCatalog();

test('blank deal computes finite numbers and asks for a model first', () => {
  const r = compute(newDeal(), catalog);
  assert.equal(r.gates.status, 'HOLD - SELECT MODEL');
  for (const v of [r.pricing.quote, r.cogs.cogs, r.work.totalGpuHours, r.pricing.grossMargin]) {
    assert.ok(Number.isFinite(v));
  }
  assert.equal(r.work.policyGpuHours, 0, 'no training examples means no training hours yet');
  assert.equal(r.work.rolloutGpuHours, 0, 'no rollouts yet');
  assert.ok(r.work.baselineEvalGpuHours >= 0, 'the baseline evaluation is the only standing cost');
});

test('an unset budget does not raise a budget hold', () => {
  const d = newDeal();
  d.model = 'Qwen3.6-35B-A3B';
  const r = compute(d, catalog);
  assert.equal(r.pricing.budgetSet, false);
  assert.notEqual(r.gates.status, 'HOLD - BUDGET');
});

test('the parity default deal is unchanged by the blank-start guards', () => {
  const d = defaultDeal();
  d.pricing.mode = 'rateCard';
  const r = compute(d, catalog);
  assert.equal(r.pricing.budgetSet, true);
  assert.equal(r.pricing.quote, 210000);
  assert.equal(r.gates.status, 'HOLD - MODEL');
});

test('every starter, including the blank one, is a HOLD and never READY on first load', () => {
  for (const id of ['blank', 'workflow', 'code-agent', 'vision', 'frontier']) {
    const r = compute(starterDeal(id), catalog);
    assert.ok(r.gates.status.startsWith('HOLD'), id);
  }
});
