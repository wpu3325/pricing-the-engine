// Internal pricing model page. The price is built from the cost and capacity decision,
// so this page starts from the cost chain and shows how each input moves the price.
// The customer copy (proposal) is embedded unchanged at the end.
import { escapeHtml } from '../../src/documents.js';
import { compute } from '../../src/engine/index.js';
import { clone } from '../../src/clone.js';
import { shell } from './page.mjs';
import { gpuComparison, modelClassComparison, hybridCycleSweep, stressDeal, STRESS_CASE } from '../../src/gpuCompare.js';

const E = escapeHtml;
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const num = (n) => Math.round(n).toLocaleString('en-US');

const hybrid = (deal) => {
  const d = clone(deal);
  d.pricing.mode = 'hybrid';
  return d;
};

function bridge(deal, catalog) {
  const h = compute(hybrid(deal), catalog);
  const cls = catalog.find((m) => m.name === deal.model)?.proxyClass;
  const fixed = h.pricing.lines.filter((l) => l.key !== 'cycles' && l.key !== 'discount').reduce((a, l) => a + l.value, 0);
  const rows = [
    ['Model and size class', `${deal.model || 'not selected'}${cls ? ` · class ${cls}` : ''}`],
    ['RL cycles', num(deal.rl.cycles)],
    ['GPU-hours, all cycles', num(h.work.totalGpuHours)],
    ['GPU type and capacity method', `${deal.capacity.gpuSku} · ${h.capacity.method}`],
    ['GPU cost', money(h.cogs.gpu)],
    ['Delivery COGS, with rework', money(h.cogs.cogs)],
    [`Price at target margin (COGS ÷ (1 − ${pct(deal.pricing.targetGrossMargin, 0)}))`, money(h.pricing.marginFloorPrice)],
    ['Fixed people fees (readiness, engineering, extra cycles, handoff)', money(fixed)],
    ['RL cycle line, derived from compute cost', money(h.pricing.lines.find((l) => l.key === 'cycles').value)],
    ['Cost-driven price', money(h.pricing.quote)],
  ];
  return `<div class="wrap"><table><tbody>${rows.map(([k, v], i) => `<tr${i === rows.length - 1 ? ' class="total"' : ''}><td>${E(k)}</td><td class="num">${E(v)}</td></tr>`).join('')}</tbody></table></div>`;
}

// Short labels so the table fits the page; the full verdict is on the Economics step.
const shortVerdict = (v) => String(v).replace(' CAPACITY', '').replace('*', '');

function gpuTable(rows) {
  const body = rows.map((g) => `<tr><td>${E(g.sku)}</td><td class="num">$${g.paygoPerHour.toFixed(2)}</td><td class="num">${g.throughputVsH100.toFixed(1)}×</td><td class="num">$${g.costPerWork.toFixed(2)}</td><td>${E(g.method)}</td><td class="num">${money(g.gpuCost)}</td><td class="num">${pct(g.gpuShare)}</td><td class="num">${money(g.price)}</td><td class="muted">${E(shortVerdict(g.verdict))}</td></tr>`).join('');
  return `<div class="wrap"><table><thead><tr><th>GPU</th><th class="num">PayGo $/GPU-h</th><th class="num">Throughput vs H100</th><th class="num">$ per unit of work</th><th>Capacity method</th><th class="num">GPU cost</th><th class="num">Share of COGS</th><th class="num">Cost-driven price</th><th>Capacity verdict</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

export function buildPricingModelPage(deal, r, catalog) {
  const base = gpuComparison(deal, catalog);
  const stress = gpuComparison(stressDeal(deal), catalog);
  const sweep = hybridCycleSweep(deal, catalog, 1, 8);
  const classes = modelClassComparison(deal, catalog);
  const rateCard = compute(deal, catalog).pricing.quote;
  const cost = compute(hybrid(deal), catalog).pricing.quote;
  const margin = compute(deal, catalog).pricing.grossMargin;

  const sweepRows = sweep.map((s) => `<tr><td class="num">${s.cycles}</td><td class="num">${num(s.gpuh)}</td><td class="num">${money(s.cogs)}</td><td class="num">${money(s.quote)}</td><td class="num">${pct(s.gm)}</td></tr>`).join('');
  const classRows = classes.map((c) => `<tr><td>Class ${c.proxyClass}</td><td>${E(c.model)}</td><td class="num">${num(c.gpuHours)}</td><td class="num">${money(c.cogs)}</td><td class="num">${money(c.price)}</td></tr>`).join('');

  const body = `
<div class="mark">| · APPLIED COMPUTE · PRICING MODEL · INTERNAL ·</div>
<h1>Pricing model: from cost to price</h1>
<p class="lede">The price starts from what it costs to deliver. The people fees are fixed; the RL cycles are priced from the compute they consume and the GPU they run on. This page shows the chain, and how the GPU choice, model size and cycle count move the price.</p>
<div class="banner">INTERNAL. Shows cost, margin and the GPU economics. Do not send this page to the customer.</div>

<h2>1. The chain, for the example deal</h2>
<p>Read top to bottom. Each line is an output of the line above it.</p>
${bridge(deal, catalog)}
<p class="note">GPU rates and throughput are illustrative placeholders (see section 2). The cost-driven price is the lowest price that holds the ${pct(deal.pricing.targetGrossMargin, 0)} target on this cost.</p>

<h2>2. GPU type</h2>
<p>A GPU type moves cost through two things: its hourly rate and how much work an hour buys. The table compares cost per unit of work, not the sticker rate, because a faster GPU can cost less per unit of work even at a higher hourly price. Existing capacity only counts for the matching GPU type, so switching type can also change which weeks are covered and how they are bought.</p>
<h3>Example deal</h3>
${gpuTable(base)}
<h3>${E(STRESS_CASE.label)}</h3>
${gpuTable(stress)}
<p class="note">Capacity verdicts other than FEASIBLE mean the planned weeks are not fully covered on that GPU type. The deal stays on HOLD until capacity is confirmed.</p>

<h2>3. Other inputs that move the price</h2>
<h3>Base model size class</h3>
<p>The class sets the GPU-hours, the GPU count and the cycle engineering factor. One representative model per class is shown on the example GPU.</p>
<div class="wrap"><table><thead><tr><th>Class</th><th>Model</th><th class="num">GPU-hours</th><th class="num">COGS</th><th class="num">Cost-driven price</th></tr></thead><tbody>${classRows}</tbody></table></div>
<h3>RL cycles</h3>
<p>Each cycle adds GPU-hours and cost, so the price rises with the cycle count. While the fixed fees already exceed the cost-driven floor, the price is the fixed fees and the margin sits above target.</p>
<div class="wrap"><table><thead><tr><th class="num">Cycles</th><th class="num">GPU-hours</th><th class="num">COGS</th><th class="num">Cost-driven price</th><th class="num">Margin</th></tr></thead><tbody>${sweepRows}</tbody></table></div>

<h2>4. The customer price</h2>
<div class="wrap"><table><thead><tr><th>Price basis</th><th class="num">Price</th><th class="num">Margin</th><th>Use</th></tr></thead><tbody>
<tr><td>Rate card (default; customer copy)</td><td class="num">${money(rateCard)}</td><td class="num">${pct(margin)}</td><td>Matches the workbook and the customer proposal below.</td></tr>
<tr><td>Cost-driven (hybrid mode)</td><td class="num">${money(cost)}</td><td class="num">${pct(deal.pricing.targetGrossMargin)}</td><td>The lowest price that holds the target margin on this cost.</td></tr>
</tbody></table></div>
<p>The rate card sits ${money(rateCard - cost)} above the cost-driven price, which is margin above target. That gap is the room to negotiate down without breaking policy.</p>

<h2>5. Thought process</h2>
<ol class="steps">
  <li><strong>Cost sets the floor.</strong> The RL cycle line is the only part of the price that follows compute cost. The people fees are fixed, so the price reads as a stable rate card to the customer.</li>
  <li><strong>GPU type matters through cost per unit of work.</strong> Compare the last column of the GPU table, not the hourly rate.</li>
  <li><strong>Scope matters more than hardware at this size.</strong> On the example deal GPU cost is under a tenth of COGS. In the compute-heavy stress case it is a quarter to a third, and the GPU choice then moves the price a lot.</li>
  <li><strong>Negotiate on scope, not on GPU.</strong> If the customer pushes on price, the gap to the cost-driven price is the room. Trading cycles or workflow scope keeps the economics intact. Cutting the price against an unconfirmed GPU rate does not: if the rate is wrong, the margin goes with it.</li>
</ol>

<h2>The customer copy</h2>
<iframe class="doc-frame" src="customer/pricing-proposal.html" title="Pricing proposal, customer copy"></iframe>
<p class="note"><a href="customer/pricing-proposal.html">Open the customer copy in its own tab</a>.</p>`;

  return shell({
    title: 'Pricing model',
    description: 'Internal pricing model: how the price is an output of the cost and capacity decision, GPU type, model size and cycles.',
    base: '../',
    current: 'deliverables/pricing-model.html',
    body,
  });
}
