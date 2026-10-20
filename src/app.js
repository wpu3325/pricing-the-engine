// Controller: owns state, wires events, decides what re-renders. The engine is the
// only place money is computed. The side panel is rebuilt from engine output on
// every edit; the form itself is only rebuilt on structural changes, so typing
// never loses focus.
import { compute, loadCatalog } from './engine/index.js';
import { defaultDeal } from './engine/defaults.js';
import { STARTERS, starterDeal, newDeal } from './presets.js';
import { loadSavedDeal, saveDeal, loadTouched, saveTouched, clearSavedDeal, parseDeal, encodeHash, decodeHash } from './store.js';
import { getPathOn, setPathOn } from './path.js';
import { renderNav, renderDealForm, renderSuggest, renderEconomics, renderProposalStep, renderGuide, renderUndercut, renderPhaseMargin, renderHome, STEPS } from './ui/views.js';
import { renderRail, railSummaryBar } from './ui/rail.js';
import { initTooltip } from './ui/tooltip.js';
import { CUSTOM, AUTO_FIELDS } from './ui/forms.js';
import { buildSow, buildProposal, buildCogsCsv, buildDealJson, fileName, escapeHtml } from './documents.js';
import { suggestAll } from './engine/profile.js';
import { SECTIONS } from './schema.js';
import { KEY_INPUTS, drivesOf } from './progress.js';
import { metricsOf, describeEdit } from './impact.js';
import { COGS_EXTENDED_PRESETS } from './data/cogs_extended_presets.js';

const catalog = loadCatalog();
const DEFAULTS = defaultDeal();
const state = { catalog, deal: null, touched: new Set(), r: null, step: 'deal', swing: 0.2, competitor: null, previewTab: 'sow', lastChange: null, editBefore: null };
const $ = (sel) => document.querySelector(sel);
const LABELS = Object.fromEntries(SECTIONS.flatMap((s) => s.fields.map((f) => [f.path, f.label])));

function recompute() { state.r = compute(state.deal, catalog); }

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

function download(name, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function hash6(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 6);
}

function header() {
  const d = state.deal;
  const name = d.customer.name ? escapeHtml(d.customer.name) : 'New deal';
  const id = 'deal_' + hash6(`${d.customer.name}|${d.model}|${d.rl.cycles}`);
  return `<div class="crumbs"><span>Applied Compute</span><span>/</span><span>${name}</span><span>/</span><span class="id">${id}</span></div>`;
}

// Derive the fields the tool can fill from the data, but only until the person edits them.
function autoDerive() {
  const d = state.deal;
  if (!(d.data.examples > 0) || !state.r) return;
  const s = suggestAll(d, state.r.model);
  if (!state.touched.has('demand.policyTokensPerCycle') && s.policyTokensPerCycle != null) {
    setPathOn(d, 'demand.policyTokensPerCycle', s.policyTokensPerCycle);
  }
  if (s.rollout) {
    for (const [path, key] of [['demand.rolloutAttemptsPerCycle', 'rolloutAttemptsPerCycle'], ['demand.rolloutInputTokens', 'rolloutInputTokens'], ['demand.rolloutOutputTokens', 'rolloutOutputTokens'], ['demand.evalCasesPerCycle', 'evalCasesPerCycle']]) {
      if (!state.touched.has(path)) setPathOn(d, path, s.rollout[key]);
    }
  }
}

function renderAll() {
  $('#nav').innerHTML = renderNav(state.step, state.deal, state.touched);
  renderMain();
  renderRailNow();
  renderStarter();
}

function renderMain() {
  const { deal, r, catalog: cat } = state;
  let html = '';
  if (state.step === 'start') {
    html = renderHome(state);
  } else if (state.step === 'deal') {
    html = `${header()}<div class="eyebrow">Deal inputs</div>
<h1>${deal.customer.name ? escapeHtml(deal.customer.name) : 'Describe the engagement'}</h1>
<p class="lede">Work top to bottom. Each section says what it feeds, and the panel on the right updates as you type. Grey tags mark illustrative defaults you have not changed yet.</p>
<div id="form">${renderDealForm(deal, r, cat, state.touched)}</div>`;
  } else if (state.step === 'economics') {
    html = `${header()}<div class="eyebrow">Analysis</div>
<h1>Economics and sensitivity</h1>
<p class="lede">Cost to deliver, whether the GPUs exist in time, what the price has to be, and what moves the margin most. Internal only.</p>
${renderEconomics(state)}`;
  } else {
    html = `${header()}<div class="eyebrow">Customer</div>
<h1>Customer proposal and SOW</h1>
<p class="lede">The statement of work and itemized pricing, generated from the same run. Download, print or share once the status clears review.</p>
${renderProposalStep(state)}`;
  }
  $('#view').innerHTML = html;
}

function renderRailNow() {
  $('#rail').innerHTML = renderRail(state);
  $('#railbar').innerHTML = railSummaryBar(state);
  applyFocus();
}

function renderStarter() {
  const sel = $('#starter');
  const current = state.deal.model && !state.deal.customer.name ? 'blank' : (STARTERS.find((s) => s.model === state.deal.model && s.id !== 'workflow')?.id || (state.deal.customer.name ? 'workflow' : 'blank'));
  sel.innerHTML = [`<option value="blank" ${current === 'blank' ? 'selected' : ''}>New blank deal</option>`]
    .concat(STARTERS.map((s) => `<option value="${s.id}" ${s.id === current ? 'selected' : ''}>${escapeHtml(s.name)}</option>`)).join('');
}

function refreshLive() {
  // Keep auto-derived inputs showing their current value, unless the person is typing in them.
  for (const path of Object.keys(AUTO_FIELDS)) {
    const el = document.querySelector(`[data-path="${CSS.escape(path)}"]`);
    if (el && el !== document.activeElement) el.value = String(getPathOn(state.deal, path) ?? '');
  }
  renderRailNow();
  $('#nav').innerHTML = renderNav(state.step, state.deal, state.touched);
  if (state.step === 'economics' || state.step === 'proposal') renderMain();
}

// quiet: refresh only the live panel and nav (used while typing, so focus is kept).
function commit({ full = false, label = null, quiet = false } = {}) {
  const before = state.editBefore ?? (state.r ? metricsOf(state.r) : null);
  recompute();
  autoDerive();
  recompute();
  const after = metricsOf(state.r);
  if (label) { state.lastChange = describeEdit(label, before, after); state.editBefore = null; }
  else if (quiet && !state.editBefore) state.editBefore = before;
  saveDeal(state.deal);
  saveTouched([...state.touched]);
  if (quiet) { refreshLive(); return; }
  if (full || state.step !== 'deal') renderAll();
  else { renderMain(); refreshLive(); }
  markChanged();
}

function markChanged() {
  document.querySelectorAll('[data-field]').forEach((el) => {
    const path = el.dataset.field;
    el.classList.toggle('changed', JSON.stringify(getPathOn(state.deal, path)) !== JSON.stringify(getPathOn(DEFAULTS, path)));
  });
}

// Highlight the panel rows the focused field drives.
function applyFocus() {
  const path = state.focusPath;
  const drives = path ? drivesOf(path) : [];
  document.querySelectorAll('#rail [data-metric]').forEach((el) => {
    el.classList.toggle('lit', drives.includes(el.dataset.metric));
  });
}

function readInput(el) {
  const kind = el.dataset.kind, path = el.dataset.path;
  if (kind === 'model') {
    if (el.value === CUSTOM) { state.deal.model = 'Custom model'; return { ok: true, rerender: true }; }
    state.deal.model = el.value; return { ok: true, rerender: true };
  }
  if (kind === 'number' || kind === 'percent') {
    const raw = el.value.trim();
    const v = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(v)) { toast('Enter a number'); return { ok: false }; }
    setPathOn(state.deal, path, kind === 'percent' ? v / 100 : v);
    return { ok: true };
  }
  if (kind === 'bool') { setPathOn(state.deal, path, el.value === 'Yes'); return { ok: true }; }
  if (kind === 'text' || kind === 'select') { setPathOn(state.deal, path, el.value); return { ok: true }; }
  return { ok: false };
}

// Live while typing: numbers and text update the panel on every keystroke, without
// rebuilding the form. The labelled 'last change' is recorded when the field commits.
function onInput(e) {
  const el = e.target;
  if (!el.dataset.path || el.dataset.kind === 'select' || el.dataset.kind === 'bool' || el.dataset.kind === 'model') return;
  const res = readInput(el);
  if (!res.ok) return;
  state.touched.add(el.dataset.path);
  commit({ quiet: true });
}

function onChange(e) {
  const el = e.target;
  if (el.dataset.path) {
    const res = readInput(el);
    if (!res.ok) { el.value = String(getPathOn(state.deal, el.dataset.path) ?? ''); return; }
    state.touched.add(el.dataset.path);
    if (res.rerender) { commit({ full: true, label: 'Model' }); return; }
    commit({ label: LABELS[el.dataset.path] || el.dataset.path });
    return;
  }
  if (el.dataset.score !== undefined) {
    const vals = [...document.querySelectorAll('[data-score]')].map((i) => i.value.trim());
    const scores = [];
    for (const v of vals) { if (v === '') break; const n = Number(v); if (!Number.isFinite(n)) break; scores.push(n); }
    state.deal.rl.scores = scores;
    commit({ label: 'Held-out score' });
    return;
  }
  if (el.dataset.competitor !== undefined) {
    const v = Number(el.value);
    state.competitor = Number.isFinite(v) && v > 0 ? v : null;
    $('#undercut').innerHTML = renderUndercut(state.deal, state.r, state.competitor ?? undefined);
  }
}

function onFocus(e) {
  const el = e.target.closest?.('[data-path]');
  state.focusPath = el ? el.dataset.path : null;
  applyFocus();
}
function onBlur(e) {
  if (e.target.closest?.('[data-path]')) { state.focusPath = null; applyFocus(); }
}

function goto(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onClick(e) {
  const t = e.target.closest('button, a');
  if (!t) return;
  if (t.dataset.goto) { if (state.step !== 'deal') { state.step = 'deal'; renderAll(); } goto(t.dataset.goto); return; }
  if (t.dataset.action === 'load-example') { state.deal = starterDeal('workflow'); state.touched = new Set(KEY_INPUTS.map((k) => k.path)); state.lastChange = null; commit({ full: true }); state.step = 'deal'; renderAll(); toast('Worked example loaded'); return; }
  if (t.dataset.gotoField) {
    e.preventDefault();
    if (state.step !== 'deal') { state.step = 'deal'; renderAll(); }
    const input = document.querySelector(`[data-path="${CSS.escape(t.dataset.gotoField)}"]`);
    if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); }
    return;
  }
  if (t.dataset.step) { state.step = t.dataset.step; renderAll(); window.scrollTo({ top: 0 }); return; }
  if (t.dataset.swing) { state.swing = Number(t.dataset.swing); renderMain(); return; }
  if (t.dataset.tab) { state.previewTab = t.dataset.tab; renderMain(); return; }
  if (t.dataset.reset) { state.touched.delete(t.dataset.reset); commit({ full: true, label: `${LABELS[t.dataset.reset] || 'Field'} reset to suggestion` }); return; }
  if (t.dataset.apply === 'rollout') {
    const s = suggestAll(state.deal, state.r.model);
    for (const path of ['demand.rolloutAttemptsPerCycle', 'demand.rolloutInputTokens', 'demand.rolloutOutputTokens', 'demand.evalCasesPerCycle']) state.touched.delete(path);
    commit({ full: true, label: 'Task defaults applied' }); return;
  }
  if (t.dataset.useModel) { state.deal.model = t.dataset.useModel; state.touched.add('model'); commit({ full: true, label: 'Model' }); toast(`Selected ${t.dataset.useModel}. It still needs qualification.`); return; }
  switch (t.dataset.action) {
    case 'open-rail': document.body.classList.toggle('rail-open'); return;
    case 'start': state.step = 'start'; renderAll(); window.scrollTo({ top: 0 }); return;
    case 'guide': $('#guide').innerHTML = renderGuide(); $('#guide').showModal(); return;
    case 'close-guide': $('#guide').close(); return;
    case 'fill-extras':
      for (const [k, v] of Object.entries(COGS_EXTENDED_PRESETS.values)) state.deal.extras[k] = v;
      commit({ full: true, label: 'Illustrative cost lines filled' }); return;
    case 'clear-extras':
      for (const k of Object.keys(state.deal.extras)) state.deal.extras[k] = 0;
      commit({ full: true, label: 'Cost lines cleared' }); return;
    case 'export-doc': {
      const kind = t.dataset.kind;
      const html = kind === 'sow' ? buildSow(state.deal, state.r) : buildProposal(state.deal, state.r);
      download(`${fileName(state.deal, kind === 'sow' ? 'SOW' : 'pricing-proposal')}.html`, 'text/html', html);
      toast('Downloaded. Review before sending.'); return;
    }
    case 'print-doc': {
      const kind = t.dataset.kind;
      const html = kind === 'sow' ? buildSow(state.deal, state.r) : buildProposal(state.deal, state.r);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const w = window.open(url, '_blank', 'noopener');
      if (w) w.addEventListener('load', () => w.print());
      setTimeout(() => URL.revokeObjectURL(url), 60000); return;
    }
    case 'export-csv': download(`${fileName(state.deal, 'INTERNAL-cogs')}.csv`, 'text/csv', buildCogsCsv(state.deal, state.r)); return;
    case 'export-json': case 'save-deal': download(`${fileName(state.deal, 'deal')}.json`, 'application/json', buildDealJson(state.deal)); return;
    case 'load-deal': $('#file-in').click(); return;
    case 'share': {
      const hash = `#share=${encodeHash(state.deal)}`;
      navigator.clipboard?.writeText(`${location.origin}${location.pathname}${hash}`).then(() => toast('Share link copied'), () => { history.replaceState(null, '', hash); toast('Link is in the address bar'); });
      return;
    }
    case 'reset':
      state.deal = newDeal(); state.touched = new Set(); state.lastChange = null; clearSavedDeal();
      history.replaceState(null, '', location.pathname); commit({ full: true }); toast('Started a new blank deal'); return;
    default: return;
  }
}

function onStarter(e) {
  if (e.target.id !== 'starter') return;
  state.deal = starterDeal(e.target.value);
  state.touched = new Set(KEY_INPUTS.map((k) => k.path)); // worked examples are complete
  state.lastChange = null;
  commit({ full: true });
  toast(e.target.value === 'blank' ? 'New blank deal' : `Loaded ${STARTERS.find((s) => s.id === e.target.value).name}`);
}

async function onFile(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    state.deal = parseDeal(await f.text());
    state.touched = new Set(KEY_INPUTS.map((k) => k.path));
    commit({ full: true }); toast('Deal loaded');
  } catch (err) { toast(`Could not load: ${err.message}`); }
  finally { e.target.value = ''; }
}

function bootDeal() {
  const hash = location.hash.startsWith('#share=') ? location.hash.slice(7) : null;
  if (hash) { try { return { deal: decodeHash(hash), touched: new Set(KEY_INPUTS.map((k) => k.path)) }; } catch { toast('Share link is not valid; opened a blank deal'); } }
  const saved = loadSavedDeal();
  if (saved) return { deal: saved, touched: new Set(loadTouched()) };
  return { deal: newDeal(), touched: new Set() };
}

function init() {
  const boot = bootDeal();
  state.deal = boot.deal;
  state.touched = boot.touched;
  state.step = !state.deal.customer.name && !state.deal.model ? 'start' : 'deal';
  recompute();
  initTooltip(() => ({ deal: state.deal, r: state.r }));
  renderAll();
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('click', onClick);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', onBlur);
  $('#starter').addEventListener('change', onStarter);
  $('#file-in').addEventListener('change', onFile);
  window.addEventListener('scroll', spy, { passive: true });
  markChanged();
}

// Scroll-spy: highlight the Deal section nearest the top of the viewport.
function spy() {
  if (state.step !== 'deal') return;
  let best = null, bestDist = Infinity;
  for (const sec of SECTIONS) {
    const el = document.getElementById(`sec-${sec.id}`);
    if (!el) continue;
    const d = Math.abs(el.getBoundingClientRect().top - 120);
    if (d < bestDist) { bestDist = d; best = sec.id; }
  }
  document.querySelectorAll('.nav-sub').forEach((b) => b.classList.toggle('on', b.dataset.goto === `sec-${best}`));
}

init();
