# V6 Release Blockers

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
  workflows; neither is collected in Application V6.7
- confirm required documents, formats, limits, retention and deletion; proof of
  address is explicitly excluded from the application
- confirm year, school, country, language, religion, occupation and relationship catalogues
- commission legal, privacy, records-management and accessibility reviews

## Implemented Backend And Security

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

## Remaining Backend And Security

- approved named staff accounts, role ownership and periodic access review beyond the
  current shared allowlisted mailbox; the restricted CLI remains an emergency fallback
- automatic SES bounce/complaint correlation into Operations records
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
