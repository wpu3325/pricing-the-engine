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

## Known gaps

- **Final holdout evaluation compute (Phase 4)** is not costed in the workbook. Phase 4 cost is understated.
- **Customer-side data preparation** is only costed if the team adds a line for it.

## Illustrative values

`data/cogs_extended_presets.json`, labelled UNVERIFIED. With the preset filled, the extension lines total about $21,300 (including insurance) and the rework allowance adds about $11,800, bringing delivery COGS from $106,590 to about $130,000.
