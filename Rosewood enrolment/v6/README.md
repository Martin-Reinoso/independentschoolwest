# Rosewood Enrolment V6

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
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=eoi
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=acceptance
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=signing
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=decline
https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application&policy=enrolment-policy
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application&policy=enrolment-procedure
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application&policy=privacy-policy
```

Add `&review=1` to reveal the internal frame selector. The normal family-facing URLs
do not show workflow-switching or direct frame navigation.

The EOI URL is live. Application is invitation-only and requires the unique token sent
by staff; the generic Application URL cannot open a family record. Acceptance, signing
review and decline remain non-writing previews.

The last URL is the no-index staff operations portal. Access is restricted by an
allowlisted email OTP and currently covers EOI and Application for Enrolment only.

## Scope

- one-page Expression of Interest
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

The family page does not store application answers in cookies, local storage, session
storage or IndexedDB. It stores only opaque family/application/status session tokens,
the verified email, current screen and absolute expiry in per-tab `sessionStorage` so a
refresh can resume without another OTP while the server session is valid. Family and
child-application sessions expire after 20 minutes of
inactivity, with an eight-hour absolute limit. A family invitation and email OTP reveal
only the child records attached to that invitation; selecting or creating a child
produces a separate application-scoped session. Application answers autosave after a
short pause and during continuous typing. Selecting a document starts its upload
immediately and displays per-file progress and inline retryable errors. Next and **Save
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
summaries, creates direct or EOI-linked invitations, rotates tokens when resending and
provides audited application review. It lists document metadata but does not create
document-sharing links; authorised staff access documents through the restricted
enrolment Drive. Viewers cannot create invitations.
The portal does not show raw invitation links, signature drawings or network
fingerprints and does not link staff directly into editable Sheets. It does show
restricted signer controls, current and previous application email history, request
delivery/open/verification status, link revocation, completion and staff-review reason.
Admin/admissions staff can change a pending guardian's contact permission only after an
exact explicit confirmation; the change is conditional, rate-limited and audited.
Direct invitation staff fields are parent/guardian first name, optional surname and
email only. The invitation lasts 14 days and the family supplies each child after OTP.
Additional-guardian signing emails explain why the recipient was contacted before the
private action button and contain no student, family, medical or application details.
The private link still requires the invited email and OTP before the frozen application
review is returned.

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

`V6.7-CHANGE-MAP.md` and `V6.8-CHANGE-MAP.md` record the preceding contract releases.
`V6.9-CHANGE-MAP.md` records the current optional Google address-assistance boundary,
key controls, privacy limits, fallback, migration and release gate.
