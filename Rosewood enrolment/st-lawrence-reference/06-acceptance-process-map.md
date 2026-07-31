# Acceptance Process Map

## Status And Scope

**Status:** Capture in progress. The acceptance gateway, matched-contact/student
selection screen, Continue transition and five-step agreement have been observed. No
field was changed and the agreement was not submitted.

This record maps the workflow after a family selects Accept in an offer email. It does
not authorise accepting the place, completing an OTP, signing an agreement or
submitting any acceptance form. Active links, email addresses, access tokens, student
details and application identifiers are excluded from this public repository.

## Capture Safety Boundary

- Observe only the next screen explicitly authorised by the user.
- Stop before entering any OTP, acknowledgement, signature or final decision unless
  separately authorised.
- Do not click Decline, Accept, Submit, Sign or confirmation actions during mapping.
- Keep screenshots and active links in restricted storage only.
- Record legal wording exactly only when redistribution and source authority are clear;
  otherwise preserve structure and reference the governing source.

## Observed Sequence

| Order | Screen ID | Screen/action | Observed result | Status | Source ID |
| --- | --- | --- | --- | --- | --- |
| 1 | ACC-00 | Offer recipient selects the private Accept action | Separate Enquiry Tracker acceptance gateway opens | Captured | SLB-EMAIL-012, SLB-008 |
| 2 | ACC-00 | Family is asked for the same email address used previously | Email becomes valid and Next is enabled | Captured | SLB-008 |
| 3 | ACC-00T | Next is pressed once | Button changes to disabled `Sending...` | Captured | SLB-008 |
| 4 | ACC-01 | Verification or identity check | The earlier observation remained on `Sending...`; a later authorised session reached the matched-record screen after verification | Partially captured | SLB-008, SLB-009 |
| 5 | ACC-02 | Match contact and students eligible for an enrolment agreement | One agreement later showed `In Progress` with `Continue`; the other two remained `Not Started` with `Start` | Captured | SLB-009, SLB-010 |
| 6 | ACC-03 | Continue the enrolment agreement | Continue changed to a private agreement route, briefly showed only a progress bar, then opened the five-step form with `Saved` status | Captured | SLB-010 |
| 7 | ACC-04 | Review agreement conditions, contacts and signatures | Student, Parent/Guardian, Documents, Conditions and Signature steps were inspected; the second-contact accordion was expanded without changing any value | Captured | SLB-010, SLB-011 |
| 8 | ACC-05 | Final acceptance confirmation | Unknown | To capture | |
| 9 | ACC-EMAIL | Send acceptance receipt/onboarding communication | Unknown | To capture | |

## ACC-00 Acceptance Gateway

### Purpose

Begin formal acceptance of an offered place and match the recipient to previously
stored information using the same email address.

### Visible Content

- St Lawrence school branding, address and contact details
- language selector and refresh action
- salutation to Parent / Guardian
- instruction that this process formally accepts the offered place
- instruction to use the same email address used previously
- link to the MACS Privacy Policy
- link to the Privacy Collection Notice - Parents and Students
- one required Email field
- Next button, disabled while Email is empty

### Field Register

| Field | Type | Required | Behavior | Source ID |
| --- | --- | --- | --- | --- |
| Language | Select/translation control | No | English shown; refresh control available | SLB-008 |
| Email | Email/text input | Yes | Previously used address enables Next | SLB-008 |
| Next | Button | N/A | Changes to disabled `Sending...` after the authorised click | SLB-008 |

### First Transition Result

The email was entered and Next was pressed once with explicit user authorisation. The
button changed to `Sending...` and stayed disabled. After more than eight seconds:

- the URL had not visibly advanced to a new acceptance screen
- no OTP field was visible
- no inline error was visible
- no CAPTCHA prompt was visible
- no further action was taken

The only captured console warning concerned non-async Google Maps loading and does not
explain the stalled transition. The request must not be retried without a fresh user
instruction because it may already have generated an email or server-side event.

## ACC-02 Contact And Student Selection

### Purpose

Locate the previously stored family contact and present the student records for which
an enrolment agreement can be started.

### Visible Content

- confirmation that the family's information was successfully located
- one contact row with Name, Last Updated, Address, Email and Mobile Phone columns
- a student table with Student Name, Last Updated, Form Status and Action columns
- three matched student records in the observed family account
- `Not Started` in the Form Status column for all three records
- a `Start` action for each existing student
- a separate `START A NEW ENROLMENT AGREEMENT FORM` area with required Student First
  Name and Student Last Name fields
- the new-agreement Start button disabled while both new-student fields are empty
- after Start had previously been selected, the corresponding row changed to
  `In Progress` with a `Continue` action and a newer Last Updated value

### Usability Finding

The source sentence immediately above the agreement rows says `Please select a student
to continue or start a new application.` It does not say that the family is starting or
continuing a separate acceptance or Enrolment Agreement form. Because the selector,
status labels, action names and five-step shell closely resemble the earlier application
workflow, a family can reasonably believe it is reopening or restarting the submitted
application. The later heading `START A NEW ENROLMENT AGREEMENT FORM` is not enough to
resolve the ambiguity for the existing-student rows above it.

Rosewood should use an explicit page title such as `Accept your offer`, label each row
`Enrolment agreement status`, and use actions such as `Start acceptance form` and
`Continue acceptance form`. It should also show the earlier application status
separately when that context is useful.

### Status Meaning

`Not Started` on this screen refers to the **enrolment agreement / acceptance form**,
not to the earlier enrolment application. This is confirmed by comparing the two
workflows:

- a student whose earlier enrolment application had already been submitted was still
  shown as `Not Started` in the acceptance workflow
- a different student had an open autosaved application draft on the application route
  while the corresponding acceptance row also showed `Not Started`
- the acceptance page labels its creation area `START A NEW ENROLMENT AGREEMENT FORM`,
  making the status namespace explicit

The acceptance workflow therefore maintains a separate form instance or status record
from the original application. The displayed `Last Updated` value may be inherited from
or associated with the student/application record; its exact source has not been
verified.

### Rosewood Design Implication

Rosewood should never show a bare `Not Started` label after an application has already
been submitted. Statuses should be qualified by workflow, for example `Application:
Submitted` and `Enrolment agreement: Not started`, with the current stage stated in the
page heading and family-facing explanation.

## ACC-03 And ACC-04 Agreement Form

Continue retained the school header, navigated from the request route to a distinct
private agreement route and briefly displayed only a progress bar. The loaded page
showed `Saved` with a cloud-complete icon and reused the five-step shell from the earlier
application:

1. **Student:** prefilled student name, year level and commencement year, followed by
   one required `Enrolment Acceptance` radio declaration.
2. **Parent/Guardian:** prefilled contact details, required share choice, relationship
   and contact type, a second guardian marked `Missing Fields`, Add Contact, and a
   required no-more-guardians confirmation.
3. **Documents:** one signed Parent Code of Conduct and one signed Student Code of
   Conduct are each required for upload.
4. **Conditions:** complete enrolment terms plus acceptance, school-transfer consent,
   photography/recording permission and ICT acceptable-use acknowledgement.
5. **Signature:** IP-address acknowledgement, parent/guardian declaration, local
   electronic signature and date for the current guardian; the second guardian is
   identified as someone who will be contacted after submission.

The Parent/Guardian step displays this bundled communication notice beneath the mobile
number: providing an email and/or mobile number is treated as agreement to receive both
promotional and informational messages, with unsubscribe or `STOP` available for
promotional communications. Rosewood should not infer marketing consent merely from
mandatory contact details; this requires a separate privacy and communications decision.

Visiting incomplete steps did not block navigation. The stepper changed visited Student
to an editable state and marked incomplete Parent/Guardian, Conditions and Signature
steps with `Missing required fields.` No field, checkbox, signature, upload or Submit
action was changed during this capture.

### Second Contact Accordion Behavior

Opening the existing second-contact summary produced an independent expanded panel:

- the first contact remained expanded; the interface did not behave as an exclusive
  one-panel accordion
- the collapsed second-contact header initially included the guardian name and
  `(Missing Fields)`; while expanded, the header showed only `2nd Contact Details`
- the expanded panel repeated Primary Information, share choice, name, email, mobile
  and the promotional/informational messaging notice
- Relationship to Student and Contact Type remained blank and required
- a separate required contact-permission question appeared with `Yes` selected and
  `No, do not contact them` as the alternative
- help text said that selecting No prevents school communication and the separate
  signature-request email, and advises contacting the office when unsure
- a Remove action appeared only for the second contact
- Add Contact and the no-more-guardians confirmation remained below both panels

This confirms the second guardian is an editable agreement participant rather than a
read-only inherited contact. It also reinforces that contact permission and legal
signing responsibility are related in the source interface but should be modelled as
separate concepts for Rosewood.

## Working Data-Model Hypothesis

The acceptance link is distinct from the earlier application link. Combined with the
offer email and application evidence, it may resolve an offer record and then match the
same reusable contact after email verification. The likely entities are:

```text
Contact
  -> Student
      -> Submitted application
          -> Offer
              -> Acceptance response
                  -> Guardian acceptance signatures
```

The separate acceptance status is now directly observed. The exact backend entity
boundaries remain an inference because the agreement, low-level requests and staff-side
records have not been inspected.

## Questions For The Next Authorised Observation

- Does Next send a six-digit OTP using the same 30-minute template as application access?
- Does it match the contact, student, submitted application or offer before showing data?
- Why were three student records eligible to start an agreement, and does every row
  represent an active offer?
- Is the offer response deadline rechecked after verification?
- Are Accept and Decline reversible before final submission?
- Does editing a prefilled agreement value update only the agreement snapshot or the
  reusable contact/student master record?
- Must every recorded guardian sign independently?
- What happens when a guardian is marked `No, do not contact them`?
- Is there a one-signature explanation or court-order branch?
- Is the bundled promotional/informational messaging notice legally and operationally
  intended to create marketing consent from required contact fields?
- What save/autosave states appear?
- What receipt, reference and onboarding message follows completion?
- What happens after OTP expiry, email mismatch, duplicate access or a stalled Sending state?

## Capture Checklist

- [x] Acceptance gateway structure
- [x] Privacy links
- [x] Email field and disabled/enabled Next state
- [x] First click state (`Sending...`)
- [ ] Successful verification screen
- [ ] Verification email template
- [ ] Error, retry, resend and change-email behavior
- [x] Contact/student matching screen and acceptance-specific status
- [x] Acceptance agreement content and five-step structure
- [x] Visible validation markers
- [x] Guardian/signatory model
- [x] Electronic signature interface
- [x] Save-state indicator
- [x] Required conduct documents
- [ ] Final confirmation
- [ ] Acceptance receipt and onboarding communications
- [ ] Decline path
- [ ] Expired-offer path
