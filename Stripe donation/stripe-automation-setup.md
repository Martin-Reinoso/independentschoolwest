# Stripe Automation Setup

Last updated: 2026-07-17

This guide explains how to rebuild or maintain the Stripe-to-Google-Sheets automation.

It is written as a runbook for someone who was not present during the original setup.

It intentionally does **not** include live secrets.

## What This Automation Does

The automation keeps a private Google Sheet updated from Stripe so the team can track:

- new one-time donations
- monthly subscription donation payments
- payouts Stripe sends to the bank account
- payout-level reconciliation summaries

It can also post a simple Slack message when a donation arrives.

## Folder Layout

Everything Stripe-specific now lives under [`Stripe donation`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation):

- Checkout Lambda: [`Stripe donation/lambda/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/lambda/index.mjs:1)
- Webhook Lambda: [`Stripe donation/webhook/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/webhook/index.mjs:1)
- Helper scripts:
  - [`Stripe donation/scripts/stripe-embedded-checkout-server.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/stripe-embedded-checkout-server.mjs:1)
  - [`Stripe donation/scripts/export-stripe-donations.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/export-stripe-donations.mjs:1)
  - [`Stripe donation/scripts/export-stripe-reconciliation-data.py`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/export-stripe-reconciliation-data.py:1)
  - [`Stripe donation/scripts/init-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/init-stripe-google-sheet.mjs:1)
  - [`Stripe donation/scripts/backfill-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/backfill-stripe-google-sheet.mjs:1)
  - [`Stripe donation/scripts/create-stripe-reconciliation-tab.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/create-stripe-reconciliation-tab.mjs:1)
  - [`Stripe donation/scripts/repair-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/repair-stripe-google-sheet.mjs:1)
- Safe example workbook: [`Stripe donation/examples/stripe-deposit-reconciliation-example.xlsx`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/examples/stripe-deposit-reconciliation-example.xlsx)

## Architecture

### Source of truth

Stripe is the source of truth.

The Google Sheet is a reporting and operations surface built from Stripe events and Stripe backfills.

### Live flow

1. Stripe creates an event
2. Stripe sends the event to the webhook Lambda
3. The webhook Lambda verifies the Stripe signature
4. The Lambda validates the destination tab's exact headers and refuses to write if they do not match
5. The Lambda checks `Event Log` and the Stripe record IDs so retries do not create duplicate rows
6. The Lambda appends or updates rows in the correct sheet tab
7. A payout event links its charge records back to the matching rows in `Donations`
8. The `Reconciliation` tab updates automatically from formulas
9. Slack receives a short donation alert if a webhook URL is configured

## Live Event Coverage

The webhook is designed around these Stripe events:

- `checkout.session.completed`
- `invoice.paid`
- `payout.paid`

### `checkout.session.completed`

Used for successful one-time donations.

Behavior:

- fetches the full Checkout Session
- extracts donor name, donor email, message, charge info, and receipt URL
- appends one row to `Donations`
- optionally posts a Slack donation message

### `invoice.paid`

Used for successful monthly subscription donation renewals.

Behavior:

- confirms the invoice belongs to the monthly donation flow
- fetches related charge and session details where available
- appends one row to `Donations`
- optionally posts a Slack donation message

### `payout.paid`

Used when Stripe has actually issued a payout.

Behavior:

- fetches all Stripe balance transactions tied to that payout
- writes one summary row to `Payouts`
- writes detailed rows to `Payout Transactions`
- fills the payout, fee, and net columns on matching `Donations` rows
- follows Stripe pagination, including payouts containing more than 100 balance transactions

### Sheet schema contract

The header rows listed below are an API contract, not just labels. The webhook checks the complete header row before every write. If a tab has been renamed, reordered, or given an old header layout, the webhook returns an error without appending a shifted row.

The export, initialization, backfill, repair, and Lambda scripts all use the same 9-column `Payouts` schema.

## Google Sheet Structure

The workbook should contain these five tabs:

1. `Reconciliation`
2. `Donations`
3. `Payouts`
4. `Payout Transactions`
5. `Event Log`

### `Reconciliation`

Purpose:

- a clean first-tab summary for finance review
- formula-driven from `Donations` and `Payouts`
- does not require direct webhook writes

Current columns:

- `Payout Date`
- `Payout ID`
- `Trace ID`
- `Payout Amount`
- `Donations Grouped in This Payout`
- `Gross Donations in This Payout`
- `Fees / Adjustments`
- `Net Donations in This Payout`
- `Stripe Payout Status`

### `Donations`

Purpose:

- one row per actual donation payment

Headers:

```text
transaction_date
transaction_time
mode
amount
currency
payment_status
donor_email
donor_name
first_name
last_name
message
invoice_id
stripe_hosted_receipt_url
charge_id
charge_date
charge_time
gross_amount
stripe_fee
net_amount
payout_id
payout_date
payout_time
payout_arrival_date
payout_amount
payout_status
payout_trace_id
reconciliation_note
```

### `Payouts`

Purpose:

- one summary row per Stripe payout

Headers:

```text
payout_date
payout_id
trace_id
payout_amount
donations_grouped_in_this_payout
gross_donations_in_this_payout
fees_adjustments
net_donations_in_this_payout
stripe_payout_status
```

### `Payout Transactions`

Purpose:

- full Stripe balance-transaction detail behind each payout

Headers:

```text
payout_id
payout_date
payout_time
payout_arrival_date
payout_status
payout_trace_id
payout_amount
balance_transaction_id
available_on_date
reporting_category
type
description
source_id
source_object
amount
fee
net
currency
source_invoice_id
source_payment_intent_id
source_receipt_url
```

### `Event Log`

Purpose:

- store processed Stripe event IDs for idempotency

Headers:

```text
event_id
event_type
processed_at
```

## What You Need Before Setup

### Stripe

You need access to:

- the live Stripe dashboard
- webhook endpoint settings
- product and price configuration if checkout changes are needed

### AWS

You need access to the AWS account that hosts the Lambdas.

Important:

- this project was deployed in the personal AWS account, not the work AWS account
- always confirm account ID before changing Lambda configuration

### Google

You need:

- a Google Cloud project
- Google Sheets API enabled
- a Google service account
- a service-account JSON key kept outside git
- a Google Sheet shared with the service-account email as an editor

### Slack

Optional only.

If donation alerts are wanted, create a Slack incoming webhook URL for the relevant channel.

## Secrets And Environment Variables

These values belong in AWS Lambda environment variables or secure local shell variables, not in the repository.

Required for the webhook Lambda:

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
DISPLAY_TIME_ZONE=Australia/Melbourne
```

Optional:

```text
SLACK_WEBHOOK_URL=
GOOGLE_SHEETS_DONATIONS_RANGE=Donations!A:AA
GOOGLE_SHEETS_PAYOUTS_RANGE=Payouts!A:I
GOOGLE_SHEETS_PAYOUT_TXNS_RANGE=Payout Transactions!A:U
GOOGLE_SHEETS_EVENT_LOG_RANGE=Event Log!A:C
```

Important notes:

- `GOOGLE_PRIVATE_KEY` should preserve newline formatting
- if entered in the AWS console, it usually needs literal `\n`
- no live secret values should ever be committed

## Deploying The Webhook Lambda From Scratch

1. Create a new AWS Lambda function
2. Use `nodejs22.x`
3. Set handler to `index.handler`
4. Upload [`Stripe donation/webhook/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/webhook/index.mjs:1) or the packaged zip
5. Add the environment variables above
6. Create a Lambda Function URL with HTTPS access
7. Allow public Function URL invocation
8. Create a Stripe webhook endpoint pointing to that URL
9. Subscribe the Stripe endpoint to the three supported event types
10. Run a safe synthetic webhook test

## Packaging The Lambda

From repo root:

```bash
cd "Stripe donation/webhook"
zip -j stripe-webhook-automation.zip index.mjs
```

Upload the zip to the webhook Lambda.

## Initializing A New Google Sheet

After creating and sharing a new private spreadsheet, initialize the base tabs:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Stripe donation/scripts/init-stripe-google-sheet.mjs"
```

This creates or initializes:

- `Donations`
- `Payouts`
- `Payout Transactions`
- `Event Log`

## Backfilling Historical Data

Step 1. Export Stripe reconciliation data locally:

```bash
STRIPE_SECRET_KEY=REDACTED \
python3 "Stripe donation/scripts/export-stripe-reconciliation-data.py" \
  --days=90 \
  --out-dir "$HOME/Documents/random/ffe-private-runtime/stripe-recon/data"
```

Step 2. Push those CSVs into the Google Sheet:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
STRIPE_RECON_DATA_DIR="$HOME/Documents/random/ffe-private-runtime/stripe-recon/data" \
node "Stripe donation/scripts/backfill-stripe-google-sheet.mjs"
```

## Creating The Reconciliation Tab

After the raw tabs exist, build the styled first tab:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Stripe donation/scripts/create-stripe-reconciliation-tab.mjs"
```

This script:

- creates `Reconciliation` if missing
- moves it to the first tab position
- writes the summary metrics
- mirrors the payout summary table
- applies the blue accountant-friendly formatting

## Repairing Or Auditing An Existing Sheet

Use the repair script if payout columns were changed manually, an older backfill was used, or donation-to-payout links need to be rebuilt:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json \
GOOGLE_SHEETS_SPREADSHEET_ID=spreadsheet_id \
node "Stripe donation/scripts/repair-stripe-google-sheet.mjs"
```

The script:

- saves a private JSON backup under
  `$HOME/Documents/random/ffe-private-runtime/stripe-sheet-backups/`
- rebuilds `Payouts` from `Payout Transactions` using the current 9-column schema
- fills gross, fee, net, and payout fields on matching `Donations` rows
- restores the `Reconciliation` formulas to the current columns
- reapplies date, time, count, and Australian-dollar formatting

The backup directory is ignored by git because it contains private operational data.

## Manual Donation Export

For a simple recent donation CSV:

```bash
STRIPE_SECRET_KEY=REDACTED \
node "Stripe donation/scripts/export-stripe-donations.mjs" \
  --days=30 \
  --out=.codex-temp/stripe-donations-recent.csv
```

The output file should stay local because it contains donor data.

## Local Checkout Testing

To test the public page with a local endpoint:

```bash
node "Stripe donation/scripts/stripe-embedded-checkout-server.mjs"
```

This is safer than relying on `file://` testing because AWS Function URL CORS does not support the `null` origin well.

## Slack Behavior

If `SLACK_WEBHOOK_URL` is configured, the webhook sends a short message such as:

```text
New donation received
Name: Example Donor
Amount: A$100.00
Type: One-time
Message: Delighted to support this
```

If `SLACK_WEBHOOK_URL` is empty, Google Sheets syncing still works.

## Reconciliation Behavior

The `Reconciliation` tab is not directly written by the webhook.

Instead:

- `Donations` is updated by donation events
- `Payouts` is updated by payout events
- `Reconciliation` recalculates from those tabs

That means the reporting logic stays understandable:

- raw event data lives in the raw tabs
- the summary view lives in one place

## Verification Checklist

After deployment or rebuild, verify these things in order:

1. Stripe webhook endpoint is `enabled`
2. Stripe subscribed events are exactly:
   - `checkout.session.completed`
   - `invoice.paid`
   - `payout.paid`
3. AWS Lambda Function URL is reachable
4. A signed synthetic event returns `200 OK`
5. `Event Log` gets a row for the synthetic event
6. Synthetic test rows are removed after testing
7. A real donation later appears in `Donations`
8. A real payout later appears in `Payouts` and `Payout Transactions`
9. `Reconciliation` reflects the new payout automatically
10. `Payouts` has exactly the 9 documented headers in the documented order
11. The payout amount equals net donations for ordinary paid payouts

## Troubleshooting

### Webhook returns `400`

Common causes:

- wrong `STRIPE_WEBHOOK_SECRET`
- body transformed before signature verification
- missing required environment variables

### Google Sheet does not update

Common causes:

- sheet not shared with the service-account email
- wrong spreadsheet ID
- malformed `GOOGLE_PRIVATE_KEY`
- Google Sheets API not enabled

### Duplicate rows appear

Check whether:

- `Event Log` is writable
- event IDs are being recorded successfully
- the Lambda is running the current deployment package, which also deduplicates payout IDs, balance transaction IDs, charge IDs, and invoice IDs

### Values appear under the wrong payout headings

This indicates a schema mismatch. Do not move individual cells by hand. Run `repair-stripe-google-sheet.mjs`, confirm the 9 payout headers, and redeploy the current webhook package. The current Lambda refuses future writes when headers do not match.

### Donations sync but Slack is silent

Check whether:

- `SLACK_WEBHOOK_URL` is configured
- the Slack webhook is still valid

## Safe Repo Practices

- Do not commit real donation CSVs
- Do not commit the private Google service-account JSON
- Do not commit the live reconciliation workbook
- Use the sanitized example workbook in [`Stripe donation/examples`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/examples) for documentation or onboarding

## Final Takeover Advice

If someone new needs to run this system:

1. read [`Stripe donation/stripe-donation-handover.md`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/stripe-donation-handover.md:1)
2. confirm access to Stripe, AWS, Google Sheets, and Google Cloud
3. confirm which AWS account hosts the live Lambdas
4. verify the webhook subscriptions before making changes
5. make a small, reversible test first

If the Google Sheet is lost, the reporting setup can be rebuilt because Stripe remains the system of record.
