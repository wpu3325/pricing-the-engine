# Pricing the Engine

A deal tool for an enterprise reinforcement-learning (RL) post-training engagement. It turns a customer request into the cost to deliver, the price, the margin, and a proposal and statement of work the customer can read line by line.

Built for the Applied Compute take-home. Live: https://wpu3325.github.io/pricing-the-engine/ · Run locally by opening `index.html` (no server needed) or with `npm start`.

**The default example** (*Example Enterprise*, three RL cycles, one open-weight model): delivery cost **$106,590**, quote **$210,000**, margin **49.2%**. The status is **HOLD** until the model benchmark, training licence and GPU rate are confirmed, so the quote is not ready to send.

## Requirements and where they are answered

| Take-home requirement | Answer | Where |
|---|---|---|
| **A. COGS model**: every cost line, assumptions, flexible per deal | Eight workbook cost pools plus about 20 extension lines, each tagged to a delivery phase. Every input has a hover explanation with its workbook cell. | Deal sections 4–6 · Economics → cost ledger · [rendered COGS model](https://wpu3325.github.io/pricing-the-engine/docs/samples/INTERNAL_sample_cogs_model.html) · [COGS_LEDGER.md](docs/COGS_LEDGER.md) |
| A.2 Assumptions | Listed per input. Illustrative defaults are tagged *default* until replaced. | Deal sections · [PRICING_RATIONALE.md](docs/PRICING_RATIONALE.md) |
| **B. Pricing and SOW**: proposal with rationale | Four phases, each with what the customer gets, why it costs that, effort hours and when it is invoiced. | Proposal step · [rendered samples](https://wpu3325.github.io/pricing-the-engine/docs/samples/) (GitHub shows the HTML source; use the rendered link) |
| B.2 Margin profile and reasoning | 45% target, 35% floor. The Economics step shows margin by phase and the tornado of what moves it. | Economics → margin by phase, sensitivity |
| B.3 Contract terms, short vs long term | See the list below. | [rendered SOW](https://wpu3325.github.io/pricing-the-engine/docs/samples/sample_statement_of_work.html) |
| B.4 When to re-paper | Seven triggers in the SOW (new model, more cycles, new workflow or region, production, envelope, termination). | SOW section 5 |
| B.5 Pushback on cost | Every charge maps to a deliverable and to effort hours by role. Internal cost and margin never reach the customer; a test checks this. | Proposal · `test/documents.test.js` |
| B.6 A cheaper competitor | Match on scope, not rate. The calculator shows the margin left and the walk-away price. | Economics → competitor undercut |

**Contract protections.** *Now:* scope limited to one workflow and model; the customer decides after each cycle; acceptance on objective evidence; invoices by milestone; early exit pays approved work and committed third-party compute. *As the customer expands:* new model, method, region or topology needs a new order; production is a separate order with an envelope; scale reviews start at 80% of it.

## Using the tool

1. Open the **Start here** page for the process. A new deal starts empty.
2. Work through sections 1–9 in order. The panel on the right updates as you type and says what is still missing.
3. Check the **Proposal** step, then download the proposal and SOW once the status reads *ready for review*.

The full walkthrough, with the 11-step example and the glossary, is in [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md).

## Limits

- Throughput (100,000 tokens per GPU-hour) is a proxy. It is the largest unknown.
- Rates, labour, extension costs and margin policy are illustrative. The workbook's $3.99 H100 price is an expired promotion; list is $5.49.
- The final holdout evaluation (Phase 4) is not costed, so the handoff margin is overstated.
- The supplied deck shows COGS of $112,097; the workbook gives $106,590. The workbook is treated as canonical. See [PARITY.md](docs/PARITY.md).
- Legal text is placeholder. Items in [brackets] need counsel review.

## Verify

`npm run verify` runs the parity suite (17 scenarios recalculated in LibreOffice from the supplied workbook), the brief's acceptance tests, fuzz invariants, customer-safety tests and the offer arithmetic. It also checks that the built `index.html` and the sample documents are current.

## Repo

`index.html` is the built app (source in `src/`). `docs/` holds the walkthrough, the COGS ledger, the pricing rationale, the parity log, the requirement map and the samples. `data/` holds the catalogue and presets. `test/` and `e2e/` hold the tests.

No licence is granted; all rights reserved. This is a take-home submission, not an official Applied Compute document.
