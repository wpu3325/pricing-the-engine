// Holds that stop a usage-based quote from going out on an unverified or incomplete cost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, loadCatalog } from '../src/engine/index.js';
import { starterDeal } from '../src/presets.js';
import { clone } from '../src/clone.js';

const catalog = loadCatalog();
const approved = (d) => {
  Object.assign(d.approvals, { benchmarkConfirmed: true, accessApproved: true, skuRateConfirmed: true, dataAccess: 'Ready / validated' });
  return d;
};

test('a package with no cost holds the quote as HOLD - COST GAP', () => {
  const d = approved(starterDeal('workflow'));
  d.extras.holdoutEvalGpuHours = 0;                 // the handoff has no cost behind it
  assert.equal(compute(d, catalog).gates.status, 'HOLD - COST GAP');
});

test('a complete cost base clears the cost gap', () => {
  const d = approved(starterDeal('workflow'));
  assert.notEqual(compute(d, catalog).gates.status, 'HOLD - COST GAP');
});

test('priced Ari tokens hold the quote until throughput is measured', () => {
  const d = approved(starterDeal('workflow'));
  d.ari.tokensMPerCycle = 50;
  assert.equal(compute(d, catalog).gates.status, 'HOLD - THROUGHPUT');
  d.approvals.servingThroughputMeasured = true;
  assert.notEqual(compute(d, catalog).gates.status, 'HOLD - THROUGHPUT');
});

test('calibrating effort up raises labour cost and price', () => {
  const base = compute(starterDeal('workflow'), catalog);
  const d = starterDeal('workflow'); d.effort.calibrationFactor = 1.2;
  const up = compute(d, catalog);
  assert.ok(up.cogs.cogs > base.cogs.cogs);
  assert.ok(up.pricing.quote > base.pricing.quote);
});

test('scope tiers scale labour hours', () => {
  const base = compute(starterDeal('workflow'), catalog);
  const d = starterDeal('workflow');
  d.scope = { integrations: 'complex', dataReadiness: 'complex', graderComplexity: 'complex' };
  assert.ok(compute(d, catalog).cogs.cogs > base.cogs.cogs);
  d.scope = { integrations: 'simple', dataReadiness: 'simple', graderComplexity: 'simple' };
  assert.ok(compute(d, catalog).cogs.cogs < base.cogs.cogs);
});

test('a bring-your-own-compute deal has no managed GPU cost and keeps its packages', () => {
  const d = clone(starterDeal('workflow'));
  d.capacity.acquisition = 'BYOC';
  const r = compute(d, catalog);
  const compute_ = r.pricing.lines.find((l) => l.key === 'compute');
  assert.equal(r.cogs.gpu, 0, 'the customer supplies the GPUs');
  assert.ok(compute_.cost < 0.01 * r.pricing.quote, 'only small development time remains in compute');
  assert.ok(r.pricing.lines.find((l) => l.key === 'cycles').value > 0, 'people packages still priced');
});
