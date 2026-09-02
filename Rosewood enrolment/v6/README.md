# Rosewood Enrolment V6

## Cohort planning (2026-09-02)

The staff portal now separates **Applications**, **Prospective families** and a
de-duplicated **Combined forecast** inside **Cohort planning**. Prospective families are
stored as independent DynamoDB planning records with explicit contact permission,
status, source, follow-up ownership, restricted notes and one or more child cohorts.
They do not create an EOI, invitation or Application and cannot send an email.

Staff may deliberately link one prospective child to one existing family Application.
The relationship is unique, audited and reversible; it never changes the submitted or
in-progress Application. The combined forecast counts linked children only through the
Application side, excludes marked test Applications and excludes archived or
not-proceeding prospects. Google Sheets are not used for these planning records.

## Staff review, communications and meetings (2026-09-01)

Authenticated admissions staff can review a submitted application through the same frozen, human-readable section projection used for guardian review. Application Review is deliberately read-only apart from its staff-only checklist, status and internal note. Family emails and principal-meeting invitations are not available inside the review dialog. Review state, correspondence and bookings are separate DynamoDB entities; they never rewrite submitted answers, documents, signatures or application revisions.

Family correspondence has a separate **Family communications** workspace. Staff may save a draft, send a test to their own authorised staff address, and explicitly send the reviewed message. A purpose classifies the record but never triggers an automatic family email. Backend recipient checks preserve explicit guardian contact permission.

Principal meetings have a separate workspace. Staff create a schedule, prepare up to 40 future times in a reviewed batch, then deliberately invite one contact-permitted recipient. A family receives a private application-linked invitation, verifies the invited email by OTP, and books one available time. The same verified family can later replace that time with another available slot; one conditional transaction releases the old slot and reserves the new one without changing the booking or application identifier. Another family cannot overwrite the booking, and no family cancellation/deletion action exists.

V6 is the Rosewood College enrolment interface at:

```text
pages/rosewood-enrolment-v6.html
```

It rebuilds V5 from the field-by-field St Lawrence audit rather than reusing V5's
mixed workflow components. The visible design is Rosewood-branded; the workflow,
questions, section order and observed interaction states are mapped from the captured
St Lawrence evidence.

## URLs

```text
https://ffe.org.au/discover-rosewood.html
https://ffe.org.au/
https://ffe.org.au/homepage-before-discover-rosewood.html
https://ffe.org.au/pages/rosewood-application-link-request-review.html
https://ffe.org.au/homepage-application-request-review.html
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=eoi
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=acceptance
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=signing
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=decline
https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html
https://ffe.org.au/pages/rosewood-enrolment-meeting-v1.html?invite=[private-token]
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application&policy=enrolment-policy
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application&policy=enrolment-procedure
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application&policy=privacy-policy
```

Add `&review=1` to reveal the internal frame selector. The normal family-facing URLs
do not show workflow-switching or direct frame navigation.

The application-link card is active on the indexed Discover Rosewood home page. It
collects parent/guardian name and email, then uses the existing duplicate-safe request
contract to send a private Application invitation. The former
`/discover-rosewood.html` route returns visitors to `/`, while the preceding homepage
is retained at the no-index `homepage-before-discover-rosewood.html` rollback URL.
The renamed review page remains a
network-disabled simulation: it saves no information and sends no email. A second no-index review URL preserves the exact
full-homepage composition in which that card was launched, but loads the same safe
simulation client rather than the production request client. The home page has been restored to the preceding
**Register Your Child** links. Staff direct and EOI-linked invitations continue to
work. Application remains invitation-only and requires the
unique token sent by email; the generic Application URL cannot open a family record.
Acceptance, signing review and decline remain non-writing previews.

The Discover page also submits its **Connect with Rosewood College** form to a separate
community-enquiry endpoint. DynamoDB stores the versioned enquiry as the authoritative
record and atomically queues an SES notification to `info@ffe.org.au`; the message uses
the validated enquirer address as Reply-To. It does not create an EOI, invitation or
Application and is not projected to the enrolment Google Sheets.

The last URL is the no-index staff operations portal. Access is restricted by an
allowlisted email OTP and currently covers EOI and Application for Enrolment only. Its
default **Admissions overview** groups student applications into Not started, In
progress, Awaiting signatures, Staff review and Application complete, and provides a
read-only attention queue for operational follow-up.

## Scope

- one-page Expression of Interest
- active minimal application-link request on Discover Rosewood plus a separate
  network-disabled interface review page
- versioned community enquiry collection and staff email notification
- invited application gateway, OTP frame and record selector for EOI-linked and direct
  staff invitations
- family-level record selection that keeps each child's application, progress,
  documents and signatures separate under one verified invitation
- five-step application
- separate offer-acceptance gateway, selector and five-step Enrolment Agreement
- independent guardian identity, OTP, Introduction, Your Details, Review, Sign,
  Thank You and immutable Signed Form frames
- separate decline gateway, selector and three-step decline form
- responsive desktop and mobile presentation
- an internal responsive reader for the approved Enrolment Policy, Enrolment Procedure
  and Privacy Policy, with direct routes and original Word/PDF fallbacks
- required-field, repeatable-record, conditional, application-agreement and signature interactions
- the complete 444-entry ABS ASCL 2025 Main Language catalogue

## Backend Boundary

EOI and Application for Enrolment now use the production V6 backend documented in
`backend/README.md`. It sends real OTP and workflow emails, saves application drafts,
records application signatures and documents in restricted Google Drive folders and
writes normalized reporting projections to private Google Sheets owned by
`info@ffe.org.au`. DynamoDB is authoritative for operational records; the Sheets are
replaceable reports rather than the application database. Browser uploads use a
private, KMS-encrypted Sydney S3 staging bucket before Lambda verifies and moves each
file into Drive. The staging object is deleted after a successful move and abandoned
objects expire after one day; S3 is not an authoritative or staff-facing file store.
GuardDuty and long-term S3 document storage are outside the launch scope.

Production availability is checked every 10 minutes without writing applicant data.
The scheduled AWS canary verifies the indexed Discover home page and its active forms,
the former Discover route, the network-disabled request review, public family, signing and staff assets, backend
health and immutable form versions, the EOI Google-address runtime configuration,
fail-closed protection on the Application/status/staff routes and whether email,
Sheets or Slack delivery work has remained pending for more than 15 minutes. Five
availability alarms notify `info@ffe.org.au` and `frjativa@gmail.com` after two
consecutive failed or missing checks and send a recovery notification when service
returns to normal. Separate alarms cover Lambda errors, Lambda throttling, terminal
outbox failure and SES bounce, complaint, rejection or rendering failure. Both SNS
subscriptions were confirmed and delivery-tested on 9 August 2026; any future new
recipient must confirm the AWS subscription once.

The family page does not store application answers in cookies, local storage, session
storage or IndexedDB. It stores only opaque family/application/status session tokens,
the verified email, current screen and absolute expiry in per-tab `sessionStorage` so a
refresh can resume without another OTP while the server session is valid. Family and
child-application sessions expire after 90 minutes of
inactivity, with an eight-hour absolute limit. A family invitation and email OTP reveal
only the child records attached to that invitation; selecting or creating a child
produces a separate application-scoped session. Application answers autosave after a
short pause and during continuous typing. Selecting a document starts its upload
immediately and displays per-file progress and inline retryable errors. Selecting a
replacement file clears superseded failed attempts in that document category without
removing files already uploaded or still transferring. Next and **Save
and continue later** wait for any active transfer, flush the draft and, for save-later,
close the selected child's editing session while preserving the verified family session.
The confirmation provides **Return to child applications**; the family can choose another
child without returning to the consumed OTP screen. Returning after a later sign-in
resumes the last acknowledged section.
An unsigned drawing is kept only in the current browser session, survives navigation
between application sections and is labelled `Signature ready`; it is recorded only
after successful final validation and submission. Missing final answers are identified
by field and section, with a direct review action and inline highlight.
Each additional guardian has an explicit contact-permission value. A separate signing
request is created only after submission and only when **Yes, the school may contact
this person** is recorded. **No, do not contact this person** suppresses email, SMS, OTP
and ordinary signature-request delivery, requires the applicant's one-signature
explanation and flags the same submitted application for staff review. The family
selector opens a secure read-only status page for submitted records; eligible pending
signers show masked email and request progress plus step-up-OTP email correction and a
rate-limited resend. Neither action reopens or duplicates the application. A dry-run-
first recovery command can recover a missing permitted task, but must never bypass the
stored contact permission.
After the invited guardian verifies their email OTP, the dedicated signing page shows
the complete frozen application as read-only sections: student, nationality and
citizenship, additional needs, sacraments, medical details, every parent/guardian,
emergency contacts, document file names, conditions and the recorded primary signature.
The response omits internal record IDs, storage locations, revision hashes, network
fingerprints and signature image identifiers. The guardian confirms review only after
the complete application and then proceeds to the separate signing step.
Acceptance, decline and post-offer Enrolment Agreement frames cannot write to the
backend, send messages or create records.

Every live EOI and application is pinned to an immutable form version and definition
hash. Draft saves merge rather than replace the answer map, preserving fields omitted
by a later page, and each acknowledged application save has a full append-only DynamoDB
revision. The staff portal can retrieve selected historical answers through an audited
request. Google Sheets show the record's actual form version but remain replaceable
reports. `SCHEMA-EVOLUTION.md` defines the mandatory process for adding, removing,
renaming or changing questions and for migrating existing records.

The current EOI `2026.25` and Application `2026.26` releases preserve their preceding
question and data contracts while pinning the separate cohort-planning interface and
read-only monitoring markers. The preceding releases pin stable staff review navigation,
protected five-minute PDF/image document previews and staff case
management, the staff planning record-type/date-sort interface, Admissions overview, enrolment-planning, implemented
application-link request and staff request-list interfaces. Public promotion of that
request interface is paused;
the separate retained backend contract is
`rosewood-application-link-request-2026.1`; it contains only parent/guardian name and
email. Application V6.16 fixed the guardian signing page's read-only date to use
the Melbourne calendar day. V6.15 clarifies the other-children question and targets the exact
incomplete family control from server validation. V6.14 contains the preceding family-feedback field changes, V6.13 corrects
document-upload recovery and V6.12 contains the revised immunisation guidance and
clearer official Victorian-law link. Older definitions remain addressable and
submitted records are not rewritten.

The Application welcome uses the three approved Rosewood policies stored under
`pages/rosewood-policies/`. Selecting one changes the current URL through the History
API and renders its approved wording in the enrolment page; it does not call the
backend, save an acknowledgement or constitute acceptance. Return to application and
browser Back restore the in-memory welcome state. Desktop retains the Rosewood story
panel, while mobile uses a compact header, sticky selector and reading-progress bar.
The original byte-identical Word documents and canonical-layout PDFs remain available.

The family-facing page has no environment or backend-status ribbon. Its compact sticky
header shows the current workflow/section and truthful save or connectivity status on
desktop and mobile. The non-writing internal review URL retains an explicit review
warning.

The staff portal keeps its ordinary two-hour session in memory. When staff explicitly
select **Remember me on this device**, the opaque staff token is retained in local
browser storage and its server expiry slides to two hours after each authorised
activity; sign-out or expiry removes it. No staff dashboard data is persisted there. It displays operational
summaries, creates direct or EOI-linked invitations, rotates active tokens when
resending, renews expired or missing access without replacing the application, and
provides audited application review. Its **Cohort planning** Applications tab shows student
name, primary parent/guardian name and invitation email, entry year, entry level,
status, signature progress, last activity, staff-review flag and reference, with
contact-aware search and year, level, status and record-type filters, plus application-
created-date and cohort sorting. Family applications are shown by default. Conservatively
identified synthetic/test names and test-address markers are available under **Test
applications** or **All records** and remain retained for audit. Before child details exist,
the primary parent/guardian becomes the row title and the row is labelled **child
details not started**. Health, document and other application answers remain excluded
from planning. Detailed review lists document metadata and offers an audited Preview
action. The backend revalidates each file against the application and restricted Drive,
then creates a five-minute inline/download view through the existing KMS-encrypted
Sydney staging bucket. It never creates a permanent or public Drive sharing link.
Viewers can review and preview but cannot create invitations.
The default **Admissions overview** counts child applications rather than families and
uses five application-progress stages; Application complete is not an offer or
enrolment decision. Its read-only attention queue derives unavailable access,
failed/delayed workflow email, seven-day draft inactivity, three-day outstanding
signatures, staff review and missing entry details from authoritative operational
metadata. It stores no new family answer and performs no write action.
The portal does not show raw invitation links, signature drawings or network
fingerprints and does not link staff directly into editable Sheets. It does show
restricted signer controls, current and previous application email history, request
delivery/open/verification status, link revocation, completion and staff-review reason.
Admin/admissions staff can change a pending guardian's contact permission only after an
exact explicit confirmation; the change is conditional, rate-limited and audited.
Direct invitation staff fields are parent/guardian first name, optional surname and
email only. The invitation lasts 14 days and the family supplies each child after OTP.
When activated, public requests use the same 14-day family invitation and do not collect
child details. They never search for or link an EOI by email. A repeated request reissues access to the
same family invitation/application, rotates the private token and does not create a
duplicate application. Request records are visible to authorised staff; the public
success response remains generic.
Additional-guardian signing emails explain why the recipient was contacted before the
private action button and contain no student, family, medical or application details.
The private link still requires the invited email and OTP before the frozen application
review is returned.

The durable outbox routes permitted `pending_signatures` updates to the private Slack
`#enrolments-committee` channel and authoritative `submitted` completion notifications
to the board-access-only workspace channel `#enrolments`. Pending updates identify the
student, completed signer names and outstanding signer names. Completion identifies the
student and all completed signer names. Both include only the Application reference,
relevant Melbourne time and generic staff-portal link beyond those names; email
addresses, answers, documents, medical information and internal identifiers remain
excluded. Slack is never an application database or audit record. Both webhooks are
stored only in the existing AWS configuration secret. `staff_review_required` does not
notify.

All SES messages use the stack-managed configuration set. Encrypted SES feedback for
send, delivery, delay, bounce, complaint, reject and rendering failure is deduplicated,
audited and projected without recipient addresses. Pending signer controls are updated
through the stored SES message/task correlation, so `accepted_by_ses` is distinct from
Delivered and permanent delivery failures are visible to the family and staff portal.

V6 is hidden from site navigation and the sitemap and has `noindex`. Its URL is still
public and is not an access-control boundary.

`PRODUCT-DECISIONS.md` is the permanent implementation register for direct invitations,
the staff portal, OTP throttling, excluded fields and application/agreement
boundaries. `SES-PRODUCTION-READINESS.md` records the transactional sender contract and
completed AWS canaries. `ARCHITECTURE-HARDENING.md` and `RECOVERY-RUNBOOK.md` record the
Sydney-only protection and restore model. `DATA-PROCESS-MAP.md` provides the
stakeholder-facing general workflow, section-level data flows, access matrix and
live/preview boundaries. See these records together with
`SOURCE-COMPLIANCE.md`, `TESTING.md`, `STAFF-PORTAL-RUNBOOK.md` and
`RELEASE-BLOCKERS.md` before inviting real families.

`V6.7-CHANGE-MAP.md`, `V6.8-CHANGE-MAP.md`, `V6.9-CHANGE-MAP.md` and
`V6.10-CHANGE-MAP.md` record the preceding contract releases.
`V6.11-CHANGE-MAP.md`, `V6.12-CHANGE-MAP.md`, `V6.13-CHANGE-MAP.md` and
`V6.14-CHANGE-MAP.md`, `V6.15-CHANGE-MAP.md` and `V6.16-CHANGE-MAP.md` record the current interface,
immunisation-guidance, upload-recovery, family-feedback and family-question clarity
releases. `V6.19-CHANGE-MAP.md` records enrolment planning and
`V6.20-CHANGE-MAP.md` records the Phase 1 Admissions overview and
`V6.21-CHANGE-MAP.md` records the planning identity and density refinement.
`V6.26-CHANGE-MAP.md` records the separate prospective-family cohort-planning release.
