# Parity log

Every number in the tool is traceable to a workbook cell, a documented deviation, or a labelled proxy. This file is the audit trail. “Brief” means the build brief in [MVP_BRIEF.md](MVP_BRIEF.md).

## 1. Verified parity (engine vs recalculated workbook)

`test/parity.test.js` regenerates each scenario by patching the workbook inputs and recalculating it with LibreOffice (`scripts/gen_golden.py`), then compares 130+ mapped cells and the 16-week grid with the engine. Tolerance 1e-6. 17 scenarios pass:

default · four-cycles · kimi-k3 (verdict scope) · kimi-k3 on B300 unfunded · GLM missing params · family-verify model · all gates approved (READY) · no existing capacity (Auto) · forced Reserve · forced Extend · BYOC · concurrent RL · 10% discount · zero throughput (HOLD-INPUT) · serving on · stop-rule scores.

Cell map: `test/mapping.js`. Workbook source: `deliverables/downloads/AppliedCompute_Deal_Configurator_Dropdowns.xlsx` (the only copy). Its saved cells and formulas are dumped to `data/workbook_dump.json` by `scripts/extract_workbook.py`, and the [Excel model page](https://wpu3325.github.io/pricing-the-engine/deliverables/excel-model.html) renders that dump with a parity table for the default deal.

## 2. Deliberate deviations (the MVP does better than the workbook here)

| ID | Workbook behaviour | MVP behaviour | Why | Evidence |
|---|---|---|---|---|
| D-1 | Blank active parameters display `0` (`01!G23`) | Display "Not verified" | Brief: never show 0 for unverified parameters | `deviations` in `test/mapping.js`; test `acceptance` #3 |
| D-2 | Pre-existing H100 pool GPUs count toward a B300-class plan when the plan is H100 | Pools excluded when the model requires B300 and the plan is not B300 | Brief: "pre-existing H100 availability is not eligible capacity". Quote is HOLD either way, but cost lines were wrong | `hardwareBlocked` in `src/engine/capacity.js`; Kimi scenario compared on verdict/status cells only (`data/scenarios/scenarios.json`) |
| D-3 | 16-week grid; verdict "EXTEND CALENDAR" when > 16 weeks | Grid grows to 52 weeks; "EXTEND CALENDAR" only above 52 weeks | Brief: the 16-week grid is a demo limit. Identical results for ≤ 16 weeks | `MAX_WEEKS` in `src/engine/capacity.js`; parity scenarios all ≤ 16 weeks |
| D-4 | Cycles limited to 1–10 (`02!B104`) | 1–52 cycles; HOLD-INPUT outside that | Same demo-limit reason as D-3 | `inputErrors` in `src/engine/gates.js` |
| D-5 | Plateau test hard-codes the last two gains; with one score `INDEX(H37:H44,B20-1)` = `INDEX(…,0)` returns the whole column | Plateau = last N gains all below threshold, N = customer's "consecutive slow cycles"; requires N scores | Fixes a spreadsheet defect; stop-order is preserved (target → cycle cap → plateau) | `stopAction` in `src/engine/gates.js`; acceptance stop-rule test |
| D-6 | Only the rate card prices (`pricing.mode`) | Cost-plus added, and the usage model (`cogsBuilt`) is now the default. Each customer line is built from its own COGS pool. The rate card stays selectable as the workbook reference | Price follows the cost model, and human hours are never sold | `src/engine/pricing.js`; `test/cogsbuilt.test.js`; `test/acceptance.test.js` (cost-plus) |

Not parity-affecting, MVP-only additions: the workload profile layer (`src/engine/profile.js`), sensitivity analysis (`src/sensitivity.js`), share links and deal files, customer SOW/proposal generation.

## 3. Conflicts with the original deck

The original deck and GTM PDFs disagreed with the workbook in places. Decision: the **workbook formulas and the engine** are canonical. Commercial policy follows the deck only where the workbook is silent.

| # | Item | Deck / GTM pack | Workbook | Decision in the MVP |
|---|---|---|---|---|
| C-1 | Base COGS and margin | Slide 13: COGS **$112,097**, GP $97,903, GM **46.6%** | COGS **$106,590**, GM **49.2%** at the same $210K quote | Workbook. The deck appears to use different inputs; the difference is not reconstructed and is flagged for the presenter |
| C-2 | Model size-class cycle fee | Slide 9: small $12K, standard $24K, large $60K per cycle; GPU-h caps 560 / 1,120 / 2,800 | Factors 0.65× / 1× / 2.5× of the $24K fee (= $15.6K / $24K / $60K) | Workbook factors; the deck's $12K tier is inconsistent with its own $24K standard, so the workbook figure is used |
| C-3 | Scale-review threshold | Slide 11: review at **70%** of SLO-compliant capacity for 2 weeks | 80% (`02!B121`) | 80% (workbook) |
| C-4 | Scale-out trigger | Slide 11: ">20 concurrent or >100M tokens/month" | ">20% above contracted traffic or concurrency" (`03!B53`) | Workbook wording in the SOW |
| C-5 | Extra engineering rates | Slide 9: FDE $280/h, ML $320/h | FDE $180/h, research $200/h (`01!B52`, `B55`); extra cycle = $24K fee | Workbook |
| C-6 | Engineering hours | Slide 8: "300 hours, $78K" | Fixed $78K engineering fee; hours are internal cost, not sold | Fixed fee to the customer; hours only in the internal cost model |
| C-7 | Model catalogue count | Workbook guide: 30 documented options | `model_catalog.json`: 30 entries | Consistent; no change |

**Status:** the deck and GTM PDFs were removed from the repository, so readers cannot compare them with the workbook. The table stays as a record for the walkthrough. The original pack is in git history before commit `a000e1b`.

## 4. Proxies that are NOT verified

Every value below is labelled in the UI and must be replaced with a measurement or supplier quote before a READY status is meaningful:
- Throughput for policy, rollout and eval (100,000 tokens/GPU-hour, `01!B43:B45`). It is a backsolved proxy, not a benchmark.
- H100 $3.99 PayGo, $2.75 extension, $2.50 reservation, $2.50 allocation (public proxy and finance assumptions).
- Labour loaded rates, graders, storage, platform, rework 10%, margin policy 45% / 35%.
- Usage model (all placeholders, labelled in the UI): line margins (packages 45%, compute 30%, platform and Ari usage 60%), automation share (50%), effort tier factors (0.7 / 1.0 / 1.4), calibration (1.0 until engagements close), target utilization (70% on the example), Ari tokens per cycle (50M on the example), serving throughput (1,000,000 tokens per GPU-hour), holdout evaluation hours (400), platform team and Ari development costs (for the fixed-cost view only).
- Illustrative GPU rates and throughput multiples for B200 and B300 (`data/gpu_skus.json`). H100 list is $5.49.
- Workload profile presets (`data/workload_presets.json`) and GPU HBM sizes (`data/gpu_skus.json`).
- Model parameter counts from the supplied catalogue. Several are null and are shown as "Not verified".

## 5. Deviations added with the cost ledger and the proposal

| ID | Workbook behaviour | MVP behaviour | Why | Evidence |
|---|---|---|---|---|
| D-7 | Margin floor raise shown as a separate "Proposed price adjustment" line (sheet 03 row 12) | Adjustment is folded pro rata into the four phase fees; displayed lines sum exactly to the total | A separate adjustment confused customers and the SOW milestones did not sum to the total | `buildOffer` / `foldLines` in `src/offer.js`; `test/offer.test.js` |
| D-8 | Cost is eight buckets (`02!B73:B81`) | Same eight buckets plus about 40 ledger lines; extension inputs default to $0 | Brief asks for every cost line. Defaults keep parity | `src/engine/cogs.js`; `test/ledger.test.js`; parity suite unchanged |
| D-9 | Marketplace and payment fees not modelled | Not modelled; documented as excluded | Those fees depend on the price, which would be circular | `docs/COGS_LEDGER.md` |
| D-10 | Final holdout evaluation compute is not costed separately | Costed as its own ledger line (`holdoutEval`). The example deal enters an illustrative 400 GPU-hours; the usage model holds the quote with `HOLD - COST GAP` until it is costed | Adding it would change the workbook baseline; it should be costed before a quote | `docs/PRICING_RATIONALE.md` §6 |

| D-11 | Human hours were sold through fixed fees | The usage model (`cogsBuilt`, default) prices standard-effort packages with an automation lever. Hours are an internal cost only. Price lines: setup package, managed cycles (compute and Ari usage), handoff package | Hours should not be a sold line; the price should be an output of COGS | `src/engine/pricing.js` (`cogsBuilt`), `src/offer.js` (`buildCogsBuiltOffer`), `test/cogsbuilt.test.js` |
| D-12 | Ari and platform usage had no meter | Ari tokens are a ledger line (`ari`), priced per million tokens at a 60% margin. The meter is provisional until serving throughput is measured (`HOLD - THROUGHPUT`) | Ari is priced on tokens; the rate is set from measured throughput, not the proxy | `src/engine/pricing.js` (`meters`), `src/engine/gates.js`, `test/guardrails.test.js` |

## 6. Other refreshed conflicts

- **C-6 (engineering hours).** The deck quotes "300 hours" for engineering. The tool now shows effort from the labour inputs: 108 hours in the foundation and 312 across three cycles, 420 in total.
- **Stale PayGo price.** The workbook's $3.99 H100 PayGo is the expired Together promotion (list $5.49). It is kept for parity. The illustrative extension preset uses $5.49.
