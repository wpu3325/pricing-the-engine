// Port of '02 Economics Capacity' rows 111–125: optional production inference.
// Separate service order; never part of the training quote.
import { safeDiv } from './safe.js';
import { classFactors } from './workload.js';

export const HOURS_PER_MONTH = 720;

export function computeServing(deal, model, capacity, cogsTotal) {
  const s = deal.serving;
  const k = classFactors(model.proxyClass).throughputFactor;
  const included = s.include;

  const equivTokensPerMonth = s.monthlyInputTokens * deal.demand.inputWorkFactor + s.monthlyOutputTokens; // B111
  const variableGH = (s.throughputPerGpuHour <= 0 || k <= 0) ? 0
    : safeDiv(equivTokensPerMonth, s.throughputPerGpuHour * k);                   // B112
  const floorGH = s.minWarmReplicas * HOURS_PER_MONTH * (s.contract === 'Shared' ? s.sharedShare : 1); // B113
  const provisionedGH = Math.max(variableGH, floorGH);                             // B114
  const vendorCogs = capacity.method === 'BYOC' ? 0 : provisionedGH * deal.capacity.paygoPrice; // B115
  const monthlyCogs = vendorCogs + s.supportPerMonth;                               // B116

  const overage = Math.max(0, s.monthlyInputTokens - s.includedInputTokens) / 1e6 * s.inputOveragePerM
    + Math.max(0, s.monthlyOutputTokens - s.includedOutputTokens) / 1e6 * s.outputOveragePerM;
  const minimum = s.contract === 'Shared'
    ? Math.max(s.sharedMinimumMonthly, overage)
    : Math.max(s.sharedMinimumMonthly, s.minWarmReplicas * s.dedicatedReplicaFee) + overage;
  const invoice = included ? minimum : 0;                                          // B117
  const preAdjustmentGM = invoice === 0 ? 0 : 1 - monthlyCogs / invoice;          // B118

  let sloStatus;
  if (!included) sloStatus = 'NOT SCOPED';
  else if (model.servingStatus !== 'Listed') sloStatus = 'HOLD - SERVING ACCESS';
  else if (!deal.approvals.benchmarkConfirmed) sloStatus = 'HOLD - SERVING BENCHMARK';
  else if (s.peakToAverage > 3) sloStatus = 'BENCHMARK PEAK FIRST';
  else sloStatus = 'BENCHMARK / SLO SIGNOFF';                                       // B119

  const peakVsWarm = floorGH === 0 ? 0 : variableGH * s.peakToAverage / floorGH;   // B120
  let scaleRec;
  if (!included) scaleRec = 'NOT SCOPED';
  else if (peakVsWarm >= 1) scaleRec = 'AMEND CAPACITY / REPLICAS';
  else if (peakVsWarm >= 0.8) scaleRec = 'START SCALE REVIEW';
  else scaleRec = 'WITHIN PLANNING ENVELOPE';                                       // B121

  const targetFloor = included ? safeDiv(monthlyCogs, Math.max(0.01, 1 - deal.pricing.targetGrossMargin)) : 0; // B122
  const uplift = Math.max(0, targetFloor - invoice);                               // B123
  const price = invoice + uplift;                                                  // B124
  const grossMargin = price === 0 ? 0 : 1 - monthlyCogs / price;                   // B125

  return {
    included, equivTokensPerMonth, variableGH, floorGH, provisionedGH, vendorCogs,
    monthlyCogs, overage, minimum, invoice, preAdjustmentGM, sloStatus, peakVsWarm,
    scaleRec, targetFloor, uplift, price, grossMargin,
    cogsTotal,
  };
}
