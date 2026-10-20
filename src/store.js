// Per-viewer persistence. Every storage access is wrapped: private windows,
// blocked storage or quota errors must never break the page.
import { defaultDeal, SCHEMA_VERSION } from './engine/defaults.js';

const KEY = 'pricing-the-engine:deal:v1';

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
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* ignore */ }
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

function mergeDefaults(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over.map((v, i) => mergeDefaults(base[i] ?? {}, v)) : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over || {})) out[k] = mergeDefaults(base[k], over[k]);
    return out;
  }
  return over === undefined ? base : over;
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
