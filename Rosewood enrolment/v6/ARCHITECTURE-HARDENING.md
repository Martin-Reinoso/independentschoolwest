# V6 Essential Hardened Architecture

Decision date: 5 August 2026

## Decision

Rosewood will use the essential Sydney-only architecture for the expected volume of
approximately 30 applications per year. Cross-region replication is intentionally not
included. The small volume does not reduce the sensitivity of identity, health,
residency, court-order, document and signature information, but it does make a simple
managed-services design preferable to a larger SQL platform.

## Trust Model

```text
Family browser
  -> Lambda authorization, OTP, validation and revision checks
  -> DynamoDB authoritative records
  -> S3 quarantine -> GuardDuty scan -> clean document attachment

Staff browser
  -> staff OTP and role check
  -> audited DynamoDB application view
  -> five-minute clean-document link when authorised

DynamoDB
  -> asynchronous normalized Google Sheets projections
  -> daily/monthly same-region AWS Backup
```

Google Sheets are not a database, backup or authorization boundary. They are disposable
reporting projections. Staff do not receive Sheet links through the portal, and a Sheet
edit cannot update AWS records.

## Controls

| Concern | Control |
| --- | --- |
| Record loss or mistaken edit | DynamoDB point-in-time recovery plus locked daily/monthly backups |
| Database deletion | CloudFormation retention and DynamoDB deletion protection |
| Document replacement/deletion | S3 versioning and 35-day governance Object Lock |
| Malicious uploads | Quarantine prefix, checksum-bound upload and GuardDuty Malware Protection |
| Data at rest | Customer-managed KMS key with annual rotation |
| Public document access | S3 Block Public Access and TLS-only bucket policy |
| Staff access | Allowlisted OTP, two-hour memory-only session and role checks |
| Shared reporting damage | Projection rebuild from authoritative AWS records |
| Staff record inspection | Separate append-only audit table |
| Unsafe download | Recheck clean GuardDuty tag and issue five-minute signed link |
| Regional disaster | Accepted residual risk; no cross-region copy at current scale |

## Retention Boundary

The 35-day Object Lock, 35-day daily backups and 366-day monthly backups are operational
recovery controls. They do not decide how long Rosewood is legally required to retain
applications, supporting evidence or signatures. Governance must approve deletion and
legal-retention rules before automated record expiry is added.

## Cost Position

At approximately 30 applications per year, DynamoDB, Lambda, S3 and SES usage should
remain very small. The recurring architecture cost is primarily customer-managed KMS,
GuardDuty Malware Protection, AWS Backup storage and any alert traffic. Actual monthly
cost must be monitored in AWS rather than treated as a fixed quote. Cross-region storage
and transfer costs are deliberately avoided.

## Deferred

- cross-region backup or replication
- a relational SQL database
- public or direct staff access to storage
- automated legal-retention deletion
- Acceptance, Decline and Enrolment Agreement backends
