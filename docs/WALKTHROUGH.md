# Walkthrough: one deal, end to end

The long form of the process, the glossary and the verification detail. The short answer to the take-home is in the [README](../README.md); the requirement map is [ANSWERS.md](ANSWERS.md).


**A deal tool for enterprise reinforcement-learning (RL) post-training.** It takes a customer's request, works out what the engagement needs, prices what it costs to deliver, and produces the proposal and statement of work a customer can read line by line.

Built for the Applied Compute take-home ("Pricing the Engine"). Live: https://wpu3325.github.io/pricing-the-engine/ · run locally by double-clicking `index.html`, or with `npm start`.

---

## The story of one deal

Here is how the tool handles a real request, using the default example.

**1. The customer asks.** *Example Enterprise* wants its internal workflow automation improved by RL post-training: their own model, trained on their own data and their own success measure. They want three weekly cycles, with a clear go / no-go point at the start.

**2. We learn what they have.** Their data is text documents, about **28,400 training examples**. The tool estimates **42.7 million tokens per cycle** from the example count and tokens per example, and suggests a task type (multi-turn tool use) that sets rollout and evaluation sizes. The suggestion is labelled as a proxy until measured.

**3. We align on the model.** The tool ranks the catalogue for text data and RL eligibility. **Qwen3.6-35B-A3B** comes out top: it is RL-listed, is a 35-billion-parameter mixture-of-experts model that activates 3 billion parameters per token, and runs on one 8-GPU node. What is still unverified is the benchmark on our hardware and the licence. Those gates stay closed until someone confirms them.

**4. We size the work.** The model turns tokens into GPU-hours using measured throughput: **3,360 GPU-hours** across six weeks, with a training footprint of about 422 GB (one 8×H100 node).

**5. We decide how to buy the GPUs.** The customer's prepaid pool has **8 spare H100s** in weeks 1–8, which covers the whole engagement. The tool compares PayGo, one-week extensions and reservations for any shortfall, and recommends the cheapest. Here the answer is *no purchase needed*.

**6. We cost the delivery.** The full **cost ledger** has about 40 lines grouped into compute, people, evaluation, data, platform and risk. Each line is tagged to the phase that causes it and marked as either a workbook line or an extension. The workbook's own costs come to **$106,590** including a 10% rework allowance. Adding the costs that the workbook leaves out (judge APIs, data labelling, reviewers, security review, storage, and so on) raises delivery cost to about **$130,000**.

**7. We price it in four phases.** The customer pays for four things, each with its effort in hours and why it costs what it does:

| Phase | What the customer gets | Price | Effort |
|---|---|---|---|
| 1 · Eval and environment foundation | A frozen held-out evaluation set, a grader, a production-realistic environment and a measured baseline | $30,000 | 108 hours |
| 2 · Engineering through the cycles | Harness, grader quality and diagnostics for every cycle | $78,000 | 312 hours |
| 3 · Three RL cycles | Rollouts, held-out evaluation and a score report per cycle, with the compute included | $72,000 | $24,000 per cycle × 3 cycles (the cycle count drives this total) |
| 4 · Handoff and verification | Untouched holdout evaluation, checkpoint, reproducibility report and runbook | $30,000 | fixed |
| **Total** | | **$210,000** | |

The price starts from the workload (the four phases), but the rate card also has a floor: the price must cover delivery cost at the target margin. When cost is high enough, the floor sets the price. With the workbook costs the margin is 49.2%. With the illustrative extension costs filled in, the floor applies and the price rises to $236,358 so the margin holds at the 45% target. The tool shows that adjustment *inside* the phases, not as a separate charge.

**8. We check the margin by phase.** The Economics step shows whether each phase covers its own cost. Phase 1 earns a thin margin on purpose, as an entry point. The cycles earn most of the margin. The Handoff phase looks too profitable because its final evaluation compute is not yet costed (see Limits).

**9. We hold the quote until it is ready.** The status stays at **HOLD – MODEL** until three approvals are recorded in the tool: the benchmark is confirmed, the training licence and access are approved, and the GPU rate is confirmed by the supplier. The people who own those approvals are named in the Deal step's *Approvals before quoting* card. A proxy can never produce READY. Once every gate clears, the proposal is marked as a draft for commercial and legal review, which still has to happen before it is sent.

**10. The customer gets a clear document.** The proposal shows the total, the four phases with what each buys, when each invoice is issued and what it costs, what changes the price (one more cycle is +$48,000), what is not included, a glossary and common questions. The statement of work carries the same invoices, the stopping rules, and the triggers that require a new contract.

**11. The customer stays in control.** After every cycle the customer chooses to continue or stop. Scores can prompt a review but never stop contracted work on their own. If the customer stops early, they pay for approved work completed and for any non-cancellable third-party compute committed for the engagement.

---

## Quick start

```bash
open index.html            # double-click works: the app is a single self-contained file
# or
npm start                  # serves on http://localhost:8080
```

Pick a starter scenario (text workflow, code agent, document vision, or a frontier MoE model that needs B300 hardware, which the tool holds until that hardware is confirmed), change any input, and every number updates live. **Share link** encodes the deal in the URL. **Save deal** and **Load deal** use a JSON file.

---

## A. The COGS model

Cost to deliver is the sum of the lines below. Workbook lines reproduce the supplied configurator exactly. Extension lines are added by this tool and are $0 until you fill them.

| Group | What it covers | Examples |
|---|---|---|
| **Compute and capacity** | GPU time for training, rollouts and evaluation; spare or purchased capacity | policy, rollout and evaluation GPUs; dev and smoke-test GPU time; re-run reserve |
| **People and overhead** | Engineers by role, split into setup and per-cycle effort | forward-deployed, research, infrastructure and delivery; scoping, success, security, legal, the verification reviewer |
| **Evaluation and environments** | Graders, judges and sandboxes | baseline and per-cycle graders; external judge APIs; third-party tools; sandbox CPU; human quality review |
| **Data and storage** | Preparing and keeping the data and checkpoints | storage and networking; data ingestion labour; labelling vendors; object storage; egress; PII tooling |
| **Platform and tools** | Running the platform and the team | platform support; on-call cover; travel; observability seats; software and base-model licences |
| **Risk** | Allowances for things that go wrong | expected rework (10% in the workbook); insurance allocation |

The full line-by-line ledger, with each line's driver and phase, is in [`docs/COGS_LEDGER.md`](docs/COGS_LEDGER.md).

**What is deliberately excluded:** corporate overhead, sales, platform R&D, the customer's own cloud bill, and taxes. Marketplace fees depend on the price, so they are left out to avoid a circular calculation.

**How to flex it for a deal.** Enter the workload (data, task, cycles), the measured throughput, the capacity you hold, and the labour and cost lines. The Deal step's *Additional cost lines* card has a **Fill illustrative estimates** button, which populates realistic values you can edit, and a **Clear** button that returns to the workbook baseline. Every number has a hover explanation that shows the equation, this deal's numbers and the workbook cell it comes from.

---

## B. Pricing, the SOW, and protecting the contract

### How the price is built

- **Rate card (default).** The four phases above are priced from their components. If the cost to deliver would give a margin below the target, the price rises to the floor. That raise is folded into the phases, and the customer sees it as part of each phase, not as a separate charge.
- **Cost-plus.** For deals that do not fit the rate card, the price is delivery cost ÷ (1 − target margin).

Margin policy is 45% target and 35% minimum. These are policy settings to test, not company-published numbers.

### Why each phase costs what it does

- **Phase 1, the foundation ($30,000).** Self-serve RL services that bill for compute alone leave the evaluation, grader and environment to the customer (OpenAI and Fireworks billing pages; see `docs/PRICING_RATIONALE.md` §5 for sources and caveats). This phase builds them and leaves them with the customer, reusable for any later model. The price is about $278/h of effort, inside the $200–350/h band in the consulting benchmarks. It is 14% of the project, against 10–15% for paid discovery. The full justification and its sources are in [`docs/PRICING_RATIONALE.md`](docs/PRICING_RATIONALE.md). The labour rates behind the $/h figure are illustrative, so treat it as a sanity check, not a rate card.
- **Phase 2, engineering ($78,000).** Named engineers keep the training loop running. Their effort follows the cycle count, so the fee is spread across the cycle invoices.
- **Phase 3, cycles ($24,000 each).** Each cycle covers the full loop and the managed compute. The price depends on model size, because larger models need more compute per cycle.
- **Phase 4, handoff ($30,000).** An independent check on data the model never trained on, and the package the customer needs to run the model themselves.

### Defending the price

- **Pushback on cost.** Every charge maps to a deliverable and to effort hours by role. Internal cost, rates and margins never reach the customer. The customer documents are tested to contain none of them.
- **A cheaper competitor.** The Economics step has a calculator. It shows the margin left if you match the competitor, and the walk-away price. The rule is to **trade scope, not rate**: fewer cycles, a shorter foundation or a narrower workflow, so the price per unit of work stays at or above the floor. The tornado chart shows which assumption protects the margin most.

### Protecting the contract

**In the short term (the first engagement):**
- Scope is one workflow and one base model, with a fixed number of cycles. Anything beyond needs a change order.
- The customer decides whether to continue or stop after each cycle. Scores can prompt a review, but they never stop contracted work on their own.
- Acceptance is on objective evidence (run IDs, frozen held-out results, signed artifacts), not a promised quality uplift.
- Fees are invoiced by milestone, so cash follows delivery.
- If the customer stops early, they pay for approved work and for any non-cancellable third-party compute committed for the engagement, net of reasonable reuse.

**In the long term (as the customer expands):**
- A new base model, a new method, a new data regime, a new region or GPU topology is a new capacity and pricing decision, and needs a new order.
- Production serving is a separate order with a traffic envelope, a warm-capacity floor and overage rates.
- Scale reviews start at 80% of the contracted envelope. Adding capacity needs an amendment first.

### When to re-paper

The statement of work lists seven triggers, each requiring a written amendment before work proceeds: a new base model or method; more cycles or tokens than approved; a new workflow, data regime or grader; a new region or topology; a production launch or SLA upgrade; production demand above 80% of the envelope; and a customer pause or termination.

---

## Verification

`npm run verify` runs the whole automated gate in one command:

- **Workbook parity.** 17 scenarios are recalculated in LibreOffice from the supplied workbook, and the engine is compared cell by cell. The default deal reproduces the workbook exactly.
- **The brief's acceptance tests.** All ten mandatory tests, plus custom-model, stop-rule and margin tests.
- **Fuzz invariants.** 1,500 random deals: outputs stay finite, margins stay at or below 100%, and READY only occurs when every gate has passed.
- **Customer-safety tests.** No internal cost, margin, rate or supplier term reaches a customer document, and no internal figure from the deal does either. User text is escaped. CSV exports are safe against spreadsheet formula injection.
- **Offer tests.** In every scenario, the displayed phase fees and discount equal the displayed total, the invoices equal the total, and the what-changes figures match the engine.
- **Coverage tests.** Every input and every shown output has a meaning, an equation and a workbook reference.
- **Ledger tests.** Ledger lines add up to the total cost, and every line has a phase and a source.
- **Browser tests** (`npm run e2e`) and a phone-width check.

The golden fixtures are regenerated with `npm run golden`, which needs LibreOffice. The sample documents are regenerated with `npm run samples`, and CI fails if they drift from the committed copies.

---

## Limits

- **Throughput is the largest unknown.** The default of 100,000 tokens per GPU-hour is a proxy, not a benchmark. Until a benchmark is confirmed, the status stays HOLD.
- **Most prices are illustrative.** The H100 rates, labour rates, the extension costs and the margin policy are placeholders for real figures. The workbook's $3.99 H100 price is an expired promotion; the list price is $5.49.
- **Phase 4 is under-costed.** The final holdout evaluation compute is not in the workbook, so the handoff margin is overstated. Cost it before quoting.
- **Parameter counts come from the supplied catalogue.** Several models have none, and the tool shows "Not verified" rather than a guess.
- **Legal text is placeholder.** Anything in [brackets] needs counsel review. The statement of work is not a contract.
- **Capacity is matched weekly.** It does not prove contiguous nodes, interconnect, quota or a reserve for failed jobs.
- **The supplied deck and PDFs disagree with the workbook in places.** The deck shows COGS of $112,097 and a 46.6% margin; the workbook gives $106,590 and 49.2% on the same $210,000 quote. The deck's inputs are not reproduced, so the workbook is treated as canonical and the gap is logged. The full list is in [`docs/PARITY.md`](docs/PARITY.md) §3.

---

## Glossary

- **RL cycle.** One round of training the model on its own attempts, scoring them, and updating the model.
- **Rollout.** One attempt by the model at a task, recorded with its result.
- **Held-out evaluation.** A test set the model never trains on, used to measure real improvement.
- **Grader.** The rules that score an attempt.
- **GPU-hour.** One GPU running for one hour. It is the unit of included compute.
- **Checkpoint.** A saved version of the trained model with its exact settings.
- **HOLD.** A status that means a required approval is missing. A quote cannot leave HOLD on a proxy.

---

## Common questions

**Why pay for the foundation before training starts?** Training is only as good as the test that measures it. The foundation builds that test, the grader and a baseline, and you keep them.

**Why is engineering separate from the cycles?** Engineers keep the loop running whether or not a given cycle improves the score. Their effort follows the cycle count, so it is billed with the cycles.

**Why does the price depend on the model?** Larger models need more compute and more rollouts to learn the same task, so each cycle costs more.

**Why is there a price adjustment in some scenarios?** If the delivery cost would push the margin below the target, the price rises to the floor. The rise is shown inside the phases.

**What if a cycle does not improve the score?** You decide whether to continue, change direction or stop. You pay for the cycles and milestones completed.

---

## Repo map

```
index.html                 the app: one self-contained file (built from index.template.html + src/)
src/engine/                deterministic engine, no DOM: workload, capacity, cogs (ledger),
                           pricing, serving, gates, profile, catalog, compute()
src/offer.js               customer offer model: phases, folded prices, invoices, what-changes
src/documents.js           customer proposal, SOW, internal COGS CSV, deal JSON
src/sensitivity.js         tornado, cycle sweep, competitor undercut
src/explain.js             explanation registry behind every ⓘ and the Guide
src/schema.js              form schema; order and wording follow workbook sheet 01
src/ui/                    charts, forms, tooltip, views
src/app.js                 controller: state, events, persistence, exports
data/                      model catalogue, workload presets, GPU SKUs, COGS presets, scenarios
docs/COGS_LEDGER.md        every cost line, driver, phase and source
docs/PRICING_RATIONALE.md  why each phase is priced as it is, with sources and caveats
docs/PARITY.md             deviations from the workbook, artifact conflicts, open items
docs/ANSWERS.md            each take-home requirement mapped to the product and its tests
docs/samples/              sample proposal, SOW and internal COGS export
docs/reference/            supplied workbook, catalogue, GTM pack and briefs
test/, e2e/                automated tests
scripts/                   verify, build, golden generator, data sync, samples
```

## Licence

No licence is granted. All rights reserved. This is a take-home submission and is not an official Applied Compute document.
