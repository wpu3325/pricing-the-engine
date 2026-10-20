// GPU choice and model size as drivers of cost and, in priced mode, of price.
// Every row is a full compute() on a copy of the deal, the same pattern as
// src/sensitivity.js. The SKU economics are illustrative placeholders from
// data/gpu_skus.json, not supplier quotes.
import { compute } from './engine/index.js';
import { clone } from './clone.js';
import { cycleSweep } from './sensitivity.js';
import { GPU_SKUS } from './data/gpu_skus.js';

export const SKU_ROWS = GPU_SKUS.skus;

const skuRow = (sku) => SKU_ROWS.find((s) => s.sku === sku);

// Price the deal on one GPU type. Throughput is rescaled from the deal's current
// SKU to the new one, so switching SKU does not compound the multiplier.
export function applySku(deal, sku) {
  const row = skuRow(sku);
  const current = skuRow(deal.capacity.gpuSku)?.throughputVsH100 ?? 1;
  const d = clone(deal);
  d.capacity.gpuSku = sku;
  d.capacity.paygoPrice = row.paygoPerHour;
  d.capacity.extendPrice = row.extendPerHour;
  d.capacity.reservePrice = row.reservePerHour;
  const scale = row.throughputVsH100 / current;
  for (const k of ['policyTokensPerGpuHour', 'rolloutTokensPerGpuHour', 'evalTokensPerGpuHour']) {
    d.demand[k] = d.demand[k] * scale;
  }
  return d;
}

// Comparisons run on the deal's own pricing mode (cogsBuilt by default), so the price
// moves with the cost of each GPU choice.
const priced = (deal) => clone(deal);

const summary = (r) => ({
  gpuHours: r.work.totalGpuHours,
  method: r.capacity.method,
  gpuCost: r.cogs.gpu,
  gpuShare: r.cogs.cogs ? r.cogs.gpu / r.cogs.cogs : 0,
  cogs: r.cogs.cogs,
  price: r.pricing.quote,
  margin: r.pricing.grossMargin,
  status: r.gates.status,
  verdict: r.capacity.verdict,
});

// One row per GPU type, priced in priced mode.
export function gpuComparison(deal, catalog) {
  return SKU_ROWS.map((row) => {
    const r = compute(priced(applySku(deal, row.sku)), catalog);
    return {
      sku: row.sku,
      paygoPerHour: row.paygoPerHour,
      throughputVsH100: row.throughputVsH100,
      // Dollars per H100-equivalent unit of work: the number that decides cost.
      costPerWork: row.paygoPerHour / row.throughputVsH100,
      ...summary(r),
    };
  });
}

// One representative model per pricing proxy class, on the deal's current GPU.
// B300-only models are skipped so every row is a like-for-like comparison.
export function modelClassComparison(deal, catalog) {
  const out = [];
  for (const cls of [1, 2, 3]) {
    const model = catalog.find((m) => m.proxyClass === cls && m.gpuRequirement !== 'B300');
    if (!model) continue;
    const d = priced(deal);
    d.model = model.name;
    const r = compute(d, catalog);
    out.push({ proxyClass: cls, model: model.name, ...summary(r) });
  }
  return out;
}

// Cycles, holding everything else fixed, in priced mode.
export function pricedCycleSweep(deal, catalog, from = 1, to = 8) {
  return cycleSweep(priced(deal), catalog, from, to);
}

// The stress case shows where compute starts to matter for price.
export const STRESS_CASE = {
  label: 'Stress case: 8 RL cycles, 10x rollout attempts',
  patch: (d) => { d.rl.cycles = 8; d.demand.rolloutAttemptsPerCycle = d.demand.rolloutAttemptsPerCycle * 10; },
};

export function stressDeal(deal) {
  const d = clone(deal);
  STRESS_CASE.patch(d);
  return d;
}
