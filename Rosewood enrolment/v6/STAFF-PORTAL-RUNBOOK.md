# Rosewood V6 Staff Portal Runbook

## Scope

The V6 staff portal covers only Expression of Interest and Application for Enrolment:

```text
https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html
```

Offer acceptance, decline and the post-offer Enrolment Agreement remain separate,
preview-only workflows. Do not record or manage them through this portal.

## Access

- The portal is hidden from public navigation and marked `noindex`, but the URL itself
  is not a security boundary.
- AWS verifies an email OTP before returning any records or accepting a staff action.
- The production allowlist currently contains only `info@ffe.org.au`.
- The role model supports `admin`, `admissions` and `viewer`. Admin/admissions can
  invite and resend; viewers cannot.
- Codes expire after 10 minutes, allow five attempts and have server-side email/network
  throttling plus a 30-second resend cooldown.
- Staff sessions expire after two hours. Without **Remember me**, the token remains in
  browser memory and a refresh requires a new code. With explicit **Remember me**, only
  the opaque token, staff email and expiry are kept in local browser storage; each
  authorised activity slides the server expiry to two hours. Sign-out and expiry clear
  the remembered token. Do not enable it on a shared or unmanaged device.
- Do not forward staff codes or leave a signed-in portal unattended.

## Direct Invitation

Use a direct invitation when a family has not submitted an EOI, or when Rosewood has
decided not to link an earlier EOI.

1. Select **Create invitation** and **Direct invitation**.
2. Enter the parent/guardian first name and family email. Surname is optional but
   encouraged so the email can address the family clearly.
3. Select **Send invitation** once.
4. Confirm that the portal reports the recipient and that an application row appears.

Do not enter a child name. After email OTP verification, the family enters each child
and the backend gives each child a separate application record under the invitation.
The initial record has no `source_eoi_id`; matching an existing EOI email never creates
a link by itself.

## EOI-Linked Invitation

Use this path only when the specific EOI should prepopulate the new application.

1. Open **Expressions of interest** and select **Invite to apply**, or choose **From an
   EOI** in the invitation panel.
2. Confirm the student, parent/guardian, email and EOI reference.
3. Select **Send linked invitation** once.

The EOI email must exactly match the invitation recipient. The portal blocks an EOI
already linked to another application. The source EOI record remains separate and is
not overwritten when a family edits prefilled application fields. The linked child's
name, year level and entry year appear in the EOI-linked invitation. The family can add
another child after login without linking that new child to the EOI.

## Resend

Use **Resend** only when a family confirms they cannot use the active invitation.

- The backend creates a new high-entropy token and invalidates the earlier link.
- The link is delivered by SES and is never displayed in the staff browser.
- The replacement link expires 14 days after resend. Initial links also last 14 days.
- Resend is available while at least one child application under the invitation remains
  editable. It is not available when the family has no editable application.
- Earlier invitations created before token rotation was introduced may require a new
  invitation instead of a resend.

## Application Review And Documents

The dashboard shows names, recipient emails, references, status, progress, timestamps,
signature counts and recent email-operation summaries. Select **Review** to open the
authoritative application answers. Each detailed view creates an audit event.

- The portal lists document names and categories but does not create sharing or
  download links.
- Authorised operators access files through the restricted enrolment Drive using the
  `info@ffe.org.au` organisation identity.
- Never create public or link-wide sharing to make a document easier to access.
- The portal never returns signature drawings, raw invitation/signing links or network
  fingerprints.

Google Sheets are replaceable reporting projections. Do not use a Sheet edit to correct
an application or change Sheet sharing from `info@ffe.org.au` without approval.

## Production Monitoring

AWS checks the public family/EOI, guardian-signing and staff assets, backend health and
V6 form versions, and EOI Google-address configuration every 30 minutes. Healthy checks
do not send email. Two consecutive failed or missing observations change the relevant
CloudWatch alarm to `ALARM`; recovery produces a second state-change notification.

- Notifications go to the confirmed `info@ffe.org.au` and `frjativa@gmail.com` SNS
  subscriptions.
- An alarm email is an operational alert, not evidence that applicant data was lost.
- Do not create an EOI, application or OTP to test availability. Use the read-only
  canary and follow `RECOVERY-RUNBOOK.md`.
- Identify whether the named alarm is public assets, backend health/form versions or
  EOI address assistance before changing anything.
- Google address assistance is optional. Families must retain manual address entry
  while that provider is unavailable.
- Never force an alarm to `OK` to hide an unresolved failure.

## Pending Guardian Signatures

The application detail shows each required signer separately, including contact
permission, current application email, restricted previous-email history, who requested
a correction, request generation and SES acceptance, link opening, signing-email OTP
verification, revocation, completion and the signed document revision. It also shows
whether staff review is required and the applicant's explanation for one signature.

- **Do not contact** means no ordinary email, SMS, OTP, signature request, resend or
  repair may be sent to that guardian.
- Do not use the recovery command, SES console or a copied address to bypass that rule.
- The submitting applicant can correct only a permitted pending signer's email from the
  read-only family status page after step-up OTP. The operation rotates the task but does
  not reopen or duplicate the application.
- After the guardian signs, email correction and resend are permanently unavailable to
  the applicant. Do not treat the signing status page as contact-management software.

Admin or admissions staff may change pending contact permission only when authorised to
do so. Select the contact-permission action in application detail and type the exact
confirmation requested. The backend rate-limits and conditionally applies the change,
records staff identity/time and revokes the prior task when changing to No. Changing to
Yes requires a valid current application email and creates a new request. Viewer staff
cannot perform this action. Record the business authority outside the application if
local governance requires supporting evidence.

## Incident Response

If a staff code or session may be compromised:

1. Close the portal tab immediately.
2. Record the time and affected mailbox.
3. Review the append-only audit table, Email Events and CloudWatch logs.
4. Remove the mailbox from `STAFF_EMAILS`/`STAFF_ROLES` and deploy if access must be revoked.
5. Rotate the relevant invitation through **Resend** if a family link may be exposed.
6. Escalate any suspected family-data disclosure before continuing normal operation.

Do not place OTPs, invitation URLs, OAuth credentials, AWS secrets or real-family test
data in Git, ordinary notes, chat messages or screenshots.

See `RECOVERY-RUNBOOK.md` for database restore, restricted Drive recovery and Google
projection rebuild procedures.
