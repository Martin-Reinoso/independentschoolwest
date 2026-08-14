# V6 Essential Hardened Architecture

Decision date: 6 August 2026

## Decision

Rosewood will use a small Sydney-only managed-services architecture for approximately
30 applications per year. Cross-region replication, SQL and GuardDuty are intentionally
outside the launch scope.

The decision not to use GuardDuty does not make Google Drive a public repository.
Application files remain private, access-controlled enrolment records and must follow
the Google Drive controls documented in `../GOOGLE-DRIVE-INTERIM-GUIDELINES.md`.

## Trust Model

```text
Family browser
  -> Lambda authorization, OTP, validation and revision checks
  -> DynamoDB authoritative records and append-only audit events
  -> private encrypted S3 upload staging
  -> Lambda-verified restricted Google Drive documents, snapshots and signatures

Staff browser
  -> staff OTP and role check
  -> audited DynamoDB application view
  -> document access through the restricted enrolment Drive

DynamoDB
  -> asynchronous normalized Google Sheets reporting projections
  -> point-in-time recovery and daily/monthly same-region AWS Backup
```

Google Sheets are not a database, backup or authorization boundary. They are
replaceable reporting projections. A Sheet edit cannot update an AWS record.

## Controls

| Concern | Launch control |
| --- | --- |
| Record loss or mistaken edit | DynamoDB point-in-time recovery plus daily/monthly backups |
| Database deletion | CloudFormation retention and DynamoDB deletion protection |
| Data at rest | Customer-managed KMS encryption with annual rotation |
| Staff access | Allowlisted OTP, memory-only sessions and role checks |
| Shared reporting damage | Projection rebuild from authoritative AWS records |
| Staff record inspection | Separate append-only DynamoDB audit table |
| Uploaded files | Immediate progress to KMS-encrypted private staging; server verification; restricted Drive final storage; PDF/JPG/PNG only and 10 MB limit |
| Abandoned staging uploads | Opaque keys, 15-minute upload authorisation and one-day lifecycle expiry |
| Public file access | No public or link-wide Drive sharing |
| Regional disaster | Accepted residual risk; no cross-region copy at current scale |

Google Drive is the authoritative file store for launch documents, application
snapshots and signature images. DynamoDB stores their identifiers and metadata. The
staff portal intentionally does not generate public or short-lived download URLs;
authorised operators use the restricted enrolment Drive.

## Backup Boundary

DynamoDB point-in-time recovery covers approximately 35 days. AWS Backup retains daily
copies for 35 days and monthly copies for 366 days in the Sydney region. These are
operational recovery controls, not Rosewood's legal-retention schedule.

Google Drive recovery and retention remain governed by the organisation account and
the approved enrolment-folder process. The S3 staging bucket is not backed up because
it contains only incomplete transport objects; successful objects are deleted after
Drive confirmation and abandoned objects expire after one day. A future move to S3 as
the authoritative file store requires a separate design, migration and approval.

## Cost Position

At approximately 30 applications per year, Lambda, DynamoDB, SES and backup usage
should remain small. The main predictable AWS charge is the customer-managed KMS key,
plus stored backups and normal request traffic. The 10-minute non-writing production
canary adds 144 short Lambda invocations per day, five custom availability metrics and
five availability alarms; this remains deliberately smaller than a browser-synthetics or
cross-region monitoring design. Costs must still be monitored in AWS.

## Deferred

- GuardDuty and authoritative/long-term S3 document storage
- cross-region backup or replication
- a relational SQL database
- automated legal-retention deletion
- Acceptance, Decline and Enrolment Agreement backends
