// Headline numbers for the markdown docs, generated from the engine. Each doc holds the
// block between <!-- numbers:begin --> and <!-- numbers:end -->; scripts/build_deliverables.mjs
// rewrites it and test/deliverables.test.js fails if it has drifted from the engine.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compute, loadCatalog } from '../../src/engine/index.js';
import { starterDeal } from '../../src/presets.js';
import { buildOffer } from '../../src/offer.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`;

export const DOCS_WITH_NUMBERS = ['README.md', 'docs/PRICING_POLICY.md', 'docs/PRICING_RATIONALE.md'];

export function numbersBlock() {
  const deal = starterDeal('workflow');
  const catalog = loadCatalog();
  const r = compute(deal, catalog);
  const o = buildOffer(deal, r, catalog);
  const rows = [
    ['Quote (customer total)', money(r.pricing.quote)],
    ['Delivery COGS, risk-adjusted', money(r.cogs.cogs)],
    ['Blended margin', pct(r.pricing.grossMargin)],
    ['Setup invoice (week 2)', money(o.milestones[0].amount)],
    ['Each cycle invoice', money(o.milestones[1].amount)],
    ['Acceptance payment (signed handoff)', money(o.milestones[o.milestones.length - 1].amount)],
    ['Maximum committed fee', money(o.maxCommitted)],
    ['Overage cap (approved use)', money(o.overageCap)],
    ['Included GPU-hours', o.allowance.toLocaleString('en-US')],
  ];
  return ['<!-- numbers:begin -->', '| Figure | Example deal |', '|---|---|',
    ...rows.map(([a, b]) => `| ${a} | ${b} |`), '<!-- numbers:end -->'].join('\n');
}

const BLOCK = /<!-- numbers:begin -->[\s\S]*?<!-- numbers:end -->/;

// Returns true if the file changed.
export function syncDoc(relPath, block = numbersBlock()) {
  const p = join(root, relPath);
  const src = readFileSync(p, 'utf8');
  if (!BLOCK.test(src)) return false;
  const next = src.replace(BLOCK, block);
  if (next === src) return false;
  writeFileSync(p, next);
  return true;
}

export function docIsFresh(relPath, block = numbersBlock()) {
  const src = readFileSync(join(root, relPath), 'utf8');
  return BLOCK.test(src) && src.match(BLOCK)[0] === block;
}
