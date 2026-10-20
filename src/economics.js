// Two views on top of the engine, both read-only and both computed from re-runs of the
// same deal (never a second copy of the maths):
//   priceBand: how far the quote moves when the uncertain inputs move.
//   fixedCostRecovery: whether the engagement contribution covers the fixed monthly cost.
import { compute } from './engine/index.js';
import { clone } from './clone.js';

const DEMAND_THROUGHPUT = ['policyTokensPerGpuHour', 'rolloutTokensPerGpuHour', 'evalTokensPerGpuHour'];
const GPU_PRICES = ['paygoPrice', 'extendPrice', 'reservePrice', 'allocationRate'];

// Quote at -/+ `swing` on throughput, GPU cost and effort. The band is the range of quotes.
export function priceBand(deal, catalog, swing = 0.2) {
  const run = (f) => {
    const d = clone(deal);
    for (const k of DEMAND_THROUGHPUT) d.demand[k] = d.demand[k] * (1 + f * swing);     // faster GPUs, cheaper work
    for (const k of GPU_PRICES) d.capacity[k] = d.capacity[k] * (1 + f * swing);
    d.effort = { ...(d.effort ?? {}), calibrationFactor: (d.effort?.calibrationFactor ?? 1) * (1 + f * swing) };
    return compute(d, catalog).pricing.quote;
  };
  const base = compute(deal, catalog).pricing.quote;
  const low = run(-1), high = run(1);
  return { low: Math.min(low, high), base, high: Math.max(low, high), swing };
}

// Monthly view of the business. Inputs are placeholders until finance supplies them.
export function fixedCostRecovery(r, business = {}) {
  const b = {
    monthlyPlatformTeamCost: 0, monthlyAriDevCost: 0, monthlyCommittedGpuCost: 0,
    engagementsPerMonth: 0, ...business,
  };
  const quote = r.pricing.quote;
  const contribution = quote - r.cogs.cogs;                   // per engagement
  const fixedMonthly = b.monthlyPlatformTeamCost + b.monthlyAriDevCost + b.monthlyCommittedGpuCost;
  const contributionMonthly = contribution * b.engagementsPerMonth;
  return {
    contribution,
    contributionPct: quote ? contribution / quote : 0,
    fixedMonthly,
    contributionMonthly,
    netMonthly: contributionMonthly - fixedMonthly,
    breakEvenEngagements: contribution > 0 ? fixedMonthly / contribution : null,
    covered: contributionMonthly >= fixedMonthly && fixedMonthly >= 0,
  };
}
