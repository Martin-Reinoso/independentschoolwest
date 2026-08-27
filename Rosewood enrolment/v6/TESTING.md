# V6 Testing

Test date: 8 August 2026

## Static Checks

- bundled Node syntax check passed for `pages/rosewood-enrolment-v6.js`
- bundled Node syntax check passed for the generated policy projection
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
- the release page references V6 CSS `v=11`, policy projection `v=1` and JavaScript
  `v=17`
- all three copied Word documents match their approved source SHA-256 hashes exactly;
  their canonical PDFs open as 8, 7 and 8-page documents

## Browser Checks

Tested through a local HTTP server in the Codex in-app browser.

- all five workflow gateways and internal review-frame lists load
- Application gateway contains a short welcome, quiet optional-reference links for the
  Enrolment Policy, Enrolment Procedure and Privacy Policy, and one invitation-email
  field; policy review is not presented as a prerequisite and the gateway has no Privacy
  Collection Notice reference, language prompt or preparation checklist
- each direct policy URL loads the requested approved title; desktop policy tabs and the
  mobile selector switch all three documents and expose the active selection with
  `aria-current` or the selected option
- Return to application and browser Back restore the gateway without losing its entered
  email; policy switching does not create a checkbox, acknowledgement, save or API call
- original PDF links use the current tab rather than a popup, and each original Word
  fallback has an explicit download attribute
- policy landmarks, labelled navigation, heading levels, document-register table,
  contents links and scoped visible focus styles are present in the accessibility tree
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
- V6.8 has no separate Student Residence or Previous Education section; interrupted
  schooling follows the current-school control, while address sharing and Home Care
  Arrangement render inside Student Primary Address
- Home Care Arrangement uses a compact single-select; Other and Shared Custody
  independently reveal their required detail fields
- Nationality and Citizenship includes its government-purpose explanation, clarified
  student labels, expanded arrival/return guidance and languages at the end
- Citizenship Status No reveals required residency evidence; Eligible for Australian
  Passport keeps visa fields hidden, while each other evidence option reveals required
  subclass/expiry and optional previous subclass
- Main Language is a select with English first and 444 language choices
- General / Additional Needs hides only Please Specify until Yes is selected; Health
  Professionals, Reports Attached, NDIS Support and Court or Parenting Orders remain
  visible; the source duty-of-care and no-impact-on-offer text is present
- Other medical condition appears only when Other is chosen; Doctor Name, Doctor's
  practice/Address and Doctor Phone are mandatory; Ambulance Cover and Health Care Card
  are mandatory Yes/No
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
- Application Conditions contains the three required agreement groups and the optional
  eleven-question Student and family survey; it has no Enrolment Agreement terms,
  fee-responsibility control, previous-school permission or photography permissions
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
- the second contact's explicit contact-permission choices switch the email requirement
  and amber do-not-contact notice immediately without removing the stored contact record
- the application Signature page shows either Separate signature request required or
  Signature request suppressed and Staff review required, and the latter route requires
  the one-signature explanation
- the frontend-only Pending signatures frame mirrors the read-only production status
  view; at 390 x 844 both signer cards and both action buttons fit without horizontal
  overflow and retain full-width touch targets
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
- every live Application section renders Save and continue later; its confirmation can
  return to the child selector without another OTP, and the selector renders Sign out
  with no Back control
- the save indicator is absent from the gateway, OTP and child-selection screens, so an
  authentication failure cannot be presented as a draft-save failure
- debounced autosave uses a 1.2-second pause, an eight-second maximum wait, revision
  serialization and unchanged-snapshot suppression
- offline, online, failed-save and expired-session paths update the sticky status; an
  unsaved close attempt invokes the browser's standard leave warning
- session expiry opens a blocking dialog automatically after the mirrored 90-minute
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
- the policy reader retains the blue Rosewood information panel, shows all three tabs,
  clearly marks the current policy and keeps Return to application visible

Mobile viewport: 390 x 844.

- the review warning and Rosewood story panel appear before the form
- the form starts after the story panel and remains scrollable
- controls collapse to one column
- document width equals viewport width; no horizontal overflow
- the policy reader replaces the desktop columns with the compact Rosewood header,
  sticky return/selector toolbar and reading-progress indicator
- the document-register table reflows into labelled rows, collapsed contents occupies
  only its natural height, and long content remains within the 390 px viewport

## Backend Checks

- the staff dashboard summary returns each application's existing entry year and entry
  level without returning date of birth, network fingerprints or other new sensitive
  fields
- the staff **Enrolment planning** view shows student, entry year, entry level, status,
  signature progress, last activity, staff-review flag and reference; it supports
  search and year/level/status filters, identifies missing entry details and excludes
  recipient email from the planning renderer

- the complete Node test suite passes for immutable form definitions and stable hashes, approved
  policy source/asset hashes, guardian-email privacy, frontend
  submission guidance and in-browser signature continuity, Google Drive
  upload/confirmation, legacy-safe
  document and family-invitation projection headers, direct invitation, explicit EOI
  linkage, exact invitation variants, 14-day expiry, fail-closed link errors,
  linked-email integrity, EOI normalization, conditional needs validation, dynamic
  application fields, Acceptance-field rejection, server-side guardian review
  acknowledgement, staff allowlisting, safe dashboard projection, staff invitation
  response redaction, staff role restrictions, family multi-child isolation, resumed
  saved-section context, 90-minute sliding inactivity, eight-hour absolute session
  lifetime, explicit session revocation, atomic invitation-token rotation and
  customer-managed KMS access in the Lambda runtime policy, non-destructive partial
  saves, form-version mismatch rejection and audited historical-revision retrieval
- regression coverage proves that explicit Do not contact suppresses task creation,
  outbox email, OTP, resend, correction and recovery, while a permitted missing task can
  be recovered transactionally without rewriting submitted answers
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

- EOI and Application use separate immutable `2026.5` form contracts with SHA-256
  definition hashes; the production build fails if any pinned family or policy asset
  changes without a deliberate form-definition update
- the original `2026.1`, `2026.2`, `2026.3` and `2026.4` definitions retain their exact
  hashes and validators; the family browser supports all five Application versions so existing
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

## Historical Guardian Signature Workflow Release (Superseded)

Verified in production on 8 August 2026 without printing or exporting family answers.
This records the earlier `2026.4` behaviour for audit history. Its no-contact handling
was superseded by the explicit fail-closed `2026.6` contract and must not be used as
current operational guidance.

- production diagnosis found a primary-signed application with two required signatures,
  one recorded signature, no additional-guardian task and no signature-invitation email
  receipt; its stored general contact preference was the former suppression condition
- the family portal now serves CSS `v=9` and JavaScript `v=14`; the live JavaScript hash
  matches the immutable `2026.4` form definition
- the family selector presents `pending_signatures` as **Awaiting Parent/Guardian
  Signature** in both status and action columns; **Completed** is reserved for the final
  `submitted` state
- at that historical release, all listed guardians with valid email addresses received
  the transactional task even when the older preference was No; `2026.6` prohibits this
- forty-one Node tests pass, including no-contact task creation, transactional
  missing-task recovery and frozen `2026.1` to `2026.3` definition hashes
- the recovery command defaults to dry run and reported exactly one missing request for
  the affected test application without changing or exposing its answers
- the reviewed CloudFormation change set updated Lambda code in place; both DynamoDB
  tables, KMS, backups and document storage were unchanged
- CloudFormation reached `UPDATE_COMPLETE`, Lambda remained `Active`, `/v6/health`
  returned both `2026.4` form versions, the outbox schedule remained enabled and the
  Lambda error alarm remained `OK`
- after explicit operator authorisation, recovery created exactly one missing guardian
  task and SES accepted exactly one signature-invitation email; a repeat dry run found
  zero missing requests and the frozen answers remained unchanged

## Complete Guardian Review Release

Verified locally and in production on 8 August 2026 with synthetic answers only.

- after OTP verification, the signing page renders ten read-only sections: Student,
  Nationality and Citizenship, General / Additional Needs, Sacraments, Medical Details,
  Parent / Guardian, Emergency Contacts, Documents, Conditions and Signature
- every repeated parent/guardian and emergency contact is displayed; the current signer
  is marked in their existing guardian record
- uploaded documents are represented only by original file name and the recorded primary
  signature is represented by status, timestamp and application revision
- tests confirm application IDs, revision hashes, Drive IDs, signature file IDs and
  network fingerprints do not enter the guardian review projection
- desktop and 390 x 844 mobile checks show the full review with no horizontal overflow;
  mobile question-and-answer rows collapse to a single readable column
- signing assets are cache-versioned as JavaScript `v=2` and CSS `v=2`
- forty-one Node tests pass, including the complete review projection, verified signing
  response boundary and browser renderer
- the reviewed CloudFormation change set updated the Lambda code in place; no DynamoDB,
  KMS, backup, staging, secret or Google configuration resource changed
- CloudFormation reached `UPDATE_COMPLETE`, Lambda remained `Active` with a successful
  update, `/v6/health` retained both `2026.4` form versions, the outbox schedule remained
  enabled and the Lambda error alarm remained `OK`
- GitHub Pages completed the `main` release and the live HTML, CSS and JavaScript hashes
  exactly match the committed files
- a live-origin synthetic OTP response rendered all 10 sections and 19 information
  groups with the current guardian marked; desktop and 390 x 844 mobile checks had no
  horizontal overflow and no browser warnings or errors
- no real task token, OTP, family answer, document or signature was used in the release
  check

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

## Approved Policy Reader And Guardian Email Release

Verified locally and in production on 8 August 2026 without using a family invitation,
answer, document, signature task or OTP.

- all 44 Node tests pass, including the three byte-identical approved Word sources,
  immutable `2026.1` to `2026.5` definition hashes, welcome-copy boundary and exact
  additional-guardian explanation/privacy assertions
- the deployment bundle passed its pinned-asset gate for the HTML, JavaScript, CSS,
  generated policy projection and all six Word/PDF policy files
- GitHub Pages serves all ten assets with SHA-256 hashes identical to commit `16b5555`;
  the original Word downloads retain the approved source hashes and the PDFs open with
  8, 7 and 8 pages
- the live desktop reader at 1280 x 720 retained the blue Rosewood panel, all three
  policy tabs, active-policy semantics, direct URLs and zero horizontal overflow
- the live mobile reader at 390 x 844 used the compact header, sticky return/selector
  toolbar, natural-height contents control and stacked document register with zero
  horizontal overflow
- live Return to application and browser Back preserved the entered review-mode email;
  the welcome contained no Privacy Collection Notice reference and policy review added
  no acknowledgement control
- the live browser reported no console errors, and the original PDF opened in the same
  tab and returned to the selected policy through browser Back
- the reviewed CloudFormation change set modified Lambda code and its recalculated
  EventBridge target/permission only; it did not replace DynamoDB, KMS, backup, S3 or
  endpoint resources
- CloudFormation reached `UPDATE_COMPLETE`, Lambda remained `Active` with a successful
  update, `/v6/health` returned both `2026.5` contracts, the one-minute outbox rule
  remained enabled and the Lambda error alarm remained `OK`
- Amazon SES accepted the updated guardian template through the Sydney mailbox simulator
  from `enrolment@ffe.org.au`; no real recipient or application information was used

## Explicit Contact Permission And Pending Signer Correction Release

Verified locally and in production on 8 August 2026 using synthetic records only for
automated workflow verification. No production application was reopened, duplicated or
edited during release verification.

- all 54 Node tests pass, including one guardian, permitted and prohibited second
  guardians, repeated-contact removal, post-submission-only delivery, explanation and
  staff-review enforcement, staff permission changes, OTP step-up, all pending correction
  states, previous-link/session/challenge revocation, corrected-email signing, completion
  lockout, duplicate requests, rate limits and correction/signing race conditions
- the deployment bundle passed its supply-chain and pinned-asset gates; V6.6 pins family
  JavaScript `v17`, CSS `v11`, the staff and signer assets, all policy-reader assets and
  the six approved Word/PDF policy files
- the reviewed CloudFormation changes modified Lambda code in place and its recalculated
  EventBridge target/permission only; DynamoDB, the restricted audit table, KMS key,
  backup plan/vault, document storage, secrets and public endpoint were not replaced
- CloudFormation reached `UPDATE_COMPLETE`; Lambda remained `Active` with a successful
  update and `/v6/health` returned schema
  `rosewood-v6-2026-08-08-contact-permission` with both current `2026.6` contracts
- the scheduled Sydney outbox remained enabled at one-minute intervals, the AWS Backup
  plan remained present and the Lambda error alarm remained `OK`
- desktop browser verification confirmed the exact permission values, calm amber notice,
  dynamic email requirement, permitted/suppressed signature routes and required
  one-signature explanation
- the read-only status preview exposes a masked pending signer email, contact permission,
  sent/opened/verified state and only eligible correction/resend actions; completed
  signers display only Complete
- mobile verification at 390 x 844 reported a 390px document width, no horizontal
  overflow, 355px signer cards and two 313px action buttons
- ordinary logs contain no complete correction email address; previous email values and
  full audit history remain restricted to authorised staff detail views

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
- the additional-guardian template places the approved purpose/safety explanation before
  the action button, omits student, family, medical and application details, and retains
  the private-link plus email-OTP verification flow
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

## V6.7 Application Contract Release

Verified locally and deployed in Sydney on 8 August 2026. No real-family form was
submitted, reopened or changed during release verification.

- all 60 Node tests pass, including legacy V6 contact-permission/signature security,
  V6.7 conditional education/assessment/Health Care Card validation, future-sacrament
  rejection, authoritative server signing date, old-draft transactional upgrade,
  answer preservation, two-hour remembered staff sessions and append-only Student
  projection headers
- bundled Node syntax checks and `git diff --check` pass; the production deployment
  bundle passes its frozen-lockfile and immutable-asset gates
- V6.7 pins 18 release assets, adding the inherited base CSS and 444-language catalogue
  to the family/admin/signer/policy/document asset set
- local browser verification at 390 x 844 found a 390px document width with no
  horizontal overflow; child cards were 321px, action buttons 290px and all student,
  guardian, Conditions and Signature frames fit the viewport
- the selector review and production paths both use icon-led child cards showing name,
  source, status and action; the stale review-only student table was removed
- the live Student frame exposes 250 country entries and 444 language entries, defaults
  Rosewood entry year to 2027, uses one Home Care radio group and permits EpiPen/Anapen
  to be selected and cleared
- the Melbourne date boundary was tested around UTC offset: the sacrament maximum and
  read-only display both resolve to 8 August in Melbourne, and Lambda overwrites a
  synthetic `1999-01-01` browser signing date with the server submission date
- adding Contact 3 on mobile leaves focus on Contact 3 rather than returning to Contact
  1; guardian ethnicity is optional, marital status/religion are required, and all six
  ACARA occupational choices plus the St Lawrence occupation catalogue are present
- Conditions contains exactly three required agreement acknowledgements and no fee or
  previous-school-contact permission control
- the reviewed CloudFormation change modified the Lambda in place and recalculated the
  existing outbox rule/permission only; DynamoDB, audit, KMS, backup, staging and secret
  resources were not replaced
- CloudFormation reached `UPDATE_COMPLETE`; Lambda is `Active` with successful update,
  `/v6/health` reports schema `rosewood-v6-2026-08-08-form-v7` and both current
  `2026.7` contracts
- the Lambda error alarm is `OK`, the EventBridge outbox rule remains enabled at one
  minute and the same-region daily/monthly backup plan remains present
- release commit `ffd8120` was published to `main`; GitHub Pages run `31217458031`
  completed successfully
- all nine live family, staff and guardian-signing HTML/JavaScript/CSS assets matched
  the tested release files byte for byte after deployment
- public browser checks at 390 x 844 and 1440 x 1000 found no horizontal overflow;
  the live child selector, Student, Parent / Guardian, Conditions, Signature and staff
  gateway layouts remained readable without creating or changing an applicant record
- the public health endpoint returned `ok`, schema
  `rosewood-v6-2026-08-08-form-v7`, EOI `rosewood-eoi-2026.7` and Application
  `rosewood-application-2026.7` after the Pages release

## Sender Recognition Release

Verified and deployed in Sydney on 8 August 2026 without creating or changing a family
application.

- all 61 Node tests pass, including the SES request header and application invitation
  MIME regression checks; the frozen-lockfile deployment build also passes
- the application invitation HTML retains one `BEGIN APPLICATION` button and no
  duplicate visible fallback URL; its plain-text alternative retains the private URL
  exactly once
- the reviewed CloudFormation change set modified Lambda code/environment in place and
  dynamically recalculated only the existing outbox rule and permission; no database,
  audit, KMS, backup, staging, Drive/Sheets or secret resource changed
- CloudFormation reached `UPDATE_COMPLETE`; Lambda is `Active` with successful update,
  `SENDER_NAME` is `Rosewood College Enrolment`, and `/v6/health` retains the V6.7
  schema and form contracts
- one synthetic staff-access canary reached the operations Inbox from
  `Rosewood College Enrolment <enrolment@ffe.org.au>`; the original message passed SPF,
  Rosewood DKIM and DMARC and retained the aligned `bounce.ffe.org.au` return path
- the Lambda error alarm is `OK`, the one-minute outbox schedule remains enabled and
  the existing daily/monthly backup plan remains present

## V6.8 Application Contract Release

Local verification completed on 8 August 2026 using synthetic review frames only. No
family record, OTP, upload, email, submission or signature was created or changed.

- 66 Node tests pass, including V6.8 validation, optional survey persistence, immutable
  V6.7 compatibility, frozen guardian review and append-only Conditions headers
- JavaScript/module syntax, `git diff --check`, frozen lockfile policy and deployment
  bundle asset gates pass
- desktop review at 1280 x 720 has no horizontal overflow; all three country inputs
  share the exact same top coordinate after the fixed label row is applied
- mobile review at 390 x 844 has a 390px document width with no horizontal overflow;
  child cards are approximately 321px and their action buttons approximately 290px
- direct child cards have no Source row or direct-invitation wording; only the EOI-linked
  card displays the Expression of Interest inclusion note
- Student has no previous-attendance question, Previous Education section or Student
  Residence section; interrupted schooling follows current school, while address
  sharing and the compact Home Care Arrangement select are in Student Primary Address
- address autocomplete is off; the official Health Victoria link is present and
  assistive technology is told that it opens a new tab
- all eleven survey answer keys render, are optional, have programmatic labels and fit
  a single 321px mobile column; no duplicate IDs or browser console warnings were found
- the reviewed CloudFormation change set modified Lambda code in place and recalculated
  only the existing outbox rule/permission; it did not replace or modify DynamoDB, KMS,
  backup, staging, Drive/Sheets configuration or alarm resources
- CloudFormation reached `UPDATE_COMPLETE`; Lambda is `Active` with a successful update,
  `/v6/health` reports schema `rosewood-v6-2026-08-08-form-v8`, EOI
  `rosewood-eoi-2026.8` and Application `rosewood-application-2026.8`
- the Lambda error alarm is `OK`, the outbox rule remains enabled at one minute and the
  same-region daily/monthly backup plan remains present
- release commit `1450c49` was published to `main`; GitHub Pages run `31241031240`
  completed successfully
- the public family HTML, JavaScript and CSS hashes match the tested release files;
  the live 390 x 844 review repeats the selector, Student and survey results above with
  no horizontal overflow or console warnings
- the public desktop package is byte-identical to the locally verified 1280 x 720
  package, including the exact country-input alignment and responsive survey CSS

## V6.9 Address Assistance Release

Local and production verification completed on 8 August 2026 using synthetic data.

- 70 Node tests pass, including restricted-key disclosure only after family OTP,
  manual fallback, existing-field mapping, autosave, V6.8 contract compatibility and
  the absence of geolocation/coordinates/Place-ID collection
- JavaScript/module syntax and `git diff --check` pass
- desktop review at 1440 x 1000 confirms the optional address helper sits above the
  existing structured student fields without misalignment
- mobile review at 390 x 844 confirms student and guardian address helpers, labels,
  fallback status and manual fields fit one column without horizontal scrolling
- browser accessibility snapshot exposes the helper label and live status; manual
  fields retain their required labels
- no browser console warnings or errors were found with Google intentionally
  unavailable in review mode
- the organisational Google Cloud project `notional-weft-504315-q9` has billing
  attached, Maps JavaScript API and Places API (New) enabled, an A$10 monthly budget
  alert, and a browser key restricted to those two APIs plus `ffe.org.au` and
  `www.ffe.org.au`
- the key is held in the existing AWS configuration secret and is returned only after
  invitation and email-OTP verification; the public gateway does not receive it
- a synthetic direct invitation and OTP reached `info@ffe.org.au`; the verified Student
  frame displayed the live Google helper, returned Australian suggestions and mapped
  `1 Collins St, Melbourne` to `1 Collins Street`, `Melbourne`, `VIC`, `3000`
- selecting the suggestion triggered the existing draft autosave and returned the
  family status indicator to `Saved`; no application was submitted
- the reviewed CloudFormation change set modified Lambda code in place and recalculated
  only the existing outbox rule/permission; it did not modify or replace DynamoDB,
  audit, KMS, backups, staging, Drive/Sheets configuration, alarms or secrets
- CloudFormation reached `UPDATE_COMPLETE`; Lambda is `Active` with a successful update
  and `/v6/health` reports schema `rosewood-v6-2026-08-08-form-v8`, EOI
  `rosewood-eoi-2026.9` and Application `rosewood-application-2026.9`
- the Lambda error alarm is `OK`, the one-minute outbox rule is enabled, DynamoDB PITR
  is enabled and the locked daily/monthly vault contains completed recovery points
- release commit `ab22d93` was published to `main`; GitHub Pages run `31254556878`
  completed successfully and the public family HTML, JavaScript and CSS hashes match
  the tested release files byte for byte

## V6.10 EOI Address Assistance Release

Local and production verification completed on 9 August 2026 without submitting or
changing an Expression of Interest or family application.

- all 70 Node tests pass, including the public EOI configuration route, manual fallback,
  existing-field mapping, `VIC` to `Victoria` conversion, V6.9 compatibility and the
  absence of coordinates, Place IDs, geolocation or address-search history from the
  EOI data contract
- JavaScript/module syntax, `git diff --check`, the frozen lockfile build and deployment
  asset-hash gates pass
- the EOI renders an optional, accessible `Find the primary contact address` helper
  above the existing required address, suburb, state, postcode and country fields;
  those structured fields remain the submitted source of truth
- the EOI loads the browser-restricted Google key at runtime from `GET /v6/eoi/config`;
  the response is limited to an allowed Rosewood origin and carries `no-store` cache
  controls, while the static HTML and JavaScript contain no API key
- Google address assistance remains optional: if configuration or Google is unavailable,
  the existing manual EOI fields continue to work and submission remains available
- the production EOI page loaded one Google Places component at desktop widths of 1280
  and 1512 pixels with no horizontal overflow; its accessible label and live status
  were present and the browser console contained no warnings or errors
- automated browser control could not select a live suggestion through Google's closed
  shadow input; field mapping and state conversion were therefore verified through the
  automated contract tests, and no synthetic or real EOI was submitted during the live
  check
- the reviewed CloudFormation change set modified Lambda code in place and recalculated
  only the existing outbox rule and permission; it did not modify or replace DynamoDB,
  audit, KMS, backups, staging, Drive/Sheets configuration, alarms or secrets
- CloudFormation reached `UPDATE_COMPLETE`; Lambda is `Active` with a successful update,
  and `/v6/health` reports schema `rosewood-v6-2026-08-08-form-v8`, EOI
  `rosewood-eoi-2026.10` and Application `rosewood-application-2026.10`
- the Lambda error alarm is `OK` and the one-minute outbox rule remains enabled
- release commit `469a7ff` was published to `main`; GitHub Pages run `31280847317`
  completed successfully and the public family HTML, JavaScript and CSS hashes match
  the tested release files byte for byte

## Automated Production Canary

Implemented and deployed in Sydney on 9 August 2026 without creating or changing an
EOI, invitation, OTP, family session, application, upload, signature or workflow email.

- all 74 Node tests pass, including healthy and failed public-asset checks, backend
  version validation, EOI address-configuration failure, independent zero/one metric
  publication, HTTPS-only targets, schedule/IAM restrictions and alarm configuration
- JavaScript syntax, `git diff --check`, CloudFormation validation and the reproducible
  frozen-lockfile deployment build pass
- EventBridge schedule
  `rosewood-enrolment-v6-produc-RosewoodCanarySchedule-KIpARd5xewjV` is enabled at
  `rate(30 minutes)` with the dedicated non-writing canary event and Lambda target
- the reviewed CloudFormation change set added only the schedule, invocation permission,
  three alarms and secondary SNS subscription; it updated Lambda code/environment and
  its metric-publication IAM statement in place and did not modify or replace DynamoDB,
  audit, KMS, S3 staging, backups, Google configuration or Secrets Manager resources
- manual post-deployment invocation returned HTTP 200 with no function error; public
  assets, backend health/form versions and EOI address configuration all returned
  availability `1` and produced a safe aggregate `production_canary` log entry
- the public-assets check covers the family/EOI, guardian-signing and staff HTML and
  JavaScript release markers; the backend check requires `ok` and the bundled immutable
  V6.10 contracts; the address check requires production CORS, `no-store`, Australian
  Google Places configuration and a present browser key without logging its value
- all three canary alarms and the existing Lambda error alarm are `OK`; canary alarms
  require two consecutive failed or missing 30-minute observations and notify again on
  recovery, avoiding an email on every continuing failed run
- the newly created alarms initially evaluated empty pre-deployment periods as missing;
  the verified healthy canary datapoint was used to initialise them to `OK`, which may
  have produced one setup alarm and one recovery notification
- both `info@ffe.org.au` and `frjativa@gmail.com` are confirmed subscriptions on the
  existing encrypted Rosewood security and backup SNS topic
- one clearly labelled setup-test publication produced two successful SNS deliveries,
  matching the two confirmed recipients; routine successful canary runs remain silent
- production Lambda deployment commit `b6aa4c5` is the tested monitoring release

## Private Slack Completion Notifications

Local verification completed on 9 August 2026 without sending a Slack test message or
submitting a production application.

- the internal Slack app **Rosewood Enrolment Notifications** is installed in the
  FamiliesForEducation workspace and its incoming webhook is assigned to the private
  `#enrolments-committee` channel
- the generated webhook is stored as `SLACK_WEBHOOK_URL` in the existing Sydney AWS
  configuration secret; its value is absent from Git, CloudFormation and ordinary logs
- all 79 Node tests pass, including one-guardian completion, completion after a corrected
  additional-guardian signing request, suppression while signatures are pending or
  staff review is required, minimal message content, disabled configuration, delivery
  failure and durable-outbox infrastructure checks
- JavaScript syntax, `git diff --check`, the frozen-lockfile build and immutable frontend
  asset gates pass
- Slack receives only the Application reference, Melbourne completion time and generic
  staff-portal link; the synthetic tests verify that names, email, medical information,
  guardian data and internal application IDs are excluded
- no setup/test message was posted, preserving the first channel notification for a
  genuine completed Application
- reviewed change set `rosewood-slack-completion-20260809-633d36a` modified Lambda
  code/environment and recalculated only the existing outbox/canary targets and
  invocation permissions; it did not replace or modify DynamoDB, audit, KMS, backups,
  document staging, Google storage, Secrets Manager resources or alarms
- CloudFormation reached `UPDATE_COMPLETE`; Lambda is `Active` with a successful
  update and the one-minute outbox rule remains enabled with its expanded email, Slack
  and Sheet retry description
- `/v6/health` retained schema `rosewood-v6-2026-08-08-form-v8`, EOI
  `rosewood-eoi-2026.10` and Application `rosewood-application-2026.10`
- a manual non-writing production-canary invocation returned HTTP 200 with no function
  error and all three availability checks passed; the Lambda error and all three canary
  alarms remain `OK`
- Slack automatically recorded its standard **added an integration to this channel**
  system event. No completion-style or synthetic notification was posted, so the first
  enrolment notification remains reserved for a genuine completed Application
- deployment source commit `633d36a` is the tested Slack completion release

## Routed Slack Signature Status Notifications

Implementation verification completed on 9 August 2026 without sending a Slack test
message or submitting, reopening or changing a production family Application.

- the existing internal Slack app has a second incoming webhook assigned to
  `#enrolments`; the original private `#enrolments-committee` route remains separate
- the restricted Sydney configuration secret holds `SLACK_PENDING_WEBHOOK_URL` for
  `#enrolments-committee` and `SLACK_COMPLETION_WEBHOOK_URL` for `#enrolments`; both
  values remain absent from Git, CloudFormation, ordinary logs and API responses
- all 83 Node tests pass, including initial pending status, an intermediate signer with
  another signer outstanding, one-guardian completion, multi-guardian completion after
  email correction, staff-review suppression and independent webhook routing
- synthetic message tests require student and parent/guardian signer names while
  rejecting email addresses, medical fields, answer keys and internal identifiers
- pending status is queued transactionally when permitted signatures remain; completion
  is queued transactionally only at authoritative `submitted`; `staff_review_required`
  remains silent
- no synthetic webhook request was made, preserving each channel's first enrolment
  notification for a genuine Application event; Slack may show its standard integration
  installation system event independently
- reviewed change set `rosewood-slack-routing-20260809-f8a1916` updated Lambda code in
  place and recalculated only the existing outbox/canary targets and invocation
  permissions; it did not modify or replace DynamoDB, audit, KMS, backups, document
  staging, Google configuration, Secrets Manager resources or alarms
- CloudFormation reached `UPDATE_COMPLETE`; Lambda is `Active` with a successful update,
  `/v6/health` retains schema `rosewood-v6-2026-08-08-form-v8`, EOI
  `rosewood-eoi-2026.10` and Application `rosewood-application-2026.10`, and DynamoDB
  point-in-time recovery remains enabled
- the one-minute outbox and 30-minute canary rules are enabled; the Lambda error alarm
  and all three canary alarms are `OK`
- a manual non-writing canary invocation returned HTTP 200 with no function error and
  all three availability checks passed; the production outbox had no pending Slack event
  before or after the release
- deployment source commit `f8a1916` is the tested split-routing release

## V6.11 Production Hardening Release

Implementation and production verification completed on 13 August 2026 without
creating or changing an EOI, invitation, OTP, family session, application, upload,
signature or workflow email.

- Pull request `#2` passed both repository checks and merged to `main` as commit
  `3ad28239ac489b28995195e8658000947aa53587`; the release branch and merged commit
  have the same Git tree.
- all 94 backend tests pass, including EOI idempotency and throttling, compensating
  Drive cleanup, eight-attempt outbox exhaustion, SES feedback deduplication and
  correlation, V6.10 compatibility, V6.11 immutable definitions and active-catalogue
  corrections
- the repository gate validates 71 tracked HTML/CSS files and found no broken local
  reference; the public-data gate scanned 359 tracked files and found no attendee
  export or high-confidence AWS, private-key, Slack-webhook or GitHub-token pattern
- the locked production build, immutable asset gate, JavaScript syntax checks,
  `git diff --check` and CloudFormation template validation pass
- reviewed no-execute change set `rosewood-v11-hardening-20260813-1456` modified the
  Lambda in place, refreshed only the existing outbox/canary invocation permissions
  and targets, and added the SES feedback route, its dedicated KMS key and SNS topic,
  plus the permanent-outbox-failure metric and alarm
- the reviewed change set did not modify or replace the authoritative DynamoDB or
  audit tables, records KMS key, backup vault/plan, document staging bucket,
  Secrets Manager secret or Google Drive/Sheets parameters
- CloudFormation reached `UPDATE_COMPLETE`; the production Lambda is `Active` with
  `LastUpdateStatus=Successful`, runtime `nodejs22.x`, and the managed SES
  configuration set `rosewood-enrolment-v6-production-transactional`
- `/v6/health` returned `ok`, EOI `rosewood-eoi-2026.11` and Application
  `rosewood-application-2026.11`
- the SES event destination is enabled for send, delivery, delivery delay, bounce,
  complaint, reject and rendering failure; its encrypted SNS topic has a confirmed
  Lambda subscription and its customer-managed single-region KMS key is enabled
- the one-minute outbox and 30-minute read-only canary EventBridge rules are enabled;
  the Lambda error alarm, all three canary alarms and the new permanent-outbox-failure
  alarm are `OK`
- a manual read-only production canary invocation returned HTTP 200 with no function
  error; public forms, backend V6.11 health and EOI address configuration all reported
  `available=true`
- point-in-time recovery is enabled on both authoritative DynamoDB tables; the locked
  Sydney backup vault remains encrypted by the retained records key, applies 35-day
  minimum and 366-day maximum retention, and reported 18 recovery points
- both encrypted security-topic email subscriptions remain confirmed
- GitHub Pages served the merged family HTML and JavaScript byte for byte: HTML
  SHA-256 `e30fed23f1291ce61a151627c27f17110fdfb076d18140f015c4d873280bde05` and
  JavaScript SHA-256 `5cba48f5b6479c91302b6b74f60b57cdbbad86147bf00ed3f31f040e7c8e8b27`
- desktop review mode rendered the intended Rosewood two-column application gateway;
  at `390 x 844`, all nine Application review frames remained within the 390-pixel
  viewport with no horizontal overflow, and the browser console reported no errors

GuardDuty and cross-region replication remain intentionally out of scope. Legal
retention/deletion periods, named staff identities, privacy/legal approvals and the
malware-scanning posture remain governance decisions rather than technical release
claims. The removed attendee export is no longer served from the live repository but
remains in historical Git commits; rewriting public history requires separate explicit
approval.
## V6.12 Immunisation Guidance Verification

Verified locally on 14 August 2026 using synthetic data only.

- the Medical Details guidance includes "regardless of the child's vaccination
  status" and directs families to obtain the statement through myGov
- "Victorian law" retains the official Health Victoria URL, visible underline,
  external-link marker, screen-reader new-tab label and keyboard focus ring
- V6.12 preserves the complete V6.11 EOI and Application data contracts; V6.11 and
  earlier definitions remain addressable
- the family HTML, JavaScript and CSS SHA-256 values match the pinned V6.12 definition
- all 94 backend tests pass, including frontend wording/style, immutable definition,
  canary and compatibility checks
- 73 tracked HTML/CSS files pass the static-reference gate and 365 tracked files pass
  the private-data/secret gate
- JavaScript syntax, `git diff --check` and the locked deployment build pass
- local desktop and 390 px mobile browser checks confirm readable wrapping, no
  horizontal overflow, visible external-link treatment and a clear keyboard focus ring
- production publishing and deployment are recorded separately after they occur

## V6.13 Document Upload Recovery Verification

Verified locally on 14 August 2026 using synthetic file metadata and the frontend
review workflow only. No production application, invitation, session, upload, email,
signature or family record was created or changed.

- selecting one or more replacement files clears completed failed attempts only in
  the same document category before the new attempt starts
- cancelling the file picker preserves the existing warning and Retry action; active
  uploads, completed uploads and failures in other document categories remain intact
- automated coverage passes for unsupported type followed by a valid file, retrying
  the same filename, multiple failed selections followed by replacements, empty files,
  files larger than 10 MB, accepted PDF/PNG/JPEG files and the exact 10 MB boundary
- a document-upload service summary is cleared only when a replacement is selected;
  unrelated server errors retain their own code and presentation
- V6.13 preserves the complete V6.12 EOI and Application contracts and answer keys;
  V6.12 and earlier immutable definitions remain addressable
- all 99 backend and source-contract tests pass, including the exact frontend helper
  extraction, immutable definitions, compatibility, submission and upload lifecycle
- 74 tracked HTML/CSS files pass the static-reference gate and 368 tracked files pass
  the private-data and high-confidence secret gate
- JavaScript syntax, `git diff --check`, pinned V6.13 asset hashes and the locked
  production deployment bundle pass
- desktop review mode renders five document upload cards at 1280 px without overflow;
  at `390 x 844`, all five cards remain inside the viewport and the browser console
  reports no errors
- AWS CloudFormation template validation passes; production publication and deployment
  are recorded in the V6.13 evidence below
## SES Configuration-Set Permission Hotfix

Diagnosed and repaired in production on 13 August 2026 after a staff access-code request
returned the generic service error.

- CloudWatch identified an AWS authorization failure on
  `POST /v6/staff/access/request-code`: the Lambda role could send through the verified
  sender identity but did not yet include the newly managed SES configuration-set ARN
  in the `ses:SendEmail` resource list
- the runtime policy now grants `ses:SendEmail` only to the verified `ffe.org.au`
  identity, exact `enrolment@ffe.org.au` identity and
  `rosewood-enrolment-v6-production-transactional` configuration set, while retaining
  the exact From-address condition
- the infrastructure regression test requires the configuration-set resource in the
  Lambda role; all 94 backend tests, both repository safety gates, `git diff --check`,
  the frozen-lockfile deployment build and CloudFormation validation pass
- reviewed change set `rosewood-ses-login-permission-hotfix-20260813-1719` had one
  static modification: the inline policy on `RosewoodRole`; it made no Lambda code,
  database, storage, secret, backup, Google integration or form-contract change
- CloudFormation reached `UPDATE_COMPLETE`; the Lambda remained `Active` with a
  successful last update and `/v6/health` continued to return HTTP 200
- stack-level termination protection is enabled in addition to both authoritative
  tables' deletion protection
- one authorised production staff access-code request returned HTTP 200, created a
  valid challenge with the documented expiry and produced no Lambda error
- the resulting message reached the `info@ffe.org.au` Inbox; Gmail authentication
  results reported SPF, DKIM and DMARC pass. The verification code and private message
  identifiers are not recorded in this evidence
- a post-hotfix read-only production canary returned HTTP 200 with no function error;
  public forms, backend V6.11 health and EOI address configuration all remained
  available, and all five production alarms remained `OK`

## Ten-Minute Production Monitoring Hardening

Implemented and verified locally on 13 August 2026 without creating an EOI,
invitation, OTP, session, application, upload, signature, workflow email or Slack
notification.

- the non-writing canary cadence advances from 30 minutes to 10 minutes; availability
  alarms still require two consecutive failures or missing observations before paging
  and send a recovery notification after service returns
- `ApplicationWorkflowAvailability` verifies that Application context/status and staff
  dashboard routes remain reachable while rejecting unauthenticated access with
  `SESSION_REQUIRED`
- `OperationalPipelineAvailability` detects email, Sheets or Slack work pending for
  more than 15 minutes through a projection-limited DynamoDB query that reads only
  creation timestamps and attempt counters, never queued payloads
- separate alarms detect Lambda throttling and idempotently recorded SES bounce,
  complaint, rejection or rendering failure; the existing Lambda error and permanent
  outbox-failure alarms remain unchanged
- all alarm actions use the existing encrypted security topic with confirmed
  `info@ffe.org.au` and `frjativa@gmail.com` subscriptions; healthy checks remain silent
- all 96 backend tests pass, including healthy/failing protected-route checks, stale
  pipeline detection, metric independence and payload non-disclosure
- 73 tracked HTML/CSS files pass the static-reference gate, 364 tracked files pass the
  private-data/secret gate, JavaScript syntax and `git diff --check` pass, the locked
  production deployment build succeeds and CloudFormation validates
- reviewed no-execute change set
  `rosewood-monitoring-hardening-20260813-a1d6951` added only the two availability
  alarms, Lambda-throttle alarm, SES-delivery-failure alarm and log metric; it updated
  the canary cadence/periods and Lambda code in place and recalculated existing event
  targets/permissions without modifying or replacing DynamoDB, audit, KMS, backups,
  document staging, Google configuration, Secrets Manager or form contracts
- CloudFormation reached `UPDATE_COMPLETE`, stack termination protection remains
  enabled, Lambda is `Active` with a successful update, the one-minute outbox rule is
  enabled and the canary rule is enabled at `rate(10 minutes)`
- a manual non-writing production canary returned HTTP 200 with no function error; all
  five checks reported `available=true`, including the protected workflow and projected
  delivery-pipeline checks
- the first automatic 10-minute EventBridge run published fresh healthy datapoints for
  all five metrics at 00:32 Melbourne time; all nine alarms remained `OK` and Lambda
  reported zero errors throughout the deployment verification window
- `/v6/health` returned HTTP 200 with EOI `rosewood-eoi-2026.11` and Application
  `rosewood-application-2026.11`; all nine production alarms are `OK`
- both encrypted security-topic subscriptions remain confirmed for `info@ffe.org.au`
  and `frjativa@gmail.com`; no setup/test alert, OTP, workflow email or Slack message
  was sent deliberately
- deployment source commit `a1d6951` is the tested monitoring release

## V6.13 Production Release And Source Reconciliation

Published and deployed in Sydney on 15 August 2026 without creating or changing an
EOI, invitation, OTP, family session, application, upload, signature, workflow email
or Slack notification.

- pull request `#4` passed both repository checks and merged V6.13 to `main` as commit
  `dab96858b29d3d100db0b2925f24d4a8dcaa6cfa`; GitHub Pages then served the reviewed
  HTML and JavaScript byte for byte
- live HTML SHA-256 is `7a0b03851fd371997c459b2552a4b7201f4f11891b18d3862f996fd79396d25c`
  and live JavaScript SHA-256 is
  `8224a86b88e2808bddb6c836a434e41e770288394145f9a719e1e57cc0f1ea07`
- the first no-execute change set exposed that the SES permission and expanded
  monitoring deployed on 13 August were absent from `main`; it proposed removing four
  alarms and one metric filter, so it was deleted and was never executed
- pull request `#5` passed both checks and merged the exact production-hardening commits
  into `main` as `e3bc884bc79122e503d1e730e840517948cd5e7d`; its tree preserves V6.13
  contracts and assets while restoring the already-running monitored-production source
- all 101 reconciled backend tests pass, including upload recovery, V6.11/V6.12
  compatibility, protected-route fail-closed checks and stale-delivery-pipeline checks;
  the locked deployment bundle, static-reference gate, public-data gate, JavaScript
  syntax, `git diff --check` and CloudFormation validation pass
- reviewed change set `rosewood-v13-reconciled-20260814-e3bc884` modified Lambda code in
  place and recalculated only existing canary/outbox permissions, schedule targets and
  the SES-events Lambda subscription; it had no removals and did not modify or replace
  DynamoDB, audit, KMS, document staging, backups, secrets, Google configuration,
  alarms, API URL or family-session resources
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled,
  Lambda is `Active` with a successful update, and `/v6/health` reports EOI
  `rosewood-eoi-2026.13` and Application `rosewood-application-2026.13`
- the one-minute outbox and ten-minute canary schedules are enabled; the read-only
  canary returned HTTP 200 with all five checks available and all nine alarms remain
  `OK`
- point-in-time recovery remains enabled on the authoritative records and audit tables
- the deployment observation window recorded 36 Lambda invocations, zero Lambda errors
  and zero throttles; existing V6.11/V6.12 sessions remain accepted and no family data
  was read during release verification

## V6.14 Family Feedback Verification

- Direct-invitation email contains the approved single opening sentence and no longer
  contains the removed family/hopes sentence; linked-EOI wording remains separate.
- Backend family/application/status sessions return and enforce a 5,400-second sliding
  idle timeout. The eight-hour absolute limit is unchanged.
- The browser mirrors 90 minutes, warns five minutes before expiry, blocks dismissal,
  and renews only through an authenticated family, application or status request.
- Application OTP responses remain `expiresInSeconds: 600` and
  `resendAfterSeconds: 30`. The interface presents a distinct live 10-minute validity
  countdown and explains that the resend delay does not shorten it.
- V6.14 renders Foundation (Prep), removes Year 6 from new entry choices and removes
  Our Lady of Rosary/St Mary's from new school choices while preserving an already
  saved legacy selection in its own draft.
- The other-child count is a required 1-99 numeric value after Yes. Reports Attached is
  Yes/N/A. Medicare Expiry is required and accepts only `YYYY-MM`.
- Other Languages is free text; Main Language continues using the pinned catalogue.
- Editable upgrade coverage proves `No` to `N/A`, full-date to month and `7+` to `7`
  normalization while preserving unrelated and retired answers.
- Submitted records continue to resolve through their pinned immutable definition and
  are not upgraded.
- All 103 backend tests pass and the locked deployment bundle builds successfully.
- Desktop semantic review confirms every approved label/option and conditional field.
  A 390 x 844 mobile browser check reports no horizontal overflow; entry and school
  controls fit the viewport, Medicare is a native month input and Other Languages has
  no catalogue binding.

## V6.14 Production Release

Published and deployed in Sydney on 15 August 2026 without creating or changing an
EOI, invitation, OTP, family session, application, upload, signature, workflow email
or Slack notification.

- pull request `#7` passed the enrolment-backend and static-site repository checks and
  merged V6.14 to `main` as commit
  `4f3871bb8770509e5cbec0a5605cd6d09dbd2546`
- GitHub Pages completed successfully and serves the reviewed assets byte for byte:
  HTML `11a50c0c1a42214997b0b844c90e9c87bd2a3c6e1ca922f983622ba2eedb84a7`,
  JavaScript `b40860aaa9c96a70879c684fcaed18889082d573a7fb0a62eaab5eb5f6f4ea22`
  and CSS `ad64b038c8d9803bf48ba93e7e37896f78c72c4828efaeab95309a29a3d3643d`
- reviewed no-execute change set
  `rosewood-v14-family-feedback-20260815-4f3871b` modified Lambda code in place and
  recalculated only existing canary/outbox targets and permissions and the SES-events
  Lambda subscription; it contained no additions, removals or changes to DynamoDB,
  audit, KMS, document staging, backups, secrets, Google configuration, alarms or the
  public API URL
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled,
  Lambda is `Active` with a successful update, and `/v6/health` reports EOI
  `rosewood-eoi-2026.14` and Application `rosewood-application-2026.14`
- the one-minute outbox and ten-minute canary schedules are enabled; a manual
  non-writing production canary returned HTTP 200 with all five checks available and
  all nine production alarms remain `OK`
- both security-topic email subscriptions remain confirmed; the SES configuration set
  remains enabled for send, delivery, delivery delay, bounce, complaint, reject and
  rendering-failure events, with its encrypted SNS topic and Lambda subscription intact
- no OTP or workflow email was sent because this release did not change SES/IAM
  permissions and verification used only read-only health and canary paths

## V6.15 Family Question Clarity Verification

- The Student Family section displays the approved other-children question, the note
  not to include the child named in the application and the conditional **How many
  other children may apply?** numeric field.
- Exact server-validation guidance covers an unanswered Yes/No response, a missing
  count and a count outside the whole-number 1-to-99 range. It does not expose the
  internal `future_siblings` or `future_sibling_count` names.
- The validation action carries the exact field identifier, updates conditional
  visibility, scrolls to the requested control, applies the inline invalid state and
  moves keyboard focus to that control.
- Browser interaction verified that Yes reveals the required count and No hides it.
  At 390 x 844, the 321-pixel question area wraps cleanly inside the 355-pixel Family
  card and the 390-pixel document has no horizontal overflow.
- V6.15 guardian review uses the clearer labels while a synthetic V6.14 submitted
  review retains its pinned historical wording.
- V6.15 changes no stored key, answer meaning, required/conditional rule, numeric range,
  Sheet projection, submission rule or signature state. Editable older drafts retain
  every answer; submitted records and signature evidence do not upgrade.
- All 106 backend tests pass. JavaScript syntax, `git diff --check`, the locked
  deployment build, 80-file static-reference gate and 381-file public-data gate pass.

## V6.15 Production Release

Published and deployed in Sydney on 16 August 2026 without creating or changing an
EOI, invitation, OTP, family session, application, upload, signature, workflow email
or Slack notification.

- pull request `#10` passed both repository checks and merged V6.15 to `main` as commit
  `d76b7ea64240acf32152755331b43190fb0d9981`
- GitHub Pages completed successfully and serves the reviewed assets byte for byte:
  HTML `87b622dec1164b5a49ee1c9cdbfafb8e492a2f1b09fb3d7dc8698ba1dd794541`,
  JavaScript `ddcd2f7132c18e61db98b54ad734d2bda9f062f08f0837a083023a543648c951`
  and CSS `ad64b038c8d9803bf48ba93e7e37896f78c72c4828efaeab95309a29a3d3643d`
- reviewed no-execute change set
  `rosewood-v15-family-clarity-20260816-d76b7ea` modified Lambda code in place and
  recalculated only existing canary/outbox schedules and permissions and the SES-events
  Lambda subscription; it contained no additions, removals or changes to DynamoDB,
  audit, KMS, document staging, backups, secrets, Google configuration, alarms or the
  public API URL
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled,
  Lambda is `Active` with a successful update, and `/v6/health` reports EOI
  `rosewood-eoi-2026.15` and Application `rosewood-application-2026.15`
- the one-minute outbox and ten-minute canary schedules are enabled; a manual
  non-writing production canary returned HTTP 200 with all five checks available and
  all nine production alarms remain `OK`
- both security-topic email subscriptions remain confirmed for `info@ffe.org.au` and
  `frjativa@gmail.com`; the SES configuration set remains enabled for send, delivery,
  delivery delay, bounce, complaint, reject and rendering-failure events, with its
  encrypted SNS topic and Lambda subscription intact
- no OTP or workflow email was sent because this release changed no SES/IAM permission
  and verification used only read-only health and canary paths

## V6.16 Melbourne Signing Date Verification

- The additional parent/guardian signing page derives its read-only Date value through
  `Intl.DateTimeFormat` with the explicit `Australia/Melbourne` time zone.
- The regression gate rejects the previous UTC `toISOString().slice(0, 10)` expression,
  requires the Melbourne formatter and requires signing-script cache release `v=5`.
- A boundary check confirms that `2026-08-22T16:45:05.546Z` displays as
  `2026-08-23`, the correct Melbourne calendar day.
- Application `rosewood-application-2026.16` preserves the V6.15 data contract and
  pins the corrected signing assets. EOI remains `rosewood-eoi-2026.15`.
- All 106 backend tests pass. Both changed JavaScript files pass syntax checks, the
  frozen-lockfile deployment build passes its immutable-asset gate, all 81 tracked
  HTML/CSS references resolve, the 384-file public-data scan passes and
  `git diff --check` reports no whitespace errors.
- No synthetic or real EOI, invitation, OTP, application, upload, signature, email or
  Slack notification was created during local verification.

## V6.16 Production Release

Published and deployed in Sydney on 23 August 2026 without creating or changing an
EOI, invitation, OTP, family session, application, upload, signature, workflow email
or Slack notification.

- Pull request `#12` passed both repository checks and merged to `main` as commit
  `da1a2579201ce57ead3a7d1a38d72d7f9fcc1b91`.
- GitHub Pages deployment `32586589384` completed successfully. The live signing HTML
  hash is `bfd0d16607e625ca8cf569fe0868c92bfe32bb6089115eb3b2a65dd2b1034499`
  and signing JavaScript hash is
  `78cc1c0a7d82eb7206db0f300cfde211064cf4ff8ee368d751bec989690f3e2e`.
  The live script contains `Australia/Melbourne`, uses signing cache release `v=5`
  and does not contain the retired UTC date-slicing expression.
- Reviewed CloudFormation change set
  `rosewood-v16-melbourne-signing-date-20260823` modified only the existing
  `RosewoodFunction` code in place with `Replacement: False`. It made no DynamoDB,
  audit, KMS, S3, backup, IAM, secret, schedule, alarm, SES or API URL change.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled,
  Lambda is `Active` with a successful Node.js 22 update, and `/v6/health` reports EOI
  `rosewood-eoi-2026.15` and Application `rosewood-application-2026.16`.
- The one-minute outbox and ten-minute canary schedules remain enabled. A manual
  non-writing production canary returned HTTP 200 with all five checks available and
  all nine production alarms remain `OK`.
- Both security-topic email subscriptions remain confirmed. The SES configuration set
  remains enabled for send, delivery, delivery delay, bounce, complaint, reject and
  rendering-failure events, with its encrypted SNS topic and Lambda subscription
  intact.

## V6.17 Invitation Access Renewal Verification

- The staff dashboard now derives an explicit invitation-access state. An active,
  unexpired editable invitation offers **Resend**; an editable application with an
  expired, inactive or missing invitation index offers **Renew access**; submitted
  applications offer neither action.
- Synthetic missing-index and retained-expired-index tests confirm renewal keeps the
  same invitation and application IDs, every related child application, saved values,
  current revisions and status. It does not create or reopen an application.
- A retained expired token is removed when renewal commits. Access request/verification
  continues to reject expired tokens independently.
- Renewal refuses an active invitation and a non-editable application. The DynamoDB
  transaction is conditional on the selected application's invitation ID, editable
  status and revision, preventing a stale portal action from overwriting concurrent
  work.
- Duplicate confirmations with the same high-entropy operation ID return the committed
  renewal and do not queue another email. A different renewal attempt after access is
  active fails closed and directs staff to refresh.
- The confirmation explains that the existing application and revision history remain.
  Quiet 60-second dashboard refreshes no longer clear a visible operation error.
- The EOI `rosewood-eoi-2026.16` and Application
  `rosewood-application-2026.17` definitions preserve the preceding question, answer,
  validation, projection and submission contracts while pinning the updated family and
  staff release assets.
- All 112 backend and frontend tests pass, including existing invitation, OTP, family
  selector, revision/autosave, upload, contact-permission, guardian-signature,
  projection, SES, Slack and production-canary regressions. No real invitation, OTP,
  application, upload, signature, email or Slack message was created by these tests.

## V6.17 Production Release

Published and deployed in Sydney on 25 August 2026 without creating, renewing or
resending an invitation and without creating an OTP, application, upload, signature,
workflow email or Slack notification.

- Pull request `#14` passed both repository checks and merged to `main` as commit
  `c0da86e56a1d3ee13d9e72ef2f2bf2e64263a6e0`.
- GitHub Pages deployment `32850935305` completed successfully. The live family
  JavaScript hash is
  `193e720bdc4b38629cd34b11146ac0b3dc2f7ab14e2ff88c68a0d0f79206702b`
  and the live staff JavaScript hash is
  `47181aa885f710f6ef87549609ef8e395721c1c52b983b24bf41a3d8510980f7`;
  both match the release commit byte for byte.
- Reviewed change set `rosewood-v617-renew-access-20260825-c0da86e` modified the
  existing `RosewoodFunction` code in place with `Replacement: False`. CloudFormation
  recalculated only the existing canary/outbox schedule permissions and SES-events
  subscription references. It contained no DynamoDB, audit, KMS, S3 staging, backup,
  secret, IAM-role, alarm, API URL or data-resource change.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled and
  Lambda is `Active` with a successful Node.js 22 update. `/v6/health` reports EOI
  `rosewood-eoi-2026.16` and Application `rosewood-application-2026.17`.
- The one-minute outbox and ten-minute canary schedules remain enabled. A manual
  non-writing production canary returned HTTP 200 with all five checks available and
  all nine production alarms are `OK`.
- Both security-topic subscriptions remain confirmed for `info@ffe.org.au` and
  `frjativa@gmail.com`. The SES configuration set remains enabled for send, delivery,
  delivery delay, bounce, complaint, reject and rendering-failure events.
- An authenticated read-only portal verification confirmed that active editable
  invitations continue to offer **Resend**, expired/missing editable access offers
  **Renew access**, and submitted applications offer neither. The renewal confirmation
  states that the existing application, saved answers and revision history are
  preserved. The final confirmation was not selected, so no family email was sent.

## V6.17 Invitation Renewal IAM Incident And Recovery

On 25 August 2026, the first staff-confirmed **Renew access** request failed because
the Lambda runtime role allowed `dynamodb:TransactWriteItems` but not the distinct
`dynamodb:ConditionCheckItem` action used inside the renewal transaction.

- DynamoDB rejected the transaction atomically. The affected application remained
  `in_progress` at revision 2 with its pre-incident update timestamp; no invitation
  token, application value, child record, revision, audit event or outbox email was
  changed or created by the failed request.
- Pull request `#17` added `dynamodb:ConditionCheckItem` only to the existing
  `AuthoritativeRecords` statement and added an infrastructure regression test that
  requires both conditional-check and transactional-write permissions on the retained
  records table. Both repository checks passed and the change merged as commit
  `574a91e070f8f074f293926bc3369b0408ccfe86`.
- All 113 backend and frontend tests passed. The frozen-lockfile deployment build,
  static-reference gate, public-data gate and `git diff --check` also passed.
- Reviewed change set `rosewood-renew-iam-20260825-574a91e` modified the existing
  `RosewoodRole` policy and Lambda code package in place with `Replacement: False`.
  CloudFormation recalculated the existing canary/outbox permissions and SES-events
  subscription references. It contained no DynamoDB, audit, KMS, S3, backup, secret,
  API, alarm, form-contract or data-resource change.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled.
  Lambda is `Active` with a successful Node.js 22 update. IAM policy simulation reports
  both `dynamodb:ConditionCheckItem` and `dynamodb:TransactWriteItems` as allowed on the
  authoritative table.
- `/v6/health` continues to report EOI `rosewood-eoi-2026.16` and Application
  `rosewood-application-2026.17`. A manual non-writing canary returned HTTP 200 with all
  five checks available, both schedules remain enabled and all nine alarms are `OK`.
- The hotfix did not retry the family operation automatically. Staff must deliberately
  select **Renew access** again so that an email is never sent merely because an
  infrastructure recovery completed.

## V6.18 Public Application-Link Request Verification

Implemented locally on 26 August 2026. Production release evidence is recorded only
after the reviewed deployment completes.

- The promoted home-page card and standalone no-index page ask only for
  parent/guardian name and email. They do not ask for email confirmation, child details,
  year level, address or EOI answers.
- The dedicated `rosewood-application-link-request-2026.1` contract pins the three
  standalone assets and declares `explicit_staff_link_only` for EOI relationships.
- A first synthetic request creates one direct family invitation and one initial blank
  Application. An exact retry creates no record or email. A later request rotates the
  private token while preserving invitation and Application IDs.
- Tests also remove the expiring invitation index and confirm a repeat request rebuilds
  access from the durable email-bound request index and retained Application without a
  duplicate.
- An existing direct staff invitation is reused instead of creating another family
  Application. No test performs automatic EOI linking.
- Honeypot, minimum elapsed time, network limits, hashed-email limits, generic public
  success, request-level idempotency and no browser answer storage are covered.
- The staff portal receives a distinct Link requests list and retains invitation source
  information operationally; families do not see direct-invitation source labels.
- The EOI `rosewood-eoi-2026.17` and Application
  `rosewood-application-2026.18` definitions preserve every preceding question,
  required rule, answer key, projection and signature behavior while pinning the new
  public/staff assets.
- All 120 Node tests pass locally, including the new minimal-interface and duplicate-
  recovery cases plus existing EOI, OTP, draft, upload, submission, contact-permission,
  signing, SES, Sheets, Slack and canary regressions.
- No real family request, invitation, OTP, application, email or Slack notification was
  created by local automated verification.

## V6.18 Production Release

Published and deployed in Sydney on 26 August 2026 without submitting a valid public
request and without creating an invitation, OTP, application, upload, signature,
workflow email or Slack notification during release verification.

- Pull request `#20` passed the `static-site` and `enrolment-backend` checks and merged
  to `main` as `f0963e7dd497624bc21ff318484a84af1d19a7ca`.
- GitHub Pages deployment `32860546691` completed successfully. The live standalone
  request HTML, CSS and JavaScript hashes are respectively
  `e8354882b6c29b81cefb51fd86239bf7c24a0a99b18468971e396cb8fe26328b`,
  `f4968e5bd438d05dc492914734d57c2277aaab3054a60a758c1ba1d2105e76fc`
  and `a4498da269df7439f56614bac08530c1f576f5f0cd80c075fa0eeb9d0e0af55c`;
  all match the immutable request contract. The live family and staff JavaScript also
  match their pinned V18 hashes.
- The live standalone page exposes parent/guardian name and email and no child or
  year-level field. The home page contains the promoted request card and no former
  TinyURL EOI CTA.
- Reviewed change set `rosewood-v618-public-request-20260826-f0963e7` modified only the
  existing Lambda code in place with `Replacement: False`. CloudFormation recalculated
  the existing canary/outbox permissions and schedule targets and the SES-events
  subscription endpoint. It did not modify or replace DynamoDB, audit, KMS, S3,
  backups, secrets, IAM roles, alarms, the Function URL or any data resource.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled and
  the Node.js 22 Lambda is `Active` with `LastUpdateStatus: Successful`.
- `/v6/health` reports EOI `rosewood-eoi-2026.17`, Application
  `rosewood-application-2026.18` and request
  `rosewood-application-link-request-2026.1`.
- A deliberately incomplete production request reached the new endpoint and returned
  HTTP 422 `PARENT_NAME_REQUIRED` before rate limiting, persistence, outbox work or
  email. No valid production request was submitted as a deployment canary.
- The one-minute outbox and ten-minute canary schedules are enabled. A manual
  non-writing canary returned HTTP 200 with all five checks available, and all nine
  production alarms are `OK`.
- Security-topic subscriptions remain confirmed for `info@ffe.org.au` and
  `frjativa@gmail.com`. The SES configuration set remains enabled for send, delivery,
  delay, bounce, complaint, reject and rendering-failure events.

## Public Request Pause And Review Copy

Prepared on 26 August 2026 after the decision not to launch the minimal request form
yet.

- The home page is restored to the exact preceding **Register Your Child** TinyURL
  links and no longer loads or renders the minimal request interface.
- The production request HTML and JavaScript paths are removed. The proposal is kept
  at `pages/rosewood-application-link-request-review.html` with `noindex`,
  `connect-src 'none'` and a review notice stating that no information is saved and no
  email is sent.
- The review script performs local validation and a simulated confirmation only. It
  contains no `fetch` call, API URL, persistence or storage access.

- The request endpoint, immutable request contract, staff reporting and any existing
  records remain unchanged and dormant. Existing EOI, invitation, draft, upload,
  signature and staff workflows are not reopened or migrated.
- The production canary now treats the restored home-page registration path and the
  renamed network-disabled review page as the expected public assets while retaining
  all backend, EOI address, protected-route and outbox checks.
- All 121 Node tests pass, including the review-page no-network assertions and the
  existing request-backend, EOI, application, upload, signature, SES, Sheets, Slack and
  canary regression coverage.

### Production pause release

- Pull request `#22` passed both repository checks and merged to `main` as
  `4f09aa1844f4b5e6be5c8679889586b10420c68f`.
- GitHub Pages deployment `32864871770` completed successfully. The live home page
  contains the restored **Register Your Child** links and no request-card markup or
  script. The former standalone production URL returns HTTP 404.
- The review page is live only at
  `pages/rosewood-application-link-request-review.html`; its delivered HTML declares
  `connect-src 'none'`, and its JavaScript contains no request endpoint or network call.
- The exact former homepage composition is available separately at
  `homepage-application-request-review.html`. It is no-index, carries a
  prominent design-review notice and loads only the network-disabled simulation client.
- Reviewed change set `rosewood-public-request-pause-20260826-4f09aa1` modified the
  existing Lambda code in place with `Replacement: False` and recalculated only the
  existing canary/outbox schedule permissions and targets and SES subscription endpoint.
  It did not change or replace DynamoDB, audit, KMS, S3, backups, secrets, IAM roles,
  alarms, the Function URL or any data resource.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled,
  Lambda is active on Node.js 22 and its update status is successful. The one-minute
  outbox and ten-minute canary schedules remain enabled.
- A manual non-writing canary reported all five checks available. All nine production
  alarms are `OK`, and `/v6/health` retains EOI `rosewood-eoi-2026.17`, Application
  `rosewood-application-2026.18` and request
  `rosewood-application-link-request-2026.1`.

## Launch Shared-Network Capacity Limits

Prepared on 26 August 2026 for an anticipated launch audience of no more than 100
families.

- Public Application-link requests allow 100 requests per shared network per hour and
  500 per shared network per day.
- Application-access OTP requests allow 100 requests per shared network per 30 minutes.
- Regression assertions preserve the existing one-request-per-30-second cooldown,
  five-per-invitation and five-per-email OTP limits, plus the public request's
  three-per-email hourly and five-per-email daily limits.
- The adjustment changes no form contract, answers, invitation identifiers, sessions,
  homepage interface or active application state.
- All 122 Node tests pass, including exact assertions for the revised shared-network
  limits and the unchanged per-email, per-invitation and cooldown controls.

### Production release

- Pull request `#25` passed the `static-site` and `enrolment-backend` checks and merged
  to `main` as `415ccd1aa338df2beb3b90be0ae120303147036d`.
- Reviewed change set `rosewood-network-limits-20260826-415ccd1` modified the existing
  Lambda code in place with `Replacement: False`. CloudFormation recalculated only the
  existing canary/outbox schedule permissions and targets and the SES-events
  subscription endpoint. It did not modify or replace DynamoDB, audit, KMS, S3,
  backups, secrets, IAM roles, alarms, the Function URL or any data resource.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled and
  the Node.js 22 Lambda is `Active` with `LastUpdateStatus: Successful`.
- `/v6/health` retains EOI `rosewood-eoi-2026.17`, Application
  `rosewood-application-2026.18` and request
  `rosewood-application-link-request-2026.1`.
- The one-minute outbox and ten-minute canary schedules are enabled. A manual
  non-writing canary returned HTTP 200 with all five checks available, and all nine
  production alarms are `OK`.
- GitHub repository checks and Pages deployment for the merge completed successfully.
  No valid request, OTP or email was generated during release verification.

## Discover Rosewood Forms Verification

Released and verified on 26 August 2026.

- The current `index.html` registration path remains unchanged. Only
  `discover-rosewood.html` loads the production form client.
- The Discover enrolment card submits the existing two-field, duplicate-safe
  Application-link request contract. It does not infer or create an EOI link.
- The **Connect with Rosewood College** form submits name, normalized email, one
  approved reason and an optional message of up to 4,000 characters to the separate
  community-enquiry endpoint.
- Valid enquiries atomically store the versioned DynamoDB record, idempotency claim,
  restricted audit event and email outbox item. Notifications go only to
  `info@ffe.org.au`, with the validated enquirer address as Reply-To.
- Tests cover field validation, approved options, payload limits, HTML escaping,
  duplicate retries, bot traps, server-side network/email limits, atomic DynamoDB
  writes, loading/error/success states, no browser persistence and unchanged homepage
  registration links.
- The non-writing production canary checks the Discover HTML, form script and backend
  `rosewood-community-enquiry-2026.1` health contract without creating a record or
  sending an email.
- All 131 backend Node tests pass. The frozen-lockfile production bundle builds with
  the community-enquiry contract included, and both repository static/reference and
  public-data/secret checks pass.
- Local browser verification covers desktop and mobile layouts, both empty-submit
  validation paths, first-invalid-field focus, accessible summaries, control sizing,
  horizontal overflow and console warnings/errors. No valid public request or enquiry
  was transmitted during local visual verification.

### Production release

- Pull request `#28` passed the `static-site` and `enrolment-backend` checks and merged
  to `main` as `740b213b37cb1b055e7650c19a7309611ea41e01`. GitHub Pages then built and
  deployed that exact merge successfully. The live Discover HTML and form script have
  the expected workflow markers; the live home page retains its preceding
  `FamiliesEdEOI` registration links.
- Reviewed change set `rosewood-discover-workflows-20260826-740b213` updated the Lambda
  code/environment in place with `Replacement: False`. It recalculated only the
  existing canary/outbox schedule permissions and targets and the SES-events
  subscription endpoint. It did not modify or replace DynamoDB, audit, KMS, document
  staging, backups, secrets, IAM roles, alarms or the Function URL.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled and
  the Node.js 22 Lambda is `Active` with `LastUpdateStatus: Successful`. Health reports
  EOI `rosewood-eoi-2026.17`, Application `rosewood-application-2026.18`, Application
  request `rosewood-application-link-request-2026.1` and community enquiry
  `rosewood-community-enquiry-2026.1`.
- The one-minute outbox and ten-minute canary schedules are enabled. A manual
  non-writing canary returned all five checks available, all nine alarms are `OK`, and
  both security-topic email subscriptions remain confirmed.
- The deployed Lambda still enforces 100 Application-link requests per shared network
  per hour, the 500-per-day ceiling and 100 Application-access OTP requests per shared
  network per 30 minutes, together with the stricter per-email, per-invitation and
  cooldown controls.
- One clearly synthetic community enquiry (`ENQ-2026-2DKCMI0`) verified the production
  DynamoDB transaction, durable email outbox and SES feedback path. SES recorded both
  acceptance and delivery for the `new_enquiry_notification`; the test did not create
  an EOI or Application.

## Discover Rosewood Homepage Promotion

Prepared on 26 August 2026.

- The complete Discover Rosewood experience is now the indexed `index.html` home page.
  Its canonical, Open Graph and structured-data page URLs point to `https://ffe.org.au/`.
- The preceding home page is retained at the no-index
  `homepage-before-discover-rosewood.html` rollback URL.
- The former `/discover-rosewood.html` URL contains a no-index immediate route and a
  normal fallback link to `/`, preserving previously shared links without duplicating
  the indexed page.
- The Application-link request and community-enquiry contracts, API endpoints,
  throttles, idempotency and storage behaviour are unchanged.
- Automated interface and canary tests now treat `/` as the active Discover page and
  verify the former route separately.

### Production release

- Pull request `#30` passed the `static-site` and `enrolment-backend` checks and merged
  to `main` as `e4936e57dc1187d2064ca280643874ddb3e6a79f`.
- GitHub Pages deployment `32954905159` completed successfully from that exact merge.
  The delivered `index.html` SHA-256 is
  `42313882aaf44008eec5967d8886affc0880066f6265f081e3bf8ee3931e226c`, matching
  the committed source byte for byte.
- Reviewed change set `rosewood-homepage-e4936e5-20260826` updated the existing Lambda
  code in place and recalculated only the existing canary/outbox permissions and
  schedules plus the SES-events subscription endpoint. It did not modify or replace
  DynamoDB, audit, KMS, S3 staging, backups, secrets, IAM roles, alarms or the Function
  URL.
- CloudFormation reached `UPDATE_COMPLETE`; termination protection remains enabled and
  the Node.js 22 Lambda is `Active` with `LastUpdateStatus: Successful`.
- A manual non-writing canary returned HTTP 200 with all five checks available. No
  CloudWatch alarm was in `ALARM`, and the ten-minute canary and one-minute outbox
  schedules remain enabled.
- Live desktop at 1280 px and mobile at 390 px rendered without horizontal overflow or
  console warnings/errors. Both public forms are present, the mobile navigation is
  active, and `/discover-rosewood.html` routes to `/`.
- No valid Application-link request or community enquiry was submitted during release
  verification, so no invitation, OTP, Application, enquiry or workflow email was
  created.

## V6.19 Enrolment Planning Verification

Prepared locally on 27 August 2026 with synthetic records only.

- All 131 backend and interface tests pass.
- The deployment build passes its immutable asset-hash and frozen-lockfile checks.
- Static references, public-data scanning and `git diff --check` pass.
- Desktop rendering shows the complete student, entry year, entry level, signature,
  activity, status, reference, staff-review and Review controls without clipping.
- At 390 x 844, the planning view has no horizontal overflow; entry year, entry level,
  signature progress, last activity, status and Review remain visible.
- Synthetic filter checks returned two 2027 records, one Foundation (Prep) record and
  one record with entry year not provided.
- No production record, invitation, OTP, email, upload, signature or staff session was
  created or accessed during verification.

### Production release

- Pull request `#36` passed repository checks and merged to `main` as
  `b2a773aca562cbd9a27ca307c1d172b365edb2cf`. GitHub Pages deployment
  `33020920371` completed successfully from that exact merge.
- The live family client supports Application `rosewood-application-2026.19`; the live
  staff portal loads staff CSS `v=5` and JavaScript `v=9` and contains the
  **Enrolment planning** workspace.
- Reviewed change set `v619-staff-planning-b2a773a` modified the existing Lambda in
  place and recalculated only the existing canary/outbox permissions and schedules and
  the SES-events subscription. It did not modify or replace DynamoDB, the audit table,
  KMS keys, document staging, backups, secrets, IAM roles, alarms or the Function URL.
- CloudFormation reached `UPDATE_COMPLETE`; the Node.js 22 Lambda is `Active` with
  `LastUpdateStatus: Successful`. `/v6/health` reports EOI
  `rosewood-eoi-2026.18` and Application `rosewood-application-2026.19`.
- The one-minute outbox and ten-minute canary schedules are enabled. A manual
  non-writing canary returned HTTP 200 with all five checks available, and all nine
  production alarms are `OK`.
- Both security-topic email subscriptions remain confirmed. The enabled SES feedback
  destination still records send, delivery, delay, bounce, complaint, reject and
  rendering-failure events through the encrypted SNS-to-Lambda path.
- No production family record was opened and no invitation, OTP, email, upload,
  signature or workflow write was created during release verification.

## V6.20 Admissions Overview Verification

- Backend tests cover all five canonical application stages, entry-year/level cohort
  counts, attention ordering, inactivity/signature thresholds, invitation-access
  state, SES invitation-feedback correlation and privacy exclusions.
- The attention summary contains no recipient email, date of birth, network
  fingerprint, raw SES event/message identifier, health answer or document metadata.
- Frontend tests cover the Admissions overview navigation, filters, five stage cards,
  stage distribution, entry mix, attention queue, visible keyboard focus and mobile
  layout. The overview renderer is statically guarded from recipient email, mobile and
  date-of-birth fields.
- Synthetic Playwright data exercised failed email, inactive draft, pending signature,
  staff review, completed application and missing entry-detail scenarios at 1440 x
  1050 and 390 x 844. Both layouts had no horizontal overflow; mobile attention cards
  use a readable single-column order.
- A defensive planning-progress check treats a missing or non-numeric historical
  percentage as zero rather than breaking the staff dashboard.
- The complete backend suite passed 135 tests and the reproducible deployment build
  verified the immutable V6.20 asset hashes.
- No real invitation, OTP, application, email, file, signature or production record
  was created during pre-release verification.

### Production release

Production release and verification completed on 27 August 2026 without opening or
changing a production family record.

- Pull request `#37` passed the static-site and enrolment-backend checks and merged as
  commit `017457ebc5bfdfeea8fa4bf0ffe0e650e832ec8e`.
- GitHub Pages deployment run `33026859254` completed successfully. The five V6 family
  and staff assets matched the reviewed release byte-for-byte, and the live staff page
  exposed the Admissions overview and V6.20 client markers.
- The reproducible Lambda bundle was packaged to the existing private artifact bucket.
  Named CloudFormation change set `v620-admissions-overview-017457e` contained only the
  Lambda code update plus conditional schedule/permission/subscription recalculation;
  it proposed no retained data, audit, KMS, staging-bucket, backup, secret or IAM-role
  replacement. Execution updated only the Lambda function and the stack returned to
  `UPDATE_COMPLETE` with termination protection enabled.
- The Lambda is `Active` with `LastUpdateStatus: Successful`. `/v6/health` reports EOI
  `rosewood-eoi-2026.19` and Application `rosewood-application-2026.20`.
- The one-minute outbox and ten-minute production-canary schedules are enabled. A
  manual non-writing canary returned HTTP 200 with Public form, backend health, EOI
  address, Application workflow and operational pipeline all available; all nine
  production alarms are `OK`.
- Both security-topic email subscriptions remain confirmed. The enabled encrypted SES
  feedback path still records send, delivery, delay, bounce, complaint, reject and
  rendering-failure events through its confirmed Lambda subscription.
- No production invitation, OTP, email, application, upload, signature or workflow
  write was created for release verification.

## V6.21 Planning Contact Context Verification

Prepared locally on 27 August 2026 using synthetic records only.

- Backend tests verify the primary parent/guardian name is derived from saved
  application answers and falls back to invitation or public-request contact context
  before child details are entered.
- The authorised application row continues to reuse its existing invitation email; no
  contact field, answer key, entity, Sheet column or stored projection was added.
- Tests confirm `parentGuardianName` and recipient email remain absent from aggregate
  `planningSummary` and Admissions-overview attention items, together with the existing
  health, document, network and raw SES exclusions.
- Interface tests cover the parent/guardian-led empty-child state, contact-aware search,
  compact planning cards and reduced planning-panel side padding.
- Synthetic Playwright verification passed at 1440 x 1050 and 390 x 844. The planning
  list showed the long parent/guardian identity and email without horizontal overflow;
  mobile retained a full-width identity block and readable two-column details.
- All 136 backend and interface tests pass. JavaScript syntax, immutable asset hashes,
  the reproducible deployment build, `git diff --check`, all 89 tracked HTML/CSS local
  references and the 409-file public-data/secret scan pass.

### Production release

Released and verified in production on 27 August 2026 without opening a family record
or creating an invitation, OTP, email, application, upload, signature or workflow
write.

- Pull request `#39` passed both repository checks and merged as
  `05a0fa639dd44570c23ed69f915cc1c4e7b52a4e`. GitHub Pages run `33037444097`
  completed successfully, and the five changed browser assets served from
  `ffe.org.au` matched the committed SHA-256 hashes exactly.
- Reviewed CloudFormation change set `v621-planning-contact-05a0fa6` modified the
  existing Lambda code plus conditional EventBridge permission/target and SES
  subscription recalculation. It proposed no retained data, audit, KMS, staging
  bucket, backup, secret or IAM-role replacement.
- The stack returned to `UPDATE_COMPLETE` with termination protection enabled. Lambda
  `rosewood-enrolment-v6-production-service` is `Active` with
  `LastUpdateStatus: Successful`; `/v6/health` reports EOI
  `rosewood-eoi-2026.20` and Application `rosewood-application-2026.21`.
- The one-minute outbox and ten-minute production-canary schedules are enabled. A
  manual non-writing canary returned HTTP 200 with Public form, backend health, EOI
  address, Application workflow and operational pipeline all available; all nine
  production alarms are `OK`.
- Both security-topic email subscriptions remain confirmed. The enabled SES feedback
  destination retains send, delivery, delay, bounce, complaint, reject and
  rendering-failure events through its confirmed Lambda subscription.
