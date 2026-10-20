// The usage-based model: every customer line is its cost over (1 - its margin), the
// pools account for all COGS, meters follow the same margins, and automation is shared.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, loadCatalog } from '../src/engine/index.js';
import { poolOf } from '../src/engine/pricing.js';
import { starterDeal } from '../src/presets.js';
import { clone } from '../src/clone.js';

const catalog = loadCatalog();
const deal = starterDeal('workflow');
const r = compute(deal, catalog);
const L = Object.fromEntries(r.pricing.lines.map((l) => [l.key, l]));

test('each package line is its cost over (1 - package margin)', () => {
  for (const k of ['readiness', 'cycles', 'handoff']) {
    assert.ok(Math.abs(L[k].value - L[k].cost / (1 - deal.pricing.lineMargins.package)) < 1e-6, k);
  }
});

test('compute and software lines use their own margins', () => {
  assert.ok(Math.abs(L.compute.value - L.compute.cost / (1 - deal.pricing.lineMargins.compute)) < 1e-6);
  assert.ok(Math.abs(L.software.value - L.software.cost / (1 - deal.pricing.lineMargins.software)) < 1e-6);
});

test('every ledger line lands in exactly one pool, and the pools add up to COGS', () => {
  const total = Object.values(r.pricing.pools).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - r.cogs.cogs) < 1e-6, `pools ${total} vs COGS ${r.cogs.cogs}`);
  for (const line of r.cogs.ledger) assert.ok(['foundation', 'cycles', 'compute', 'software', 'handoff', 'shared'].includes(poolOf(line)));
});

test('the quote is the sum of the customer lines', () => {
  const sum = r.pricing.lines.reduce((a, l) => a + l.value, 0);
  assert.ok(Math.abs(sum - r.pricing.quote) < 1e-6);
});

test('the blended margin lands near the target and never below zero', () => {
  assert.ok(r.pricing.grossMargin > 0);
  assert.ok(Math.abs(r.pricing.grossMargin - deal.pricing.targetGrossMargin) < 0.1, `margin ${r.pricing.grossMargin}`);
});

test('meters price overage at the same margins as their lines', () => {
  const m = r.pricing.meters;
  const perHour = (r.cogs.gpu / r.cogs.gpuHours) / (1 - deal.pricing.lineMargins.compute);
  assert.ok(Math.abs(m.gpuHourRate - perHour) < 1e-9);
  assert.ok(m.tokenPerMillion > m.tokenCostPerMillion, 'token overage carries margin');
  assert.equal(m.provisional, true, 'tokens are provisional until throughput is measured');
});

test('automation lowers COGS and the price', () => {
  const auto = clone(deal); auto.ari.automationPct = 0.5;
  const ra = compute(auto, catalog);
  assert.ok(ra.cogs.cogs < r.cogs.cogs, 'less human labour');
  assert.ok(ra.pricing.quote < r.pricing.quote, 'the customer sees part of the saving');
});

test('the automation share decides how much of the saving the customer keeps', () => {
  const quoteAt = (share) => {
    const d = clone(deal); d.ari.automationPct = 0.5; d.pricing.automationShare = share;
    return compute(d, catalog).pricing.quote;
  };
  assert.ok(quoteAt(1) < quoteAt(0.5), 'a full share passes more of the saving on');
  assert.ok(quoteAt(0.5) < quoteAt(0), 'no share keeps the whole saving with Applied Compute');
});

test('the customer copy has three phases and no hours', async () => {
  const { buildOffer } = await import('../src/offer.js');
  const o = buildOffer(deal, r, catalog);
  assert.equal(o.phases.length, 3);
  assert.equal(o.sumCheck, o.total);
  for (const p of o.phases) assert.ok(!p.includes.some((t) => /hour/i.test(t) && /engineer/i.test(t)), 'no engineering hours');
});
