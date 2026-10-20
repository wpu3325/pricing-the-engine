// Port of '01 Deal Setup' rows 107–111 and '02 Economics Capacity' rows 30–70:
// week-by-week GPU need vs compatible existing pools, then PayGo vs Extend vs
// Reserve economics. Workbook grid is fixed at 16 weeks; here the horizon grows
// with the calendar (capped at MAX_WEEKS) and results are identical for <=16.
export const MIN_WEEKS = 16;
export const MAX_WEEKS = 52;

export function poolCoversWeek(pool, week, sku) {
  return pool.fit === 'Compatible' && pool.sku === sku &&
    week >= pool.startWeek && week <= pool.expiryWeek;
}

export function computeCapacity(deal, work, model) {
  const c = deal.capacity;
  const N = deal.rl.cycles;
  const cadence = Math.max(1, deal.rl.cadenceWeeks);
  const ready = deal.rl.readinessWeeks;
  const horizon = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.ceil(work.totalWeeks)));
  const acq = c.acquisition;
  const hoursPerWeek = c.hoursPerWeek;
  const trainerGH = work.trainerGpuHoursPerCycle;
  const rolloutGH = work.rolloutGpuHoursPerCycle;
  const evalPerCycleGH = work.evalGpuHoursPerCycle;
  const baselineEvalGH = work.baselineEvalGpuHours;
  const { trainerGpus, rolloutGpus, evalGpus, peakGpus, concurrent } = work;

  const weeks = [];
  for (let w = 1; w <= horizon; w++) {
    const rl = (w > ready && w <= ready + N * cadence && ((w - ready - 1) % cadence) === 0) ? 1 : 0;
    const policy = rl * trainerGH;
    const rollout = rl * rolloutGH;
    const evalGH = (w === ready ? baselineEvalGH : 0) + (rl ? evalPerCycleGH : 0);
    const total = policy + rollout + evalGH;
    const peak = rl ? Math.max(peakGpus, evalGpus) : (evalGH > 0 ? evalGpus : 0);

    let existing = 0;
    if (deal.capacity.useExisting) {
      for (const p of c.pools) if (poolCoversWeek(p, w, c.gpuSku)) existing += p.freeGpus;
    }
    const need = Math.max(0, peak - existing);

    let newGH = 0;
    if (rl) {
      newGH += concurrent
        ? Math.max(0, rolloutGpus - existing) * rolloutGH / rolloutGpus
          + Math.max(0, trainerGpus - Math.max(0, existing - rolloutGpus)) * trainerGH / trainerGpus
        : Math.max(0, peak - existing) * (policy + rollout) / Math.max(1, peak);
    }
    if (evalGH > 0) newGH += Math.max(0, evalGpus - existing) * evalGH / evalGpus;
    const existingGH = acq === 'BYOC' ? 0 : total - newGH;
    const weekCostExtend = need * hoursPerWeek * c.extendPrice;

    let status;
    if (need > 0 && (acq === 'Existing only' || !c.canObtainExtra)) status = 'UNFUNDED';
    else if (rl && work.wallHoursPerCycle > hoursPerWeek) status = 'SLOW CYCLE';
    else if (total === 0) status = '-';
    else status = 'PLANNED';

    weeks.push({ week: w, rl, policy, rollout, eval: evalGH, total, peak, existing, need,
      newGH, existingGH, weekCostExtend, status });
  }

  const short = weeks.filter((x) => x.need > 0);
  const weeksNeeding = short.length;
  const firstShort = weeksNeeding ? Math.min(...short.map((x) => x.week)) : 0;
  const lastShort = weeksNeeding ? Math.max(...short.map((x) => x.week)) : 0;
  const peakAdditional = weeks.reduce((m, x) => Math.max(m, x.need), 0);
  const newWorkloadGH = weeks.reduce((s, x) => s + x.newGH, 0);
  const existingAssignedGH = weeks.reduce((s, x) => s + x.existingGH, 0);
  const provision = peakAdditional > 0 ? c.provisioningFee : 0;
  const reservedWeeks = weeksNeeding ? Math.max(c.minReservationWeeks, lastShort - firstShort + 1) : 0;

  const paygoCost = newWorkloadGH * c.paygoPrice + provision;                       // B58
  const extendCost = weeks.reduce((s, x) => s + x.weekCostExtend, 0) + provision;   // B59
  const reserveCost = peakAdditional * reservedWeeks * hoursPerWeek * c.reservePrice + provision; // B60
  const cheapest = Math.min(paygoCost, extendCost, reserveCost);                    // B61

  let method;
  if (acq === 'BYOC') method = 'BYOC';
  else if (peakAdditional === 0) method = 'Existing';
  else if (acq === 'Auto') method = paygoCost <= Math.min(extendCost, reserveCost) ? 'PayGo'
    : extendCost <= reserveCost ? 'Extend' : 'Reserve';
  else method = acq;                                                                 // B62

  const cash = (method === 'BYOC' || method === 'Existing only') ? 0
    : method === 'PayGo' ? paygoCost : method === 'Extend' ? extendCost : reserveCost; // B63

  let gpuHoursPaid;
  if (method === 'Extend') gpuHoursPaid = weeks.reduce((s, x) => s + x.need, 0) * hoursPerWeek;
  else if (method === 'Reserve') gpuHoursPaid = peakAdditional * reservedWeeks * hoursPerWeek;
  else if (method === 'PayGo') gpuHoursPaid = newWorkloadGH;
  else gpuHoursPaid = 0;                                                             // B64
  const unusedCommitHours = Math.max(0, gpuHoursPaid - newWorkloadGH);               // B65

  const allocated = method === 'BYOC' ? 0 : existingAssignedGH * c.allocationRate;   // B66
  const opportunity = method === 'BYOC' ? 0 : existingAssignedGH * c.opportunityRate; // B68
  const decisionCost = cash + opportunity;                                           // B69

  const unfunded = weeks.some((x) => x.status === 'UNFUNDED');
  let verdict;
  if (model.gpuRequirement === 'B300' && c.gpuSku !== 'B300') verdict = 'HARDWARE MISMATCH';
  else if (work.totalWeeks > MAX_WEEKS) verdict = 'EXTEND CALENDAR';
  else if (work.wallHoursPerCycle > hoursPerWeek) verdict = 'SCHEDULE RISK';
  else if (unfunded) verdict = 'UNFUNDED CAPACITY';
  else verdict = 'FEASIBLE*';                                                        // B70

  return {
    weeks, horizon,
    weeksNeeding, firstShort, lastShort, peakAdditional, newWorkloadGH, existingAssignedGH,
    paygoCost, extendCost, reserveCost, cheapest, reservedWeeks,
    method, cash, gpuHoursPaid, unusedCommitHours, allocated, opportunity, decisionCost,
    verdict,
  };
}
