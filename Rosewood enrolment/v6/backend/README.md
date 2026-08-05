# Rosewood V6 Backend

This service implements only Expression of Interest and Application for Enrolment.
Offer acceptance, decline and the post-offer Enrolment Agreement remain separate,
preview-only workflows and cannot write to this service.

## Authoritative Data Boundary

AWS in `ap-southeast-2` is the authoritative operational record:

- DynamoDB holds EOI, application, invitation, draft, session and outbox records. It
  uses customer-managed KMS encryption, deletion protection and 35-day point-in-time
  recovery.
- A separate DynamoDB table holds append-only application and staff audit events. The
  Lambda role can append and query but cannot update or delete audit events.
- A private S3 bucket holds submitted JSON snapshots, signatures and application
  documents. It has public access blocked, customer-managed KMS encryption, versioning
  and 35-day default Object Lock in governance mode.
- Browser uploads first enter the `quarantine/` prefix through a checksum-bound,
  short-lived presigned URL. GuardDuty Malware Protection tags each version. A document
  cannot be attached, submitted or downloaded unless its result is
  `NO_THREATS_FOUND`.
- AWS Backup creates daily 35-day and monthly 366-day backups of both DynamoDB tables
  in a same-region vault. Vault Lock governance constraints prevent retention below 35
  days or above 366 days.

The three private Google Sheets owned by `info@ffe.org.au` are normalized reporting
projections only. They are written asynchronously and can be rebuilt from AWS; editing
or deleting a Sheet row does not alter the authoritative enrolment record. Staff use
the portal rather than direct Sheet links. Google Drive is no longer the storage target
for new V6 snapshots, signatures or uploads.

## Invitations And Staff Access

- Application is invitation-only. A direct invitation creates an unlinked application;
  an EOI link is created only when staff explicitly select one matching EOI.
- Matching email addresses alone never link an EOI.
- The portal is `https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html`.
- Staff authenticate with an allowlisted email OTP. `STAFF_ROLES` supports `admin`,
  `admissions` and `viewer`; each configured address receives one role.
- Admin and admissions roles can invite, resend and prepare clean document downloads.
  Viewers can review summaries and application answers but cannot invite or download.
- Application detail views and document-download authorizations create durable audit
  events. Download links expire after five minutes and require a deliberate link click,
  avoiding popup-blocker behavior.
- The production allowlist still contains one organisation mailbox. Add named staff
  accounts only after an access-owner and periodic review process are approved.

## Runtime

- AWS Lambda Function URL in Sydney
- Amazon SES from `enrolment@ffe.org.au`
- EventBridge outbox retry every minute
- CloudWatch error alarm and 90-day application logs
- SNS alerts for failed backups and unsafe/unscannable documents

Family OTP challenges expire after 10 minutes, allow five attempts and enforce resend
and network throttles. Family sessions expire after 30 minutes. Staff sessions expire
after two hours. Sessions stay in browser memory only. Raw IP addresses are not stored;
the service records a keyed network fingerprint where signature/security evidence
requires it.

## Routes

```text
GET  /v6/health
POST /v6/staff/access/request-code
POST /v6/staff/access/verify-code
GET  /v6/staff/dashboard
POST /v6/staff/applications/detail
POST /v6/staff/documents/download
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

Every application, draft, upload, document and signature request is authorised on the
server. The browser cannot select an application ID to access another family record.

## Build And Recovery

Use the bundled Node and pnpm runtimes:

```text
pnpm test
pnpm build
aws cloudformation package ...
aws cloudformation deploy ...
```

The Google projection rebuild is dry-run by default and prints only row counts:

```text
pnpm rebuild-projections
pnpm rebuild-projections -- --apply --confirm=REBUILD_GOOGLE_PROJECTIONS
```

It requires the production table, audit-table, spreadsheet and secret environment
variables. Follow `../RECOVERY-RUNBOOK.md`; never run the apply form as a routine
refresh. Secrets, active tokens, family answers and uploaded files do not belong in Git
or command output.

## Remaining Governance Decisions

- Approve the legal retention and deletion schedule. The implemented 35-day Object Lock
  and backup minimum is an operational recovery control, not a legal-retention decision.
- Replace the shared `info@ffe.org.au` staff identity with approved named staff accounts
  and establish access review/offboarding before broadening portal use.
- Correlate SES bounce and complaint feedback into operational records automatically.
- Approve Rosewood policy, privacy, consent and signature wording before real-family
  production use.
- Build Acceptance, Decline and Enrolment Agreement persistence only as separate
  schemas, storage and authorization workflows.

See `../ARCHITECTURE-HARDENING.md`, `../RECOVERY-RUNBOOK.md` and
`../STAFF-PORTAL-RUNBOOK.md`.
