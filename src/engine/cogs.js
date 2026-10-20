// Port of '02 Economics Capacity' rows 72–85: fully loaded delivery COGS.
export function computeCogs(deal, work, capacity) {
  const L = deal.labor;
  const N = deal.rl.cycles;
  const costs = deal.costs;

  const fde = (L.fdeSetupHours + N * L.fdeHoursPerCycle) * L.fdeRate;              // B73
  const research = (L.researchSetupHours + N * L.researchHoursPerCycle) * L.researchRate; // B74
  const infra = (L.infraSetupHours + N * L.infraHoursPerCycle) * L.infraRate;      // B75
  const delivery = (L.deliverySetupHours + N * L.deliveryHoursPerCycle) * L.deliveryRate; // B76
  const engineering = fde + research + infra + delivery;                           // B77

  const graders = costs.baselineGraders + costs.graderPerCycle * N;                // B78
  const storage = costs.storageNetworking;                                         // B79
  const platform = costs.platformSupport;                                          // B80
  const gpu = capacity.allocated + capacity.cash;                                  // B81
  const baseCost = engineering + graders + storage + platform + gpu;               // B82
  const rework = baseCost * costs.reworkPct;                                       // B83
  const cogs = baseCost + rework;                                                  // B84
  const cogsPlusOpportunity = cogs + capacity.opportunity;                         // B85

  return {
    lines: [
      { key: 'fde', label: 'Forward-deployed engineering', value: fde, group: 'Engineering' },
      { key: 'research', label: 'ML research engineering', value: research, group: 'Engineering' },
      { key: 'infra', label: 'Infrastructure engineering', value: infra, group: 'Engineering' },
      { key: 'delivery', label: 'Delivery coordination', value: delivery, group: 'Engineering' },
      { key: 'graders', label: 'Graders, sandboxes & external APIs', value: graders, group: 'Evaluation' },
      { key: 'storage', label: 'Storage & networking', value: storage, group: 'Platform' },
      { key: 'platform', label: 'Direct platform support', value: platform, group: 'Platform' },
      { key: 'gpu', label: 'GPU COGS (allocated + new cash)', value: gpu, group: 'GPU' },
    ],
    engineering, graders, storage, platform, gpu, baseCost, rework, cogs, cogsPlusOpportunity,
    // Internal only: never shown in customer documents.
    internal: true,
  };
}
