# Rosewood V6 Backend

This service implements Expression of Interest and Application for Enrolment only.
Offer acceptance, decline and the post-offer Enrolment Agreement remain separate,
preview-only workflows.

## Authoritative Data Boundary

AWS in `ap-southeast-2` is authoritative for operational records:

- DynamoDB stores application-link request, EOI, application, invitation, draft,
  session and outbox records.
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
The current EOI `2026.17` and Application `2026.18` contracts pin the family, staff and signing HTML/JavaScript/CSS,
policy projection and all original Word/PDF policy assets. Policy viewing is frontend-
only and does not create an application answer, acknowledgement or audit event.
EOI `2026.15` preserves its earlier data contract. Application `2026.15` preserves the
V6.14 answer and validation contract while clarifying the other-children wording and
targeting the exact incomplete field from validation guidance. Earlier versions retain
their pinned display data. Application `2026.16` preserves that contract and corrects
only the guardian signing page's displayed date to the Melbourne calendar day. EOI
`2026.16` and Application `2026.17` preserve the preceding question/data contracts and
pin the staff-only expired-access renewal interface. V18 also pins the public
application-link request and staff request-list interfaces without changing any EOI or
Application answer. The minimal request has its own immutable
`rosewood-application-link-request-2026.1` contract. Manual address entry remains available and no Place ID,
coordinates or search history is stored.

`GOOGLE_MAPS_BROWSER_API_KEY` is read from the existing Secrets Manager configuration.
It is returned through the no-store EOI runtime-config route and an OTP-verified
Application context. Browser keys are necessarily visible to the browser, so the key
must be restricted in Google Cloud to `ffe.org.au`/`www.ffe.org.au` plus Maps JavaScript
API and Places API (New). Never commit the key or print it in logs.

## Invitations And Staff Access

- The implemented application-link request asks only for parent/guardian name and
  email. It creates a direct family invitation, does not collect child information and
  never links an EOI by matching email. Its public launch is currently paused: the home
  page does not call this route, and the renamed no-index review page is a
  network-disabled simulation. The route and existing records are retained for a later
  reviewed activation.
- Request submission is idempotent, protected by honeypot, minimum-elapsed-time,
  network and hashed-email limits, and returns a generic success response. Repeated
  requests rotate the private link on the same family invitation/application.
- The durable email-bound request index survives expiring invitation indexes. If a
  family asks again after expiry, the service conditionally restores the same
  invitation ID from the permanent application rather than creating another record.
- A direct invitation requires the parent/guardian first name and email; surname is
  optional and no child name is collected by staff.
- An EOI is linked only when staff explicitly select the matching record and email.
- Initial and replacement invitation links expire after 14 days.
- Active editable invitations use token-rotating **Resend**. Editable applications
  whose invitation index is expired, inactive or missing use **Renew access**. Renewal
  keeps the same application IDs and revisions, is transactionally conditional and
  idempotent, and never applies to a submitted application or an active invitation.
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
- Contact permission and signature requirement are separate stored values. The backend
  does not create, recover, resend or verify a signing task for a guardian marked **Do
  not contact**. The applicant's explanation is retained and the application enters
  staff review when no permitted electronic signature remains.
- Submitted applications have a secure read-only family status session. Correcting a
  permitted pending signer's email requires applicant step-up OTP, transactionally
  revokes the old task and preserves restricted email history. It does not change the
  application ID, frozen answer revision or submitting applicant's signature.

## Runtime

- AWS Lambda Function URL in Sydney
- Amazon SES from `Rosewood College Enrolment <enrolment@ffe.org.au>` with replies to
  `enrolment@ffe.org.au`
- EventBridge outbox retry every minute
- eight-attempt outbox ceiling with retained failure records and a CloudWatch alarm
- stack-managed SES configuration set and encrypted delivery-feedback topic
- separate Slack incoming webhooks for pending-signature notifications to private
  `#enrolments-committee` and completed Applications to board-access-only `#enrolments`
- CloudWatch error alarm and 90-day application logs
- SNS email alerts for Lambda errors and failed backup/restore jobs
- a read-only EventBridge production canary every 10 minutes
- independent CloudWatch alarms for public form assets, backend health/form versions,
  EOI Google-address configuration, protected workflow routes and stale outbox work
- separate alarms for Lambda errors/throttling, terminal outbox failure and SES
  transactional-email delivery failure
- alarm and recovery email notifications through the existing encrypted SNS topic to
  `info@ffe.org.au` and `frjativa@gmail.com`

The production canary performs only public or deliberately unauthenticated `GET`
requests plus a projection-limited DynamoDB query for pending outbox timestamps and
attempt counters. It does not load outbox payloads or create an EOI, invitation, OTP,
session, application, upload, signature or email. Every run publishes five aggregate
availability values in the `Rosewood/Enrolment` namespace. An availability alarm changes
to `ALARM` after two consecutive failed or missing 10-minute observations and returns
to `OK` after recovery. Persistent failures therefore do not generate an email on every
run. New SNS email subscriptions require the recipient to confirm the AWS subscription
once before alerts can be delivered.

Slack is a notification surface only. `SLACK_PENDING_WEBHOOK_URL` and
`SLACK_COMPLETION_WEBHOOK_URL` are held in the existing AWS configuration secret and
must never be printed, committed or returned through an API. The transaction queues a
pending outbox item after primary submission and after an intermediate guardian signs
while another required electronic signer remains. It queues a completion item when the
authoritative status becomes `submitted`: immediately for a one-guardian application,
or after the last required signature. `staff_review_required` does not notify. Messages
contain only student and signer names, the Application reference, relevant Melbourne
time and generic staff-portal link; they contain no email, answers, documents, medical
information or internal identifiers. Failed delivery releases the outbox lease for the
normal one-minute retry. After eight failures the item moves to `OUTBOX_FAILED` and the
alarm notifies operations. DynamoDB remains the source of truth.

SES message IDs are indexed against non-sensitive tags and pending signer-task metadata.
Configuration-set events update send/delivery/delay/bounce/complaint/reject/rendering
state idempotently, append restricted audit evidence and project an Email Events row
without a recipient address. A signature event that arrives before its correlation
index fails transiently so SNS retries it rather than losing signer status.

Family OTP challenges expire after 10 minutes, allow five attempts and have resend and
network throttles. Family and child-application sessions use a sliding 90-minute
inactivity timeout with an eight-hour absolute limit; staff sessions expire after two
hours and guardian-signing sessions retain their separate 30-minute limit. Sessions stay
are server-side and can be explicitly revoked. The family page may keep only opaque
active-session tokens/expiry in per-tab session storage to survive a refresh; the staff
page keeps an opaque token locally only after explicit **Remember me**. No answers or
dashboard records are persisted in browser storage. Raw IP addresses are not stored.

Launch-capacity throttles permit 100 public Application-link requests per shared
network per hour, with a 500-per-day shared-network ceiling, and 100 Application-access
OTP requests per shared network per 30 minutes. Existing per-email, per-invitation,
cooldown, idempotency and honeypot controls remain stricter and unchanged.

The Discover Rosewood home page also uses `POST /v6/community-enquiries`. The endpoint
validates the versioned four-field community-enquiry contract, applies bot friction,
idempotency and network/email throttles, and atomically stores the authoritative record,
restricted audit event and email outbox item in DynamoDB. The outbox sends one
notification to `info@ffe.org.au` with the enquirer as Reply-To. It does not write an
EOI, Application, invitation or Google Sheet row.

Application answers use revisioned autosave. The browser debounces edits, forces a save
after eight seconds of continuous typing, suppresses unchanged drafts and identifies
autosave, navigation, submission and save-and-close modes in audit events. The green
Saved state is displayed only after the API acknowledges the exact revision.

## Routes

```text
GET  /v6/health
GET  /v6/eoi/config
POST /v6/session/logout
POST /v6/staff/access/request-code
POST /v6/staff/access/verify-code
GET  /v6/staff/dashboard
POST /v6/staff/applications/detail
POST /v6/staff/applications/revision
POST /v6/staff/invitations
POST /v6/staff/invitations/resend
POST /v6/staff/invitations/renew-access
POST /v6/staff/applications/contact-permission
POST /v6/eoi
POST /v6/application-link-requests
POST /v6/community-enquiries
POST /v6/application/access/request-code
POST /v6/application/access/verify-code
GET  /v6/application/family
POST /v6/application/records/select
POST /v6/application/records
GET  /v6/application/context
PUT  /v6/application/draft
POST /v6/application/documents/start
POST /v6/application/documents/confirm
POST /v6/application/submit
POST /v6/application/records/status
GET  /v6/application/status
POST /v6/application/status/signatures/resend
POST /v6/application/status/signatures/correction/request-code
POST /v6/application/status/signatures/correction/verify-code
POST /v6/application/status/signatures/correction/confirm
POST /v6/application/signatures/opened
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
- Approve remaining collection-notice, consent and signature wording.
- Build Acceptance, Decline and Enrolment Agreement persistence as separate workflows.

See `../ARCHITECTURE-HARDENING.md`, `../RECOVERY-RUNBOOK.md` and
`../STAFF-PORTAL-RUNBOOK.md`.
