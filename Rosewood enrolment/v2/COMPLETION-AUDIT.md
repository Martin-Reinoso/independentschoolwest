# V2 Completion Audit

## Current Decision

**The V2 implementation is ready for continued synthetic review, but it is not approved
for real family information and must not be promoted to production yet.**

The frontend, API, persistence contract, OTP flows, co-signing flow and receipt flow are
implemented and pass both local automated tests and a live synthetic test-stack canary.
Organisation-user OAuth is configured and the mandatory AWS, SES, Drive create/delete
and Sheet-read preflight passes. This proves the architecture, not production readiness:
the current OAuth account contains unrelated Drive data and the temporary individually
verified sender is consistently classified as spam by Gmail. Both are explicit launch
blockers, alongside the unapproved policy placeholders and governance approvals below.

## Implemented

- original invitation-only eight-stage family form, responsive desktop/mobile journey
- comprehensive synthetic non-writing applicant and co-signer previews for stakeholder
  review, including two guardians, shared care, health/support, documents and declarations
- temporary SES sender configuration that can later move to a Rosewood-controlled domain
- invitation, signer and receipt capability links with separate email OTP checks
- short-lived, scoped, hashed sessions and single-use bounded OTP challenges
- revisioned autosave with server/local conflict-aware recovery and truthful save status
- closed backend field contract and server-pinned schema and policy provenance
- conditional health, authority, residency and document requirements, including a
  structured shared-care address, independent emergency contact and health-professional
  consent
- direct restricted-Drive upload sessions, confirmation and pre-submission removal
- frozen comprehensive review record and independent required-guardian signing tasks
- gated signature canvas, declaration validation and append-only value-free audit events
- atomic invitation consumption, submission/signature idempotency and outbox creation
- recipient-specific minimal receipt with a fresh OTP and no sensitive application detail
- strict static-page CSP, URL token scrubbing and browser capability cleanup
- placeholder policy pack that is visibly unapproved and versioned
- explicit Google authentication modes supporting both Shared Drive service accounts and
  quota-bearing organisation-user OAuth, with fail-closed credential selection

## Verified

- 52 API tests pass
- 35 browser tests pass across desktop and mobile Chromium
- serious/critical Axe checks pass on the main and receipt experiences under the CSP
- Lambda deployment bundle builds without symbolic links and imports its handler
- API coverage is measured separately with `pnpm run test:api:coverage`
- the Drive preflight performs a real create/delete probe rather than trusting ACL metadata
- the test stack is `UPDATE_COMPLETE`, the outbox schedule is enabled and DynamoDB
  point-in-time recovery is enabled

Automated local flows include OTP-to-draft, conditional evidence, shared-care and health
consent enforcement, emergency-contact independence, document removal, additional-
guardian email/OTP/frozen review/signature, completion email, receipt OTP, idempotent
replay and invitation invalidation after submission.

## Live Synthetic Canary

Completed on 3 August 2026 using only synthetic family and document data and the approved
test recipient:

- access OTP delivered through SES, remained absent from the API response and created a
  short-lived application session
- revisioned draft saved and three documents uploaded as PDF, JPEG and PNG
- restricted Drive contained exactly the three uploads, one canonical JSON snapshot and
  two PNG signature artifacts for the synthetic application; all six remained parented
  to the configured folder
- primary submission moved to `pending_signatures` with one of two signatures complete
- the additional guardian used a separate task capability, OTP and scoped session to
  review the six-section frozen revision and complete the second signature
- two recipient-specific completion links were issued; one separate receipt OTP returned
  only the reference, timestamps, policy/revision, student display name, recipient name
  and two-entry signature register
- DynamoDB finished at revision 1 with three documents, two required signers, two
  signatures, one signed signature task, two active receipt tasks and one engagement row
- the private Sheet held one nine-column `stage_viewed` row with no mailbox or phone
- all five lifecycle outbox records were sent with no pending lease
- a deliberately failing synthetic outbox record released its lease, was delivered once
  by the next scheduled retry after its destination was corrected, remained unchanged on
  a further schedule and was then removed
- CloudWatch contained no known OTP, mailbox, capability link, bearer token, signature
  payload or application-answer value

The synthetic application remains in the isolated test stack as canary evidence. Remove
its DynamoDB, Drive and Sheet records before any real-family launch or when the evidence
retention decision is complete.

## Test-Only Infrastructure Blockers

- The active organisation-user OAuth grant has full Drive and Sheets scopes, as required
  by the current adapter, but its account contains unrelated Drive data. The adapter
  enforces the configured folder for Rosewood writes; that does not narrow what a stolen
  refresh token could read. Production requires a data-empty dedicated organisation
  account or the preferred dedicated service account in a non-University Shared Drive.
- The current SES identity is an individually verified test mailbox. Gmail displayed the
  sender as arriving via `amazonses.com` and placed every lifecycle and retry canary in
  spam. Production requires a Rosewood-controlled sending domain with aligned SPF, DKIM
  and DMARC, plus bounce/complaint handling and inbox-placement testing.
- SES remains in sandbox and is suitable only for verified-recipient testing.

Do not replace these requirements with public links, a personal service-account
workaround or an undocumented S3 fallback.

## Launch Approvals Still Required

- final Privacy Collection Notice, Privacy Policy, Enrolment Policy and Procedure
- legal approval of authority, guardian, consent, fee and withdrawal wording
- approved document necessity and retention/deletion schedule
- named staff access, incident response and data-subject request procedures
- Rosewood-controlled SES domain, support mailbox, SPF/DKIM/DMARC alignment, bounce and
  complaint handling
- dedicated data-empty Google runtime identity and documented OAuth rotation/revocation,
  or the preferred restricted Shared Drive service account
- final human accessibility review and a fresh synthetic canary in the production-shaped
  environment after the identity and sender changes
