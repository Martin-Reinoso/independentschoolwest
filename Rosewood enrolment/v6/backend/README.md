# Rosewood V6 Backend

This service implements Expression of Interest and Application for Enrolment only.
Offer acceptance, decline and the post-offer Enrolment Agreement remain separate,
preview-only workflows.

## Authoritative Data Boundary

AWS in `ap-southeast-2` is authoritative for operational records:

- DynamoDB stores EOI, application, invitation, draft, session and outbox records.
- A separate DynamoDB table stores append-only application and staff audit events.
- Both tables use customer-managed KMS encryption, deletion protection and point-in-
  time recovery.
- AWS Backup creates daily 35-day and monthly 366-day backups in a locked same-region
  vault.

Google Drive is the approved launch file store for documents, JSON snapshots and
signature images. Files are written only to the restricted enrolment folders owned by
the delegated `info@ffe.org.au` identity. V6 accepts PDF, JPG and PNG files up to 10 MB.
GuardDuty and active S3 document storage are outside the launch scope.

The three private Google Sheets are reporting projections only. They can be rebuilt
from DynamoDB; editing or deleting a Sheet row does not alter the AWS application
record. Canonical headers are repaired before writes so adding metadata cannot shift
legacy columns.

## Invitations And Staff Access

- A direct invitation creates an application without an EOI link.
- An EOI is linked only when staff explicitly select the matching record and email.
- Staff authenticate at
  `https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html` with an allowlisted OTP.
- Roles are `admin`, `admissions` and `viewer`; configured addresses receive one role.
- Detailed application views create append-only audit events.
- Documents are listed in the portal but accessed only through the restricted Drive.
- Raw invitation links, signature drawings and network fingerprints are not returned
  by staff APIs.

## Runtime

- AWS Lambda Function URL in Sydney
- Amazon SES from `enrolment@ffe.org.au`
- EventBridge outbox retry every minute
- CloudWatch error alarm and 90-day application logs
- SNS email alerts for Lambda errors and failed backup/restore jobs

Family OTP challenges expire after 10 minutes, allow five attempts and have resend and
network throttles. Family sessions expire after 30 minutes; staff sessions expire after
two hours. Sessions stay in browser memory only. Raw IP addresses are not stored.

## Routes

```text
GET  /v6/health
POST /v6/staff/access/request-code
POST /v6/staff/access/verify-code
GET  /v6/staff/dashboard
POST /v6/staff/applications/detail
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
server. The browser cannot select another family's application ID.

## Build And Recovery

```text
pnpm test
pnpm build
aws cloudformation package ...
aws cloudformation deploy ...
```

The projection rebuild is dry-run by default:

```text
pnpm rebuild-projections
pnpm rebuild-projections -- --apply --confirm=REBUILD_GOOGLE_PROJECTIONS
```

Follow `../RECOVERY-RUNBOOK.md`. Secrets, active tokens, family answers and uploaded
files do not belong in Git or command output.

## Remaining Governance Decisions

- Approve legal retention and deletion rules.
- Replace the shared staff identity with approved named accounts and access reviews.
- Correlate SES bounce and complaint feedback into operational records automatically.
- Approve Rosewood policy, privacy, consent and signature wording.
- Build Acceptance, Decline and Enrolment Agreement persistence as separate workflows.

See `../ARCHITECTURE-HARDENING.md`, `../RECOVERY-RUNBOOK.md` and
`../STAFF-PORTAL-RUNBOOK.md`.
