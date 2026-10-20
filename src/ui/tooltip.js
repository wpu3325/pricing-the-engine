// One floating explanation card for every ⓘ and [data-explain] element.
// Hover/focus shows it; click/tap pins it. Text is built with escapeHtml only.
import { explain } from '../explain.js';
import { escapeHtml } from '../documents.js';

let tip, pinned = null;

export function initTooltip(getCtx) {
  tip = document.getElementById('tip');
  const show = (el, pin = false) => {
    const key = el.dataset.explain;
    const ex = explain(key, getCtx());
    if (!ex) return;
    tip.innerHTML = `<div class="flag">${ex.kind === 'output' ? 'THIS DEAL' : 'INPUT'}</div>
<div class="tt">${escapeHtml(ex.label)}</div>
<div class="meaning">${escapeHtml(ex.meaning)}</div>
${ex.equation ? `<code>${escapeHtml(ex.equation)}</code>` : ''}
${ex.live ? `<div class="live">= ${escapeHtml(ex.live)}</div>` : ''}
<div class="ref">${ex.kind === 'input' ? 'Workbook' : 'Source'}: ${escapeHtml(ex.ref)}</div>`;
    tip.classList.add('show');
    place(el);
    if (pin) pinned = el;
  };
  const place = (el) => {
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
    let top = r.bottom + 10;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 10);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  const hide = () => { if (!pinned) tip.classList.remove('show'); };
  const unpin = () => { pinned = null; tip.classList.remove('show'); };

  document.addEventListener('mouseover', (e) => { const el = e.target.closest?.('[data-explain]'); if (el) show(el); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest?.('[data-explain]')) hide(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-explain]'); if (el) show(el); });
  document.addEventListener('focusout', (e) => { if (e.target.closest?.('[data-explain]')) hide(); });
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-explain]');
    if (el) { e.preventDefault(); pinned === el ? unpin() : show(el, true); return; }
    if (pinned && !e.target.closest?.('#tip')) unpin();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') unpin(); });
  window.addEventListener('resize', () => { if (pinned) place(pinned); });
}

// The info button used next to labels and headings.
export const infoButton = (key, label) =>
  `<button type="button" class="info" data-explain="${escapeHtml(key)}" aria-label="Explain: ${escapeHtml(label)}">i</button>`;
