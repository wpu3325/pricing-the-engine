# Take-home answers, mapped to the tool and to tests

Assignment: "AC GTM Take Home: Pricing the Engine". Each requirement points to where it is answered in the product and what proves it.

| # | Requirement | Answer in the product | Proof |
|---|---|---|---|
| A1 | Identify every cost line that goes into a post-training engagement | Economics → Cost build: 8 pools (FDE, research, infra, delivery labour; graders/sandboxes; storage/network; platform; GPU; rework). Explained per line via ⓘ | `test/parity.test.js` (every COGS cell matches the workbook) |
| A2 | Assumptions needed to price accurately | Deal step: each input has meaning, workbook cell and "UNVERIFIED" tags. Guide & sources lists all | `test/explain.test.js` (every field explained) |
| A3 | An asset with inputs the team can flex per deal | This tool. Inputs in Deal step; Advanced holds all workbook fields; "Save deal" / "Load deal" JSON; share links | `test/store.test.js`, `test/parity.test.js` |
| B1 | SOW and pricing proposal with rationale | Proposal step: SOW (phases, evidence, stop rules, milestones, amendment triggers) and itemised proposal with "why this price" | `test/documents.test.js` |
| B2 | Margin profile and reasoning | 45% target, 35% minimum. Economics → margin gauge; sensitivity tornado shows what moves it | `test/acceptance.test.js` (margin floor, cost-plus) |
| B3 | Contract terms: short vs long term protection | SOW sections 3 (stop rules, customer decides), 4 (milestones, paid per phase), 7 (responsibilities). Long-term: amendments in section 5 | `test/documents.test.js` |
| B4 | When to re-paper or restructure | SOW section 5 triggers: new base model, more cycles/tokens, new workflow, region/topology, production SLA, production > 80% envelope, termination | Test: serving scale recommendation (acceptance #10) |
| B5 | Defend price against cost pushback | Itemised proposal lines each map to a fee; COGS stays internal; cycle fee scales with model class; "Why this price" | Parity tests prove the internal numbers are the workbook's |
| B6 | Defend against a competitor undercutting | Economics → competitor undercut: margin if matched, walk-away price, and the rule "trade scope, not rate" | `test/sensitivity.test.js` (undercut) |

Ambiguities to raise on the walk-through (`docs/PARITY.md` §3): the deck's COGS and tier figures do not match the workbook I was given; the workbook was used throughout.
