// Port of '02 Economics Capacity' rows 5–28: demand -> equivalent work -> GPU-hours.
// Workbook cell refs are noted inline. Behaviour is identical to the workbook for
// valid inputs; invalid throughput (<=0) yields 0 GPU-hours, matching IF(x<=0,0,…).
import { safeDiv, finite } from './safe.js';

// Workbook G31 proxy class: 1 = small, 2 = standard, 3 = large / MoE.
export function classFactors(proxyClass) {
  const c = Number(proxyClass);
  return {
    throughputFactor: c === 1 ? 2.5 : c === 2 ? 1 : 0.5,      // B6
    gpuScale: c === 1 ? 0.5 : c === 2 ? 1 : 2,                 // B7:B9 multiplier
    cycleEngineeringFactor: c === 1 ? 0.65 : c === 2 ? 1 : 2.5, // pricing B93
  };
}

export function computeWorkload(deal, model) {
  const d = deal.demand;
  const rl = deal.rl;
  const f = classFactors(model.proxyClass);
  const k = f.throughputFactor;
  const N = rl.cycles; // B10

  const gpu = (n) => Math.max(1, Math.round(finite(n) * f.gpuScale)); // ROUND(... ,0) with floor of 1
  const trainerGpus = gpu(d.policyGpus);   // B7
  const rolloutGpus = gpu(d.rolloutGpus);  // B8
  const evalGpus = gpu(d.evalGpus);        // B9

  const policyTokens = d.policyTokensPerCycle * N;                       // B13
  const rolloutAttempts = d.rolloutAttemptsPerCycle * N;                 // B14
  const rolloutEquivTokens = rolloutAttempts *                            // B15
    (d.rolloutInputTokens * d.inputWorkFactor + d.rolloutOutputTokens);
  const evalCases = d.baselineEvalCases + N * d.evalCasesPerCycle;        // B16
  const evalEquivTokens = evalCases * d.evalTokensPerCase;                // B17

  const policyGpuHours = d.policyTokensPerGpuHour <= 0 ? 0 : safeDiv(policyTokens, d.policyTokensPerGpuHour * k); // B18
  const rolloutGpuHours = d.rolloutTokensPerGpuHour <= 0 ? 0 : safeDiv(rolloutEquivTokens, d.rolloutTokensPerGpuHour * k); // B19
  const evalGpuHours = d.evalTokensPerGpuHour <= 0 ? 0 : safeDiv(evalEquivTokens, d.evalTokensPerGpuHour * k); // B20
  const totalGpuHours = policyGpuHours + rolloutGpuHours + evalGpuHours; // B21

  const trainerGpuHoursPerCycle = N === 0 ? 0 : safeDiv(policyGpuHours, N);   // B22
  const rolloutGpuHoursPerCycle = N === 0 ? 0 : safeDiv(rolloutGpuHours, N);  // B23
  const evalGpuHoursPerCycle = d.evalTokensPerGpuHour <= 0 ? 0
    : safeDiv(d.evalCasesPerCycle * d.evalTokensPerCase, d.evalTokensPerGpuHour * k); // B24
  const baselineEvalGpuHours = d.evalTokensPerGpuHour <= 0 ? 0
    : safeDiv(d.baselineEvalCases * d.evalTokensPerCase, d.evalTokensPerGpuHour * k); // B25

  const concurrent = rl.mode === 'Concurrent';
  const peakGpus = concurrent ? trainerGpus + rolloutGpus : Math.max(trainerGpus, rolloutGpus); // B26
  const wallHoursPerCycle = (concurrent
      ? Math.max(safeDiv(trainerGpuHoursPerCycle, trainerGpus), safeDiv(rolloutGpuHoursPerCycle, rolloutGpus))
      : safeDiv(trainerGpuHoursPerCycle, trainerGpus) + safeDiv(rolloutGpuHoursPerCycle, rolloutGpus))
    + safeDiv(evalGpuHoursPerCycle, evalGpus); // B27
  const totalWeeks = rl.readinessWeeks + N * rl.cadenceWeeks + rl.handoffWeeks; // B28

  return {
    factors: f,
    trainerGpus, rolloutGpus, evalGpus,
    policyTokens, rolloutAttempts, rolloutEquivTokens, evalCases, evalEquivTokens,
    policyGpuHours, rolloutGpuHours, evalGpuHours, totalGpuHours,
    trainerGpuHoursPerCycle, rolloutGpuHoursPerCycle, evalGpuHoursPerCycle, baselineEvalGpuHours,
    peakGpus, wallHoursPerCycle, totalWeeks,
    concurrent,
  };
}
