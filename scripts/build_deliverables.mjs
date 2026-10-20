// Builds every deliverable page from ONE engine run on the example deal:
//   index.html                              the one-link hub
//   deliverables/excel-model.html           the workbook, rendered, with parity
//   deliverables/cogs-model.html            internal COGS model (cost and margin)
//   deliverables/pricing-model.html         wrapper: pricing intent, reasoning, proposal
//   deliverables/statement-of-work.html     wrapper: contract intent, terms, SOW
//   deliverables/customer/*.html            the customer copies (no cost or margin)
//   deliverables/pricing-rationale.html     internal margin and pushback rationale
// Run: node scripts/build_deliverables.mjs   (also run by `npm run verify`)
import { marked } from 'marked';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compute, loadCatalog } from '../src/engine/index.js';
import { starterDeal } from '../src/presets.js';
import { buildSow, buildProposal } from '../src/documents.js';
import { buildSowPage } from './lib/wrappers.mjs';
import { buildPricingModelPage } from './lib/pricing_model.mjs';
import { shell } from './lib/page.mjs';
import { buildExcelPage } from './lib/excel.mjs';
import { buildHub } from './lib/hub.mjs';
import { buildCogsPage } from './lib/cogs.mjs';
import { syncDoc, DOCS_WITH_NUMBERS } from './lib/docnums.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(root, p);
const write = (p, s) => { mkdirSync(dirname(out(p)), { recursive: true }); writeFileSync(out(p), s); };

const deal = starterDeal('workflow');
const r = compute(deal, loadCatalog());

write('index.html', buildHub());
write('deliverables/excel-model.html', buildExcelPage());
// The COGS page is internal, so it gets a back-link to the hub; the customer pages do not.
write('deliverables/cogs-model.html', buildCogsPage(deal, r));
write('deliverables/pricing-model.html', buildPricingModelPage(deal, r, loadCatalog()));
write('deliverables/statement-of-work.html', buildSowPage(deal, r));
write('deliverables/customer/pricing-proposal.html', buildProposal(deal, r));
write('deliverables/customer/statement-of-work.html', buildSow(deal, r));

const rationale = marked.parse(readFileSync(out('docs/PRICING_RATIONALE.md'), 'utf8'));
write('deliverables/pricing-rationale.html', shell({
  title: 'Pricing and margin rationale',
  description: 'Why the price is what it is: margin target and floor, pushback on cost, competitor undercut and known gaps. Internal.',
  base: '../',
  current: 'deliverables/pricing-rationale.html',
  body: `<div class="mark">| · APPLIED COMPUTE · INTERNAL ·</div>
<div class="banner">INTERNAL. Shows margin policy and the competitor walk-away. Do not send to the customer.</div>
<div class="rationale">${rationale}</div>`,
}));

for (const doc of DOCS_WITH_NUMBERS) syncDoc(doc);
console.log(`built deliverables for ${deal.customer.name || 'the example deal'}: COGS ${r.cogs.cogs}, quote ${r.pricing.quote}, status ${r.gates.status}`);
