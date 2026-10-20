// One command for the whole automated gate: unit + parity + acceptance + fuzz,
// then a data-sync check and a syntax check of every browser module.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) { console.error(`✖ ${cmd} ${args.join(' ')} failed`); process.exit(r.status ?? 1); }
};

const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.js') ? [join(d, e.name)] : []);

run('node', ['--test', 'test/parity.test.js', 'test/acceptance.test.js', 'test/documents.test.js',
  'test/sensitivity.test.js', 'test/profile.test.js', 'test/explain.test.js', 'test/invariants.test.js',
  'test/store.test.js', 'test/data-sync.test.js']);
for (const f of [...walk('src'), 'scripts/sync_data.mjs']) run('node', ['--check', join(root, f)]);
const forbidden = ['with { type: \'json\' }'];
for (const f of walk('src')) {
  const s = readFileSync(join(root, f), 'utf8');
  for (const bad of forbidden) if (s.includes(bad)) { console.error(`✖ ${f} uses JSON import attributes`); process.exit(1); }
}
console.log('✔ verify: all automated checks passed');
