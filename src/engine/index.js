// Single entry point. The UI never computes money; it only calls compute().
import { loadCatalog, findModel, customModel } from './catalog.js';
import { computeWorkload } from './workload.js';
import { computeCapacity } from './capacity.js';
import { computeCogs } from './cogs.js';
import { computePricing } from './pricing.js';
import { computeServing } from './serving.js';
import { modelReadiness, modelSuitability, inputErrors, commercialStatus, scoreLog, stopAction } from './gates.js';

export { loadCatalog } from './catalog.js';
export { defaultDeal, SCHEMA_VERSION } from './defaults.js';

export function resolveModel(deal, catalog) {
  if (!deal.model) { const m = customModel('', null, null, 'Unknown'); m.proxyClass = 2; return m; } // standard tier until a model is chosen
  return findModel(catalog, deal.model) || customModel(deal.model, deal.customParams?.totalB, deal.customParams?.activeB, deal.customParams?.architecture);
}

export function compute(deal, catalog = loadCatalog()) {
  const model = resolveModel(deal, catalog);
  const errors = inputErrors(deal);
  const work = computeWorkload(deal, model);
  const capacity = computeCapacity(deal, work, model);
  const cogs = computeCogs(deal, work, capacity);
  const pricing = computePricing(deal, work, cogs, model);
  const serving = computeServing(deal, model, capacity, cogs.cogs);
  const readiness = deal.model ? modelReadiness(deal, model) : 'HOLD - SELECT MODEL';
  const suitability = modelSuitability(model);
  const status = !deal.model ? 'HOLD - SELECT MODEL' : commercialStatus(deal, { errors, readiness, capacity, pricing });
  return {
    model,
    errors,
    work,
    capacity,
    cogs,
    pricing,
    serving,
    gates: {
      readiness,
      suitability,
      status,
      stop: stopAction(deal),
      scores: scoreLog(deal),
    },
    kpis: {
      quote: pricing.quote,
      cogs: cogs.cogs,
      grossMargin: pricing.grossMargin,
      gpuHours: work.totalGpuHours,
      method: capacity.method,
      status,
    },
  };
}
