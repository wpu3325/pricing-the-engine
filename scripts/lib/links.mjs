// Checks every relative link and asset in the published pages: the file must exist,
// and a #fragment must match an id in that file. External links are not fetched.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ATTR = /\b(?:href|src)="([^"]+)"/g;

export function brokenLinks(root, pages) {
  const broken = [];
  for (const page of pages) {
    const from = join(root, page);
    const html = readFileSync(from, 'utf8');
    for (const [, raw] of html.matchAll(ATTR)) {
      if (/^(https?:|mailto:|data:|javascript:)/.test(raw)) continue;
      const [path, frag] = raw.split('#');
      const target = path ? resolve(dirname(from), path) : from;
      if (!existsSync(target)) { broken.push(`${page}: missing ${raw}`); continue; }
      // The app's #start and similar anchors are created by JavaScript, so they are not checked.
      if (frag && target.endsWith('.html') && !target.endsWith('app/index.html')) {
        const ids = readFileSync(target, 'utf8');
        if (!ids.includes(`id="${frag}"`)) broken.push(`${page}: no #${frag} in ${path || page}`);
      }
    }
  }
  return broken;
}

export const PUBLISHED_PAGES = [
  'index.html', 'app/index.html',
  'deliverables/excel-model.html', 'deliverables/cogs-model.html',
  'deliverables/pricing-model.html', 'deliverables/statement-of-work.html',
  'deliverables/customer/pricing-proposal.html', 'deliverables/customer/statement-of-work.html',
  'deliverables/pricing-rationale.html',
];
