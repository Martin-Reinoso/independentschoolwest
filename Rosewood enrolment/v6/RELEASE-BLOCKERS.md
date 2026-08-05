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
- private encrypted uploads with file type and size restrictions
- server-side validation and idempotency
- separate guardian signature tasks and a calculated required-signature set
- server timestamps, authenticated signer linkage and append-only audit events
- confirmation messages that do not expose sensitive answers or reusable private links

## Remaining Backend And Security

- authenticated staff portal for EOI-linked and direct-email invitations, application
  progress, delivery state and audit history; the current operator path is a CLI
- automated malware scanning and quarantine for uploaded files
- automatic SES bounce/complaint correlation into Operations records
- approved staff roles, access review, retention, deletion and incident-response rules
- approved immutable policy/document version catalogue for real-family submissions

## Deployment Gate

- remove or staff-gate `review=1`
- replace every synthetic value and pending-document placeholder
- connect only approved, versioned Rosewood documents
- complete synthetic end-to-end tests for session recovery, expiry and all failure paths
- retain preview-only treatment for Acceptance and Decline until their separate backends
  and governance gates are complete

Google Drive and Sheets remain the approved interim staff storage direction. They do
not replace the authenticated application boundary, private file controls or signature
audit requirements.
