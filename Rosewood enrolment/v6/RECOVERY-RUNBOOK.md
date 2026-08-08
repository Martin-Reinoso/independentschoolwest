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

## Recover A Missing Signature Request

1. Confirm the application is submitted and the signer is still pending.
2. Confirm the authoritative signer control says contact is permitted. Stop if it says
   **Do not contact**; neither staff nor the repair command may bypass that value.
3. Confirm no current invited task exists before using the dry-run repair command.
4. Prefer the applicant's read-only **Resend signature request** action for an ordinary
   delivery problem. It rotates the task and is rate-limited and idempotent.
5. If the email is wrong, the submitting applicant should use **Correct email address**
   and step-up OTP. Do not edit DynamoDB or Sheets manually.
6. If operational repair is necessary, run `pnpm repair-signature-invitations` without
   apply first. Review aggregate output only, then use the documented explicit apply
   confirmation. Re-run dry mode to confirm zero missing permitted tasks.

An email correction keeps the application ID, submitted revision and primary signature.
It must leave the old task `revoked`, expire matching OTP challenges and signing
sessions, preserve the previous email in restricted history and record audit events for
correction and revocation. If correction and signing race, exactly one conditional
transaction succeeds; refresh the authoritative application before any further action.

If the replacement email was accepted by SES but the family reports non-delivery, check
the outbox receipt and SES feedback. `accepted_by_ses` is not proof that the recipient's
mailbox accepted or displayed the message. Never expose a full historical email in an
ordinary log or family-facing response.

## Recover Or Diagnose A V6.10 Draft Upgrade

Editable older drafts upgrade only when the family verifies the invitation or selects
that child. The operation is conditional on the prior revision and form version.

1. Check for `application.form_definition_upgraded` in the restricted audit record and
   an immutable `form_definition_upgraded` application revision.
2. Confirm the current record is `rosewood-application-2026.10` and that aggregate answer
   key count did not decrease. Do not print family answers into logs or tickets.
   A retained `previous_school_attended`, `previous_school_name` or
   `previous_school_year_level` value is expected historical data and must not be
   deleted merely because V6.8 through V6.10 no longer render it.
3. If the conditional update lost a race, ask the family to refresh; do not manually
   change `formVersion`, revision or answers.
4. Never run this process against a submitted, pending-signature, staff-review or
   completed application. Those records must remain pinned to their submitted contract.
5. Google Sheets may lag until the outbox runs. Repair/rebuild the projection from
   DynamoDB rather than editing the Sheet.

## Recover Google Address Suggestions

Address suggestions are optional and must fail open to manual entry.

1. Confirm the family still sees the structured manual address fields. If not, treat it
   as a frontend release incident rather than a Google incident.
2. Check Maps JavaScript API and Places API (New) status/quota in project
   `notional-weft-504315-q9` (`Rosewood Enrolment Production`) without copying family
   searches into tickets or logs.
3. Confirm the browser key restrictions still allow only `https://ffe.org.au/*` and
   `https://www.ffe.org.au/*` and only the two approved APIs.
4. Confirm `GOOGLE_MAPS_BROWSER_API_KEY` exists in the existing AWS configuration secret
   without printing its value. Rotate it if exposure is suspected, update the secret,
   recycle Lambda and revoke the old key.
5. For EOI, confirm `GET /v6/eoi/config` returns an enabled Google Places configuration
   from an allowed production origin without copying or logging the key. For Application,
   use a synthetic invitation and OTP. The page must
   send origin-only referrer data and must never expose the private invitation URL.
6. Do not delay applications while Google is unavailable. Families can complete the
   same authoritative fields manually.

## Recovery Drill

Run a synthetic DynamoDB restore drill at least annually and after material storage
changes. Restore to new resources, verify encryption and counts, test the projection
dry run, and clean up only after approval. Never use a real family record as a canary.
