# V6 Release Blockers

## Production activation checkpoint

The acceptance implementation is deployed to AWS and GitHub Pages through PR #56.
On 8 November 2026 the user approved the final terms and real offer issuance was
**enabled** with the exact approved contract hash. EOI `2026.29` / Application `2026.30`
remain live. No production family was selected or emailed during activation. The 283
regression tests and live manual/scheduled canaries passed.
See [exact approval and activation evidence](post-offer/OFFER-ACTIVATION-2026-11-08.md).
See [current release and operating evidence](post-offer/PRODUCTION-RELEASE-2026-11-08.md).
Earlier local-only, inactive-runtime and pending-Google statements below are historical.
The user’s final-terms approval is recorded; staff still review and explicitly send each family offer.


## 8 November 2026 offer candidate

A separate conditional-offer backend and family/staff pages now exist locally. Issuance defaults off and requires approval of the exact contract hash. All seven controlled policy originals are verified; their old source addresses, download publication, remaining draft contractual choices and exact agreement approval remain release dependencies. This does not close historical governance items or change production. See [current source evidence](post-offer/POLICY-SOURCE-VERIFICATION-2026-11-08.md) and [release requirements](POST-OFFER-IMPLEMENTATION-2026-11-08.md).


V6 is suitable for invited content and interaction review only. It must not collect
real family information until the applicable blockers are closed.

## Rosewood Content And Governance

- approve the Enrolment Agreement; the approved Enrolment Policy and Enrolment
  Procedure are now version-pinned in the Application reader
- approve the point-of-collection Privacy Collection Notice; the approved Privacy
  Policy is now version-pinned in the Application reader and its welcome link is live
- approve Parent/Guardian/Carer Code, Student Code, ICT acceptable-use and child-safety
  documents with version identifiers
- approve application and signature declarations, photography/recording permissions,
  communication consent and IP-address wording
- confirm the future post-offer fee-account and previous-school-contact permission
  workflows; neither is collected in Application V6.8
- confirm required documents, formats, limits, retention and deletion; proof of
  address is explicitly excluded from the application
- confirm year, school, country, language, religion, occupation and relationship catalogues
- commission legal, privacy, records-management and accessibility reviews

## Implemented Backend And Security

- minimal public application-link requests with idempotency, bot friction, throttling,
  duplicate-safe family invitation reissue and no automatic EOI linkage
- high-entropy, expiring, single-family invitation records
- Rosewood-controlled transactional sender with SPF, DKIM and DMARC
- rate-limited OTP with expiry, attempt limits and replay protection; the service allows
  at least 30 seconds between sends and five resends per challenge in 30 minutes
- idempotent EOI/contact/student/application linking and direct-invite record creation
- server-side record and workflow authorisation on every request
- durable, revisioned autosave with truthful saving, saved and failure states
- immediate browser uploads with per-file progress and inline retry, limited to PDF,
  JPG and PNG files up to 10 MB, through private KMS-encrypted staging into restricted
  Google Drive
- customer-managed KMS encryption for authoritative DynamoDB records and backups
- DynamoDB point-in-time recovery plus locked daily/monthly same-region backups
- separate append-only audit table and role-ready staff controls
- server-side validation and idempotency, with family-facing field/section guidance and
  inline highlighting for incomplete submission answers
- separate guardian signature tasks and a calculated required-signature set
- server timestamps, authenticated signer linkage and append-only audit events
- confirmation messages that do not expose sensitive answers or reusable private links
- idempotent and rate-limited EOI submission with compensating external-artifact cleanup
- bounded outbox retries with retained terminal failures and operations alarm
- encrypted SES delivery-event ingestion with message/task correlation and restricted
  Operations/audit projection
- pull-request checks for backend tests/build, broken local assets, private exports and
  high-confidence committed secrets

## Remaining Backend And Security

- approved named staff accounts, role ownership and periodic access review beyond the
  current shared allowlisted mailbox; the restricted CLI remains an emergency fallback
- approved legal retention/deletion and incident-response rules; current AWS backup
  periods are operational recovery controls only
- extend the approved immutable document catalogue as conduct and post-offer documents
  are approved; the three Application-welcome policies are already pinned

## Deployment Gate

- remove or staff-gate `review=1`
- replace every synthetic value and pending-document placeholder
- connect only approved, versioned Rosewood documents; the three Application-welcome
  policies satisfy this gate for their current scope
- complete synthetic end-to-end tests for session recovery, expiry and all failure paths
- retain preview-only treatment for Acceptance and Decline until their separate backends
  and governance gates are complete

AWS is authoritative for V6 operational records. Google Sheets are replaceable
reporting projections; restricted Google Drive is the approved launch file store.

## 8 November acceptance checkpoint

Staff integration, design alignment, staged requests, completion receipts, corrections,
session recovery and signed-copy download are implemented and locally tested. They are
no longer development gaps. Production enablement remains off: policy address/download
review, remaining draft contractual choices and conditional agreement approval are
unresolved. Node 22 local checks pass; isolated AWS/Drive/SES end-to-end verification
remains required. Reporting and encrypted-alarm repairs have been removed from this
candidate and preserved in the separate local branch
`codex/rosewood-operations-repairs-20261108`; neither is deployed or verified in
production. See POST-OFFER-IMPLEMENTATION-2026-11-08.md.
