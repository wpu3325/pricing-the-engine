// The Excel wrapper page: the supplied configurator workbook shown as saved, with the
// key equations written in plain words and a live parity table against the engine.
// Every formula and value is read from data/workbook_dump.json at build time, so the
// page cannot drift from the workbook. Only the plain-words text is written by hand.
import { escapeHtml } from '../../src/documents.js';
import { shell } from './page.mjs';
import { loadDump, sheetIndex, labelFor, parityRows } from './parity.mjs';

const E = escapeHtml;
const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return String(v);
};

// Key chains of the workbook, in the order a reader needs them. `plain` is the only
// hand-written text; the formula and value come from the workbook dump.
export const CHAINS = [
  { ref: '02!B18', title: 'Training GPU-hours', plain: 'Tokens the policy update needs, divided by what one GPU does per hour (throughput × proxy factor).' },
  { ref: '02!B21', title: 'Total workload GPU-hours', plain: 'Policy, rollout and evaluation GPU-hours added together across all approved cycles.' },
  { ref: '02!B27', title: 'Wall-clock hours per cycle', plain: 'Concurrent jobs overlap, so the slower of trainer or rollout sets the pace. Evaluation is always added on top.' },
  { ref: '02!B28', title: 'Total programme weeks', plain: 'Readiness, plus one cadence block per cycle, plus handoff.' },
  { ref: '02!B61', title: 'Cheapest way to buy missing GPUs', plain: 'The lowest of the three quotes: pay-as-you-go, a one-week extension, or a new reservation.' },
  { ref: '02!B82', title: 'Base delivery cost', plain: 'Engineering, graders, storage, platform and GPU compute, summed before rework.' },
  { ref: '02!B84', title: 'Delivery COGS including rework', plain: 'Base cost plus the rework allowance (a percentage of base cost). This is the internal cost the price must cover.' },
  { ref: '02!B93', title: 'RL cycle fee', plain: 'Cycles approved × fee per cycle × size-class factor (0.65× small, 1× standard, 2.5× large).' },
  { ref: '02!B98', title: 'Margin-floor price', plain: 'COGS ÷ (1 − target margin). If the itemised price is below this, the workbook adds an adjustment (B99); the tool folds it into the phase fees.' },
  { ref: '02!B100', title: 'Quote', plain: 'Itemised price plus any margin-floor adjustment. This is the number the customer sees, split by phase.' },
  { ref: '02!B101', title: 'Gross margin', plain: '1 − COGS ÷ quote.' },
  { ref: '02!B104', title: 'Status gate', plain: 'HOLD if an input is missing, the model is unverified, capacity is infeasible, the budget is exceeded or margin is under the floor. READY FOR REVIEW only when every check passes.' },
];

const SHEET_GUIDE = [
  ['01 Deal Setup', 'The inputs. Shaded cells are the only things to change: customer, model, cycles, throughput, costs, price, margin and the three approval gates.'],
  ['02 Economics Capacity', 'All calculations. Rows 4–28 turn tokens into GPU-hours; rows 31–47 are the week-by-week capacity grid; rows 52–70 compare buying options; rows 73–85 are cost; rows 91–104 are price, margin and the status gate; rows 111–125 are optional production.'],
  ['03 Offer and SOW', 'The customer-facing offer and SOW wording that the tool reproduces in its proposal and SOW documents.'],
  ['04 Guide Assumptions', 'The guide and the assumption sources. The tool shows each input’s meaning and its workbook cell.'],
];

function chainsTable(sheets) {
  const rows = CHAINS.map((c) => {
    const [sh, ref] = c.ref.split('!');
    const sheet = sheets[sh];
    const cell = sheet[ref] || {};
    const name = sh === '02' ? '02 Economics Capacity' : '01 Deal Setup';
    return `<tr><td><strong>${E(c.title)}</strong><div class="note">${E(c.plain)}</div></td>
<td><code>${E(name)}!${E(ref)}</code></td>
<td class="formula">${E(cell.formula ? '=' + cell.formula : '(typed value)')}</td>
<td class="num">${E(fmt(cell.value))}</td></tr>`;
  }).join('');
  return `<div class="wrap"><table><thead><tr><th>Step and meaning</th><th>Cell</th><th>Workbook formula</th><th class="num">Saved value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function parityTable(rows) {
  const counts = rows.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {});
  const body = rows.map((r) => `<tr><td>${E(r.label)}</td><td><code>${E(r.sheet.slice(0, 2))}!${E(r.ref)}</code></td>
<td class="num">${E(fmt(r.workbook))}</td><td class="num">${E(fmt(r.engine))}</td>
<td><span class="pill ${E(r.status)}">${E(r.status)}</span>${r.deviation ? `<div class="note">${E(r.deviation)}</div>` : ''}</td></tr>`).join('');
  const summary = `${counts.match || 0} match exactly, ${counts.documented || 0} documented deviation${(counts.documented || 0) === 1 ? '' : 's'}, ${counts.mismatch || 0} mismatch`;
  return { summary, html: `<div class="wrap"><table><thead><tr><th>Output</th><th>Cell</th><th class="num">Workbook</th><th class="num">Tool</th><th>Status</th></tr></thead><tbody>${body}</tbody></table></div>` };
}

function sheetDetails(dump) {
  return dump.sheets.map((s) => {
    const cells = s.cells.filter((c) => c.value !== null || c.formula);
    const sheetCells = sheetIndex(dump);
    const key = s.name.slice(0, 2);
    const rows = cells.map((c) => {
      const label = labelFor(sheetCells[key] || {}, c.ref);
      return `<tr><td><code>${E(c.ref)}</code></td><td>${E(label)}</td><td class="num">${E(fmt(c.value))}</td><td class="formula">${E(c.formula ? '=' + c.formula : '')}</td></tr>`;
    }).join('');
    const formulas = cells.filter((c) => c.formula).length;
    return `<details><summary>${E(s.name)} · ${cells.length} cells, ${formulas} formulas</summary>
<div class="wrap"><table><thead><tr><th>Cell</th><th>Label</th><th class="num">Saved value</th><th>Formula</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }).join('');
}

export function buildExcelPage() {
  const dump = loadDump();
  const sheets = sheetIndex(dump);
  const rows = parityRows();
  const parity = parityTable(rows);
  const totalCells = dump.sheets.reduce((a, s) => a + s.cells.length, 0);
  const totalFormulas = dump.sheets.reduce((a, s) => a + s.cells.filter((c) => c.formula).length, 0);
  const body = `
<div class="mark">| · APPLIED COMPUTE · WORKBOOK ·</div>
<h1>Excel model, rendered</h1>
<p class="lede">The supplied configurator workbook, shown as it is saved: ${dump.sheets.length} sheets, ${totalCells.toLocaleString('en-US')} cells, ${totalFormulas} formulas. The equations are written out below, and a parity table checks every output the tool reproduces against the workbook for the default deal.</p>
<div class="buttons">
  <a class="btn solid" href="downloads/AppliedCompute_Deal_Configurator_Dropdowns.xlsx" download>Download the workbook (.xlsx)</a>
  <a class="btn" href="../app/index.html">Open the live tool</a>
</div>
<div class="banner">Internal. The workbook holds cost and margin. Do not send it to a customer.</div>

<h2>How the workbook is laid out</h2>
<ol class="steps">${SHEET_GUIDE.map(([n, t]) => `<li><strong>${E(n)}.</strong> ${E(t)}</li>`).join('')}</ol>

<h2>The equations, in order</h2>
<p class="note">Read top to bottom: each step uses the one before it. The formula column is the exact text saved in the workbook; the value column is what the workbook shows for the default deal.</p>
${chainsTable(sheets)}

<h2 id="parity">Parity: the tool against the workbook</h2>
<p>For the default deal, ${rows.length} mapped outputs are compared cell by cell: ${E(parity.summary)}. The full 17-scenario check, recalculated in LibreOffice, is in <a href="../docs/PARITY.md">PARITY.md</a>.</p>
${parity.html}

<h2>Every sheet, cell by cell</h2>
<p class="note">Full contents as saved, for checking any single cell. Labels come from the row’s text.</p>
${sheetDetails(dump)}
`;
  return shell({
    title: 'Excel model, rendered',
    description: 'The supplied Applied Compute configurator workbook with its equations, cell map and parity against the tool.',
    base: '../',
    current: 'deliverables/excel-model.html',
    body,
  });
}
