# Take-home answers, mapped to the tool and to tests

Assignment: "AC GTM Take Home: Pricing the Engine". Each requirement points to where it is answered in the product and what proves it.

| # | Requirement | Answer in the product | Proof |
|---|---|---|---|
| A1 | Identify every cost line that goes into a post-training engagement | Economics → full cost ledger: about 40 lines in six groups, each tagged to a phase and sourced as workbook or extension. Listed in `docs/COGS_LEDGER.md` | `test/parity.test.js` (workbook lines match); `test/ledger.test.js` (ledger reconciles to total cost) |
| A2 | Assumptions needed to price accurately | Deal step: each input has meaning, workbook cell and "UNVERIFIED" tags. Guide & sources lists all | `test/explain.test.js` (every field explained) |
| A3 | An asset with inputs the team can flex per deal | This tool. Inputs in Deal step; Advanced holds all workbook fields; "Save deal" / "Load deal" JSON; share links | `test/store.test.js`, `test/parity.test.js` |
| B1 | SOW and pricing proposal with rationale | Proposal step: four phases, each with what the customer gets, why it costs that, effort hours and when it is invoiced; a payment schedule; what changes the price; exclusions; glossary; FAQ | `test/offer.test.js` (figures add up exactly); `test/documents.test.js` (customer-safety) |
| B2 | Margin profile and reasoning | 45% target, 35% minimum. Economics → margin gauge; sensitivity tornado shows what moves it | `test/acceptance.test.js` (margin floor, cost-plus) |
| B3 | Contract terms: short vs long term protection | SOW sections 3 (stop rules, customer decides), 4 (milestones, paid per phase), 7 (responsibilities). Long-term: amendments in section 5 | `test/documents.test.js` |
| B4 | When to re-paper or restructure | SOW section 5 triggers: new base model, more cycles/tokens, new workflow, region/topology, production SLA, production > 80% envelope, termination | Test: serving scale recommendation (acceptance #10) |
| B5 | Defend price against cost pushback | Each phase explains its cost and its effort; the readiness fee is justified against market benchmarks in `docs/PRICING_RATIONALE.md`; internal cost and margin stay internal | `test/documents.test.js`; `docs/PRICING_RATIONALE.md` |
| B6 | Defend against a competitor undercutting | Economics → competitor undercut: margin if matched, walk-away price, and the rule "trade scope, not rate" | `test/sensitivity.test.js` (undercut) |

Ambiguities to raise on the walk-through (`docs/PARITY.md` §3): the deck's COGS and tier figures do not match the workbook I was given; the workbook was used throughout.
