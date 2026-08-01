# Acceptance Process Map

## Status And Scope

**Status:** Capture in progress. The acceptance gateway, matched-contact/student
selection screen, Continue transition, five-step agreement, current-guardian submission
and the resulting additional-guardian signature request, identity gateway and OTP screen
have been observed. The additional guardian has not entered the current code or opened
the signing form.

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
| 8 | ACC-05 | Current guardian submits the agreement | The post-submit state says the form is complete for the current guardian but remains pending while another guardian is contacted | Captured | SLB-014 |
| 9 | ACC-06 | Send additional-guardian signature request | A dedicated Enrolment Agreement email says the guardian's signature is required and supplies a unique signed Contact Portal task link | Captured | SLB-EMAIL-014 |
| 10 | ACC-07 | Additional guardian opens the signing task | Personalised Contact Portal identity page names the guardian, form, student and school; the email is prefilled and Next is enabled | Captured | SLB-017 |
| 11 | ACC-08 | Additional guardian requests verification | Next changes to disabled `Sending...`, invisible Turnstile runs, the Australian verification API returns success and the same URL displays the OTP screen; a current 30-minute login code is emailed | Captured | SLB-017, SLB-EMAIL-019 |
| 12 | ACC-09 | Additional guardian verifies and signs | Current code has not been entered; the historical application establishes the later individual acknowledgement and all-signatures-complete emails | Partially evidenced | SLB-EMAIL-017, SLB-EMAIL-018 |
| 13 | ACC-EMAIL | Send final acceptance receipt/onboarding communication | Unknown | To capture | |

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
   Conduct are each required for upload. Exact point-in-time PDFs are archived as
   SLB-DOC-005 and SLB-DOC-006 with source URLs, page counts and hashes.
4. **Conditions:** complete enrolment terms plus acceptance, school-transfer consent,
   photography/recording permission and ICT acceptable-use acknowledgement. The
   underlying agreement, ICT policy and referenced child-safety statement are archived
   as SLB-DOC-009, SLB-DOC-007 and SLB-DOC-011.
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

### Guardian Completeness Confirmation

Below Add Contact, the required all-caps confirmation is initially unchecked and the
entire checkbox/message row has a dotted red validation outline. The family is asked to
confirm either that every additional legal parent or guardian has been entered through
Add Contact, or that there is no additional parent or guardian to add.

One explicitly authorised checkbox click produced this sequence:

1. the checkbox became checked and the dotted red outline disappeared immediately
2. the global cloud state changed from `Saved` to `Unsaved Changes` with a sync icon
3. after approximately 1.8 seconds, the global state returned to `Saved` with the
   cloud-complete icon

This provides direct evidence that validation feedback is reactive and that a checkbox
change is persisted through the same asynchronous autosave mechanism as other agreement
data. The checkbox remained checked after the save completed. No other value was changed.

### Add Contact Behavior

With two existing contacts expanded and the guardian-completeness confirmation already
checked, one explicitly authorised Add Contact click produced this sequence:

1. a blank `3rd Contact Details` panel was inserted immediately above Add Contact and
   opened automatically
2. the first and second contact panels remained present; Add Contact also remained
   available below the new panel
3. the new panel repeated Primary Information, share choice, name, email, mobile,
   messaging notice, relationship, contact type, contact permission and Remove
4. Share these details had no default and showed a red validation outline; blank
   required fields also showed red validation styling
5. contact permission defaulted to `Yes`
6. the global state changed to `Unsaved Changes`, then returned to `Saved` after about
   1.9 seconds even though the third contact remained blank and incomplete
7. the previously checked guardian-completeness confirmation remained checked and was
   not invalidated or reset

The last point is a state-consistency defect: the agreement can simultaneously assert
that all legal parents/guardians have been entered and contain a newly created incomplete
guardian. Rosewood should clear or revalidate the completeness attestation whenever a
guardian is added or removed, and should distinguish saving a draft record from passing
step validation.

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

## Additional-Guardian Email Package

Submitting the current Enrolment Agreement generated a dedicated email to the recorded
additional guardian. The message identifies the form, states that the recipient's
signature is required and provides one `Click here to sign` action. The underlying URL
uses a Contact Portal login route and a signed, expiring task envelope. Its observed
parameter names bind the signing task, form instance, form template, contact, expiry,
version and signature; all values and the active URL remain restricted.

The current acceptance link now confirms the same Contact Portal identity and OTP
pattern. A directly observed historical Online Enrolment Form sequence in the same
guardian mailbox additionally establishes the later notification pattern:

1. the additional guardian receives a unique signature-required message
2. opening the task leads to a Contact Portal login-code request
3. the six-digit code expires after 30 minutes
4. successful signing generates an individual acknowledgement
5. completing the required signature set generates a separate all-signatures-complete
   message and states that the application has been submitted for school processing

This historical sequence is evidence of Enquiry Tracker's guardian-signing architecture,
not proof that the unfinished acceptance will have identical screens or completion copy.

## ACC-07 And ACC-08 Contact Portal Verification

The current additional guardian opened the unique signing link directly from the email.
The sparse identity page retained the school header and displayed:

- a personalised greeting naming the guardian
- the exact form title `Enrolment Agreement Form`
- the student and school associated with the requested signature
- the instruction `Please verify your identity to continue.`
- one required, prefilled Email field
- one enabled Next button

No language control, privacy link or alternative mobile field was visible. The source
page showed the school contact block at upper right, the identity form in a narrow column
below and a green uppercase action. The school and footer image requests did not render
in the observed Chrome session; the text content and controls remained usable.

One authorised Next click produced this directly observed transition:

1. the client loaded and executed invisible Cloudflare Turnstile
2. the button changed to disabled `Sending...`
3. the client sent a verification request to Enquiry Tracker's Australian API containing
   the entered email, a blank mobile value, school identifier, CAPTCHA type and Turnstile
   token; all values and the token remain restricted
4. the verification endpoint and its CORS preflight returned HTTP 200
5. without changing the URL, the page replaced the identity form with `A code has been
   sent to your email address` and `Enter the code to continue`
6. the current Contact Portal login-code email arrived immediately and states that its
   six-digit code expires after 30 minutes

The OTP screen contains one required Verification Code field, disabled Verify until a
value is entered, Resend code and Change email. No code was read into the repository or
entered into the live page.

## Questions For The Next Authorised Observation

- What exact agreement or signature-only view appears after the additional guardian's
  OTP succeeds?
- Does OTP verification bind only the signed task/contact, or re-evaluate the student,
  submitted application and offer before showing the signing view?
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
- What receipt, reference and onboarding message follows all required signatures?
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
- [x] Required guardian-completeness confirmation and autosave cycle
- [x] Add Contact insertion, defaults, validation and autosave behavior
- [x] Required conduct documents
- [x] Current-guardian submission confirmation and pending-further-signature state
- [x] Additional-guardian Enrolment Agreement signature-request email
- [x] Historical Contact Portal OTP and signature-confirmation email sequence
- [x] Current additional-guardian identity gateway and Turnstile transition
- [x] Current additional-guardian OTP email and verification screen
- [ ] Current additional-guardian post-OTP signing screen
- [ ] Acceptance receipt and onboarding communications
- [x] Decline gateway, OTP and record-selection entry
- [x] Decline Start/Continue transition and three-step form
- [ ] Decline confirmation and completion outputs
- [ ] Expired-offer path

## Outstanding Artifact Gaps

This section is intentionally explicit so that the static walkthrough and eleven
archived source files are not mistaken for a complete evidentiary copy of the live
process.

- **Age-banded Acceptable Use Agreements:** the archived ICT policy names separate
  agreements for Years F-4, 5-8 and 9-12, but no public St Lawrence download link for
  those supporting documents was observed. The live acceptance form links only the
  archived ICT policy.
- **Complete acceptance legal wording:** the live Conditions step was mapped by section
  and control, and the exact source School Enrolment Agreement is archived as
  SLB-DOC-009. The public HTML walkthrough still paraphrases the full third-party legal
  text pending redistribution review.
- **Second-guardian signing package:** the current signature-request email is captured,
  the current identity gateway and OTP screen are captured, and the historical
  application proves the platform's completion-email pattern. The current acceptance
  post-OTP signing view and completion behavior have not been observed.
- **Completion outputs:** the current guardian's post-submit state is captured, but the
  all-signatures-complete confirmation, acceptance receipt, onboarding communications
  and any downloadable completed agreement have not been reached.
- **Alternative and failure paths:** the decline gateway, OTP and record-selection
  entry are captured as SLB-015, and the unsubmitted form as SLB-016. Final decline
  confirmation and completion are not captured. Expired offer, invalid or expired OTP,
  resend, change-email, duplicate access, server error and retry behavior remain
  uncaptured.
- **Guardian removal:** the Remove control is visible, but its confirmation, autosave,
  validation and signature consequences have not been tested.
