# COGS ledger

Every cost line that goes into delivering a post-training engagement, where it comes from, and which delivery phase it belongs to. "Workbook" lines reproduce sheet 02 of the supplied configurator exactly. "Extension" lines are added by this tool and default to $0, so the default deal equals the workbook.

Phases: **Foundation** (weeks 1–2), **Engineering** (per-cycle people), **Cycles** (compute and per-cycle evaluation), **Handoff** (final verification), **Shared** (overhead that is not allocated to one phase).

## Compute and capacity

| Line | Phase | Source | Driver |
|---|---|---|---|
| Policy-update GPUs (training) | Cycles | Workbook | GPU cost × share of GPU-hours |
| Rollout GPUs | Cycles | Workbook | GPU cost × share of GPU-hours |
| Evaluation GPUs, per cycle | Cycles | Workbook | GPU cost × share of GPU-hours |
| Baseline evaluation GPUs | Foundation | Workbook | GPU cost × share of GPU-hours |
| Dev and smoke-test GPU time | Foundation | Extension | GPU-hours × rate |
| Re-run reserve for failed or pre-empted jobs | Cycles | Extension | % of GPU cost |

GPU cost = already-paid capacity (allocated at the allocation rate) plus any new capacity cash (PayGo, extension or reservation), chosen by the capacity module.

## People and overhead

| Line | Phase | Source | Driver |
|---|---|---|---|
| Forward-deployed engineering: setup | Foundation | Workbook | setup hours × loaded rate |
| Forward-deployed engineering: per cycle | Engineering | Workbook | cycles × hours per cycle × rate |
| ML research engineering: setup / per cycle | Foundation / Engineering | Workbook | as above |
| Infrastructure engineering: setup / per cycle | Foundation / Engineering | Workbook | as above |
| Delivery coordination: setup / per cycle | Foundation / Engineering | Workbook | as above |
| Pre-sales scoping engineering | Foundation | Extension | hours × support rate |
| Customer success and executive sponsorship | Shared | Extension | hours × support rate |
| Security and compliance review | Foundation | Extension | hours × support rate |
| Legal and contracting | Shared | Extension | hours × support rate |
| Independent verification reviewer | Handoff | Extension | hours × support rate |

**Support rate:** one blended hourly cost for non-engineering roles, $150/h in the illustrative preset.

## Evaluation and environments

| Line | Phase | Source | Driver |
|---|---|---|---|
| Baseline graders and environments | Foundation | Workbook | one-off |
| Graders and environments per cycle | Cycles | Workbook | cycles × cost per cycle |
| External judge / LLM-grader API spend | Cycles | Extension | cycles × cost per cycle |
| Third-party tool and data API spend | Cycles | Extension | cycles × cost per cycle |
| Sandbox and environment CPU compute | Cycles | Extension | cycles × cost per cycle |
| Human quality review hours | Cycles | Extension | hours × support rate |

## Data and storage

| Line | Phase | Source | Driver |
|---|---|---|---|
| Storage and networking | Shared | Workbook | one-off |
| Data ingestion and cleaning labour | Foundation | Extension | hours × support rate |
| Data labelling vendor spend | Foundation | Extension | fixed |
| Object storage for data and checkpoints | Shared | Extension | TB-months × rate |
| Network egress | Shared | Extension | TB × rate |
| PII redaction and security tooling | Foundation | Extension | fixed |

## Platform and tools

| Line | Phase | Source | Driver |
|---|---|---|---|
| Direct platform support | Shared | Workbook | one-off |
| On-call and operations cover | Shared | Extension | weeks × rate |
| Travel and on-site trips | Shared | Extension | trips × cost |
| Observability and experiment-tracking seats | Shared | Extension | seats × cost |
| Third-party software licences | Shared | Extension | fixed |
| Base-model commercial licence | Foundation | Extension | fixed |

## Risk

| Line | Phase | Source | Driver |
|---|---|---|---|
| Insurance allocation | Shared | Extension | % of direct cost (excluding rework) |
| Expected rework allowance | Shared | Workbook | % of total base cost |

## Deliberately excluded

- Corporate overhead and general administration
- Sales commissions and marketing
- Platform research and development
- Customer-side compute and the customer's own cloud bill
- Taxes
- Marketplace and payment fees: these depend on the price, which would make the cost circular. Add them as a fixed line if needed.

## Price classes and the usage model

Each ledger line is priced in one of five customer pools, so every cost reaches exactly one price line:

| Pool | Lines | Margin |
|---|---|---|
| Setup package | Foundation-phase package costs (people, data, graders, dev time) | 45% |
| Managed cycles | Engineering and cycle package costs, excluding compute and software | 45% |
| Managed compute | GPU lines for training, rollout and evaluation, dev time, reruns, idle reserved capacity | 30% |
| Platform and Ari usage | Ari token cost, platform support, seats, licences | 60% |
| Handoff package | Handoff-phase costs, including the holdout evaluation | 45% |

Shared cost (storage, egress, rework, insurance, customer success, legal, on-call, travel) is allocated across the five pools in proportion to their direct cost. The pools always add back to the COGS total (`test/cogsbuilt.test.js`).

**Automation.** `ari.automationPct` replaces that share of human hours, which lowers the labour lines. `pricing.automationShare` decides how much of that saving the customer keeps: the cycle packages carry the rest.

**New lines in this version:** `ari` (agent tokens, at serving cost), `holdoutEval` (the final holdout evaluation, in the handoff pool), `idleCapacity` (reserved GPU hours below the target utilization).

## Known gaps

- **Final holdout evaluation compute** (handoff) is not costed in the workbook. The usage model adds it as the `holdoutEval` line; the quote is held until it is costed.
- **Customer-side data preparation** is only costed if the team adds a line for it.

## Illustrative values

The example deal fills the extension lines, the holdout evaluation (400 GPU-hours), Ari tokens (50M per cycle) and a 70% target utilization. Each is a placeholder until measured or supplied.

`data/cogs_extended_presets.json`, labelled UNVERIFIED. With the preset filled, the extension lines and the rework allowance take the example from the workbook's core COGS to the figure in the bridge on the COGS page; the figures are generated there, not typed here.
