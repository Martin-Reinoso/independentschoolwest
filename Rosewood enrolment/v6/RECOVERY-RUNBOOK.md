# V6 Recovery Runbook

## Safety Rules

- Use only `ap-southeast-2` and verify the AWS account before any restore.
- Never restore over production. Restore to a new table, validate it, then change
  configuration through a reviewed deployment.
- Do not print or export family values while diagnosing recovery.
- Record who authorised the recovery, restore point, resources and validation outcome.

## Daily Checks

1. Confirm the Lambda error alarm is `OK`.
2. Confirm the latest scheduled backup jobs for both DynamoDB tables completed.
3. Investigate any backup or application-error notification before normal processing.
4. Confirm the restricted enrolment Drive has no public or link-wide sharing.

## Restore Authoritative Records

1. Choose a DynamoDB point-in-time or AWS Backup recovery point.
2. Restore to synthetic names such as `rosewood-recovery-main-YYYYMMDD-HHMM` and
   `rosewood-recovery-audit-YYYYMMDD-HHMM`.
3. Keep restored tables disconnected from production Lambda.
4. Compare aggregate counts, schema keys and synthetic canary IDs only.
5. If valid, prepare a reviewed configuration change for a verification Lambda.
6. Obtain explicit approval before changing production configuration.
7. Keep old production tables deletion-protected until the incident closes.

## Rebuild Google Reporting Projections

The rebuild command is a dry run unless an explicit confirmation is supplied:

```text
pnpm rebuild-projections
pnpm rebuild-projections -- --apply --confirm=REBUILD_GOOGLE_PROJECTIONS
```

Before applying, validate AWS record counts, all three spreadsheet IDs and the
delegated Google identity. Applying clears projection data rows while preserving and
repairing canonical headers. Record only counts, not family values.

## Recover Google Drive Documents

- Use the exact Drive file ID stored in DynamoDB; filenames are not authoritative.
- Confirm the file remains inside the approved enrolment folder before using it.
- Do not create a public or link-wide sharing URL during recovery.
- Use Google account recovery/version features according to the organisation's Drive
  administration and retention settings.
- If a file cannot be safely recovered, record the incident and request a replacement
  from the family rather than copying from an unknown source.

## Recovery Drill

Run a synthetic DynamoDB restore drill at least annually and after material storage
changes. Restore to new resources, verify encryption and counts, test the projection
dry run, and clean up only after approval. Never use a real family record as a canary.
