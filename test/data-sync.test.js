// Generated browser modules must match the canonical JSON exactly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_CATALOG } from '../src/data/model_catalog.js';
import { WORKLOAD_PRESETS } from '../src/data/workload_presets.js';
import { GPU_SKUS } from '../src/data/gpu_skus.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

test('generated data modules equal the JSON sources', () => {
  assert.deepEqual(MODEL_CATALOG, read('data/model_catalog.json'));
  assert.deepEqual(WORKLOAD_PRESETS, read('data/workload_presets.json'));
  assert.deepEqual(GPU_SKUS, read('data/gpu_skus.json'));
});
