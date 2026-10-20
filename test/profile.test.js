// Workload-profile properties: monotonicity, modality routing, unknown-params safety.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/engine/catalog.js';
import { suggestPolicyTokens, memoryFootprintGb, suggestSku, shortlistModels, suggestAll } from '../src/engine/profile.js';
import { defaultDeal } from '../src/engine/defaults.js';
import { findModel } from '../src/engine/catalog.js';

const catalog = loadCatalog();

test('more examples or tokens per example never reduce suggested policy tokens', () => {
  const a = suggestPolicyTokens({ examples: 1000, tokensPerExample: 1500 });
  const b = suggestPolicyTokens({ examples: 2000, tokensPerExample: 1500 });
  const c = suggestPolicyTokens({ examples: 2000, tokensPerExample: 3000 });
  assert.ok(b > a && c > b);
});

test('no dataset means no suggestion (never a fabricated number)', () => {
  assert.equal(suggestPolicyTokens({ examples: 0, tokensPerExample: 1500 }), null);
  assert.equal(suggestPolicyTokens({ examples: 10, tokensPerExample: -1 }), null);
});

test('larger models need at least as much memory; unknown params never get a number', () => {
  const small = findModel(catalog, 'Qwen3.5-4B');
  const big = findModel(catalog, 'Qwen3.8-27B');
  assert.ok(memoryFootprintGb(big, { training: true }) > memoryFootprintGb(small, { training: true }));
  assert.equal(memoryFootprintGb(findModel(catalog, 'GLM-5.3-Flash'), { training: true }), null);
});

test('vision data routes to vision variants first; audio has no listed model', () => {
  const vision = shortlistModels(catalog, { dataType: 'vision' });
  assert.match(vision[0].name, /VL/);
  const audio = shortlistModels(catalog, { dataType: 'audio' });
  assert.ok(audio.every((r) => r.warn.some((w) => /qualify custom|no listed/.test(w)) || !r.why.includes('text modality')));
});

test('suggestSku picks the smallest single-node SKU that fits, else flags multi-node', () => {
  assert.equal(suggestSku(100).sku, 'H100');
  assert.equal(suggestSku(500).sku, 'H100'); // 8 x 80 GB = 640 GB
  assert.equal(suggestSku(700).sku, 'B200'); // 8 x 180 GB = 1440 GB
  assert.equal(suggestSku(1500).sku, 'B300'); // 8 x 288 GB = 2304 GB
  assert.match(suggestSku(5000).note, /multi-node/);
  assert.equal(suggestSku(null).sku, null);
});

test('suggestAll produces labelled proxy values for the default deal', () => {
  const deal = defaultDeal();
  deal.data.examples = 1000;
  const s = suggestAll(deal, findModel(catalog, 'Qwen3.6-35B-A3B'));
  assert.equal(s.policyTokensPerCycle, 1000 * 1500);
  assert.ok(s.labels.includes('UNVERIFIED PROXY'));
});
