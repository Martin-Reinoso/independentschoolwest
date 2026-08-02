# V2 Operations

## Invitation Creation

Only an authorised operator creates invitations. After deployment:

```bash
ROSEWOOD_TABLE_NAME="$TABLE_NAME" \
ENROLMENT_PAGE_URL="https://ffe.org.au/pages/rosewood-enrolment-v2.html" \
node "Rosewood enrolment/v2/lambda/scripts/create-invitation.mjs" \
  --email "invited-address" \
  --student "student-name" \
  --family "family-label"
```

The command prints the only copy of the raw invitation link. DynamoDB stores its hash,
not the raw token. Share the link through the approved invitation message and do not put
it in ordinary notes, Sheets or source control.

## Google Sheet

Initialise the private operational tab with:

```bash
node "Rosewood enrolment/v2/lambda/scripts/init-google-sheet.mjs"
```

The tab contains only timestamp, event, opaque application/invitation IDs, stage,
elapsed time, viewport, schema version and event ID. It intentionally excludes names,
email addresses, medical answers, OTPs, tokens and signatures.

## Google Runtime Identity

- Confirm `GOOGLE_AUTH_MODE` matches the approved identity before each deployment.
- For `service_account`, confirm the destination remains inside the approved Shared
  Drive and the service account has no access beyond the restricted folder/Sheet.
- For `user_oauth`, confirm the dedicated organisation account remains active, protected
  by MFA and owned through a documented recovery route; rotate or revoke the refresh
  token through Secrets Manager without placing it in shell history or Git.
- Switching modes or Google users requires a successful create/delete probe, Sheet read,
  synthetic upload, canonical snapshot and signature-artifact canary before use.
- Use `scripts/authorize-google-user.mjs --apply` for initial authorisation or token
  rotation. It verifies the exact mailbox and storage before changing Secrets Manager;
  never paste the refresh token into a shell, task, document or message.
- The 3 August 2026 test stack uses `user_oauth` successfully, but the selected account
  also contains unrelated Drive data. This is acceptable only for the isolated synthetic
  test. Do not issue a real-family invitation until the grant is moved to a dedicated,
  data-empty organisation account or replaced by the preferred restricted Shared Drive
  service account.
- Folder enforcement limits where this application writes. It does not reduce the full
  Drive scope held by the delegated-user refresh token, so account-level data separation
  is a mandatory credential-compromise control.

## Daily Checks

- Lambda errors and latency
- DynamoDB throttles and conditional-write anomalies
- SES bounces, complaints and suppression state
- pending outbox records
- EventBridge outbox rule invocations and records whose lease repeatedly releases
- Drive folder membership and unexpected sharing changes
- OAuth client ownership, refresh-token validity and organisation-account recovery when
  `user_oauth` is selected
- Sheet headers and sharing configuration
- invitations or signature tasks nearing expiry
- applications remaining in `pending_signatures`
- idempotency records remaining `PENDING` for more than 60 seconds; a client retry may
  reclaim one automatically, but repeated stale claims require Lambda/DynamoDB review

## Support Language

- `Saved on this device` means only the local fallback exists.
- `Saving securely` means the server has not acknowledged the newest revision yet.
- `Saved securely` means DynamoDB acknowledged the displayed revision.
- `Pending signatures` means the primary signature is recorded but another required
  guardian has not completed their independent task.
- `Submitted` means every required signature is attached to the frozen revision.
- Retrying a timed-out submission with the same idempotency key returns its original
  result when the transaction committed; do not create a second application or ask the
  family to sign again until that replay has been checked.
- `Receipt verified` means one receipt recipient used their private link and a fresh OTP;
  it does not reopen the application or establish an enrolment offer.

Never ask a family to send an OTP, private task link, medical plan, identity document or
court order through ordinary email.

## Receipt Support

- Each required signer receives a different receipt link after the final signature.
- A receipt link expires after 30 days in the test configuration; the authenticated view
  expires after 30 minutes.
- If a family loses or forwards a link, do not disclose the token or bypass OTP. Revoke
  the receipt task and issue a new controlled task through an approved operator process.
- The receipt intentionally omits application answers and documents. Staff must use the
  restricted canonical record, not ask the family to email a copy.
- A receipt proves recorded submission metadata only. It is not an admission decision,
  fee agreement, offer or enrolment confirmation.

## Email Delivery

Interactive operations attempt immediate outbox delivery. The `RosewoodOutboxSchedule`
EventBridge rule retries unsent records every minute. Each worker must claim a 60-second
lease before sending; sent records retain `sentAt`. Investigate rather than repeatedly
manually invoking the function if the same item remains unsent. SES bounce/complaint
handling and operational alarms remain launch blockers.

The individually verified test sender is not an acceptable production identity. In the
3 August 2026 live canary Gmail displayed it as arriving via `amazonses.com` and placed
all OTP, invitation, completion and retry messages in spam. Before family use, deploy a
Rosewood-controlled domain with aligned SPF, DKIM and DMARC, leave SES sandbox, configure
bounce/complaint handling, and repeat inbox-placement tests across common providers.

## Synthetic Canary Evidence

The 3 August 2026 synthetic application is intentionally retained in the isolated test
stack while the implementation is reviewed. It includes six restricted Drive artifacts,
one privacy-minimised Sheet row and the DynamoDB application/task/audit records. It is not
authority to retain future test data indefinitely. Record an owner and deletion date,
then remove the DynamoDB records, Drive artifacts and Sheet row together before any
production-shaped deployment. Do not delete submitted real-family evidence through a
test cleanup process.

## Incident Boundaries

Revoke the invitation/task or session record rather than editing history. Preserve
submitted snapshots and signature metadata. Escalate suspected mailbox compromise,
misdirected invitation, exposed token, unauthorised Drive sharing, SES abuse, signature
dispute or incorrect legal-authority mapping to the designated privacy and enrolment
owners.
