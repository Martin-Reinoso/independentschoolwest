# V6 Recovery Runbook

## Safety Rules

- Use only `ap-southeast-2` and verify the AWS account before any restore.
- Keep stack termination protection enabled during normal operation. Disabling it
  requires explicit change approval and is not needed for ordinary stack updates.
- Never restore over production. Restore to a new table, validate it, then change
  configuration through a reviewed deployment.
- Do not print or export family values while diagnosing recovery.
- Record who authorised the recovery, restore point, resources and validation outcome.

## Daily Checks

1. Confirm the Lambda error/throttle alarms, email-delivery and outbox permanent-failure
   alarms, and all five production-canary alarms are `OK`.
2. Confirm the latest scheduled backup jobs for both DynamoDB tables completed.
3. Investigate any backup or application-error notification before normal processing.
4. Confirm the restricted enrolment Drive has no public or link-wide sharing.

## Automated Production Canary

EventBridge invokes the existing V6 Lambda every 10 minutes with a dedicated canary
event. The invocation performs non-writing checks and publishes these CloudWatch metrics
in `Rosewood/Enrolment`:

- `PublicFormAvailability`: family/EOI, guardian-signing and staff HTML/JavaScript/CSS
  assets are reachable and contain their expected release markers
- `BackendHealthAvailability`: `/v6/health` is reachable, reports `ok` and matches the
  immutable EOI and Application versions bundled with the Lambda
- `EoiAddressAvailability`: `/v6/eoi/config` accepts only the production origin, retains
  `no-store` and returns an enabled Australian Google Places browser configuration
- `ApplicationWorkflowAvailability`: Application context/status and staff dashboard
  routes are reachable and still reject an unauthenticated request with
  `SESSION_REQUIRED`
- `OperationalPipelineAvailability`: a projection-limited DynamoDB query confirms that
  email, Sheets or Slack work has not remained pending for more than 15 minutes; the
  query does not load queued payloads

Each availability alarm requires two consecutive failed or missing 10-minute observations before
alerting the encrypted SNS topic. It sends a second state-change notification after
recovery. The topic emails `info@ffe.org.au` and `frjativa@gmail.com`; each new email
subscription must be confirmed once from its AWS confirmation message.

When an alarm arrives:

1. Identify the named alarm; do not request or create a family record for diagnosis.
2. Review the latest `production_canary` CloudWatch log entry. It contains only check
   names, duration, availability and a bounded safe failure reason.
3. For a public-form alarm, confirm GitHub Pages deployment and asset availability.
4. For backend health, check Lambda status, the normal error alarm and `/v6/health`.
5. For EOI address configuration, follow **Recover Google Address Suggestions** below;
   manual address entry should remain available while Google is unavailable.
6. For protected-workflow failure, confirm the route still returns `401` and
   `SESSION_REQUIRED` without using a real invitation or session.
7. For a stale-pipeline alarm, inspect only pending age, event type and attempt count;
   then follow the provider-specific SES, Sheets or Slack recovery section.
8. For throttling, review concurrency and request volume before changing limits. For an
   email-delivery alarm, inspect the restricted SES event and application status rather
   than searching ordinary logs by recipient address.
9. Confirm a later successful scheduled observation returns the alarm to `OK`. Do not
   force an alarm state to hide an unresolved production issue.

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

## Recover Expired Or Missing Application Invitation Access

This recovery is for an application that is still `invited` or `in_progress` but no
longer has usable invitation access. It is not guardian-signature recovery.

1. Find the existing application in the staff portal. Do not create a new invitation.
2. If the row offers **Resend**, its invitation is active; use the ordinary resend path
   only when a replacement active link is required.
3. If the row offers **Renew access**, confirm the recipient and select it once.
4. Confirm the result says saved progress was preserved, refresh the row and require
   it to offer **Resend** with a new 14-day expiry.
5. If renewal reports that access is already active or that the application changed,
   refresh the portal before taking any further action. Do not retry using a different
   operation or create a duplicate application.

Renewal is an authorised, rate-limited and audited staff operation. Its DynamoDB
transaction requires the same application ID, invitation ID, editable status and
revision observed by the portal. It replaces or recreates only invitation access,
queues one private email, preserves the original application and family child IDs, and
is idempotent for duplicate confirmation requests. Submitted applications are never
eligible. A retained expired token is removed when its index still exists; any already
expired token is also rejected by the access endpoint's expiry check.

## Recover A Public Application-Link Request

1. Check the staff portal **Link requests**, related invitation/Application and Email
   Events. Do not ask the family for child data and do not inspect ordinary logs for a
   full email address.
2. If the family submits the public card again, the service normally rotates the link
   on the same family invitation/Application. It must not create a duplicate.
3. If the old invitation index has expired, the backend uses the durable hashed-email
   request index and retained Application to recreate only the same invitation access.
4. If the portal shows a queued email, follow the outbox/SES recovery below rather than
   submitting repeated synthetic requests.
5. If the email/application relationship conflicts, stop automated recovery and review
   the restricted audit history. Never repair the conflict by linking an EOI based on
   email or manually editing a Sheet.

The public success response is deliberately generic and is not delivery evidence.
Authoritative success requires the request transaction plus outbox/SES status.

## Recover SES Delivery Feedback Or Failed Outbox Work

1. For a signer-delivery issue, inspect the authorised application status and the
   corresponding `EMAIL_MESSAGE#messageId` index; do not search logs by full email.
2. Confirm the stack configuration set, encrypted SNS topic, Lambda subscription and
   permission are active in `ap-southeast-2`.
3. `accepted_by_ses`, `delivered`, `delayed`, `bounced`, `complained`, `rejected` and
   `rendering_failed` are distinct states. Do not manually mark delivery based only on
   an outbox receipt.
4. Duplicate SNS notifications are safe. If a signature event reached Lambda before
   its message index, Lambda intentionally fails that invocation so SNS retries after
   correlation is committed.
5. If `RosewoodOutboxPermanentFailureAlarm` fires, inspect the restricted
   `OUTBOX_FAILED` record by event ID and type. Do not copy its payload into a ticket.
   Resolve the provider/configuration cause before any authorised replay.
6. Never replay a completed event or create a new application to compensate. Preserve
   the original business record and use an idempotent recovery operation.

If an OTP or transactional send fails with authorization against a
`configuration-set/...` resource, confirm the Lambda role's `ses:SendEmail` statement
contains the exact managed configuration-set ARN as well as the verified sender
identities. Repair it through a reviewed CloudFormation change set; do not disable the
configuration set or broaden email permission to `*` as a workaround.

## Recover Or Diagnose A V6.11 Draft Upgrade

Editable older drafts upgrade only when the family verifies the invitation or selects
that child. The operation is conditional on the prior revision and form version.

1. Check for `application.form_definition_upgraded` in the restricted audit record and
   an immutable `form_definition_upgraded` application revision.
2. Confirm the current record is `rosewood-application-2026.13` and that aggregate answer
   key count did not decrease. Do not print family answers into logs or tickets.
   A retained `previous_school_attended`, `previous_school_name` or
   `previous_school_year_level` value is expected historical data and must not be
   deleted merely because V6.8 through V6.11 no longer render it.
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

## Recover Slack Application Notifications

Slack is an operational prompt, not evidence that an application is complete. Confirm
completion in DynamoDB or the authorised staff portal before taking action.

1. Check the outbox receipt for the Slack event using the application reference only;
   do not copy application answers into logs or incident notes.
2. If no receipt exists, confirm the pending outbox item remains available for the
   one-minute EventBridge retry and review the Lambda error log for a bounded delivery
   status. Do not manually post family details to compensate.
3. Confirm the internal app **Rosewood Enrolment Notifications** is installed in the
   FamiliesForEducation workspace, with the pending webhook assigned to private
   `#enrolments-committee` and the completion webhook assigned to `#enrolments`.
4. Confirm `SLACK_PENDING_WEBHOOK_URL` and `SLACK_COMPLETION_WEBHOOK_URL` exist in the
   existing AWS configuration secret without printing their values. Recycle the Lambda
   after a secret-only update because configuration is cached by warm environments.
5. If either webhook is exposed or revoked, create a replacement for the same channel,
   update only the corresponding secret key, recycle the Lambda, then revoke the former
   webhook. Do not store a replacement in Git, a ticket, Slack or Google Sheets.
6. Do not replay an event when a successful outbox receipt already exists. If manual
   recovery is authorised for a genuinely undelivered event, preserve the same
   idempotency boundary and disclose only the names, reference, relevant time and the
   generic staff-portal link allowed for that event type.

## Recovery Drill

Run a synthetic DynamoDB restore drill at least annually and after material storage
changes. Restore to new resources, verify encryption and counts, test the projection
dry run, and clean up only after approval. Never use a real family record as a canary.
