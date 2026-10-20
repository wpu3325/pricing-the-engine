# Pricing rationale

How the $210,000 default engagement is priced, why each phase costs what it does, and what the evidence does and does not support.

## 1. The price, phase by phase

| Phase | Price | Effort (hours) | Effective rate | Share |
|---|---|---|---|---|
| 1 · Eval and environment foundation | $30,000 | 108 | ~$278/h | 14% |
| 2 · Engineering through the cycles | $78,000 | 312 | ~$250/h | 37% |
| 3 · Three RL cycles | $72,000 | (in cycle price) | $24,000 per cycle | 34% |
| 4 · Handoff and independent verification | $30,000 | (in fee) | fixed | 14% |

Effort hours come from the labour inputs (`labor.*`); no hourly rate is shown to the customer.

## 2. Readiness phase ($30K): why this price

The phase is framed as a fixed-scope build of the assets every RL cycle optimises against: a frozen held-out evaluation set, a versioned grader, a production-realistic environment, and a measured baseline. The customer owns these and can reuse them with any later model. It is not a feasibility opinion.

Four anchors:

1. **Effort.** 108 setup hours (40 research, 40 forward-deployed, 16 delivery, 12 infrastructure), 108 hours across four roles, delivered in the first two weeks. $30,000 / 108 h ≈ $278/h, inside the $200–350/h band that the sources below cite for consulting work.
2. **Share of project.** $30K is 14% of $210K. One vendor estimate puts paid discovery at 10–15% of total project cost.
3. **Absolute band.** Vendor guides cite paid discovery at $20–60K over 2–4 weeks. The phase fits that band and ends in working assets, not only a document. One guide warns that a phase producing only a document is a weak purchase; this one does not.
4. **Market structure.** Self-serve RL services bill for compute only. The OpenAI reinforcement fine-tuning billing guide lists $100 per hour of training time, with grader tokens billed separately; Fireworks bills reinforcement fine-tuning by GPU-second and does not charge for models under 16B parameters. In both cases the customer builds the evaluation, grader and environment. This phase is that same work, done with embedded engineers.

**Internal view.** The phase costs about $21–23K to deliver (setup labour $19.6K, baseline graders $1.5K, baseline evaluation GPU about $0.1K, plus 10% rework), so it earns a thin margin by design. The margin is earned in the cycles. A possible negotiation lever, not the default: credit part of the fee against Phase 3 if the customer signs within 30 days.

## 3. Where a competitor can undercut

- **Per-cycle price** (about $24,000 for roughly 1,100 GPU-hours of work) is the line most exposed to a compute-only competitor. Raw H100 compute for that work is roughly $4,000–9,000 at $3.99–8.00 per GPU-hour. The cycle price is defended by the managed loop: rollouts, environments, graders, evaluation and reporting, not by compute.
- **Foundation** is exposed to a competitor who offers the same tooling without engineers. The answer is that the customer keeps the assets, and that the engineers are the product.
- **Trade scope, not rate.** Fewer cycles, a shorter readiness phase or a narrower workflow lower the price while keeping the per-unit price at or above the floor.

## 4. Margin

- **Target 45%, floor 35%** (policy inputs, not company-published figures).
- With the workbook's cost baseline the margin is 49.2%.
- Filling the illustrative extension costs (see `COGS_LEDGER.md`) raises delivery COGS to about $130,000 and, under the rate card, lifts the quote to $236,358 to hold the 45% target. The workbook's 49% is therefore optimistic if those costs are real.

## 5. Evidence quality (read before relying on a number)

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

**Stale input:** the workbook's $3.99 PayGo H100 price is the expired promotion. It is kept for parity. The illustrative preset uses the $5.49 list price.

## 6. Known gap

The final holdout evaluation (Phase 4) runs evaluation compute that the workbook does not cost separately. Phase 4's cost is therefore understated and its margin overstated. It is flagged in `PARITY.md` (D-10) and should be costed before a quote.

## 7. GPU choice and price

The price follows cost in one place only: the RL cycle line, which is priced from the GPU-hours the cycles consume and the rate paid for them. People fees (readiness, engineering, handoff) are fixed, so the customer sees a stable rate card. Under hybrid pricing the cycle line is set so the quote lands on the target margin, whenever that is above the fixed fees.

A GPU type matters through its cost per unit of work, not its hourly rate: a faster GPU can cost less per unit of work at a higher price. It matters most when compute is a large share of cost. At the default scale, prepaid capacity and labour dominate and the GPU type barely moves the price; in the compute-heavy stress case it moves the price a lot. The numbers are on the internal pricing model page and their inputs are listed as unverified in `PARITY.md`.

## Sources

- OpenAI, Billing guide for the Reinforcement Fine-Tuning API: https://help.openai.com/en/articles/11323177-billing-guide-for-the-reinforcement-fine-tuning-api
- OpenAI, API pricing: https://platform.openai.com/docs/pricing/
- Fireworks AI, Reinforcement fine-tuning cost estimator: https://docs.fireworks.ai/fine-tuning/rft-cost-estimator
- Fireworks vs Together AI pricing comparison (third party): https://www.morphllm.com/comparisons/fireworks-vs-together
- Paid discovery phase guidance (vendor blogs, directional): https://www.agileinfoways.com/blog/ai-development-cost-2026 and https://sagnikbhattacharya.com/blog/paid-discovery-phase-ai-project
- Applied Compute, engagement model (from the supplied knowledge base): https://www.appliedcompute.com/ and https://www.appliedcompute.com/company/unlocking-the-ai-overhang
