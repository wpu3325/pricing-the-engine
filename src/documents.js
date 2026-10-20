// Customer-facing and internal document builders. Pure functions (no DOM).
// All user-supplied text is HTML-escaped. Customer documents never include COGS,
// labour rates, GPU supplier prices, opportunity cost, allocation or margin
// (enforced by test/documents.test.js). Wording follows workbook sheet 03.
import { money, pct, count, tokens } from './format.js';
import { buildOffer, NOT_INCLUDED, GLOSSARY, FAQ } from './offer.js';

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const E = (v) => escapeHtml(String(v));


export const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deal';

export function statusBanner(status) {
  return status === 'READY FOR REVIEW'
    ? 'DRAFT: commercial and legal review still required before sending'
    : `PRELIMINARY: DO NOT SEND CUSTOMER: ${status}`;
}

const AMENDMENTS = [
  ['New base model or method', 'Re-confirm model fit, memory, unit rates, training throughput and evaluator comparability; sign a revised order.'],
  ['More cycles or higher token volume', 'Written change order before exceeding the approved cycle count or compute allowance.'],
  ['New workflow, data regime or grader', 'Re-scope data rights, acceptance benchmarks, engineering and timeline.'],
  ['Different region, isolation or GPU topology', 'Reassess availability, security posture and price.'],
  ['Production launch or SLA upgrade', 'Separate serving order with latency targets, traffic envelope, availability and minimums.'],
  ['Production demand above the contracted envelope', 'Review at 80% of capacity; amendment before adding replicas or exceeding contracted traffic.'],
  ['Customer pause or termination', 'Customer covers approved work and any non-cancellable third-party compute commitments made for this engagement, net of reasonable redeployment.'],
];

function doc(title, body, status, customerName) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}: ${escapeHtml(customerName)}</title>
<style>
:root{--ink:#101010;--muted:#545454;--line:#ededed;--accent:#f04a00;--bg:#fffaf7}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Inter,system-ui,-apple-system,sans-serif}
main{max-width:860px;margin:0 auto;padding:48px 24px 72px}
.mark{font:600 13px ui-monospace,Menlo,monospace;color:var(--accent);letter-spacing:.04em}
h1{font:400 34px/1.15 Newsreader,Georgia,"Times New Roman",serif;margin:12px 0 4px}
h2{font:400 20px/1.3 Newsreader,Georgia,serif;margin:36px 0 10px;border-top:1px solid var(--line);padding-top:18px}
.banner{border:1px solid var(--accent);color:#c13701;background:rgba(240,74,0,.06);padding:10px 14px;border-radius:8px;font-weight:600;margin:18px 0}
table{width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:14px}
th,td{text-align:left;vertical-align:top;padding:9px 10px;border-bottom:1px solid var(--line)}
th{font:600 11px ui-monospace,Menlo,monospace;text-transform:uppercase;color:var(--muted);letter-spacing:.04em}
td.num,th.num{text-align:right;white-space:nowrap}
.total td{font-weight:700;border-top:2px solid var(--ink)}
.note{color:var(--muted);font-size:13px}
.summary{background:#fcfcf9;border:1px solid var(--line);border-radius:12px;padding:6px 18px 4px;margin:14px 0}
.stack{display:flex;height:18px;border-radius:999px;overflow:hidden;border:1px solid var(--line-2);margin:10px 0}
.stack span{display:block;height:100%}
.seg-foundation{background:#f04a00}.seg-engineering{background:#f5a06f}.seg-cycles{background:#101010}.seg-handoff{background:#9a9a9a}
.legend{list-style:none;padding:0;margin:8px 0;display:grid;gap:6px}
.legend .dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;vertical-align:middle}
.phase{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:14px 0}
.phase-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.phase h3{font:500 20px/1.25 Newsreader,Georgia,serif;margin:4px 0 0}
.phase h4{font:600 12px Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:14px 0 6px}
.phase-amt{font:500 26px Newsreader,Georgia,serif;white-space:nowrap}
.phase ul{margin:0;padding-left:18px}
dl.gloss dt{font-weight:600;margin-top:10px}dl.gloss dd{margin:2px 0 0;color:var(--ink-2)}
tfoot td{font-weight:700;border-top:2px solid var(--ink)}
@media (max-width:640px){.phase-head{flex-direction:column}}
.ph{background:#fcfcf9;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}
footer{margin-top:48px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:14px}
@media print{body{background:#fff}main{padding:0}.banner{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body><main>
<div class="mark">| · APPLIED COMPUTE · |</div>
<h1>${escapeHtml(title)}</h1>
<p class="note">Prepared for ${escapeHtml(customerName)} · Take-home submission draft, not an official Applied Compute document.</p>
<div class="banner">${escapeHtml(statusBanner(status))}</div>
${body}

<footer>Amounts are the proposed fees for the scope described. Terms in [brackets] are placeholders that counsel must complete before this document is sent.</footer>
</main></body></html>`;
}

// Buyer-facing commercial terms for the usage model: the most the customer can be charged,
// what they can stop at and what they pay, and what the price does not include.
function commercialBlock(deal, o) {
  if (o.mode !== 'cogsBuilt') return '';
  const N = o.cycles;
  const head = deal.pricing.allowanceHeadroom ?? 0;
  const millions = o.allowanceTokens ? `${(o.allowanceTokens / 1e6).toLocaleString('en-US')} million tokens` : 'as set in the order';
  const commit = o.commitDiscount
    ? `${pct(o.commitDiscount, 0)} off the cycle packages for the ${N} cycles you commit to`
    : 'Available when you commit to 4 or more cycles (5% off) or 6 or more (10% off)';
  const stops = [
    ['Stop after setup', o.milestones[0].amount],
    ['Stop after cycle 1', o.milestones[0].amount + o.milestones[1].amount],
    ...(N >= 2 ? [[`Stop after cycle 2`, o.milestones[0].amount + o.milestones[1].amount + o.milestones[2].amount]] : []),
    ['Full engagement (with acceptance)', o.total],
  ];
  const stopRows = stops.map(([a, b]) => `<tr><td>${escapeHtml(a)}</td><td class="num">${usd(b)}</td></tr>`).join('');
  return `<h2>What you can be charged</h2>
<table><tbody>
<tr><td><strong>Maximum committed fee</strong></td><td>${usd(o.maxCommitted)}. The three invoices add up to this and no more, whatever the cycle timing.</td></tr>
<tr><td><strong>Included usage</strong></td><td>${E(o.allowance.toLocaleString('en-US'))} GPU-hours of managed compute and ${E(millions)} on the agent platform${head > 0 ? `, which includes a ${pct(head, 0)} buffer over planned use` : ''}.</td></tr>
<tr><td><strong>Usage above those allowances</strong></td><td>Only with your written approval, billed at the rates in the usage section, and up to ${usd(o.overageCap)} in total without a further change order.</td></tr>
<tr><td><strong>Committed-cycles price</strong></td><td>${E(commit)}.</td></tr>
<tr><td><strong>Rates</strong></td><td>Fixed for the term of this statement of work.</td></tr>
<tr><td><strong>Price validity</strong></td><td>${E(o.validityDays)} days from issue.</td></tr>
</tbody></table>
<h2>What one cycle includes, and what you pay if you stop</h2>
<p>Each managed cycle includes the engineers who run it, the agent platform, the compute to train and roll out the model, and the held-out evaluation. Cycles are invoiced in equal parts of the cycle total, because each one carries the same work.</p>
<table><thead><tr><th>If you stop at</th><th class="num">Total invoiced to that point</th></tr></thead><tbody>${stopRows}</tbody></table>
<p class="note">Fees are not contingent on the score. Reaching the target, or a plateau, triggers a review; you then decide whether to continue, and no later invoice is issued unless you approve it.</p>
<p class="note">Adding a cycle costs ${usd(o.scale.plusCycle)}: only that cycle's compute, platform use and engineering are added, while the setup and handoff do not change. The per-cycle invoice is a share of the cycle total, so it is not the price of one more cycle.</p>
<h2>Ownership of deliverables</h2>
<p>[The trained weights, grader, held-out evaluation set, environment and traces delivered to you: ownership and licence terms, including the base-model licence, to be confirmed by counsel.]</p>
`;
}

const usd = (v) => money(v);
const hrs = (n) => `${Number(n).toLocaleString('en-US')} hours`;

// Usage-based (cogsBuilt) customer wording. Meters are customer prices, so they are shown;
// supplier cost, margin and labour rates never are.
function cogsPhaseRows(o, deal) {
  const N = o.cycles;
  return [
    ['1 · Setup package', `Weeks 1–${E(o.readinessWeeks)}`, 'Frozen evaluation set, grader, environment and baseline score; go/no-go gate.', 'Co-design and sign-off of evaluation and grader.', 'Versioned grader and harness, reproducible baseline run ID, signed go/no-go.'],
    ['2 · Managed RL cycles', `${E(N)} cycle(s), one every ${E(deal.rl.cadenceWeeks)} week(s)`, 'Train, rollouts, held-out evaluation and the agent platform, with the included compute and usage allowances.', 'Explicitly chooses to stop or continue after each cycle.', 'Run ID, usage ledger against the allowances, graded metrics, failure samples, signed cycle decision.'],
    ['3 · Independent handoff', `Week ${E(o.weeks)}`, 'Final evaluation on untouched data; checkpoint, configuration, traces and runbook.', 'Accepts delivery by checking the listed artifacts.', 'Reproducibility report, model version, delivered files and signed handoff.'],
  ];
}

function meterSection(o) {
  if (o.mode !== 'cogsBuilt') return '';
  const millions = o.allowanceTokens ? `${(o.allowanceTokens / 1e6).toLocaleString('en-US')} million tokens` : 'as set in the order';
  return `<h2>What is included, and usage above it</h2>
<p>Your total covers everything in the three phases. The included usage is:</p>
<table><tbody>
<tr><td>Managed compute</td><td>${E(o.allowance.toLocaleString('en-US'))} GPU-hours across the engagement</td></tr>
<tr><td>Agent platform usage</td><td>${E(millions)}</td></tr>
</tbody></table>
<p>Usage above these allowances is billed only with your written approval, up to ${usd(o.overageCap)} in total, at:</p>
<table><tbody>
<tr><td>Managed compute above the allowance</td><td class="num">${usd(o.meters.gpuHourRate)} for each GPU-hour</td></tr>
<tr><td>Agent platform usage above the allowance</td><td class="num">${usd(o.meters.tokenPerMillion)} for each million tokens</td></tr>
</tbody></table>
<p class="note">Every cycle score report shows usage so far against the allowances, so there are no surprise charges. Rates are fixed for this statement of work; any later order is priced at the rates then current.</p>`;
}

function cogsChangeRows(deal, o) {
  return [
    ['One more cycle', `+${usd(o.scale.plusCycle)}`, 'One more managed cycle beyond the approved count, with its compute, platform usage and engineering included.'],
    o.scale.minusCycle == null ? null : ['One fewer cycle', usd(o.scale.minusCycle), 'One managed cycle less. The setup and handoff packages do not change.'],
    ['Stop after cycle 1', usd(o.stopAfterFirstCycle), 'The setup invoice and the first cycle invoice. No later invoices are issued. The handoff package is not billed unless the handoff is signed.'],
    ['Another workflow, data source or region', 'Change order', 'Scope changes are quoted separately, through a change order, before any work starts.'],
  ].filter(Boolean).map(([a, b2, c]) => `<tr><td><strong>${escapeHtml(a)}</strong></td><td class="num">${E(b2)}</td><td>${escapeHtml(c)}</td></tr>`).join('');
}

function phaseCard(ph) {
  const items = ph.includes.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const effort = ph.hours
    ? `<h4>Team effort in this phase</h4><table><thead><tr><th>Role</th><th class="num">Hours</th></tr></thead><tbody>${ph.hours.filter((h) => h.hours > 0).map((h) => `<tr><td>${escapeHtml(h.role)}</td><td class="num">${E(h.hours)}</td></tr>`).join('') || '<tr><td colspan="2">Included in the cycle price</td></tr>'}</tbody><tfoot><tr><td>Total</td><td class="num">${E(ph.hours.reduce((a, b) => a + b.hours, 0))} hours</td></tr></tfoot></table>`
    : '';
  return `<article class="phase">
<div class="phase-head"><div><div class="small muted">Phase ${E(ph.number)} · ${escapeHtml(ph.timing)}</div><h3>${escapeHtml(ph.title)}</h3></div><div class="phase-amt">${usd(ph.amount)}</div></div>
<h4>What you get</h4><ul>${items}</ul>
<h4>Why it costs this</h4><p>${escapeHtml(ph.why)}</p>
${effort}
<p class="small muted">Billed: ${escapeHtml(ph.billed)}</p>
</article>`;
}

function scheduleTable(o) {
  const rows = o.milestones.map((m) => `<tr><td>${escapeHtml(m.label)}${m.note ? `<div class="small muted">${escapeHtml(m.note)}</div>` : ''}</td><td>Week ${E(m.week)}</td><td class="num">${usd(m.amount)}</td><td class="num">${usd(m.cumulative)}</td></tr>`).join('');
  return `<table><thead><tr><th>Invoice</th><th>When</th><th class="num">Amount</th><th class="num">Running total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="total"><td>Total training fee</td><td></td><td class="num">${usd(o.total)}</td><td class="num">${usd(o.total)}</td></tr></tfoot></table>`;
}

export function buildSow(deal, r) {
  const o = buildOffer(deal, r);
  const s = deal.serving;
  const phases = o.mode === 'cogsBuilt' ? cogsPhaseRows(o, deal) : [
    ['1 · Eval and environment foundation', `Weeks 1–${E(o.readinessWeeks)}`, 'Frozen evaluation set, grader, environment and baseline score; go/no-go gate.', 'Co-design and sign-off of evaluation and grader.', 'Versioned grader and harness, reproducible baseline run ID, signed go/no-go.'],
    ['2 · Engineering through the cycles', 'Shared across cycles', 'Harness, grader quality checks, infrastructure and per-cycle diagnostics.', 'Reviews each cycle and provides the data and access agreed at kickoff.', 'Run IDs, diagnostics and written cycle review.'],
    ['3 · RL cycles (repeat)', `${E(o.cycles)} cycle(s), one every ${E(deal.rl.cadenceWeeks)} week(s)`, 'Train, rollouts, held-out evaluation and a score report per cycle.', 'Explicitly chooses to stop or continue after each cycle.', 'Run ID, compute ledger, graded metrics, failure samples, signed cycle decision.'],
    ['4 · Independent handoff', `Week ${E(o.weeks)}`, 'Final evaluation on untouched data; checkpoint, configuration, traces and runbook.', 'Accepts delivery by checking the listed artifacts.', 'Reproducibility report, model version, delivered files and signed handoff.'],
  ];
  const phaseRows = phases.map((p) => `<tr><td><strong>${escapeHtml(p[0])}</strong><div class="note">${escapeHtml(p[1])}</div></td><td>${escapeHtml(p[2])}</td><td>${escapeHtml(p[3])}</td><td>${escapeHtml(p[4])}</td></tr>`).join('');
  const respSec = s.include ? 7 : 6;
  const serving = s.include ? `<h2>6. Optional production serving (separate service order)</h2>
<p>Production inference is not part of this training engagement. If elected, it is contracted under a separate service order with indicative terms:</p>
<table><tbody>
<tr><td>Service type</td><td>${escapeHtml(s.contract)} ${s.contract === 'Shared' ? '(usage minimum)' : '(dedicated warm replicas)'}</td></tr>
<tr><td>Minimum warm capacity</td><td>${E(count(s.minWarmReplicas))} GPUs</td></tr>
<tr><td>Included monthly tokens</td><td>${E(tokens(s.includedInputTokens))} input · ${E(tokens(s.includedOutputTokens))} output</td></tr>
<tr><td>Indicative monthly price</td><td>${E(money(r.serving.price))}</td></tr>
<tr><td>Service-level target</td><td>${E(pct(s.availabilityTarget ?? 0.999, 1))} availability target; [latency SLA: to be set after load test]</td></tr>
</tbody></table>` : '';
  const amend = AMENDMENTS.map(([a, b]) => `<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`).join('');
  const body = `
<h2>1. Parties and scope</h2>
<table><tbody>
<tr><td>Customer</td><td>${escapeHtml((deal.customer.name || '[Customer name]'))}</td></tr>
<tr><td>Provider</td><td>Applied Compute</td></tr>
<tr><td>Workflow in scope</td><td>${escapeHtml(deal.customer.workflow)}</td></tr>
<tr><td>Base model</td><td>${escapeHtml(deal.model)} (open-weight; access and licence per Section ${respSec})</td></tr>
<tr><td>Method</td><td>${escapeHtml(deal.method)} reinforcement learning</td></tr>
<tr><td>Approved RL cycles</td><td>${E(o.cycles)} (every ${E(deal.rl.cadenceWeeks)} week${deal.rl.cadenceWeeks === 1 ? '' : 's'}); change orders required beyond ${E(o.cycles)}</td></tr>
<tr><td>Planned duration</td><td>${E(o.weeks)} weeks</td></tr>
<tr><td>Hosting region</td><td>${escapeHtml(deal.customer.region)}</td></tr>
</tbody></table>

<h2>2. Phases, responsibilities and acceptance evidence</h2>
<table><thead><tr><th>Phase</th><th>Applied Compute delivers</th><th>Customer owns / approves</th><th>Evidence to accept</th></tr></thead>
<tbody>${phaseRows}</tbody></table>

<h2>3. Stopping rules and decision authority</h2>
<ul>
<li>Success target: held-out score of ${E(pct(deal.rl.target, 0))} on the frozen evaluation (${escapeHtml(deal.rl.metric)}). Reaching it triggers a review, not an automatic stop.</li>
<li>Plateau: gains below ${E((deal.rl.minGain * 100).toFixed(1))} percentage points for ${E(deal.rl.slowCycles)} consecutive cycles trigger a review.</li>
<li>Cycle cap: ${E(o.cycles)} cycles pre-authorised. No score threshold stops contracted work automatically.</li>
<li>Only the customer decides whether to continue or stop after each cycle. Decision owner: customer product / SME lead.</li>
</ul>

<h2>4. Commercial schedule</h2>
<p>Invoices follow the milestones below. Payment terms: [net terms: counsel review].</p>
${o.mode === 'cogsBuilt' ? `<p>The maximum committed fee is ${usd(o.maxCommitted)}. Usage above the allowances needs your written approval and is capped at ${usd(o.overageCap)} in total without a change order. This price is valid for ${E(o.validityDays)} days from issue.</p>` : ''}
${scheduleTable(o)}
${meterSection(o)}

<h2>5. Amendment and re-papering triggers</h2>
<p>The following require a written amendment before work proceeds:</p>
<table><thead><tr><th>Trigger</th><th>What happens</th></tr></thead><tbody>${amend}</tbody></table>

${serving.replace('<h2>6.', '<h2>6.')}
<h2>${respSec}. Customer responsibilities and assumptions</h2>
<ul>
<li>Customer provides data and access by kickoff, and confirms the base-model licence and training access.</li>
<li>Scope is limited to the one workflow above. Material changes follow Section 5.</li>
<li>Results are reported as measured on the frozen held-out set. A quality uplift is not guaranteed.</li>
</ul>
<p class="note">[Data rights and confidentiality: counsel review] · [Liability and indemnity: counsel review] · [Termination payment: counsel review] · [Governing law: counsel review]</p>
<h2>Signatures</h2>
<table><tbody><tr><td>For ${escapeHtml((deal.customer.name || '[Customer name]'))}</td><td>For Applied Compute</td></tr>
<tr><td>Name / title / date:</td><td>Name / title / date:</td></tr></tbody></table>`;
  return doc('Statement of Work', body, r.gates.status, (deal.customer.name || '[Customer name]'));
}

export function buildProposal(deal, r) {
  const o = buildOffer(deal, r);
  const b = deal.rl.baseline, t = deal.rl.target;
  const summary = `You are buying ${o.cycles} managed reinforcement-learning (RL) ${o.cycles === 1 ? 'cycle' : 'cycles'} to improve <b>${escapeHtml(deal.rl.metric)}</b> for <b>${escapeHtml(deal.customer.workflow)}</b>, from a measured baseline of ${E(pct(b, 0))} toward a target of ${E(pct(t, 0))}, over ${E(o.weeks)} weeks. The model is <b>${escapeHtml(deal.model)}</b>, ${E(o.modelSpec)}. The total is <b>${usd(o.total)}</b>. The ${E(pct(t, 0))} target is a review point, not a guarantee: when it is reached, or when results stop improving, you decide whether to continue. You approve every cycle, and each invoice is issued when its milestone completes. The total below covers everything in the three phases; only usage above the included allowances and the items under Not included are extra.`;
  const bar = o.phases.map((ph) => `<span class="seg-${ph.key}" style="width:${((ph.amount / o.total) * 100).toFixed(2)}%" title="${escapeHtml(ph.title)}"></span>`).join('');
  const legend = o.phases.map((ph) => `<li><span class="dot seg-${ph.key}"></span>${escapeHtml(ph.title)} <b>${usd(ph.amount)}</b> <span class="muted">(${E(pct(ph.amount / o.total, 0))})</span></li>`).join('');
  const change = o.mode === 'cogsBuilt' ? cogsChangeRows(deal, o) : [
    ['One more cycle', `+${usd(o.scale.plusCycle)}`, `The cycle fee of ${usd(deal.pricing.cycleFee)} plus extra-cycle engineering, because it goes beyond the ${deal.pricing.includedCycles} included cycles.`],
    o.scale.minusCycle == null ? null : ['One fewer cycle', usd(o.scale.minusCycle), `The cycle fee of ${usd(deal.pricing.cycleFee)} is not charged. The engineering fee does not change.`],
    ['Stop after cycle 1', usd(o.stopAfterFirstCycle), 'The setup invoice and the first cycle invoice. No later invoices are issued. You are not billed the handoff fee unless the handoff is signed.'],
    o.tiers ? ['A smaller model (small class)', `${usd(o.tiers.small)} per cycle`, 'The cycle price for a small model, set at 0.65 times the standard cycle fee.'] : null,
    o.tiers ? ['A larger model (large class)', `${usd(o.tiers.large)} per cycle`, 'The cycle price for a large mixture-of-experts model, set at 2.5 times the standard cycle fee.'] : null,
    ['Another workflow, data source or region', 'Change order', 'Scope changes are quoted separately, through a change order, before any work starts.'],
  ].filter(Boolean).map(([a, b2, c]) => `<tr><td><strong>${escapeHtml(a)}</strong></td><td class="num">${E(b2)}</td><td>${escapeHtml(c)}</td></tr>`).join('');
  const discountRow = o.discount ? `<p class="note">Includes a negotiated discount of ${usd(-o.discount)}, spread across the three invoices.</p>` : '';
  const s = deal.serving;
  const serving = s.include ? `<h2>Optional production serving (separate order)</h2>
<table><tbody>
<tr><td>Indicative monthly price</td><td class="num">${usd(r.serving.price)}</td></tr>
<tr><td>Included monthly tokens</td><td>${E(tokens(s.includedInputTokens))} input · ${E(tokens(s.includedOutputTokens))} output</td></tr>
<tr><td>Overage</td><td>${usd(s.inputOveragePerM)} per million input tokens · ${usd(s.outputOveragePerM)} per million output tokens</td></tr>
</tbody></table>
<p class="note">Production serving requires a load test and a signed service order. It is not included in the training total above.</p>` : '';
  const phaseCards = o.phases.map(phaseCard).join('');
  const body = `
<section class="summary"><h2>In short</h2><p>${summary}</p></section>
<h2>Where your money goes</h2>
<div class="stack" role="img" aria-label="Share of the total by phase">${bar}</div>
<ul class="legend">${legend}</ul>
${discountRow}
<h2>What you pay for, phase by phase</h2>
${phaseCards}
<h2>When you are invoiced</h2>
${scheduleTable(o)}
<h2>What changes the price</h2>
<table><thead><tr><th>If you…</th><th class="num">Price effect</th><th>Why</th></tr></thead><tbody>${change}</tbody></table>
${commercialBlock(deal, o)}
<h2>Not included</h2>
<ul>${NOT_INCLUDED.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
${serving}
<h2>Words used in this proposal</h2>
<dl class="gloss">${GLOSSARY.map(([a, c]) => `<dt>${escapeHtml(a)}</dt><dd>${escapeHtml(c)}</dd>`).join('')}</dl>
<h2>Common questions</h2>
${FAQ.map(([q, a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join('')}
<h2>Acceptance</h2>
<p>Each phase is accepted against the objective evidence listed in the statement of work, and each invoice follows the same milestone.</p>`;
  return doc('Pricing Proposal', body, r.gates.status, (deal.customer.name || '[Customer name]'));
}

// Bridge from the workbook's own COGS (core lines plus rework, at the workbook inputs) to
// this deal's COGS. Extension lines are the difference; the workbook total is unchanged.
export function cogsBridgeRows(r) {
  const core = r.cogs.coreTotal, ext = r.cogs.extendedTotal, rework = r.cogs.rework;
  return [
    ['Workbook core COGS (sheet 02 lines, before rework)', core.toFixed(2)],
    ['Extension lines (ledger, insurance, Ari, holdout, idle capacity, headroom)', ext.toFixed(2)],
    ['Expected rework allowance', rework.toFixed(2)],
    ['This deal: risk-adjusted COGS', r.cogs.cogs.toFixed(2)],
  ];
}

export function buildCogsCsv(deal, r) {
  const rows = [
    ['INTERNAL: DO NOT SEND TO CUSTOMER', '', ''],
    ['Section', 'Line', 'Value (USD or unit as stated)'],
    ['Deal', 'Customer', (deal.customer.name || '[Customer name]')],
    ['Deal', 'Model', deal.model],
    ['Deal', 'Status', r.gates.status],
    ['Demand', 'Total GPU-hours', r.work.totalGpuHours.toFixed(1)],
    ['Demand', 'Policy GPU-hours', r.work.policyGpuHours.toFixed(1)],
    ['Demand', 'Rollout GPU-hours', r.work.rolloutGpuHours.toFixed(1)],
    ['Demand', 'Eval GPU-hours', r.work.evalGpuHours.toFixed(1)],
    ['Capacity', 'Method', r.capacity.method],
    ['Capacity', 'Peak additional GPUs', String(r.capacity.peakAdditional)],
    ['Capacity', 'New capacity cash', r.capacity.cash.toFixed(2)],
    ['Capacity', 'Allocated existing cost', r.capacity.allocated.toFixed(2)],
    ['Capacity', 'Opportunity value (decision only)', r.capacity.opportunity.toFixed(2)],
    ...r.cogs.lines.map((l) => ['COGS', l.label, l.value.toFixed(2)]),
    ['COGS', 'Rework allowance', r.cogs.rework.toFixed(2)],
    ['COGS', 'Risk-adjusted COGS', r.cogs.cogs.toFixed(2)],
    ...cogsBridgeRows(r).map(([a, b, c]) => ['Bridge', a, c === undefined ? b : `${b}`]),
    ...(r.pricing.mode === 'cogsBuilt'
      ? r.pricing.lines.filter((l) => l.key !== 'discount').map((l) => ['Price line', `${l.label} (cost ${l.cost.toFixed(2)}, margin ${(l.margin * 100).toFixed(0)}%)`, l.value.toFixed(2)])
      : []),
    ['Price', r.pricing.mode === 'cogsBuilt' ? 'Sum of customer lines' : 'Itemized fees', r.pricing.itemized.toFixed(2)],
    ['Price', 'Target-margin floor', r.pricing.marginFloorPrice.toFixed(2)],
    ['Price', 'Quote', r.pricing.quote.toFixed(2)],
    ['Price', 'Gross margin', (r.pricing.grossMargin * 100).toFixed(2) + '%'],
    ['Price', 'Budget headroom', r.pricing.remainingBudget.toFixed(2)],
  ];
  // Neutralise spreadsheet formula injection: prefix cells that start with = + - @ or a control char.
  const safe = (v) => { const t = String(v); return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t; };
  const q = (v) => `"${safe(v).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(q).join(',')).join('\n') + '\n';
}

export function buildDealJson(deal) {
  return JSON.stringify({ format: 'pricing-the-engine/deal', schemaVersion: deal.schemaVersion, deal }, null, 2) + '\n';
}

export function fileName(deal, kind, date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `${slug((deal.customer.name || '[Customer name]'))}_${slug(deal.model)}_${kind}_${d}`;
}

// Internal COGS ledger as a readable page. Never for customers: it shows cost and margin.
export function buildCogsHtml(deal, r) {
  const groups = ['Compute and capacity', 'People and overhead', 'Evaluation and environments', 'Data and storage', 'Platform and tools', 'Risk'];
  const rows = groups.map((g) => {
    const ls = r.cogs.ledger.filter((l) => l.group === g);
    if (!ls.length) return '';
    const sub = ls.reduce((a, l) => a + l.value, 0);
    const body = ls.map((l) => `<tr><td>${E(l.label)}</td><td>${E(l.phase)}</td><td>${E(l.source)}</td><td class="num">${E(money(l.value))}</td><td class="num">${E(pct(r.cogs.cogs ? l.value / r.cogs.cogs : 0, 1))}</td></tr>`).join('');
    return `<tr class="group"><th colspan="3">${E(g)}</th><th class="num">${E(money(sub))}</th><th></th></tr>${body}`;
  }).join('');
  const phases = Object.entries(r.cogs.phaseTotals).map(([p, v]) => `<tr><td>${E(p)}</td><td class="num">${E(money(v))}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>INTERNAL COGS model: ${E(deal.customer.name || 'New deal')}</title>
<style>
:root{--ink:#101010;--muted:#666;--line:#ededed;--accent:#f04a00;--bg:#fffaf7}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:40px 24px 72px}
.mark{font:600 13px ui-monospace,Menlo,monospace;color:var(--accent)}
h1{font:400 34px/1.15 Newsreader,Georgia,serif;margin:10px 0 6px}h2{font:400 21px Newsreader,Georgia,serif;margin:30px 0 10px}
.banner{border:1px solid #101010;background:#101010;color:#fff;padding:10px 14px;border-radius:8px;font-weight:600;margin:16px 0}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
@media (max-width:640px){table{display:block;overflow-x:auto;white-space:nowrap}}
th{font:600 11px ui-monospace,Menlo,monospace;text-transform:uppercase;color:var(--muted)}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
tr.group th{background:#fcfcf9;color:var(--ink);font:600 13px Inter,sans-serif;text-transform:none}
tr.total td{font-weight:700;border-top:2px solid var(--ink)}
.kpi{display:flex;gap:16px;flex-wrap:wrap;margin:12px 0}.kpi div{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 16px;min-width:170px}
.kpi b{display:block;font:500 22px Newsreader,Georgia,serif}.muted{color:var(--muted);font-size:13px}
</style></head><body><main>
<div class="mark">| · APPLIED COMPUTE · INTERNAL |</div>
<h1>COGS model: ${E(deal.customer.name || 'New deal')}</h1>
<p class="muted">Model: ${E(deal.model || 'not yet selected')} · ${E(deal.rl.cycles)} cycles · ${E(r.work.totalWeeks)} weeks · status ${E(r.gates.status)}</p>
<div class="banner">INTERNAL: shows cost and margin. Do not send to the customer.</div>
<div class="kpi">
<div><span class="muted">Delivery COGS (with rework)</span><b>${E(money(r.cogs.cogs))}</b></div>
<div><span class="muted">Quote</span><b>${E(money(r.pricing.quote))}</b></div>
<div><span class="muted">Gross margin</span><b>${E(pct(r.pricing.grossMargin))}</b></div>
<div><span class="muted">Training GPU-hours</span><b>${E(count(r.work.totalGpuHours))}</b></div>
</div>
${r.pricing.mode === 'cogsBuilt' ? `<h2>Price by customer line</h2>
<table><thead><tr><th>Customer line</th><th class="num">Cost, incl. shared</th><th class="num">Margin</th><th class="num">Price</th></tr></thead><tbody>${r.pricing.lines.filter((l) => l.key !== 'discount').map((l) => `<tr><td>${E(l.label)}</td><td class="num">${E(money(l.cost))}</td><td class="num">${E(pct(l.margin, 0))}</td><td class="num">${E(money(l.value))}</td></tr>`).join('')}
<tr class="total"><td>Total</td><td class="num">${E(money(r.cogs.cogs))}</td><td></td><td class="num">${E(money(r.pricing.quote))}</td></tr></tbody></table>
<p class="muted">Shared cost (storage, rework, insurance, support, legal) is allocated across the lines by direct cost. Blended margin ${E(pct(r.pricing.grossMargin))}.</p>
<h2>Bridge from the workbook</h2>
<table><tbody>${cogsBridgeRows(r).map(([a, b]) => `<tr><td>${E(a)}</td><td class="num">${E(money(Number(b)))}</td></tr>`).join('')}</tbody></table>
<p class="muted">The workbook's $106,590 is its core lines plus rework at its own inputs, with no extension lines. The example adds the extension lines the workbook does not carry.</p>
<h2>Automation</h2>
<p>Ari replaces ${E(pct(deal.ari?.automationPct ?? 0, 0))} of human hours in this deal. The customer keeps ${E(pct(deal.pricing.automationShare ?? 0, 0))} of that saving in lower package prices; the rest stays with Applied Compute.</p>` : ''}
<h2>Cost by group</h2>
<table><thead><tr><th>Cost line</th><th>Phase</th><th>Source</th><th class="num">Amount</th><th class="num">Share</th></tr></thead><tbody>${rows}
<tr class="total"><td>Total delivery COGS (incl. rework)</td><td></td><td></td><td class="num">${E(money(r.cogs.cogs))}</td><td class="num">100%</td></tr></tbody></table>
<h2>Cost by delivery phase</h2>
<table><thead><tr><th>Phase</th><th class="num">Cost</th></tr></thead><tbody>${phases}</tbody></table>
<p class="muted">Workbook lines reproduce the supplied configurator (sheet 02). Extension lines are additional costs the workbook does not carry; they are $0 unless filled in the tool.</p>
</main></body></html>`;
}
