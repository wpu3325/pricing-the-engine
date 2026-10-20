// Per-viewer persistence. Every storage access is wrapped: private windows,
// blocked storage or quota errors must never break the page.
import { defaultDeal, SCHEMA_VERSION } from './engine/defaults.js';

const KEY = 'pricing-the-engine:deal:v1';
const TOUCHED_KEY = 'pricing-the-engine:touched:v1';

// Which key inputs the person has actually set (not shared in links; per viewer).
export function loadTouched() {
  try { const raw = globalThis.localStorage?.getItem(TOUCHED_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export function saveTouched(list) {
  try { globalThis.localStorage?.setItem(TOUCHED_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function loadSavedDeal() {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? parseDeal(raw) : null;
  } catch { return null; }
}

export function saveDeal(deal) {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(deal)); } catch { /* ignore */ }
}

export function clearSavedDeal() {
  try { globalThis.localStorage?.removeItem(KEY); globalThis.localStorage?.removeItem(TOUCHED_KEY); } catch { /* ignore */ }
}

// Accepts a deal object or the exported {format, schemaVersion, deal} wrapper.
// Fills missing fields from defaults so older files still open.
export function parseDeal(text) {
  const obj = typeof text === 'string' ? JSON.parse(text) : text;
  const deal = obj && obj.format === 'pricing-the-engine/deal' ? obj.deal : obj;
  if (!deal || typeof deal !== 'object') throw new Error('Not a deal file');
  if (deal.schemaVersion && deal.schemaVersion > SCHEMA_VERSION) throw new Error('Deal file is from a newer version');
  return mergeDefaults(defaultDeal(), deal);
}

// Type-enforcing merge: every leaf keeps the type of its default. A shared file
// can therefore never put a string or object where the engine or UI expects a
// finite number, boolean or string (see test/store.test.js).
function mergeDefaults(base, over) {
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    const isNumeric = base.length === 0 || typeof base[0] === 'number';
    if (isNumeric) return over.filter((v) => typeof v === 'number' && Number.isFinite(v));
    return over.slice(0, base.length).map((v, i) => mergeDefaults(base[i] ?? base[base.length - 1], v));
  }
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(base)) out[k] = mergeDefaults(base[k], over ? over[k] : undefined);
    return out;
  }
  if (typeof base === 'number') return typeof over === 'number' && Number.isFinite(over) ? over : base;
  if (typeof base === 'boolean') return typeof over === 'boolean' ? over : base;
  if (typeof base === 'string') return typeof over === 'string' ? over : base;
  return base;
}

// Shareable link: deal encoded in the URL hash (no server, no storage).
export function encodeHash(deal) {
  const json = JSON.stringify(deal);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeHash(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return parseDeal(decodeURIComponent(escape(atob(pad))));
}
