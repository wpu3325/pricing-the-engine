// Fully loaded delivery COGS as a ledger.
// Core lines reproduce workbook sheet 02 rows 73–85 exactly (parity tests).
// Extension lines (deal.extras, default $0) add the other costs a post-training
// engagement really carries. Every line is tagged to a delivery phase so the
// price and the cost can be compared phase by phase.
import { safeDiv } from './safe.js';

export const PHASES = ['Foundation', 'Engineering', 'Cycles', 'Handoff', 'Shared'];
const pos = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

// Extension definitions: value is computed from deal.extras and the loop size.
function extensionLines(X, N, gpuCost) {
  const rate = X.supportRate;
  const list = [
    ['dev', 'Dev and smoke-test GPU time', 'Compute and capacity', 'Foundation', X.devComputeGpuHours * X.devComputeRate],
    ['rerun', 'Re-run reserve for failed or pre-empted jobs', 'Compute and capacity', 'Cycles', pos(X.rerunReservePct) * gpuCost],
    ['judge', 'External judge / LLM-grader API spend', 'Evaluation and environments', 'Cycles', N * X.judgeApiPerCycle],
    ['tools', 'Third-party tool and data API spend', 'Evaluation and environments', 'Cycles', N * X.toolApiPerCycle],
    ['sandbox', 'Sandbox and environment CPU compute', 'Evaluation and environments', 'Cycles', N * X.sandboxPerCycle],
    ['review', 'Human quality review (Applied Compute reviewers)', 'Evaluation and environments', 'Cycles', X.humanReviewHours * rate],
    ['dataLabour', 'Data ingestion and cleaning labour', 'Data and storage', 'Foundation', X.dataLabourHours * rate],
    ['labelling', 'Data labelling vendor spend', 'Data and storage', 'Foundation', X.dataLabellingVendor],
    ['storage', 'Object storage for data and checkpoints', 'Data and storage', 'Shared', X.storageTbMonths * X.storageRatePerTbMonth],
    ['egress', 'Network egress', 'Data and storage', 'Shared', X.egressTb * X.egressRatePerTb],
    ['pii', 'PII redaction and security tooling', 'Data and storage', 'Foundation', X.piiTooling],
    ['scoping', 'Pre-sales scoping engineering', 'People and overhead', 'Foundation', X.scopingHours * rate],
    ['cs', 'Customer success and executive sponsorship', 'People and overhead', 'Shared', X.csHours * rate],
    ['security', 'Security and compliance review', 'People and overhead', 'Foundation', X.securityReviewHours * rate],
    ['legal', 'Legal and contracting', 'People and overhead', 'Shared', X.legalHours * rate],
    ['verifier', 'Independent verification reviewer (Phase 4)', 'People and overhead', 'Handoff', X.verifierHours * rate],
    ['oncall', 'On-call and operations cover', 'Platform and tools', 'Shared', X.onCallWeeks * X.onCallRatePerWeek],
    ['travel', 'Travel and on-site trips', 'Platform and tools', 'Shared', X.trips * X.tripCost],
    ['seats', 'Observability and experiment-tracking seats', 'Platform and tools', 'Shared', X.seats * X.seatCost],
    ['licences', 'Third-party software licences', 'Platform and tools', 'Shared', X.softwareLicences],
    ['baseLicence', 'Base-model commercial licence', 'Platform and tools', 'Foundation', X.baseModelLicence],
  ];
  return list.map(([id, label, group, phase, value]) => ({ id, label, group, phase, value: pos(value), source: 'extension' }));
}

export function computeCogs(deal, work, capacity) {
  const L = deal.labor, C = deal.costs, X = deal.extras, N = deal.rl.cycles;
  const gpu = capacity.allocated + capacity.cash;          // B81 (unchanged)
  const gh = work.totalGpuHours;
  const sh = (x) => safeDiv(x, gh);

  // ---- core ledger (workbook parity) ----
  const core = [
    { id: 'gpuPolicy', label: 'Policy-update GPUs (training)', group: 'Compute and capacity', phase: 'Cycles', value: gpu * sh(work.policyGpuHours), source: 'workbook' },
    { id: 'gpuRollout', label: 'Rollout GPUs (trajectory generation)', group: 'Compute and capacity', phase: 'Cycles', value: gpu * sh(work.rolloutGpuHours), source: 'workbook' },
    { id: 'gpuEval', label: 'Evaluation GPUs, per cycle', group: 'Compute and capacity', phase: 'Cycles', value: gpu * sh(work.evalGpuHours - work.baselineEvalGpuHours), source: 'workbook' },
    { id: 'gpuBaseline', label: 'Baseline evaluation GPUs', group: 'Compute and capacity', phase: 'Foundation', value: gpu * sh(work.baselineEvalGpuHours), source: 'workbook' },
    { id: 'fdeSetup', label: 'Forward-deployed engineering: setup', group: 'People and overhead', phase: 'Foundation', value: L.fdeSetupHours * L.fdeRate, source: 'workbook' },
    { id: 'fdeCycles', label: 'Forward-deployed engineering: per cycle', group: 'People and overhead', phase: 'Engineering', value: N * L.fdeHoursPerCycle * L.fdeRate, source: 'workbook' },
    { id: 'researchSetup', label: 'ML research engineering: setup', group: 'People and overhead', phase: 'Foundation', value: L.researchSetupHours * L.researchRate, source: 'workbook' },
    { id: 'researchCycles', label: 'ML research engineering: per cycle', group: 'People and overhead', phase: 'Engineering', value: N * L.researchHoursPerCycle * L.researchRate, source: 'workbook' },
    { id: 'infraSetup', label: 'Infrastructure engineering: setup', group: 'People and overhead', phase: 'Foundation', value: L.infraSetupHours * L.infraRate, source: 'workbook' },
    { id: 'infraCycles', label: 'Infrastructure engineering: per cycle', group: 'People and overhead', phase: 'Engineering', value: N * L.infraHoursPerCycle * L.infraRate, source: 'workbook' },
    { id: 'deliverySetup', label: 'Delivery coordination: setup', group: 'People and overhead', phase: 'Foundation', value: L.deliverySetupHours * L.deliveryRate, source: 'workbook' },
    { id: 'deliveryCycles', label: 'Delivery coordination: per cycle', group: 'People and overhead', phase: 'Engineering', value: N * L.deliveryHoursPerCycle * L.deliveryRate, source: 'workbook' },
    { id: 'gradersBaseline', label: 'Baseline graders and environments', group: 'Evaluation and environments', phase: 'Foundation', value: C.baselineGraders, source: 'workbook' },
    { id: 'gradersCycles', label: 'Graders and environments per cycle', group: 'Evaluation and environments', phase: 'Cycles', value: N * C.graderPerCycle, source: 'workbook' },
    { id: 'storageNetworking', label: 'Storage and networking', group: 'Data and storage', phase: 'Shared', value: C.storageNetworking, source: 'workbook' },
    { id: 'platform', label: 'Direct platform support', group: 'Platform and tools', phase: 'Shared', value: C.platformSupport, source: 'workbook' },
  ];
  const coreTotal = core.reduce((s, l) => s + l.value, 0);

  // ---- extension ledger ----
  const ext = extensionLines(X, N, gpu);
  const extSum = ext.reduce((s, l) => s + l.value, 0);
  const insurance = pos(X.insurancePct) * (coreTotal + extSum);
  ext.push({ id: 'insurance', label: 'Insurance allocation (% of direct cost)', group: 'Risk', phase: 'Shared', value: insurance, source: 'extension' });
  const extendedTotal = extSum + insurance;

  const baseCost = coreTotal + extendedTotal;             // parity: equals workbook B82 when extras are $0
  const rework = baseCost * C.reworkPct;                  // B83
  const cogs = baseCost + rework;                         // B84
  const cogsPlusOpportunity = cogs + capacity.opportunity; // B85
  const reworkLine = { id: 'rework', label: 'Expected rework allowance', group: 'Risk', phase: 'Shared', value: rework, source: 'workbook' };
  const ledger = [...core, ...ext, reworkLine];

  const phaseTotals = Object.fromEntries(PHASES.map((p) => [p, 0]));
  for (const l of ledger) phaseTotals[l.phase] += l.value;

  const engineering = core.filter((l) => /^(fde|research|infra|delivery)/.test(l.id)).reduce((s, l) => s + l.value, 0);
  const graders = core.filter((l) => /^graders/.test(l.id)).reduce((s, l) => s + l.value, 0);
  const storage = C.storageNetworking;
  const platform = C.platformSupport;
  const gpuCore = core.filter((l) => /^gpu/.test(l.id)).reduce((s, l) => s + l.value, 0);

  return {
    // The eight workbook buckets, unchanged (parity mapping uses these).
    lines: [
      { key: 'fde', label: 'Forward-deployed engineering', value: core[4].value + core[5].value, group: 'Engineering' },
      { key: 'research', label: 'ML research engineering', value: core[6].value + core[7].value, group: 'Engineering' },
      { key: 'infra', label: 'Infrastructure engineering', value: core[8].value + core[9].value, group: 'Engineering' },
      { key: 'delivery', label: 'Delivery coordination', value: core[10].value + core[11].value, group: 'Engineering' },
      { key: 'graders', label: 'Graders, sandboxes & external APIs', value: graders, group: 'Evaluation' },
      { key: 'storage', label: 'Storage & networking', value: storage, group: 'Platform' },
      { key: 'platform', label: 'Direct platform support', value: platform, group: 'Platform' },
      { key: 'gpu', label: 'GPU COGS (allocated + new cash)', value: gpu, group: 'GPU' },
    ],
    engineering, graders, storage, platform, gpu, gpuCore,
    coreTotal, extendedTotal, baseCost, rework, cogs, cogsPlusOpportunity,
    ledger, phaseTotals,
    internal: true,
  };
}
