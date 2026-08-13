# Stripe Donation Handover

Last updated: 2026-07-17

This file is the main handover document for the Families for Education Stripe donation system.

It explains:

- what is live today
- which AWS and Stripe components are involved
- how donations reach the website, Stripe, AWS, Google Sheets, and the bank
- what was built during the July 2026 automation work
- which repo files matter if someone new needs to take over

It intentionally does **not** store any live secret values.

## System Summary

The live donation stack now has two separate AWS Lambda functions:

1. `ffe-stripe-donations`
This creates Stripe Checkout Sessions for the public donation page.

2. `ffe-stripe-webhook-automation`
This receives Stripe webhooks and writes operational records into Google Sheets.

That separation matters:

- the donation page continues to work even if reporting changes later
- the webhook/reporting automation can be redeployed without changing the checkout flow
- payout reconciliation and Slack alerts are handled outside the public website path

## High-Level Flow

### Public donation flow

1. A donor opens [https://ffe.org.au/donate.html](https://ffe.org.au/donate.html)
2. The page calls the checkout Lambda
3. The Lambda creates a Stripe Checkout Session
4. Stripe Embedded Checkout collects payment
5. Stripe completes the payment or subscription setup

### Reporting / bookkeeping flow

1. Stripe sends webhook events to the webhook Lambda
2. The webhook Lambda verifies the Stripe signature
3. The Lambda writes rows into Google Sheets
4. The Google Sheet recalculates the `Reconciliation` tab automatically from the other tabs
5. If Slack is configured, the Lambda posts a simple donation alert

## What Was Added In July 2026

The automation and reconciliation work completed on 2026-07-04 included:

- creating a separate webhook Lambda so reporting does not interfere with checkout
- wiring Stripe webhook events into Google Sheets
- backfilling recent live Stripe donations and payouts into a shared workbook
- adding a `Reconciliation` tab as the first Google Sheet tab
- verifying live end-to-end webhook delivery with a signed synthetic event
- cleaning the synthetic test rows back out so the workbook remained clean
- creating repo-safe helper scripts so the workbook can be rebuilt later
- creating a sanitized example workbook for future reference

The maintenance work completed on 2026-07-17 included:

- migrating the live `Payouts` tab from its legacy 18-column layout to the documented 9-column layout
- rebuilding all payout summaries from `Payout Transactions`
- linking all existing donation rows to their authoritative payout transactions
- restoring the `Reconciliation` formulas to the current columns
- adding exact header validation so the Lambda refuses shifted writes
- adding record-level deduplication for webhook retries and partial failures
- adding pagination for payouts with more than 100 balance transactions
- aligning the export and backfill scripts with the same payout schema
- deploying and replay-testing the reporting Lambda without changing the checkout Lambda

## Live Components

### Public donation page

- Live page: [https://ffe.org.au/donate.html](https://ffe.org.au/donate.html)
- Page source: [`donate.html`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.html:1)
- Page styles: [`donate.css`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.css:1)

### Checkout Lambda

- Function name: `ffe-stripe-donations`
- Region: `ap-southeast-2`
- Runtime: `nodejs22.x`
- Handler: `index.handler`
- Purpose: create Stripe Checkout Sessions for one-time and monthly gifts
- Source: [`Stripe donation/lambda/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/lambda/index.mjs:1)
- Deployment zip reference: [`Stripe donation/lambda/stripe-donations-lambda.zip`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/lambda/stripe-donations-lambda.zip)

### Webhook Lambda

- Function name: `ffe-stripe-webhook-automation`
- Region: `ap-southeast-2`
- Runtime: `nodejs22.x`
- Handler: `index.handler`
- Purpose: write donations, payouts, payout transactions, and event log records into Google Sheets
- Source: [`Stripe donation/webhook/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/webhook/index.mjs:1)
- Deployment zip reference: [`Stripe donation/webhook/stripe-webhook-automation.zip`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/webhook/stripe-webhook-automation.zip)
- Helper env-prep script: [`Stripe donation/webhook/prepare-webhook-env.py`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/webhook/prepare-webhook-env.py:1)
- Sheet repair script: [`Stripe donation/scripts/repair-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/repair-stripe-google-sheet.mjs:1)

### Stripe webhook endpoint

The live Stripe webhook endpoint currently points at the webhook Lambda Function URL and is subscribed to:

- `checkout.session.completed`
- `invoice.paid`
- `payout.paid`

These three events cover:

- one-time donations
- monthly donation renewals
- Stripe payouts deposited toward the bank account

### Google Sheets workbook

The live operational workbook is private and shared with a Google service account.

Important:

- the live workbook URL and service-account private key should stay outside git
- the workbook contains donor information and payout records
- the repo includes scripts and a sanitized example workbook, not the live private workbook

## Repo Files You Need To Know

### Donation page and checkout

- [`donate.html`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.html:1)
- [`donate.css`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.css:1)
- [`Stripe donation/lambda/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/lambda/index.mjs:1)
- [`Stripe donation/scripts/stripe-embedded-checkout-server.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/stripe-embedded-checkout-server.mjs:1)

### Reporting, exports, and reconciliation

- [`Stripe donation/webhook/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/webhook/index.mjs:1)
- [`Stripe donation/stripe-automation-setup.md`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/stripe-automation-setup.md:1)
- [`Stripe donation/scripts/export-stripe-donations.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/export-stripe-donations.mjs:1)
- [`Stripe donation/scripts/export-stripe-reconciliation-data.py`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/export-stripe-reconciliation-data.py:1)
- [`Stripe donation/scripts/init-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/init-stripe-google-sheet.mjs:1)
- [`Stripe donation/scripts/backfill-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/backfill-stripe-google-sheet.mjs:1)
- [`Stripe donation/scripts/create-stripe-reconciliation-tab.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/create-stripe-reconciliation-tab.mjs:1)

### Safe reference assets

- Sanitized example workbook: [`Stripe donation/examples/stripe-deposit-reconciliation-example.xlsx`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/examples/stripe-deposit-reconciliation-example.xlsx)
- Example workbook notes: [`Stripe donation/examples/README.md`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/examples/README.md:1)

## Stripe Products And Prices

### One-time product

- Product ID: `prod_UUUxDVM8bDhgFh`
- Name: `Families for Education Ltd One-time Gift`

### Monthly product

- Product ID: `prod_UUUxROpTAk7mfZ`
- Name: `Families for Education Ltd Monthly Gift`

### One-time fixed prices

- `A$20` -> `price_1TVXGcPJukgoPLm77XhWQ2ol`
- `A$50` -> `price_1TVVxxPJukgoPLm7fKxukt8F`
- `A$100` -> `price_1TVVxyPJukgoPLm7agy3WbnR`
- `A$250` -> `price_1TVXGdPJukgoPLm72lBdV7QK`
- `A$500` -> `price_1TVVxzPJukgoPLm7SWAu3TDb`

### Monthly fixed prices

- `A$20/month` -> `price_1TVXGePJukgoPLm7EFc36Nbq`
- `A$50/month` -> `price_1TVVy0PJukgoPLm7SBXcVCRN`
- `A$100/month` -> `price_1TVVy1PJukgoPLm7eoRywgNa`
- `A$250/month` -> `price_1TVXGfPJukgoPLm7tlLWqX9E`
- `A$500/month` -> `price_1TVVy3PJukgoPLm7I8ADfmQJ`

Custom one-time donations are created dynamically and do not need pre-created Stripe prices.

## How The Donation Page Works

The public page currently supports:

- one-time fixed donations
- one-time custom whole-dollar donations
- monthly fixed donations

The page collects:

- first name
- last name
- optional message

The checkout Lambda uses Stripe Embedded Checkout and returns a session to the page.

Important behavior:

- one-time donations rely on Stripe receipts rather than invoice emails
- monthly donations are created as Stripe subscriptions
- publishable Stripe configuration is in the front-end page
- secret Stripe configuration stays in AWS Lambda environment variables

## How The Webhook Automation Works

The webhook Lambda:

1. checks required environment variables
2. reads the raw request body
3. verifies the Stripe webhook signature
4. rejects duplicate event IDs using `Event Log`
5. branches by event type
6. appends rows to the correct Google Sheets tabs
7. optionally posts a Slack notification

### Event routing

`checkout.session.completed`

- used for paid one-time donations
- appends a row to `Donations`

`invoice.paid`

- used for monthly subscription donation renewals
- appends a row to `Donations`

`payout.paid`

- used when Stripe groups funds and pays out to the bank
- appends one summary row to `Payouts`
- appends many underlying balance-transaction rows to `Payout Transactions`
- updates matching `Donations` rows with gross, fee, net, payout, status, and trace information

Before any write, the Lambda checks the exact header row for the destination tab. It refuses the write if the schema differs. It also checks Stripe record IDs independently of `Event Log`, which prevents duplicates if a previous webhook attempt completed only part of its work.

Every successfully processed event:

- appends one row to `Event Log`

That `Event Log` tab is used for lightweight idempotency so Stripe retries do not create duplicate entries.

## Google Sheet Design

The workbook is designed to be accountant-friendly and operationally simple.

### Tabs

`Reconciliation`

- first tab
- styled summary tab
- formula-driven
- pulls from `Donations` and `Payouts`
- updates automatically when those tabs change

`Donations`

- one row per donation payment
- includes donor name, donor email, message, charge and payout information when available

`Payouts`

- one row per Stripe payout paid to the bank
- summarizes how many donations were grouped into that payout and the total fees/adjustments

`Payout Transactions`

- underlying Stripe balance transactions for each payout
- useful for auditors or accountants who need the detail

`Event Log`

- internal idempotency log
- not meant as an accounting report

## Reconciliation Logic

The current reconciliation approach is payout-authoritative.

That means:

- the `Payouts` tab reflects actual Stripe payout records
- the `Payout Transactions` tab reflects the underlying Stripe balance transactions inside each payout
- the `Reconciliation` tab summarizes the payout-level view

This is important because Stripe may:

- group multiple donations into one payout
- delay availability of a donation to a later payout
- include fees or adjustments that make payout amount differ from gross donation total

The key formula relationship is:

- gross donations in a payout
- minus fees / adjustments
- equals net donations in that payout
- which should match the Stripe payout amount for normal paid payouts

## Testing And Verification Already Performed

The following checks were completed on 2026-07-04:

- the webhook Lambda was deployed in the personal AWS account, not the work account
- the Stripe webhook endpoint was confirmed live and enabled
- the endpoint subscription list matched the Lambda code
- a signed synthetic webhook event was sent successfully to the live Function URL
- the webhook returned `200 OK`
- the synthetic event was recorded in `Event Log`
- the synthetic event rows were then deleted so the workbook stayed clean
- the `Reconciliation` tab was created and moved to the first position

Additional checks completed on 2026-07-17:

- real donation and payout webhook records were confirmed in the live workbook
- all 12 existing payout summaries were recalculated from the detailed transactions
- all 33 existing donation rows were linked to paid payouts
- the payout total and grouped net total both reconciled to `A$20,205.63` at the time of verification
- an actual signed `payout.paid` event was replayed with a temporary event ID against the deployed Lambda
- the replay added zero duplicate payouts and zero duplicate balance transactions
- the replay relinked the correct donation and returned `200 OK`
- the temporary verification event was removed from `Event Log`

These totals are a dated verification snapshot, not a permanent expected balance. They will change as new donations and payouts arrive.

## Local Development And Manual Reporting

### Embedded checkout local server

Use:

```bash
node "Stripe donation/scripts/stripe-embedded-checkout-server.mjs"
```

This is useful when testing the page locally with a real browser origin such as `http://localhost`.

### Donation CSV export

Use:

```bash
STRIPE_SECRET_KEY=REDACTED node "Stripe donation/scripts/export-stripe-donations.mjs" --days=30 --out=.codex-temp/stripe-donations-recent.csv
```

### Reconciliation export

Use:

```bash
STRIPE_SECRET_KEY=REDACTED python3 "Stripe donation/scripts/export-stripe-reconciliation-data.py" --days=90 --out-dir "$HOME/Documents/random/ffe-private-runtime/stripe-recon/data"
```

These exports are useful for:

- manual audit work
- rebuilding the Google Sheet
- generating private workbook outputs for accounting

## Rebuilding The Google Sheet

If the private workbook ever needs to be rebuilt:

1. create or choose a Google Sheet
2. share it with the Google service account as an editor
3. initialize the four raw tabs
4. backfill historical Stripe data if needed
5. create the `Reconciliation` tab
6. point the webhook Lambda to that spreadsheet ID

Use:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Stripe donation/scripts/init-stripe-google-sheet.mjs"
```

Then:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
STRIPE_RECON_DATA_DIR=/path/to/recon-data \
node "Stripe donation/scripts/backfill-stripe-google-sheet.mjs"
```

Then:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Stripe donation/scripts/create-stripe-reconciliation-tab.mjs"
```

If an existing workbook has an old payout layout or broken links, run:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Stripe donation/scripts/repair-stripe-google-sheet.mjs"
```

This makes a private backup under `.codex-temp`, rebuilds the payout summaries and donation links from the detailed transaction tab, and restores the current formulas and formats.

## Redeploying Lambdas

### Checkout Lambda

From repo root:

```bash
cd "Stripe donation/lambda"
zip -j stripe-donations-lambda.zip index.mjs
```

Upload that zip to `ffe-stripe-donations`.

### Webhook Lambda

From repo root:

```bash
cd "Stripe donation/webhook"
zip -j stripe-webhook-automation.zip index.mjs
```

Upload that zip to `ffe-stripe-webhook-automation`.

After deployment, confirm:

- handler is still `index.handler`
- Function URL still exists
- environment variables are still present
- Stripe webhook endpoint still points to the correct Function URL

## Operational Gotchas

### Work AWS account vs personal AWS account

There are separate AWS identities in use.

The live Stripe Lambdas for this project were managed in the personal AWS account, not the work account.

Anyone taking over should confirm the active AWS account before changing anything.

### Secrets are not in git

Live secrets remain outside the repo:

- Stripe secret keys
- Stripe webhook signing secret
- Google service-account private key
- Slack incoming webhook URL

If those are ever lost, they must be re-created or rotated from the provider dashboards.

### Slack is optional

The webhook supports Slack alerts, but Slack is not required for the Google Sheets sync to work.

If Slack is not configured, donation and payout syncing still works.

### Real exports are sensitive

Local CSV and XLSX exports may contain:

- donor names
- donor email addresses
- donor messages
- payout identifiers
- payout amounts

These should stay private. The repo-safe example workbook is sanitized for that reason.

## If Someone New Takes Over

Recommended first steps:

1. Read this file
2. Read [`Stripe donation/stripe-automation-setup.md`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/stripe-automation-setup.md:1)
3. Confirm access to:
   - Stripe dashboard
   - personal AWS account hosting the Lambdas
   - Google Sheet and Google Cloud service account
4. Review both Lambda source files
5. Send one synthetic webhook test before making changes
6. Avoid rotating secrets unless necessary

If the live workbook is ever lost, the reporting system can be rebuilt from Stripe because Stripe remains the source of truth.
