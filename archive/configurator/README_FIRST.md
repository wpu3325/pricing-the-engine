# Applied Compute | Model-aware deal configurator (audited MVP)

**Start:** `AppliedCompute_Deal_Configurator_Model_Catalog.xlsx` (Microsoft Excel).

## Four worksheets; one intake
1. **01 Deal Setup** — Edit orange input cells. Select the exact named model in **B7**. Its **total parameters** populate B8; active parameters and status are visible in **F22:G32**. Specify customer demand, authorized RL cycles, stopping rules, capacity tranches and GPU SKU, and procurement options. **B101:B104 are mandatory model/benchmark/rate approval gates**. Rows 109:111 contain spare GPU counts, weeks, manual region/topology fit, and a GPU-family selector in G.
2. **02 Economics Capacity** — Fully linked task/token -> throughput proxy -> GPU-hours -> matching available capacity -> COGS and pricing; weekly capacity and feasibility flags. An unverified scenario may show dollars but **may not be quoted**.
3. **03 Offer and SOW** — Draft customer quote and phase-by-phase responsibilities, acceptance evidence and re-papering triggers. A warning is shown when deal status is HOLD. Legal/commercial approval remains necessary even for READY FOR REVIEW.
4. **04 Guide Assumptions** — Quick instructions, assumption register, and model catalog in columns F:Q (rows 26:55).

## Demonstration
- Choose **Qwen3.6-35B-A3B**: 35B total, 3B active; 3-cycle example forecasts 3,360 GPU-hours and an indicative $210K offer, but **HOLD - MODEL** until the user confirms the actual benchmark, model access and SKU pricing.
- Choose **Kimi K3**: 2,800B total, 104B active; the training class changes, and the GPU family / B300 and capacity checks must be resolved. This is *not* a validated Kimi K3 cost quote.
- Choose **GLM-5.3-Flash**: missing defensible parameter data and no confirmed AC2 RL listing; the model remains on HOLD.
- Change B10 from 3 to 4 to verify GPU-hours, cost, quote and SOW scope all adjust.
- Change B103 to B300 without editing pool G109: existing H100 GPUs no longer satisfy demand; procurement must be confirmed.

## Read before interpreting numbers
- **Model listing is not proof of self-serve access.** The supplied knowledge base lists only some named variants, and the live AC2 catalogs could not be independently retrieved. This is a sourced selection snapshot, not a claim to enumerate every currently available AC2 model or every open-weight model.
- **Total parameters != active parameters != measured throughput.** The 1/2/3 class and 2.5x/1x/0.5x throughput factors are *illustrative* (for sensitivity analysis), especially poor predictors for MoE/vision/frontier-scale models. Approval requires measured throughput and a compatible cluster, not just parameter count.
- **H100 price is only a public benchmark proxy.** The example's engineering rates, existing reservation, supplier availability, minimum terms, labor, grader cost and margin targets are not Applied Compute internal facts.
- **Model + GPU feasibility is approximate.** Week-level inventory matching does not prove contiguous nodes, interconnects, exact memory, or online quota. Treat a green feasibility result as conditional on human verification.
- **Training and serving lists differ.** Production requires a separate model-specific load test and serving order; an RL-listed model is not automatically serving-qualified.

See `Model_Audit_and_Assumptions.pdf` for corrected issues, remaining limitations and cited sources, and `MVP_Build_Brief_UPDATED.md` for a typed web-app implementation contract.
