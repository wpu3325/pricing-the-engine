# Pricing rationale

Why the example deal is priced the way it is, what each part is for, and how far the evidence goes. The live figures are in the block below; the internal pricing page shows the same numbers line by line, and the policy is in [PRICING_POLICY.md](https://github.com/wpu3325/pricing-the-engine/blob/main/docs/PRICING_POLICY.md).

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

## 1. How the price is built

The price is an output of the cost model. Each customer line is its own cost pool divided by (1 − its margin):

| Customer line | What it covers | Margin |
|---|---|---|
| Setup package | Evaluation set, grader, environment and baseline | 45% |
| Managed RL cycles | Engineering, agent platform, compute and evaluation for each cycle | 45% packages, 30% compute, 60% platform and Ari usage |
| Handoff package | Independent holdout evaluation and handoff | 45% |

Each line is a different kind of work, so each has a different margin. Packages carry the 45% target. Managed compute carries 30%, because a compute-only competitor can undercut it. Platform and Ari usage carries 60%, because that is where the product is differentiated.

Human hours are never a customer line. Engineering effort sets each package from standard effort. Ari replaces some of that effort over time, and the customer keeps a set share of the saving. The rest stays with Applied Compute, so the business earns more as Ari automates the work.

For the buyer, the invoices are the setup at the gate, one per cycle, and the acceptance payment on signed handoff. The total is the maximum committed fee; the customer copy states it in the same words.

## 2. Why this structure

- **Defensible.** Every dollar of price traces to a cost pool, and the pools add back to COGS. A challenge on any line is a question about that line's cost.
- **Protects margin as the work grows.** Usage above the allowances is metered at the marginal cost of buying GPU time, so an overage hour never loses money. Usage above the allowances needs written approval, up to a cap.
- **Fair to the buyer.** A 15% buffer in the allowances means a small overrun is never billed. Committing to four or more cycles earns a lower cycle price.
- **Honest about what is unknown.** Ari token prices stay provisional until serving throughput is measured. The quote is held rather than sent on a guess.
- **Stops are cheap to exit.** Payment is back-loaded so the margin holds at every stop point, and the buyer can see what each stop costs them.

## 3. Where a competitor can undercut

- **Managed compute** is the exposed line. A compute-only competitor sells raw GPU time. The defence is the managed loop, not the GPU.
- **The packages** are exposed to a competitor who offers the same tooling without engineers. The answer is that the buyer keeps the evaluation, grader and environment, and the engineers are part of the product.
- **Trade scope, not rate.** Fewer cycles, a narrower workflow or a smaller automation share lower the price while the line margins stay intact.

## 4. Evidence quality (read before relying on a number)

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

## 5. Buyer questions and answers

These are the questions a buyer will ask, with the answer and where the customer copy gives it.

| Question | Answer | Where in the copy |
|---|---|---|
| Why do I pay for setup before training? | The setup builds the evaluation and grader you keep. Without it no cycle is measurable. | Setup package; FAQ |
| Is engineering billed by the hour? | No. It is inside the setup and cycle prices. You are not invoiced for hours. | FAQ; cycle phase |
| What does a cycle include? | The engineers who run it, the agent platform, the compute to train and roll out, and the held-out evaluation. | What one cycle includes |
| What is the most I can be charged? | The maximum committed fee. Usage above allowances needs your approval, up to a cap. | What you can be charged |
| What if the model does not improve? | Fees are not contingent on the score. Reaching the target or a plateau triggers a review; you decide. | Stop points note; SOW section 3 |
| What do I pay if I stop early? | The invoices up to the stop point, and nothing more. | Stop-point table |
| Why does an extra cycle cost less than the average invoice? | An added cycle adds only its own compute, platform use and engineering. Invoices are a split of the cycle total, not a price per cycle. | Change-order note |
| Are the usage rates fair against buying GPUs? | Overage is priced at the higher of the blended cost and the marginal price of buying one GPU-hour, plus margin. | Usage section |
| What do I own after handoff? | The weights, grader, evaluation set and environment, subject to licence terms counsel will confirm. | Ownership (placeholder) |
| Can I cap spend? | Yes: the maximum committed fee, and the overage cap. | What you can be charged |

## 6. Known gap

The final holdout evaluation is costed as its own line (`holdoutEval`). The example enters an illustrative number of GPU-hours. Until the team measures it, the quote is held (`HOLD - COST GAP` fires only when it is zero). The handoff package is the smallest customer line, because its cost is verifier labour and the holdout evaluation. Review it before a quote goes out.

## 6. Sources

- OpenAI, Billing guide for the Reinforcement Fine-Tuning API: https://help.openai.com/en/articles/11323177-billing-guide-for-the-reinforcement-fine-tuning-api
- OpenAI, API pricing: https://platform.openai.com/docs/pricing/
- Fireworks AI, Reinforcement fine-tuning cost estimator: https://docs.fireworks.ai/fine-tuning/rft-cost-estimator
- Fireworks vs Together AI pricing comparison (third party): https://www.morphllm.com/comparisons/fireworks-vs-together
- Paid discovery phase guidance (vendor blogs, directional): https://www.agileinfoways.com/blog/ai-development-cost-2026 and https://sagnikbhattacharya.com/blog/paid-discovery-phase-ai-project
- Applied Compute, engagement model (from the supplied knowledge base): https://www.appliedcompute.com/ and https://www.appliedcompute.com/company/unlocking-the-ai-overhang
