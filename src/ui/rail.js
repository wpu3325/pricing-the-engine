// The live "Deal economics" side panel. Rebuilt from engine output after every
// edit; nothing here computes money. Metrics carry data-metric so focusing a field
// can light up the rows it drives.
import { money, pct, hours, count, decimal } from '../format.js';
import { escapeHtml } from '../documents.js';
import { estimateQuality } from '../progress.js';
import { buildOffer } from '../offer.js';
import { infoButton } from './tooltip.js';

const GROUPS = ['Compute and capacity', 'People and overhead', 'Evaluation and environments', 'Data and storage', 'Platform and tools', 'Risk'];

const chip = (status) => {
  const map = { 'HOLD - SELECT MODEL': ['Select a model', 'hold'], 'READY FOR REVIEW': ['Ready for review', 'ok'] };
  const [text, cls] = map[status] || [status, 'hold'];
  return `<span class="chip ${cls === 'ok' ? 'ok' : ''}">${escapeHtml(text)}</span>`;
};

function blockers(deal, r) {
  const out = [];
  if (!deal.model) out.push({ text: 'Choose a target model', goto: 'sec-model' });
  if (!(deal.data.examples > 0)) out.push({ text: 'Enter training examples: training demand is zero', goto: 'sec-customer' });
  if (r.errors.length) out.push({ text: r.errors[0], goto: 'sec-rl' });
  if (r.gates.readiness && r.gates.readiness !== 'QUALIFIED*' && deal.model) out.push({ text: `Model not yet qualified (${r.gates.readiness})`, goto: 'sec-approvals' });
  if (r.capacity.verdict !== 'FEASIBLE*') out.push({ text: `Capacity: ${r.capacity.verdict}`, goto: 'sec-capacity' });
  if (!r.pricing.budgetSet) out.push({ text: 'Customer budget not set', goto: 'sec-pricing' });
  if (r.pricing.budgetSet && r.pricing.remainingBudget < 0) out.push({ text: 'Quote is above the customer budget', goto: 'sec-pricing' });
  if (r.gates.status === 'HOLD - COST GAP') out.push({ text: 'Cost gap: the handoff has no holdout evaluation cost, or a package has no cost', goto: 'sec-extras' });
  if (r.gates.status === 'HOLD - THROUGHPUT') out.push({ text: 'Ari token price is provisional: serving throughput is not measured', goto: 'sec-approvals' });
  if (r.pricing.grossMargin < deal.pricing.minGrossMargin) out.push({ text: 'Margin is below the minimum', goto: 'sec-pricing' });
  return out;
}

export function renderRail(state) {
  const { deal, r, touched, lastChange, catalog } = state;
  const q = estimateQuality(deal, touched);
  const o = buildOffer(deal, r, catalog);
  const priced = Boolean(deal.model) && deal.data.examples > 0;
  const unpriced = '<span class="muted">—</span>';
  const name = deal.customer.name ? escapeHtml(deal.customer.name) : '<span class="muted">New deal</span>';
  const pctSet = Math.round((q.set / q.total) * 100);
  const missing = q.missing.map((m) => `<li><a href="#" data-goto-field="${escapeHtml(m.path)}">${escapeHtml(m.label)}</a></li>`).join('');
  const bl = blockers(deal, r);
  const cost = GROUPS.map((g) => {
    const v = r.cogs.ledger.filter((l) => l.group === g).reduce((s, l) => s + l.value, 0);
    return { g, v, share: r.cogs.cogs ? v / r.cogs.cogs : 0 };
  }).filter((x) => x.v > 0);
  const phases = o.phases.map((ph) => `<div class="prow"><span>${escapeHtml(ph.title)}</span><b>${money(ph.amount)}</b></div>`).join('');
  const last = lastChange ? `<div class="last-change" role="status">${escapeHtml(lastChange)}</div>` : '';
  const gmCls = r.pricing.grossMargin < deal.pricing.minGrossMargin ? 'no' : r.pricing.grossMargin < deal.pricing.targetGrossMargin ? 'mid' : 'yes';
  return `
<div class="rail-head">
  <div><div class="rail-kicker">Deal economics · live</div><div class="rail-name">${name}</div></div>
  ${chip(r.gates.status)}
</div>
<div class="estimate" data-metric="status">
  <div class="estimate-top"><b>${q.set} of ${q.total}</b> key inputs set <span class="muted">· ${q.defaults} on defaults</span></div>
  <div class="bar"><span style="width:${pctSet}%"></span></div>
  ${q.missing.length ? `<ul class="missing">${missing}</ul>` : '<div class="small muted">All key inputs set. Remaining assumptions are the illustrative defaults.</div>'}
</div>
<div class="kpis">
  <div class="kpi-big" data-metric="quote"><div class="k">Customer quote ${infoButton('kpi.quote', 'Customer quote')}</div><div class="v">${priced ? money(r.pricing.quote) : unpriced}</div><div class="s">${priced ? `${o.phases.length} phases · ${o.cycles} cycle${o.cycles === 1 ? '' : 's'}` : 'Needs a model and training examples'}</div></div>
  <div class="kpi-big" data-metric="margin"><div class="k">Gross margin ${infoButton('kpi.grossMargin', 'Gross margin')}</div><div class="v ${priced ? gmCls : ''}">${priced ? pct(r.pricing.grossMargin) : unpriced}</div><div class="s">target ${pct(deal.pricing.targetGrossMargin, 0)} · min ${pct(deal.pricing.minGrossMargin, 0)}</div></div>
  <div class="kpi-sm" data-metric="cogs"><div class="k">Delivery COGS ${infoButton('kpi.cogs', 'Delivery COGS')}</div><div class="badge-internal">internal</div><div class="v">${money(r.cogs.cogs)}</div></div>
  <div class="kpi-sm" data-metric="gpuh"><div class="k">GPU-hours ${infoButton('kpi.gpuHours', 'GPU-hours')}</div><div class="v">${priced ? hours(r.work.totalGpuHours) : unpriced}</div></div>
  <div class="kpi-sm" data-metric="weeks"><div class="k">Duration</div><div class="v">${count(r.work.totalWeeks)} wk</div></div>
  <div class="kpi-sm" data-metric="method"><div class="k">GPU source ${infoButton('kpi.method', 'GPU source')}</div><div class="v small">${priced ? escapeHtml(r.capacity.method) : unpriced}</div></div>
</div>
<div class="rail-block" data-metric="quote"><h4>Price by phase</h4>${priced ? phases : '<div class="small muted">Price appears once a model and training examples are set.</div>'}</div>
<div class="rail-block" data-metric="cogs"><h4>Where the cost goes</h4>
  ${cost.map((x) => `<div class="cbar"><span>${escapeHtml(x.g)}</span><span class="track"><i style="width:${(x.share * 100).toFixed(1)}%"></i></span><b>${money(x.v)}</b></div>`).join('') || '<div class="small muted">No cost yet</div>'}
</div>
<div class="rail-block blockers"><h4>${bl.length ? 'Before this can be quoted' : 'Nothing blocking a quote'}</h4>
  <ul>${bl.map((b) => `<li><a href="#" data-goto="${escapeHtml(b.goto)}">${escapeHtml(b.text)}</a></li>`).join('')}</ul>
</div>
${last}
<div class="rail-foot small muted">Changes apply instantly. The numbers are the engine's, not estimates typed in here.</div>`;
}

export function railSummaryBar(state) {
  const { deal, r } = state;
  const gmCls = r.pricing.grossMargin < deal.pricing.minGrossMargin ? 'no' : 'yes';
  return `<button type="button" class="rail-bar-btn" data-action="open-rail" aria-label="Open deal economics">
<span>${money(r.pricing.quote)}</span><span class="${gmCls}">${pct(r.pricing.grossMargin)} margin</span><span>${escapeHtml(r.gates.status)}</span></button>`;
}
