// Input progress: which key inputs a person has actually set, which still use an
// illustrative default, and which are missing. Pure; no DOM.
import { getPathOn } from './path.js';

// The nine inputs that decide whether the economics mean anything for a real customer.
export const KEY_INPUTS = [
  { path: 'customer.name', label: 'Customer', section: 'customer', blank: (v) => !v },
  { path: 'customer.workflow', label: 'Workflow', section: 'customer', blank: (v) => !v },
  { path: 'data.examples', label: 'Training examples', section: 'customer', blank: (v) => !(v > 0) },
  { path: 'model', label: 'Model', section: 'model', blank: (v) => !v },
  { path: 'rl.cycles', label: 'Approved RL cycles', section: 'rl', blank: (v) => !(v >= 1) },
  { path: 'demand.policyTokensPerGpuHour', label: 'Measured throughput', section: 'demand', blank: () => false },
  { path: 'capacity.pools.0.freeGpus', label: 'Spare GPUs', section: 'capacity', blank: (v) => !(v > 0) },
  { path: 'pricing.budgetCeiling', label: 'Customer budget', section: 'pricing', blank: (v) => !(v > 0) },
  { path: 'pricing.targetGrossMargin', label: 'Target margin', section: 'pricing', blank: () => false },
];

// Which panel metrics each input moves (used to light up the side panel while typing).
export const DRIVES = {
  'customer.workflow': ['status'],
  'customer.name': ['status'],
  'data.examples': ['gpuh', 'cogs', 'quote', 'weeks'],
  'data.type': ['gpuh', 'cogs', 'quote'],
  'data.taskType': ['gpuh', 'cogs', 'quote'],
  model: ['status', 'cogs', 'quote', 'gpuh', 'method'],
  method: ['status'],
  'rl.cycles': ['quote', 'cogs', 'gpuh', 'weeks', 'margin'],
  'rl.cadenceWeeks': ['weeks'],
  'rl.readinessWeeks': ['weeks', 'quote'],
  'rl.handoffWeeks': ['weeks'],
  'demand.policyTokensPerCycle': ['gpuh', 'cogs', 'quote'],
  'demand.rolloutAttemptsPerCycle': ['gpuh', 'cogs', 'quote'],
  'demand.policyTokensPerGpuHour': ['gpuh', 'cogs', 'margin'],
  'demand.rolloutTokensPerGpuHour': ['gpuh', 'cogs', 'margin'],
  'capacity.pools.0.freeGpus': ['method', 'cogs', 'margin'],
  'capacity.acquisition': ['method', 'cogs'],
  'capacity.canObtainExtra': ['method', 'status'],
  'pricing.targetGrossMargin': ['quote', 'margin'],
  'pricing.budgetCeiling': ['status', 'quote'],
  'pricing.discountPct': ['quote', 'margin'],
  'approvals.benchmarkConfirmed': ['status'],
  'approvals.accessApproved': ['status'],
  'approvals.skuRateConfirmed': ['status'],
};

// Any labour, cost-line or extension input moves COGS and margin.
export function drivesOf(path) {
  if (DRIVES[path]) return DRIVES[path];
  if (/^(labor|costs|extras)\./.test(path)) return ['cogs', 'margin', 'quote'];
  if (/^pricing\./.test(path)) return ['quote', 'margin'];
  if (/^serving\./.test(path)) return ['quote'];
  return [];
}

// 'missing' = blank; 'set' = the person entered or confirmed it; 'default' = still the illustrative default.
export function inputStatus(deal, touched, item) {
  const v = getPathOn(deal, item.path);
  if (item.blank(v)) return 'missing';
  return touched.has(item.path) ? 'set' : 'default';
}

export function estimateQuality(deal, touched) {
  const items = KEY_INPUTS.map((item) => ({ ...item, status: inputStatus(deal, touched, item) }));
  return {
    items,
    set: items.filter((i) => i.status === 'set').length,
    defaults: items.filter((i) => i.status === 'default').length,
    missing: items.filter((i) => i.status === 'missing'),
    total: items.length,
  };
}

// Section status for the nav and section headers.
export function sectionStatus(deal, touched, sectionId) {
  const items = KEY_INPUTS.filter((i) => i.section === sectionId).map((i) => inputStatus(deal, touched, i));
  if (items.includes('missing')) return 'needs';
  if (items.includes('default')) return 'defaults';
  if (items.length) return 'done';
  return 'none';
}
