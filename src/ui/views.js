// The three steps (Deal, Economics, Proposal) plus the live strip and nav.
// Views only lay out engine output. No money is computed here.
import { money, pct, count, hours, tokens, decimal } from '../format.js';
import { escapeHtml, buildSow, buildProposal } from '../documents.js';
import { SECTIONS } from '../schema.js';
import { EXPLAIN } from '../explain.js';
import { suggestAll, shortlistModels } from '../engine/profile.js';
import { tornado, cycleSweep, undercut } from '../sensitivity.js';
import { weeklyCapacityChart, marginGauge, tornadoChart, cycleChart } from './charts.js';
import { fieldHtml } from './forms.js';
import { infoButton } from './tooltip.js';
import { sectionStatus, estimateQuality } from '../progress.js';
import { buildOffer } from '../offer.js';
import { COGS_EXTENDED_PRESETS } from '../data/cogs_extended_presets.js';
import { gpuComparison } from '../gpuCompare.js';

export const STEPS = [
  { id: 'start', n: '★', name: 'Start here', sub: 'How the process works' },
  { id: 'deal', n: '1', name: 'Deal', sub: 'Inputs & approvals' },
  { id: 'economics', n: '2', name: 'Economics', sub: 'Cost, capacity, sensitivity' },
  { id: 'proposal', n: '3', name: 'Proposal', sub: 'Customer documents & export' },
];

const yesNo = (b) => (b ? 'Yes' : 'No');

export function renderNav(step, deal, touched) {
  const top = STEPS.map((s) => `<button type="button" class="nav" data-step="${s.id}" ${step === s.id ? 'aria-current="step"' : ''}><span class="num">${s.n}</span><span>${escapeHtml(s.name)}<span class="sub">${escapeHtml(s.sub)}</span></span></button>`).join('');
  const subs = step === 'deal' ? `<div class="sub-nav" aria-label="Deal sections">${DEAL_NAV.map((d) => {
    const st = sectionStatus(deal, touched, d.id);
    return `<button type="button" class="nav-sub" data-goto="sec-${d.id}"><span class="dot st-${st}" aria-hidden="true"></span><span class="num-s">${d.num}</span>${escapeHtml(d.label)}</button>`;
  }).join('')}</div>` : '';
  return `<div class="group">Work</div>${top}${subs}
<div class="spacer"></div>
<div class="group">Reference</div>
<button type="button" class="nav" data-action="guide"><span class="num">?</span><span>Guide & sources<span class="sub">Every equation, with workbook refs</span></span></button>
<div class="foot">Planning tool. Not a quote until every approval gate clears.</div>`;
}

const DEAL_NAV = [
  { id: 'customer', num: 1, label: 'Customer & data' },
  { id: 'model', num: 2, label: 'Model & method' },
  { id: 'rl', num: 3, label: 'RL plan & stop rules' },
  { id: 'demand', num: 4, label: 'Compute demand' },
  { id: 'capacity', num: 5, label: 'GPU capacity' },
  { id: 'labor', num: 6, label: 'Delivery costs' },
  { id: 'pricing', num: 7, label: 'Price & margin' },
  { id: 'approvals', num: 8, label: 'Approvals' },
  { id: 'serving', num: 9, label: 'Production (optional)' },
];

// ---------- Step 1: Deal ----------
export function renderDealForm(deal, r, catalog, touched = new Set()) {
  const suggestions = suggestAll(deal, r.model);
  return SECTIONS.map((sec) => {
    const ess = sec.fields.filter((f) => f.essential);
    const adv = sec.fields.filter((f) => !f.essential);
    const extra = sec.id === 'rl' ? scoreEntryHtml(deal) : '';
    const body = (list) => list.map((f) => fieldHtml(f, deal, { catalog, suggestions, touched })).join('');
    const extrasHead = sec.id === 'extras' ? `<p class="small muted" style="margin:0 0 10px">These lines are not in the workbook baseline, so they are $0 until you add them. Fill the illustrative estimates to see a complete cost base, or enter your own figures. Every value is editable and is labelled UNVERIFIED until finance confirms it.</p>
<div class="chips" style="margin-bottom:12px"><button type="button" class="pill dark" data-action="fill-extras">Fill illustrative estimates</button><button type="button" class="pill ghost" data-action="clear-extras">Clear to workbook baseline</button></div>` : '';
    const status = sec.id === 'extras' ? '' : statusChip(sectionStatus(deal, touched, sec.id));
    const head = sec.id === 'extras'
      ? `<div class="eyebrow" style="margin-top:0">Delivery costs · additional lines</div><h2 id="h-${sec.id}">${escapeHtml(sec.title)}</h2>`
      : `<div class="sec-num">${sec.num}</div><div><div class="sec-feeds">${escapeHtml(sec.feeds)}</div><h2 id="h-${sec.id}">${escapeHtml(sec.title)}</h2></div>`;
    const suggest = sec.id === 'model' ? renderSuggest(deal, r, catalog) : '';
    return `<section class="card section ${sec.id === 'extras' ? 'sub' : ''}" id="sec-${sec.id}" aria-labelledby="h-${sec.id}">
<div class="card-head sec-head">${head}${status ? `<div class="sec-status">${status}</div>` : ''}</div>
${extrasHead}
${ess.length ? `<div class="fields">${body(ess)}</div>` : ''}
${suggest}
${adv.length || extra ? `<details class="adv"${sec.id === 'extras' ? ' open' : ''}><summary>${sec.id === 'extras' ? 'Cost lines' : 'More assumptions'} (${adv.length} fields)</summary><div class="fields">${body(adv)}</div>${extra}</details>` : ''}
</section>`;
  }).join('');
}

function statusChip(st) {
  const m = { needs: ['Needs input', 'need'], defaults: ['On defaults', 'def'], done: ['Set', 'ok'], none: ['', ''] };
  const [t, c] = m[st] || m.none;
  return t ? `<span class="status-chip ${c}">${t}</span>` : '';
}

function scoreEntryHtml(deal) {
  const cells = Array.from({ length: Math.min(12, deal.rl.cycles) }, (_, i) => {
    const v = deal.rl.scores[i];
    return `<div class="field"><label for="score-${i}">Cycle ${i + 1} held-out score</label><input id="score-${i}" type="number" step="0.001" min="0" max="1" value="${escapeHtml(v == null ? '' : String(v))}" data-score="${i}"></div>`;
  }).join('');
  return `<h3 style="margin-top:16px">Held-out scores as cycles complete ${infoButton('rl.decision', 'Held-out scores')}</h3><p class="small muted">Enter scores in order. Leave the first blank cycle empty. The engine recommends review; only the customer decides.</p><div class="scores">${cells}</div>`;
}

export function renderSuggest(deal, r, catalog) {
  const s = suggestAll(deal, r.model);
  const shortlist = shortlistModels(catalog, { dataType: deal.data.type, contextTokens: deal.data.contextTokens }).slice(0, 5);
  const cards = shortlist.map((m) => `<button type="button" class="mchip ${m.warn.length ? 'warn' : ''}" data-use-model="${escapeHtml(m.name)}">
<strong>${escapeHtml(m.name)}</strong><small>${escapeHtml([...m.why].join(' · ') || 'no strong match')}</small><small>${escapeHtml(m.warn[0] || '')}</small></button>`).join('');
  return `<div class="card soft" id="suggest-body">
<div class="card-head"><div><h2>Suggested from your data</h2><p class="small muted" style="margin:4px 0 0">Suggestions are proxies, not measurements. Nothing changes until you press Apply.</p></div>${infoButton('model', 'Suggested from your data')}</div>
<div class="grid-3">
<div><h3>Training footprint</h3><div>${s.trainingFootprintGb == null ? '<span class="muted">Not verified: parameters unknown</span>' : `${decimal(s.trainingFootprintGb, 0)} GB (training) · ${escapeHtml(s.trainingSku.note)}`}</div><div class="small muted" style="margin-top:4px">Suggested SKU: <b>${escapeHtml(s.trainingSku.sku ?? '—')}</b>${s.modelMatchesHardware ? '' : ' · <span class="no">model needs B300 review</span>'}</div></div>
<div><h3>Serving footprint</h3><div>${s.servingGpusPerReplica == null ? '<span class="muted">Not verified</span>' : `≈ ${count(s.servingGpusPerReplica)} GPUs per replica`}</div><div class="small muted">Warm-floor input suggestion only.</div></div>
<div><h3>Policy tokens (suggested)</h3><div>${s.policyTokensPerCycle == null ? '<span class="muted">Add training-example count</span>' : escapeHtml(tokens(s.policyTokensPerCycle)) + ' / cycle'}</div><div class="small muted">Examples × tokens per example × passes</div></div>
</div>
<h3 style="margin-top:16px">Model shortlist for ${escapeHtml(deal.data.type.replace(/-/g, ' '))} data ${infoButton('model', 'Model shortlist')}</h3>
<div class="chips">${cards}</div>
<p class="small muted" style="margin:8px 0 0">Ranked by modality, RL eligibility and size. Choosing a model does not qualify it.</p>
</div>`;
}

// ---------- Step 2: Economics ----------
export function renderUndercut(deal, r, competitor, u = undercut(r, competitor ?? Math.round(r.pricing.quote * 0.9))) {
  return `<h3>Competitor undercut ${infoButton('sensitivity.undercut', 'Competitor undercut')}</h3>
<div class="undercut"><div class="field"><label for="competitor">Competitor price ($)</label><input id="competitor" type="number" step="1000" min="0" value="${Math.round(u.price)}" data-competitor></div></div>
<div class="fields" style="margin-top:12px;grid-template-columns:repeat(2,minmax(0,1fr))">
<div class="kpi" style="border:1px solid var(--line);border-radius:10px"><div class="k">Margin if we match</div><div class="v ${u.belowMin ? 'no' : 'yes'}">${pct(u.gm)}</div><div class="s">${u.belowMin ? 'below minimum: do not match on rate' : 'above minimum'}</div></div>
<div class="kpi" style="border:1px solid var(--line);border-radius:10px"><div class="k">Walk-away price</div><div class="v">${money(u.walkAway)}</div><div class="s">at minimum GM ${pct(deal.pricing.minGrossMargin, 0)}</div></div>
</div>
<p class="small" style="margin-top:10px">If a competitor is cheaper, <b>trade scope, not rate</b>: fewer cycles, a shorter readiness phase, or a smaller workflow, so the price per unit of work stays at or above the floor.</p>`;
}

const GROUP_ORDER = ['Compute and capacity', 'People and overhead', 'Evaluation and environments', 'Data and storage', 'Platform and tools', 'Risk'];
export function renderLedger(r) {
  const groups = GROUP_ORDER.map((g) => {
    const rows = r.cogs.ledger.filter((l) => l.group === g);
    if (!rows.length) return '';
    const sub = rows.reduce((a, l) => a + l.value, 0);
    const body = rows.map((l) => `<tr class="${l.value === 0 ? 'muted' : ''}"><td>${escapeHtml(l.label)}</td><td><span class="chip neutral" style="padding:3px 6px">${escapeHtml(l.phase)}</span></td><td><span class="chip ${l.source === 'workbook' ? 'neutral' : 'internal'}" style="padding:3px 6px">${l.source === 'workbook' ? 'workbook' : 'extension'}</span></td><td class="num">${money(l.value)}</td><td class="num small muted">${pct(r.cogs.cogs ? l.value / r.cogs.cogs : 0, 1)}</td></tr>`).join('');
    return `<details open><summary><b>${escapeHtml(g)}</b> <span class="muted">${money(sub)}</span></summary><div class="scroll-x"><table class="t"><thead><tr><th>Cost line</th><th>Phase</th><th>Source</th><th class="num">Amount</th><th class="num">Share</th></tr></thead><tbody>${body}</tbody></table></div></details>`;
  }).join('');
  return `<div class="small muted" style="margin-bottom:8px">Workbook baseline <b>${money(r.cogs.coreTotal)}</b> + extension lines <b>${money(r.cogs.extendedTotal)}</b> + rework <b>${money(r.cogs.rework)}</b> = <b>${money(r.cogs.cogs)}</b>. Lines tagged <i>workbook</i> reproduce sheet 02 exactly.</div>${groups}`;
}

export function renderPhaseMargin(deal, r) {
  const o = buildOffer(deal, r);
  const L = r.cogs.phaseTotals;
  const price = { Foundation: o.phases[0].amount, Engineering: o.phases[1].amount, Cycles: o.phases[2].amount, Handoff: o.phases[3].amount };
  const rows = ['Foundation', 'Engineering', 'Cycles', 'Handoff'].map((ph) => {
    const pr = price[ph], co = L[ph], m = pr - co;
    return `<tr class="${m < 0 ? 'hl' : ''}"><td>${escapeHtml(ph)}</td><td class="num">${money(pr)}</td><td class="num">${money(co)}</td><td class="num">${money(m)}</td><td class="num">${pr ? pct(m / pr, 0) : '—'}</td></tr>`;
  }).join('');
  return `<table class="t"><thead><tr><th>Phase</th><th class="num">Price to customer</th><th class="num">Cost to deliver</th><th class="num">Margin</th><th class="num">Margin %</th></tr></thead><tbody>${rows}
<tr><td>Shared overhead (storage, platform, rework)</td><td class="num">—</td><td class="num">${money(L.Shared)}</td><td class="num">${money(-L.Shared)}</td><td class="num">—</td></tr>
<tr class="total"><td>Total</td><td class="num">${money(o.total)}</td><td class="num">${money(r.cogs.cogs)}</td><td class="num">${money(o.total - r.cogs.cogs)}</td><td class="num">${pct(r.pricing.grossMargin, 1)}</td></tr></tbody></table>
<p class="small muted" style="margin-top:8px">Rows in red show a phase that does not cover its own cost. Shared overhead is not allocated to phases, so the total row is the real margin.</p>`;
}

export function renderEconomics(state) {
  const { deal, r, catalog, swing, competitor } = state;
  const p = r.pricing, c = r.capacity, cg = r.cogs;
  const sensitivity = tornado(deal, catalog, swing);
  const sweep = cycleSweep(deal, catalog, 1, 10);
  const u = undercut(r, competitor ?? Math.round(p.quote * 0.9));
  const priceRows = p.lines.map((l) => `<tr><td>${escapeHtml(l.label)}<div class="small muted">${escapeHtml(l.unit || '')}</div></td><td class="num">${money(l.value)}</td></tr>`).join('');
  const methods = [
    ['PayGo', c.paygoCost, 'Cash as used, no commitment'],
    ['Extend', c.extendCost, 'One-week extensions on the uncovered weeks'],
    ['Reserve', c.reserveCost, `Minimum ${deal.capacity.minReservationWeeks} weeks, paid even if unused`],
  ];
  const cheapest = methods.reduce((a, b) => (b[1] < a[1] ? b : a));
  const gpuRows = gpuComparison(deal, catalog);
  const gpuTable = gpuRows.map((g) => `<tr class="${g.sku === deal.capacity.gpuSku ? 'hl' : ''}"><td>${escapeHtml(g.sku)}${g.sku === deal.capacity.gpuSku ? ' <span class="chip ok" style="padding:3px 6px">this deal</span>' : ''}</td><td class="num">$${g.paygoPerHour.toFixed(2)}</td><td class="num">${g.throughputVsH100.toFixed(1)}×</td><td class="num">$${g.costPerWork.toFixed(2)}</td><td class="num">${count(g.gpuHours)}</td><td>${escapeHtml(g.method)}</td><td class="num">${money(g.gpuCost)}</td><td class="num">${pct(g.gpuShare, 1)}</td><td class="num">${money(g.price)}</td><td class="small muted">${escapeHtml(g.verdict)}</td></tr>`).join('');
  return `
<div class="card" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
<div><h2>Economics</h2><p class="small muted" style="margin:4px 0 0">Internal view. Everything here is for Applied Compute, not the customer.</p></div>
<span class="chip internal">INTERNAL: never shared with the customer</span></div>

<section class="card" aria-labelledby="h-cost">
<div class="card-head"><div><div class="eyebrow" style="margin-top:0">Cost build</div><h2 id="h-cost">Demand → GPU-hours → COGS → price</h2></div></div>
<div class="two-col">
<div><h3>Full cost ledger ${infoButton('cogs.cogs', 'Full cost ledger')}</h3>${renderLedger(r)}
<div class="small" style="margin-top:10px">Rework allowance ${infoButton('cogs.rework', 'Rework allowance')} <b>${money(cg.rework)}</b> · Risk-adjusted COGS <b>${money(cg.cogs)}</b></div></div>
<div><h3>Price build-up ${infoButton('pricing.quote', 'Price build-up')}</h3>
<div class="scroll-x"><table class="t"><tbody>${priceRows}
<tr><td>Itemized fees ${infoButton('pricing.itemized', 'Itemized fees')}</td><td class="num">${money(p.itemized)}</td></tr>
<tr><td>Proposed margin adjustment ${infoButton('pricing.adjustment', 'Proposed margin adjustment')}<div class="small muted">needs written approval</div></td><td class="num">${money(p.adjustment)}</td></tr>
<tr class="total"><td>Quote</td><td class="num">${money(p.quote)}</td></tr></tbody></table></div>
<div style="margin-top:12px"><h3>Margin against policy ${infoButton('kpi.grossMargin', 'Margin against policy')}</h3>${marginGauge(p.grossMargin, p.minGrossMargin, p.targetGrossMargin)}</div>
</div></div>
</section>

<section class="card" aria-labelledby="h-phase"><div class="card-head"><div><div class="eyebrow" style="margin-top:0">Margin by phase</div><h2 id="h-phase">Does each part of the price cover its own cost?</h2><p class="small muted" style="margin:4px 0 0">The same phases the customer sees, compared with the cost lines tagged to each phase.</p></div></div>${renderPhaseMargin(deal, r)}</section>

<section class="card" aria-labelledby="h-cap">
<div class="card-head"><div><div class="eyebrow" style="margin-top:0">Capacity</div><h2 id="h-cap">Do we have the GPUs, in the right weeks?</h2></div>
<span class="chip ${c.verdict === 'FEASIBLE*' ? 'ok' : ''}">${escapeHtml(c.verdict)} ${infoButton('capacity.verdict', 'Capacity verdict')}</span></div>
<div class="scroll-x">${weeklyCapacityChart(c.weeks)}</div>
<div class="grid-2" style="margin-top:14px">
<div><h3>Buying the uncovered weeks ${infoButton('kpi.method', 'Buying the uncovered weeks')}</h3>
<div class="scroll-x"><table class="t"><thead><tr><th>Option</th><th class="num">Cash</th><th>Notes</th></tr></thead><tbody>
${methods.map(([n, v, note]) => `<tr class="${n === cheapest[0] ? 'hl' : ''}"><td>${n}${n === cheapest[0] ? ' <span class="chip ok" style="padding:3px 6px">lowest</span>' : ''}</td><td class="num">${money(v)}</td><td class="small muted">${escapeHtml(note)}</td></tr>`).join('')}
<tr><td>Existing (allocated) ${infoButton('capacity.allocated', 'Allocated existing')}</td><td class="num">${money(c.allocated)}</td><td class="small muted">managerial share of paid GPU hours; not new cash</td></tr>
<tr><td>Opportunity ${infoButton('capacity.opportunity', 'Opportunity value')}</td><td class="num">${money(c.opportunity)}</td><td class="small muted">decision view only</td></tr>
</tbody></table></div></div>
<div><h3>Schedule facts</h3><div class="fields" style="grid-template-columns:repeat(2,minmax(0,1fr))">
${[['Peak GPUs in RL', count(r.work.peakGpus)], ['GPUs short at peak', count(c.peakAdditional)], ['Weeks uncovered', count(c.weeksNeeding)], ['Hours per RL cycle', decimal(r.work.wallHoursPerCycle, 1)], ['Planned weeks', count(r.work.totalWeeks)], ['Method selected', c.method]].map(([a, b]) => `<div class="kpi" style="border:1px solid var(--line);border-radius:10px"><div class="k">${escapeHtml(a)}</div><div class="v" style="font-size:20px">${escapeHtml(b)}</div></div>`).join('')}
</div></div></div>
</section>

<section class="card" aria-labelledby="h-gpu">
<div class="card-head"><div><div class="eyebrow" style="margin-top:0">GPU choice</div><h2 id="h-gpu">How much does the GPU type change cost and price?</h2><p class="small muted" style="margin:4px 0 0">Each row re-prices this deal on one GPU type, with the cycle fee set from compute cost (hybrid mode). The GPU rates and throughput are <b>illustrative placeholders, not quotes</b>; they live in data/gpu_skus.json.</p></div></div>
<div class="scroll-x"><table class="t"><thead><tr><th>GPU</th><th class="num">PayGo $/GPU-h</th><th class="num">Throughput vs H100</th><th class="num">$ per unit of work</th><th class="num">GPU-hours</th><th>Capacity method</th><th class="num">GPU cost</th><th class="num">Share of COGS</th><th class="num">Cost-driven price</th><th>Capacity verdict</th></tr></thead><tbody>${gpuTable}</tbody></table></div>
<p class="small muted">A GPU type matters most when compute is a large share of cost. At the default scale, prepaid capacity and labour dominate, so the price moves only a little between types.</p>
</section>

<section class="card" aria-labelledby="h-sens">
<div class="card-head"><div><div class="eyebrow" style="margin-top:0">Sensitivity</div><h2 id="h-sens">What moves margin most?</h2><p class="small muted" style="margin:4px 0 0">Each bar re-runs the full model with one driver moved. Ranked by margin swing.</p></div>
<div class="seg" role="group" aria-label="Swing size">${[0.1, 0.2, 0.3].map((s) => `<button type="button" data-swing="${s}" aria-pressed="${swing === s}">±${s * 100}%</button>`).join('')}</div></div>
<div class="scroll-x">${tornadoChart(sensitivity)}</div>
<div class="grid-2" style="margin-top:18px">
<div><h3>Approved cycles ${infoButton('sensitivity.cycles', 'Cycles sweep')}</h3><div class="scroll-x">${cycleChart(sweep, deal.rl.cycles)}</div>
<p class="small muted">Current: ${escapeHtml(String(deal.rl.cycles))} cycle${deal.rl.cycles === 1 ? '' : 's'}. Each added cycle adds demand, COGS and fee.</p></div>
<div id="undercut">${renderUndercut(deal, r, competitor, u)}</div>
</div>
</section>

${deal.serving.include ? `<section class="card"><div class="eyebrow" style="margin-top:0">Production serving (separate order)</div><div class="fields three"><div class="kpi" style="border:1px solid var(--line);border-radius:10px"><div class="k">Monthly price ${infoButton('serving.invoice', 'Monthly serving invoice')}</div><div class="v">${money(r.serving.price)}</div></div><div class="kpi" style="border:1px solid var(--line);border-radius:10px"><div class="k">SLO gate ${infoButton('serving.sloStatus', 'Serving SLO gate')}</div><div class="v" style="font-size:18px">${escapeHtml(r.serving.sloStatus)}</div></div><div class="kpi" style="border:1px solid var(--line);border-radius:10px"><div class="k">Scale ${infoButton('serving.scaleRec', 'Scale recommendation')}</div><div class="v" style="font-size:18px">${escapeHtml(r.serving.scaleRec)}</div></div></div></section>` : ''}

<section class="card" aria-labelledby="h-stop"><div class="card-head"><div><div class="eyebrow" style="margin-top:0">Stop / continue</div><h2 id="h-stop">${escapeHtml(r.gates.stop)} ${infoButton('gates.stop', 'Stop guidance')}</h2><p class="small muted" style="margin:4px 0 0">Guidance only. Customer decides after every cycle.</p></div></div>
<div class="scroll-x"><table class="t"><thead><tr><th>Cycle</th><th class="num">Score</th><th class="num">Gain</th><th>Status</th></tr></thead><tbody>
${r.gates.scores.slice(0, deal.rl.cycles).map((s) => `<tr><td>${s.cycle}</td><td class="num">${s.score == null ? '—' : decimal(s.score, 3)}</td><td class="num">${s.gain == null ? '—' : decimal(s.gain, 3)}</td><td>${escapeHtml(s.status)}</td></tr>`).join('')}
</tbody></table></div></section>`;
}

// ---------- Step 3: Proposal ----------
export function renderProposalStep(state) {
  const { deal, r } = state;
  const tab = state.previewTab || 'sow';
  const html = tab === 'sow' ? buildSow(deal, r) : buildProposal(deal, r);
  state.previewHtml = html;
  return `<div class="card" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
<div><h2>Customer documents</h2><p class="small muted" style="margin:4px 0 0">Generated from the same engine run. Safe to send after review, once the status shows DRAFT.</p></div>
<span class="chip ${r.gates.status === 'READY FOR REVIEW' ? 'ok' : ''}">${escapeHtml(r.gates.status)}</span></div>
<div class="banner ${r.gates.status === 'READY FOR REVIEW' ? 'ok' : ''}">${escapeHtml(r.gates.status === 'READY FOR REVIEW' ? 'DRAFT: commercial and legal review still required before sending' : `PRELIMINARY: DO NOT SEND CUSTOMER: ${r.gates.status}`)}</div>
<div class="card">
<div class="card-head"><div class="tabs" role="tablist" aria-label="Document">
<button type="button" role="tab" data-tab="sow" aria-selected="${tab === 'sow'}">Statement of work</button>
<button type="button" role="tab" data-tab="proposal" aria-selected="${tab === 'proposal'}">Pricing proposal</button></div>
<div style="display:flex;gap:8px;flex-wrap:wrap">
<button type="button" class="pill dark" data-action="export-doc" data-kind="${tab}">Download ${tab === 'sow' ? 'SOW' : 'proposal'} (.html)</button>
<button type="button" class="pill" data-action="print-doc" data-kind="${tab}">Print / save PDF</button>
<button type="button" class="pill ghost" data-action="export-csv">Internal COGS (.csv)</button>
<button type="button" class="pill ghost" data-action="export-json">Deal file (.json)</button></div></div>
<iframe class="preview" title="${tab === 'sow' ? 'Statement of work preview' : 'Pricing proposal preview'}" sandbox="" srcdoc="${escapeHtml(html)}"></iframe>
</div>
<div class="card soft"><h3>What the customer documents never contain</h3>
<ul class="small" style="margin:6px 0 0;padding-left:18px;line-height:1.7">
<li>Forecast COGS, labour cost rates, GPU supplier prices, allocation or opportunity cost</li>
<li>Gross margin, the margin floor, or the minimum-margin policy</li>
<li>Internal sensitivity analysis and competitor walk-away prices</li>
</ul><p class="small muted" style="margin:10px 0 0">Enforced by a test that scans every generated customer document.</p></div>`;
}

export function renderGuide() {
  const groups = { input: [], output: [] };
  for (const [k, v] of Object.entries(EXPLAIN)) groups[v.kind].push([k, v]);
  const row = ([k, v]) => `<div class="guide-row"><div><b>${escapeHtml(v.label)}</b> <span class="muted small">${escapeHtml(k)}</span></div>
<div class="small">${escapeHtml(v.meaning)}</div>${v.equation ? `<div class="mono small">${escapeHtml(v.equation)}</div>` : ''}<div class="small muted">${escapeHtml(v.kind === 'input' ? 'Workbook' : 'Source')}: ${escapeHtml(v.ref)}</div></div>`;
  return `<div class="card-head"><h2>Guide & sources</h2><button type="button" class="pill" data-action="close-guide">Close</button></div>
<p class="small muted">Generated from the same registry that powers every hover explanation. Each line names its workbook cell.</p>
<h3>Outputs and equations</h3>${groups.output.map(row).join('')}
<h3 style="margin-top:18px">Inputs</h3>${groups.input.map(row).join('')}`;
}


// ---------- Start here: the process, for a new user ----------
const PROCESS = [
  ['1', 'Customer & data', 'customer', 'Sets the amount of training work.'],
  ['2', 'Model & method', 'model', 'Sets GPU count, cycle price and the hardware gate.'],
  ['3', 'RL plan & stop rules', 'rl', 'Sets duration and price per cycle.'],
  ['4', 'Compute demand', 'demand', 'Sets GPU-hours, the main driver of cost.'],
  ['5', 'GPU capacity', 'capacity', 'Decides spare GPUs versus new purchase.'],
  ['6', 'Delivery costs', 'labor', 'Sets delivery cost (COGS). Internal only.'],
  ['7', 'Price & margin', 'pricing', 'Sets the quote and the margin.'],
  ['8', 'Approvals', 'approvals', 'Decides READY or HOLD.'],
  ['9', 'Production (optional)', 'serving', 'A separate monthly order, never part of training.'],
];

export function renderHome(state) {
  const { deal, r, touched } = state;
  const q = estimateQuality(deal, touched);
  const rows = PROCESS.map(([n, title, sec, what]) => `<li class="proc-step">
<button type="button" class="proc-num" data-goto="sec-${sec}" data-go-step="deal" aria-label="Go to section ${n}">${n}</button>
<div><button type="button" class="linkish big" data-goto="sec-${sec}" data-go-step="deal">${escapeHtml(title)}</button> <span class="muted">${escapeHtml(what)}</span></div></li>`).join('');
  return `<div class="eyebrow">Start here</div>
<h1>How this tool prices an engagement</h1>
<p class="lede">It takes one customer's request and shows, before anything is promised, what it costs to deliver, what to charge, and whether the deal can be approved. Work top to bottom: each section changes the live panel on the right.</p>

<div class="home-grid">
<section class="card"><h2>For the business</h2>
<ul class="plain">
<li>One run turns a customer request into GPU-hours, delivery cost, a price and a margin.</li>
<li>Each decision shows its cost before it is made: model, cycles, buying or reusing GPUs.</li>
<li>A quote can never be ready on an unverified assumption.</li>
</ul></section>
<section class="card"><h2>For the customer</h2>
<ul class="plain">
<li>A proposal that explains each charge, its effort, and when it is invoiced.</li>
<li>They decide after every cycle whether to continue. Reviews never stop contracted work on their own.</li>
</ul></section>
</div>

<section class="card"><div class="eyebrow" style="margin-top:0">The process, in order</div><h2>Nine sections, then the proposal</h2>
<p class="small muted">Section numbers match the left menu. Click any step to jump to it. You do not need every field to see a result: the panel shows what is still missing.</p>
<ol class="proc">${rows}</ol>
<div class="proc-last"><b>10 · Review and send.</b> Open the Proposal step. It shows the customer's proposal and the statement of work, with a status banner. Send only when the banner reads ready for review, and after commercial and legal review.</div>
</section>

<div class="home-grid">
<section class="card"><h2>Reading the status</h2>
<table class="t"><thead><tr><th>Status</th><th>Meaning</th></tr></thead><tbody>
<tr><td><span class="chip">Select a model</span></td><td>Start by choosing the model in section 2.</td></tr>
<tr><td><span class="chip">HOLD</span> (any reason)</td><td>A required approval or input is missing. The panel says which one.</td></tr>
<tr><td><span class="chip ok">Ready for review</span></td><td>Every gate passes. It still needs commercial and legal review before it goes out.</td></tr>
</tbody></table>
<p class="small muted" style="margin-top:10px">Grey “default” tags mark illustrative assumptions (rates, prices, policy). Replace them with the customer's or finance's figures before relying on the price.</p></section>
<section class="card"><h2>Where you are now</h2>
<p><b>${q.set} of ${q.total}</b> key inputs set${q.defaults ? `, ${q.defaults} on defaults` : ''}.</p>
<div class="home-actions">
<button type="button" class="pill dark" data-goto="sec-customer" data-go-step="deal">Start with section 1</button>
<button type="button" class="pill" data-action="load-example">Load a worked example</button>
</div>
<p class="small muted">A worked example shows a complete deal: a text workflow, three cycles, a model, and the approvals still open.</p>
</section>
</div>`;
}
