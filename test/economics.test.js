// Price band and fixed-cost recovery: read-only views built from engine re-runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, loadCatalog } from '../src/engine/index.js';
import { starterDeal } from '../src/presets.js';
import { priceBand, fixedCostRecovery } from '../src/economics.js';

const catalog = loadCatalog();
const deal = starterDeal('workflow');

test('price band brackets the base quote', () => {
  const b = priceBand(deal, catalog);
  assert.ok(b.low <= b.base + 1e-6 && b.base <= b.high + 1e-6, JSON.stringify(b));
  assert.ok(b.high > b.low, 'the band has width when inputs are uncertain');
});

test('fixed-cost recovery: break-even is fixed cost over contribution', () => {
  const r = compute(deal, catalog);
  const f = fixedCostRecovery(r, { monthlyPlatformTeamCost: 60000, engagementsPerMonth: 2 });
  assert.equal(f.contribution, r.pricing.quote - r.cogs.cogs);
  assert.ok(Math.abs(f.breakEvenEngagements - 60000 / f.contribution) < 1e-9);
  assert.equal(f.covered, f.contributionMonthly >= f.fixedMonthly);
});

test('fixed-cost recovery: zero engagements never covers a fixed cost', () => {
  const r = compute(deal, catalog);
  const f = fixedCostRecovery(r, { monthlyPlatformTeamCost: 1000 });
  assert.equal(f.covered, false);
  assert.equal(f.netMonthly, -1000);
});

test('idle capacity adds cost only below target utilization', () => {
  const withUtil = (u) => compute({ ...deal, capacity: { ...deal.capacity, targetUtilization: u } }, catalog);
  const full = withUtil(1), half = withUtil(0.5);
  const idleLine = (r) => r.cogs.ledger.find((l) => l.id === 'idleCapacity').value;
  assert.equal(idleLine(full), 0, 'full utilization is neutral');
  assert.ok(idleLine(half) > 0, 'half-used reserved GPUs carry idle cost');
  assert.ok(half.cogs.cogs > full.cogs.cogs);
});
