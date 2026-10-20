# Walkthrough: price one deal in about 15 minutes

Follow this once from top to bottom. You will end with a quote, a margin, and a proposal you can read as the customer would.

**Before you start:** open `index.html` in a browser (or run `npm start`). Click **Start here** to read the process. Then click **Deal**.

---

## Step 1 · Customer and data
Type the customer name and the workflow (for example, *claims triage on policy documents*). Enter the number of training examples, for example `28000`.

- The panel now shows the **training compute** and the **estimated tokens per cycle**.
- Fields marked *auto from your data* are filled for you. Edit any of them and the tag changes to *reset to suggestion*.

## Step 2 · Model and method
Choose a model. The list shows candidates for your data type, with the reasons they fit and any open gates.

- The panel now shows the **quote** and **margin**. Both need a model and training examples.
- A custom model is held until it is verified.

## Step 3 · RL plan
Set the approved number of RL cycles (for example `3`), the cadence (weekly), and the success target.

- Watch the **Duration** and **Price by phase** update. Each extra cycle adds its fee, and the **last change** line shows the exact amount.

## Step 4 · Compute demand
Mostly auto-filled. Enter the measured throughput when you have it. Until then the value is marked *default*.

- Throughput is the largest unknown. The estimate moves most when it changes.

## Step 5 · GPU capacity
Enter the spare GPUs you already pay for, and the weeks they are available.

- The panel shows **GPU source**: *Existing* means no purchase is needed. Otherwise it shows the cheapest way to buy the shortfall.

## Step 6 · Delivery costs
Engineering hours by role and external costs. For a complete cost base, press **Fill illustrative estimates**. Everything it fills is editable, and **Clear** returns to the workbook baseline.

- The panel's **Where the cost goes** bars show which group drives cost. The **Delivery COGS** figure is internal.

## Step 7 · Price and margin
Set the target margin (45% by default), the customer budget, and any discount.

- If cost would push margin below the target, the price rises to the floor. The rise is shown inside the phases, not as a separate charge.

## Step 8 · Approvals
Tick the three gates: benchmark confirmed, training licence approved, GPU rate confirmed.

- Until all three are ticked, the status reads **HOLD**, and the panel lists what is missing. A quote can never be ready on an unverified assumption.

## Step 9 · Production (optional)
Only if the customer wants the model served afterwards. This is a separate monthly order and is never part of the training price.

---

## Check the result

1. The panel status reads **Ready for review**. If it still says **HOLD**, the *Before this can be quoted* list says why.
2. Open **Proposal**. Read it as the customer would: each phase should answer *what do I get* and *why does it cost this*.
3. Check the **Economics** step for the internal view: cost by phase, margin by phase, and what moves the margin most.
4. Download the **proposal** and **SOW** from the Proposal step. Send only after commercial and legal review.

## Read the status

| Shown as | Meaning |
|---|---|
| Select a model | Choose the model in step 2. |
| HOLD (any reason) | A required input or approval is missing. The panel says which. |
| Ready for review | Every gate passes. Still needs commercial and legal review before it is sent. |

## Things to remember

- Grey **default** tags mark illustrative assumptions. Replace them with real figures before relying on the price.
- The customer decides after every cycle whether to continue. A score can prompt a review, but never stops contracted work on its own.
- The internal COGS export is for Applied Compute only. Never send it to a customer.

Sample outputs: [rendered samples](https://wpu3325.github.io/pricing-the-engine/docs/samples/). Requirement map: [ANSWERS.md](ANSWERS.md).
