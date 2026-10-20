// Builds index.html as ONE self-contained file: the app is bundled into a classic
// inline script, so the tool works by double-clicking the file (file://) as well
// as from any static host. The inline script is pinned by SHA-256 in the CSP, so
// no other script can run. Run: node scripts/build.mjs
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = await build({
  entryPoints: [join(root, 'src/app.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none',
});
const js = result.outputFiles[0].text.trim();
if (js.includes('</script')) throw new Error('bundle would break out of the inline script');
const hash = createHash('sha256').update(js, 'utf8').digest('base64');
const template = readFileSync(join(root, 'index.template.html'), 'utf8');
const html = template.replace('__APP_HASH__', hash).replace('/*__APP_BUNDLE__*/', () => js);
writeFileSync(join(root, 'index.html'), html);
console.log(`built index.html (${(html.length / 1024).toFixed(0)} KB, CSP sha256-${hash.slice(0, 12)}…)`);
