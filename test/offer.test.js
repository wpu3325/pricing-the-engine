// The customer offer must add up exactly, in every scenario, and every number a
// customer sees must be reproducible from the engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { buildOffer, effortHours, foldLines, largestRemainder } from '../src/offer.js';
import { buildSow } from '../src/documents.js';
import { dealWith } from './helpers.js';
import { COGS_EXTENDED_PRESETS } from '../src/data/cogs_extended_presets.js';

const catalog = loadCatalog();
const extended = Object.fromEntries(Object.entries(COGS_EXTENDED_PRESETS.values));

const SCENARIOS = {
  default: {},
  fourCycles: { 'rl.cycles': 4 },
  oneCycle: { 'rl.cycles': 1 },
  halfDiscount: { 'pricing.discountPct': 0.5 },            // adjustment > 0 after discount
  tenPercentDiscount: { 'pricing.discountPct': 0.1 },
  costPlus: { 'pricing.mode': 'costPlus' },                 // may reduce price below itemized
  largeModel: { model: 'Kimi K3' },
  extendedCosts: { ...Object.fromEntries(Object.entries(extended).map(([k, v]) => [`extras.${k}`, v])) },
  serving: { 'serving.include': true },
};

for (const [name, patch] of Object.entries(SCENARIOS)) {
  test(`offer adds up exactly: ${name}`, () => {
    const deal = dealWith(patch);
    const r = compute(deal, catalog);
    const o = buildOffer(deal, r, catalog);
    assert.equal(o.sumCheck, o.total, 'phases + discount must equal the total');
    assert.equal(o.milestones.reduce((s, m) => s + m.amount, 0), o.total, 'invoices must equal the total');
    assert.equal(o.milestones.at(-1).cumulative, o.total, 'running total must end at the total');
    for (const ph of o.phases) assert.ok(Number.isInteger(ph.amount), `${ph.title} must be whole dollars`);
    assert.equal(o.milestones.length, deal.rl.cycles + 2, 'one readiness, one per cycle, one handoff');
    assert.equal(o.total, Math.round(r.pricing.quote));
  });
}

test('folding keeps the margin adjustment inside the lines (no separate adjustment)', () => {
  const rc = { 'pricing.mode': 'rateCard', 'pricing.discountPct': 0.5 };
  const r = compute(dealWith(rc), catalog);
  assert.ok(r.pricing.adjustment > 0, 'scenario must actually raise the price');
  const o = buildOffer(dealWith(rc), r, catalog);
  assert.equal(o.sumCheck, o.total);
});

test('largest-remainder rounding returns integers that sum exactly', () => {
  for (const [vals, target] of [[[1 / 3, 1 / 3, 1 / 3], 1], [[10.5, 10.5, 9], 30], [[0.1, 0.2, 0.7], 1]]) {
    const out = largestRemainder(vals, target);
    assert.equal(out.reduce((a, b) => a + b, 0), target);
    assert.ok(out.every(Number.isInteger));
  }
  assert.deepEqual(foldLines([30000, 78000, 72000, 0, 30000], 210000, 0), [30000, 78000, 72000, 0, 30000]);
});

test('effort hours come straight from the labour inputs: 108 in foundation, 312 across three cycles', () => {
  const h = effortHours(dealWith());
  assert.equal(h.foundation.reduce((s, x) => s + x.hours, 0), 108);
  assert.equal(h.cycles.reduce((s, x) => s + x.hours, 0), 312);
});

test('what-changes-the-price figures equal the engine re-run', () => {
  const deal = dealWith({ 'pricing.mode': 'rateCard' });
  const r = compute(deal, catalog);
  const o = buildOffer(deal, r, catalog);
  const plus = compute(dealWith({ 'pricing.mode': 'rateCard', 'rl.cycles': 4 }), catalog);
  assert.equal(o.scale.plusCycle, Math.round(plus.pricing.quote) - o.total);
  assert.equal(o.scale.plusCycle, 48000); // one cycle fee plus its extra-cycle engineering
});

test('SOW invoices match the proposal invoices exactly', () => {
  const deal = dealWith({ 'rl.cycles': 4 });
  const r = compute(deal, catalog);
  const o = buildOffer(deal, r, catalog);
  const sow = buildSow(deal, r);
  for (const m of o.milestones) assert.ok(sow.includes(`${m.amount.toLocaleString('en-US').replace(/^/, '$')}`) || m.amount === 0);
  assert.ok(sow.includes('Running total'));
});
