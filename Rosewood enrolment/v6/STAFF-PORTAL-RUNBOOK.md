# Rosewood V6 Staff Portal Runbook

## Reviewing an application

1. Open **Applications** or **Cohort planning** > **Applications**, then choose **Review**.
2. Read the section navigation and complete application projection. Opening a record is audited.
3. Use **Staff review** to save operational status, checklist and a bounded internal note. This does not alter the family submission.
4. Close the review when finished. The review dialog has no family-email or meeting-invitation controls.

## Family communications

1. Open **Family communications** and select an application.
2. Confirm the displayed family/student context and choose a backend-permitted recipient.
3. Write the message. Save a draft, and use **Send test to me** when appropriate.
4. Re-read the recipient, subject and body before choosing **Send reviewed email** and confirming the send.
5. Never use email to transmit sensitive application answers or documents. Purpose selection never triggers an email.

## Principal meetings

1. Open **Principal meetings** and create a schedule.
2. Select that schedule, add future dates/times to the prepared list, review the list, then save the available times together.
3. In **Invite a family to book**, select the schedule and application. The server supplies only contact-permitted recipients.
4. Confirm the recipient and send the private invitation. Do not create a duplicate invitation for the same application, schedule and email; the backend blocks it.
5. The family verifies the invited email before seeing the schedule. A confirmed family can reopen the same invitation, verify the same email and choose a different available time.
6. A change keeps the same booking/application IDs and applicant data. It atomically frees the former slot and reserves the replacement, so another family cannot overwrite either operation.
7. Families cannot delete or cancel a booking online. Staff should manage exceptional cancellations operationally until a separately approved cancellation workflow exists.

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
- The production allowlist is managed through the stack configuration; verify the live
  value rather than relying on this runbook for current membership.
- The role model supports `admin`, `admissions`, `planning_editor` and `viewer`.
  Admin/admissions can invite, resend and renew expired access. Admin/admissions and
  planning editors can maintain prospective-family records; viewers cannot write.
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

## Public Application-Link Requests

The **Link requests** panel lists requests submitted through the home-page or standalone
public card, including request time, outcome and the retained application relationship.

- **Application link requested** means the family made its first request and a new
  invitation/Application relationship was created.
- **Application link requested again** means the family requested another link and the
  existing Application relationship was retained. It does not create a duplicate.
- **Email queued** is transient and means the durable worker has not completed the send.
- **Email sent** means Amazon SES accepted the message for delivery. It is not proof of
  destination-server delivery.
- **Email delivered** means the recipient mail server accepted the message. It may
  still be in junk and does not prove the family read it.
- **Email delayed**, **Email failed** or **Complaint received** are operational states
  that should be investigated before any deliberate resend or renewal.
- **Delivery status unavailable** means the temporary receipt/feedback evidence is no
  longer retained or was not found. It does not mean the email remains queued or failed.
- A public request never links or prefills an EOI, even when the email matches one.
- Do not create another direct invitation to compensate for a delayed request email.
  Check the request, Application and email status first; use the existing resend
  or renewal path only when operationally required.
- Google Sheets are reports. Do not edit the Application Link Requests tab to change,
  resend or remove the authoritative DynamoDB record.

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
  editable and the invitation is still active. It is not available when the family has
  no editable application.

## Renew Expired Or Missing Access

Use **Renew access** only when the portal offers it for an editable application. This
means the application still exists but its 14-day invitation access is expired,
inactive or no longer indexed.

1. Confirm the recipient and application row.
2. Select **Renew access** and read the confirmation that saved progress will remain.
3. Confirm once. The replacement private link is sent by SES and lasts 14 days.
4. Confirm the same application row remains and now offers **Resend** rather than
   **Renew access**.

Renewal keeps the same application ID, every child application under the family
invitation, saved answers, revisions, documents and status. It does not reopen or
duplicate an application. The backend refuses renewal if the invitation is active or
the selected application is no longer editable. Duplicate confirmation requests with
the same operation ID return the existing result and do not queue another email.

Do not create a new invitation to work around expired access. That would create a new
application rather than reconnect the family to the existing record.

## Application Review And Documents

The portal opens on **Admissions overview**. The five cards are application-progress
stages, not admission decisions:

- **Not started**: the private application exists but no application section has been
  started
- **In progress**: the family has saved application work
- **Awaiting signatures**: the primary submission is complete but one or more required
  permitted signatures remain
- **Staff review**: the stored workflow requires authorised staff follow-up
- **Application complete**: every required application signature is recorded; this
  does not mean a place has been offered or the student is enrolled

Counts refer to child applications. One verified family may therefore contribute more
than one application. Use the year, level, stage and student/reference filters to
narrow the cards, distributions, entry mix and attention queue together.

The **Needs attention** queue currently identifies failed/delayed workflow email,
expired or missing application access, an in-progress draft with no saved activity for
seven days, a signature outstanding for three days, staff-review status and incomplete
entry details. These are derived prompts. They do not send a message, change a status,
reopen an application or make an admissions decision. Select **Review** only when
follow-up requires the authoritative detail; opening detail is audited.

The **Cohort planning** > **Applications** tab is the operational application view. It shows each child's
name, primary parent/guardian name, invitation email, recorded entry year and entry
level, application status, signature progress, last activity, staff-review warning and
reference. Search by student, parent/guardian, email or reference, or filter by entry
year, entry level and status. The year summary shows the current number of application
records for each recorded entry year within the selected record type.

- **Family applications** is the default record type and excludes records carrying
  conservative synthetic/test identity or test-email markers.
- **Test applications** keeps monitoring and verification records available without
  mixing them into normal cohort planning. **All records** displays both categories.
  For future verification, use an obvious Synthetic/Test name or a `+test`,
  `+synthetic` or `+canary` email alias. Do not use a real family's identity for tests.
- **Application date · newest/oldest** sorts by the application record's creation time.
  **Entry year and level** restores cohort ordering. The row displays the creation date;
  last activity remains a separate operational timestamp.

- Before a family enters child details, the parent/guardian name is the row title and
  **Parent/guardian · child details not started** explains why no student name appears.
- The displayed email is the current invitation/Application contact address. It is for
  authorised operational identification and must not be copied into general reports.

- **Not provided yet** means the family has not saved that entry answer. Do not infer it
  from the invitation date, application date, EOI for another child or a sibling.
- **Year not provided** and **Level not provided** filters identify records needing
  follow-up or still early in the application.
- The planning screen deliberately omits all health, document and detailed application
  answers. The aggregate Admissions overview and attention summary continue to omit
  contact details. Use **Review** only when the operational task requires
  the authoritative record; opening detail is audited.
- Filters are a live view of DynamoDB summaries and do not alter application records or
  Google Sheets.

The **Applications** section continues to show names, recipient emails, references,
status, progress, timestamps, signature counts and recent email-operation summaries.
Select **Review** to open the authoritative application answers. Each detailed view
creates an audit event.

- The portal lists document names and categories. Select **Preview** to open an
  in-portal PDF or image view; use **Download original** only when the operational task
  requires a local copy.
- Preview and download links expire after five minutes. Close and reopen Preview to
  obtain a new audited link if one expires.
- The backend checks that the file belongs to the selected application and remains in
  the restricted enrolment Drive before creating the short-lived view. A mismatch must
  fail closed rather than open the file.
- Never create public or link-wide sharing to make a document easier to access.
- Treat downloaded files as restricted child/family information and remove local copies
  when the authorised task is complete.
- The portal never returns signature drawings, raw invitation/signing links or network
  fingerprints.

Google Sheets are replaceable reporting projections. Do not use a Sheet edit to correct
an application or change Sheet sharing from `info@ffe.org.au` without approval.

## Prospective Families And Combined Forecast

Use **Cohort planning** > **Prospective families** for a family known to Rosewood that
has not yet supplied an Application record.

1. Select **Add prospective family**.
2. Enter the parent/guardian name and email, then record contact permission explicitly.
3. Choose a planning status and source. Add optional relationship/context, staff owner,
   follow-up date and a restrained internal note.
4. Add each prospective child separately. A name is optional, but intended entry year
   and entry level are required.
5. Save once. The confirmation must state that no Application was created and no email
   was sent.

Use **Link application** only after confirming that one prospective child and one
existing family Application are the same person. The action is deliberate, audited,
unique and reversible. Never link by name/email similarity alone. Linking does not copy
planning notes into the Application and does not change family answers.

- **Expected to apply** and **Possible** support near-term planning; **Future intake**
  and **Research needed** remain separate judgement categories; **Not proceeding** is
  excluded from active forecast totals.
- Archive obsolete records instead of deleting them. Archived records remain in
  DynamoDB/audit history and are excluded from the active forecast.
- **Combined forecast** counts each family Application plus each unlinked active
  prospective child. A linked child is counted only as an Application. Test Applications
  are excluded.
- Do not paste sensitive personal history or unverified comments into restricted notes.
  Do not copy the source spreadsheet wholesale.
- Prospect records have no Google Sheets projection and no email action. Use the
  separate **Family communications** workspace only when a permitted family message is
  required and has been reviewed.

## Production Monitoring

AWS checks the public family/EOI, guardian-signing and staff assets, backend health and
V6 form versions, EOI Google-address configuration, protected Application/status/staff
routes and delivery-queue age every 10 minutes. Healthy checks do not send email. Two
consecutive failed or missing observations change the relevant CloudWatch alarm to
`ALARM`; recovery produces a second state-change notification. Separate immediate
alarms cover Lambda errors/throttling, terminal outbox work and failed transactional
email delivery.

- Notifications go to the confirmed `info@ffe.org.au` and `frjativa@gmail.com` SNS
  subscriptions.
- An alarm email is an operational alert, not evidence that applicant data was lost.
- Do not create an EOI, application or OTP to test availability. Use the read-only
  canary and follow `RECOVERY-RUNBOOK.md`.
- Identify whether the named alarm is public assets, backend health/form versions, EOI
  address assistance, protected routes, stale delivery work, Lambda capacity or email
  delivery before changing anything.
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
