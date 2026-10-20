> Historical brief. Its pricing section (fixed fees and the workbook rate card) is superseded by the usage model in [PRICING_POLICY.md](PRICING_POLICY.md); the rate card remains available as the workbook reference.

# Vibe-coded MVP build brief | model-aware capacity underwriting

This replaces the older size-tier contract. Preserve the **four logical views**: Intake, Economics/Capacity, Customer Offer/SOW, Guide/Provenance.

## Deterministic input model
- `SelectedModel`: **canonical model name**, `total_parameters_b` nullable, `active_parameters_b` nullable or textual for direction-specific activations, architecture, `training_status`, `serving_status`, confidence, GPU hardware requirement, license/access status, and **supplier/model-card URLs**. Load from `model_catalog.json`; a catalog updater reconciles it with AC2 periodically. Do not invent missing values.
- `Customer`: workflow, security/region, start date, delivery mode, customer approver, budget.
- `Demand`: method (GRPO default), training tokens/cycle, rollouts/cycle, mean input/output tokens, eval cases and grading cost, measured *training/rollout/eval* throughput per **selected model+GPU SKU**.
- `TrainingPlan`: maximum approved cycles, cadence, baseline and acceptance metrics, plateau rule, customer-controlled Stop/Continue decision and evidence log.
- `CapacityTranche[]`: GPU SKU, count, region, node connectivity/topology, contract start/expiry, free vs allocated, reserved and opportunity rates, usable windows.
- `AcquisitionPlan`: no new GPUs vs PayGo/extension/new reservation/customer compute, SKU-specific confirmed quote, provider availability and minimum commitment.
- `CommercialPolicy`: itemized fees, additional cycles/engineering, target gross margin, minimum approved margin, customer budget.
- `ServingPlan`: requested model, tokens (input and output separately), traffic peak, warm capacity/SLO, pricing meter, expiry and amendment thresholds.
- `ApprovalEvidence`: `benchmark_confirmed`, `weight_license_access_approved`, `gpu_sku_rate_verified`, region/topology approval, owner and timestamp. **Missing verification => HOLD, never READY.**

## Computation pipeline
1. Validate exact model identity, permissions, parameter facts, training-vs-serving eligibility and model/SKU benchmark. Total parameter size is *descriptive*, not a conversion to GPU-hours.
2. Estimate independent training-update, rollout-generation and evaluation GPU-hours from demand and **measured throughput**. If missing, use a labeled scenario proxy and block approval.
3. Place each RL cycle into the planned time window; include evaluation after every cycle. Match eligible GPU tranches by dates, SKU, free capacity, region and topology. Never count H100 supply against a B300 requirement without verified technical approval.
4. Compare PayGo vs extend vs reserve on total commitment cost, including stranded hours. Show allocated historic cost, new cash exposure and opportunity cost separately.
5. Add direct engineers, graders, CPU/sandboxes, storage, network, support, expected rework. Compute gross margin and floor-driven **proposed** adjustment; never auto-charge a customer without an amendment.
6. Generate customer-only quote and evidence-based SOW. Include model name, chosen method, number/cadence of RL cycles, included demand, acceptance evidence, customer decision rights and amendment triggers (new base model, workflow/region, more loops, new capacity, serving envelope/SLA).
7. Keep production economics and procurement separate from training quote; production model requires serving access, measured SLO throughput, peak capacity and warm/HA replica plan.

## Mandatory acceptance tests
- A default named model shows `35B total / 3B active` (Qwen3.6-35B-A3B); **HOLD - MODEL** until confirmation inputs are approved.
- A serving-only model selected for RL remains on HOLD regardless of generic proxy economics.
- A model without reliable parameter counts displays **Not verified** rather than 0 or an invented estimate, and cannot be approved.
- Kimi K3 requires B300/hardware review; pre-existing H100 availability is not eligible capacity.
- Changing model dynamically changes proxy class, workload GPU-hours, capacity shortage and illustrative cycle fee; **still HOLD** pending its own throughput profile.
- A fourth authorized RL cycle increases demand/cost/quote and scope; no silent stop of contracted work from score thresholds.
- No spare GPU or unconfirmed supplier -> HOLD; supplier commitments beyond job hours still incur cash exposure.
- Invalid throughput (`0`, negative), negative demand or unapproved GPU SKU pricing -> HOLD - INPUT / HOLD - MODEL without divide-by-zero.
- Customer quote includes **no** internal labor burden, realized GPU supplier rate, opportunity cost or gross margin; adjustments require approval.
- A different base model or production serving expansion above the confirmed envelope triggers a new commercial review.

## Known Excel-to-web improvements
The workbook deliberately supports only 16 weekly slots and three existing capacity tranches; a production engine should use a dated multi-provider interval scheduler (region, GPU class, node shape, topology and expiration) and explicit supply allocation. Model catalog status should be retrieved from AC2 rather than inferred from public marketing content. Use **versioned** model entries, performance benchmarks, cost sources and contract snapshots. Do not use an LLM to calculate costs; keep all financial logic deterministic and testable.
