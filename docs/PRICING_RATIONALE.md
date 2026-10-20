# Pricing rationale

Why the example deal is priced the way it is, what each part is for, and how far the evidence goes. The line-by-line numbers and the live inputs are on the internal pricing model page. The policy itself is in [PRICING_POLICY.md](https://github.com/wpu3325/pricing-the-engine/blob/main/docs/PRICING_POLICY.md).

## 1. How the price is built

The price is an output of the cost model. Each customer line is its own cost pool divided by (1 − its margin):

| Customer line | What it covers | Margin | Example |
|---|---|---|---|
| Setup package | Evaluation set, grader, environment and baseline | 45% | $61,952 |
| Managed RL cycles | Three cycles: engineering, agent platform, compute and evaluation | 45% and 30% and 60% | $174,860 |
| Handoff package | Independent holdout evaluation and handoff | 45% | $7,106 |
| **Total** | | **44.6% blended** | **$243,918** |

Each line is a different kind of work, so each has a different margin. Packages carry 45%, the target. Managed compute carries 30%, because it is the part a compute-only competitor can undercut. Platform and Ari usage carries 60%, because that is where the product is differentiated.

Human hours are never a customer line. Engineering effort sets each package from standard effort. Ari replaces some of that effort over time, and the customer keeps a set share of the saving (`pricing.automationShare`, 50% in the example). The rest stays with Applied Compute, so the business gets more margin as Ari automates the work.

## 2. Why this structure

- **Defensible.** Every dollar of price traces to a cost pool, and every pool adds back to COGS. A challenge on any line is a question about that line's cost, not about a rate card.
- **Sustainable.** Usage meters (extra GPU-hours and agent tokens) move cost to the customer when the workload grows, so margin does not erode with scope.
- **Protects the margin.** Fixed packages carry a margin floor. The quote is held (`HOLD - COST GAP`, `HOLD - THROUGHPUT`, `HOLD - MARGIN`) when a cost is missing, unmeasured, or too thin.
- **Honest about what is unknown.** Ari token prices stay provisional until serving throughput is measured. The quote is shown as a band until then.

## 3. Where a competitor can undercut

- **Managed compute** is the exposed line. A compute-only competitor sells raw GPU time, so the managed compute margin is kept at 30%. The defence is the managed loop, not the GPU.
- **The packages** are exposed to a competitor who offers the same tooling without engineers. The answer is that the customer keeps the evaluation, grader and environment, and the engineers are part of the product.
- **Trade scope, not rate.** Fewer cycles, a narrower workflow, or a smaller automation share lower the price while the line margins stay intact.

## 4. Margin

- Target 45% blended, floor 35% (policy inputs, not company-published figures).
- The example lands at 44.6% blended, just under the target, because the managed compute and handoff costs are set from illustrative inputs.
- The price band moves about ±15% when throughput, GPU cost and effort each move by 20% together. Quote the band until those inputs are measured.

## 3. Evidence quality (read before relying on a number)

| Evidence | What it supports | Strength |
|---|---|---|
| OpenAI billing guide and pricing page | Compute-only price for RL training ($100/h), grader cost separate | Official, but the page says the fine-tuning platform is being wound down |
| Fireworks cost-estimator docs | GPU-second billing; free under 16B parameters | Official |
| Together AI H100 pricing | $3.99/GPU-h is a promotion through 2026-09-30; list $5.49 | Third-party comparison, check provider page |
| Fireworks on-demand H100 | $8.00/h | Third-party comparison |
| Paid-discovery benchmarks ($20–60K, 2–4 weeks, 10–15% of project) | Phase size and share | Vendor blogs with a commercial stake; directional only |
| Consultant rates ($200–350/h) | Effort rate band | Vendor blog; directional only |
| Applied Compute's own description (co-designed evals, evals in production-like environments, Embedded and Managed modes) | Supports the foundation framing | Company site, via the supplied knowledge base |

**Not found:** a public enterprise RL managed-service price list for any provider. The price is therefore a reasoned position, not a market-rate quote.

**Stale input:** the workbook's $3.99 PayGo H100 price is the expired promotion. The example uses the $5.49 list price.

## 6. Known gap

The final holdout evaluation is costed as its own line (`holdoutEval`), but the example's 400 GPU-hours is illustrative. Until the team measures it, the quote is held (`HOLD - COST GAP`). The handoff package also looks small against the setup package: its cost is the verifier's labour and the holdout evaluation, so it should be reviewed before a quote goes out.

## 5. Sources

- OpenAI, Billing guide for the Reinforcement Fine-Tuning API: https://help.openai.com/en/articles/11323177-billing-guide-for-the-reinforcement-fine-tuning-api
- OpenAI, API pricing: https://platform.openai.com/docs/pricing/
- Fireworks AI, Reinforcement fine-tuning cost estimator: https://docs.fireworks.ai/fine-tuning/rft-cost-estimator
- Fireworks vs Together AI pricing comparison (third party): https://www.morphllm.com/comparisons/fireworks-vs-together
- Paid discovery phase guidance (vendor blogs, directional): https://www.agileinfoways.com/blog/ai-development-cost-2026 and https://sagnikbhattacharya.com/blog/paid-discovery-phase-ai-project
- Applied Compute, engagement model (from the supplied knowledge base): https://www.appliedcompute.com/ and https://www.appliedcompute.com/company/unlocking-the-ai-overhang
