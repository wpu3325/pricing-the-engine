// Starter scenarios so the tool is useful for any enterprise on first load.
// Each is a patch on the default deal; none is hard-wired into the engine.
import { defaultDeal } from './engine/defaults.js';
import { setPathOn } from './path.js';

// A real, empty deal: nothing about the customer is invented. Assumptions (rates,
// prices, policy) keep their illustrative defaults and are marked as such in the UI.
export function newDeal() {
  const d = defaultDeal();
  d.customer = { name: '', workflow: '', region: '' };
  d.model = '';
  d.data.examples = 0;
  d.demand.policyTokensPerCycle = 0;
  d.demand.rolloutAttemptsPerCycle = 0;
  d.pricing.budgetCeiling = 0;
  d.capacity.pools[0].freeGpus = 0;
  d.rl.scores = [];
  return d;
}

export const STARTERS = [
  { id: 'workflow', name: 'Workflow automation', model: 'Qwen3.6-35B-A3B', blurb: 'Text workflow, multi-turn tool use, 3 cycles. Default example.',
    patch: {} },
  { id: 'code-agent', name: 'Code agent', model: 'Qwen3.8-27B', blurb: 'Code data, long-horizon sandbox rollouts, 4 cycles.',
    patch: { model: 'Qwen3.8-27B', 'data.type': 'code', 'data.taskType': 'agent-sandbox', 'data.examples': 40000, 'data.tokensPerExample': 3000, 'rl.cycles': 4 } },
  { id: 'vision', name: 'Document vision', model: 'Qwen3.6-35B-A3B-VL', blurb: 'Image/document extraction on B200 with a purchased reservation.',
    patch: { model: 'Qwen3.6-35B-A3B-VL', 'data.type': 'vision', 'data.taskType': 'rubric-judge', 'data.examples': 25000, 'data.tokensPerExample': 1200,
      'capacity.gpuSku': 'B200', 'capacity.canObtainExtra': true, 'capacity.pools.0.freeGpus': 0, 'capacity.acquisition': 'Auto' } },
  { id: 'frontier', name: 'Frontier MoE (B300)', model: 'Kimi K3', blurb: 'Large MoE: requires B300 review. Shows the hardware gate.',
    patch: { model: 'Kimi K3', 'capacity.gpuSku': 'B300', 'capacity.canObtainExtra': true, 'capacity.pools.0.freeGpus': 0, 'rl.cycles': 3 } },
];

export function starterDeal(id) {
  if (id === 'blank') return newDeal();
  const s = STARTERS.find((x) => x.id === id) || STARTERS[0];
  const d = defaultDeal();
  for (const [k, v] of Object.entries(s.patch)) setPathOn(d, k, v);
  return d;
}
