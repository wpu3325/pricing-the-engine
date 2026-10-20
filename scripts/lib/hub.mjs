// The one-link entry page (site root index.html). Headline numbers come from the
// engine at build time, so they cannot drift from the deliverables they point to.
// verify.mjs re-checks that these numbers equal the engine output.
import { escapeHtml } from '../../src/documents.js';
import { shell } from './page.mjs';

const E = escapeHtml;
const REPO = 'https://github.com/wpu3325/pricing-the-engine/blob/main';
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (x) => `${(x * 100).toFixed(1)}%`;

// The take-home's requirements, each with the deliverable that answers it and the
// reasoning behind the answer. Written for a reader who has not seen the tool.
export const REQUIREMENTS = [
  { req: 'A. Every cost line in delivering the engagement', where: [['COGS model', 'deliverables/cogs-model.html'], ['Cost ledger (md)', `${REPO}/docs/COGS_LEDGER.md`]],
    why: 'A price can only be defended if every cost is listed, phased and sourced. Eight workbook cost pools, plus extension lines that default to $0 so the default deal equals the workbook.' },
  { req: 'A. Assumptions needed to price accurately', where: [['Excel model', 'deliverables/excel-model.html'], ['Pricing rationale', 'deliverables/pricing-rationale.html']],
    why: 'Every input is either measured or tagged as an assumption. Unverified inputs hold the quote (HOLD) rather than being rounded into a confident price.' },
  { req: 'A. An asset the team can flex per deal', where: [['Live tool', 'app/index.html'], ['Excel model', 'deliverables/excel-model.html']],
    why: 'The workbook is the reference; the tool is the flexible version. The parity table shows they agree cell by cell, so a change in one can be carried to the other.' },
  { req: 'B. Scope of work and pricing proposal with rationale', where: [['Proposal', 'deliverables/pricing-proposal.html'], ['SOW', 'deliverables/statement-of-work.html']],
    why: 'Each phase says what the customer gets, why it costs that, how many effort hours sit behind it and when it is invoiced, so every charge maps to a deliverable.' },
  { req: 'B. Margin profile and reasoning', where: [['Pricing and margin', 'deliverables/pricing-rationale.html'], ['Live tool: economics', 'app/index.html']],
    why: 'A 45% target leaves room for a 35% floor: below the floor the engagement is not worth the GPU and engineering risk. The rationale explains why, and the tool shows what moves the margin.' },
  { req: 'B. Contract terms: short term vs long term protection', where: [['SOW', 'deliverables/statement-of-work.html']],
    why: 'Now: scope is one workflow and model, the customer decides after each cycle, acceptance rests on objective evidence, and invoices follow milestones. As the customer expands, new models, regions or production need a new order.' },
  { req: 'B. When to re-paper or restructure', where: [['SOW, section 5', 'deliverables/statement-of-work.html']],
    why: 'Seven explicit triggers, such as a new base model, more cycles, a new workflow or region, production use, or usage above 80% of the envelope. Each is a signal to re-scope, not to quietly absorb more work.' },
  { req: 'B. Defending price against cost pushback', where: [['Pricing and margin', 'deliverables/pricing-rationale.html'], ['Proposal', 'deliverables/pricing-proposal.html']],
    why: 'The readiness fee is justified against cost and market benchmarks. Internal cost and margin never appear in customer documents; a test enforces this.' },
  { req: 'B. A cheaper competitor undercutting', where: [['Pricing and margin', 'deliverables/pricing-rationale.html'], ['Live tool: economics', 'app/index.html']],
    why: 'Match on scope, not rate. Cutting the price cuts margin, so the rationale shows the margin left after a match and the walk-away price.' },
];

export function buildHub(headline) {
  const h = headline;
  const cards = [
    { n: '01', title: 'Excel model', href: 'deliverables/excel-model.html', kind: 'Assets A',
      why: 'The working model with every formula visible, the equations in plain words, and a parity table against the tool.', extra: [['Download .xlsx', 'deliverables/downloads/AppliedCompute_Deal_Configurator_Dropdowns.xlsx']] },
    { n: '02', title: 'COGS model', href: 'deliverables/cogs-model.html', kind: 'Internal · A',
      why: 'Every delivery cost, its phase and its source. Shows cost and margin, so it stays internal.', extra: [['Download .csv', 'deliverables/downloads/cogs-model.csv']] },
    { n: '03', title: 'Pricing proposal', href: 'deliverables/pricing-proposal.html', kind: 'Customer · B',
      why: 'The offer as the customer would read it: four phases with what they get, why it costs that, effort and invoicing.', extra: [] },
    { n: '04', title: 'Statement of work', href: 'deliverables/statement-of-work.html', kind: 'Customer · B',
      why: 'Scope, responsibilities, stop rules, milestones, the amendment triggers and the signature block.', extra: [] },
    { n: '05', title: 'Pricing and margin rationale', href: 'deliverables/pricing-rationale.html', kind: 'Internal · B',
      why: 'Why the price is what it is: the margin target and floor, pushback on cost, the competitor walk-away and what is still unknown.', extra: [] },
    { n: '06', title: 'Live tool', href: 'app/index.html', kind: 'Interactive',
      why: 'Change any input and every number on every page updates from the same engine. The Start here page explains the process.', extra: [] },
  ];
  const cardHtml = cards.map((c) => `<article class="card"><div class="num">${E(c.n)} · ${E(c.kind)}</div><h3>${E(c.title)}</h3>
<p class="why">${E(c.why)}</p><div class="links"><a href="${E(c.href)}">Open →</a>${c.extra.map(([t, u]) => `<a href="${E(u)}" download>${E(t)}</a>`).join('')}</div></article>`).join('');
  const reqRows = REQUIREMENTS.map((r) => `<tr><td><strong>${E(r.req)}</strong></td><td>${r.where.map(([t, u]) => `<a href="${E(u)}">${E(t)}</a>`).join('<br>')}</td><td>${E(r.why)}</td></tr>`).join('');

  const body = `
<div class="mark">| · APPLIED COMPUTE · TAKE-HOME ·</div>
<h1>Pricing the Engine</h1>
<p class="lede">An enterprise RL post-training engagement, costed, priced and written up. Every page below is generated from one engine, and the Excel model is the reference the engine is checked against. Start with the cards, then read the requirement map.</p>
<div class="kpis" aria-label="Headline numbers, default example deal">
  <div class="kpi"><span>Delivery COGS, incl. rework</span><b>${E(money(h.cogs))}</b></div>
  <div class="kpi"><span>Quote</span><b>${E(money(h.quote))}</b></div>
  <div class="kpi"><span>Gross margin (target ${E(pct(h.target))})</span><b>${E(pct(h.margin))}</b></div>
  <div class="kpi"><span>Status</span><b>${E(h.status)}</b></div>
</div>
<div class="banner">HOLD: the default example needs a qualified model, a confirmed training licence and a confirmed GPU rate before its quote can be sent. Its numbers are a planning model, not a quote.</div>

<h2>The deliverables, in reading order</h2>
<div class="cards">${cardHtml}</div>

<h2>Requirement map</h2>
<p class="note">The take-home asks for A (a COGS model) and B (pricing, SOW and their defence). Each row names the page that answers it and why the answer is shaped that way.</p>
<div class="wrap"><table><thead><tr><th>Requirement</th><th>Where</th><th>Why it is answered this way</th></tr></thead><tbody>${reqRows}</tbody></table></div>

<h2>How the pieces agree</h2>
<ul>
  <li>The workbook’s own formulas were recalculated in LibreOffice for 17 scenarios; the engine matches every mapped cell to 1e-6. <a href="deliverables/excel-model.html#parity">Parity table</a> · <a href="${REPO}/docs/PARITY.md">PARITY.md</a></li>
  <li>Customer documents (proposal, SOW) are generated without cost, margin or labour rates. A test fails the build if one ever includes them.</li>
  <li>Every number on this page is read from the engine when the site is built. <code>npm run verify</code> rebuilds the site and fails if a number or a link is stale.</li>
</ul>

<h2>Known limits, stated up front</h2>
<ul>
  <li>Throughput (100,000 tokens per GPU-hour) is a proxy and the largest unknown. Until it is measured, every margin is provisional.</li>
  <li>Rates, labour, extension costs and margin policy are illustrative. The workbook’s $3.99 H100 price is an expired promotion; list is $5.49.</li>
  <li>The final holdout evaluation is not costed, so the handoff margin is overstated.</li>
  <li>The deck and GTM PDFs in the original pack carried different figures ($112,097 COGS against the workbook’s $106,590). They are not used; the workbook is canonical. See <a href="${REPO}/docs/PARITY.md">PARITY.md</a> §3.</li>
  <li>Legal text is placeholder; bracketed items need counsel review.</li>
</ul>
<p class="note">No licence is granted; all rights reserved. This is a take-home submission, not an official Applied Compute document. Source: <a href="https://github.com/wpu3325/pricing-the-engine">github.com/wpu3325/pricing-the-engine</a>.</p>`;
  return shell({
    title: 'Deliverables hub',
    description: 'One page for the Applied Compute take-home: COGS model, Excel model, pricing proposal, statement of work and margin rationale, generated from one engine.',
    base: '',
    current: 'index.html',
    body,
  });
}

// Used by verify.mjs and the hub to read the same numbers the deliverables use.
export function headlineNumbers(r, target) {
  return { cogs: r.cogs.cogs, quote: r.pricing.quote, margin: r.pricing.grossMargin, target, status: r.gates.status };
}

