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
  invite, resend and prepare document downloads; viewers cannot.
- Codes expire after 10 minutes, allow five attempts and have server-side email/network
  throttling plus a 30-second resend cooldown.
- Staff sessions expire after two hours and are held in browser memory only. Closing or
  refreshing the page requires a new code.
- Do not forward staff codes or leave a signed-in portal unattended.

## Direct Invitation

Use a direct invitation when a family has not submitted an EOI, or when Rosewood has
decided not to link an earlier EOI.

1. Select **Create invitation** and **Direct invitation**.
2. Enter the family email. Names are optional at invitation time and remain editable by
   the family in the application.
3. Select **Send invitation** once.
4. Confirm that the portal reports the recipient and that an application row appears.

The backend creates new contact, student, invitation and application records with no
`source_eoi_id`. Matching an existing EOI email never creates a link by itself.

## EOI-Linked Invitation

Use this path only when the specific EOI should prepopulate the new application.

1. Open **Expressions of interest** and select **Invite to apply**, or choose **From an
   EOI** in the invitation panel.
2. Confirm the student, parent/guardian, email and EOI reference.
3. Select **Send linked invitation** once.

The EOI email must exactly match the invitation recipient. The portal blocks an EOI
already linked to another application. The source EOI record remains separate and is
not overwritten when a family edits prefilled application fields.

## Resend

Use **Resend** only when a family confirms they cannot use the active invitation.

- The backend creates a new high-entropy token and invalidates the earlier link.
- The link is delivered by SES and is never displayed in the staff browser.
- Submitted applications and applications awaiting guardian signatures cannot be
  resent from this portal.
- Earlier invitations created before token rotation was introduced may require a new
  invitation instead of a resend.

## Application Review And Documents

The dashboard shows names, recipient emails, references, status, progress, timestamps,
signature counts and recent email-operation summaries. Select **Review** to open the
authoritative application answers. Each detailed view creates an audit event.

- Admin/admissions staff may select **Prepare download** for a clean document. The
  portal returns a five-minute **Open document** link. This second deliberate click is
  used instead of a popup, so browser popup blocking does not interrupt access.
- Viewer accounts cannot prepare downloads.
- A file is available only when its exact S3 version has a clean GuardDuty malware tag.
- Legacy Drive files and files with pending, failed or unsafe results are not available
  through this route.
- The portal never returns signature drawings, raw invitation/signing links or network
  fingerprints.

Google Sheets are replaceable reporting projections. Do not use a Sheet edit to correct
an application or change Sheet sharing from `info@ffe.org.au` without approval.

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

See `RECOVERY-RUNBOOK.md` for database restore, S3-version and Google projection
rebuild procedures.
