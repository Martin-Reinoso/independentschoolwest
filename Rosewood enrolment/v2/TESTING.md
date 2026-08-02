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

The API suite covers OTP generic responses, expiry, single use, attempts/rates,
session expiry, draft idempotency/revisions, bounded engagement, Drive ownership,
forged-document rejection, declaration/signature validation, primary submission,
remote guardian signing, Google adapters, SES composition and HTML escaping.

The browser suite runs desktop Chromium and a Chromium mobile emulation. It covers
synthetic preview isolation, desktop panel clipping, mobile ordering/overflow,
conditional fields, validation/focus summaries, guardian-menu adaptation, consent
defaults, fee exclusivity, signature gating, policy links, axe accessibility checks,
remote signing stages and a real local OTP-to-secure-save flow.

## Live Canary

After a test stack is deployed:

1. create one synthetic invitation for the approved test mailbox
2. request an OTP and verify the SES-delivered code
3. save a synthetic draft and reload it
4. upload synthetic PDF/JPG/PNG files and verify Drive parent/metadata
5. submit with one synthetic additional signer
6. verify the second mailbox OTP, frozen revision and signature completion
7. check all transactional messages and the private Sheet event rows
8. confirm no raw token, OTP, signature image or health answer appears in logs/Sheet
9. revoke/delete synthetic access records according to the test cleanup procedure

Do not use real child or family information for a canary.
