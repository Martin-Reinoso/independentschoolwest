# V6 Product and Backend Decisions

This register records Rosewood decisions that must survive future frontend and backend
rebuilds. These decisions override earlier V6 assumptions where they conflict.

Decision date: 7 August 2026

## Application Invitation and Record Creation

- Application for enrolment is invitation-only.
- A family may be invited after submitting an EOI or may be invited directly without
  an EOI.
- Staff must not ask a family which path applies. The invitation record determines it.
- For an EOI-linked invitation, successful email verification links to the existing
  contact and student records and may prefill approved EOI information.
- For a direct invitation, staff enter the invitee email and parent/guardian first name
  in the internal portal. Parent/guardian surname is optional but encouraged. Staff do
  not enter a child name at invitation time.
- A verified family can add more than one child. Each child has a separate application
  ID, draft, progress, documents, signatures and outcome under the same family
  invitation. The launch safety limit is eight child applications per invitation.
- The backend retains the original `applicationId` on an invitation and also records
  `applicationIds` so earlier one-child records remain compatible.
- Invitations and resends expire 14 days after they are issued.
- Direct and deliberately EOI-linked invitations use separate approved email variants.
  Both use the subject `Invitation to Apply for Enrolment at Rosewood College`, a
  private button plus copy/paste URL, enrolment contact details and the exact expiry.
- The EOI-linked variant identifies the child, entry year level and year and explains
  that approved prior information may be prefilled. It names Rosewood College; the St
  Lawrence school name from the source example is not carried into Rosewood messages.
- Prefilled fields remain reviewable and editable unless a separately approved rule
  makes a field immutable.

## Internal Staff Portal

The first authenticated staff portal release covers only the live EOI and Application
for Enrolment backend. It must:

- list EOIs and applications, including the guardian-signature status held by each
  application
- show each record's current progress and last successful save
- search and filter records without exposing them publicly
- select an EOI and issue an application invitation
- enter a parent/guardian first name, optional surname and email address and issue a
  direct family invitation without collecting a child name
- prevent an EOI already linked to an application from being linked again through the
  portal
- send the automatic invitation email and record its delivery status
- rotate the private token when an active invitation is resent, invalidating the prior
  link
- show recent operational email events without linking staff into editable Sheets
- allow audited review of application answers and list document metadata without
  creating public or short-lived file-sharing links
- exclude signature images, raw invitation links and network fingerprints from portal
  responses

The first release is allowlisted to `info@ffe.org.au`, uses email OTP, records staff
actions and keeps its two-hour session in browser memory only. The backend supports
admin, admissions and viewer roles so named mailboxes can be added after access owners
and review/offboarding rules are approved. The restricted operator CLI remains an
emergency fallback. Any future acceptance/decline interface must not merge those
workflows into the current records or API.

## Application Gateway

- Use a short welcome, the sentence linking the Enrolment Policy and Enrolment
  Procedure, and one email field.
- Do not present a prominent "Important documents" section.
- Do not show a document preparation checklist at the gateway. Families may complete
  the form until Documents and save their progress if they need to obtain a file.
- Do not ask for interface language on the application gateway.
- Label the email section "Enter your email" rather than "Email verification".
- Do not imply that every invitee previously submitted an EOI.

## OTP Resend Contract

- A resend action must show a sending animation and a live confirmation that a new
  code was sent.
- The resend control must have a server-enforced cooldown. The frontend countdown is
  informative and is not the security control.
- Initial policy: at least 30 seconds between sends and no more than five resend
  requests per email/challenge in 30 minutes.
- Apply additional per-IP and per-invitation limits, generic responses that do not
  disclose account existence, replay protection, expiry, attempt limits and audit
  events.
- Return a retry interval for throttled requests and keep the current valid code policy
  explicit in backend implementation and tests.

## Draft Saving, Status and Session Contract

- Do not expose backend deployment scope or inactive-workflow information to families.
  The operational ribbon is visible only in explicit non-writing review mode.
- The compact workflow/section header remains visible while scrolling on desktop and
  mobile. Its indicator uses family-facing states: In progress, Saving, Saved, No
  connection, Save failed and Session expired.
- The save indicator is hidden on the Application gateway, email-verification and child
  selection screens because no child draft is open. Authentication errors use the form
  error area and must never be labelled as save failures.
- Saved means the backend acknowledged the exact current revision. A selected but not
  yet uploaded file and a drawn but not submitted signature must not appear saved.
- Application answers autosave 1.2 seconds after input pauses and at least every eight
  seconds during continuous input. Identical snapshots are suppressed.
- Navigation flushes pending changes. Every Application section provides **Save and
  continue later**; on Documents it also uploads selected files before confirming save.
- Save and continue later and Sign out revoke browser-held sessions and clear sensitive
  values from page memory. The child selector uses Sign out rather than Back.
- Family and child-application sessions expire after 20 minutes of inactivity and have
  an eight-hour absolute lifetime after OTP. Activity refreshes the idle window only
  when needed. Staff and guardian-signing sessions keep their separate policies.
- Returning families resume at the last server-acknowledged application section after
  using their private invitation and completing OTP again.

## Permanent Collection Decisions

- Proof of address is not requested at the gateway, in Documents, or elsewhere in the
  Rosewood application.
- Parent/guardian Past Student and Spouse fields are not collected.
- Emergency contacts do not have a "Share these details" question.
- Application conditions contain previous-school permission, fee responsibility and
  the application survey only.
- Terms and Conditions of Enrolment and photography/recording permission belong to the
  post-offer Enrolment Agreement, not the application.
- Victorian admission guidance is not displayed in the application signature step.

## Deferred New-School Fields

The following St Lawrence application fields are hidden for Rosewood's first intake:

- Family Connection
- Siblings Already Attending
- Other Relatives

The production schema should reserve nullable, inactive fields and repeat structures
for them. They must not be rendered, required, silently defaulted or used in decisions
until Rosewood explicitly enables them for a later intake. The visible future-family
question asks only whether other children may attend and, when Yes, records a count of
1 to 6 or 7+.

## Student Rules

- Religion and Current Early Learning Centre / Kindergarten / Primary School reveal a
  mandatory free-text field when Other is selected. The current-school control occupies
  its own row so long labels and conditional fields do not misalign adjacent controls.
- Student Residence, Student Primary Address and Family are separate visual sections.
  Address sharing explicitly refers to other parents/guardians.
- Home Care Arrangement is a required multi-select. Other reveals a required care
  description, and Shared Custody reveals a required Shared Parenting Schedule.
- Nationality and Citizenship is identified as a government requirement and makes clear
  that every question refers to the student. Citizenship follows residential status,
  and language questions appear at the end of the section.
- Citizenship Status No reveals required Evidence of Australian Residency. Permanent
  Resident, Temporary Resident and Other / Visitor / Overseas Student reveal mandatory
  Visa subclass and Visa expiry; Eligible for Australian Passport does not. Previous
  visa subclass remains optional.
- Main Language uses the 444 language-level entries in the ABS Australian Standard
  Classification of Languages 2025, with English first and all remaining entries in
  alphabetical order.
- General / Additional Needs controls only the visibility of Please Specify. Health
  Professionals, Reports Attached, NDIS Support and Court or Parenting Orders remain
  visible. The source duty-of-care explanation and assurance that the information will
  not impact the offer of enrolment appear before the question.
- Parish is labelled "Parish where student lives".
- Medical Details displays an Other medical condition field only when Other is chosen.
- Doctor Name and Doctor's practice/Address are mandatory. Doctor Phone remains
  optional.
- Ambulance Cover and Health Care Card are mandatory Yes/No questions.
- Humanitarian Health Check clarifies that it asks whether the child has a humanitarian
  visa.

Source: https://www.abs.gov.au/statistics/classifications/australian-standard-classification-languages-ascl/2025

## Parent and Guardian Rules

- Use "Share these details with other contacts?" and mandatory "SMS Messaging".
- Health Care Card is mandatory Yes/No. Yes reveals mandatory card number and expiry.
- Residential Address, Suburb, State, Postcode and Country are mandatory.
- Occupational Group, Occupation, School Level Education and University / Further
  Education are mandatory.
- Country of Birth, Nationality, Ethnicity, Languages, Residency Status and Aboriginal
  / Torres Strait Islander response are mandatory. Temporary Resident reveals
  mandatory Visa Subclass and Visa Expiry.
- A second parent/guardian is the normal route and receives an independent signature
  request after the primary applicant submits.
- If no second parent/guardian is included, Explanation only one signature becomes
  mandatory and explains why it is being requested.

## Frontend and Backend Boundary

EOI and Application for Enrolment are live backend workflows. The server independently
enforces invitation authorization, OTP expiry and throttling, session scope, validation,
draft revisions, upload constraints, signatures, persistence and audit events.

Acceptance, decline and the post-offer Enrolment Agreement remain separate non-writing
previews. They must not reuse the EOI or Application records when their backends are
implemented.
