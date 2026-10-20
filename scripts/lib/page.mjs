// Shared page shell for the deliverables pages (hub, Excel model, rationale, internal
// COGS). Customer documents (proposal, SOW) do NOT use this shell: they never link
// to internal pages, so the customer-safety test stays simple.
import { escapeHtml } from '../../src/documents.js';

// base: '' for the hub at the site root, '../' for pages in deliverables/.
export const NAV = [
  { href: 'index.html', label: 'Hub' },
  { href: 'deliverables/excel-model.html', label: 'Excel model' },
  { href: 'deliverables/cogs-model.html', label: 'COGS model' },
  { href: 'deliverables/pricing-model.html', label: 'Pricing model' },
  { href: 'deliverables/statement-of-work.html', label: 'Statement of work' },
  { href: 'deliverables/pricing-rationale.html', label: 'Pricing and margin' },
  { href: 'app/index.html', label: 'Live tool' },
];

export function navHtml(base, current = '') {
  const links = NAV.map((n) => {
    const aria = n.href === current ? ' aria-current="page"' : '';
    return `<a href="${base}${n.href}"${aria}>${escapeHtml(n.label)}</a>`;
  }).join('');
  return `<nav class="deliv-nav" aria-label="Deliverables">${links}</nav>`;
}

export const PAGE_CSS = `
:root{--bg:#fffaf7;--ink:#101010;--muted:#5f5f5f;--line:#ececec;--line-2:#dcdcdc;--accent:#f04a00;--card:#ffffff;--ok:#1f7a3d;--warn:#8a5a00;--bad:#b3261e}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#161412;--ink:#f3eee9;--muted:#a7a098;--line:#2c2925;--line-2:#3a3530;--card:#1e1b18;--ok:#6fd08c;--warn:#e7b65c;--bad:#ff8a80}}
:root[data-theme="dark"]{--bg:#161412;--ink:#f3eee9;--muted:#a7a098;--line:#2c2925;--line-2:#3a3530;--card:#1e1b18;--ok:#6fd08c;--warn:#e7b65c;--bad:#ff8a80}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Inter,system-ui,-apple-system,sans-serif}
main{max-width:980px;margin:0 auto;padding:32px 20px 72px}
.mark{font:600 13px ui-monospace,Menlo,monospace;color:var(--accent);letter-spacing:.04em}
h1{font:400 40px/1.15 Newsreader,Georgia,serif;margin:12px 0 8px}
h2{font:400 26px/1.2 Newsreader,Georgia,serif;margin:40px 0 10px}
h3{font:600 16px/1.3 Inter,system-ui,sans-serif;margin:22px 0 6px}
p.lede{color:var(--muted);max-width:68ch;font-size:17px}
a{color:var(--accent)}
.deliv-nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 22px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.deliv-nav a{font-size:14px;text-decoration:none;color:var(--ink);border:1px solid var(--line-2);border-radius:999px;padding:5px 12px;background:var(--card)}
.deliv-nav a[aria-current="page"],.deliv-nav a:hover{border-color:var(--accent);color:var(--accent)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:22px 0}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.kpi span{display:block;color:var(--muted);font-size:13px}
.kpi b{display:block;font:500 24px/1.2 Newsreader,Georgia,serif;margin-top:4px}
.cards{display:grid;gap:14px;margin-top:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
.card .num{font:600 12px ui-monospace,Menlo,monospace;color:var(--accent);letter-spacing:.05em;text-transform:uppercase}
.card h3{font:400 22px/1.25 Newsreader,Georgia,serif;margin:4px 0 6px}
.card p{margin:6px 0;color:var(--ink)}
.card .why{color:var(--muted);font-size:15px}
.card .links{margin-top:10px;display:flex;gap:14px;flex-wrap:wrap;font-weight:600;font-size:15px}
table{width:100%;border-collapse:collapse;font-size:14px;background:var(--card)}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font:600 11px ui-monospace,Menlo,monospace;text-transform:uppercase;color:var(--muted);letter-spacing:.03em}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td code,code{font:13px ui-monospace,Menlo,monospace;background:var(--line);padding:1px 5px;border-radius:4px}
td.formula{font:12px/1.45 ui-monospace,Menlo,monospace;word-break:break-word;color:var(--muted)}
.wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
.pill{display:inline-block;font:600 12px ui-monospace,Menlo,monospace;border-radius:999px;padding:2px 9px;border:1px solid currentColor}
.pill.match{color:var(--ok)}.pill.documented{color:var(--warn)}.pill.mismatch{color:var(--bad)}
.banner{border:1px solid var(--ink);background:var(--ink);color:var(--bg);padding:10px 14px;border-radius:8px;font-weight:600;margin:16px 0}
.note{color:var(--muted);font-size:14px}
.steps{counter-reset:s;padding-left:0;list-style:none}
.steps li{counter-increment:s;margin:0 0 12px;padding-left:40px;position:relative}
.steps li::before{content:counter(s);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;font:600 14px/28px Inter,sans-serif;text-align:center}
details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 16px;margin:12px 0}
details summary{cursor:pointer;font-weight:600;padding:6px 0}
.buttons{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
.btn{display:inline-block;text-decoration:none;font-weight:600;font-size:14px;border-radius:999px;padding:8px 16px;border:1px solid var(--accent);color:var(--accent);background:var(--card)}
.btn.solid{background:var(--accent);color:#fff}
.doc-frame{display:block;width:100%;height:1100px;border:1px solid var(--line-2);border-radius:12px;background:#fff}
.rationale h2{margin-top:34px}
.rationale p,.rationale li{max-width:72ch}
.rationale table{margin:10px 0}
.footer{margin-top:48px;color:var(--muted);font-size:13px;border-top:1px solid var(--line);padding-top:14px}
@media (max-width:640px){h1{font-size:32px}main{padding:22px 16px 56px}th,td{padding:7px 6px}}
`;

// Full page. `current` marks the active nav entry; `base` is the relative root.
export function shell({ title, description = '', base = '', current = '', body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Pricing the Engine</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="color-scheme" content="light dark">
<style>${PAGE_CSS}</style>
</head>
<body>
<main>
${navHtml(base, current)}
${body}
<p class="footer">Applied Compute take-home · Pricing the Engine. Planning model, not a quote. Generated from the same engine as the live tool; rebuilt with <code>npm run build</code>.</p>
</main>
</body>
</html>
`;
}
