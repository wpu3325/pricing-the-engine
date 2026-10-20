// Workload profile layer: derives *suggested* workbook inputs from what a customer
// actually has (data type, dataset size, task type, context, target model).
// Suggestions never overwrite the deal; the UI applies them on request.
// Pure functions, no DOM. Values are labelled as proxies (presets JSON).
import { WORKLOAD_PRESETS as presets } from '../data/workload_presets.js';
import { GPU_SKUS as skus } from '../data/gpu_skus.js';
import { NON_TRAINABLE } from './catalog.js';

export const DATA_TYPES = presets.dataTypes;
export const TASK_TYPES = presets.taskTypes;

// Suggested policy-update tokens per cycle = examples x tokens/example x passes.
export function suggestPolicyTokens({ examples, tokensPerExample, passes = 1 }) {
  if (!(examples > 0) || !(tokensPerExample > 0) || !(passes > 0)) return null;
  return examples * tokensPerExample * passes;
}

export function suggestRollout(taskType) {
  const t = TASK_TYPES[taskType];
  if (!t) return null;
  return {
    rolloutAttemptsPerCycle: t.rolloutAttemptsPerCycle,
    rolloutInputTokens: t.rolloutInputTokens,
    rolloutOutputTokens: t.rolloutOutputTokens,
    evalCasesPerCycle: t.evalCasesPerCycle,
  };
}

// Memory footprint (GB) of the target model for training or serving.
export function memoryFootprintGb(model, { training, contextTokens = 8192 }) {
  if (model.totalB == null) return null; // never guess a memory size for unknown params
  const weightsGb = model.totalB * presets.bytesPerParamBf16; // all experts resident for MoE
  const kvGb = Math.max(0, contextTokens) / 8192 * 2; // coarse KV-cache allowance per request, labelled heuristic
  return training ? weightsGb * presets.trainingMemoryMultiplier + kvGb : weightsGb + kvGb;
}

// Smallest SKU whose single node (8 GPUs) can hold the footprint; else multi-node.
export function suggestSku(footprintGb) {
  if (footprintGb == null) return { sku: null, nodes: null, note: 'Not verified: parameters unknown' };
  for (const s of skus.skus) {
    if (footprintGb <= s.hbmGb * s.gpusPerNode) return { sku: s.sku, nodes: 1, note: `fits one ${s.gpusPerNode}-GPU node` };
  }
  const big = skus.skus[skus.skus.length - 1];
  const nodes = Math.ceil(footprintGb / (big.hbmGb * big.gpusPerNode));
  return { sku: big.sku, nodes, note: `needs ${nodes} x ${big.gpusPerNode}-GPU ${big.sku} nodes: multi-node review` };
}

// GPUs per serving replica (warm-floor input). Suggestion only.
export function suggestServingGpusPerReplica(model, sku) {
  const fp = memoryFootprintGb(model, { training: false });
  const s = skus.skus.find((x) => x.sku === sku);
  if (fp == null || !s) return null;
  return Math.max(1, Math.ceil(fp * 1.2 / s.hbmGb));
}

// Ranked model shortlist for a customer's data. Never auto-selects.
export function shortlistModels(catalog, { dataType, contextTokens = 0 }) {
  const want = DATA_TYPES[dataType]?.modality;
  const rows = [];
  for (const m of catalog) {
    const why = [];
    const warn = [];
    let score = 0;
    const isVL = /-VL$/i.test(m.name) || /\bVL\b/i.test(m.name);
    if (want === 'vision') {
      if (isVL) { score += 3; why.push('vision variant'); } else { warn.push('no vision variant confirmed'); }
    } else if (want === 'audio' || want === 'other') {
      warn.push('no listed model for this modality: qualify custom');
    } else if (isVL) {
      score -= 1; warn.push('vision variant for text data');
    } else {
      score += 2; why.push('text modality');
    }
    if (m.trainingStatus === 'Listed') { score += 3; why.push('RL-listed'); }
    else if (m.trainingStatus === 'Family - verify') { score += 1; warn.push('variant access to verify'); }
    else { warn.push(`training: ${m.trainingStatus}`); }
    if (m.servingStatus === 'Listed') { score += 1; why.push('serving-listed'); }
    if (m.totalB == null) { warn.push('parameters not verified'); }
    else if (m.totalB <= 40) { score += 1; why.push('single-node scale'); }
    if (m.gpuRequirement === 'B300') warn.push('B300 hardware review');
    if (m.gpuRequirement === 'Multi-node') warn.push('multi-node');
    if (NON_TRAINABLE.includes(m.trainingStatus) && m.trainingStatus !== 'Family - verify') score -= 2;
    rows.push({ name: m.name, score, why, warn, trainingStatus: m.trainingStatus, totalB: m.totalB, activeB: m.activeB });
  }
  return rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function suggestAll(deal, model) {
  const dt = DATA_TYPES[deal.data.type];
  const policy = suggestPolicyTokens({
    examples: deal.data.examples,
    tokensPerExample: deal.data.tokensPerExample || dt?.tokensPerExample,
    passes: dt?.passesPerCycle ?? 1,
  });
  const rollout = suggestRollout(deal.data.taskType || 'tool-use');
  const trainFp = memoryFootprintGb(model, { training: true, contextTokens: deal.data.contextTokens });
  const trainSku = suggestSku(trainFp);
  const serveSku = suggestSku(memoryFootprintGb(model, { training: false, contextTokens: deal.data.contextTokens }));
  return {
    policyTokensPerCycle: policy,
    rollout,
    trainingFootprintGb: trainFp,
    trainingSku: trainSku,
    servingSku: serveSku,
    servingGpusPerReplica: suggestServingGpusPerReplica(model, serveSku.sku),
    modelMatchesHardware: model.gpuRequirement === 'B300' ? trainSku.sku === 'B300' : true,
    labels: ['UNVERIFIED PROXY'],
  };
}
