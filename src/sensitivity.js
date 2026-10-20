// Sensitivity analysis. Every point is a full re-run of compute() on a copy of
// the deal, so sensitivity and the main numbers can never disagree.
import { compute } from './engine/index.js';
import { clone } from './clone.js';

const scale = (v, f) => (typeof v === 'number' ? v * f : v);

export const DRIVERS = [
  { key: 'policyTp', label: 'Policy-update throughput', apply: (d, f) => { d.demand.policyTokensPerGpuHour = scale(d.demand.policyTokensPerGpuHour, f); } },
  { key: 'rolloutTp', label: 'Rollout throughput', apply: (d, f) => { d.demand.rolloutTokensPerGpuHour = scale(d.demand.rolloutTokensPerGpuHour, f); } },
  { key: 'evalTp', label: 'Eval throughput', apply: (d, f) => { d.demand.evalTokensPerGpuHour = scale(d.demand.evalTokensPerGpuHour, f); } },
  { key: 'rollouts', label: 'Rollout attempts per cycle', apply: (d, f) => { d.demand.rolloutAttemptsPerCycle = scale(d.demand.rolloutAttemptsPerCycle, f); } },
  { key: 'labour', label: 'Labour rates (all roles)', apply: (d, f) => { for (const k of ['fdeRate', 'researchRate', 'infraRate', 'deliveryRate']) d.labor[k] = scale(d.labor[k], f); } },
  { key: 'graders', label: 'Grader and platform costs', apply: (d, f) => { for (const k of ['graderPerCycle', 'baselineGraders', 'platformSupport']) d.costs[k] = scale(d.costs[k], f); } },
  { key: 'rework', label: 'Rework allowance', apply: (d, f) => { d.costs.reworkPct = scale(d.costs.reworkPct, f); } },
  { key: 'reserve', label: 'GPU reservation price', apply: (d, f) => { d.capacity.reservePrice = scale(d.capacity.reservePrice, f); } },
  { key: 'gpuRate', label: 'GPU cost (all capacity prices)', apply: (d, f) => {
    for (const k of ['paygoPrice', 'extendPrice', 'reservePrice', 'allocationRate']) d.capacity[k] = scale(d.capacity[k], f);
  } },
  { key: 'calibration', label: 'Effort calibration (hours)', apply: (d, f) => { d.effort = { ...(d.effort ?? {}), calibrationFactor: scale(d.effort?.calibrationFactor ?? 1, f) }; } },
  { key: 'packageMargin', label: 'Package margin', apply: (d, f) => { d.pricing.lineMargins = { ...d.pricing.lineMargins, package: Math.min(0.9, scale(d.pricing.lineMargins.package, f)) }; } },
];

const summarize = (r) => ({ quote: r.pricing.quote, cogs: r.cogs.cogs, gm: r.pricing.grossMargin, gpuh: r.work.totalGpuHours });

export function tornado(deal, catalog, swing = 0.2) {
  const base = summarize(compute(deal, catalog));
  const rows = DRIVERS.map((drv) => {
    const lo = clone(deal); drv.apply(lo, 1 - swing);
    const hi = clone(deal); drv.apply(hi, 1 + swing);
    const a = summarize(compute(lo, catalog));
    const b = summarize(compute(hi, catalog));
    return {
      key: drv.key, label: drv.label,
      low: { gm: a.gm, quote: a.quote }, high: { gm: b.gm, quote: b.quote },
      gmSwing: Math.abs(b.gm - a.gm),
    };
  }).sort((x, y) => y.gmSwing - x.gmSwing);
  return { base, swing, rows };
}

export function cycleSweep(deal, catalog, from = 1, to = 10) {
  const out = [];
  for (let n = from; n <= to; n++) {
    const d = clone(deal); d.rl.cycles = n;
    const r = compute(d, catalog);
    out.push({ cycles: n, cogs: r.cogs.cogs, quote: r.pricing.quote, gm: r.pricing.grossMargin, gpuh: r.work.totalGpuHours, status: r.gates.status });
  }
  return out;
}

// If a competitor prices at `price`, what margin remains and where is walk-away?
export function undercut(r, price) {
  const cogs = r.cogs.cogs;
  const gm = price > 0 ? 1 - cogs / price : 0;
  return {
    price, gm,
    belowMin: gm < r.pricing.minGrossMargin,
    walkAway: cogs / Math.max(0.01, 1 - r.pricing.minGrossMargin),
    targetPrice: cogs / Math.max(0.01, 1 - r.pricing.targetGrossMargin),
  };
}
