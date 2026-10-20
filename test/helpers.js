// Shared test helpers: apply dot-path patches to a deal (arrays by index).
import { defaultDeal } from '../src/engine/defaults.js';

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = /^\d+$/.test(keys[i]) ? Number(keys[i]) : keys[i];
    cur = cur[k];
  }
  const last = /^\d+$/.test(keys[keys.length - 1]) ? Number(keys[keys.length - 1]) : keys[keys.length - 1];
  cur[last] = value;
  return obj;
}

export function dealWith(patch = {}) {
  const d = defaultDeal();
  for (const [k, v] of Object.entries(patch)) setPath(d, k, v);
  return d;
}
