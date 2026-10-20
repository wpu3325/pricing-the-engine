# Pricing the Engine

A deal-economics tool for an enterprise RL post-training engagement: model the cost to deliver, decide how to buy the GPUs, set a price and margin, stress-test it, and generate a customer SOW and pricing proposal.

It answers the Applied Compute take-home ("Pricing the Engine"): **(A)** a COGS model with the cost lines, assumptions and flexible inputs, and **(B)** a pricing structure, SOW, margin target, contract protections and re-papering triggers.

Live tool: GitHub Pages (enabled by `.github/workflows/pages.yml` once the repo is published). Run locally with `npm start`, then open http://localhost:8080.

---

## The answer in one screen

**Default engagement** (the workbook's example: Qwen3.6-35B-A3B, three weekly RL cycles, 8 spare H100 GPUs):

| | |
|---|---|
| Demand | 3,360 GPU-hours over six weeks |
| Forecast delivery COGS | **$106,590** (rework allowance included) |
| Customer quote | **$210,000** = readiness $30K + engineering $78K + 3 cycles $72K + handoff $30K |
| Gross margin | **49.2%** (target 45%, minimum 35%; the target-margin floor is $193,800) |
| Capacity | Covered by owned spare GPUs in weeks 1–8. No new purchase needed |
| Status | **HOLD – MODEL**: benchmark, training access and GPU SKU rate are not yet confirmed |

The tool will not say READY until the model is qualified (benchmark, licence and training access, SKU rate confirmed), the capacity is feasible, the price is within budget, and the margin clears the minimum. A proxy can never produce READY. These numbers come from the same engine that is verified against the supplied workbook (see [Verification](#verification)).

---

## A. COGS model

### Every cost line in a post-training engagement

| Pool | What it covers | Driver in the tool | Included in |
|---|---|---|---|
| Training GPUs | Policy-update jobs | Policy tokens ÷ measured throughput | GPU COGS |
| Rollout GPUs | Trajectory generation | Attempts × (input × work factor + output) ÷ throughput | GPU COGS |
| Eval + graders | Held-out runs, judge APIs | Eval cases × work tokens ÷ throughput, plus grader cost per cycle | GPU COGS + graders |
| Agent sandboxes | CPU, tools, environments | Included in graders/sandbox line | Graders |
| Engineering | FDE, research, infrastructure, delivery | (setup hours + cycles × hours per cycle) × loaded rate | Engineering |
| Data + checkpoints | Storage, transfer, logs | Fixed storage/network line | Storage |
| Network + operations | Platform and direct support | Fixed platform line | Platform |
| Expected rework | Failed runs, grader changes | % of base cost | Rework |

Per GPU-hour the model is: `GPU-hours = demand ÷ (measured throughput × model-class factor)`. GPU COGS = already-paid capacity (allocated) + any new capacity cash. Opportunity cost is shown separately and is not booked as COGS.

**Deliberately excluded from COGS:** corporate overhead, sales and marketing, R&D on the platform, and customer-side compute. The customer bills their own compute under their own cloud contract when BYOC is selected.

### Assumptions the engagement needs (and what each one is)

- **Demand:** training tokens per cycle, rollout attempts, input/output tokens per rollout, eval cases. The workload profile suggests these from the data type, dataset size and task type. Suggestions are labelled UNVERIFIED PROXY.
- **Performance:** measured trainer, rollout and eval throughput per model and GPU SKU. This is the largest unverified input (see Limits).
- **Capacity:** spare GPUs per pool with start/expiry weeks and SKU. Purchase prices for PayGo, one-week extension and reservation, with the reservation minimum.
- **Labour and external:** loaded hourly rates and hours, graders, storage, platform, rework %.
- **Gates:** benchmark confirmed, training access and licence approved, GPU SKU rate confirmed, data access.

Every one of these has a hover explanation, the workbook cell it lives in, and its evidence status.

### Flexing it per deal

- Enter the customer's data, model and task; the tool suggests demand, a model shortlist and a GPU SKU. Nothing changes until you press Apply.
- Change any input, and the quote, COGS, margin, capacity and status update live.
- **Save deal / Load deal** writes a JSON file. **Share link** encodes the deal in the URL, with no server.
- Starter scenarios cover a text workflow, a code agent, document vision, and a frontier MoE that hits the B300 gate.

---

## B. Pricing structure, SOW and margin

### The price the customer sees

| Line | Basis | Why it is priced this way |
|---|---|---|
| Readiness and baseline | $30K, once | Feasibility, baseline and grader design happen before any spend on training. The customer pays to find out whether RL will work |
| Engineering and integration | $78K, fixed | Harness, grader implementation and integration. It is a fixed fee because the scope is fixed |
| RL cycles | $24K × cycles × model-class factor (small 0.65×, standard 1×, large 2.5×) | Each cycle is train → rollout → eval → decision. Larger models cost more per cycle in GPU-hours |
| Extra-cycle engineering | $24K per cycle beyond 3 | Each extra cycle needs named engineering |
| Handoff and independent verification | $30K, once | Held-out evaluation, reproducibility and checkpoint delivery |

Customer documents show only these lines. They never show COGS, labour rates, GPU supplier prices, margin, opportunity cost, or the walk-away price. A test scans every generated customer document for those terms.

### Margin profile and reasoning

- **Target 45%, floor 35%.** The target is a policy setting to test, not a company-published number. The deck's own guidance is 40–50%.
- **Why this range:** the work is services-heavy with variable GPU and labour cost, and carries real capacity risk (buying GPUs you cannot use), so a 35% floor protects against the worst case while 45% leaves room for rework and discounts.
- **Rate-card mode** (default) raises the price to the floor only when the itemised fees fall short. That raise is a **proposed** adjustment that needs written approval. It is never auto-billed.
- **Cost-plus mode** prices at COGS ÷ (1 − target) for deals that do not fit the rate card.
- The customer's **discount** lowers margin; it does not lower cost.
- Serving is a separate order and is priced on its own margin.

### Defending the price

- **Pushback on cost:** every line of the proposal maps to a deliverable. The internal COGS is traceable to the workbook, and the tool re-runs cleanly when any assumption changes. Be ready to show the three things that drive cost: GPU-hours (throughput), the number of cycles, and labour.
- **Competitor undercut:** the Economics step has a calculator. It shows the margin left if we match, and the walk-away price (COGS ÷ (1 − 35%)). The rule is **trade scope, not rate**: reduce cycles, shorten readiness, or narrow the workflow, so the price per unit of work stays at or above the floor. The tornado shows which assumption protects the margin most.

### Contract protections: short term vs long term

**Protect in the short term (first engagement):**
- Scope limited to one workflow and one base model, with a fixed cycle count (`cycles`, `cadence`) and a change order for anything beyond it.
- Customer-controlled stop/continue after every cycle. Score thresholds trigger a review, never an automatic stop, so contracted work is not stopped silently.
- Acceptance on objective evidence (run IDs, frozen held-out results, signed artifacts), not a guaranteed quality uplift.
- Fees are milestone-based and paid per phase, so cash follows delivery.
- If the customer pauses or terminates, they cover approved work and any non-cancellable third-party compute commitments made for the engagement, net of reasonable redeployment.

**Protect in the long term (as the customer expands):**
- Re-price when the base model, method, data regime, region or GPU topology changes. Those are new capacity decisions, not the same contract.
- Serving is a separate order with a traffic envelope, a warm-capacity floor and overage rates. Scale reviews start at 80% of the envelope and amendments are required before adding replicas.
- Committed-volume pricing can step down only in return for a longer term or a larger minimum.

### When to re-paper

The SOW section 5 lists the triggers. Each one requires a written amendment before work proceeds:

1. New base model or method: re-check fit, memory, throughput and evaluator comparability.
2. More RL cycles or higher token volume: a change order before exceeding the approved count.
3. New workflow, data regime or grader: re-scope data rights, acceptance and timeline.
4. New region, isolation or GPU topology: reassess capacity, security and price.
5. Production launch or SLA upgrade: a separate serving order after a load test.
6. Production demand above 80% of the contracted envelope: review; amend before adding replicas.
7. Customer pause or termination: the net-cost clause above.

---

## Verification

`npm run verify` runs every automated check in one command:

- **Golden parity** (`test/parity.test.js`): 17 workbook scenarios recalculated with LibreOffice and compared against the engine, cell by cell. Every mapped cell matches within 1e-6, except the documented deviations.
- **Brief acceptance tests** (`test/acceptance.test.js`): all ten mandatory tests from the build brief, plus custom model, stop rules and margin floor.
- **Fuzz invariants** (`test/invariants.test.js`): 1,500 seeded random deals. Outputs stay finite, margins stay ≤ 100%, and READY only occurs when every gate has passed.
- **Customer-safety tests** (`test/documents.test.js`): no internal term reaches a customer document; all user text is escaped; the CSV export is safe against formula injection.
- **Explainability coverage** (`test/explain.test.js`): every input and every shown output has a meaning, equation and workbook reference.
- **Sensitivity, profile, persistence and data sync** tests.
- **Browser smoke suite** (`e2e/smoke.spec.js`, run with `npm run e2e`) and a phone-width overflow check.

The golden fixtures are regenerated with `npm run golden` (requires LibreOffice). The sample documents are regenerated with `npm run samples`, and CI fails if they drift.

## Repo map

```
index.html                  page shell (Applied Compute console look)
src/engine/                 deterministic engine (no DOM): workload, capacity,
                            cogs, pricing, serving, gates, profile, catalog, index.compute()
src/documents.js            customer SOW, pricing proposal, internal COGS CSV, deal JSON
src/sensitivity.js          tornado, cycle sweep, competitor undercut (full re-runs)
src/explain.js              explanation registry (drives every ⓘ and the Guide)
src/schema.js               form schema (order and wording follow workbook sheet 01)
src/ui/                     charts (SVG), forms, tooltip, views
src/app.js                  controller: state, events, persistence, exports
data/                       model catalogue, workload presets, GPU SKUs, scenario fixtures
docs/PARITY.md              deviations from the workbook, artifact conflicts, open items
docs/ANSWERS.md             requirement-by-requirement answer map
docs/samples/               generated sample SOW, proposal and internal COGS
docs/reference/             supplied workbook, catalogue, GTM pack and briefs
test/, e2e/                 automated tests
scripts/                    verify, golden generator, data sync, sample builder
```

## Limits (read before using a number)

- **Throughput is the biggest unknown.** The default 100,000 tokens/GPU-hour is a backsolved proxy, not a measurement. Until a benchmark is confirmed, the status stays HOLD, and the tool cannot be used to quote.
- **Prices are illustrative.** The H100 rates, labour rates, graders, storage and margin policy are placeholders for Applied Compute's real figures.
- **Parameter counts come from the supplied catalogue.** Several models have null counts. The tool shows "Not verified" and holds them. It does not guess.
- **The model shortlist is a decision aid, not an availability claim.** Being listed does not mean access is confirmed.
- **Legal language is placeholder.** Items in [brackets] need counsel review. The SOW is not a contract.
- **The supplied deck, GTM PDFs and audit PDFs disagree with the workbook in places** (for example, the deck's COGS is $112,097, not $106,590). The workbook and engine are canonical. The full list and the open items are in `docs/PARITY.md`.
- **Capacity matching is weekly.** It does not prove contiguous nodes, interconnect, quota or failed-job reserve. A green feasibility result is conditional on human verification.

## Decisions, deviations and why

Every departure from the workbook is listed with its reason and the test that proves it in `docs/PARITY.md` §2. The main ones are: blank parameters show "Not verified" rather than 0; H100 pool GPUs are not counted toward a B300-class plan; the planning horizon grows past 16 weeks; and the stop rule's plateau test no longer breaks when there is only one score.

## Licence

No licence is granted. All rights reserved. This is a take-home submission and is not an official Applied Compute document.
