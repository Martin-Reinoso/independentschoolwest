# independentschoolwest

This repository contains the public website and supporting operational assets for Families for Education.

## Stripe Donation System

The Stripe donation flow now has two separate AWS Lambda functions:

- a checkout-session Lambda used by [`donate.html`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.html:1)
- a webhook automation Lambda that writes donations and payouts into Google Sheets

Start here for handover:

- [`Stripe donation/stripe-donation-handover.md`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/stripe-donation-handover.md:1)
- [`Stripe donation/stripe-automation-setup.md`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/stripe-automation-setup.md:1)

## Reference Assets

- Checkout Lambda source: [`Stripe donation/lambda/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/lambda/index.mjs:1)
- Webhook Lambda source: [`Stripe donation/webhook/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/webhook/index.mjs:1)
- Stripe helper scripts:
  - [`Stripe donation/scripts/stripe-embedded-checkout-server.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/stripe-embedded-checkout-server.mjs:1)
  - [`Stripe donation/scripts/export-stripe-donations.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/export-stripe-donations.mjs:1)
  - [`Stripe donation/scripts/export-stripe-reconciliation-data.py`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/export-stripe-reconciliation-data.py:1)
- Google Sheet rebuild scripts:
  - [`Stripe donation/scripts/init-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/init-stripe-google-sheet.mjs:1)
  - [`Stripe donation/scripts/backfill-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/backfill-stripe-google-sheet.mjs:1)
  - [`Stripe donation/scripts/create-stripe-reconciliation-tab.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/create-stripe-reconciliation-tab.mjs:1)
- Sanitized workbook example: [`Stripe donation/examples/stripe-deposit-reconciliation-example.xlsx`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/examples/stripe-deposit-reconciliation-example.xlsx)

## Security Notes

- No live Stripe keys, webhook signing secrets, Google private keys, or Slack webhook URLs should ever be committed to this repository.
- Real donation exports and reconciliation outputs can contain donor names, email addresses, messages, and payout details. Those files should stay private.
- `.gitignore` excludes the known local export locations, but maintainers should still review `git status` before committing.
