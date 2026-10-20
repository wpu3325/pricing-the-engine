// Controller: owns state, wires events, decides what re-renders. The engine is
// the only place money is computed; the UI re-renders from compute() output.
import { compute, loadCatalog } from './engine/index.js';
import { defaultDeal } from './engine/defaults.js';
import { STARTERS, starterDeal } from './presets.js';
import { loadSavedDeal, saveDeal, clearSavedDeal, parseDeal, encodeHash, decodeHash } from './store.js';
import { getPathOn, setPathOn } from './path.js';
import { renderNav, renderStrip, renderDealForm, renderSuggest, renderGates, renderEconomics, renderProposalStep, renderGuide, renderUndercut, STEPS } from './ui/views.js';
import { initTooltip } from './ui/tooltip.js';
import { CUSTOM } from './ui/forms.js';
import { buildSow, buildProposal, buildCogsCsv, buildDealJson, fileName, escapeHtml } from './documents.js';
import { suggestAll } from './engine/profile.js';
import { undercut } from './sensitivity.js';
import { COGS_EXTENDED_PRESETS } from './data/cogs_extended_presets.js';

const catalog = loadCatalog();
const DEFAULTS = defaultDeal();
const state = { catalog, deal: null, r: null, step: 'deal', swing: 0.2, competitor: null, previewTab: 'sow' };
const $ = (sel) => document.querySelector(sel);

function recompute() {
  state.r = compute(state.deal, catalog);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

function download(name, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function header() {
  const d = state.deal;
  const id = 'deal_' + hash6(`${d.customer.name}|${d.model}|${d.rl.cycles}`);
  return `<div class="crumbs"><span>Applied Compute</span><span>/</span><span>${escapeHtml(d.customer.name)}</span><span>/</span><span class="id">${id}</span></div>`;
}

function hash6(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function renderNavOnly() { $('#nav').innerHTML = renderNav(state.step); }

function renderMain() {
  const { deal, r, catalog: cat } = state;
  let html = '';
  if (state.step === 'deal') {
    html = `${header()}<div class="eyebrow">Step 1 of 3 · Intake</div>
<h1>Describe the engagement</h1>
<p class="lede">Enter the customer's workload, model and capacity. Essentials are open. Advanced assumptions hold every workbook field. Hover any ⓘ for the equation and this deal's numbers.</p>
<div id="strip">${renderStrip(deal, r)}</div>
<div id="gates">${renderGates(deal, r)}</div>
<div id="suggest">${renderSuggest(deal, r, cat)}</div>
<div id="form">${renderDealForm(deal, r, cat)}</div>`;
  } else if (state.step === 'economics') {
    html = `${header()}<div class="eyebrow">Step 2 of 3 · Analysis</div>
<h1>Economics and sensitivity</h1>
<p class="lede">Cost to deliver, whether the GPUs exist in time, what the price has to be, and what moves the margin most. Internal only.</p>
<div id="strip">${renderStrip(deal, r)}</div>
${renderEconomics(state)}`;
  } else {
    html = `${header()}<div class="eyebrow">Step 3 of 3 · Customer</div>
<h1>Customer proposal and SOW</h1>
<p class="lede">The statement of work and itemized pricing, generated from the same run. Download, print or share once the status clears review.</p>
<div id="strip">${renderStrip(deal, r)}</div>
${renderProposalStep(state)}`;
  }
  $('#view').innerHTML = html;
  $('#view').focus({ preventScroll: true });
}

function renderAll() {
  renderNavOnly();
  renderMain();
  renderStarter();
}

function renderStarter() {
  const sel = $('#starter');
  const current = STARTERS.find((s) => s.model === state.deal.model && s.id !== 'workflow') || STARTERS[0];
  sel.innerHTML = STARTERS.map((s) => `<option value="${s.id}" ${s.id === current.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
}

// Re-render only the parts that depend on a field change. The form itself is NOT
// rebuilt, so the input keeps focus while the user types or tabs.
function refreshLive() {
  const { deal, r } = state;
  if (state.step === 'deal') {
    $('#strip').innerHTML = renderStrip(deal, r);
    $('#gates').innerHTML = renderGates(deal, r);
    $('#suggest').innerHTML = renderSuggest(deal, r, catalog);
  } else {
    $('#strip').innerHTML = renderStrip(deal, r);
  }
}

function commit({ full = false } = {}) {
  recompute();
  saveDeal(state.deal);
  if (full || state.step !== 'deal') renderAll();
  else refreshLive();
}

function setValue(path, value) {
  setPathOn(state.deal, path, value);
  markChanged();
}

function markChanged() {
  document.querySelectorAll('[data-field]').forEach((el) => {
    const path = el.dataset.field;
    const cur = getPathOn(state.deal, path);
    const def = getPathOn(DEFAULTS, path);
    el.classList.toggle('changed', JSON.stringify(cur) !== JSON.stringify(def));
  });
}

function applyRollout(s) {
  const r = s.rollout;
  if (!r) return;
  setPathOn(state.deal, 'demand.rolloutAttemptsPerCycle', r.rolloutAttemptsPerCycle);
  setPathOn(state.deal, 'demand.rolloutInputTokens', r.rolloutInputTokens);
  setPathOn(state.deal, 'demand.rolloutOutputTokens', r.rolloutOutputTokens);
  setPathOn(state.deal, 'demand.evalCasesPerCycle', r.evalCasesPerCycle);
}

function readInput(el) {
  const kind = el.dataset.kind;
  const path = el.dataset.path;
  if (kind === 'model') {
    if (el.value === CUSTOM) { state.deal.model = 'Custom model'; return { ok: true, rerender: true }; }
    state.deal.model = el.value; return { ok: true, rerender: true };
  }
  if (kind === 'number' || kind === 'percent') {
    const raw = el.value.trim();
    const v = raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(v)) { toast('Enter a number'); return { ok: false }; }
    setPathOn(state.deal, path, kind === 'percent' ? v / 100 : v);
    return { ok: true };
  }
  if (kind === 'bool') { setPathOn(state.deal, path, el.value === 'Yes'); return { ok: true }; }
  if (kind === 'text') { setPathOn(state.deal, path, el.value); return { ok: true }; }
  if (kind === 'select') { setPathOn(state.deal, path, el.value); return { ok: true }; }
  return { ok: false };
}

function onChange(e) {
  const el = e.target;
  if (el.dataset.path) {
    const res = readInput(el);
    if (!res.ok) { el.value = String(getPathOn(state.deal, el.dataset.path) ?? ''); return; }
    if (res.rerender) { commit({ full: true }); return; }
    // Changing the data type / task / model changes suggestions: refresh the panel, keep the form.
    commit({ full: false });
    markChanged();
    return;
  }
  if (el.dataset.score !== undefined) {
    const vals = [...document.querySelectorAll('[data-score]')].map((i) => i.value.trim());
    const scores = [];
    for (const v of vals) { if (v === '') break; const n = Number(v); if (!Number.isFinite(n)) break; scores.push(n); }
    state.deal.rl.scores = scores;
    commit({ full: false });
    return;
  }
  if (el.dataset.competitor !== undefined) {
    const v = Number(el.value);
    state.competitor = Number.isFinite(v) && v > 0 ? v : null;
    $('#undercut').innerHTML = renderUndercut(state.deal, state.r, state.competitor ?? undefined);
    return;
  }
  if (el.id === 'starter') return;
}

function onClick(e) {
  const t = e.target.closest('button, a[data-action]');
  if (!t) return;
  if (t.dataset.step) { state.step = t.dataset.step; renderAll(); $('#main').scrollIntoView({ block: 'start' }); return; }
  if (t.dataset.swing) { state.swing = Number(t.dataset.swing); renderMain(); return; }
  if (t.dataset.tab) { state.previewTab = t.dataset.tab; renderMain(); return; }
  if (t.dataset.apply === 'policy') {
    const s = suggestAll(state.deal, state.r.model);
    if (s.policyTokensPerCycle != null) setValue('demand.policyTokensPerCycle', s.policyTokensPerCycle);
    commit({ full: true }); toast('Applied suggested policy tokens');
    return;
  }
  if (t.dataset.apply === 'rollout') {
    applyRollout(suggestAll(state.deal, state.r.model));
    commit({ full: true }); toast('Applied task defaults');
    return;
  }
  if (t.dataset.useModel) { state.deal.model = t.dataset.useModel; commit({ full: true }); toast(`Selected ${t.dataset.useModel}. Still needs qualification.`); return; }
  switch (t.dataset.action) {
    case 'guide': $('#guide').innerHTML = renderGuide(); $('#guide').showModal(); return;
    case 'fill-extras':
      for (const [k, v] of Object.entries(COGS_EXTENDED_PRESETS.values)) state.deal.extras[k] = v;
      commit({ full: true }); toast('Illustrative cost lines filled. Margin updated.'); return;
    case 'clear-extras':
      for (const k of Object.keys(state.deal.extras)) state.deal.extras[k] = 0;
      commit({ full: true }); toast('Back to the workbook cost baseline'); return;
    case 'close-guide': $('#guide').close(); return;
    case 'export-doc': {
      const kind = t.dataset.kind;
      const html = kind === 'sow' ? buildSow(state.deal, state.r) : buildProposal(state.deal, state.r);
      download(`${fileName(state.deal, kind === 'sow' ? 'SOW' : 'pricing-proposal')}.html`, 'text/html', html);
      toast('Downloaded. Review before sending.');
      return;
    }
    case 'print-doc': {
      const kind = t.dataset.kind;
      const html = kind === 'sow' ? buildSow(state.deal, state.r) : buildProposal(state.deal, state.r);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const w = window.open(url, '_blank', 'noopener');
      if (w) w.addEventListener('load', () => w.print());
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    case 'export-csv': download(`${fileName(state.deal, 'INTERNAL-cogs')}.csv`, 'text/csv', buildCogsCsv(state.deal, state.r)); return;
    case 'export-json': case 'save-deal': download(`${fileName(state.deal, 'deal')}.json`, 'application/json', buildDealJson(state.deal)); return;
    case 'load-deal': $('#file-in').click(); return;
    case 'share': {
      const link = `${location.origin}${location.pathname}#share=${encodeHash(state.deal)}`;
      navigator.clipboard?.writeText(link).then(() => toast('Share link copied'), () => { history.replaceState(null, '', `#share=${encodeHash(state.deal)}`); toast('Link is in the address bar'); });
      if (!navigator.clipboard) history.replaceState(null, '', `#share=${encodeHash(state.deal)}`);
      return;
    }
    case 'reset': state.deal = starterDeal('workflow'); clearSavedDeal(); history.replaceState(null, '', location.pathname); commit({ full: true }); toast('Reset to the example deal'); return;
    default: return;
  }
}

function onStarter(e) {
  if (e.target.id !== 'starter') return;
  state.deal = starterDeal(e.target.value);
  state.competitor = null;
  commit({ full: true });
  toast(`Loaded ${STARTERS.find((s) => s.id === e.target.value).name}`);
}

async function onFile(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    state.deal = parseDeal(await f.text());
    commit({ full: true });
    toast('Deal loaded');
  } catch (err) {
    toast(`Could not load: ${err.message}`);
  } finally { e.target.value = ''; }
}

function bootDeal() {
  const hash = location.hash.startsWith('#share=') ? location.hash.slice(7) : null;
  if (hash) { try { return decodeHash(hash); } catch { toast('Share link is not valid; loaded the example'); } }
  return loadSavedDeal() || starterDeal('workflow');
}

function init() {
  state.deal = bootDeal();
  recompute();
  initTooltip(() => ({ deal: state.deal, r: state.r }));
  renderAll();
  document.addEventListener('change', onChange);
  document.addEventListener('click', onClick);
  $('#starter').addEventListener('change', onStarter);
  $('#file-in').addEventListener('change', onFile);
  document.addEventListener('input', (e) => { if (e.target.dataset?.score !== undefined) e.target.dataset.dirty = '1'; });
  markChanged();
}

init();
export { state, undercut };
