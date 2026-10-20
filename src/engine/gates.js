// Approval gates, HOLD semantics and the score-log stop rules.
// Missing verification => HOLD, never READY (brief, acceptance test #1).
import { NON_TRAINABLE } from './catalog.js';
import { MAX_WEEKS } from './capacity.js';

export const DATA_ACCESS_OK = ['Customer supplies by kickoff', 'Ready / validated'];

// '01 Deal Setup'!G30
export function modelReadiness(deal, model) {
  const a = deal.approvals;
  if (deal.method !== 'GRPO') return 'HOLD - METHOD RE-SCOPE';
  if (!DATA_ACCESS_OK.includes(a.dataAccess)) return 'HOLD - DATA ACCESS';
  if (model.totalB == null) return 'HOLD - PARAMETERS';
  if (!a.benchmarkConfirmed) return 'HOLD - BENCHMARK';
  if (!a.accessApproved) return 'HOLD - ACCESS';
  if (!a.skuRateConfirmed) return 'HOLD - SKU RATE';
  if (model.gpuRequirement === 'B300' && deal.capacity.gpuSku !== 'B300') return 'HOLD - GPU FAMILY';
  if (NON_TRAINABLE.includes(model.trainingStatus)) return 'HOLD - TRAINING ELIGIBILITY';
  return 'QUALIFIED*';
}

// '01 Deal Setup'!G32
export function modelSuitability(model) {
  if (['Not listed', 'Research only', 'Legacy mention'].includes(model.trainingStatus)) return 'TRAINING NOT CONFIRMED';
  if (model.trainingStatus === 'Family - verify') return 'VARIANT ACCESS CHECK';
  if (model.totalB == null) return 'PARAMETERS NEED VERIFICATION';
  if (model.gpuRequirement === 'Multi-node') return 'MULTI-NODE REVIEW';
  return 'PROVISIONAL ESTIMATE';
}

// Input validation: any failure => HOLD - INPUT (brief, acceptance test #9).
export function inputErrors(deal) {
  const e = [];
  const d = deal.demand, rl = deal.rl, c = deal.capacity;
  if (!(rl.cycles >= 1 && rl.cycles <= MAX_WEEKS)) e.push('Cycles must be between 1 and 52');
  if (!(rl.cadenceWeeks >= 1)) e.push('Cadence must be at least 1 week');
  if (rl.readinessWeeks < 0 || rl.handoffWeeks < 0) e.push('Weeks cannot be negative');
  for (const k of ['policyTokensPerGpuHour', 'rolloutTokensPerGpuHour', 'evalTokensPerGpuHour', 'serving.throughputPerGpuHour']) {
    const v = k.startsWith('serving.') ? deal.serving.throughputPerGpuHour : d[k];
    if (!(v > 0)) e.push(`Throughput (${k}) must be positive`);
  }
  for (const k of ['policyTokensPerCycle', 'rolloutAttemptsPerCycle', 'rolloutInputTokens', 'rolloutOutputTokens', 'evalCasesPerCycle']) {
    if (!(d[k] >= 0)) e.push(`${k} cannot be negative`);
  }
  if (!(c.paygoPrice >= 0 && c.reservePrice >= 0)) e.push('GPU prices cannot be negative');
  if (!(c.hoursPerWeek > 0)) e.push('Hours per week must be positive');
  return e;
}

// '02 Economics Capacity'!B104: the commercial approval status.
export function commercialStatus(deal, { errors, readiness, capacity, pricing, costs }) {
  if (errors.length) return 'HOLD - INPUT';
  if (readiness !== 'QUALIFIED*') return 'HOLD - MODEL';
  if (capacity.verdict !== 'FEASIBLE*') return 'HOLD - CAPACITY';
  if (pricing.budgetSet && pricing.remainingBudget < 0) return 'HOLD - BUDGET';
  if (pricing.mode === 'cogsBuilt') {
    // A package with no cost behind it is a gap in the model, not a free line.
    // Known gap: the handoff must carry the holdout evaluation, or the final evaluation is not costed.
    const packages = pricing.lines.filter((l) => ['readiness', 'cycles', 'handoff'].includes(l.key));
    const missingPackage = packages.some((l) => !(l.cost > 0));
    const holdoutCosted = (costs?.holdoutEval ?? 0) > 0;
    if (missingPackage || !holdoutCosted) return 'HOLD - COST GAP';
    if ((deal.ari?.tokensMPerCycle ?? 0) > 0 && !deal.approvals?.servingThroughputMeasured) return 'HOLD - THROUGHPUT';
  }
  if (pricing.grossMargin < deal.pricing.minGrossMargin) return 'HOLD - MARGIN';
  return 'READY FOR REVIEW';
}

// Score-log rows (workbook rows 37–44, generalised to the cycle cap).
export function scoreLog(deal) {
  const s = deal.rl.scores;
  const N = deal.rl.cycles;
  const rows = [];
  for (let i = 0; i < Math.max(N, s.length); i++) {
    const score = s[i];
    const has = typeof score === 'number' && Number.isFinite(score);
    const prev = i === 0 ? deal.rl.baseline : s[i - 1];
    const gain = has && typeof prev === 'number' ? score - prev : null;
    let status;
    if (!has) status = 'NOT RUN';
    else if (score >= deal.rl.target) status = 'TARGET HIT';
    else if (i + 1 >= N) status = 'BEYOND SCOPE';
    else status = 'CHECK CONTINUE';
    rows.push({ cycle: i + 1, score: has ? score : null, gain, status });
  }
  return rows;
}

// '01 Deal Setup'!G18: suggested stop action. Customer always decides.
export function stopAction(deal) {
  const rl = deal.rl;
  const scored = rl.scores.filter((x) => typeof x === 'number' && Number.isFinite(x));
  const n = scored.length;
  if (rl.decision === 'Stop') return 'STOP - CUSTOMER DECISION';
  if (n === 0) return 'NO RESULTS YET';
  const last = scored[n - 1];
  if (last >= rl.target) return 'REVIEW - TARGET REACHED';
  if (n >= rl.cycles) return 'REVIEW - CYCLE CAP';
  if (n >= rl.slowCycles && rl.slowCycles > 0) {
    const gains = [];
    for (let i = n - rl.slowCycles; i < n; i++) gains.push(scored[i] - (i === 0 ? rl.baseline : scored[i - 1]));
    if (gains.every((g) => g < rl.minGain)) return 'REVIEW - PLATEAU';
  }
  return 'CONTINUE; CUSTOMER APPROVAL';
}
