// The COGS ledger must reconcile to the workbook buckets and to the total cost,
// and every extension line must be tagged to a delivery phase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { PHASES } from '../src/engine/cogs.js';
import { dealWith } from './helpers.js';
import { COGS_EXTENDED_PRESETS } from '../src/data/cogs_extended_presets.js';

const catalog = loadCatalog();
const fill = Object.fromEntries(Object.entries(COGS_EXTENDED_PRESETS.values).map(([k, v]) => [`extras.${k}`, v]));

test('ledger lines add up to the total cost (rework included)', () => {
  for (const patch of [{}, fill, { 'rl.cycles': 5 }]) {
    const r = compute(dealWith(patch), catalog);
    const sum = r.cogs.ledger.reduce((s, l) => s + l.value, 0);
    assert.ok(Math.abs(sum - r.cogs.cogs) < 1e-6, `ledger ${sum} vs cogs ${r.cogs.cogs}`);
    const byPhase = Object.values(r.cogs.phaseTotals).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(byPhase - r.cogs.cogs) < 1e-6);
  }
});

test('with extension inputs at $0 the core ledger equals the workbook buckets', () => {
  const r = compute(dealWith(), catalog);
  assert.equal(r.cogs.extendedTotal, 0);
  const workbook = r.cogs.engineering + r.cogs.graders + r.cogs.storage + r.cogs.platform + r.cogs.gpu;
  assert.ok(Math.abs(r.cogs.coreTotal - workbook) < 1e-6);
  assert.equal(r.cogs.cogs, 106590);
});

test('every ledger line has a valid delivery phase and a source', () => {
  const r = compute(dealWith(fill), catalog);
  for (const l of r.cogs.ledger) {
    assert.ok(PHASES.includes(l.phase), `${l.id} phase ${l.phase}`);
    assert.ok(['workbook', 'extension'].includes(l.source), l.id);
    assert.ok(l.label && l.group, l.id);
  }
});

test('filling the illustrative extension lines raises cost and lowers margin', () => {
  const base = compute(dealWith({ 'pricing.mode': 'rateCard' }), catalog);
  const full = compute(dealWith({ ...fill, 'pricing.mode': 'rateCard' }), catalog);
  assert.ok(full.cogs.cogs > base.cogs.cogs);
  assert.ok(full.pricing.grossMargin < base.pricing.grossMargin);
  assert.ok(full.cogs.extendedTotal > 0);
});

test('extension costs never reduce any line (no negative values from negative inputs)', () => {
  const r = compute(dealWith({ 'extras.judgeApiPerCycle': -500, 'extras.insurancePct': -0.5 }), catalog);
  for (const l of r.cogs.ledger) assert.ok(l.value >= 0, `${l.id} is negative`);
});
