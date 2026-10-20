import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { metricsOf, describeEdit } from '../src/impact.js';
import { dealWith } from './helpers.js';

const catalog = loadCatalog();

test('the cycles change reports the exact engine deltas', () => {
  const before = metricsOf(compute(dealWith(), catalog));
  const after = metricsOf(compute(dealWith({ 'rl.cycles': 4 }), catalog));
  const text = describeEdit('Cycles 3 → 4', before, after);
  assert.match(text, /quote \+\$48,000/);
  assert.match(text, /weeks \+1/);
});

test('an edit that changes nothing says so', () => {
  const m = metricsOf(compute(dealWith(), catalog));
  assert.match(describeEdit('Customer name', m, m), /no change to the economics/);
});

test('a missing side is handled without throwing', () => {
  assert.equal(describeEdit('x', null, null), null);
});
