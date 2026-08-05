# SES Production Readiness

Audit date: 5 August 2026
AWS region: `ap-southeast-2`

This record covers the transactional sender used for EOI acknowledgements, application
invitations, OTPs, guardian tasks and status messages. Email readiness does not approve
Rosewood content, privacy, retention or legal wording for real-family use.

## Sender Contract

- From: `enrolment@ffe.org.au`
- Reply-To: `enrolment@ffe.org.au`
- Operational mailbox: `info@ffe.org.au`
- SES identity: `ffe.org.au`
- Custom MAIL FROM: `bounce.ffe.org.au`
- AWS region: `ap-southeast-2`

Do not create SMTP credentials or IAM access keys for the enrolment service. The Lambda
uses its execution role and permits `ses:SendEmail` only through the verified domain or
exact sender identity when the visible From address is `enrolment@ffe.org.au`.

## Verified External State

The following were verified against authoritative DNS and the organisation mailbox on
5 August 2026:

- Google Workspace MX records are active for `ffe.org.au`.
- The root SPF record delegates to Google Workspace and only one root SPF record exists.
- DMARC is published with `p=quarantine`, relaxed DKIM/SPF alignment and aggregate
  reporting.
- `bounce.ffe.org.au` has exactly one SES MX record for Sydney and an SES SPF record.
- AWS reported successful DKIM verification for the `ffe.org.au` domain in Sydney.
- AWS approved SES production access in Sydney with a 50,000-message daily quota and
  14-message-per-second sending rate.
- A synthetic message addressed to `enrolment@ffe.org.au` arrived in the
  `info@ffe.org.au` inbox. No applicant or family information was used.
- The domain and exact sender identities are verified and DKIM signing is successful.
- Custom MAIL FROM is `bounce.ffe.org.au`, status is successful and MX failure behavior
  is `REJECT_MESSAGE` for both identities.
- Account suppression is enabled for both bounces and complaints.
- The `rosewood-enrolment-email` stack and confirmed SNS subscription are active.
- Bounce and complaint topics are configured for both identities. Ordinary feedback
  forwarding was disabled only after SNS confirmation.

## AWS State

1. `ffe.org.au` is verified for sending and DKIM signing is successful.
2. Custom MAIL FROM is `bounce.ffe.org.au` with `REJECT_MESSAGE` on MX failure.
3. Account-level suppression is enabled for both `BOUNCE` and `COMPLAINT`.
4. The `rosewood-enrolment-email` stack is deployed from
   `infra/transactional-email.yaml`.
5. The SNS subscription to `info@ffe.org.au` is confirmed.
6. The domain identity publishes bounce and complaint notifications to the stack's SNS
   topic; ordinary feedback forwarding is disabled only after the topic is confirmed.
7. The production Lambda role has an equivalent inline least-privilege policy. The
   reusable managed policy remains unattached and must never be attached to a human
   user.

## Test Sequence

Completed with synthetic content on 5 August 2026:

1. SES mailbox simulator successful-delivery request was accepted.
2. SES mailbox simulator permanent bounce generated an SNS alert in `info@ffe.org.au`.
3. SES mailbox simulator complaint generated an SNS alert in `info@ffe.org.au`.
4. Controlled EOI, invitation, OTP, guardian and completion messages reached the
   operations mailbox.
5. A post-hardening controlled message reached Inbox. Gmail original headers reported
   SPF, DKIM and DMARC pass, and Return-Path used `bounce.ffe.org.au`.

Reply routing to `enrolment@ffe.org.au` had already been verified through the Google
Workspace alias. Recheck it after any alias or mailbox-routing change.

Store SES message IDs only in restricted operational logs. Do not place OTPs, active
links, family details, recipient lists, SMTP credentials or AWS identifiers in Git.

## Backend Requirements

- Send one recipient per SES request and retain the returned SES message ID against the
  outbox event so feedback can be correlated without exposing message contents.
- Stop retries for permanent bounces and complaints. Account suppression is a safety
  net, not a replacement for application-level delivery state.
- Rate-limit OTP creation independently of SES. A successful SES API response means the
  message was accepted for delivery, not that the family received it.
- Keep invitations, OTPs and guardian links out of analytics and ordinary support email.
- Alert staff on hard bounce, complaint, reject and sustained delivery delay; never ask a
  family to forward an OTP or private link for troubleshooting.
- Monitor sending quota, bounce rate, complaint rate and pending outbox records before
  and during each invitation campaign.

## Status

`READY` for the implemented EOI and Application transactional messages. Operational
staff receive bounce and complaint alerts. Automatic feedback correlation back into the
Operations Sheet remains a backend follow-up and is not required for SES authentication
or delivery readiness.
