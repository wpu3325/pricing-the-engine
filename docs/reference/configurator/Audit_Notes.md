# Model and finance workbook audit — 2026-10-19

## Material issues fixed
1. **Generic tier hid the actual model.** Now exact model dropdown in B7; B8 auto-populates total parameter count; active params, architecture, training/serving statuses and provenance visible in G23:G32. A dynamic catalog is supplied in JSON/CSV.
2. **MoE and frontier models could be mispriced as 8B/32B/70B dense proxies.** Kept heuristic sensitivity curves but explicitly marked them proxy; all real deal approvals require per-model/SKU throughput and cost confirmation (B101:B104); missing or unknown parameter values stay unverified.
3. **An unqualified/serving-only model could appear economically ready.** Added training eligibility, weights/license, benchmark, pricing and hardware gating. Unverified calculations show `HOLD - MODEL`, not a releasable price.
4. **Existing H100 GPUs counted as usable for models requiring B300.** Added GPU family to each pool (G109:G111) and planned GPU type (B103); capacity matching checks both SKU and manual compatibility; Kimi K3/H100 flags hardware mismatch.
5. **Zero throughput could cause division-by-zero or an invalid approval.** Added input validation guardrails and `HOLD - INPUT` status. Scenario calculations may be incomplete under invalid inputs; do not rely on them.
6. **Customer quote looked sendable during HOLD.** Added `PRELIMINARY - DO NOT SEND CUSTOMER` warning linked to approval status. Any margin-floor uplift is expressly a proposed amendment, not an automatic surcharge.
7. **Training availability was implicitly conflated with serving.** Each model has separate catalog status; optional serving order displays hold when serving eligibility or throughput is missing.

## Remaining assumptions / limits (do not silently infer)
- The supplied 2026-10-18 KB is *not* an exhaustive current model catalog; AC docs training/serving model pages were not independently retrievable during this audit. The dropdown lists **30 named or clearly labeled research/family/custom options**, not every globally available open-weight model nor certified availability by AC.
- Parameter counts are from named model supplier/source references where possible; variants lacking reliable exact specs show `Not verified`. Some secondary-spec rows require first-party corroboration before a quote. DeepSeek V4.1 Flash active weights differ for input and output.
- GPU throughput factor (2.5× / 1× / 0.5×) and engineering cycle multiplier (0.65× / 1× / 2.5×) are scenario proxies by size class. Model total params, active params, quantization, context, full/LoRA training, tensor/expert parallelism, communication and GPU memory must be benchmarked.
- H100 $3.99/GPU-hour proxy is not a validated Applied Compute supplier price, nor is it portable to B200/B300 or dedicated multi-node capacity. GPU rate check is separate from general model benchmark approval.
- Supplier 'availability' means provider procurement confirmation, not just a reasonable spreadsheet count. The weekly plan does not prove cluster adjacency, effective daily schedulability, interconnect, failed-job reserve or short-notice procurement.
- Existing-capacity allocation is a managerial view (not a new cash outflow); alternative customer opportunity value requires evidence. Model does not optimize portfolio-wide cross-customer allocation.
- Policy/rollout/eval equivalent tokens, model effective throughput, failure/rework allowances, grader expense, FDE/ML/infra burdened rates, fee policies and engineering mix are illustrative and need actual deal measurement.
- Serving uses one warm capacity floor and a simplified token equivalent; no prefill/decode engine benchmark, HA multi-zone redundancy, multimodal workload sizing, data-residency transfer or real SLA cost. Production requires separately executed service order and sizing test.
- 16 weeks and three GPU tranches are demo limits. More must be modeled in a coded scheduler. Production contract language, acceptance, work stoppage and termination payment require human counsel/commercial approvals.

## Audit result
Internal consistency scenario tests passed for default model, small-model substitution, Kimi K3 hardware mismatch, serving-only/missing-spec HOLD, fourth cycle, compatible-vs-incompatible GPU family, quote/COGS links and formula-error scan. This validates *model logic* but **does not validate AC2 model availability, negotiated supplier economics or model throughput**.
