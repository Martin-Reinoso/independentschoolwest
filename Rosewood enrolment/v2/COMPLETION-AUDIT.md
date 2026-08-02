# V2 Completion Audit

## Current Decision

**The V2 implementation is ready for continued synthetic review, but it is not approved
for real family information and must not be promoted to production yet.**

The frontend, API, persistence contract, OTP flows, co-signing flow and receipt flow are
implemented and pass local automated end-to-end tests. The live cloud canary is paused
because the current Google folder is in My Drive while the deployed credentials select a
service account. A service account may have editor ACLs there but has no personal Drive
storage quota, so real file creation fails. The deployment preflight detects this with a
create/delete probe and fails closed. The backend now supports the approved
organisation-user OAuth alternative, but its OAuth client and refresh token have not yet
been provisioned.

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

- 51 API tests pass
- 35 browser tests pass across desktop and mobile Chromium
- serious/critical Axe checks pass on the main and receipt experiences under the CSP
- Lambda deployment bundle builds without symbolic links and imports its handler
- API coverage is measured separately with `pnpm run test:api:coverage`
- the Drive preflight performs a real create/delete probe rather than trusting ACL metadata

Automated local flows include OTP-to-draft, conditional evidence, shared-care and health
consent enforcement, emergency-contact independence, document removal, additional-
guardian email/OTP/frozen review/signature, completion email, receipt OTP, idempotent
replay and invitation invalidation after submission.

## External Blocker

Configure one quota-bearing Google identity before deployment:

1. Preferred: a non-University Google Workspace Shared Drive with a dedicated Rosewood
   service account and access only to the restricted enrolment folder.
2. Currently actionable alternative: set up delegated-user OAuth for the dedicated
   Rosewood organisation account, store the OAuth client and refresh token in Secrets
   Manager, and document token rotation, revocation and account offboarding.

Do not replace this requirement with public links, a personal service-account workaround
or an undocumented S3 fallback. Do not deploy this branch until the mandatory preflight
passes against the approved storage destination.

## Live Canary Still Required

After the Google decision, complete the exact live sequence in `TESTING.md`: temporary
sender OTP, secure save/reload, real Drive uploads, primary submission, second guardian
OTP/signature, completion outbox, receipt OTP, private Sheet rows and cleanup. Use only
synthetic family and document data.

## Launch Approvals Still Required

- final Privacy Collection Notice, Privacy Policy, Enrolment Policy and Procedure
- legal approval of authority, guardian, consent, fee and withdrawal wording
- approved document necessity and retention/deletion schedule
- named staff access, incident response and data-subject request procedures
- Rosewood-controlled SES domain, support mailbox, bounce and complaint handling
- final accessibility review and successful synthetic production canary
