# Decline Of Enrolment Offer Form Map

## Scope And Privacy

On 2026-08-01, one matched decline record was started with explicit authorisation and
then opened through its Continue action. The resulting form was inspected read-only
from the DOM. No field, radio, checkbox, dropdown, date, signature or Submit control
was changed or activated.

Student and guardian values, contact details, timestamps, identifiers and private
routes are excluded. Source ID: `SLB-016`.

## Start And Continue Transition

Start did not navigate directly to the decline form. It created the workflow record
and changed the selected row from:

- `Not Started` / `Start`

to:

- `In Progress` / `Continue`

The Last Updated value also changed. The other two decline rows remained `Not Started`.
Continue then loaded a distinct three-step form after a short delay.

## Form Shell

- visible cloud-complete icon and `Saved` state
- three steps: Student, Parent/Guardian and Signature
- Student selected initially
- Submit visible globally but disabled
- each step has a Next control
- no Documents or Conditions step

## Step 1: Student

| Field or control | Type | Required | Observed behavior or wording |
| --- | --- | --- | --- |
| First Name | Text | Yes | Prefilled from the selected student record and editable |
| Last Name | Text | Yes | Prefilled from the selected student record and editable |
| Gender | Radio | Yes | Male or Female |
| School Name | School context | Yes | St Lawrence of Brindisi Catholic Primary School shown |
| Year Level Commencing | Select | Yes | Empty state says to select a year level |
| Commencement Year | Select | Yes | Empty state says to select a starting year |
| Decline of Enrolment Offer | Single radio declaration | Yes | Thanks the school for the offer and states that the family will not seek the place |
| Reason for Decline | Textarea | Yes | Required free text; no visible character limit observed |
| Name of School | Text | Yes | Help asks where the child will instead be enrolled |

This design asks for destination-school information as a mandatory part of declining,
not merely an optional reason.

## Step 2: Parent/Guardian

The form inherits one guardian contact and uses the same editable contact component as
the other Enquiry Tracker workflows:

- Share these details: Yes, share them / No, keep them private
- Salutation
- First Name
- Last Name
- Email
- international dialling-code selector and Mobile Phone
- the same bundled promotional and informational messaging notice
- Relationship to Student
- Contact Type, with Primary shown in the captured record
- Add Contact
- required confirmation that no additional parents or guardians will be added
- Next

The inherited values are editable in the decline record. Whether edits propagate to
the reusable contact master record was not tested.

## Step 3: Signature

The page says the family should preview the form, that electronic signing is equivalent
to a signature, and that a reason must be supplied if both parent/guardian signatures
are not included.

Required controls:

- acknowledge that the signing IP address will be recorded and stored for
  administrative, security and legal-compliance purposes
- confirm that the family will not accept the offered place
- signature canvas and Clear control
- Date
- `Explanation only one signature` textarea

Optional control:

- Additional Information textarea

The declaration displayed `SCHOOL NAME` rather than the actual school name. This is a
visible template-substitution defect in legally important confirmation wording.

## Unobserved Behavior

- no dropdown was opened, so option catalogues beyond visible/current values were not
  confirmed
- Add Contact was not clicked
- no validation error was deliberately triggered
- no signature was drawn
- Next on Signature was not clicked
- Submit was not enabled or clicked
- final warning, confirmation, reversibility, receipt and email remain uncaptured

## Rosewood Implications

- A Start action that only creates a draft should say so or navigate directly; changing
  to Continue after an apparently failed click is confusing.
- Make destination school optional unless there is an approved operational reason to
  require it.
- Separate communication preferences from required contact details.
- Explain why guardian details may be edited and where any edits are stored.
- Use a deliberate final decline warning with the real student and school context.
- Never allow an unsubstituted placeholder in a signed declaration.
- Distinguish draft saved, ready to submit, submitting and decline completed.
