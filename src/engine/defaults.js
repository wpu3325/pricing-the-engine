// Default deal = the workbook's "Example Enterprise" inputs (01 Deal Setup).
// Every field name maps to a workbook cell; see docs/PARITY.md for the mapping.
export const SCHEMA_VERSION = 1;

export function defaultDeal() {
  return {
    schemaVersion: SCHEMA_VERSION,
    customer: {
      name: 'Example Enterprise',            // B5
      workflow: 'Internal workflow automation', // B6
      region: 'US region TBD',               // B32
    },
    model: 'Qwen3.6-35B-A3B',                // B7
    method: 'GRPO',                          // B9
    data: { type: 'text', examples: 28444, tokensPerExample: 1500, taskType: 'tool-use', contextTokens: 8192 }, // drive suggestions only (profile.js)
    customParams: { totalB: null, activeB: null, architecture: 'Unknown' },
    rl: {
      cycles: 3,                             // B10
      cadenceWeeks: 1,                       // B11
      readinessWeeks: 2,                     // B12
      handoffWeeks: 1,                       // B13
      mode: 'Sequential',                    // B14
      metric: 'Held-out pass rate',          // B15
      baseline: 0.6,                         // B16
      target: 0.8,                           // B17
      minGain: 0.01,                         // B18
      slowCycles: 2,                         // B19
      scores: [],                            // G37:G44 (customer-run held-out scores)
      decision: 'Pending',                   // B21
    },
    demand: {
      policyTokensPerCycle: 42666666.6666667, // B35
      rolloutAttemptsPerCycle: 4000,          // B36
      rolloutInputTokens: 12000,              // B37
      rolloutOutputTokens: 10000,             // B38
      inputWorkFactor: 0.5,                   // B39
      evalCasesPerCycle: 200,                 // B40
      baselineEvalCases: 200,                 // B41
      evalTokensPerCase: 20000,               // B42
      policyTokensPerGpuHour: 100000,         // B43
      rolloutTokensPerGpuHour: 100000,        // B44
      evalTokensPerGpuHour: 100000,           // B45
      policyGpus: 8,                          // B46
      rolloutGpus: 8,                         // B47
      evalGpus: 4,                            // B48
    },
    labor: {
      fdeSetupHours: 40, fdeHoursPerCycle: 40, fdeRate: 180,          // B50:B52
      researchSetupHours: 40, researchHoursPerCycle: 40, researchRate: 200, // B53:B55
      infraSetupHours: 12, infraHoursPerCycle: 16, infraRate: 170,    // B56:B58
      deliverySetupHours: 16, deliveryHoursPerCycle: 8, deliveryRate: 150, // B59:B61
    },
    costs: {
      baselineGraders: 1500,                  // B62
      graderPerCycle: 1500,                   // B63
      storageNetworking: 1500,                // B64
      platformSupport: 4000,                  // B65
      reworkPct: 0.10,                        // B66
    },
    // Additional cost lines that the workbook does not carry. All default to $0,
    // so the default deal reproduces the workbook exactly (see test/parity.test.js).
    extras: {
      devComputeGpuHours: 0, devComputeRate: 0,          // dev and smoke-test GPU time
      rerunReservePct: 0,                                 // re-run reserve, % of GPU cost
      judgeApiPerCycle: 0, toolApiPerCycle: 0, sandboxPerCycle: 0, // per-cycle third-party spend
      humanReviewHours: 0, supportRate: 0,                // reviewer hours; blended non-engineering rate
      dataLabourHours: 0, dataLabellingVendor: 0,         // data preparation
      storageTbMonths: 0, storageRatePerTbMonth: 0, egressTb: 0, egressRatePerTb: 0,
      piiTooling: 0,
      scopingHours: 0, csHours: 0, securityReviewHours: 0, legalHours: 0, verifierHours: 0,
      onCallWeeks: 0, onCallRatePerWeek: 0, trips: 0, tripCost: 0,
      seats: 0, seatCost: 0, softwareLicences: 0, baseModelLicence: 0,
      insurancePct: 0,                                    // insurance, % of direct cost
      holdoutEvalGpuHours: 0,                             // final holdout evaluation (Phase 4)
    },
    scope: {                                              // effort tier inputs (simple | standard | complex)
      integrations: 'standard', dataReadiness: 'standard', graderComplexity: 'standard',
    },
    effort: {
      calibrationFactor: 1,                               // actual / standard hours, from past engagements
    },
    ari: {                                                // Ari agent and platform usage
      tokensMPerCycle: 0,                                 // million agent tokens per RL cycle
      servingTokensPerGpuHour: 1000000,                   // placeholder until measured
      automationPct: 0,                                   // share of human hours Ari replaces
    },
    pricing: {
      mode: 'cogsBuilt',                      // cogsBuilt (usage model, default) | rateCard (workbook reference) | costPlus (MVP extension)
      lineMargins: { package: 0.45, compute: 0.30, software: 0.60 },
      automationShare: 0.5,                   // share of automation savings the customer keeps
      readinessFee: 30000,                    // B68
      engineeringSetupFee: 78000,             // B69
      cycleFee: 24000,                        // B70
      includedCycles: 3,                      // B71
      extraCycleEngineeringFee: 24000,        // B72
      handoffFee: 30000,                      // B73
      discountPct: 0,                         // B75
      targetGrossMargin: 0.45,                // B76
      minGrossMargin: 0.35,                   // B77
      budgetCeiling: 260000,                  // B22
    },
    capacity: {
      targetUtilization: 1,                   // reserved GPU utilization; <1 prices idle hours in
      useExisting: true,                      // B79
      acquisition: 'Auto',                    // B80
      canObtainExtra: false,                  // B81
      gpuSku: 'H100',                         // B103
      paygoPrice: 3.99,                       // B82
      extendPrice: 2.75,                      // B83
      reservePrice: 2.50,                     // B84
      minReservationWeeks: 4,                 // B85
      hoursPerWeek: 168,                      // B86
      allocationRate: 2.50,                   // B87
      opportunityRate: 0,                     // B88
      provisioningFee: 0,                     // B89
      pools: [                                // rows 109:111
        { name: 'Prepaid cluster A', freeGpus: 8, startWeek: 1, expiryWeek: 8, fit: 'Compatible', sku: 'H100', comment: 'Already paid; check topology' },
        { name: 'Other pool B', freeGpus: 0, startWeek: 3, expiryWeek: 5, fit: 'Compatible', sku: 'H100', comment: 'Optional second tranche' },
        { name: 'Other pool C', freeGpus: 0, startWeek: 5, expiryWeek: 8, fit: 'Compatible', sku: 'H100', comment: 'Optional third tranche' },
      ],
    },
    approvals: {
      benchmarkConfirmed: false,              // B101
      accessApproved: false,                  // B102
      skuRateConfirmed: false,                // B104
      dataAccess: 'Customer supplies by kickoff', // B33
      servingThroughputMeasured: false,       // gates token pricing until throughput is measured
    },
    serving: {
      include: false,                         // B23
      contract: 'Dedicated',                  // B24
      monthlyInputTokens: 20000000,           // B25
      monthlyOutputTokens: 10000000,          // B26
      peakToAverage: 3,                       // B27
      minWarmReplicas: 2,                     // B28
      availabilityTarget: 0.999,              // B29
      sharedMinimumMonthly: 15000,            // B91
      dedicatedReplicaFee: 6000,              // B92
      inputOveragePerM: 1.2,                  // B93
      outputOveragePerM: 4.5,                 // B94
      includedInputTokens: 20000000,          // B95
      includedOutputTokens: 10000000,         // B96
      supportPerMonth: 2500,                  // B97
      throughputPerGpuHour: 100000,           // B98
      sharedShare: 0.35,                      // B99
    },
  };
}
