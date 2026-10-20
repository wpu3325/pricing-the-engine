// GPU choice and model size as drivers of cost and, in hybrid mode, of price.
// Checks structure and gating only: the GPU economics are illustrative placeholders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/engine/catalog.js';
import { starterDeal } from '../src/presets.js';
import { compute } from '../src/engine/index.js';
import { applySku, gpuComparison, modelClassComparison, pricedCycleSweep, stressDeal, SKU_ROWS } from '../src/gpuCompare.js';

const catalog = loadCatalog();
const deal = starterDeal('workflow');

test('gpuComparison has one finite row per SKU', () => {
  const rows = gpuComparison(deal, catalog);
  assert.equal(rows.length, SKU_ROWS.length);
  for (const r of rows) {
    for (const k of ['price', 'cogs', 'gpuCost', 'gpuHours', 'costPerWork', 'margin']) {
      assert.ok(Number.isFinite(r[k]), `${r.sku}.${k} is finite`);
    }
    assert.ok(r.gpuShare >= 0 && r.gpuShare <= 1, `${r.sku} share in [0, 1]`);
  }
});

test('the H100 row reproduces the deal on its own GPU', () => {
  const h100 = gpuComparison(deal, catalog).find((r) => r.sku === 'H100');
  assert.equal(h100.gpuHours, compute(deal, catalog).work.totalGpuHours);
});

test('applySku does not compound the throughput multiplier', () => {
  const once = applySku(deal, 'B200');
  const twice = applySku(once, 'B200');
  assert.equal(twice.demand.policyTokensPerGpuHour, once.demand.policyTokensPerGpuHour);
});

test('a B300-only model is blocked on a non-B300 GPU', () => {
  const kimi = { ...deal, model: 'Kimi K3' };
  const row = gpuComparison(kimi, catalog).find((r) => r.sku === 'H100');
  assert.match(row.verdict, /MISMATCH/);
});

test('model-class rows cover classes 1 to 3 with no B300-only models', () => {
  const rows = modelClassComparison(deal, catalog);
  assert.deepEqual(rows.map((r) => r.proxyClass).sort(), [1, 2, 3]);
  for (const r of rows) {
    const m = catalog.find((x) => x.name === r.model);
    assert.notEqual(m.gpuRequirement, 'B300');
  }
});

test('cycle sweep in hybrid mode never lowers the price as cycles rise', () => {
  const sweep = pricedCycleSweep(deal, catalog, 1, 8);
  for (let i = 1; i < sweep.length; i++) {
    assert.ok(sweep[i].quote >= sweep[i - 1].quote - 1e-6, `cycle ${sweep[i].cycles}`);
  }
});

test('the stress case buys capacity, so GPU cost is a larger share of COGS', () => {
  const base = gpuComparison(deal, catalog).find((r) => r.sku === 'H100');
  const stress = gpuComparison(stressDeal(deal), catalog).find((r) => r.sku === 'H100');
  assert.ok(stress.gpuShare > base.gpuShare);
});
