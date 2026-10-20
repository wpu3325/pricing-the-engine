import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/engine/catalog.js';
import { compute } from '../src/engine/index.js';
import { tornado, cycleSweep, undercut } from '../src/sensitivity.js';
import { dealWith } from './helpers.js';

const catalog = loadCatalog();

test('tornado: higher throughput never raises COGS; higher cycle fee never lowers quote', () => {
  const deal = dealWith();
  const t = tornado(deal, catalog);
  const tp = t.rows.find((r) => r.key === 'policyTp');
  assert.ok(tp.high.gm >= tp.low.gm, 'throughput up should improve margin');
  const fee = t.rows.find((r) => r.key === 'cycleFee');
  assert.ok(fee.high.quote > fee.low.quote);
  assert.ok(t.rows.every((r) => Number.isFinite(r.low.gm) && Number.isFinite(r.high.gm)));
});

test('cycle sweep is monotone in GPU-hours and COGS', () => {
  const sweep = cycleSweep(dealWith(), catalog, 1, 6);
  for (let i = 1; i < sweep.length; i++) {
    assert.ok(sweep[i].gpuh > sweep[i - 1].gpuh);
    assert.ok(sweep[i].cogs > sweep[i - 1].cogs);
  }
});

test('undercut: a price below the minimum-margin floor is flagged; walk-away equals COGS/(1-minGM)', () => {
  const r = compute(dealWith(), catalog);
  const u = undercut(r, 150000);
  assert.equal(u.belowMin, true);
  assert.ok(Math.abs(u.walkAway - r.cogs.cogs / (1 - 0.35)) < 1e-6);
});
