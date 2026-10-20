// Internal pricing model page. Every price line is built from its COGS pool, so the page
// starts from the cost, then shows what each input does to price and margin. The customer
// copy (proposal) is embedded unchanged at the end.
import { escapeHtml } from '../../src/documents.js';
import { compute } from '../../src/engine/index.js';
import { clone } from '../../src/clone.js';
import { shell } from './page.mjs';
import { gpuComparison, stressDeal, STRESS_CASE } from '../../src/gpuCompare.js';
import { priceBand, fixedCostRecovery } from '../../src/economics.js';
import { undercut } from '../../src/sensitivity.js';

const E = escapeHtml;
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const num = (n) => Math.round(n).toLocaleString('en-US');
const LINE_LABEL = { readiness: 'Setup package', cycles: 'Managed RL cycle packages', compute: 'Managed compute', software: 'Platform and Ari usage', handoff: 'Handoff package' };

function linesTable(r) {
  const total = r.pricing.quote;
  const rows = r.pricing.lines.filter((l) => l.key !== 'discount').map((l) => `<tr><td>${E(LINE_LABEL[l.key] ?? l.label)}<div class="note">margin ${pct(l.margin, 0)} on this line</div></td><td class="num">${money(l.cost ?? 0)}</td><td class="num">${money(l.value)}</td><td class="num">${pct(l.value / total, 0)}</td></tr>`).join('');
  const shared = Math.round(r.pricing.pools.shared);
  return `<div class="wrap"><table><thead><tr><th>Customer line</th><th class="num">Cost, incl. shared</th><th class="num">Price</th><th class="num">Share of price</th></tr></thead><tbody>${rows}
<tr class="total"><td>Total</td><td class="num">${money(r.cogs.cogs)}</td><td class="num">${money(total)}</td><td class="num">${pct(1, 0)}</td></tr></tbody></table></div>
<p class="note">Shared overhead of ${money(shared)} (storage, rework, insurance, support, legal) is allocated across the lines by direct cost. Blended margin ${pct(r.pricing.grossMargin)} against a ${pct(r.pricing.targetGrossMargin, 0)} target and ${pct(r.pricing.minGrossMargin, 0)} floor.</p>`;
}

function gpuTable(rows) {
  const body = rows.map((g) => `<tr><td>${E(g.sku)}</td><td class="num">$${g.paygoPerHour.toFixed(2)}</td><td class="num">${g.throughputVsH100.toFixed(1)}×</td><td class="num">$${g.costPerWork.toFixed(2)}</td><td class="num">${money(g.gpuCost)}</td><td class="num">${pct(g.gpuShare)}</td><td class="num">${money(g.price)}</td></tr>`).join('');
  return `<div class="wrap"><table><thead><tr><th>GPU</th><th class="num">PayGo $/GPU-h</th><th class="num">Throughput vs H100</th><th class="num">$ per unit of work</th><th class="num">GPU cost</th><th class="num">Share of COGS</th><th class="num">Price</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function tokenTable(r, deal) {
  const m = r.pricing.meters;
  const rate = deal.capacity.paygoPrice;
  const margin = deal.pricing.lineMargins.software;
  const rows = [100000, 1000000, 5000000].map((tp) => {
    const cost = (rate * 1e6) / tp;
    return `<tr><td class="num">${num(tp)}</td><td class="num">$${cost.toFixed(2)}</td><td class="num">$${(cost / (1 - margin)).toFixed(2)}</td></tr>`;
  }).join('');
  const need = (price) => (rate * 1e6) / (price * (1 - margin));
  return `<div class="wrap"><table><thead><tr><th class="num">Tokens per GPU-hour (measured)</th><th class="num">Cost per million tokens</th><th class="num">Price per million at ${pct(margin, 0)} margin</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>The current meter is <b>$${m.tokenPerMillion.toFixed(2)} per million tokens</b>, at the placeholder throughput of ${num(deal.ari.servingTokensPerGpuHour)} tokens per GPU-hour. It is provisional until throughput is measured. For a $10 price at ${pct(margin, 0)} margin, the GPU must serve about ${num(need(10))} tokens per GPU-hour; for $5, about ${num(need(5))}.</p>
<p class="note">Market reference: output prices in the Mercor case study run about $1 to $30 per million tokens.</p>`;
}

function automationTable(deal, catalog) {
  const rows = [0, 0.25, 0.5, 0.75].map((a) => {
    const d = clone(deal); d.ari.automationPct = a;
    const r = compute(d, catalog);
    return `<tr><td class="num">${pct(a, 0)}</td><td class="num">${money(r.cogs.cogs)}</td><td class="num">${money(r.pricing.quote)}</td><td class="num">${pct(r.pricing.grossMargin)}</td></tr>`;
  }).join('');
  return `<div class="wrap"><table><thead><tr><th class="num">Human hours replaced by Ari</th><th class="num">COGS</th><th class="num">Price</th><th class="num">Margin</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Shown at ${pct(deal.pricing.automationShare, 0)} of the saving passed to the customer. The customer price falls as Ari replaces hours, and Applied Compute keeps the rest of the saving.</p>`;
}

export function buildPricingModelPage(deal, r, catalog) {
  const gpuBase = gpuComparison(deal, catalog);
  const gpuStress = gpuComparison(stressDeal(deal), catalog);
  const band = priceBand(deal, catalog);
  const fixed = fixedCostRecovery(r, { monthlyPlatformTeamCost: 60000, monthlyAriDevCost: 40000, engagementsPerMonth: 2 });
  const competitor = undercut(r, Math.round(r.pricing.quote * 0.9));

  const body = `
<div class="mark">| · APPLIED COMPUTE · PRICING MODEL · INTERNAL ·</div>
<h1>Pricing model</h1>
<p class="lede">Each customer line is priced from its own cost, so the price follows the cost model. Human hours are never sold: setup, cycles and handoff are packages priced from standard effort, and automation shares its saving with the customer.</p>
<div class="banner">INTERNAL. Shows cost, margin and the GPU economics. Do not send this page to the customer.</div>

<h2>1. From cost to price</h2>
<p>Read top to bottom. Every line is its cost divided by (1 − its margin). Margins differ by line type: packages ${pct(deal.pricing.lineMargins.package, 0)}, managed compute ${pct(deal.pricing.lineMargins.compute, 0)} (the most contested part of the price), platform and Ari usage ${pct(deal.pricing.lineMargins.software, 0)} (the differentiated part).</p>
${linesTable(r)}

<h2>2. GPU type and capacity</h2>
<p>A GPU type moves cost through its hourly rate and through how much work an hour buys. The table compares cost per unit of work, not sticker price. Existing capacity only counts for its own GPU type.</p>
<h3>Example deal</h3>
${gpuTable(gpuBase)}
<h3>${E(STRESS_CASE.label)}</h3>
${gpuTable(gpuStress)}
<p class="note">Capacity verdicts other than FEASIBLE mean the planned weeks are not fully covered on that GPU type; the deal stays on HOLD until capacity is confirmed. Rates and throughput are illustrative placeholders.</p>

<h2>3. Token economics for Ari</h2>
${tokenTable(r, deal)}

<h2>4. Effort and automation</h2>
<p>Standard effort sets each package. The effort tier, calibration against past engagements, and the share of hours Ari replaces all scale the labour inside the packages. Calibrate after each engagement by recording actual against standard hours.</p>
${automationTable(deal, catalog)}

<h2>5. Fixed-cost recovery</h2>
<p>Gross margin per engagement is not enough on its own: the platform team and Ari development are fixed monthly costs. The figures below use placeholder costs and volume, and show the number of engagements a month that covers them.</p>
<div class="wrap"><table><tbody>
<tr><td>Contribution per engagement (price less COGS)</td><td class="num">${money(fixed.contribution)}</td></tr>
<tr><td>Fixed monthly cost (placeholder: platform team $60K, Ari development $40K)</td><td class="num">${money(fixed.fixedMonthly)}</td></tr>
<tr><td>Break-even engagements per month</td><td class="num">${fixed.breakEvenEngagements == null ? '—' : fixed.breakEvenEngagements.toFixed(1)}</td></tr>
<tr><td>Net per month at 2 engagements</td><td class="num">${money(fixed.netMonthly)}</td></tr>
</tbody></table></div>

<h2>6. Defensibility</h2>
<ul>
<li><b>Price band.</b> ${money(band.low)} to ${money(band.high)} around ${money(band.base)} when throughput, GPU cost and effort each move ${pct(band.swing, 0)} together. Quote the band until throughput is measured.</li>
<li><b>Floor.</b> No line can be priced below its cost. The blended margin must stay above the ${pct(r.pricing.minGrossMargin, 0)} floor, or the quote is held as HOLD - MARGIN.</li>
<li><b>Competitor at 10% below.</b> If a competitor prices at ${money(competitor.price)}, margin falls to ${pct(competitor.gm)}. Match scope rather than rate: trading cycles or workflow scope keeps the economics intact.</li>
<li><b>Holds.</b> The quote is held while the handoff has no holdout evaluation cost (HOLD - COST GAP), while token prices are unmeasured (HOLD - THROUGHPUT), or while the model is unverified.</li>
</ul>

<h2>7. The customer copy</h2>
<iframe class="doc-frame" src="customer/pricing-proposal.html" title="Pricing proposal, customer copy"></iframe>
<p class="note"><a href="customer/pricing-proposal.html">Open the customer copy in its own tab</a>.</p>`;

  return shell({
    title: 'Pricing model',
    description: 'Internal pricing model: each customer line built from its COGS pool, GPU and token economics, automation, fixed-cost recovery and the customer copy.',
    base: '../',
    current: 'deliverables/pricing-model.html',
    body,
  });
}
