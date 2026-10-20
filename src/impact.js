// What changed, and by how much. Pure: compares two engine results.
import { money, pct } from './format.js';

export function metricsOf(r) {
  return {
    quote: r.pricing.quote,
    cogs: r.cogs.cogs,
    margin: r.pricing.grossMargin,
    gpuh: r.work.totalGpuHours,
    weeks: r.work.totalWeeks,
    status: r.gates.status,
  };
}

const SIGN = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±');

// Short, exact deltas for the side panel's "last change" line.
export function describeEdit(label, before, after) {
  if (!before || !after) return null;
  const parts = [];
  const dq = after.quote - before.quote;
  const dc = after.cogs - before.cogs;
  const dm = (after.margin - before.margin) * 100;
  const dg = after.gpuh - before.gpuh;
  const dw = after.weeks - before.weeks;
  if (Math.abs(dq) >= 0.5) parts.push(`quote ${SIGN(dq)}${money(Math.abs(dq))}`);
  if (Math.abs(dc) >= 0.5) parts.push(`COGS ${SIGN(dc)}${money(Math.abs(dc))}`);
  if (Math.abs(dm) >= 0.05) parts.push(`margin ${SIGN(dm)}${Math.abs(dm).toFixed(1)} pts`);
  if (Math.abs(dg) >= 0.5) parts.push(`GPU-hours ${SIGN(dg)}${Math.round(Math.abs(dg)).toLocaleString('en-US')}`);
  if (dw) parts.push(`weeks ${SIGN(dw)}${Math.abs(dw)}`);
  if (before.status !== after.status) parts.push(`status ${before.status} → ${after.status}`);
  if (!parts.length) return `${label}: no change to the economics`;
  return `${label}: ${parts.join(' · ')}`;
}

export function headline(m) {
  return `${money(m.quote)} quote · ${pct(m.margin)} margin`;
}
