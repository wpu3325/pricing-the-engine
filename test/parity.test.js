// Golden parity: every mapped workbook cell (recalculated by LibreOffice) must
// equal the engine's value for the same scenario. Tolerance 1e-6 relative.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { dealWith } from './helpers.js';
import { mapping, gridMapping, deviations } from './mapping.js';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'golden');
const scenarios = JSON.parse(readFileSync(join(here, '../data/scenarios/scenarios.json'), 'utf8'));
const catalog = loadCatalog();

function close(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
  }
  return a === b;
}

for (const sc of scenarios) {
  test(`golden parity: ${sc.id}`, () => {
    const gold = JSON.parse(readFileSync(join(dir, `${sc.id}.json`), 'utf8')).expected;
    const deal = dealWith(sc.deal);
    const r = compute(deal, catalog);
    const failures = [];
    const scoped = sc.parity?.mode === 'verdict-only' ? new Set(sc.parity.cells) : null;
    for (const [cell, fn] of Object.entries(mapping)) {
      if (scoped && !scoped.has(cell)) continue;
      const want = gold[cell];
      if (want === undefined || want === null) continue; // blank in workbook
      let got = fn(r);
      const dev = deviations[cell];
      if (dev && want === dev.when) {
        if (got !== dev.expect) failures.push(`${cell} (deviation): engine=${JSON.stringify(got)} expected ${dev.expect}`);
        continue;
      }
      if (!close(got, want)) failures.push(`${cell}: engine=${JSON.stringify(got)} workbook=${JSON.stringify(want)}`);
    }
    for (let week = 1; week <= (scoped ? 0 : 16); week++) {
      const w = r.capacity.weeks[week - 1];
      for (const [col, fn] of Object.entries(gridMapping)) {
        const cell = `02!${col}${week + 31}`;
        const want = gold[cell];
        if (want === undefined || want === null) continue;
        const got = fn(w);
        if (!close(got, want)) failures.push(`${cell}: engine=${got} workbook=${want}`);
      }
    }
    assert.equal(failures.length, 0, `\n${failures.join('\n')}`);
  });
}

test('every scenario fixture exists', () => {
  const have = new Set(readdirSync(dir).map((f) => f.replace('.json', '')));
  for (const sc of scenarios) assert.ok(have.has(sc.id), `missing golden for ${sc.id}`);
});
