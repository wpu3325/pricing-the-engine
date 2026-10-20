// Customer offer model. One pure data structure feeds the proposal, the SOW
// commercial schedule and the tests, so every document shows the same numbers.
// Customer-safe by construction: work quantities only, no cost rates or margin.
import { compute, loadCatalog } from './engine/index.js';
import { classFactors } from './engine/workload.js';
import { clone } from './clone.js';
import { money } from './format.js';

// Largest-remainder rounding: integers that sum exactly to `target`.
export function largestRemainder(values, target) {
  const floors = values.map((v) => Math.floor(v));
  let rest = target - floors.reduce((a, b) => a + b, 0);
  const order = values.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const out = floors.slice();
  for (let k = 0; k < order.length && rest > 0; k++, rest--) out[order[k][1]] += 1;
  return out;
}

// Fold the margin adjustment (and any cost-plus difference) into the fee lines,
// pro rata, so the displayed lines add up exactly to the displayed total.
export function foldLines(lines, quote, discount) {
  const sum = lines.reduce((s, v) => s + v, 0);
  const target = Math.round(quote) - Math.round(discount);
  if (sum <= 0) {
    const out = lines.map(() => 0);
    if (out.length) out[0] = target;
    return out;
  }
  const factor = (quote - discount) / sum;
  return largestRound(lines.map((v) => v * factor), target);
}

function largestRound(values, target) {
  if (values.some((v) => v < 0)) return values.map((v) => Math.round(v));
  return largestRemainder(values, target);
}

// Hours by role, from the same labour inputs the engine uses (no rates shown).
export function effortHours(deal) {
  const L = deal.labor, N = deal.rl.cycles;
  const roles = [
    ['Forward-deployed engineers', L.fdeSetupHours, L.fdeHoursPerCycle],
    ['ML research engineers', L.researchSetupHours, L.researchHoursPerCycle],
    ['Infrastructure engineers', L.infraSetupHours, L.infraHoursPerCycle],
    ['Delivery and project management', L.deliverySetupHours, L.deliveryHoursPerCycle],
  ];
  return {
    foundation: roles.map(([role, setup]) => ({ role, hours: setup })),
    cycles: roles.map(([role, , perCycle]) => ({ role, hours: perCycle * N })),
  };
}

export function buildOffer(deal, r, catalog = loadCatalog()) {
  const p = r.pricing;
  const N = Math.max(1, deal.rl.cycles);
  const R = deal.rl.readinessWeeks, cad = deal.rl.cadenceWeeks;
  const total = Math.round(p.quote);
  const discount = Math.round(p.lines[5].value);
  const names = ['readiness', 'engineering', 'cycles', 'extra', 'handoff'];
  const raw = [p.lines[0].value, p.lines[1].value, p.lines[2].value, p.lines[3].value, p.lines[4].value];
  const [readiness, engineering, cycles, extra, handoff] = foldLines(raw, p.quote, p.lines[5].value);
  void names;

  const hours = effortHours(deal);
  const allowance = Math.ceil(r.work.totalGpuHours / 10) * 10;
  const cls = classFactors(r.model.proxyClass).cycleEngineeringFactor;
  const sizeWord = cls < 1 ? 'a smaller model' : cls > 1 ? 'a large mixture-of-experts model' : 'a standard-size model';
  const perCycle = Math.floor(cycles / N);

  const phases = [
    {
      key: 'foundation', number: 1, title: 'Eval and environment foundation', amount: readiness,
      timing: `Weeks 1–${R}`, billed: `Week ${R}, when the go/no-go gate is signed`,
      includes: [
        `Workflow and data review, with your subject-matter experts`,
        `Frozen held-out evaluation set (${deal.demand.baselineEvalCases} baseline cases) and baseline score`,
        `Grader and reward specification, versioned and signed off by you`,
        `Production-realistic environment with a smoke-tested end-to-end RL dry run`,
        `Go / no-go recommendation with the expected improvement range`,
      ],
      why: `This is the foundation every RL cycle depends on: an evaluation you can trust, a grader that measures what matters, and a baseline to measure improvement against. You own these assets and can reuse them with any future model. Self-serve RL services bill for compute only, which leaves your team to build them; here we build them with you and price the engineering time: 108 hours across four roles, delivered in the first two weeks. The expected improvement range is set from the measured baseline at the end of this phase; we do not promise a figure in advance.`,
      evidence: ['Signed evaluation charter and frozen baseline score', 'Versioned grader and harness with a reproducible run ID', 'Signed go / no-go recommendation with the expected improvement range'],
      hours: hours.foundation,
    },
    {
      key: 'engineering', number: 2, title: 'Engineering through the cycles', amount: engineering + extra,
      timing: `Weeks ${R + 1}–${r.work.totalWeeks - deal.rl.handoffWeeks}`, billed: 'Shared across the cycle invoices below',
      includes: [
        `Training harness and environment integration`,
        `Grader implementation and quality checks on every cycle`,
        `Infrastructure set-up, monitoring and recovery from failed runs`,
        `Diagnostics and a written review after each cycle`,
      ].concat(extra > 0 ? [`Extra-cycle engineering for the ${deal.rl.cycles - deal.pricing.includedCycles} cycles above the included count`] : []),
      evidence: ['Run IDs and diagnostics for every cycle', 'A written review after each cycle'],
      why: `Engineers assigned to your engagement (the roles are listed in the hours table) keep the training loop running and diagnose each cycle. The effort follows the number of cycles, so this fee is spread across the cycle invoices rather than charged up front.`,
      hours: hours.cycles,
    },
    {
      key: 'cycles', number: 3, title: `${N} RL ${N === 1 ? 'cycle' : 'cycles'}`, amount: cycles,
      timing: `One cycle every ${cad} week${cad === 1 ? '' : 's'}`, billed: 'Invoiced as each cycle completes',
      perCycle,
      includes: [
        `Rollouts: ${deal.demand.rolloutAttemptsPerCycle.toLocaleString('en-US')} attempts per cycle`,
        `Held-out evaluation: ${deal.demand.evalCasesPerCycle} cases per cycle, run on untouched data`,
        `Managed compute: about ${allowance.toLocaleString('en-US')} GPU-hours of included training compute across the engagement`,
        `A written score report and your stop or continue decision after each cycle`,
      ],
      evidence: ['A score report per cycle: held-out score and change from the previous cycle', 'Your signed continue or stop decision'],
      why: `Each cycle runs the full loop: train, generate rollouts, evaluate on held-out cases, and report. The price covers managed compute, orchestration and evaluation, so you do not receive a separate GPU bill. This price is set for ${sizeWord}, because larger models need more compute per cycle.`,
      hours: null,
    },
    {
      key: 'handoff', number: 4, title: 'Handoff and independent verification', amount: handoff,
      timing: `Week ${r.work.totalWeeks}`, billed: `Week ${r.work.totalWeeks}, on signed handoff`,
      includes: [
        `Final evaluation on data never used in training`,
        `Checkpoint and weights package, with configuration and traces`,
        `Reproducibility report and an operating runbook`,
        `Signed handoff acceptance against the agreed evidence`,
      ],
      evidence: ['Reproducibility report and model version', 'Signed handoff acceptance against the listed artifacts'],
      why: `An independent check on data the model never trained on, plus everything your team needs to run the model without us.`,
      hours: null,
    },
  ];

  // Payment schedule: readiness (net of discount), one invoice per cycle, handoff.
  const split = (amt) => Array.from({ length: N }, (_, i) => (i === N - 1 ? amt - Math.floor(amt / N) * (N - 1) : Math.floor(amt / N)));
  const cycleFeeSplit = split(cycles);
  const engineeringSplit = split(engineering + extra);
  const perCycleSplit = cycleFeeSplit.map((c, i) => c + engineeringSplit[i]);
  const milestones = [
    { label: 'Readiness gate', week: R, amount: readiness + discount, note: discount ? 'Includes the negotiated discount' : '' },
    ...perCycleSplit.map((amt, i) => ({ label: `Cycle ${i + 1} of ${N}`, week: R + (i + 1) * cad, amount: amt, note: `Cycle fee ${money(cycleFeeSplit[i])} + engineering ${money(engineeringSplit[i])}` })),
    { label: 'Handoff and verification', week: r.work.totalWeeks, amount: handoff, note: '' },
  ];
  let running = 0;
  for (const m of milestones) { running += m.amount; m.cumulative = running; }

  // What changes the price (engine re-run, customer-safe: only the change in total).
  const delta = (n) => {
    const d = clone(deal); d.rl.cycles = n;
    return Math.round(compute(d, catalog).pricing.quote) - total;
  };
  const scale = { plusCycle: delta(deal.rl.cycles + 1), minusCycle: deal.rl.cycles > 1 ? delta(deal.rl.cycles - 1) : null };
  const cycleFee = deal.pricing.cycleFee;
  const tiers = { small: Math.round(cycleFee * 0.65), standard: cycleFee, large: Math.round(cycleFee * 2.5) };
  const stopAfterFirstCycle = milestones[0].amount + milestones[1].amount;

  return {
    total, discount, phases, milestones, scale, allowance, tiers, stopAfterFirstCycle,
    modelSpec: r.model.totalB == null ? 'a model whose parameter count is not yet verified' : `an open-weight model with ${r.model.totalB} billion parameters${r.model.activeB ? `, of which ${r.model.activeB} billion are active for each token` : ''}`,
    sizeClass: sizeWord,
    sumCheck: phases.reduce((s, ph) => s + ph.amount, 0) + discount,
    perCycle,
    cycles: N,
    weeks: r.work.totalWeeks,
    readinessWeeks: R,
    handoffWeeks: deal.rl.handoffWeeks,
  };
}

export const NOT_INCLUDED = [
  'Production model serving (a separate order, priced after a load test)',
  'Preparing your data beyond the agreed sample (quoted as a change order)',
  'Additional workflows, data sources or regions',
  'Licences for the base model or any third-party tool you choose to add',
  'Cycles beyond the approved count, and compute beyond the stated allowance',
];

export const GLOSSARY = [
  ['RL cycle', 'One round of training the model on its own attempts, scoring the attempts, and updating the model.'],
  ['Rollout', 'One attempt by the model at a task, recorded with its result.'],
  ['Held-out evaluation', 'A test set the model never trains on, used to measure real improvement.'],
  ['Grader', 'The rules that score an attempt, for example pass or fail, or a rubric score.'],
  ['Compute allowance', 'The training compute included in the price, stated in GPU-hours for the whole engagement.'],
  ['Checkpoint', 'A saved version of the trained model, with its exact settings, so results can be reproduced.'],
  ['Reinforcement learning (RL)', 'A way of improving a model by letting it attempt tasks, scoring the attempts, and rewarding the behaviour that scores well.'],
  ['Reward', 'The score the grader gives an attempt, which the training uses to decide what to reinforce.'],
  ['Baseline', 'The score of the untrained model on the held-out evaluation. Improvement is measured from this point.'],
  ['Metric', 'The single measure of success you approve, for example the held-out pass rate.'],
  ['Go / no-go gate', 'A decision point at the end of the foundation phase. You approve it before any RL cycle is paid for.'],
  ['Standard-size model', 'The reference tier that the base cycle price is set for. Smaller and larger models are priced as a multiple of it.'],
  ['Weights', 'The learned numbers that make up the model. The handoff package includes the trained weights.'],
  ['Traces', 'Recorded attempts, showing each step the model took, for inspection.'],
  ['Runbook', 'Written instructions for operating the handed-over model.'],
  ['Forward-deployed engineer', 'An engineer who works alongside your team on-site or in your environment, rather than only remotely.'],
  ['Change order', 'A short written amendment that adds or changes scope and its price before the work starts.'],
  ['Statement of work (SOW)', 'The contract schedule that defines scope, phases, evidence, invoices and amendment rules. Sent with this proposal.'],
];

export const FAQ = [
  ['Why do I pay for the foundation before training starts?', 'Training is only as good as the test that measures it. The foundation builds that test, the grader and a baseline, and you keep them. It is the one part of the work that makes every later cycle measurable.'],
  ['Why is engineering separate from the cycles?', 'Engineers keep the loop running whether or not a given cycle improves the score. Their effort follows the number of cycles, so it is billed with them.'],
  ['Why does the price depend on the model?', 'Larger models need more compute and more rollouts to learn the same task, so each cycle costs more to run. The price tier reflects that.'],
  ['What if a cycle does not improve the score?', 'You decide after each cycle whether to continue, change direction or stop. You pay for the cycles and milestones completed. We do not stop contracted work silently, and we do not charge for work you have stopped before it starts.'],
  ['What happens if I stop early?', 'You pay for approved work completed and for any non-cancellable third-party compute committed for your engagement, net of reasonable reuse. The handoff fee is billed only on a signed handoff.'],
];
