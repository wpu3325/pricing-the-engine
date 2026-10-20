// Hand-written SVG charts. Pure string builders: no library, no DOM access.
// Palette follows the Applied Compute console: orange primary, blue for eval,
// grey for existing capacity, ink for totals.
import { money, pct, count } from '../format.js';
import { escapeHtml } from '../documents.js';

const C = { orange: '#f04a00', blue: '#2463eb', grey: '#c3c3c3', ink: '#101010', muted: '#737373', line: '#ededed' };

export function weeklyCapacityChart(weeks, { width = 760, height = 240 } = {}) {
  const pad = { l: 44, r: 12, t: 16, b: 34 };
  const iw = width - pad.l - pad.r, ih = height - pad.t - pad.b;
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.peak, w.existing)));
  const bw = iw / weeks.length;
  const y = (v) => pad.t + ih - (v / max) * ih;
  const ticks = niceTicks(max);
  let s = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="GPUs needed versus spare existing GPUs per week" class="chart">`;
  for (const t of ticks) s += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="${C.line}"/><text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${t}</text>`;
  weeks.forEach((w, i) => {
    const x = pad.l + i * bw;
    const ex = y(w.existing), nd = y(w.peak);
    s += `<rect x="${x + bw * 0.12}" y="${ex}" width="${bw * 0.34}" height="${pad.t + ih - ex}" fill="${C.grey}"><title>Week ${w.week}: ${w.existing} spare GPUs</title></rect>`;
    if (w.peak > 0) s += `<rect x="${x + bw * 0.5}" y="${nd}" width="${bw * 0.34}" height="${pad.t + ih - nd}" fill="${w.need > 0 ? C.orange : C.ink}"><title>Week ${w.week}: ${w.peak} GPUs needed, ${w.need} uncovered</title></rect>`;
    if (weeks.length <= 16 || w.week % 4 === 0 || w.week === 1) s += `<text x="${x + bw / 2}" y="${height - 12}" text-anchor="middle" class="axis">W${w.week}</text>`;
  });
  s += `<g class="legend"><rect x="${pad.l}" y="2" width="10" height="10" fill="${C.grey}"/><text x="${pad.l + 16}" y="11" class="axis">Spare existing GPUs</text><rect x="${pad.l + 160}" y="2" width="10" height="10" fill="${C.ink}"/><text x="${pad.l + 176}" y="11" class="axis">GPUs needed (covered)</text><rect x="${pad.l + 330}" y="2" width="10" height="10" fill="${C.orange}"/><text x="${pad.l + 346}" y="11" class="axis">GPUs needed (uncovered)</text></g>`;
  return s + '</svg>';
}

export function marginGauge(gm, min, target) {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const fillCls = gm < min ? 'below' : gm < target ? 'mid' : 'ok';
  return `<div class="gauge" role="img" aria-label="Gross margin ${pct(gm)} against minimum ${pct(min, 0)} and target ${pct(target, 0)}">
<div class="gauge-track"><div class="gauge-fill ${fillCls}" style="width:${(clamp(gm) * 100).toFixed(2)}%"></div>
<span class="tick" style="left:${(clamp(min) * 100).toFixed(2)}%"><em style="transform:translateX(-100%)">min ${pct(min, 0)}</em></span>
<span class="tick target" style="left:${(clamp(target) * 100).toFixed(2)}%"><em style="transform:translateX(0)">target ${pct(target, 0)}</em></span></div>
<div class="gauge-read"><strong>${pct(gm)}</strong> expected gross margin</div></div>`;
}

export function tornadoChart(t) {
  const base = t.base.gm;
  const W = 760, rowH = 30, pad = { l: 230, r: 30, t: 8 };
  const span = Math.max(0.02, ...t.rows.flatMap((r) => [Math.abs(r.low.gm - base), Math.abs(r.high.gm - base)]));
  const cx = pad.l + (W - pad.l - pad.r) / 2;
  const sc = ((W - pad.l - pad.r) / 2) / span;
  const H = pad.t + rowH * t.rows.length + 30;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gross margin sensitivity, plus or minus ${pct(t.swing, 0)} per driver" class="chart">`;
  s += `<line x1="${cx}" x2="${cx}" y1="${pad.t}" y2="${H - 26}" stroke="${C.ink}" stroke-width="1"/>`;
  t.rows.forEach((r, i) => {
    const y = pad.t + i * rowH;
    const lo = (r.low.gm - base) * sc, hi = (r.high.gm - base) * sc;
    s += `<text x="${pad.l - 10}" y="${y + 19}" text-anchor="end" class="axis">${escapeHtml(r.label)}</text>`;
    s += `<rect x="${cx + Math.min(lo, hi)}" y="${y + 6}" width="${Math.abs(hi - lo) || 1}" height="16" rx="3" fill="${C.orange}" opacity=".85"><title>${escapeHtml(r.label)}: GM ${pct(r.low.gm)} to ${pct(r.high.gm)} (base ${pct(base)})</title></rect>`;
  });
  s += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="axis">Base GM ${pct(base)} · bars show GM at −${pct(t.swing, 0)} and +${pct(t.swing, 0)} on each driver</text>`;
  return s + '</svg>';
}

export function cycleChart(points, currentCycles) {
  const W = 760, H = 240, pad = { l: 60, r: 16, t: 18, b: 34 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const maxY = Math.max(1, ...points.map((p) => Math.max(p.quote, p.cogs)));
  const x = (i) => pad.l + (i / (points.length - 1 || 1)) * iw;
  const y = (v) => pad.t + ih - (v / maxY) * ih;
  const path = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Quote and COGS by number of approved cycles" class="chart">`;
  for (const t of niceTicks(maxY, money)) s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t.v)}" y2="${y(t.v)}" stroke="${C.line}"/><text x="${pad.l - 8}" y="${y(t.v) + 4}" text-anchor="end" class="axis">${t.label}</text>`;
  s += `<path d="${path('quote')}" fill="none" stroke="${C.orange}" stroke-width="2.5"/>`;
  s += `<path d="${path('cogs')}" fill="none" stroke="${C.blue}" stroke-width="2.5"/>`;
  points.forEach((p, i) => {
    const cur = p.cycles === currentCycles;
    s += `<circle cx="${x(i)}" cy="${y(p.quote)}" r="${cur ? 6 : 3.5}" fill="${C.orange}"><title>${p.cycles} cycles: quote ${money(p.quote)}, COGS ${money(p.cogs)}, GM ${pct(p.gm)}</title></circle>`;
    s += `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" class="axis">${p.cycles}</text>`;
  });
  s += `<g class="legend"><rect x="${pad.l}" y="2" width="10" height="10" fill="${C.orange}"/><text x="${pad.l + 16}" y="11" class="axis">Quote</text><rect x="${pad.l + 80}" y="2" width="10" height="10" fill="${C.blue}"/><text x="${pad.l + 96}" y="11" class="axis">Forecast COGS</text></g>`;
  return s + '</svg>';
}

function niceTicks(max, fmt = (v) => String(v)) {
  const step = Math.pow(10, Math.floor(Math.log10(max || 1)));
  const k = [1, 2, 5, 10].find((m) => max / (step * m) <= 4) || 10;
  const s = step * k;
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += s) out.push(v);
  if (fmt !== String && typeof fmt === 'function' && fmt(1) !== '1') return out.map((v) => ({ v, label: fmt(v) }));
  return out;
}

export { count };
