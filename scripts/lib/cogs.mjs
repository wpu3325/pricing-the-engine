// The internal COGS page: the builder output plus a back-link to the hub. Shared by
// the build and the freshness test, so the two cannot disagree.
import { buildCogsHtml } from '../../src/documents.js';

export function buildCogsPage(deal, r) {
  return buildCogsHtml(deal, r).replace('<main>', '<main>\n<p class="backlink"><a href="../index.html">← Deliverables hub</a> · <a href="excel-model.html">Excel model</a></p>');
}
