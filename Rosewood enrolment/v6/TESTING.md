# V6 Testing

Test date: 5 August 2026

## Static Checks

- bundled Node syntax check passed for `pages/rosewood-enrolment-v6.js`
- bundled Node syntax check passed for the generated 444-entry language catalogue
- `git diff --check` passed for the V6 frontend
- scans found no `fetch`, XHR, WebSocket, beacon, cookie, local-storage,
  session-storage or IndexedDB use
- scans found no Commencement Term or V5 correct-student/correct-offer controls
- application-only scans found no proof of address, St Lawrence application terms,
  photography controls, Victorian guidance, parent Past Student, parent Spouse,
  emergency sharing, Current School Family, Social Media or Tour controls
- content security policy blocks network connections and form actions
- no inline styles are used in V6-rendered content

## Browser Checks

Tested through a local HTTP server in the Codex in-app browser.

- all five workflow gateways and internal review-frame lists load
- Application gateway contains a short welcome, the policy/procedure sentence and one
  invitation-email field; it has no language prompt or preparation checklist
- OTP resend immediately shows a sending animation and live status, then confirms a
  new code was sent and disables itself for a 30-second countdown
- EOI is one page; empty submission remains on the page and reports 19 missing groups
- Application Student uses Entry Year and Year Level of Entry and has no Commencement
  Term
- Application Student has no Family Connection, Siblings Already Attending or Other
  Relatives controls; Future Siblings remains visible
- Main Language is a select with English first and 444 language choices
- General / Additional Needs hides only Please Specify until Yes is selected; Health
  Professionals, Reports Attached, NDIS Support and Court or Parenting Orders remain
  visible
- Other medical condition appears only when Other is chosen; Doctor Name and Doctor
  Phone are optional; Ambulance Cover and Health Care Card are mandatory Yes/No
- Application Parent / Guardian has the revised sharing/SMS labels, mandatory Health
  Care Card branch, complete mandatory residential address, required occupation,
  education and residency controls, and no Past Student or Spouse field
- selecting parent Health Care Card Yes reveals required number and expiry fields;
  selecting Temporary Resident reveals required visa subclass and expiry fields
- Emergency Contacts has no sharing question
- Application Documents contains five categories, uses School and latest-report wording,
  and contains no Proof of Address category
- Application Conditions contains only previous-school permission, fee responsibility
  and survey; it has no Enrolment Agreement terms or photography permissions
- selecting One Parent / Guardian reveals only its nominee/date branch and disables the
  other two branches
- selecting Both Parents / Guardian displays the fee-account nominee note and offers
  Parent / Guardian A or Parent / Guardian B
- the application survey omits Current School Family, Social Media and Tour
- Application Signature has no Victorian guidance, places the shortened disclaimer in
  the signature section and has no website suffix
- with two parent/guardian records, the second name and email populate the later-signing
  card and its acknowledgement is required
- after removing the second parent/guardian, the required one-signature explanation and
  revised reason appear instead
- Acceptance Student contains only first name, last name, year level, commencement year
  and the acceptance declaration
- Acceptance Documents contains the two required signed conduct uploads
- Acceptance Conditions renders 16 agreement headings and its four captured sections
- Signing Review contains a disabled read-only completeness check and a Pending
  Signature status
- Signing canvas begins locked and the submit button begins disabled
- both declarations unlock the canvas but do not enable submit without a signature
- pressing Enter on the canvas creates a keyboard review signature, sets the automatic
  date and enables submit
- unchecking IP acknowledgement restores its exact warning, invalid declaration,
  signature and date states, and disables submit
- Decline Student has no Commencement Term and uses the captured year/year-level labels
- no duplicate IDs or unlabelled controls were found on the inspected dynamic frames
- no console warnings or errors were present after the final workflow checks

## Responsive Checks

Desktop viewport: 1280 px wide.

- story panel and form column meet without overlap
- left-side copy is visible and not clipped
- no horizontal overflow

Mobile viewport: 390 x 844.

- the review warning and Rosewood story panel appear before the form
- the form starts after the story panel and remains scrollable
- controls collapse to one column
- document width equals viewport width; no horizontal overflow

## Backend Boundary

OTP delivery, autosave, draft recovery, uploads, real invitation authorisation,
transactional email, server timestamps, submission, audit linkage and legally effective
signatures cannot be tested because V6 intentionally has no backend.
