import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeHash, decodeHash, parseDeal } from '../src/store.js';
import { starterDeal, STARTERS } from '../src/presets.js';
import { compute } from '../src/engine/index.js';
import { loadCatalog } from '../src/engine/catalog.js';

const catalog = loadCatalog();

test('share link round-trips a deal exactly (unicode included)', () => {
  const d = starterDeal('vision');
  d.customer.name = 'Café Déjà Vu ✓';
  assert.deepEqual(decodeHash(encodeHash(d)), d);
});

test('partial files fill from defaults; newer schema is rejected', () => {
  const d = parseDeal({ format: 'pricing-the-engine/deal', schemaVersion: 1, deal: { customer: { name: 'Acme' } } });
  assert.equal(d.customer.name, 'Acme');
  assert.equal(d.rl.cycles, 3);
  assert.throws(() => parseDeal({ schemaVersion: 99, customer: {} }), /newer version/);
  assert.throws(() => parseDeal('"not an object"'), /Not a deal file/);
});

test('every starter scenario computes to finite numbers and a defined status', () => {
  for (const s of STARTERS) {
    const r = compute(starterDeal(s.id), catalog);
    assert.ok(Number.isFinite(r.pricing.quote) && r.pricing.quote > 0, s.id);
    assert.ok(r.gates.status.startsWith('HOLD') || r.gates.status === 'READY FOR REVIEW', s.id);
    assert.notEqual(r.gates.status, 'READY FOR REVIEW', `${s.id} must not be pre-approved`);
  }
});
