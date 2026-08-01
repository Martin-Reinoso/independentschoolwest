# Decline Of Enrolment Offer Process Map

## Scope And Privacy

This record covers the decline branch observed on 2026-08-01 through its first verified
record-selection screen. The authorised family email was entered to request an OTP,
and the user completed verification. A later authorised observation started one record
and mapped the form separately as `SLB-016` in `09-decline-form-map.md`.

No OTP, contact value, student name, address, phone number, email address, timestamp,
private route or record identifier is retained here. Source ID: `SLB-015`.

## Stage 1: Decline Gateway

The gateway keeps the same school header, language control and privacy presentation as
the application and acceptance routes, but its purpose text is explicit:

- it addresses the parent or guardian
- it says the process formally declines an offered place
- it instructs the family to use the same email address used previously
- it links the MACS Privacy Policy and Privacy Collection Notice
- Email is required
- Next is disabled while Email is empty and becomes enabled after a valid email

After Next was clicked, the button changed to `Sending...` and remained disabled while
the verification request was created.

## Stage 2: OTP Verification

The gateway changed in place to the standard verification screen:

- `A code has been sent to your email address`
- `Enter the code to continue`
- required Verification Code input
- Verify disabled while the code is empty
- Resend code action
- Change email action

The user entered and verified the OTP. The observer did not read, copy or enter it.
Verification produced a brief busy state, removed the OTP controls and loaded the next
stage without a visible route change.

## Stage 3: Decline Record Selection

The verified screen reuses the contact/student selector used by the application and
acceptance branches:

- tab/step label `Select a contact`
- heading `SELECT OR ENTER A STUDENT`
- confirmation that matching information was successfully located
- one contact table with Name, Last Updated, Address, Email and Mobile Phone columns
- one student table with Student Name, Last Updated, Form Status and Action columns
- three matched student rows were visible
- every decline record showed `Not Started` with a `Start` action
- a blank Student First Name and Student Last Name entry area was also present
- the blank-entry Start button was disabled until both names are supplied
- the section heading was `START A NEW DECLINE OF ENROLMENT OFFER`

The helper sentence above the student table still says `Please select a student to
continue or start a new application.` This is misleading because the route creates a
decline record, not an application.

During this capture no Start action was clicked. A later authorised capture confirmed
that Start creates an `In Progress` record and Continue opens a three-step decline form.
The blank-entry Start path, final confirmation and communications remain uncaptured.

## Working Architecture Inference

The separate `Not Started` status for every row indicates that decline is a third
workflow record type alongside Application and Enrolment Agreement. The same contact
and student master records appear to be reused, while each process maintains its own
status and action. This is an inference from the interface, not a verified backend
schema.

## Rosewood Implications

- Label every stage explicitly as `Decline offer`; never reuse `application` wording.
- Show the consequence before beginning and provide a safe cancel/back path.
- Keep decline status separate from application and acceptance status.
- Do not make every associated student appear eligible unless each has an active offer.
- Require an intentional final confirmation and explain whether decline is reversible.
- Send a receipt and provide a school-contact path after completion.

## Next Authorised Capture

- Confirm hidden dropdown option catalogues without changing the stored draft.
- Map any final warning, confirmation and reversal period.
- Capture the completion screen and automatic email without retaining personal data.
- Check whether declining one offer changes the other student rows or the accepted
  agreement state.
