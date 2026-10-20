// Customer documents must be safe to send: no internal cost, margin or labour terms,
// and all user text escaped. Internal exports must be clearly marked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';
import { buildSow, buildProposal, buildCogsCsv, buildDealJson, escapeHtml, fileName } from '../src/documents.js';
import { dealWith } from './helpers.js';

const catalog = loadCatalog();
const FORBIDDEN = /COGS|gross margin|\bmargin\b|allocat|opportunity|loaded|per hour|\/hour|PayGo|reserv|rework|\bFDE\b|supplier|GPU-hour|\bGPU-h\b/i;

test('customer SOW and proposal contain no internal cost, margin or labour terms', () => {
  const deal = dealWith({ 'serving.include': true });
  const r = compute(deal, catalog);
  for (const html of [buildSow(deal, r), buildProposal(deal, r)]) {
    const text = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    const hit = text.match(FORBIDDEN);
    assert.equal(hit, null, `internal term leaked: ${hit && hit[0]}`);
  }
});

test('status banner blocks sending unless READY FOR REVIEW', () => {
  const deal = dealWith();
  const r = compute(deal, catalog);
  assert.match(buildProposal(deal, r), /PRELIMINARY — DO NOT SEND CUSTOMER: HOLD - MODEL/);
  const ready = compute(dealWith({ 'approvals.benchmarkConfirmed': true, 'approvals.accessApproved': true, 'approvals.skuRateConfirmed': true }), catalog);
  assert.match(buildSow(deal, ready), /DRAFT — commercial and legal review still required/);
});

test('user-entered text is escaped in every document', () => {
  const deal = dealWith({ 'customer.name': '<img src=x onerror=alert(1)>', 'customer.workflow': '"><script>x</script>' });
  const r = compute(deal, catalog);
  for (const html of [buildSow(deal, r), buildProposal(deal, r)]) {
    assert.equal(html.includes('<img src=x'), false);
    assert.equal(html.includes('<script>x'), false);
    assert.ok(html.includes('&lt;img'));
  }
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('SOW milestones add up to the quote (no money created or lost)', () => {
  const deal = dealWith({ 'rl.cycles': 4 });
  const r = compute(deal, catalog);
  const sum = r.pricing.lines.reduce((s, l) => s + l.value, 0) + r.pricing.adjustment;
  assert.ok(Math.abs(sum - r.pricing.quote) < 1e-6);
});

test('internal COGS export is clearly marked internal and file names are unique per deal', () => {
  const deal = dealWith();
  const r = compute(deal, catalog);
  assert.match(buildCogsCsv(deal, r).split('\n')[0], /INTERNAL/);
  const a = fileName(deal, 'sow', new Date('2026-10-19'));
  assert.equal(a, 'example-enterprise_qwen3-6-35b-a3b_sow_2026-10-19');
  assert.match(buildDealJson(deal), /"format": "pricing-the-engine\/deal"/);
});

test('numeric and text fields in generated HTML are all escaped (no raw interpolation)', () => {
  const deal = dealWith({ 'rl.cycles': 2, 'rl.cadenceWeeks': 1, 'rl.metric': '<b>x</b>', 'rl.slowCycles': 2, 'customer.region': '"><img src=x>' });
  const r = compute(deal, catalog);
  const html = buildSow(deal, r);
  assert.equal(html.includes('<img src=x>'), false);
  assert.equal(html.includes('<b>x</b>'), false);
});

test('CSV export neutralises spreadsheet formula injection', () => {
  const deal = dealWith({ 'customer.name': '=HYPERLINK("http://evil","click")', 'customer.workflow': '+cmd' });
  const r = compute(deal, catalog);
  const csv = buildCogsCsv(deal, r);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"",""click"")"`), 'formula cell must be prefixed');
  assert.equal(/\n"=/.test(csv), false);
});
