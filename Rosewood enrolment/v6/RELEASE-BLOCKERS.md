# V6 Release Blockers

V6 is suitable for invited content and interaction review only. It must not collect
real family information until the applicable blockers are closed.

## Rosewood Content And Governance

- approve the complete Rosewood enrolment policy, procedure and Enrolment Agreement
- approve the Privacy Policy and point-of-collection Privacy Collection Notice
- approve Parent/Guardian/Carer Code, Student Code, ICT acceptable-use and child-safety
  documents with version identifiers
- approve application and signature declarations, photography/recording permissions,
  communication consent and IP-address wording
- confirm fee responsibility choices, percentages, nominees, dates and evidence rules
- confirm required documents, formats, limits, retention and deletion
- confirm year, school, country, language, religion, occupation and relationship catalogues
- commission legal, privacy, records-management and accessibility reviews

## Backend And Security

- high-entropy, expiring, single-family invitation records
- Rosewood-controlled transactional sender with SPF, DKIM and DMARC
- rate-limited OTP with expiry, attempt limits and replay protection
- server-side record and workflow authorisation on every request
- durable autosave with truthful saving, saved, unsaved and failure states
- private encrypted uploads, malware scanning and least-privilege access
- server-side validation, idempotency and immutable agreement/document versions
- separate guardian signature tasks and a calculated required-signature set
- trusted timestamps, authenticated signer linkage and append-only audit events
- staff roles, access logging, retention, deletion and incident response
- confirmation messages that do not expose sensitive data or reusable private links

## Deployment Gate

- remove or staff-gate `review=1`
- replace every synthetic value and pending-document placeholder
- connect only approved, versioned Rosewood documents
- complete synthetic end-to-end tests for invitation, OTP, recovery, upload,
  submission, multi-guardian signing, decline, expiry and failure paths
- retain the preview safety banner until persistence and failure handling are verified

Google Drive and Sheets remain the approved interim staff storage direction. They do
not replace the authenticated application boundary, private file controls or signature
audit requirements.
