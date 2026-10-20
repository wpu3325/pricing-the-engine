// Customer-facing and internal document builders. Pure functions (no DOM).
// All user-supplied text is HTML-escaped. Customer documents never include COGS,
// labour rates, GPU supplier prices, opportunity cost, allocation or margin
// (enforced by test/documents.test.js). Wording follows workbook sheet 03.
import { money, pct, count, tokens } from './format.js';

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

export const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deal';

export function statusBanner(status) {
  return status === 'READY FOR REVIEW'
    ? 'DRAFT — commercial and legal review still required before sending'
    : `PRELIMINARY — DO NOT SEND CUSTOMER: ${status}`;
}

const PHASES = [
  { phase: '0 · Readiness', week: 'Weeks 1–2',
    delivers: 'Scope workflow, assess data quality, compare base model options and estimate capacity.',
    customer: 'Provides data and SME time; decides the initial base model and success metric.',
    evidence: 'Signed workflow/eval charter; dataset sample; frozen baseline score and review findings.' },
  { phase: '1 · Graders + harness', week: 'Week 2',
    delivers: 'Build environment, grader version, rollout instrumentation and held-out evaluation.',
    customer: 'Approves graders, thresholds, privacy assumptions and success/stop rules.',
    evidence: 'Versioned grader/harness, reproducible baseline run ID, acceptance sign-off.' },
  { phase: '2 · RL cycle (repeat)', week: 'Per cycle',
    delivers: 'Train checkpoint; sample rollouts; compute reward and held-out score; investigate failures.',
    customer: 'Reviews score and research evidence; explicitly chooses Stop or Continue.',
    evidence: 'Checkpoint/run ID, token ledger, graded metrics, failure samples, signed cycle decision.' },
  { phase: '3 · Independent handoff', week: 'Final week',
    delivers: 'Evaluate untouched holdout; package checkpoint/weights, traces, config, results and runbook.',
    customer: 'Accepts delivery by checking objective artifacts, not a guaranteed quality uplift.',
    evidence: 'Reproducibility report, model version, delivered files and signed handoff.' },
];

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
<title>${escapeHtml(title)} — ${escapeHtml(customerName)}</title>
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
.ph{background:#fcfcf9;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}
footer{margin-top:48px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:14px}
@media print{body{background:#fff}main{padding:0}.banner{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body><main>
<div class="mark">| · APPLIED COMPUTE · |</div>
<h1>${escapeHtml(title)}</h1>
<p class="note">Prepared for ${escapeHtml(customerName)} · Take-home submission draft, not an official Applied Compute document.</p>
<div class="banner">${escapeHtml(statusBanner(status))}</div>
${body}
<footer>Figures are planning estimates for review. Legal terms shown in [brackets] require counsel review before this document is sent. Take-home submission draft; not an official Applied Compute document.</footer>
</main></body></html>`;
}

export function buildSow(deal, r) {
  const n = deal.rl.cycles;
  const cad = deal.rl.cadenceWeeks;
  const ready = deal.rl.readinessWeeks;
  const hand = deal.rl.handoffWeeks;
  const total = r.work.totalWeeks;
  const s = deal.serving;
  const phases = PHASES.map((p) => `<tr><td><strong>${escapeHtml(p.phase)}</strong><div class="note">${escapeHtml(p.week)}</div></td><td>${escapeHtml(p.delivers)}</td><td>${escapeHtml(p.customer)}</td><td>${escapeHtml(p.evidence)}</td></tr>`);
  if (s.include) phases.push(`<tr><td><strong>4 · Inference pilot (optional)</strong></td><td>Benchmark representative traffic, SLO throughput, warm replicas and scaling policy.</td><td>Approves traffic forecast, deployment posture and the commercial service order.</td><td>Load-test results and approved serving order before production.</td></tr>`);

  const milestones = [
    ['Readiness and baseline', `Week ${ready}`, r.pricing.lines[0].value],
    ['Engineering and integration', 'Week 1 (fixed)', r.pricing.lines[1].value],
    ...Array.from({ length: n }, (_, i) => [`RL cycle ${i + 1} of ${n}`, `Week ${ready + (i + 1) * cad}`, r.pricing.lines[2].value / n]),
    ['Independent handoff and verification', `Week ${total}`, r.pricing.lines[4].value],
  ];
  const ms = milestones.map(([a, b, c]) => `<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td><td class="num">${money(c)}</td></tr>`).join('');

  const amend = AMENDMENTS.map(([a, b]) => `<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`).join('');
  const serving = s.include ? `<h2>5. Optional production serving (separate service order)</h2>
<p>Production inference is not part of this training engagement. If elected, it is contracted under a separate service order with the following indicative terms:</p>
<table><tbody>
<tr><td>Service type</td><td>${escapeHtml(s.contract)} ${s.contract === 'Shared' ? '(usage minimum)' : '(dedicated warm replicas)'}</td></tr>
<tr><td>Minimum warm capacity</td><td>${count(s.minWarmReplicas)} GPUs</td></tr>
<tr><td>Included monthly tokens</td><td>${tokens(s.includedInputTokens)} input · ${tokens(s.includedOutputTokens)} output</td></tr>
<tr><td>Indicative monthly price</td><td>${money(r.serving.price)}</td></tr>
<tr><td>Service-level target</td><td>${pct(s.availabilityTarget ?? 0.999, 1)} availability target; [latency SLA — to be set after load test]</td></tr>
</tbody></table>` : '';

  const body = `
<h2>1. Parties and scope</h2>
<table><tbody>
<tr><td>Customer</td><td>${escapeHtml(deal.customer.name)}</td></tr>
<tr><td>Provider</td><td>Applied Compute</td></tr>
<tr><td>Workflow in scope</td><td>${escapeHtml(deal.customer.workflow)}</td></tr>
<tr><td>Base model</td><td>${escapeHtml(deal.model)} (open-weight; access and licence per Section 7)</td></tr>
<tr><td>Method</td><td>${escapeHtml(deal.method)} reinforcement learning</td></tr>
<tr><td>Approved RL cycles</td><td>${n} (every ${cad} week${cad === 1 ? '' : 's'}); change orders required beyond ${n}</td></tr>
<tr><td>Planned duration</td><td>${total} weeks</td></tr>
<tr><td>Hosting region</td><td>${escapeHtml(deal.customer.region)}</td></tr>
</tbody></table>

<h2>2. Phases, responsibilities and acceptance evidence</h2>
<table><thead><tr><th>Phase</th><th>Applied Compute delivers</th><th>Customer owns / approves</th><th>Evidence to accept</th></tr></thead>
<tbody>${phases.join('')}</tbody></table>

<h2>3. Stopping rules and decision authority</h2>
<ul>
<li>Success target: held-out score of ${pct(deal.rl.target, 0)} on the frozen evaluation (${escapeHtml(deal.rl.metric)}). Reaching it triggers a review, not an automatic stop.</li>
<li>Plateau: gains below ${(deal.rl.minGain * 100).toFixed(1)} percentage points for ${deal.rl.slowCycles} consecutive cycles trigger a review.</li>
<li>Cycle cap: ${n} cycles pre-authorised. Work is not stopped automatically by any score threshold.</li>
<li>Only the customer decides whether to continue or stop after each cycle. Decision owner: ${escapeHtml(deal.customer.workflow ? 'customer product / SME lead' : 'customer')}.</li>
</ul>

<h2>4. Commercial schedule</h2>
<p>Fees are invoiced on the milestones below. Payment terms: [net terms — counsel review].</p>
<table><thead><tr><th>Milestone</th><th>Timing</th><th class="num">Amount</th></tr></thead>
<tbody>${ms}<tr class="total"><td>Total proposed training fee</td><td></td><td class="num">${money(r.pricing.quote)}</td></tr></tbody></table>

<h2>5. Amendment and re-papering triggers</h2>
<p>The following require a written amendment before work proceeds:</p>
<table><thead><tr><th>Trigger</th><th>What happens</th></tr></thead><tbody>${amend}</tbody></table>

${serving.replace('<h2>5.', '<h2>6.')}
<h2>${s.include ? '7' : '5'}. Customer responsibilities and assumptions</h2>
<ul>
<li>Customer provides data and access by kickoff, and confirms the base-model licence and training access.</li>
<li>Scope is limited to the one workflow above. Material changes follow Section 5.</li>
<li>Results are reported as measured on the frozen held-out set. A quality uplift is not guaranteed.</li>
</ul>
<p class="note">[Data rights and confidentiality — counsel review] · [Liability and indemnity — counsel review] · [Termination payment — counsel review] · [Governing law — counsel review]</p>
<h2>Signatures</h2>
<table><tbody><tr><td>For ${escapeHtml(deal.customer.name)}</td><td>For Applied Compute</td></tr>
<tr><td>Name / title / date:</td><td>Name / title / date:</td></tr></tbody></table>`;
  return doc('Statement of Work', body, r.gates.status, deal.customer.name);
}

export function buildProposal(deal, r) {
  const p = r.pricing;
  const n = deal.rl.cycles;
  const rows = [
    ['Readiness and baseline', 'Once', 'Feasibility, baseline and grader design.', p.lines[0].value],
    ['Engineering and integration', 'Fixed engagement', 'Harness integration, grader implementation, research and infrastructure support.', p.lines[1].value],
    ['Approved RL cycles', `${n} × cycle fee`, `One train, rollout, evaluation and decision per cycle. Fee adjusted for model size class (small 0.65×, standard 1×, large 2.5×).`, p.lines[2].value],
  ];
  if (p.lines[3].value) rows.push(['Extra-cycle engineering', 'Cycles above included count', 'Named incremental engineering for cycles beyond the included count.', p.lines[3].value]);
  rows.push(['Independent handoff and verification', 'Once', 'Held-out evaluation, checkpoint, reproducibility report and handoff.', p.lines[4].value]);
  if (p.lines[5].value) rows.push(['Negotiated discount', 'Once', 'Explicit discount agreed with the customer.', p.lines[5].value]);
  if (Math.abs(p.adjustment) > 0.5) rows.push(['Proposed price adjustment', 'If approved', 'Requires explicit written customer approval. Not an automatic charge.', p.adjustment]);
  const lines = rows.map(([a, b, c, d]) => `<tr><td><strong>${escapeHtml(a)}</strong></td><td>${escapeHtml(b)}</td><td>${escapeHtml(c)}</td><td class="num">${money(d)}</td></tr>`).join('');

  const s = deal.serving;
  const serving = s.include ? `<h2>Optional production serving (separate order)</h2>
<table><tbody>
<tr><td>Indicative monthly price</td><td class="num">${money(r.serving.price)}</td></tr>
<tr><td>Included monthly tokens</td><td>${tokens(s.includedInputTokens)} input · ${tokens(s.includedOutputTokens)} output</td></tr>
<tr><td>Overage</td><td>${money(s.inputOveragePerM)} per million input tokens · ${money(s.outputOveragePerM)} per million output tokens</td></tr>
</tbody></table>
<p class="note">Production serving requires a load test and a signed service order. It is not included in the training total above.</p>` : '';

  const body = `
<h2>Training engagement — itemized proposal</h2>
<table><thead><tr><th>Item</th><th>Billing</th><th>What the customer receives</th><th class="num">Amount</th></tr></thead>
<tbody>${lines}<tr class="total"><td>Total proposed training fee</td><td></td><td>Model: ${escapeHtml(deal.model)} · ${n} approved cycles · ${r.work.totalWeeks} weeks</td><td class="num">${money(p.quote)}</td></tr></tbody></table>
<p class="note">Fee items are priced in USD. [Validity period — to confirm] · [Tax treatment — counsel review].</p>
${serving}
<h2>Why this price</h2>
<ul>
<li>Priced by the work delivered: each fee corresponds to a named deliverable in the statement of work.</li>
<li>Compute is included in the cycle fee; the customer is not billed separately for GPUs.</li>
<li>Any change to scope, cycle count, base model or region is quoted as a change order rather than absorbed.</li>
</ul>
<h2>Acceptance</h2>
<p>Each phase is accepted against the objective evidence listed in the statement of work. Payment milestones follow the same phase gates.</p>`;
  return doc('Pricing Proposal', body, r.gates.status, deal.customer.name);
}

export function buildCogsCsv(deal, r) {
  const rows = [
    ['INTERNAL — DO NOT SEND TO CUSTOMER', '', ''],
    ['Section', 'Line', 'Value (USD or unit as stated)'],
    ['Deal', 'Customer', deal.customer.name],
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
    ['Price', 'Itemized fees', r.pricing.itemized.toFixed(2)],
    ['Price', 'Target-margin floor', r.pricing.marginFloorPrice.toFixed(2)],
    ['Price', 'Quote', r.pricing.quote.toFixed(2)],
    ['Price', 'Gross margin', (r.pricing.grossMargin * 100).toFixed(2) + '%'],
    ['Price', 'Budget headroom', r.pricing.remainingBudget.toFixed(2)],
  ];
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(q).join(',')).join('\n') + '\n';
}

export function buildDealJson(deal) {
  return JSON.stringify({ format: 'pricing-the-engine/deal', schemaVersion: deal.schemaVersion, deal }, null, 2) + '\n';
}

export function fileName(deal, kind, date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `${slug(deal.customer.name)}_${slug(deal.model)}_${kind}_${d}`;
}
