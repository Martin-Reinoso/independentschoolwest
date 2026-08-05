# V6 Testing

Test date: 5 August 2026

## Static Checks

- bundled Node syntax check passed for `pages/rosewood-enrolment-v6.js`
- bundled Node syntax check passed for the generated 444-entry language catalogue
- `git diff --check` passed for the V6 frontend
- scans found no cookie, local-storage, session-storage or IndexedDB use
- scans found no Commencement Term or V5 correct-student/correct-offer controls
- application-only scans found no proof of address, St Lawrence application terms,
  photography controls, Victorian guidance, parent Past Student, parent Spouse,
  emergency sharing, Current School Family, Social Media or Tour controls
- content security policy permits only the V6 Lambda endpoint and the required Google
  upload endpoints; form actions, frames and objects remain blocked
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
  Relatives controls; the other-children Yes branch reveals the required 1-to-7+ count
- Religion Other and current-school Other reveal independent required full-width fields
- Current Early Learning Centre / Kindergarten / Primary School occupies its own row on
  desktop and mobile without displacing adjacent controls
- Student Residence, Student Primary Address and Family render as separate sections
- Home Care Arrangement uses checkboxes; Other and Shared Custody independently reveal
  their required detail fields
- Nationality and Citizenship includes its government-purpose explanation, clarified
  student labels, expanded arrival/return guidance and languages at the end
- Citizenship Status No reveals required residency evidence; Eligible for Australian
  Passport keeps visa fields hidden, while each other evidence option reveals required
  subclass/expiry and optional previous subclass
- Main Language is a select with English first and 444 language choices
- General / Additional Needs hides only Please Specify until Yes is selected; Health
  Professionals, Reports Attached, NDIS Support and Court or Parenting Orders remain
  visible; the source duty-of-care and no-impact-on-offer text is present
- Other medical condition appears only when Other is chosen; Doctor Name and Doctor's
  practice/Address are mandatory while Doctor Phone remains optional; Ambulance Cover
  and Health Care Card are mandatory Yes/No
- Humanitarian Health Check explains that it refers to a humanitarian visa
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

## Backend Checks

- thirteen Node tests pass for direct invitation, explicit EOI linkage, fail-closed link
  errors, linked-email integrity, EOI normalization, conditional needs validation,
  dynamic application fields, Acceptance-field rejection, server-side guardian review
  acknowledgement, staff allowlisting, safe dashboard projection, staff invitation
  response redaction and atomic invitation-token rotation
- the AWS stack deployed successfully and `/v6/health` returns the expected schema
  version, secure CORS and no-cache headers
- a synthetic EOI produced an EOI reference, private Drive snapshot, EOI Sheet row,
  audit event and acknowledgement email
- a synthetic direct invitation remained unlinked to EOI, delivered invitation and OTP
  emails, saved a revisioned draft, uploaded a synthetic file, captured two independent
  signatures and reached 100 percent submitted status
- a separate synthetic EOI-linked invitation prefilled the exact source EOI contact,
  student and address values after OTP verification
- normalized Application, Document, Signature, Guardian and Operations rows were
  checked against the canonical application state
- the automated second-guardian mirror defect found by the canary was fixed, deployed
  and its synthetic row reconciled

## Staff Portal Checks

- the noindex portal loaded at
  `https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html`
- desktop and 390 x 844 mobile layouts loaded with no horizontal overflow
- the production OTP arrived from `enrolment@ffe.org.au` at the allowlisted
  `info@ffe.org.au` mailbox and opened a two-hour staff session
- the dashboard loaded 1 synthetic EOI and 2 synthetic application records, correct
  progress/status totals, recent email events and all three private Sheet links
- dashboard text and API projection checks found no medical, date-of-birth, document,
  signature-image, network-fingerprint or invitation-token data
- direct and EOI-linked invitation panels rendered correctly; the already-linked EOI
  was disabled and no family invitation was sent during the UI verification
- resend showed the explicit token-invalidation confirmation and was cancelled without
  sending an email
- sign-out returned to the access screen and browser local/session storage remained
  empty
- the production Lambda recorded no request failures during the verification window;
  its CloudWatch error alarm remained `OK`

## Email Checks

- the SES account is production-enabled and healthy in `ap-southeast-2`
- controlled EOI, invitation, OTP, guardian-signature and completion messages arrived
  from `enrolment@ffe.org.au` at `info@ffe.org.au`
- Gmail original headers passed SPF, DKIM and DMARC and used the aligned
  `bounce.ffe.org.au` return path
- SES simulator success, permanent-bounce and complaint canaries completed; bounce and
  complaint SNS notifications arrived in the operations mailbox

All canary records are explicitly labelled synthetic and contain no family data.
Uploaded-file malware scanning, multi-user staff roles and automatic SES feedback
ingestion remain documented production gaps.
