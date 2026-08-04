# V6 Testing

Test date: 4 August 2026

## Static Checks

- bundled Node syntax check passed for `pages/rosewood-enrolment-v6.js`
- `git diff --check` passed for the V6 frontend
- scans found no `fetch`, XHR, WebSocket, beacon, cookie, local-storage,
  session-storage or IndexedDB use
- scans found no Commencement Term or V5 correct-student/correct-offer controls
- content security policy blocks network connections and form actions
- no inline styles are used in V6-rendered content

## Browser Checks

Tested through a local HTTP server in the Codex in-app browser.

- all five workflow gateways and internal review-frame lists load
- EOI is one page; empty submission remains on the page and reports 19 missing groups
- Application Student uses Entry Year and Year Level of Entry and has no Commencement
  Term
- Application Conditions renders 15 agreement headings and no fee panel until one
  exclusive responsibility choice is selected
- selecting One Parent / Guardian reveals only its nominee/date branch and disables the
  other two branches
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
