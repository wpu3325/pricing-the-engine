// Builds form fields from the declarative schema. Values are always written back
// through the app's setValue (never trusted from the DOM as numbers without parsing).
import { getPathOn } from '../path.js';
import { escapeHtml } from '../documents.js';
import { infoButton } from './tooltip.js';
import { DATA_TYPES, TASK_TYPES } from '../engine/profile.js';
import { format } from '../format.js';
import { KEY_INPUTS, inputStatus } from '../progress.js';

// Fields the tool derives from the data until the person edits them.
export const AUTO_FIELDS = {
  'demand.policyTokensPerCycle': 'policy',
  'demand.rolloutAttemptsPerCycle': 'rollout',
  'demand.rolloutInputTokens': 'rollout',
  'demand.rolloutOutputTokens': 'rollout',
  'demand.evalCasesPerCycle': 'rollout',
};

export const CUSTOM = '__custom__';

const optionList = (opts) => (Array.isArray(opts) ? opts.map((v) => [v, v]) : Object.entries(opts));

export function fieldHtml(f, deal, { catalog, suggestions, touched = new Set() }) {
  const raw = getPathOn(deal, f.path);
  const blankShown = f.blank && raw === 0;
  const ph = f.placeholder ? ` placeholder="${escapeHtml(f.placeholder)}"` : '';
  const id = `f-${f.path.replace(/\./g, '-')}`;
  const label = f.label;
  const head = `<label for="${id}">${escapeHtml(label)} ${infoButton(f.path, label)}${f.unit ? `<span class="unit">${escapeHtml(f.unit)}</span>` : ''}</label>`;
  let control = '';
  let extra = '';
  if (f.type === 'number' || f.type === 'percent') {
    const shown = blankShown ? '' : f.type === 'percent' ? (Number.isFinite(raw) ? raw * 100 : '') : (raw ?? '');
    const step = f.type === 'percent' ? (f.step ?? 0.01) * 100 : (f.step ?? 'any');
    control = `<input id="${id}" type="number" inputmode="decimal" step="${escapeHtml(String(step))}"${ph} value="${escapeHtml(String(shown))}" data-path="${escapeHtml(f.path)}" data-kind="${f.type}">`;
  } else if (f.type === 'text') {
    control = `<input id="${id}" type="text"${ph} value="${escapeHtml(raw ?? '')}" data-path="${escapeHtml(f.path)}" data-kind="text">`;
  } else if (f.type === 'bool') {
    control = `<select id="${id}" data-path="${escapeHtml(f.path)}" data-kind="bool">${['Yes', 'No'].map((o) => `<option ${(raw ? 'Yes' : 'No') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  } else if (f.type === 'select') {
    const opts = f.options === 'dataTypes' ? Object.entries(DATA_TYPES).map(([k, v]) => [k, v.label])
      : f.options === 'taskTypes' ? Object.entries(TASK_TYPES).map(([k, v]) => [k, v.label])
      : optionList(f.options);
    control = `<select id="${id}" data-path="${escapeHtml(f.path)}" data-kind="select">${opts.map(([v, l]) => `<option value="${escapeHtml(v)}" ${v === raw ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'model') {
    const isCustom = Boolean(deal.model) && !catalog.some((m) => m.name === deal.model);
    const names = catalog.map((m) => m.name);
    const none = !deal.model ? `<option value="" selected disabled>Choose a model…</option>` : '';
    control = `<select id="${id}" data-path="model" data-kind="model">${none}${names.map((n) => `<option ${n === deal.model ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}<option value="${CUSTOM}" ${isCustom ? 'selected' : ''}>Custom model…</option></select>`;
    if (isCustom) {
      extra = `<div class="fields three" style="margin-top:10px">
${customField('customParams.totalB', 'Custom total parameters', deal.customParams.totalB, 'B', catalog)}
${customField('customParams.activeB', 'Custom active parameters', deal.customParams.activeB, 'B', catalog)}
${customField('customParams.architecture', 'Architecture', deal.customParams.architecture, '', catalog)}
</div><p class="hint small muted">A custom model is always HOLD until its benchmark, licence and training eligibility are verified.</p>`;
    }
  }
  const sugg = f.suggest && suggestions ? suggestionHtml(f, suggestions) : '';
  const tag = fieldTag(f, deal, suggestions, touched);
  const key = KEY_INPUTS.find((k) => k.path === f.path);
  const keyTag = key && inputStatus(deal, touched, key) === 'default' ? '<span class="tag def">default</span>' : '';
  return `<div class="field" data-field="${escapeHtml(f.path)}" data-metric-path="${escapeHtml(f.path)}">${head.replace('</label>', ` ${keyTag}${tag}</label>`)}${control}${sugg}${extra}</div>`;
}

function fieldTag(f, deal, suggestions, touched) {
  const kind = AUTO_FIELDS[f.path];
  if (!kind || !suggestions) return '';
  if (touched.has(f.path)) return `<span class="tag"><button type="button" class="linkish" data-reset="${escapeHtml(f.path)}">reset to suggestion</button></span>`;
  return '<span class="tag auto">auto from your data</span>';
}

function customField(path, label, value, unit) {
  const id = `f-${path.replace(/\./g, '-')}`;
  const isText = path.endsWith('architecture');
  return `<div class="field"><label for="${id}">${escapeHtml(label)} ${infoButton('model', label)}${unit ? `<span class="unit">${unit}</span>` : ''}</label>
<input id="${id}" type="${isText ? 'text' : 'number'}" step="any" value="${escapeHtml(value ?? '')}" data-path="${escapeHtml(path)}" data-kind="${isText ? 'text' : 'number'}"></div>`;
}

function suggestionHtml(f, s) {
  if (f.suggest === 'policy') {
    if (s.policyTokensPerCycle == null) return `<div class="suggest"><span>Suggestion needs your training-example count (Customer & data).</span></div>`;
    return `<div class="suggest"><span>Suggested from data: <b>${escapeHtml(format.tokens(s.policyTokensPerCycle))}</b> tokens/cycle <span class="muted">· UNVERIFIED PROXY</span></span><button type="button" data-apply="policy">Apply</button></div>`;
  }
  if (f.suggest === 'rollout' && s.rollout) {
    return `<div class="suggest"><span>Typical for this task: <b>${escapeHtml(format.count(s.rollout.rolloutAttemptsPerCycle))}</b> attempts · <span class="muted">UNVERIFIED PROXY</span></span><button type="button" data-apply="rollout">Apply task defaults</button></div>`;
  }
  return '';
}
