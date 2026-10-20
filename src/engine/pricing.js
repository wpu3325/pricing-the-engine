// Port of '02 Economics Capacity' rows 91–103 plus two MVP pricing modes.
//
// rateCard (workbook reference): quote = itemized fees, raised to the margin floor if
//   needed (the raise is a proposed adjustment, never auto-billed).
// costPlus (MVP extension): quote = COGS / (1 - target GM).
// cogsBuilt (default MVP model): every customer line is its share of COGS divided by
//   (1 - the margin for that line type). Human hours are never a customer line: the
//   people cost sits inside the packages, and automation shares its saving with the
//   customer according to pricing.automationShare.
import { safeDiv } from './safe.js';
import { classFactors } from './workload.js';

// Price class of each ledger line. Compute and software are priced at their own margins.
const COMPUTE = new Set(['gpuPolicy', 'gpuRollout', 'gpuEval', 'gpuBaseline', 'dev', 'rerun', 'holdoutEval', 'idleCapacity']);
const SOFTWARE = new Set(['ari', 'platform', 'seats', 'licences', 'baseLicence']);
const LABOUR = /^(fde|research|infra|delivery)(Setup|Cycles)$|^(review|dataLabour|scoping|cs|security|legal|verifier)$/;

// Five customer pools. Every ledger line lands in exactly one of them, or in `shared`
// (allocated pro rata to the five by direct cost). Checked by test/cogsbuilt.test.js.
export function poolOf(line) {
  if (COMPUTE.has(line.id)) return line.phase === 'Handoff' ? 'handoff' : 'compute';
  if (SOFTWARE.has(line.id)) return 'software';
  if (line.phase === 'Handoff') return 'handoff';
  if (line.phase === 'Shared') return 'shared';
  if (line.phase === 'Foundation') return 'foundation';
  return 'cycles';
}

function cogsBuiltPricing(deal, cogs, model) {
  const p = deal.pricing;
  const m = p.lineMargins;
  const pools = { foundation: 0, cycles: 0, compute: 0, software: 0, handoff: 0, shared: 0 };
  for (const l of cogs.ledger) pools[poolOf(l)] += l.value;

  // Labour saved by automation is shared with the customer: the customer keeps
  // automationShare of the saving, so the cycle packages carry the rest of it.
  const saving = Math.max(0, (cogs.labourBase ?? 0) - (cogs.labourAuto ?? 0));
  pools.cycles += (1 - p.automationShare) * saving;

  const direct = pools.foundation + pools.cycles + pools.compute + pools.software + pools.handoff;
  const alloc = (x) => (direct > 0 ? pools.shared * (x / direct) : 0);
  const cost = {
    foundation: pools.foundation + alloc(pools.foundation),
    cycles: pools.cycles + alloc(pools.cycles),
    compute: pools.compute + alloc(pools.compute),
    software: pools.software + alloc(pools.software),
    handoff: pools.handoff + alloc(pools.handoff),
  };
  const price = {
    foundation: cost.foundation / (1 - m.package),
    cycles: cost.cycles / (1 - m.package),
    compute: cost.compute / (1 - m.compute),
    software: cost.software / (1 - m.software),
    handoff: cost.handoff / (1 - m.package),
  };
  const gross = Object.values(price).reduce((a, b) => a + b, 0);
  const discount = -gross * p.discountPct;
  const quote = gross + discount;

  const lines = [
    { key: 'readiness', label: 'Setup package: readiness and baseline', value: price.foundation, cost: cost.foundation, margin: m.package, unit: 'Once', group: 'Fixed' },
    { key: 'cycles', label: 'Managed RL cycle packages', value: price.cycles, cost: cost.cycles, margin: m.package, unit: 'Per cycle, priced from effort and automation', group: 'Cycles' },
    { key: 'compute', label: 'Managed compute (included GPU-hours)', value: price.compute, cost: cost.compute, margin: m.compute, unit: 'Included allowance; overage metered', group: 'Compute' },
    { key: 'software', label: 'Platform and Ari usage (included tokens)', value: price.software, cost: cost.software, margin: m.software, unit: 'Included allowance; overage metered per million tokens', group: 'Software' },
    { key: 'handoff', label: 'Handoff and verification package', value: price.handoff, cost: cost.handoff, margin: m.package, unit: 'Once, on signed handoff', group: 'Fixed' },
    { key: 'discount', label: 'Negotiated discount', value: discount, cost: 0, margin: 0, unit: 'Once', group: 'Adjustments' },
  ];
  return { lines, pools, cost, price, gross, quote };
}

export function computePricing(deal, work, cogs, model) {
  const p = deal.pricing;
  const N = deal.rl.cycles;
  const { cycleEngineeringFactor } = classFactors(model.proxyClass);

  // Rate-card build (workbook rows 91–100). Always computed, so every mode can report it.
  const readiness = p.readinessFee;                                               // B91
  const engSetup = p.engineeringSetupFee;                                         // B92
  const cycles = N * p.cycleFee * cycleEngineeringFactor;                         // B93
  const extra = Math.max(0, N - p.includedCycles) * p.extraCycleEngineeringFee;   // B94
  const handoff = p.handoffFee;                                                   // B95
  const discount = -(readiness + engSetup + cycles + extra + handoff) * p.discountPct; // B96
  const itemized = readiness + engSetup + cycles + extra + handoff + discount;    // B97

  const marginFloorPrice = safeDiv(cogs.cogs, Math.max(0.01, 1 - p.targetGrossMargin)); // B98
  const rateCardQuote = itemized + Math.max(0, marginFloorPrice - itemized);

  const budgetSet = p.budgetCeiling > 0;                                          // 0 = not set by the customer
  const common = { marginFloorPrice, targetGrossMargin: p.targetGrossMargin, minGrossMargin: p.minGrossMargin,
    cycleEngineeringFactor, rateCardItemized: itemized, rateCardQuote, budgetCeiling: p.budgetCeiling, budgetSet };

  if (p.mode === 'cogsBuilt') {
    const b = cogsBuiltPricing(deal, cogs, model);
    const grossMargin = b.quote === 0 ? 0 : 1 - cogs.cogs / b.quote;
    const remainingBudget = budgetSet ? p.budgetCeiling - b.quote : 0;
    return {
      ...common,
      mode: 'cogsBuilt',
      lines: b.lines,
      pools: b.pools,
      poolCosts: b.cost,
      itemized: b.gross,
      adjustment: 0,
      quote: b.quote,
      grossMargin,
      remainingBudget,
      meters: meters(deal, cogs, model),
    };
  }

  let lines, adjustment, quote, lineItemized;
  if (p.mode === 'costPlus') {
    adjustment = marginFloorPrice - itemized;                                     // can be negative
    quote = itemized + adjustment;
    lineItemized = itemized;
  } else {
    adjustment = Math.max(0, marginFloorPrice - itemized);                        // B99
    quote = itemized + adjustment;                                                // B100
    lineItemized = itemized;
  }
  lines = [
    { key: 'readiness', label: 'Readiness & baseline', value: readiness, unit: 'Once', group: 'Fixed' },
    { key: 'engineering', label: 'Engineering & integration', value: engSetup, unit: 'Fixed engagement', group: 'Fixed' },
    { key: 'cycles', label: 'Approved RL cycles', value: cycles, unit: `${N} × cycle fee × class factor`, group: 'Cycles' },
    { key: 'extra', label: 'Extra-cycle engineering', value: extra, unit: 'Cycles above included count', group: 'Cycles' },
    { key: 'handoff', label: 'Independent handoff & verification', value: handoff, unit: 'Once', group: 'Fixed' },
    { key: 'discount', label: 'Negotiated discount', value: discount, unit: 'Once', group: 'Adjustments' },
  ];
  const grossMargin = quote === 0 ? 0 : 1 - cogs.cogs / quote;                    // B101
  const remainingBudget = budgetSet ? p.budgetCeiling - quote : 0;                // B103
  return {
    ...common,
    mode: p.mode,
    lines,
    itemized: lineItemized,
    adjustment, quote, grossMargin, remainingBudget,
  };
}

// Meters the customer pays beyond the included allowance. Each rate is the cost of one
// unit divided by (1 - its margin), so overage is priced at the same margin as the line.
export function meters(deal, cogs, model) {
  const p = deal.pricing;
  const gh = cogs.gpuHours ?? 0;
  const gpuCostPerHour = safeDiv(cogs.gpu ?? 0, gh);
  const servingRate = deal.capacity.paygoPrice ?? 0;
  const tp = deal.ari?.servingTokensPerGpuHour ?? 0;
  const tokenCostPerM = safeDiv(servingRate * 1e6, tp);
  return {
    gpuHourRate: gpuCostPerHour / (1 - p.lineMargins.compute),
    tokenPerMillion: tokenCostPerM / (1 - p.lineMargins.software),
    tokenCostPerMillion: tokenCostPerM,
    reviewCadence: 'quarterly',
    provisional: !deal.approvals?.servingThroughputMeasured,
  };
}
