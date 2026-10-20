// The internal COGS page: the builder output with the shared deliverables nav, so it
// matches every other page. Shared by the build and the freshness test.
import { buildCogsHtml } from '../../src/documents.js';
import { navHtml, NAV_CSS, TOKENS_CSS } from './page.mjs';

export function buildCogsPage(deal, r) {
  return buildCogsHtml(deal, r)
    .replace('</head>', `<style>${TOKENS_CSS}${NAV_CSS}</style></head>`)
    .replace('<main>', `<main>\n${navHtml('../', 'deliverables/cogs-model.html')}`);
}
