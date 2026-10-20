// Shared by the Excel page and scripts/verify.mjs: compares the workbook's saved
// values (data/workbook_dump.json, written by scripts/extract_workbook.py) with the
// engine's output for the default deal, cell by cell, using the same map as the
// golden parity suite (test/mapping.js).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compute } from '../../src/engine/index.js';
import { loadCatalog } from '../../src/engine/catalog.js';
import { dealWith } from '../../test/helpers.js';
import { mapping, deviations } from '../../test/mapping.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SHEET_NAMES = { '01': '01 Deal Setup', '02': '02 Economics Capacity', '03': '03 Offer and SOW', '04': '04 Guide Assumptions' };

export const loadDump = () => JSON.parse(readFileSync(join(root, 'data/workbook_dump.json'), 'utf8'));

export function sheetIndex(dump) {
  const out = {};
  for (const s of dump.sheets) {
    const key = Object.keys(SHEET_NAMES).find((k) => SHEET_NAMES[k] === s.name);
    if (!key) continue;
    out[key] = Object.fromEntries(s.cells.map((c) => [c.ref, c]));
  }
  return out;
}

// Nearest text label to the left on the same row (usually column A).
export function labelFor(cells, ref) {
  const col = ref.match(/^[A-Z]+/)[0];
  const row = ref.slice(col.length);
  const colNum = (c) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const labels = Object.values(cells)
    .filter((c) => typeof c.value === 'string' && !c.formula && c.ref.endsWith(row) && /^[A-Z]+\d+$/.test(c.ref))
    .filter((c) => colNum(c.ref.match(/^[A-Z]+/)[0]) < colNum(col))
    .sort((a, b) => colNum(a.ref.match(/^[A-Z]+/)[0]) - colNum(b.ref.match(/^[A-Z]+/)[0]));
  return labels.length ? labels[0].value.trim() : '';
}

export const close = (a, b) => (typeof a === 'number' && typeof b === 'number'
  ? Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))
  : a === b);

// One row per mapped cell: workbook value, engine value, and a status.
export function parityRows() {
  const dump = loadDump();
  const sheets = sheetIndex(dump);
  const catalog = loadCatalog();
  const r = compute(dealWith({}), catalog);
  return Object.entries(mapping).map(([key, fn]) => {
    const [sh, ref] = key.split('!');
    const cells = sheets[sh] || {};
    const cell = cells[ref];
    const wb = cell ? cell.value : null;
    const engine = fn(r);
    const dev = deviations[key];
    let status;
    if (dev && wb === dev.when) status = engine === dev.expect ? 'documented' : 'mismatch';
    else status = close(engine, wb) ? 'match' : 'mismatch';
    return { key, sheet: SHEET_NAMES[sh], ref, label: labelFor(cells, ref), workbook: wb, engine, status, deviation: dev ? dev.reason : null };
  });
}
