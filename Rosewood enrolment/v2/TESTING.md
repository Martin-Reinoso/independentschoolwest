# V2 Testing

## Automated Suite

From `Rosewood enrolment/v2`:

```bash
pnpm install --frozen-lockfile
pnpm --dir lambda install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
pnpm run test:api:coverage
```

The API suite covers OTP generic responses, enforced resend cooldown, expiry, single use,
attempts/rates, scoped-session expiry, signature-task expiry at every gate, draft
idempotency/revisions, bounded engagement, Drive ownership, forged-document rejection,
declaration/signature validation, primary/remote signatures, recipient-specific receipt
OTP and data minimisation, outbox lease/retry behaviour, Dynamo transaction composition,
atomic signature/idempotency completion, stale-claim recovery and expired-worker races,
Google adapters, SES composition and HTML escaping.

The browser suite runs desktop Chromium and a Chromium mobile emulation. It covers
synthetic preview isolation, desktop panel clipping, mobile ordering/overflow,
conditional fields, validation/focus summaries, guardian-menu adaptation, consent
defaults, fee exclusivity, signature gating, policy links, axe accessibility checks,
remote signing stages, receipt desktop/mobile layout and accessibility, a real local
OTP-to-secure-save flow, and a full local application-to-email-to-receipt-OTP canary.

## Live Canary

After a test stack is deployed:

1. create one synthetic invitation for the approved test mailbox
2. request an OTP and verify the SES-delivered code
3. save a synthetic draft and reload it
4. upload synthetic PDF/JPG/PNG files and verify Drive parent/metadata
5. submit with one synthetic additional signer
6. verify the second mailbox OTP, frozen revision and signature completion
7. check all transactional messages and the private Sheet event rows
8. open each distinct completion link, verify the separate receipt OTP and compare the
   minimal receipt timestamps/signature register with the canonical record
9. confirm no raw token, OTP, signature image, address or health answer appears in
   logs, Sheet or receipt payload
10. confirm one deliberately failed outbox message is retried by the schedule without a
    duplicate delivery
11. revoke/delete synthetic access records according to the test cleanup procedure

Do not use real child or family information for a canary.
