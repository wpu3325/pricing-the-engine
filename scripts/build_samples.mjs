// Writes the customer-facing samples and the internal COGS export for the
// default deal into docs/samples/. Run: node scripts/build_samples.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compute, loadCatalog } from '../src/engine/index.js';
import { starterDeal } from '../src/presets.js';
import { buildSow, buildProposal, buildCogsCsv, buildCogsHtml } from '../src/documents.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/samples');
mkdirSync(out, { recursive: true });
const deal = starterDeal('workflow');
const r = compute(deal, loadCatalog());
writeFileSync(join(out, 'sample_statement_of_work.html'), buildSow(deal, r));
writeFileSync(join(out, 'sample_pricing_proposal.html'), buildProposal(deal, r));
writeFileSync(join(out, 'INTERNAL_sample_cogs_model.csv'), buildCogsCsv(deal, r));
writeFileSync(join(out, 'INTERNAL_sample_cogs_model.html'), buildCogsHtml(deal, r));
console.log('samples written to docs/samples');
