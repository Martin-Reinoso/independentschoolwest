# V6 Recovery Runbook

## Safety Rules

- Use only `ap-southeast-2` and verify the AWS account before any restore.
- Never restore over the production table. Restore to a new table name, validate it,
  then change configuration through a reviewed deployment.
- Do not print or export family values while diagnosing recovery.
- Record who authorized the recovery, the incident time, restore point, restored
  resources, validation outcome and final decision.

## Daily Checks

1. Confirm the Lambda error alarm is `OK`.
2. Confirm the latest scheduled backup jobs for both DynamoDB tables completed.
3. Confirm the GuardDuty malware-protection plan remains active.
4. Investigate any security/backup SNS notification before normal processing continues.

## Restore Authoritative Records

1. Identify whether the required point is within DynamoDB point-in-time recovery or an
   AWS Backup recovery point.
2. Start a restore to new synthetic names such as
   `rosewood-recovery-main-YYYYMMDD-HHMM` and `rosewood-recovery-audit-YYYYMMDD-HHMM`.
3. Keep both restored tables inaccessible to the production Lambda.
4. Compare only aggregate item/entity counts, schema keys and selected synthetic
   canary IDs. Do not copy real values into tickets, chat or Git.
5. If the restore is valid, prepare a reviewed CloudFormation/configuration change to
   point a temporary verification Lambda at the restored tables.
6. Obtain explicit approval before changing production configuration.
7. Preserve the old production tables under deletion protection until the incident is
   closed and the retention owner approves cleanup.

## Rebuild Google Reporting Projections

Only rebuild after the AWS records have been validated. The command clears data rows in
the existing projection tabs while preserving headers.

1. Confirm all three spreadsheet IDs and the delegated Google account.
2. Run the dry form and retain only its row-count output:

   ```text
   pnpm rebuild-projections
   ```

3. Compare counts with the staff portal and authoritative table aggregate counts.
4. Obtain approval to replace the projections.
5. Run:

   ```text
   pnpm rebuild-projections -- --apply --confirm=REBUILD_GOOGLE_PROJECTIONS
   ```

6. Confirm all tabs contain the expected counts and no extra sharing was introduced.
7. Record completion as an operational audit/incident note without family data.

## Document Recovery

- New V6 artifacts are versioned and Object Locked in S3. Retrieve the exact version
  referenced by DynamoDB; do not select an object only by filename.
- A supporting document can be exposed through the staff portal only while its exact
  version retains a clean GuardDuty scan tag.
- If a scan tag is missing, unsafe or failed, do not bypass the portal or copy the file
  to an unscanned location. Escalate and ask the family for a replacement if required.
- Legacy Google Drive artifacts remain legacy evidence and are not automatically made
  downloadable by the hardened portal.

## Recovery Drill

Run a synthetic restore drill at least annually and after a material storage change.
The drill must use synthetic identifiers only, restore to new resources, verify counts
and encryption, test the projection dry run, and remove temporary resources only after
the drill record is approved. Do not use a real family record as a canary.
