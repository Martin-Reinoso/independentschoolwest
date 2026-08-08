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
  saved-section context, 20-minute sliding inactivity, eight-hour absolute session
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
