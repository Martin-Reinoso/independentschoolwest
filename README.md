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
  - [`Stripe donation/scripts/repair-stripe-google-sheet.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/scripts/repair-stripe-google-sheet.mjs:1)
- Sanitized workbook example: [`Stripe donation/examples/stripe-deposit-reconciliation-example.xlsx`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/Stripe%20donation/examples/stripe-deposit-reconciliation-example.xlsx)

## Security Notes

- No live Stripe keys, webhook signing secrets, Google private keys, or Slack webhook URLs should ever be committed to this repository.
- Real donation exports and reconciliation outputs can contain donor names, email addresses, messages, and payout details. Those files should stay private.
- `.gitignore` excludes the known local export locations, but maintainers should still review `git status` before committing.

## Public-Site Analytics

Google Analytics is configured for the public Families for Education website through the shared `site-analytics.js` loader.

- Analytics account: `Families for Education`
- Property: `Families for Education Website`
- Web stream: `Families for Education Website`
- Website: `https://ffe.org.au`
- Measurement ID: `G-KWF626WYP6`
- Reporting time zone: Melbourne, Australia
- Reporting currency: Australian dollar

The loader is included only on public marketing, information, event, fee, donation landing and public email-archive pages. It is deliberately absent from enrolment applications, OTP and guardian-signing pages, staff/admin pages, receipts, application-review pages and other token-bearing or sensitive workflows.

Analytics does not load until a visitor selects **Allow analytics**. A visitor can reopen the consent panel with **Analytics choices** and change their decision. The implementation:

- sends only the page origin and path, without query strings or URL fragments;
- disables Google Signals and advertising-personalisation signals;
- denies advertising storage, advertising user data and advertising personalisation;
- does not read form fields, answers, names, email addresses, uploads or payment details;
- leaves Google Analytics form-interaction and site-search measurement disabled;
- permits public-page views, scroll depth, outbound-link clicks, video engagement and file-download events after consent.

The public pages with a Content Security Policy allow only the Google endpoints documented for Google Analytics. Before release, run `node --test tests/*.test.cjs`, `node scripts/check-static-site.mjs` and `node scripts/check-public-data.mjs`. Browser verification must confirm that no Google request occurs before consent, query strings are not reported, and sensitive Rosewood pages remain tag-free even when a previous public-page consent choice exists.
