# V6 Testing

Test date: 8 August 2026

## Static Checks

- bundled Node syntax check passed for `pages/rosewood-enrolment-v6.js`
- bundled Node syntax check passed for the generated 444-entry language catalogue
- `git diff --check` passed for the V6 frontend
- scans found no cookie, local-storage, session-storage or IndexedDB use
- scans found no Commencement Term or V5 correct-student/correct-offer controls
- application-only scans found no proof of address, St Lawrence application terms,
  photography controls, Victorian guidance, parent Past Student, parent Spouse,
  emergency sharing, Current School Family, Social Media or Tour controls
- content security policy permits only the V6 Lambda endpoint and Sydney S3 upload
  endpoints; form actions, frames and objects remain blocked
- no inline styles are used in V6-rendered content
- scans found no family-facing `Secure enrolment form`, backend-scope or
  `Progress saves when you continue` wording
- the release page references V6 CSS `v=8` and JavaScript `v=13`

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
- each document control explains that upload starts immediately; live uploads render a
  per-file progress bar, preparation/securing/uploaded state and an inline retryable
  error within the relevant document card
- Application Conditions contains only previous-school permission, fee responsibility
  and survey; it has no Enrolment Agreement terms or photography permissions
- selecting One Parent / Guardian reveals only its nominee/date branch and disables the
  other two branches
- selecting Both Parents / Guardian displays the fee-account nominee note and offers
  Parent / Guardian A or Parent / Guardian B
- the application survey omits Current School Family, Social Media and Tour
- the decision-influences question requires exactly three selections on Conditions;
  two selections produce the field-specific exact-three message before navigation
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
- leaving Signature and returning restores both declarations, the date, the additional-
  guardian acknowledgement and the in-browser signature drawing; Submit remains enabled
- a prepared signature displays `Signature ready`; drawing does not create draft-save
  revisions and is recorded in Drive only after successful final submission
- server validation identifies each incomplete answer by family-facing label and section,
  offers a direct review action and highlights the relevant field within that section
- unchecking IP acknowledgement restores its exact warning, invalid declaration,
  signature and date states, and disables submit
- Decline Student has no Commencement Term and uses the captured year/year-level labels
- no duplicate IDs or unlabelled controls were found on the inspected dynamic frames
- no console warnings or errors were present after the final workflow checks
- after email verification, Application shows a family-level child selector; a direct
  invitation uses its initial blank record for the first child and can add further
  children as separate application records
- an EOI-linked invitation retains the linked child and allows the verified family to
  add another child without linking that new application to the earlier EOI
- the family-facing gateway has no environment ribbon or top offset; explicit review
  mode retains its non-writing warning
- the compact workflow/section header is sticky at the top of the family page and uses
  short family-facing save/connectivity states
- every live Application section renders Save and continue later; the child selector
  renders Sign out and no Back control
- the save indicator is absent from the gateway, OTP and child-selection screens, so an
  authentication failure cannot be presented as a draft-save failure
- debounced autosave uses a 1.2-second pause, an eight-second maximum wait, revision
  serialization and unchanged-snapshot suppression
- offline, online, failed-save and expired-session paths update the sticky status; an
  unsaved close attempt invokes the browser's standard leave warning
- session expiry opens a blocking dialog automatically after the mirrored 20-minute
  inactivity window or immediately after a server expiry response; Escape is prevented,
  saved versus potentially unsaved wording is selected from current state, and Return to
  sign in clears browser session data and restores the Application gateway

## Responsive Checks

Desktop viewport: 1280 px wide.

- story panel and form column meet without overlap
- left-side copy is visible and not clipped
- no horizontal overflow
- the sticky header remains at viewport top while the form scrolls and is approximately
  81 px high at the 1280 px test viewport

Mobile viewport: 390 x 844.

- the review warning and Rosewood story panel appear before the form
- the form starts after the story panel and remains scrollable
- controls collapse to one column
- document width equals viewport width; no horizontal overflow

## Backend Checks

- thirty-eight Node tests pass for immutable form definitions and stable hashes, frontend
  submission guidance and in-browser signature continuity, Google Drive
  upload/confirmation, legacy-safe
  document and family-invitation projection headers, direct invitation, explicit EOI
  linkage, exact invitation variants, 14-day expiry, fail-closed link errors,
  linked-email integrity, EOI normalization, conditional needs validation, dynamic
  application fields, Acceptance-field rejection, server-side guardian review
  acknowledgement, staff allowlisting, safe dashboard projection, staff invitation
  response redaction, staff role restrictions, family multi-child isolation, resumed
  saved-section context, 20-minute sliding inactivity, eight-hour absolute session
  lifetime, explicit session revocation, atomic invitation-token rotation and
  customer-managed KMS access in the Lambda runtime policy, non-destructive partial
  saves, form-version mismatch rejection and audited historical-revision retrieval
- regression coverage proves that a general no-contact preference does not suppress the
  required additional-guardian signing request, and that a missing task can be recovered
  transactionally without rewriting the submitted application answers
- the production deployment bundle builds successfully and both family/admin browser
  scripts pass Node syntax checks
- the AWS stack deployed successfully and `/v6/health` returns the expected schema
  version, secure CORS and no-cache headers
- the 7 August invitation release updated Lambda in place without replacing DynamoDB,
  KMS, backup or endpoint resources; the Lambda remained `Active`, the scheduled
  outbox rule remained enabled and the Lambda error alarm remained `OK`
- the 7 August autosave release again updated Lambda in place; `/v6/health` and the new
  idempotent session-revocation route returned HTTP 200, Lambda reported `Active` with a
  successful update, the one-minute outbox rule remained enabled and the error alarm
  remained `OK`
- the production Lambda uses restricted Google Drive for files and the staff portal no
  longer exposes a document-download endpoint
- the production upload transport uses a private KMS-encrypted Sydney S3 staging bucket
  restricted to `https://ffe.org.au` PUTs; its 15-minute presigned upload requires the
  signed SHA-256 and encryption headers, successful confirmation moves the file to
  restricted Drive and deletes staging, and abandoned objects expire after one day
- a synthetic production transport canary passed S3 preflight and upload with HTTP 200,
  created a verified Drive document, confirmed the staging object was removed and then
  deleted the synthetic Drive document; no family file was used
- both authoritative DynamoDB tables are deletion-protected, use the retained
  customer-managed KMS key and have point-in-time recovery enabled
- the Sydney backup vault is KMS-encrypted and locked; its backup plan covers both
  authoritative tables with daily 35-day and monthly 366-day recovery points
- manual verification backups for the production records and append-only audit tables
  both completed on 6 August 2026; the locked Sydney vault reports two completed
  DynamoDB recovery points
- the Lambda error alarm is `OK` and the operations mailbox confirmed its new SNS
  failure-alert subscription
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

## Form Version And Migration Checks

- EOI and Application use separate immutable `2026.4` form contracts with SHA-256
  definition hashes; the production build fails if the pinned family HTML or JavaScript
  changes without a deliberate form-definition update
- the original `2026.1`, `2026.2` and `2026.3` definitions retain their exact hashes and
  validators; the family browser supports all four Application versions so existing
  records are not migrated or rewritten by later interaction fixes
- partial-save tests prove that omitted and retired answer keys remain in the current
  record and immutable revision; a mismatched browser version is rejected without a
  write
- staff detail returns revision metadata without historical values, and the separate
  revision route returns one selected snapshot only after staff authorization and adds
  an audit event
- two fresh pre-migration DynamoDB backups completed in the locked Sydney vault, raising
  the verified recovery-point count from four to six
- the migration dry run identified five application records and one EOI; the apply run
  pinned all six records without changing answers and created five immutable application
  baseline revisions
- the post-migration dry run reports zero unversioned applications and zero unversioned
  EOIs; DynamoDB reports two stored form definitions and five baseline revisions
- Google projections were rebuilt from DynamoDB after an aggregate-only dry run; EOI,
  Application and Progress rows all report the expected record-specific form version
  and definition hash
- the production Lambda remained `Active`, CloudFormation reached `UPDATE_COMPLETE`,
  and `/v6/health` returned both current workflow versions after deployment
- local desktop and 390 x 844 review-mode checks loaded JavaScript `v=13` without console
  errors or horizontal overflow

## Submission Validation Release

Verified in production on 8 August 2026 without printing or exporting family answers.

- GitHub Pages served CSS `v=8` and JavaScript `v=13`; the live JavaScript SHA-256 matched
  the immutable `2026.3` form definition
- the reviewed CloudFormation change set updated the Lambda code in place and did not
  replace either DynamoDB table, the KMS key, backup resources or document storage
- CloudFormation reached `UPDATE_COMPLETE`, Lambda was `Active` with a successful update,
  the scheduled outbox rule remained enabled and the Lambda error alarm remained `OK`
- `/v6/health` returned `rosewood-eoi-2026.3` and
  `rosewood-application-2026.3` as the current contracts
- the latest pre-release Application record remained pinned to its original `2026.1`
  contract and progressed to `pending_signatures`; this confirms that its primary
  signature was stored and the application now awaits the additional guardian signature
- no production family record, answer, signature image, invitation token or identifier was
  written to this repository or included in the release evidence

## Guardian Signature Workflow Release

Verified in production on 8 August 2026 without printing or exporting family answers.

- production diagnosis found a primary-signed application with two required signatures,
  one recorded signature, no additional-guardian task and no signature-invitation email
  receipt; its stored general contact preference was the former suppression condition
- the family portal now serves CSS `v=9` and JavaScript `v=14`; the live JavaScript hash
  matches the immutable `2026.4` form definition
- the family selector presents `pending_signatures` as **Awaiting Parent/Guardian
  Signature** in both status and action columns; **Completed** is reserved for the final
  `submitted` state
- all additional listed guardians with valid email addresses receive the required
  transactional signing task even when their general contact preference is No
- thirty-eight Node tests pass, including no-contact task creation, transactional
  missing-task recovery and frozen `2026.1` to `2026.3` definition hashes
- the recovery command defaults to dry run and reported exactly one missing request for
  the affected test application without changing or exposing its answers
- the reviewed CloudFormation change set updated Lambda code in place; both DynamoDB
  tables, KMS, backups and document storage were unchanged
- CloudFormation reached `UPDATE_COMPLETE`, Lambda remained `Active`, `/v6/health`
  returned both `2026.4` form versions, the outbox schedule remained enabled and the
  Lambda error alarm remained `OK`
- no recovery email was sent during verification; applying the recovery requires an
  explicit operator confirmation because it creates an external message

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
- the direct-invitation form contains only family email, required parent/guardian first
  name and optional parent/guardian last name; it does not request a child name
- resend showed the explicit token-invalidation confirmation and was cancelled without
  sending an email
- sign-out returned to the access screen and browser local/session storage remained
  empty
- the production Lambda recorded no request failures during the original verification
  window;
  its CloudWatch error alarm remained `OK`

## KMS Runtime Permission Incident

Resolved 6 August 2026 after the staff portal returned the generic service-error
message.

- CloudWatch identified `kms:Decrypt` access denied for the Lambda execution role when
  it accessed the customer-managed-KMS-encrypted DynamoDB tables
- the health endpoint remained available because it does not read DynamoDB, while staff
  OTP creation and the scheduled outbox reader failed closed
- the CloudFormation runtime role now has the required encrypt, decrypt, re-encrypt,
  data-key and key-description actions scoped only to the Rosewood records key
- the reviewed change set updated the role and Lambda in place; no table, key, backup
  vault or stored record was replaced
- the scheduled outbox reader completed successfully after deployment
- an allowlisted staff challenge was created and the new OTP arrived at
  `info@ffe.org.au` from `enrolment@ffe.org.au`
- the infrastructure regression test prevents removal of the scoped runtime KMS
  permissions from the template

## Email Checks

- the SES account is production-enabled and healthy in `ap-southeast-2`
- controlled EOI, invitation, OTP, guardian-signature and completion messages arrived
  from `enrolment@ffe.org.au` at `info@ffe.org.au`
- controlled inactive-link canaries for both new invitation variants arrived on
  7 August 2026 with the exact title-case subject, approved direct or EOI-linked copy,
  fallback URL, enrolment contact, Rosewood sign-off and 21 August 2026 expiry
- the EOI-linked canary names Rosewood College and does not carry the reference
  school name into the production invitation template
- Gmail original headers passed SPF, DKIM and DMARC and used the aligned
  `bounce.ffe.org.au` return path
- SES simulator success, permanent-bounce and complaint canaries completed; bounce and
  complaint SNS notifications arrived in the operations mailbox

## Recovery Drill

Completed 6 August 2026 using the two verified recovery points in the locked Sydney
backup vault.

- the production records recovery point restored to an isolated temporary table and
  the AWS Backup restore job completed at 100 percent
- the append-only audit recovery point restored to a separate isolated temporary table
  and the AWS Backup restore job completed at 100 percent
- aggregate item counts matched exactly: operational records `102/102` and audit
  records `0/0`; no family values were printed or exported
- both restored tables were active, used the retained customer-managed KMS key and had
  the expected `PK` partition key and `SK` sort key
- restored tables were never connected to Lambda, Google Sheets, Google Drive or the
  staff portal
- `pnpm rebuild-projections` completed in `dry-run` mode and produced aggregate row
  counts only; the apply confirmation was not supplied and no Sheet rows were changed
- both temporary recovery tables were deleted after validation and AWS returned no
  remaining table with the `rosewood-recovery-` prefix
- both production tables remained active, encrypted and deletion-protected, and the
  production `/v6/health` endpoint continued to return `ok`

All canary records are explicitly labelled synthetic and contain no family data.
GuardDuty, uploaded-file malware scanning and cross-region protection are deliberately
outside the small-scale launch scope. Named multi-user staff accounts and automatic SES
feedback ingestion remain documented production gaps.
