// Seeded fuzz: random deals (valid and invalid) must never produce non-finite
// outputs, and READY must only occur when every gate genuinely passes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { defaultDeal } from '../src/engine/defaults.js';

const catalog = loadCatalog();
let seed = 20261019;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const num = (lo, hi) => lo + rnd() * (hi - lo);

function randomDeal() {
  const d = defaultDeal();
  d.model = pick(catalog.map((m) => m.name).concat(['Unknown model']));
  d.method = pick(['GRPO', 'GRPO', 'SFT']);
  d.rl.cycles = Math.floor(num(0, 12));
  d.rl.cadenceWeeks = Math.floor(num(0, 3));
  d.rl.readinessWeeks = Math.floor(num(0, 4));
  d.rl.handoffWeeks = Math.floor(num(0, 3));
  d.rl.mode = pick(['Sequential', 'Concurrent']);
  d.rl.scores = Array.from({ length: Math.floor(num(0, 4)) }, () => num(0, 1));
  d.demand.policyTokensPerCycle = num(-1e6, 5e8);
  d.demand.policyTokensPerGpuHour = pick([0, -3, num(1, 5e5)]);
  d.demand.rolloutTokensPerGpuHour = num(0, 5e5);
  d.demand.evalTokensPerGpuHour = num(0, 5e5);
  d.demand.rolloutAttemptsPerCycle = num(0, 20000);
  d.demand.policyGpus = Math.floor(num(0, 64));
  d.pricing.discountPct = num(-0.2, 0.6);
  d.pricing.targetGrossMargin = num(0, 0.9);
  d.pricing.mode = pick(['rateCard', 'costPlus', 'hybrid']);
  d.capacity.acquisition = pick(['Auto', 'PayGo', 'Extend', 'Reserve', 'Existing only', 'BYOC']);
  d.capacity.gpuSku = pick(['H100', 'B200', 'B300']);
  d.capacity.canObtainExtra = rnd() < 0.5;
  d.capacity.pools[0].freeGpus = Math.floor(num(0, 40));
  d.capacity.pools[0].startWeek = Math.floor(num(0, 20));
  d.capacity.pools[0].expiryWeek = Math.floor(num(0, 40));
  d.approvals.benchmarkConfirmed = rnd() < 0.5;
  d.approvals.accessApproved = rnd() < 0.5;
  d.approvals.skuRateConfirmed = rnd() < 0.5;
  d.serving.include = rnd() < 0.5;
  d.serving.throughputPerGpuHour = pick([0, num(1, 2e5)]);
  return d;
}

const numericOutputs = (r) => [
  r.work.totalGpuHours, r.work.policyGpuHours, r.work.rolloutGpuHours, r.work.evalGpuHours,
  r.cogs.cogs, r.cogs.rework, r.pricing.quote, r.pricing.itemized, r.pricing.marginFloorPrice,
  r.pricing.adjustment, r.pricing.grossMargin, r.pricing.remainingBudget,
  r.capacity.cash, r.capacity.paygoCost, r.capacity.extendCost, r.capacity.reserveCost,
  r.serving.invoice, r.serving.price, r.serving.grossMargin,
];

test('fuzz: outputs are always finite and READY implies every gate passed', () => {
  let ready = 0; // READY cases observed (informational)
  for (let i = 0; i < 1500; i++) {
    const deal = randomDeal();
    const r = compute(deal, catalog);
    for (const v of numericOutputs(r)) assert.ok(Number.isFinite(v), `non-finite output in case ${i}: ${JSON.stringify(deal).slice(0, 200)}`);
    assert.ok(r.pricing.grossMargin <= 1 + 1e-9, `GM above 100% in case ${i}`);
    if (r.gates.status === 'READY FOR REVIEW') {
      ready++;
      assert.equal(r.gates.readiness, 'QUALIFIED*');
      assert.equal(r.capacity.verdict, 'FEASIBLE*');
      assert.ok(r.pricing.remainingBudget >= 0);
      assert.ok(r.pricing.grossMargin >= deal.pricing.minGrossMargin);
      assert.deepEqual(r.errors, []);
    }
    if (r.pricing.mode !== 'costPlus' && r.pricing.quote > 0) {
      assert.ok(r.pricing.quote >= r.pricing.marginFloorPrice - 1e-6 || r.pricing.marginFloorPrice === 0, `quote below floor in case ${i}`);
    }
  }
});

test('fuzz: more approved cycles never reduces GPU-hours (scope only grows)', () => {
  for (let i = 0; i < 200; i++) {
    const deal = randomDeal();
    deal.rl.cycles = 2;
    const a = compute(structuredClone(deal), catalog).work.totalGpuHours;
    deal.rl.cycles = 3;
    const b = compute(structuredClone(deal), catalog).work.totalGpuHours;
    if (Number.isFinite(a) && Number.isFinite(b)) assert.ok(b >= a - 1e-6, `case ${i}`);
  }
});
