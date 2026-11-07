# Enrolment context and acceptance alignment

Assessment: 8 November 2026, Australia/Melbourne. This is a repository and bounded
public-runtime review, not a new production release, legal approval or full live test.

## Conclusion

Extend the existing Rosewood family and staff experience with a distinct post-offer
agreement. Reuse its design, explicit family relationship, child selection, identity
verification, reviewed communications and operational tracking. Preserve the original
Application and its signatures. The new agreement needs its own frozen content and
signatures, but it does not need to look or feel like a different application.

The local candidate supplies useful backend work, but is not ready to release as-is.
The user's latest direction is to understand and assess the system before continuing
implementation. Recommendations below are proposals, not newly approved requirements.

## Evidence and current state

- Canonical repository: `Martin-Reinoso/independentschoolwest`; fetched `origin/main`
  and candidate base both `4c91733` at this review.
- Local candidate branch: `codex/rosewood-offer-agreement-20261108`, in the isolated
  non-cloud worktree. Candidate files are uncommitted; the original OneDrive checkout
  was preserved.
- Public health read at 2026-11-07 14:38 UTC (8 November 01:38 Melbourne) returned 200,
  `status: ok`, EOI `rosewood-eoi-2026.28`, Application
  `rosewood-application-2026.29`, request `2026.1` and community enquiry `2026.1`.
  It advertises community enquiries, cohort planning and family communications.
- Nine live assets matched local baseline bytes: V6 family HTML/JS, V5/V6 family CSS,
  V6 staff HTML/JS/CSS and V6 application-signing HTML/JS. This verifies those assets,
  not every deployed module or every pinned file.
- No authenticated AWS inspection, live OTP, family email, document upload, final
  submission, signature or alarm-notification test was performed in this assessment.
  Live queue contents, staff membership, billing and alert delivery remain unverified.
- The offer candidate is local and unpublished. Existing `workflow=acceptance`,
  `workflow=signing` and `workflow=decline` are historical non-writing previews.
  The live `rosewood-application-sign-v6` page signs an Application, not an offer.

## Where the design and mapping come from

Read these as an authority chain rather than interchangeable specifications:

| Source | What it establishes | Boundary |
|---|---|---|
| [St Lawrence capture register](../st-lawrence-reference/00-capture-register.md), [process](../st-lawrence-reference/01-process-map.md), [form rules](../st-lawrence-reference/02-form-and-rules.md), [communications](../st-lawrence-reference/03-communications.md) | Observed Enquiry Tracker screens, questions, transitions and emails | Captured behaviour; vendor database/API internals are not established |
| [Rosewood decisions](../st-lawrence-reference/04-rosewood-decisions.md), [editable application](../st-lawrence-reference/05-editable-application-map.md) | Adopt/adapt/reject decisions and five-step source form | Later explicit Rosewood decisions override early pending decisions |
| [Acceptance](../st-lawrence-reference/06-acceptance-process-map.md), [submission](../st-lawrence-reference/07-acceptance-submission-observation.md), [signature architecture](../st-lawrence-reference/10-signature-architecture.md) | Separate acceptance status; familiar shell; first signer followed by additional guardian; immutable review and completion | Proposed storage architecture is distinguished from observed screens |
| [Decline process](../st-lawrence-reference/08-decline-process-map.md), [decline fields](../st-lawrence-reference/09-decline-form-map.md) | Separate three-step decline journey and evidence gaps | Final decline behaviour was not fully captured; not automatically in current acceptance scope |
| [V3 crosswalk](../v3/FIELD-CROSSWALK.md), [V5 audit](../v5/ST-LAWRENCE-FIELD-AUDIT.md), [V6 source compliance](SOURCE-COMPLIANCE.md) | Evolution and correction of mixed workflows and invented fields | V3/V5 are historical prototypes, not current collection contracts |
| [V6 decisions](PRODUCT-DECISIONS.md), [question matrix](QUESTION-MATRIX.md), [schema evolution](SCHEMA-EVOLUTION.md), code and immutable definitions | Current Rosewood rules, versioning and explicit adaptations | Chronological documents contain stale paragraphs; verify the actual version and code |
| Supplied Harkaway Hills/PARED precedent and Rosewood provisional letter | Reference clauses and intended offer correspondence | They do not establish approval of newly adapted Rosewood terms |

The source application has Student, Parent/Guardian, Documents, Conditions and Signature.
The source acceptance repeats that shell but collects less information, adds its own
agreement and requests signed conduct uploads. Rosewood's current instruction removes
those acceptance uploads. It does not remove evidence uploads from the original
Application, require re-collecting all student data, or authorise bundled optional consent.

The source independently verifies additional guardians, presents the complete frozen
agreement, then captures each signature. One signature acknowledgement and aggregate
all-signatures completion are different events. Source usability defects—including
ambiguous “new application” labels and a stale guardian-completeness checkbox—were
explicitly rejected rather than copied.

Rosewood's visual direction is in [V3 product direction](../v3/README.md): navy,
terracotta, sky and cream, the Rosewood emblem, formal serif headings, a persistent
desktop introduction panel and introduction above the form on mobile. The current
family HTML actually uses `rosewood-enrolment-v5.css` plus `rosewood-enrolment-v6.css`.
Its child cards, sticky header, progress, fields, validation and signature controls are
the implementation reference. Staff use their own existing V6 portal stylesheet.

## How the current application works

| Stage | Current behaviour |
|---|---|
| Initial contact | Public EOI, minimal application-link request and community enquiry are three distinct workflows. Historical Qualtrics EOI is another source; absence in V6 does not prove no earlier EOI. |
| Request a link | Name and email only; creates a direct invitation and initial blank Application. Repeated requests retain the family/Application relationship and rotate the link. No inferred EOI match. |
| Staff invitation | Direct or explicitly EOI-linked. EOI prefill requires the deliberate matching link. |
| Access | Private invitation plus matching-email OTP. New/migrated Application invitations have no automatic expiry; OTP, sessions, signature tasks and meetings have separate lifetimes. |
| Family selector | One invitation can contain up to eight distinct child Applications. Each child has its own answers, documents, progress and signatures. No relationship is inferred from a surname or email match. |
| Student | Identity, entry year/level, address/care, future siblings, citizenship/languages, additional needs, sacraments and medical information with conditional rules. Entry year belongs to the child's answer, never the invitation date. |
| Parent/Guardian | Repeated guardians, contact permission and completeness, addresses/demographics/occupation, plus emergency contacts. School contact permission differs from sharing details with other guardians. |
| Documents | Birth certificate required; other evidence categories follow current rules. PDF/JPG/PNG up to 10 MB. No proof-of-address request. Selecting a file starts upload. |
| Conditions | Three required Rosewood application commitment/acknowledgement groups and eleven optional survey questions. Full enrolment terms, fee allocation, media and previous-school permission are not silently included. |
| Signature | Backend validates the complete saved revision and documents, sets the Melbourne signing date, freezes the Application and stores the primary signature. The drawing is not a saved draft answer. |
| Additional guardians | Permitted guardians receive independent signing tasks after primary submission, review the complete frozen Application and sign separately. No-contact suppresses delivery and triggers staff resolution; it does not waive a required signature. |
| Completion | `pending_signatures`, `staff_review_required` and `submitted` are distinct. Application complete does not mean offered, accepted or enrolled. |

Drafts autosave to the server after a pause and during continuous typing. Navigation
flushes changes. Save-and-continue-later closes the child session but preserves the
verified family selector. Opaque session data may survive same-tab refresh; answers
and drawings are not cached in browser storage. Family/child sessions use 90-minute
inactivity and eight-hour absolute limits, with warning/recovery UI. Additional signer
sessions have a separate 30-minute limit. Submitted records are immutable; editable
older drafts can upgrade conditionally while preserving their history.

DynamoDB holds authoritative operational records and revisions, with a separate audit
table. Restricted Drive stores final files, snapshots and signature images. Encrypted
Sydney S3 is a temporary upload/preview buffer. Sheets are reporting projections.

## Emails and tracking

Sender configuration is documented in [SES readiness](SES-PRODUCTION-READINESS.md):
`Rosewood College Enrolment <enrolment@ffe.org.au>`, replying to that address; operational
mailbox `info@ffe.org.au`. Lambda sends using its role through Sydney SES. The dated
readiness record is not proof of today's mailbox or DNS state.

OTPs send synchronously. Workflow invitations, receipts, family messages and associated
reporting/Slack work use a durable outbox, attempted immediately and retried every
minute. Eight failed attempts become retained terminal work. SES feedback distinguishes
send, destination-server delivery, delay, bounce, complaint, rejection and rendering
failure. Delivery is not proof of reading or inbox placement.

The existing Family communications workspace already supports deliberate sibling
selection under one invitation, contact-permission intersection, exact HTML/text
previews, saved review evidence, explicit send, transactional child links and separate
recipient copies. This is the design and integrity model for offer communication;
the existing application-review template itself is not an acceptance workflow.

Staff already have separate Admissions overview, Applications/review, Family
communications, Principal meetings, link requests and Cohort planning. Review and
meeting records do not alter signed Applications. Prospective children are separately
stored and deliberately linked to avoid forecast double-counting.

Current Application tracking distinguishes requested, invited, started/saved, primary
submission, each signing task's delivery/open/verification/signature and final
completion. A saved section or derived progress percentage is not a completed
application. The staff overview has five application stages; it has no production
post-offer stage yet. Pending and completed Application Slack notifications are also
separate, and Slack is not authoritative.

For offers, retain separate dimensions rather than one ambiguous “sent” flag:

- **Communication:** reviewed, queued, handed to SES, delivered, delayed or failed.
- **Access:** OTP verified and child agreement opened; opening is not proof of reading.
- **Acceptance:** not signed, partly signed, every required signature recorded.
- **Commencement:** still conditional or subsequently confirmed; never inferred from signing.

Google Analytics cannot identify missing applicants from ordinary page counts. The
October investigation found no public request-attempt/success/failure instrumentation.
Private form/signing/staff pages intentionally exclude ordinary analytics. Named
tracking belongs in protected operational records; any future public failure telemetry
should be anonymous and exclude names, email, answers and private URLs.

## Alignment with the present request

| User need | Reuse | Remaining work / candidate assessment |
|---|---|---|
| Staff trigger and track a family offer | Staff roles, explicit family selection, reviewed-send pattern, outbox/SES | Integrate an Offers workspace into the existing portal and link its history to selected children; current candidate has a standalone staff page. Keep Application Review separate. |
| Congratulatory email with supplied letter | Existing sender and separate-recipient delivery | Candidate generates a personalised family PDF and exact preview. Verify intended letter adaptations, dates and current wording before issue. |
| Familiar family portal and child selection | Current shell and child-card design; existing canonical invitation relationship | Candidate now reuses CSS locally but still has a separate entry/session/UI. Provide clear navigation and offer-specific status within the familiar experience; a separate secure route is acceptable. |
| No acceptance uploads | Already captured student/application evidence | Candidate complies. Do not remove original Application uploads or request signed policy PDFs. |
| Succinct online terms | Current policy-reader conventions | Candidate has nine main sections plus policy readers. Verify controlled source versions, fees and adapted clauses; do not substitute headings or an unreadable legal block. |
| Independent digital signatures | Frozen revisions, explicit contact permission, OTP and signature evidence | Candidate has separate immutable child offer packets and signature records. Preserve these boundaries. |
| Simple signing sequence | Existing first-submitter then additional-guardian pattern | Candidate queues all guardian invitations at issue. Recommend primary family offer first, additional requests after primary acceptance, grouping eligible siblings where practical. This sequence is a recommendation awaiting final design, not already implemented. |
| Clear final confirmation | Current Application completion pattern and source acceptance mapping | Candidate sends a personal signature receipt only. Add an idempotent all-required-signatures completion event/receipt, distinct from that personal receipt. |
| Safe correction and return | Existing sign-out, expiry warning, status and pending-email correction conventions | Candidate lacks family logout, equivalent expiry/refresh recovery, and a defined pre-signing correction route. Add these without rewriting submitted Application evidence. |
| Signed record | Frozen packet and signature metadata | Candidate browser print exists; specify a durable, complete acceptance copy and reliable later access. Current print is not yet equivalent to the mapped full signed-form experience. |
| One formal acceptance stage | Separate conditional agreement | Keep one agreement per child signed by required guardians. Later unchanged commencement confirmation should not request signatures again. Formal commencement status remains unimplemented. |

Recommended family journey: private offer email with letter → matching-email OTP →
choose an offered child → confirm child/guardian context and read concise terms, fees
and policies → sign → see remaining signatures and return to siblings. Reuse existing
data rather than repeating the full Application. A correction request must be recorded
separately and resolved before the affected agreement is signed. Do not add arbitrary
children to acceptance without an issued offer.

Retain both user-selected bond options and the requested draft full-term withdrawal
notice. Payment/refund periods, current fee schedule, discount interactions and the
conditional legal structure still need their recorded review. Candidate sample values
are not approved defaults. Optional media/marketing and previous-school permissions
remain explicit, separate later work unless intentionally brought into scope.

## Concrete outstanding issues

1. **Request-reporting defect confirmed in source.** `service.mjs` emits Operations /
   Application Link Requests; `google-sheets.mjs` lacks that tab/header, and
   `scripts/rebuild-google-projections.mjs` omits it. The October checkpoint found 26
   retained failures; that is historical, not a current count. DynamoDB and the staff
   request list remain authoritative. Fix and reconcile only reporting; do not replay
   family requests/emails to reconstruct rows.
2. **Alarm delivery repair not evidenced.** The October incident recorded CloudWatch
   failures publishing to the encrypted security topic. Canonical `template.yaml`
   still uses `alias/aws/sns` for that topic; the candidate does not change it. Plan a
   scoped customer-managed key repair and verify an actual alarm-to-inbox transition.
   Today's live topic/actions were not inspected. Healthy alarm state alone proves
   neither delivery nor resolution of retained failures.
3. **Candidate integration/completion gaps.** Staff navigation/history, staged signer
   invitations, aggregate completion mail, correction handling, family session/logout
   parity and signed-record access need completion before release.
4. **Offer exceptions and lifetimes.** Current candidate rejects non-2027 offers,
   non-submitted Applications, prohibited-contact signers and shared guardian emails.
   It closes unsigned access at `acceptBy`. These limits need a visible staff exception
   path and deliberate acceptance-deadline policy. The user's no-expiry decision for
   Application invitations does not establish an offer deadline.
5. **Controlled content.** Cached July policy text needs current-source verification;
   the supplied FINAL letter contained a DRAFT marker. Standard PDF fonts currently
   reject names outside Windows-1252. Resolve these before actual recipients are issued.
6. **Operational assurance.** Verify schedules, queue age, retained failures, backup
   status and real alert delivery; then run an authorised synthetic full journey with
   attachment delivery, OTP, two children/two guardians, retries, return access and
   complete signed-record retrieval. Local mocks do not establish SES/Drive readiness.

## Documentation conflicts to reconcile

- Root `Rosewood enrolment/README.md` describes legacy V1 and Sheets/local-storage
  behaviour. It is not the V6 implementation guide.
- V6 README/backend README/runbooks contain superseded paused-public-request wording,
  14-day Application invitation statements and older “current version” numbers.
- Earlier Conditions prose requiring three influences predates the current optional
  survey. Source fee/previous-school fields are not current Application requirements.
- Historic staff-review proposals describe communication controls inside a case;
  later explicit decisions separate Review, Communications and Meetings.
- The data map lists the missing request-reporting tab as implemented and implies a
  complete rebuild. Code confirms the coverage gap.
- Historical readiness prose claims delivered alerts; the later October failure
  supersedes that assurance until repair is verified.

Keep historical evidence, but add clear current-state routing and superseded labels
as part of reconciliation. Do not rewrite every historical decision as if it never
existed or silently declare all governance questions resolved.

## Next implementation order and continuity

1. Use this assessment to settle the screen/state/email contract and exception paths.
2. Refactor the local candidate into existing staff navigation and family design;
   retain independent offer entities and frozen signature evidence.
3. Finish completion, session, correction and signed-copy behaviour; finalise controlled
   correspondence/terms/fee versions.
4. Repair reporting and alarm-delivery gaps through reviewable changes; verify actual
   production state and synthetic external delivery/storage before an offer campaign.
5. Release with deliberate pinned asset/version changes where existing V6 files change.
   Issue family offers only through the reviewed staff action.

Earlier candidate evidence recorded 213 backend tests, a locked build and synthetic
desktop/mobile checks. Subsequent local design changes reuse existing styles but have
not completed their full validation: a comparison harness stopped on an invalid
enabled-versus-disabled button-colour comparison. Do not report the latest UI as fully
verified from the earlier test result. No production application code was changed by
this context assessment.

## Implementation follow-through — later 8 November

After this assessment the user authorised implementation (“ok let's do it”). Existing
staff navigation/history, staged guardian requests, all-signatures receipts, downloadable
records, correction review and family session recovery are now implemented and locally
tested. The earlier gap descriptions above are historical. New EOI `.29` / Application
`.30` definitions preserve every previous hash. Reporting/alarm repairs are prepared,
not applied. See [current implementation checkpoint](POST-OFFER-IMPLEMENTATION-2026-11-08.md)
for tests and unresolved content/external-release requirements.
