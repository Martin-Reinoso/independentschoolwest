# V6 Product and Backend Decisions

This register records Rosewood decisions that must survive future frontend and backend
rebuilds. These decisions override earlier V6 assumptions where they conflict.

Decision date: 5 August 2026

## Application Invitation and Record Creation

- Application for enrolment is invitation-only.
- A family may be invited after submitting an EOI or may be invited directly without
  an EOI.
- Staff must not ask a family which path applies. The invitation record determines it.
- For an EOI-linked invitation, successful email verification links to the existing
  contact and student records and may prefill approved EOI information.
- For a direct invitation, staff enter the invitee email in the internal portal. The
  backend creates the invitation and initial contact/application records so the family
  can verify that email and start a new application.
- Prefilled fields remain reviewable and editable unless a separately approved rule
  makes a field immutable.

## Internal Staff Portal

The backend phase requires an authenticated, staff-only portal that can:

- list EOIs, applications, offer acceptances, declines and guardian-signature tasks
- show each record's current progress and last successful save
- search and filter records without exposing them publicly
- select an EOI and issue an application invitation
- enter a new email address and issue a direct application invitation
- create or link the correct contact, student and application records idempotently
- send the automatic invitation email and record its delivery status
- show an append-only audit history of invitation, verification, save and submission
  events

Staff roles, least-privilege access, audit logging and recovery controls are required
before this portal handles real family information.

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

V6 remains frontend-only. Its cooldown, save state, matched records, OTP, invitation,
uploads and signatures are demonstrations. The production backend must enforce every
authorisation, rate limit, validation, persistence and audit rule independently of the
browser.
