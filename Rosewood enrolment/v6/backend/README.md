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
The browser uploads to a private KMS-encrypted S3 staging object with a 15-minute
authorisation. Lambda verifies size, type and SHA-256 before moving the bytes to Drive,
then deletes the staging object. A one-day lifecycle removes abandoned objects. This
bucket is a transport buffer, not an authoritative document store. GuardDuty and
long-term S3 document storage are outside the launch scope.

The three private Google Sheets are reporting projections only. They can be rebuilt
from DynamoDB; editing or deleting a Sheet row does not alter the AWS application
record. Canonical headers are repaired before writes so adding metadata cannot shift
legacy columns.

EOI and Application records are pinned to immutable form contracts with a form version
and SHA-256 definition hash. Application saves merge into the existing answer map so a
question omitted by a later browser cannot erase its earlier answer. Every
server-acknowledged application create, start, save and submission also writes a full
append-only DynamoDB revision. Staff can inspect a selected historical revision through
an authorised, audited endpoint. See `../SCHEMA-EVOLUTION.md` before changing fields,
options, validation or required status.
The current `2026.5` contracts also pin the family HTML, JavaScript, CSS, policy
projection and all original Word/PDF policy assets. Policy viewing is frontend-only and
does not create an application answer, acknowledgement or audit event.

## Invitations And Staff Access

- A direct invitation requires the parent/guardian first name and email; surname is
  optional and no child name is collected by staff.
- An EOI is linked only when staff explicitly select the matching record and email.
- Initial and replacement invitation links expire after 14 days.
- OTP verification creates a family-scoped session. A family can select an existing
  child or add another child, after which the service creates a separate
  application-scoped session. Each child's answers, files and signatures remain in a
  distinct application record. Existing one-child invitation records remain supported.
- Staff authenticate at
  `https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html` with an allowlisted OTP.
- Roles are `admin`, `admissions` and `viewer`; configured addresses receive one role.
- Detailed application views create append-only audit events.
- Documents are listed in the portal but accessed only through the restricted Drive.
- Raw invitation links, signature drawings and network fingerprints are not returned
  by staff APIs.
- Additional-guardian request emails contain a concise purpose and safety explanation,
  the private action link and enrolment contact only. They do not include the student
  name, family answers, medical information or internal identifiers. Email and OTP
  verification remain mandatory before the frozen review is returned.

## Runtime

- AWS Lambda Function URL in Sydney
- Amazon SES from `enrolment@ffe.org.au`
- EventBridge outbox retry every minute
- CloudWatch error alarm and 90-day application logs
- SNS email alerts for Lambda errors and failed backup/restore jobs

Family OTP challenges expire after 10 minutes, allow five attempts and have resend and
network throttles. Family and child-application sessions use a sliding 20-minute
inactivity timeout with an eight-hour absolute limit; staff sessions expire after two
hours and guardian-signing sessions retain their separate 30-minute limit. Sessions stay
in browser memory only and can be explicitly revoked. Raw IP addresses are not stored.

Application answers use revisioned autosave. The browser debounces edits, forces a save
after eight seconds of continuous typing, suppresses unchanged drafts and identifies
autosave, navigation, submission and save-and-close modes in audit events. The green
Saved state is displayed only after the API acknowledges the exact revision.

## Routes

```text
GET  /v6/health
POST /v6/session/logout
POST /v6/staff/access/request-code
POST /v6/staff/access/verify-code
GET  /v6/staff/dashboard
POST /v6/staff/applications/detail
POST /v6/staff/applications/revision
POST /v6/staff/invitations
POST /v6/staff/invitations/resend
POST /v6/eoi
POST /v6/application/access/request-code
POST /v6/application/access/verify-code
POST /v6/application/records/select
POST /v6/application/records
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
server. Family record selection is checked against the invitation's server-side
application list; the browser cannot select another family's application ID.
After a signature OTP is verified, `signatures/verify-code` returns a human-readable,
read-only projection of every relevant answer in the frozen submitted revision,
repeated guardian/emergency records, document file names and recorded primary-signature
metadata. It does not return the raw draft answer map, internal IDs, object or Drive locations,
revision hashes, network fingerprints or signature file identifiers.
Document start records use opaque application/upload identifiers in S3 keys. The
presigned PUT is constrained by the approved MIME type, SHA-256 checksum and KMS
encryption; confirmation is idempotent at the Drive upload identifier boundary.

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

The one-time legacy form-version backfill is also dry-run by default. Create and verify
a pre-migration backup before applying it:

```text
pnpm migrate-form-versioning -- --table=TABLE_NAME
pnpm migrate-form-versioning -- --table=TABLE_NAME --apply
```

Follow `../RECOVERY-RUNBOOK.md`. Secrets, active tokens, family answers and uploaded
files do not belong in Git or command output.

## Remaining Governance Decisions

- Approve legal retention and deletion rules.
- Replace the shared staff identity with approved named accounts and access reviews.
- Correlate SES bounce and complaint feedback into operational records automatically.
- Approve remaining collection-notice, consent and signature wording.
- Build Acceptance, Decline and Enrolment Agreement persistence as separate workflows.

See `../ARCHITECTURE-HARDENING.md`, `../RECOVERY-RUNBOOK.md` and
`../STAFF-PORTAL-RUNBOOK.md`.
