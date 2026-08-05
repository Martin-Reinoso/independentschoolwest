# Rosewood V6 Backend

This service implements only the Expression of Interest and Application for
Enrolment workflows. Offer acceptance, decline and the post-offer Enrolment Agreement
remain separate preview-only workflows and cannot write to this service.

## Data Boundary

The system intentionally keeps family records in three private native Google Sheets
owned by `info@ffe.org.au`:

- [EOI records](https://docs.google.com/spreadsheets/d/1h8jckfKDos2bdOAnzCVSJo17850Qbj3Out8wayLSuqM): EOI answers and EOI audit events only
- [Application records](https://docs.google.com/spreadsheets/d/1OVT17pbFmRLfCKzJ69OldIyWD01IXg_KOLMGTVWnLNk): application, student, guardian, emergency-contact, document, condition, signature and application-audit records
- [Operations](https://docs.google.com/spreadsheets/d/1YjLCgC6GxCcaXiq384DbB-m3q-ZCmUP2ZzrwigJRf44): contacts, students, invitations, explicit workflow links, progress, email events and operational audit events

The Operations Sheet links records by opaque IDs; it does not combine the EOI and
Application answer sets. Google Drive snapshots and uploaded documents are held in
private workflow-specific folders owned by the same account.

## Invitation Rules

- Application is invitation-only.
- Direct application is the normal path. It creates an application without an EOI
  link.
- EOI linking is explicit: staff must supply a valid source EOI ID when creating the
  invitation.
- The linked EOI email must match the invitation email.
- Matching email addresses alone never create an EOI link.
- Approved EOI values may prefill an application but remain editable by the family.

Authorised operators use the staff portal at
`https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html`. The portal can create a
direct invitation or explicitly link one EOI, monitor operational progress and resend
an active invitation. Resending rotates the private token, so the earlier link stops
working. The restricted CLI remains an emergency operator fallback. Never send or
store invitation tokens in ordinary notes, analytics, the staff browser or Git.

## Runtime

- AWS Lambda Function URL in `ap-southeast-2`
- DynamoDB for invitations, OTP challenges, sessions, drafts and the durable outbox
- Google Sheets for staff-readable normalized records
- Google Drive for immutable JSON snapshots, signatures and uploaded documents
- Amazon SES from `enrolment@ffe.org.au`
- EventBridge outbox retry every minute
- CloudWatch error alarm and 90-day application logs

OTP challenges expire after 10 minutes, permit five verification attempts, enforce a
30-second resend cooldown and cap requests per email/invitation and network. Browser
sessions expire after 30 minutes and are kept in memory only by the frontend. Raw IP
addresses are not stored; the service records a keyed network fingerprint for security
and signature audit purposes.

Staff portal access uses a separate allowlisted email OTP. Staff sessions expire after
two hours and are also kept in browser memory only. The dashboard deliberately returns
operational summaries rather than medical, address, document, signature-image or
network-fingerprint data.

## Routes

```text
GET  /v6/health
POST /v6/staff/access/request-code
POST /v6/staff/access/verify-code
GET  /v6/staff/dashboard
POST /v6/staff/invitations
POST /v6/staff/invitations/resend
POST /v6/eoi
POST /v6/application/access/request-code
POST /v6/application/access/verify-code
GET  /v6/application/context
PUT  /v6/application/draft
POST /v6/application/documents/start
POST /v6/application/documents/confirm
POST /v6/application/submit
POST /v6/application/signatures/request-code
POST /v6/application/signatures/verify-code
POST /v6/application/signatures/submit
```

Every application, draft, document and signature request is authorised on the server.
The browser cannot select an application ID to access another record.

## Build And Deploy

Use the bundled Node.js 22 and pnpm runtimes. The build performs a production-only,
hoisted install in `lambda-dist`, rejects symlinks and imports the packaged handler as
a smoke check.

```text
pnpm test
pnpm build
aws cloudformation package ...
aws cloudformation deploy ...
```

Secrets belong only in AWS Secrets Manager. Do not add Google OAuth credentials, OTP
secrets, network HMAC keys, active tokens or real-family test data to this directory.

See `../STAFF-PORTAL-RUNBOOK.md` for access, invitation, resend and incident procedures.

## Production Gaps

- The staff portal currently has one allowlisted administrator mailbox. A multi-user
  role model and periodic access review are required before more staff are added.
- Uploaded files are private and type/size constrained, but automated malware scanning
  is not yet connected. The Documents Sheet records `not_scanned` transparently.
- SES bounce and complaint alerts reach `info@ffe.org.au`; automatic feedback ingestion
  into the Operations Sheet is a follow-up.
- Rosewood policy, privacy, retention and legal text still require governance approval.
- Acceptance, decline and Enrolment Agreement persistence are intentionally out of
  scope and must use separate schemas, storage and authorization when implemented.
