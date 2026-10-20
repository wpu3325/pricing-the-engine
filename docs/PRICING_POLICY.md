# Pricing policy

The single source of truth for how a quote is built and what the buyer is charged. Other documents link here rather than restating it. Live figures are in the block below.

<!-- numbers:begin -->
| Figure | Example deal |
|---|---|
| Quote (customer total) | $247,247 |
| Delivery COGS, risk-adjusted | $136,789 |
| Blended margin | 44.7% |
| Setup invoice (week 2) | $49,449 |
| Each cycle invoice | $57,691 |
| Acceptance payment (signed handoff) | $24,725 |
| Maximum committed fee | $247,247 |
| Overage cap (approved use) | $25,000 |
| Included GPU-hours | 3,870 |
<!-- numbers:end -->

## Customer lines and invoices

| Invoice | Price line | Built from | Margin |
|---|---|---|---|
| Setup (week 2) | Setup package | Foundation-phase package costs | 45% |
| Each cycle | Managed cycle packages | Engineering and cycle package costs, with the cycle commit discount where it applies | 45% |
| Each cycle | Managed compute (included GPU-hours) | GPU lines, dev time, reruns, idle and headroom reserve | 30% |
| Each cycle | Platform and Ari usage (included tokens) | Ari tokens, platform, seats, licences | 60% |
| Acceptance (signed handoff) | Handoff package | Handoff-phase costs, including the holdout evaluation | 45% |

Each price line is its pool cost divided by (1 − its margin). Shared cost is allocated across the pools in proportion to direct cost, so the pools always sum to COGS. The invoices split the quote by the payment shape: setup 20%, cycles 70% split evenly, acceptance 10%.

## What the buyer can be charged

- **Maximum committed fee** is the quote. It is the total of the invoices and does not rise with cycle timing.
- **Allowances** are the planned GPU-hours and agent tokens plus a buffer (15% in the example). A small overrun inside the buffer is never billed.
- **Usage above the allowances** needs the buyer's written approval, is billed at the stated rates, and is capped at 10% of the total without a further change order.
- **Committed cycles** earn 5% off the cycle packages at 4 or more cycles, and 10% at 6 or more. Only cycles committed in the order qualify.
- **Rates** are fixed for the term of the statement of work. A later order is priced at the rates then current.
- **Validity** is 30 days from issue.

## Meters

- GPU-hour overage is priced at the higher of the blended cost and the marginal price of buying one GPU-hour, divided by (1 − the compute margin). So an overage hour never loses money against buying it.
- Agent-token overage is priced at the serving cost per million tokens, divided by (1 − the platform margin). Token prices are provisional until serving throughput is measured on the target GPU.

## Human hours

- Hours are an internal cost. They never appear as a price line or in a customer document.
- Standard effort sets each package. The effort tier, calibration against past engagements and the share of hours Ari replaces adjust the labour inside the packages.
- The buyer keeps `pricing.automationShare` of any automation saving. The rest stays with Applied Compute.

## Holds and gates

| Status | When |
|---|---|
| `HOLD - COST GAP` | A package has no cost, or the holdout evaluation is not costed. |
| `HOLD - THROUGHPUT` | Ari tokens are priced and serving throughput is not measured. |
| `HOLD - MARGIN` | The blended margin is below the floor. |
| `HOLD - BUDGET` | The quote exceeds the buyer's budget. |

A quote can be sent only at `READY FOR REVIEW`, and still needs commercial and legal review.

## Price band

The quote is shown internally as a band: throughput, GPU cost and effort each moved ±20% together. It should be quoted as a single figure only once those inputs are measured.

## Fixed costs

Gross margin per engagement does not cover the platform team or Ari development. The fixed-cost view on the internal pricing page shows the engagements per month needed to cover them. Those monthly costs are placeholders until finance supplies them.

## Coverage: what the price pays for

| Pillar | How it is priced | Where the buyer sees it |
|---|---|---|
| Engineering and delivery | Standard-effort packages (setup, cycles, handoff) | Phase cards; cycle contents |
| Compute: training and rollouts | Included GPU-hours; overage metered | Allowances; usage section |
| Compute: capacity cost (idle, headroom) | Priced into the compute line, not charged separately | Included as allowances |
| Agent platform and Ari | Included tokens; overage metered | Allowances; usage section |
| Evaluation and graders | Inside the setup and cycle packages | Phase cards |
| Handoff and acceptance | Handoff package, paid on signed handoff | Acceptance payment |
| Rework and failed runs | Expected rework inside the cost base | Not shown; inside the packages |
| Platform team and Ari development | Fixed-cost recovery (internal) | Not shown to the buyer |
| Production serving | Separate order, priced after a load test | Not included section |
| Expansion (more cycles, workflows, regions) | Commit discount; change order | Change-order table |

## Rate card

The workbook rate card ($30K readiness, $78K engineering, $24K per cycle, $30K handoff) is kept as the reference for the Excel model. It is not the customer price.
