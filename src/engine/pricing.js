// Port of '02 Economics Capacity' rows 91–103 plus the cost-plus alternative.
// Rate-card mode (workbook default): quote = itemized fees, raised to the margin
// floor if needed (the raise is a *proposed* adjustment, never auto-billed).
// Cost-plus mode (MVP extension): quote = COGS / (1 - target GM).
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
  const adjustment = p.mode === 'costPlus'
    ? marginFloorPrice - itemized
    : Math.max(0, marginFloorPrice - itemized);                                   // B99
  const quote = itemized + adjustment;                                            // B100
  const grossMargin = quote === 0 ? 0 : 1 - cogs.cogs / quote;                    // B101
  const budgetSet = p.budgetCeiling > 0;                                          // 0 = not set by the customer
  const remainingBudget = budgetSet ? p.budgetCeiling - quote : 0;                // B103

  return {
    mode: p.mode,
    lines: [
      { key: 'readiness', label: 'Readiness & baseline', value: readiness, unit: 'Once', group: 'Fixed' },
      { key: 'engineering', label: 'Engineering & integration', value: engSetup, unit: 'Fixed engagement', group: 'Fixed' },
      { key: 'cycles', label: 'Approved RL cycles', value: cycles, unit: `${N} × cycle fee × class factor`, group: 'Cycles' },
      { key: 'extra', label: 'Extra-cycle engineering', value: extra, unit: 'Cycles above included count', group: 'Cycles' },
      { key: 'handoff', label: 'Independent handoff & verification', value: handoff, unit: 'Once', group: 'Fixed' },
      { key: 'discount', label: 'Negotiated discount', value: discount, unit: 'Once', group: 'Adjustments' },
    ],
    itemized,
    marginFloorPrice,
    adjustment, quote, grossMargin, remainingBudget,
    budgetCeiling: p.budgetCeiling,
    budgetSet,
    targetGrossMargin: p.targetGrossMargin,
    minGrossMargin: p.minGrossMargin,
    cycleEngineeringFactor,
  };
}
