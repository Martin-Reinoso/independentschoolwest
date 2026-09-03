# V6 Product and Backend Decisions

## 2026-09-03: truthful application-link request delivery status

- Keep the stored public-request status `invitation_queued` unchanged for historical
  and reporting compatibility. It records that invitation work was created, not that
  the email remains queued.
- In the authenticated **Application-link requests** list, show the family action as
  **Application link requested** or **Application link requested again** and show the
  new/retained Application relationship separately.
- Derive email status by exact request ID from privacy-limited pending/failed outbox
  state, completed email receipts and SES configuration-set feedback. Never infer
  delivery from the request status.
- Use **Email queued**, **Email sent**, **Email delivered**, **Email delayed**,
  **Email failed**, **Complaint received** and **Delivery status unavailable** as the
  staff labels. Delivered means the recipient mail server accepted the message; it may
  still be in junk and does not prove that a person read it.
- If temporary delivery evidence has expired, show unavailable rather than guessing.
  The projection does not add a resend action, alter an invitation or Application, or
  expose an SES message ID, subject, body or new contact detail.
- EOI `2026.26` and Application `2026.27` change no family questions, answer keys,
  validation, invitations, submissions or signatures. They pin only this staff
  projection and its monitoring marker.

## 2026-09-02: separate prospective-family cohort planning

- Rename the staff **Enrolment planning** workspace to **Cohort planning** and divide
  it into **Applications**, **Prospective families** and **Combined forecast**. The
  existing Applications list remains an authoritative read-only projection.
- Store a prospective family and each prospective child as separate DynamoDB entities.
  A planning record is not an EOI, invitation or Application and cannot submit answers,
  upload documents, sign or send an email.
- Require parent/guardian name, email, explicit contact permission, planning status,
  source and at least one child cohort. Child name is optional; intended entry year and
  entry level are required. Keep internal notes restricted to authorised staff.
- Use only `expected_to_apply`, `possible`, `future_intake`, `research_needed` and
  `not_proceeding` as planning statuses. They are planning judgements, not admissions
  decisions or automated communication triggers.
- Never infer an application link from matching names or email addresses. Linking one
  prospective child to one existing family Application requires a deliberate confirmed
  staff action, is unique and reversible, and never changes the Application.
- The combined forecast counts family Applications and unlinked active prospective
  children. Linked prospective children are excluded so each child is counted once;
  synthetic/test Applications and archived/not-proceeding prospects are excluded.
- Do not project prospective-family records to Google Sheets. DynamoDB and its existing
  point-in-time/locked-backup controls are authoritative; spreadsheet material is an
  import reference only and is not copied wholesale.
- Add `planning_editor` as a least-privilege code role for prospective-family writes.
  `admin` and `admissions` may also write; `viewer` is read-only. Adding the role to
  code does not grant it to any mailbox.
- EOI `2026.25` and Application `2026.26` preserve every family question, answer,
  validator, submission and signature rule. They pin only the updated staff interface
  and monitoring markers.

## 2026-09-01: separate review, communications and principal meetings

- **Application Review is for reading and internal review only.** It contains the frozen application projection, protected document previews, signature evidence, revision history and staff-only review status/checklist/note. It contains no family-email composer, correspondence history or meeting invitation action.
- **Family communications is a separate workspace.** Every message remains staff-written and reviewed; purpose selection never sends. Staff can save a draft, test to their own address and explicitly confirm a send. Backend contact permission remains authoritative.
- **Principal meetings is a separate booking workspace.** Staff define a schedule and a reviewed list of future times, then deliberately send a private invitation to a permitted application contact.
- **Family booking identity is the private invitation plus invited email OTP.** The same authenticated family may replace its confirmed slot with another available slot. The update keeps the same booking and application IDs and atomically reserves/releases slots.
- **No online deletion or cancellation is provided.** Another family cannot overwrite a booked slot, and duplicate active invitations for the same application/schedule/email are conditionally blocked.
- EOI `2026.24` and Application `2026.25` change no family questions or answer rules; they pin the separated operational interfaces and preserve every prior contract.

## 2026-09-01: stable staff review and protected document preview

- Keep application-section navigation inside the review dialog. It must not write a
  page URL hash or move the staff portal behind the modal.
- Keep the review dialog width and scrollbar stable while staff scroll. Avoid a blurred
  sticky compositing layer that can visibly jump while long application sections render.
- Allow authenticated staff roles to preview only a document recorded on the selected
  application. Revalidate the Drive parent folder, application/category properties,
  MIME type, size and file signature before any preview is created.
- Copy the verified bytes to the existing private KMS-encrypted Sydney staging bucket
  under a non-identifying key. Return separate inline and attachment URLs that expire
  after five minutes; the existing one-day lifecycle remains a cleanup backstop only.
- Audit preview creation by staff actor, application, category, MIME type and size. Do
  not log or return the Drive identifier, S3 key, permanent sharing URL or URL token.
- PDF, PNG and JPEG are the only preview types. Never create public or link-wide Drive
  access to support staff viewing.
- EOI `2026.23` and Application `2026.24` preserve the preceding question and data
  contracts. They pin only the shared family compatibility update, stable staff review
  interface and protected document-preview route.

## 2026-08-30: staff review, correspondence and meetings

- Keep the Application for Enrolment immutable after submission. Store staff review, email drafts/sends and meetings as linked case records.
- Show staff the complete human-readable application, not a second editable form and not raw storage keys.
- Do not create standardised automatic follow-up triggers. Email purpose is metadata only; every family email requires staff-authored content and an explicit reviewed-send action.
- Permit case correspondence only to the submitting applicant or a guardian whose explicit contact permission remains enabled. Enforce this again at send time.
- Use private application-linked meeting invitations with OTP rather than a shared public event code.
- Keep meeting schedules, slots, invitations and bookings separate from applications so calendar operations cannot change enrolment evidence.

This register records Rosewood decisions that must survive future frontend and backend
rebuilds. These decisions override earlier V6 assumptions where they conflict.

Decision date: 7 August 2026

## Document Upload Transport

- Selecting a file starts the upload immediately; families do not need to select Next
  to begin it.
- Each file shows preparation, percentage, securing, uploaded or inline retryable-error
  state. The sticky status reflects active or failed uploads as well as draft saving.
- Choosing one or more replacement files removes completed failed attempts only for
  that document category before the replacements begin. It must also clear the stale
  inline and global upload warning. Cancelling the picker changes nothing; already
  uploaded files, active transfers and failures in other categories remain intact.
- Next and Save and continue later may be selected during transfer and wait for active
  files before proceeding.
- Google Drive remains the authoritative restricted file store. Private Sydney S3 is
  used only as KMS-encrypted browser-upload staging; successful objects are deleted
  after verification/move and abandoned objects expire after one day.

## Public Application-Link Request

- The compact **Request application link** card is active on the indexed home page,
  `index.html`. The former `/discover-rosewood.html` URL routes visitors to the home
  page, and the preceding home page is retained as the no-index
  `homepage-before-discover-rosewood.html` rollback reference.
- The proposed interface is retained only as the unlinked, no-index
  `pages/rosewood-application-link-request-review.html` page. It is a simulation with
  `connect-src 'none'`, no `fetch` call, no persistence and no email delivery.
- An earlier application-link homepage composition is retained separately at
  `homepage-application-request-review.html`. It is also no-index and
  uses the simulation script, not the production request client.
- The Discover page submits to the implemented endpoint and immutable request contract.
  The separate review page remains non-writing.
- When activated, it collects only parent/guardian name and one email address. Email confirmation,
  child name, year level, address and EOI questions are intentionally excluded.
- When activated, a valid request automatically creates a direct family invitation and initial blank
  Application record. The family provides one or more children only after invitation
  and OTP verification.
- The preceding registration path is promoted while the minimal request is reviewed.
- No EOI is automatically linked, even when the email matches. EOI prefill remains an
  explicit staff decision through the EOI-linked invitation workflow.
- A repeat request uses the same invitation and Application identifiers, rotates the
  private token and sends a new 14-day link. It must not reopen a submitted child
  application or create a duplicate family application.
- Public responses are generic. Server-side idempotency, bot friction and network and
  hashed-email throttles run before records or email are created.
- The permanent launch-capacity limits allow up to 100 public Application-link
  requests per shared network per hour and 500 per shared network per day. Application
  access allows up to 100 OTP requests per shared network in 30 minutes. The stricter
  per-email, per-invitation and resend-cooldown protections remain unchanged.
- DynamoDB is authoritative. The **Application Link Requests** Sheet tab and staff
  portal list are reporting/operational projections only.

## Community Enquiries

- **Connect with Rosewood College** is a separate public workflow. It never creates or
  links an EOI, invitation, Application, contact or student record.
- The collected fields are name, email, one approved reason for contact and an optional
  message of up to 4,000 characters. Records are pinned to
  `rosewood-community-enquiry-2026.1` and its definition hash.
- DynamoDB is authoritative. Each accepted submission, idempotency claim, restricted
  audit event and email outbox item is committed atomically.
- A durable outbox notification is addressed to `info@ffe.org.au` through the existing
  SES delivery-feedback and alarm path. The validated enquirer address is Reply-To.
  No automatic email is sent to the enquirer.
- Honeypot, minimum-time, idempotency, shared-network and hashed-email controls run on
  the backend. Limits are 100 per shared network per hour, 500 per shared network per
  day, three per email per hour and five per email per day.
- Community enquiries are intentionally not written to the enrolment Google Sheets.
  They remain recoverable from encrypted DynamoDB and its existing backups if email
  notification or a mailbox is unavailable.

## Application Invitation and Record Creation

- Application for enrolment is invitation-only.
- A family may be invited after submitting an EOI or may be invited directly without
  an EOI.
- Staff must not ask a family which path applies. The invitation record determines it.
- For an EOI-linked invitation, successful email verification links to the existing
  contact and student records and may prefill approved EOI information.
- For a direct invitation, staff enter the invitee email and parent/guardian first name
  in the internal portal. Parent/guardian surname is optional but encouraged. Staff do
  not enter a child name at invitation time.
- A verified family can add more than one child. Each child has a separate application
  ID, draft, progress, documents, signatures and outcome under the same family
  invitation. The launch safety limit is eight child applications per invitation.
- The backend retains the original `applicationId` on an invitation and also records
  `applicationIds` so earlier one-child records remain compatible.
- Invitations and resends expire 14 days after they are issued.
- An editable application with an active invitation uses **Resend**, which rotates the
  current token. An editable application whose invitation access is expired, inactive
  or missing uses the separate **Renew access** operation.
- Renewal preserves the application ID, all family child records, saved answers,
  revision history and current status. It must not create a replacement application.
  It is conditionally written, rate-limited, idempotent and audited. It refuses an
  active invitation or a non-editable application.
- Direct and deliberately EOI-linked invitations use separate approved email variants.
  Both use the subject `Invitation to Apply for Enrolment at Rosewood College`, a
  private `BEGIN APPLICATION` button, enrolment contact details and the exact expiry.
  The HTML contains the private URL only in the button; the plain-text alternative
  contains the URL once. The visible sender is
  `Rosewood College Enrolment <enrolment@ffe.org.au>`.
- The EOI-linked variant identifies the child, entry year level and year and explains
  that approved prior information may be prefilled. It names Rosewood College; the St
  Lawrence school name from the source example is not carried into Rosewood messages.
- Prefilled fields remain reviewable and editable unless a separately approved rule
  makes a field immutable.

## Internal Staff Portal

The first authenticated staff portal release covers only the live EOI and Application
for Enrolment backend. It must:

- list EOIs and applications, including the guardian-signature status held by each
  application
- provide a separate enrolment-planning view showing student name, primary
  parent/guardian name, invitation email, entry year, entry level, application status,
  signature progress, last activity, staff-review flag and reference, with contact-aware
  search and year/level/status filters
- open on a read-only Admissions overview that uses exactly five application-progress
  stages: Not started, In progress, Awaiting signatures, Staff review and Application
  complete
- count child application records, not families, contacts or prospective places; the
  overview must not describe Application complete as enrolled, accepted or offered
- derive a staff-attention queue from operational metadata for failed/delayed email,
  unavailable invitation access, seven days without draft activity, three days with an
  outstanding signature, staff review and missing entry details
- treat every attention item as an operational prompt only; it must not modify the
  application, send a message, infer an admissions outcome or create a decision
- keep contact details out of the aggregate Admissions overview and attention summary;
  the authorised Enrolment planning rows may show the primary parent/guardian name and
  invitation email already present in the Applications workspace so an unstarted child
  record can be identified
- default Enrolment planning to Family applications while retaining conservatively
  identified synthetic/test records under a separate Test applications filter; this is
  a response-only operational category, not deletion or an admissions classification
- allow newest/oldest application-created-date sorting and retain entry-year/level
  sorting; use authoritative `createdAt` rather than invitation email or last activity
- keep health information, documents and detailed application answers out of planning;
  those remain available only through the audited detailed review where authorised
- show each record's current progress and last successful save
- search and filter records without exposing them publicly
- select an EOI and issue an application invitation
- enter a parent/guardian first name, optional surname and email address and issue a
  direct family invitation without collecting a child name
- prevent an EOI already linked to an application from being linked again through the
  portal
- send the automatic invitation email and record its delivery status
- rotate the private token when an active invitation is resent, invalidating the prior
  link
- show recent operational email events without linking staff into editable Sheets
- allow audited review of application answers and list document metadata without
  creating public or short-lived file-sharing links
- exclude signature images, raw invitation links and network fingerprints from portal
  responses

Entry year and level remain applicant answers stored on each child application. The
planning view is read-only and may show **Not provided yet** until the family saves
those fields. It must not infer an entry year from invitation date, application date or
another sibling's record.

The overview summary is calculated by the backend from the same authoritative
DynamoDB application, invitation and SES-feedback records already used by operations.
It is not stored as another family record and does not rely on Google Sheets. The
ordinary overview response excludes full family email, health answers, documents,
date of birth, raw SES identifiers and network metadata. Opening **Review** uses the
existing authorised and audited application-detail path.

The first release is allowlisted to `info@ffe.org.au`, uses email OTP and records staff
actions. Its ordinary session remains in memory; explicit **Remember me** stores only
the opaque token/email/expiry locally and uses a backend-enforced two-hour sliding
window. The backend supports
admin, admissions and viewer roles so named mailboxes can be added after access owners
and review/offboarding rules are approved. The restricted operator CLI remains an
emergency fallback. Any future acceptance/decline interface must not merge those
workflows into the current records or API.

## Application Gateway

- Use a short welcome, one email field and quiet optional-reference links to the approved
  Enrolment Policy, Enrolment Procedure and Privacy Policy. Do not present policy review
  as a prerequisite to beginning the application.
- Do not present a prominent "Important documents" section.
- Do not show a document preparation checklist at the gateway. Families may complete
  the form until Documents and save their progress if they need to obtain a file.
- Do not ask for interface language on the application gateway.
- Label the email section "Enter your email" rather than "Email verification".
- Do not imply that every invitee previously submitted an EOI.
- Do not reference or link the Privacy Collection Notice in the welcome copy. This
  decision does not remove privacy controls or documentation elsewhere.

## Approved Policies And Reader

- The approved source documents are the Rosewood College **Enrolment Policy**,
  **Enrolment Procedure** and **Privacy Policy** supplied on 8 August 2026.
- Preserve each original Word file byte-for-byte and provide a canonical PDF fallback.
  The readable HTML projection must preserve approved wording and document order; it
  must not summarise, rewrite or introduce policy language.
- Policy review remains within the Application page. Use direct policy URLs, History
  API navigation, browser Back and a clear Return to application action. Do not use a
  popup, iframe or unnecessary new window.
- Welcome values remain in browser memory while switching policies or returning. Policy
  viewing performs no API request, draft save, analytics event or acknowledgement.
- `aria-current`, labelled navigation, headings, landmarks, keyboard focus styles and
  mobile table/list reflow are required. Reviewing a policy never constitutes
  acceptance and must not create an acknowledgement checkbox.
- Desktop retains the blue Rosewood information panel. Mobile replaces the columns with
  a compact Rosewood header, sticky policy selector, reading progress and persistent
  return action.

## OTP Resend Contract

- A resend action must show a sending animation and a live confirmation that a new
  code was sent.
- The resend control must have a server-enforced cooldown. The frontend countdown is
  informative and is not the security control.
- Initial policy: at least 30 seconds between sends and no more than five resend
  requests per email/challenge in 30 minutes.
- Apply additional per-IP and per-invitation limits, generic responses that do not
  disclose account existence, replay protection, expiry, attempt limits and audit
  events.
- Return a retry interval for throttled requests and keep the current valid code policy
  explicit in backend implementation and tests.

## Submission Validation And Signature Readiness

- The three application decision influences are an exact-three requirement. The
  Conditions page must enforce it before the family reaches Signature.
- If final server validation still finds an earlier incomplete answer, the response is
  translated into the family-facing field label and section. The page provides a direct
  review action that carries the exact missing field, reveals any applicable conditional
  panel, scrolls to the affected control, highlights it and moves keyboard focus to it.
- A signature drawing is held only in the current browser session until submission. It
  survives navigation between form sections but is never included in draft autosaves.
- The declarations, date and additional-guardian acknowledgement must restore with the
  drawing after in-form navigation. A page reload or expired session requires a new
  drawing.
- `Signature ready` means the drawing is prepared in the browser. The legally recorded
  signature is created only after the server validates the complete application and
  stores the final signed revision.

## Draft Saving, Status and Session Contract

- Do not expose backend deployment scope or inactive-workflow information to families.
  The operational ribbon is visible only in explicit non-writing review mode.
- The compact workflow/section header remains visible while scrolling on desktop and
  mobile. Its indicator uses family-facing states: In progress, Saving, Saved, No
  connection, Save failed and Session expired.
- The save indicator is hidden on the Application gateway, email-verification and child
  selection screens because no child draft is open. Authentication errors use the form
  error area and must never be labelled as save failures.
- Saved means the backend acknowledged the exact current revision. A selected but not
  yet uploaded file must not appear saved. A drawn but unsubmitted signature uses the
  distinct `Signature ready` state and states that recording occurs only on submission.
- Application answers autosave 1.2 seconds after input pauses and at least every eight
  seconds during continuous input. Identical snapshots are suppressed.
- Navigation flushes pending changes. Every Application section provides **Save and
  continue later**; on Documents it also uploads selected files before confirming save.
- Save and continue later revokes the selected child's application/status sessions and
  clears its answers from page memory, but preserves the verified family session and
  offers **Return to child applications**. Sign out revokes the family session. The
  child selector uses Sign out rather than Back.
- Family and child-application sessions expire after 90 minutes of inactivity and have
  an eight-hour absolute lifetime after OTP. Activity refreshes the idle window only
  when needed. Staff and guardian-signing sessions keep their separate policies.
- The browser warns after 85 minutes without successful server activity and lets the
  family continue the session explicitly. It mirrors the 90-minute inactivity window.
  Expiry opens a blocking dialog
  automatically, Escape cannot dismiss it, and the only action clears browser-held
  session data and returns to the Application sign-in screen. The message distinguishes
  acknowledged progress from changes that may not have saved.
- Refreshing the same tab resumes through an opaque `sessionStorage` token while the
  server session remains active. After expiry or explicit sign-out, the family uses the
  private invitation and completes OTP again.

## Permanent Collection Decisions

- Proof of address is not requested at the gateway, in Documents, or elsewhere in the
  Rosewood application.
- Parent/guardian Past Student and Spouse fields are not collected.
- Emergency contacts do not have a "Share these details" question.
- Application conditions contain the three Harkaway Hills College agreement groups,
  with Rosewood College substituted as requested, and one required acknowledgement for
  each group. Previous-school permission and fee responsibility are not collected.
  V6.8 adds an optional eleven-question Student and family survey after the required
  acknowledgements.
- Terms and Conditions of Enrolment and photography/recording permission belong to the
  post-offer Enrolment Agreement, not the application.
- Victorian admission guidance is not displayed in the application signature step.

## Deferred New-School Fields

The following St Lawrence application fields are hidden for Rosewood's first intake:

- Family Connection
- Siblings Already Attending
- Other Relatives

The production schema should reserve nullable, inactive fields and repeat structures
for them. They must not be rendered, required, silently defaulted or used in decisions
until Rosewood explicitly enables them for a later intake. The visible family question
asks whether there are other children, apart from the child named in the application,
who may apply to Rosewood in future. When Yes, it records a whole-number count from 1
to 99. Validation must use this family-facing wording and never expose internal
“future sibling” field names.

## Student Rules

- Religion and Current Early Learning Centre / Kindergarten / Primary School reveal a
  mandatory free-text field when Other is selected. The current-school control occupies
  its own row so long labels and conditional fields do not misalign adjacent controls.
- V6.8 has no separate Student Residence or Previous Education section. Interrupted
  schooling follows Current Early Learning Centre / Kindergarten / Primary School.
  Address sharing and compact Home Care Arrangement controls sit inside Student Primary
  Address and explicitly refer to other parents/guardians.
- V6.10 provides optional Google Places suggestions for the EOI primary-contact
  address, student primary address and guardian residential/postal addresses. The
  existing structured fields remain
  editable and authoritative, and an unavailable provider never blocks manual entry.
  Google receives only search text typed into its separate control; Rosewood requests
  only address components and does not request/store Place IDs, coordinates, search
  history or device location. Doctor/practice addresses remain manual.
- Home Care Arrangement is a required single-select. Other reveals a required care
  description, and Shared Custody reveals a required Shared Parenting Schedule.
- Nationality and Citizenship is identified as a government requirement and makes clear
  that every question refers to the student. Citizenship follows residential status,
  and language questions appear at the end of the section.
- Citizenship Status No reveals required Evidence of Australian Residency. Permanent
  Resident, Temporary Resident and Other / Visitor / Overseas Student reveal mandatory
  Visa subclass and Visa expiry; Eligible for Australian Passport does not. Previous
  visa subclass remains optional.
- Main Language uses the 444 language-level entries in the ABS Australian Standard
  Classification of Languages 2025, with English first and all remaining entries in
  alphabetical order.
- General / Additional Needs controls only the visibility of Please Specify. Health
  Professionals, Reports Attached, NDIS Support and Court or Parenting Orders remain
  visible. The source duty-of-care explanation and assurance that the information will
  not impact the offer of enrolment appear before the question.
- Parish is labelled "Parish where student lives".
- Medical Details displays an Other medical condition field only when Other is chosen.
- Doctor Name, Doctor's practice/Address and Doctor Phone are mandatory.
- Ambulance Cover and Health Care Card are mandatory Yes/No questions.
- Humanitarian Health Check clarifies that it asks whether the child has a humanitarian
  visa.

Source: https://www.abs.gov.au/statistics/classifications/australian-standard-classification-languages-ascl/2025

## Parent and Guardian Rules

- Use "Share your contact details with other parents or guardians on this application?"
  with explicit share/private options and mandatory "SMS Messaging".
- Health Care Card is mandatory Yes/No. Yes reveals mandatory card number and expiry.
- Residential Address, Suburb, State, Postcode and Country are mandatory.
- Occupational Group, Occupation, School Level Education and University / Further
  Education are mandatory.
- Country of Birth, Nationality, Languages, Residency Status and Aboriginal / Torres
  Strait Islander response are mandatory; Ethnicity is optional. Temporary Resident reveals
  mandatory Visa Subclass and Visa Expiry.
- A second parent/guardian is the normal route and receives an independent signature
  request after the primary applicant submits only when contact permission is Yes.
- Contact permission is explicit and is not inferred from an entered email or mobile.
  **No, do not contact this person** suppresses every automated email, SMS, OTP and
  signature request to that person. It requires a one-signature explanation and staff
  review; the College may contact the submitting applicant, not the prohibited person.
- A submitted application remains read-only. While a permitted signature is pending,
  the submitting applicant may re-authenticate by OTP, enter the replacement email
  twice and rotate the signing request. This keeps the application ID, submitted answer
  revision and primary signature unchanged and immediately invalidates the earlier
  task, OTP challenges and signing sessions.
- Correct email and resend disappear when contact is prohibited or the signature is
  complete. There is no applicant-facing post-signature contact management.
- A primary submission with outstanding guardian signatures is labelled **Awaiting
  Parent/Guardian Signature**, not Completed. Completed is shown only after every
  required signature has been recorded.
- After OTP verification, an additional guardian reviews the complete frozen submitted
  application, not a reduced summary. All application sections, repeated contacts,
  document file names, conditions and the primary signature record are visible but
  read-only. Internal identifiers, storage metadata, network fingerprints and signature
  image locations are never included in the browser response.
- If no second parent/guardian is included, Explanation only one signature becomes
  mandatory and explains why it is being requested.

## Additional Guardian Signature Email

- The request email explains why it was sent before the signing button, instructs an
  unexpected recipient not to sign or forward the private link, and identifies
  `enrolment@ffe.org.au` as the contact.
- Keep the email concise. Do not include the student's name, family details, medical
  information, application answers or internal identifiers in the subject or body.
- The link remains a high-entropy, expiring signing-task link. Opening it does not expose
  the application; the invited email and OTP are still required before review.

## Staff Application Notifications

- The private Slack `#enrolments-committee` channel receives a status notification when
  an Application reaches `pending_signatures`, and another update when an intermediate
  guardian signs but at least one required electronic signature remains outstanding.
- The board-access-only workspace channel `#enrolments` receives the completion
  notification only when the Application reaches the authoritative `submitted` state.
  A one-guardian application reaches this state at primary submission; a multi-guardian
  application reaches it only after the final required guardian signs.
- `staff_review_required` does not trigger a Slack notification.
- Slack receives the student's name, completed parent/guardian signer names, outstanding
  signer names for a pending event, Application reference, Melbourne status time and a
  link to the authenticated staff portal. Email addresses, answers, documents, medical
  details and internal application identifiers are excluded.
- The notification is a durable, retryable DynamoDB outbox operation. Slack is not a
  system of record, audit history or staff authorisation boundary.
- Both incoming-webhook URLs are restricted configuration in AWS Secrets Manager. They
  must not appear in Git, CloudFormation parameters, logs, Sheet projections or staff
  APIs.
- No setup/test enrolment message is sent. The first enrolment notification in each
  channel is reserved for a genuine Application event.

## Frontend and Backend Boundary

EOI and Application for Enrolment are live backend workflows. The server independently
enforces invitation authorization, OTP expiry and throttling, session scope, validation,
draft revisions, upload constraints, signatures, persistence and audit events.

Acceptance, decline and the post-offer Enrolment Agreement remain separate non-writing
previews. They must not reuse the EOI or Application records when their backends are
implemented.

## V6.11 Production Hardening Decisions

- New EOI/Application records use immutable `2026.11` definitions. V10 and earlier
  catalogues and wording remain available to their pinned records.
- Fee payment, photography/social-media permission and Grade 12 withdrawal notice do
  not belong in the Application Parent / Carer commitments. They require separately
  approved post-offer or operational processes.
- EOI retries must be idempotent and rate-limited before external artifacts are made.
  A failed authoritative transaction triggers best-effort deletion of the artifact it
  created; it never creates another EOI to compensate.
- Email, Slack and Sheet outbox events stop after eight failed attempts and become a
  retained, alarmed failure record. Replaying one requires authorised operational
  recovery and the original idempotency boundary.
- SES acceptance is not delivery. Configuration-set events are the source for delivery,
  delay and permanent-failure status and must be recorded without recipient addresses.
- GitHub pull requests must pass backend tests/build, local-asset resolution and
  public-data/secret checks before merge.
