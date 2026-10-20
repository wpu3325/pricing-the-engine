// The one-link promise, tested: every published page is rebuilt from the engine and
// must equal the file on disk (stale pages fail), every link resolves, the Excel
// parity holds, and customer documents never link to internal pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compute, loadCatalog } from '../src/engine/index.js';
import { starterDeal } from '../src/presets.js';
import { buildSow, buildProposal, buildCogsCsv } from '../src/documents.js';
import { buildCogsPage } from '../scripts/lib/cogs.mjs';
import { buildHub } from '../scripts/lib/hub.mjs';
import { buildExcelPage } from '../scripts/lib/excel.mjs';
import { parityRows } from '../scripts/lib/parity.mjs';
import { brokenLinks, PUBLISHED_PAGES } from '../scripts/lib/links.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const disk = (p) => readFileSync(join(root, p), 'utf8');
const deal = starterDeal('workflow');
const r = compute(deal, loadCatalog());
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

test('parity: every mapped workbook cell matches the engine for the default deal', () => {
  const bad = parityRows().filter((x) => x.status === 'mismatch');
  assert.equal(bad.length, 0, JSON.stringify(bad, null, 1));
});

test('hub headline numbers are the engine numbers', () => {
  const html = disk('index.html');
  assert.ok(html.includes(money(r.cogs.cogs)), 'COGS on hub');
  assert.ok(html.includes(money(r.pricing.quote)), 'quote on hub');
  assert.ok(html.includes(`${(r.pricing.grossMargin * 100).toFixed(1)}%`), 'margin on hub');
  assert.ok(html.includes(r.gates.status), 'status on hub');
});

test('published pages are fresh: rebuilding from the engine reproduces each file', () => {
  const fresh = {
    'index.html': buildHub({ cogs: r.cogs.cogs, quote: r.pricing.quote, margin: r.pricing.grossMargin, target: r.pricing.targetGrossMargin, status: r.gates.status }),
    'deliverables/excel-model.html': buildExcelPage(),
    'deliverables/pricing-proposal.html': buildProposal(deal, r),
    'deliverables/statement-of-work.html': buildSow(deal, r),
    'deliverables/downloads/cogs-model.csv': buildCogsCsv(deal, r),
  };
  for (const [page, html] of Object.entries(fresh)) {
    assert.equal(disk(page), html, `${page} is stale: run npm run build`);
  }
  assert.equal(disk('deliverables/cogs-model.html'), buildCogsPage(deal, r), 'deliverables/cogs-model.html is stale');
});

test('every link and fragment in the published pages resolves', () => {
  const broken = brokenLinks(root, PUBLISHED_PAGES);
  assert.deepEqual(broken, []);
});

test('customer documents never link to internal pages', () => {
  for (const page of ['deliverables/pricing-proposal.html', 'deliverables/statement-of-work.html']) {
    const html = disk(page);
    for (const internal of ['cogs-model', 'excel-model', 'pricing-rationale', 'index.html', 'app/index.html']) {
      assert.ok(!html.includes(internal), `${page} links to ${internal}`);
    }
  }
});
