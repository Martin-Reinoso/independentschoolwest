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

Before every cloud package, run `pnpm --dir lambda run build:deployment`. It must finish
with no symbolic links and a successful handler import; packaging `lambda/` directly is
not a supported deployment path.

The API suite covers OTP generic responses, enforced resend cooldown, expiry, single use,
attempts/rates, scoped-session expiry, signature-task expiry at every gate, closed draft
schema validation, server-pinned schema/policy versions, draft idempotency/revisions,
bounded engagement, conditional evidence rules, structured shared-care addresses,
independent emergency contacts, conditional health-professional consent, Drive ownership,
document removal, forged-document rejection, declaration/signature validation,
invitation consumption, primary/remote signatures, recipient-specific receipt OTP and
data minimisation, outbox lease/retry behaviour, Dynamo transaction composition, atomic
signature/idempotency completion, stale-claim recovery and expired-worker races, Google
adapters, SES composition and HTML escaping.

The browser suite runs desktop Chromium and a Chromium mobile emulation. It covers
comprehensive synthetic preview isolation, desktop panel clipping, mobile
ordering/overflow, conditional fields and documents, shared-care address controls,
emergency-contact independence, health-professional consent, validation/focus summaries,
guardian add/remove and server reconstruction, local-versus-server draft recovery,
consent defaults, fee exclusivity, document removal, signature gating, restrictive
static-page CSP, policy links, axe accessibility checks under that CSP, remote signing
stages, receipt desktop/mobile layout and accessibility, a real local OTP-to-secure-save
flow, a full local additional-guardian email/OTP/review/signature flow, and an
application-to-email-to-receipt-OTP canary.

The current verified baseline is 46 API tests and 35 browser tests passing. Seven browser
cases are deliberately skipped where a desktop-only transaction canary or a device-
specific layout assertion would duplicate coverage. See `COMPLETION-AUDIT.md` for the
difference between this local evidence and the pending live cloud canary.

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
