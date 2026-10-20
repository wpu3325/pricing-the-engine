// Port of '02 Economics Capacity' rows 91–103 plus the cost-plus alternative.
// Rate-card mode (workbook default): quote = itemized fees, raised to the margin
// floor if needed (the raise is a *proposed* adjustment, never auto-billed).
// Cost-plus mode (MVP extension): quote = COGS / (1 - target GM).
// Hybrid mode (MVP extension): readiness, engineering, extra-cycle and handoff fees
// stay fixed; the cycle line is derived from compute cost, so the quote lands on the
// margin floor (COGS / (1 - target GM)) whenever that is above the fixed fees.
import { safeDiv } from './safe.js';
import { classFactors } from './workload.js';

export function computePricing(deal, work, cogs, model) {
  const p = deal.pricing;
  const N = deal.rl.cycles;
  const { cycleEngineeringFactor } = classFactors(model.proxyClass);

  const readiness = p.readinessFee;                                               // B91
  const engSetup = p.engineeringSetupFee;                                         // B92
  const cycles = N * p.cycleFee * cycleEngineeringFactor;                         // B93
  const extra = Math.max(0, N - p.includedCycles) * p.extraCycleEngineeringFee;   // B94
  const handoff = p.handoffFee;                                                   // B95
  const discount = -(readiness + engSetup + cycles + extra + handoff) * p.discountPct; // B96
  const itemized = readiness + engSetup + cycles + extra + handoff + discount;    // B97

  const marginFloorPrice = safeDiv(cogs.cogs, Math.max(0.01, 1 - p.targetGrossMargin)); // B98
  // The rate-card quote is always reported, so pages can show it beside any mode.
  const rateCardQuote = itemized + Math.max(0, marginFloorPrice - itemized);

  let lines, adjustment, quote, lineItemized;
  if (p.mode === 'hybrid') {
    const fixed = readiness + engSetup + extra + handoff;
    const derivedCycles = Math.max(0, marginFloorPrice - fixed);
    lines = [
      { key: 'readiness', label: 'Readiness & baseline', value: readiness, unit: 'Once', group: 'Fixed' },
      { key: 'engineering', label: 'Engineering & integration', value: engSetup, unit: 'Fixed engagement', group: 'Fixed' },
      { key: 'cycles', label: 'RL cycles (derived from compute cost)', value: derivedCycles, unit: `${N} cycles, priced to the margin floor`, group: 'Cycles' },
      { key: 'extra', label: 'Extra-cycle engineering', value: extra, unit: 'Cycles above included count', group: 'Cycles' },
      { key: 'handoff', label: 'Independent handoff & verification', value: handoff, unit: 'Once', group: 'Fixed' },
      { key: 'discount', label: 'Negotiated discount', value: 0, unit: 'Not applied in hybrid mode', group: 'Adjustments' },
    ];
    lineItemized = fixed + derivedCycles;
    adjustment = 0;
    quote = lineItemized;
  } else {
    lines = [
      { key: 'readiness', label: 'Readiness & baseline', value: readiness, unit: 'Once', group: 'Fixed' },
      { key: 'engineering', label: 'Engineering & integration', value: engSetup, unit: 'Fixed engagement', group: 'Fixed' },
      { key: 'cycles', label: 'Approved RL cycles', value: cycles, unit: `${N} × cycle fee × class factor`, group: 'Cycles' },
      { key: 'extra', label: 'Extra-cycle engineering', value: extra, unit: 'Cycles above included count', group: 'Cycles' },
      { key: 'handoff', label: 'Independent handoff & verification', value: handoff, unit: 'Once', group: 'Fixed' },
      { key: 'discount', label: 'Negotiated discount', value: discount, unit: 'Once', group: 'Adjustments' },
    ];
    lineItemized = itemized;
    adjustment = p.mode === 'costPlus'
      ? marginFloorPrice - itemized
      : Math.max(0, marginFloorPrice - itemized);                                 // B99
    quote = itemized + adjustment;                                                // B100
  }
  const grossMargin = quote === 0 ? 0 : 1 - cogs.cogs / quote;                    // B101
  const budgetSet = p.budgetCeiling > 0;                                          // 0 = not set by the customer
  const remainingBudget = budgetSet ? p.budgetCeiling - quote : 0;                // B103

  return {
    mode: p.mode,
    lines,
    itemized: lineItemized,
    marginFloorPrice,
    adjustment, quote, grossMargin, remainingBudget,
    rateCardItemized: itemized,
    rateCardQuote,
    budgetCeiling: p.budgetCeiling,
    budgetSet,
    targetGrossMargin: p.targetGrossMargin,
    minGrossMargin: p.minGrossMargin,
    cycleEngineeringFactor,
  };
}
