// Wrapper pages for the two customer documents. A reader reaches the proposal and the
// SOW through these pages, which explain the intent and the reasoning, keep the site
// nav, and embed the customer copy unchanged. The customer copy itself never links
// to internal pages (see test/deliverables.test.js).
import { escapeHtml } from '../../src/documents.js';
import { buildOffer } from '../../src/offer.js';
import { shell } from './page.mjs';

const E = escapeHtml;
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

const frame = (src, title) => `<iframe class="doc-frame" src="${E(src)}" title="${E(title)}"></iframe>
<p class="note"><a href="${E(src)}">Open the customer copy in its own tab</a> · print from there for a clean copy.</p>`;

export function buildPricingModelPage(deal, r) {
  const o = buildOffer(deal, r);
  const rows = o.phases.map((p) => `<tr><td class="num">${E(p.number)}</td><td><strong>${E(p.title)}</strong><div class="note">${E(p.timing)}<br>Invoice: ${E(p.billed)}</div></td>
<td class="num">${E(money(p.amount))}</td><td>${E(p.why)}</td></tr>`).join('');
  const body = `
<div class="mark">| · APPLIED COMPUTE · PRICING MODEL ·</div>
<h1>Pricing model and proposal</h1>
<p class="lede">The price the customer would see, the reasoning behind each line, and the customer copy of the proposal. Cost and margin are not shown here: they sit in the internal pages.</p>
<div class="banner">Review page. The proposal below is the customer copy, generated from the same engine run as the internal cost model.</div>

<h2>Intent</h2>
<p>Win the engagement on scope and evidence, not on a lower rate. Every fee pays for something the customer can inspect (an evaluation, a grader, a cycle report, a signed handoff), so the question “why this much?” has a concrete answer for each line.</p>

<h2>The price, phase by phase</h2>
<div class="wrap"><table><thead><tr><th class="num">#</th><th>Phase</th><th class="num">Fee</th><th>Why it is priced this way</th></tr></thead><tbody>${rows}</tbody></table></div>
<p><strong>Total: ${E(money(o.total))}</strong>. Each phase is billed on the timing shown above.</p>

<h2>Thought process</h2>
<ol class="steps">
  <li><strong>Price from cost, not from competitors.</strong> The internal cost model sets a floor; the price is set so the margin target holds. The rationale page gives the numbers and the reasons for the target and floor.</li>
  <li><strong>Fund the foundation first.</strong> The readiness phase is the largest single fee before any training. It builds the evaluation and grader that every later cycle depends on, and it can be reused with another model.</li>
  <li><strong>Make each cycle a visible decision.</strong> Cycle fees are explicit, so the customer decides to continue or stop after each cycle knowing what the next one costs.</li>
  <li><strong>Defend the price on scope.</strong> If a competitor is cheaper, match scope rather than rate. The pricing and margin page shows the margin left after a match and the walk-away price.</li>
</ol>

<h2>The customer copy</h2>
${frame('customer/pricing-proposal.html', 'Pricing proposal, customer copy')}
`;
  return shell({
    title: 'Pricing model and proposal',
    description: 'The pricing model for the take-home: phase fees, the reasoning behind each line, and the customer copy of the proposal.',
    base: '../',
    current: 'deliverables/pricing-model.html',
    body,
  });
}

export function buildSowPage(deal, r) {
  const body = `
<div class="mark">| · APPLIED COMPUTE · STATEMENT OF WORK ·</div>
<h1>Statement of work</h1>
<p class="lede">The contract terms the proposal depends on: what is in scope now, how the customer keeps control as the engagement grows, and when the deal is re-papered.</p>
<div class="banner">Review page. The statement of work below is the customer copy, marked as a draft until legal review.</div>

<h2>Intent</h2>
<p>Commit only to a defined scope now, with objective acceptance and milestone invoices. As the work grows, explicit triggers make expansion a new order, not a silent change in scope.</p>

<h2>Short term and long term</h2>
<div class="wrap"><table><thead><tr><th>Now (this order)</th><th>As the customer expands</th></tr></thead><tbody>
<tr><td>Scope is one workflow and one model.</td><td>A new model, method, region or topology needs a new order.</td></tr>
<tr><td>The customer decides after each cycle whether to continue.</td><td>Production is a separate order with its own envelope.</td></tr>
<tr><td>Acceptance rests on objective evidence (run IDs, graded metrics, a signed handoff).</td><td>Scale reviews start at 80% of the envelope, before capacity runs out.</td></tr>
<tr><td>Invoices follow signed milestones; early exit pays approved work and committed third-party compute.</td><td>Any change of scope goes through the amendment triggers in section 5.</td></tr>
</tbody></table></div>

<h2>Thought process</h2>
<ol class="steps">
  <li><strong>Stop rules belong to the customer.</strong> A score can prompt a review, but it never stops contracted work on its own. This keeps the customer in control without giving them a free exit after the work is paid for.</li>
  <li><strong>Pay for finished work.</strong> Milestones match the phases in the proposal, so the invoice and the deliverable line up one for one.</li>
  <li><strong>Re-paper on named triggers.</strong> Section 5 of the SOW lists the triggers. Each one is a reason to re-scope and re-price the work.</li>
</ol>

<h2>The customer copy</h2>
${frame('customer/statement-of-work.html', 'Statement of work, customer copy')}
`;
  return shell({
    title: 'Statement of work',
    description: 'The SOW for the take-home: short- and long-term contract terms, the reasoning, and the customer copy.',
    base: '../',
    current: 'deliverables/statement-of-work.html',
    body,
  });
}
