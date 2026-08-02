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

## Daily Checks

- Lambda errors and latency
- DynamoDB throttles and conditional-write anomalies
- SES bounces, complaints and suppression state
- pending outbox records
- EventBridge outbox rule invocations and records whose lease repeatedly releases
- Drive folder membership and unexpected sharing changes
- Sheet headers and sharing configuration
- invitations or signature tasks nearing expiry
- applications remaining in `pending_signatures`

## Support Language

- `Saved on this device` means only the local fallback exists.
- `Saving securely` means the server has not acknowledged the newest revision yet.
- `Saved securely` means DynamoDB acknowledged the displayed revision.
- `Pending signatures` means the primary signature is recorded but another required
  guardian has not completed their independent task.
- `Submitted` means every required signature is attached to the frozen revision.
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

## Incident Boundaries

Revoke the invitation/task or session record rather than editing history. Preserve
submitted snapshots and signature metadata. Escalate suspected mailbox compromise,
misdirected invitation, exposed token, unauthorised Drive sharing, SES abuse, signature
dispute or incorrect legal-authority mapping to the designated privacy and enrolment
owners.
