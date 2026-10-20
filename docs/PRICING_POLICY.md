# Pricing policy

The single source of truth for how a quote is built. Other documents link here rather than restating it.

## Customer lines

A quote has three customer phases, built from five price lines:

| Phase | Price line | Built from | Margin |
|---|---|---|---|
| Setup | Setup package | Foundation-phase package costs | 45% |
| Managed cycles | Cycle packages | Engineering and cycle package costs | 45% |
| Managed cycles | Managed compute | GPU lines, dev time, reruns, idle capacity | 30% |
| Managed cycles | Platform and Ari usage | Ari tokens, platform, seats, licences | 60% |
| Handoff | Handoff package | Handoff-phase costs, including the holdout evaluation | 45% |

Each price line is its pool cost divided by (1 − its margin). Shared cost is allocated across the pools in proportion to direct cost. The pools always sum to COGS.

## Allowances and meters

- Included: a managed compute allowance (GPU-hours) and an agent-token allowance, both stated in the proposal.
- Metered beyond the allowance: GPU-hours and million tokens, at the same margins as their lines.
- Meters are reviewed quarterly against measured cost. A change applies from the next invoice and is notified in writing.
- Token meters stay provisional until serving throughput is measured on the target GPU.

## Human hours

- Hours are an internal cost. They never appear as a price line or in a customer document.
- Standard effort sets each package. The effort tier, calibration against past engagements, and the share of hours Ari replaces adjust the labour inside the packages.
- The customer keeps `pricing.automationShare` of any automation saving. The rest stays with Applied Compute.

## Holds and gates

| Status | When |
|---|---|
| `HOLD - COST GAP` | A package has no cost, or the holdout evaluation is not costed. |
| `HOLD - THROUGHPUT` | Ari tokens are priced and serving throughput is not measured. |
| `HOLD - MARGIN` | The blended margin is below the floor. |
| `HOLD - BUDGET` | The quote exceeds the customer's budget. |

A quote can be sent only at `READY FOR REVIEW`, and still needs commercial and legal review.

## Price band

The quote is shown as a band: throughput, GPU cost and effort each moved ±20% together. The band is shown on the internal pricing page and should be quoted until those inputs are measured.

## Fixed costs

Gross margin per engagement does not cover the platform team or Ari development. The fixed-cost view shows the engagements per month needed to cover them. Those monthly costs are placeholders until finance supplies them.

## Rate card

The workbook rate card ($30K readiness, $78K engineering, $24K per cycle, $30K handoff) is kept as the reference for the Excel model. It is not the customer price.
