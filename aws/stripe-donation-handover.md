# Stripe Donation Handover

Last updated: 2026-05-11

This file documents the current Stripe donation setup for `https://ffe.org.au/donate.html`, including:

- the live AWS Lambda endpoint
- the Stripe products and prices in use
- the repo files that power the page
- the deployment/update steps
- the main gotchas discovered during setup

It intentionally does **not** store any live secret values.

## Overview

The Stripe donation page uses:

- a static front end in [`donate.html`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.html:1)
- styling in [`donate.css`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.css:1)
- a live AWS Lambda function that creates Stripe Checkout Sessions
- Stripe Embedded Checkout rendered on the page

The old Raisely donate page has been replaced, so [`donate.html`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.html:1) is now the live Stripe donation page.

## Repo Files

- Front end page: [`donate.html`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.html:1)
- Front end styles: [`donate.css`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.css:1)
- AWS Lambda source: [`aws/lambda/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/aws/lambda/index.mjs:1)
- Local test server: [`scripts/stripe-embedded-checkout-server.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/scripts/stripe-embedded-checkout-server.mjs:1)
- Payment logos: [`img/donation page images`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/img/donation%20page%20images)

Generated deployment artifact:

- [`aws/lambda/stripe-donations-lambda.zip`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/aws/lambda/stripe-donations-lambda.zip:1)

The zip is a generated artifact and is currently **not committed**.

## Public URLs

- Live donation page: [https://ffe.org.au/donate.html](https://ffe.org.au/donate.html)
- Live Lambda Function URL base: [https://yc7kml3pbslhxfhkqiluj2hth40zuzpr.lambda-url.ap-southeast-2.on.aws/](https://yc7kml3pbslhxfhkqiluj2hth40zuzpr.lambda-url.ap-southeast-2.on.aws/)
- Live Lambda session endpoint: [https://yc7kml3pbslhxfhkqiluj2hth40zuzpr.lambda-url.ap-southeast-2.on.aws/create-checkout-session](https://yc7kml3pbslhxfhkqiluj2hth40zuzpr.lambda-url.ap-southeast-2.on.aws/create-checkout-session)

## Front End Configuration

Current Stripe config is set in [`donate.html`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/donate.html:270):

- publishable key: stored directly in page config
- session endpoint: the Lambda Function URL above
- return URL: `https://ffe.org.au/donate.html`

The page currently supports:

- one-time donations:
  - fixed: `20`, `50`, `100`, `250`, `500`
  - custom: whole-dollar values, minimum `A$1`
- monthly donations:
  - fixed only: `20`, `50`, `100`, `250`, `500`

The page collects:

- first name
- last name
- optional message

through Stripe Checkout custom fields.

## AWS Configuration

### Lambda

Current live Lambda configuration:

- function name: `ffe-stripe-donations`
- region: `ap-southeast-2`
- runtime: `nodejs22.x`
- handler: `index.handler`
- role: `arn:aws:iam::274319535046:role/ffe-stripe-donations-lambda-role`
- memory: `256 MB`
- timeout: `15 seconds`
- log group: `/aws/lambda/ffe-stripe-donations`

Current environment variables in AWS:

- `STRIPE_SECRET_KEY`
- `ALLOWED_ORIGINS`
- `RETURN_URL`

Current configured values:

- `ALLOWED_ORIGINS=https://ffe.org.au,https://www.ffe.org.au,http://127.0.0.1,http://localhost`
- `RETURN_URL=https://ffe.org.au/donate.html?v=20260511-3`

Do **not** commit the live secret key into the repo.

### Function URL

Current Function URL settings:

- auth type: `NONE`
- invoke mode: `BUFFERED`

CORS:

- allow origins:
  - `https://ffe.org.au`
  - `https://www.ffe.org.au`
  - `http://127.0.0.1`
  - `http://localhost`
- allow methods:
  - `GET`
  - `POST`
- allow headers:
  - `content-type`
- max age:
  - `86400`

### Lambda Resource Policy

The function needs **both** public permissions below for Function URL invocation:

- `lambda:InvokeFunctionUrl`
- `lambda:InvokeFunction` with `InvokedViaFunctionUrl=true`

These were required to avoid `Forbidden` errors from the Function URL.

## Stripe Configuration

### Account

The Stripe account in use is the Families for Education live account already connected to Raisely.

### Payment Method Domains

The following relevant payment method domains are enabled:

- `ffe.org.au`
- `www.ffe.org.au`
- `js.stripe.com`
- `checkout.stripe.com`
- `buy.stripe.com`
- legacy Raisely domains:
  - `families-for-education.raisely.com`
  - `families-for-education.raiselysite.com`

The `ffe.org.au` and `www.ffe.org.au` registrations were important for Embedded Checkout and wallet support.

### Supported Payment Methods

Current checkout sessions use:

- `payment_method_types[0]=card`

That supports normal card rails including:

- Visa
- Mastercard
- Amex

And, where eligible on the donor’s device/browser:

- Apple Pay
- Google Pay
- Link

### Stripe Products

One-time product:

- product id: `prod_UUUxDVM8bDhgFh`
- name: `Families for Education One-time Gift`

Monthly product:

- product id: `prod_UUUxROpTAk7mfZ`
- name: `Families for Education Monthly Gift`

### Stripe Price Map

One-time fixed prices:

- `A$20` -> `price_1TVXGcPJukgoPLm77XhWQ2ol`
- `A$50` -> `price_1TVVxxPJukgoPLm7fKxukt8F`
- `A$100` -> `price_1TVVxyPJukgoPLm7agy3WbnR`
- `A$250` -> `price_1TVXGdPJukgoPLm72lBdV7QK`
- `A$500` -> `price_1TVVxzPJukgoPLm7SWAu3TDb`

Monthly fixed prices:

- `A$20/month` -> `price_1TVXGePJukgoPLm7EFc36Nbq`
- `A$50/month` -> `price_1TVVy0PJukgoPLm7SBXcVCRN`
- `A$100/month` -> `price_1TVVy1PJukgoPLm7eoRywgNa`
- `A$250/month` -> `price_1TVXGfPJukgoPLm7tlLWqX9E`
- `A$500/month` -> `price_1TVVy3PJukgoPLm7I8ADfmQJ`

Custom one-time donations are created dynamically using inline `price_data` and do not require pre-created Stripe prices.

## Checkout Session Behavior

Current session behavior in [`aws/lambda/index.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/aws/lambda/index.mjs:67):

- `ui_mode=embedded_page`
- `redirect_on_completion=if_required`
- `return_url=https://ffe.org.au/donate.html`
- `billing_address_collection=auto`
- `payment_method_types[0]=card`

Custom fields:

- `first_name`
- `last_name`
- `message`

One-time donations:

- use `customer_creation=always`
- use `invoice_creation[enabled]=true`
- support custom amounts from `A$1`

Monthly donations:

- fixed amount only
- create subscription-mode Checkout Sessions

## Local Development

For local testing there is a helper server:

- [`scripts/stripe-embedded-checkout-server.mjs`](/Users/jativaf/Library/CloudStorage/OneDrive-TheUniversityofMelbourne/Documents/GitHub/independentschoolwest/scripts/stripe-embedded-checkout-server.mjs:1)

Example:

```bash
export STRIPE_SECRET_KEY='REDACTED'
node scripts/stripe-embedded-checkout-server.mjs
```

That serves:

- `http://127.0.0.1:8787/create-checkout-session`

Important limitation:

- `file://` previews are not a reliable test path for the live Lambda because AWS Function URL CORS cannot allow the `null` origin.
- Prefer:
  - `http://localhost`
  - `http://127.0.0.1`
  - or the deployed site

## Redeploying Lambda

From repo root:

```bash
cd aws/lambda
zip -j stripe-donations-lambda.zip index.mjs
aws lambda update-function-code \
  --region ap-southeast-2 \
  --function-name ffe-stripe-donations \
  --zip-file fileb://stripe-donations-lambda.zip
aws lambda wait function-updated-v2 \
  --region ap-southeast-2 \
  --function-name ffe-stripe-donations
```

If environment variables need updating:

```bash
aws lambda update-function-configuration \
  --region ap-southeast-2 \
  --function-name ffe-stripe-donations \
  --environment '{"Variables":{"STRIPE_SECRET_KEY":"REDACTED","ALLOWED_ORIGINS":"https://ffe.org.au,https://www.ffe.org.au,http://127.0.0.1,http://localhost","RETURN_URL":"https://ffe.org.au/donate.html"}}'
```

## Useful AWS Commands

Inspect current function:

```bash
aws lambda get-function-configuration \
  --region ap-southeast-2 \
  --function-name ffe-stripe-donations
```

Inspect Function URL:

```bash
aws lambda get-function-url-config \
  --region ap-southeast-2 \
  --function-name ffe-stripe-donations
```

Read recent logs:

```bash
aws logs tail /aws/lambda/ffe-stripe-donations \
  --region ap-southeast-2 \
  --since 30m \
  --format short
```

## Useful Stripe Checks

List payment method domains:

```bash
curl -sS https://api.stripe.com/v1/payment_method_domains \
  -u 'REDACTED:' | jq
```

Check a price:

```bash
curl -sS https://api.stripe.com/v1/prices/PRICE_ID \
  -u 'REDACTED:' | jq
```

## Known Gotchas

### 1. Duplicate CORS headers break the live page

Do not set `Access-Control-Allow-Origin` both:

- in the Lambda Function URL CORS config
- and in the Lambda response headers

This caused Chrome to reject the fetch with:

- duplicated `Access-Control-Allow-Origin`
- generic Stripe “Something went wrong” in the iframe

Current fix:

- let the Function URL handle CORS
- keep Lambda responses simple

### 2. `ffe.org.au` must be registered as a Stripe payment method domain

Without that, embedded Stripe and wallet behavior can fail or behave inconsistently.

### 3. `embedded_page` rules matter

The working combination is:

- `ui_mode=embedded_page`
- `redirect_on_completion=if_required`
- `return_url=...`

Previous combinations caused Stripe API validation errors.

### 4. Repo state vs live AWS state can drift

Some issues were caused by updating repo code without redeploying the Lambda afterward. If the page and backend behave differently, redeploy the Lambda first.

## Security Notes

- The live Stripe secret key is currently stored in AWS Lambda environment variables.
- It was also exposed during setup in terminal/chat history.
- It should be rotated when convenient.
- Never commit the live secret key into the repository.

Recommended future improvement:

- move the Stripe secret into AWS Secrets Manager
- update the Lambda to read it securely at runtime

## Current Status

As of this handover:

- the live page is wired to the live Lambda session endpoint
- the live Lambda is active in `ap-southeast-2`
- the live endpoint supports:
  - one-time fixed amounts
  - one-time custom amounts from `A$1`
  - monthly fixed amounts
- `ffe.org.au` and `www.ffe.org.au` are registered in Stripe as payment method domains
