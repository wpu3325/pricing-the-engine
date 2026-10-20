// Every field in the form and every output shown to the user must be explainable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPLAIN } from '../src/explain.js';
import { ALL_FIELD_PATHS } from '../src/schema.js';

const OUTPUT_KEYS = [
  'kpi.quote', 'kpi.cogs', 'kpi.grossMargin', 'kpi.gpuHours', 'kpi.method', 'kpi.status',
  'work.policyGpuHours', 'work.rolloutGpuHours', 'work.evalGpuHours', 'work.totalGpuHours',
  'work.peakGpus', 'work.wallHoursPerCycle', 'work.totalWeeks',
  'capacity.verdict', 'capacity.paygoCost', 'capacity.extendCost', 'capacity.reserveCost',
  'capacity.allocated', 'capacity.cash', 'capacity.opportunity',
  'cogs.engineering', 'cogs.graders', 'cogs.rework', 'cogs.cogs',
  'pricing.itemized', 'pricing.marginFloorPrice', 'pricing.adjustment', 'pricing.quote',
  'pricing.grossMargin', 'pricing.remainingBudget',
  'gates.readiness', 'gates.suitability', 'gates.stop',
  'serving.invoice', 'serving.sloStatus', 'serving.scaleRec',
  'model.totalB', 'model.activeB',
  'sensitivity.tornado', 'sensitivity.cycles', 'sensitivity.undercut',
];

test('every form field has an explanation (meaning + workbook reference)', () => {
  const missing = ALL_FIELD_PATHS.filter((p) => !EXPLAIN[p]);
  assert.deepEqual(missing, []);
  for (const p of ALL_FIELD_PATHS) {
    assert.equal(EXPLAIN[p].kind, 'input', p);
    assert.ok(EXPLAIN[p].meaning && EXPLAIN[p].ref, p);
  }
});

test('every shown output has an equation and a live explanation', () => {
  const missing = OUTPUT_KEYS.filter((k) => !EXPLAIN[k]);
  assert.deepEqual(missing, []);
  for (const k of OUTPUT_KEYS) {
    assert.equal(EXPLAIN[k].kind, 'output', k);
    assert.ok(EXPLAIN[k].equation, `${k} needs an equation`);
  }
});
