// The brief's mandatory acceptance tests (MVP_Build_Brief_UPDATED.md, "Mandatory acceptance tests").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { dealWith } from './helpers.js';

const catalog = loadCatalog();
const approved = {
  'approvals.benchmarkConfirmed': true,
  'approvals.accessApproved': true,
  'approvals.skuRateConfirmed': true,
};

test('1. default named model shows 35B total / 3B active and HOLD - MODEL', () => {
  const r = compute(dealWith(), catalog);
  assert.equal(r.model.totalB, 35);
  assert.equal(r.model.activeB, 3);
  assert.equal(r.gates.status, 'HOLD - MODEL');
});

test('2. serving-only model selected for RL stays on HOLD even when every approval is given', () => {
  const r = compute(dealWith({ model: 'Qwen3.8-Flash-Next', ...approved }), catalog);
  assert.equal(r.model.trainingStatus, 'Not listed');
  assert.equal(r.model.servingStatus, 'Listed');
  assert.equal(r.gates.readiness, 'HOLD - TRAINING ELIGIBILITY');
  assert.notEqual(r.gates.status, 'READY FOR REVIEW');
});

test('3. model without reliable parameter counts shows Not verified (not 0) and cannot be approved', () => {
  const r = compute(dealWith({ model: 'GLM-5.3-Flash', ...approved }), catalog);
  assert.equal(r.model.totalB, null);
  assert.equal(r.gates.readiness, 'HOLD - PARAMETERS');
  assert.equal(r.gates.suitability, 'TRAINING NOT CONFIRMED'); // training check precedes parameter check (workbook G32)
  assert.notEqual(r.gates.status, 'READY FOR REVIEW');
});

test('4. Kimi K3 requires B300; pre-existing H100 capacity is not eligible', () => {
  const r = compute(dealWith({ model: 'Kimi K3', ...approved }), catalog);
  assert.equal(r.model.gpuRequirement, 'B300');
  assert.equal(r.capacity.verdict, 'HARDWARE MISMATCH');
  assert.ok(r.capacity.peakAdditional > 0, 'Kimi K3 needs new B300 supply');
  assert.equal(r.capacity.weeks.some((w) => w.existing > 0), false, 'H100 pool must not count');
  // H100 pool cannot count toward a B300 plan
  assert.ok(r.capacity.weeks.every((w) => w.existing === 0));
  assert.equal(r.gates.readiness, 'HOLD - GPU FAMILY');
});

test('5. changing the model changes proxy class, GPU-hours, fee and still HOLDs', () => {
  const base = compute(dealWith(), catalog);
  const small = compute(dealWith({ model: 'Qwen3.5-4B', ...approved }), catalog);
  assert.notEqual(small.model.proxyClass, base.model.proxyClass);
  assert.notEqual(small.work.totalGpuHours, base.work.totalGpuHours);
  assert.notEqual(small.pricing.quote, base.pricing.quote);
  assert.equal(small.gates.readiness, 'HOLD - TRAINING ELIGIBILITY'); // family-verify model
  assert.notEqual(small.gates.status, 'READY FOR REVIEW');
});

test('6. a fourth authorised RL cycle increases demand, cost, quote and scope (no silent stop)', () => {
  const three = compute(dealWith(), catalog);
  const four = compute(dealWith({ 'rl.cycles': 4 }), catalog);
  assert.ok(four.work.totalGpuHours > three.work.totalGpuHours);
  assert.ok(four.cogs.cogs > three.cogs.cogs);
  assert.ok(four.pricing.quote > three.pricing.quote);
  assert.ok(four.work.totalWeeks > three.work.totalWeeks);
  assert.equal(four.gates.stop, 'NO RESULTS YET'); // scores never silently stop contracted work
});

test('7. no spare GPU and no obtainable supply -> HOLD - CAPACITY', () => {
  const r = compute(dealWith({
    ...approved,
    'capacity.pools.0.freeGpus': 0,
    'capacity.canObtainExtra': false,
  }), catalog);
  assert.equal(r.capacity.verdict, 'UNFUNDED CAPACITY');
  assert.equal(r.gates.status, 'HOLD - CAPACITY');
});

test('8. zero / negative throughput and negative demand -> HOLD - INPUT with finite numbers', () => {
  for (const patch of [
    { 'demand.policyTokensPerGpuHour': 0 },
    { 'demand.rolloutTokensPerGpuHour': -5 },
    { 'demand.evalTokensPerCase': 20000, 'demand.evalCasesPerCycle': -1 },
  ]) {
    const r = compute(dealWith({ ...approved, ...patch }), catalog);
    assert.equal(r.gates.status, 'HOLD - INPUT', JSON.stringify(patch));
    for (const v of [r.work.totalGpuHours, r.cogs.cogs, r.pricing.quote, r.pricing.grossMargin]) {
      assert.ok(Number.isFinite(v), `non-finite output for ${JSON.stringify(patch)}`);
    }
  }
});

test('9. unapproved GPU SKU rate (B104 = No) blocks approval', () => {
  const r = compute(dealWith({ 'approvals.skuRateConfirmed': false, 'approvals.benchmarkConfirmed': true, 'approvals.accessApproved': true }), catalog);
  assert.equal(r.gates.readiness, 'HOLD - SKU RATE');
  assert.notEqual(r.gates.status, 'READY FOR REVIEW');
});

test('10. production serving expansion above the envelope triggers a capacity amendment', () => {
  const r = compute(dealWith({
    'serving.include': true,
    'serving.throughputPerGpuHour': 1000,   // deliberately tiny so load exceeds warm floor
    'serving.monthlyInputTokens': 500000000,
  }), catalog);
  assert.equal(r.serving.scaleRec, 'AMEND CAPACITY / REPLICAS');
  assert.ok(r.serving.peakVsWarm >= 1);
});

test('custom (user-entered) model is never approvable until qualified', () => {
  const r = compute(dealWith({ model: 'My own model', customParams: { totalB: 12, activeB: 12 }, ...approved }), catalog);
  assert.equal(r.model.custom, true);
  assert.equal(r.gates.readiness, 'HOLD - TRAINING ELIGIBILITY');
});

test('stop rules: plateau after two sub-threshold gains; target hit; customer decision overrides', () => {
  const plateau = compute(dealWith({ 'rl.scores': [0.605, 0.61] }), catalog);
  assert.equal(plateau.gates.stop, 'REVIEW - PLATEAU');
  const hit = compute(dealWith({ 'rl.scores': [0.7, 0.82] }), catalog);
  assert.equal(hit.gates.stop, 'REVIEW - TARGET REACHED');
  const stopped = compute(dealWith({ 'rl.scores': [0.7], 'rl.decision': 'Stop' }), catalog);
  assert.equal(stopped.gates.stop, 'STOP - CUSTOMER DECISION');
});

test('margin floor: quote never falls below COGS / (1 - target GM) in rate-card mode', () => {
  const r = compute(dealWith({ 'pricing.mode': 'rateCard', 'pricing.discountPct': 0.5 }), catalog);
  assert.ok(r.pricing.quote >= r.pricing.marginFloorPrice - 1e-6);
  assert.ok(r.pricing.adjustment >= 0);
});

test('cost-plus mode prices at COGS / (1 - target GM)', () => {
  const r = compute(dealWith({ 'pricing.mode': 'costPlus' }), catalog);
  assert.ok(Math.abs(r.pricing.quote - r.cogs.cogs / (1 - 0.45)) < 1e-6);
});
