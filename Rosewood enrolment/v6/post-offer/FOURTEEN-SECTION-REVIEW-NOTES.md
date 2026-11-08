# Fourteen-section Rosewood terms — review notes

## Current acceptance workflow

Families accept the provisional offer and terms now; financial choices come later.
Staff do not enter acceptance or registration-condition deadlines, fee schedules,
bond selections/credits, or payment/refund periods. New offers have no automatic
acceptance expiry; registration and written commencement confirmation remain conditions.
Agreement 2026.5 is active; current assets are EOI 2026.31 / Application 2026.32.
See [current release and verification](NO-OFFER-DEADLINES-2026-11-08.md).
Older financial/deadline requirements below are historical and superseded.


## Production activation checkpoint

The acceptance implementation is deployed to AWS and GitHub Pages through PR #56.
On 8 November 2026 the user approved the final terms and real offer issuance was
**enabled** with the exact approved contract hash. EOI `2026.29` / Application `2026.30`
remain live. No production family was selected or emailed during activation. The 283
regression tests and live manual/scheduled canaries passed.
See [exact approval and activation evidence](OFFER-ACTIVATION-2026-11-08.md).
See [current release and operating evidence](PRODUCTION-RELEASE-2026-11-08.md).
Earlier local-only, inactive-runtime and pending-Google statements below are historical.
The user’s final-terms approval is recorded; staff still review and explicitly send each family offer.


## Current status — 8 November 2026

The fourteen-section draft is now integrated across the backend contract, online
reader and signed PDF, generated from `post-offer/agreement-draft.json`. Runtime
`c46a705` is deployed to the separate inactive test stack; it is not on production.
The seven policy originals and all 75 pages are verified. User-approved Bridge Road publication copies and pinned PDF/Word download metadata
are now included in the local release candidate. Final wording approval is still open: implementation is not policy adoption.

The current registration introduction is exactly:

> Rosewood College is preparing to welcome its first students in 2027, subject to
> registration approval from the Victorian Registration and Qualifications Authority
> (VRQA). We will provide written confirmation of the commencement date and final
> enrolment arrangements once these are confirmed.

The earlier “acceptance does not guarantee opening on the proposed date” sentence
was rejected and is not the current introduction. The concrete clause-review table
below remains the list of proposed substantive departures requiring review. Prototype
and test-count statements below describe earlier checkpoints, not current deployment.
See [current release gates](CURRENT-RELEASE-GATES-2026-11-08.md).

## Historical prototype changes

- All fourteen Harkaway headings appear in their original order, with numbered paragraphs.
- The checkbox now says **I agree to the Terms and Conditions of Enrolment.**
- The full text is displayed in compact, readable grey type, with enlarge/print controls.
- Previously missing topics are now addressed explicitly: deferral, payment responsibility,
  fee review/absence/activity cancellation, student participation, parent mentoring/functions,
  health confirmation, property/search procedures, academic reports and planned leave.
- Rosewood’s conditional commencement and both bond options remain explicit. No upload
  step or additional signed policy document is introduced.
- The student/guardian editing and Add parent/guardian mockup remain available.

## Published fee schedule verified — 8 November 2026

The live fee page, linked two-page PDF and calculator HTML were retrieved and byte-matched
to repository copies. Sources: https://ffe.org.au/pages/rosewood-fee-schedule.html and
https://ffe.org.au/Files/Fees/Rosewood-College-2027-Fee-Schedule.pdf.

- 2027 Prep–Grade 5: $6,990 tuition less $1,000 foundation-year reduction for every
  student, plus $910 resource levy = $6,900 before further tuition reductions.
- Siblings: 0%, 15%, 30%, 45%, 100% for fifth/subsequent children; levy remains payable.
- Option A: $2,000 once per family, no tuition discount, returned when the last child leaves.
- Option B: $10,000 gives the first child 5% tuition reduction; $20,000 total gives all
  siblings 5%. The family maximum is $20,000 regardless of child count. First $10,000
  returned when first child leaves; second $10,000 when last child leaves.
  Earlier candidate wording “$10,000 per child” is incorrect and superseded.
- Tuition each term and full levy in Term 1, due within 14 days. Annual payment at the
  start of Term 1 gives another 5% tuition reduction. Website/calculator apply foundation
  reduction first, then sibling, bond and annual reductions, rounding each percentage stage.
- Levy includes camps, excursions, books, stationery and IT; uniforms are separate.
  Draft optional-activity charges must not duplicate these levy inclusions.

Only the non-saving fourteen-section review prototype was aligned. Backend candidate,
shared nine-section contract, approval hashes and production remain unchanged and need
alignment before enablement. The preview displays published rates, not a calculated
personal family quote. Family bond/payment choices and existing credits still need to be
recorded. The acceptance deadline, refund processing period and deduction rules are not
specified by these sources. Proposed clause 2 postponing payment until commencement is
confirmed remains a review choice: the published bond wording says when first enrolled/
first year, and does not itself establish this postponement.

## Review these concrete choices

These are proposed clauses for discussion, not findings that Rosewood has adopted them.

| Clauses | Proposed treatment to review |
|---|---|
| 1.1 | Restored close to Harkaway 1.1: both Parents accept where appropriate, with College waiver, and signatories are jointly and severally liable for the agreement’s obligations. Removed the separate-signing instruction and the assistant’s expanded full-fees/payment-exception/no-double-recovery explanation. This retains the source liability provision for review; it is not an independently approved Rosewood policy. |
| 1.2, 4.8–4.9 | No additional non-refundable acceptance fee. Published bonds: $2,000 per family; or $10,000 for first-child tuition discount / $20,000 for all siblings, capped at $20,000. Published refund triggers and discount order are now mapped. Confirm refund processing periods and any deduction rules. Harkaway’s conflicting $500/$300 fee is not copied. |
| 2.4–2.6 | Registration/commencement conditions; no payment before confirmation; termination/refund if the deadline fails. Dates and refund periods must be stated in the issued schedule. These financial protections remain proposed wording. |
| 2.1–2.3, 3 | Consultation, reports and support replace automatic English-language exclusion or broad needs-based cancellation. Needs-related termination has a fair process and at least one full term notice, where lawful. |
| 4.1 | Annual fee/discount notice before the following year’s re-enrolment or withdrawal decision is required. Confirm the actual school calendar/process. |
| 4.5 | Formal arrears review after 60 days, with reminders, dispute/hardship consideration and no automatic cancellation. |
| 4.6 | Absence does not automatically reduce tuition, with remission/hardship review and preserved legal rights. |
| 4.7 | Six weeks notice for separately charged optional recurring activities only where disclosed before joining; charges qualified by actual unserved notice, savings and hardship. Confirm whether Rosewood needs this rule. |
| 5.2–5.4 | User-approved draft full-term notice retained. Short-notice charges use net unserved tuition capped at a term, not an unconditional full-term penalty. Before-start treatment must be specifically disclosed. |
| 7.10–7.11 | Termly parent-mentor meetings and key functions expected, with reasonable alternatives; optional family-enrichment opportunities only where offered. Confirm actual programme names and expectations. |
| 8.2 | Pre-commencement confirmation of current health/care information; this is not a new acceptance upload requirement. |
| 8.3, 8.5 | Reasonable medical costs and property responsibilities, without broad negligence indemnities or absolute liability exclusions. |
| 8.6 | Lawful, reasonable safety inspections only under the College’s procedures; this is not a stand-alone authority to search. Confirm the procedure and obtain focused legal review. |
| 10 | Secure reports to each entitled Parent, subject to lawful restrictions; one Parent cannot unilaterally remove another’s entitlement. |
| 12 | Defined grounds, response opportunity, reasons, review and proportionality replace broad immediate cancellation powers. |
| 13 | Normally two terms notice of proposed material changes, plus express agreement for changed obligations. This deliberately differs from unilateral amendment on notice alone. |

Current policy readers remain cached source extracts. Their controlled versions and fee
schedule must be verified before release. This proposal is not a legal opinion or approved
standard-form contract; targeted legal review is needed for liability, charges, termination,
medical authority, search and variation provisions.

## Complete topic trace

Every one of the 53 source entries from the earlier audit has a destination below.
A destination means the **topic is addressed**, not that the source’s exact powers or
obligations have been copied. The differences above remain deliberate review items.

| Harkaway clause | Topic | Revised Rosewood clause(s) |
|---|---|---|
| 1.1 | Acceptance by both parents; exceptions; joint and several liability | 1.1 |
| 1.2 | Non-refundable acceptance fee, 14-day deadline and existing-family exemption | 1.2; 2.5–2.6; 4.8–4.9 |
| 1.3 | Deferral to another entry year and waiting-list outcome | 1.3 |
| 2.1 | School discretion to cancel before starting if student needs cannot be met | 2.1 |
| 2.2 | Request reports/assessments to determine student needs | 2.2 |
| 2.3 | English competence prerequisite, intensive course and cancellation | 2.3 |
| 3 | Termination when needs can no longer be met, on one term notice | 3.1–3.2 |
| 4.1 | Board-set fees and discounts with annual revision | 4.1 |
| 4.2 | Extracurricular/elective fees and annual changes | 4.2 |
| 4.3 | Reimbursement of all medical expenses | 4.3 |
| 4.4 | Payment methods in the fee structure and annual amendment | 4.4 |
| 4.5 | 60-day arrears suspension and cancellation for broken payment arrangements | 4.5 |
| 4.6 | No fee remission for illness, leave or suspension | 4.6 |
| 4.7 | Six weeks notice/fees to discontinue extra-cost activities | 4.7 |
| 5.1 | Written destination-school and year-level notification | 5.1 |
| 5.2 | Full-term withdrawal notice expiring at term-end | 5.2 |
| 5.3 | Full term fees for insufficient withdrawal notice | 5.3 |
| 6.1 | Compliance with school rules | 6.1 |
| 6.2 | Courtesy to students/staff | 6.2 |
| 6.3 | No conduct bringing school into disrepute, including media | 6.3 |
| 6.4 | Support school goals and values | 6.4 |
| 6.5 | Required assemblies, sport, events, Masses, camps and excursions | 6.5 |
| 6.6 | Uniform and appearance including travel | 6.6 |
| 6.7 | Attendance except sickness, authorised leave or exemption | 6.7 |
| 7.1 | Board/principal directions and non-interference in administration | 7.1 |
| 7.2 | Support school values/activities and Parent Code | 7.2 |
| 7.3 | Read policies, amendments, correspondence and fortnightly newsletter | 7.3 |
| 7.4 | Separate signed ICT policy | 7.4 |
| 7.5 | Written contact updates and cancellation if contact is lost | 7.5 |
| 7.6 | Notify student absence | 7.6 |
| 7.7 | Notify/provide custody and court orders and updates | 7.7 |
| 7.8 | Provide uniform, books and stationery | 7.8 |
| 7.9 | Courteous communications under school guidelines | 7.9 |
| 7.10 | Termly parent-mentor meetings and Key Parent Functions | 7.10 |
| 7.11 | Encouraged family-enrichment courses | 7.11 |
| 7.12 | No social-media denigration | 7.12 |
| 8.1 | Immediate special-needs/medical updates | 8.1 |
| 8.2 | Health form before commencement and updates | 8.2 |
| 8.3 | Authority for urgent treatment and broad indemnity | 8.3 |
| 8.4 | Security procedures and Child Safe Code | 8.4 |
| 8.5 | Personal property responsibility and no school liability for loss | 8.5 |
| 8.6 | Reasonable-ground searches of bags/lockers/possessions | 8.6 |
| 9.1 | School discretion over educational programmes/activities | 9.1 |
| 9.2 | Programme/content changes without notice | 9.2 |
| 9.3 | Compulsory camps/excursions/outdoor education unless exempted | 9.3 |
| 10 | Report delivery and separated-parent distribution | 10.1–10.2 |
| 11 | Apply to Principal for leave from academic/co-curricular activities | 11.1 |
| 12.1 | Suspension/termination for serious breaches, reputation or breakdown with parents | 12.1 |
| 12.2 | Notice and opportunity to respond before expulsion | 12.2 |
| 12.3 | Immediate termination for omitted/misleading special-needs information | 12.3 |
| 12.4 | Complaints escalation on termination/procedural fairness | 12.4 |
| 13 | Terms changed on two terms notice for existing/future families | 13.1–13.2 |
| 14 | Definitions of parent, school and student | 14.1–14.4 |

## Reference checks

- [ACCC contracts guidance](https://www.accc.gov.au/consumers/buying-products-and-services/contracts): clarity/transparency and unfair-term review. This does not establish that any individual source term is unlawful or any draft clause is enforceable.
- [Disability Standards for Education, current compilation](https://www.legislation.gov.au/F2005L00767/2026-08-01/2026-08-01/text/original/epub/OEBPS/document_1/document_1.html): consultation and reasonable adjustments inform the support wording; the draft is not a complete statement of the Standards.

Both checked 8 November 2026. The supplied Harkaway PDF is the structural reference;
private family data, signatures, access metadata and completed-form details are excluded.

## Fee correction verification

After the published-fee correction, browser checks passed at 1440, 390 and 320px: editable details, fourteen sections, signature preview, refresh reset, no overflow, no browser persistence and no external requests. Dedicated assertions verified the $6,900 total, $20,000 family bond cap and absence of the incorrect $10,000-per-child wording in the review terms. Both PDF pages and the updated desktop summary were visually inspected. Static references, public-data scan and whitespace checks passed. No backend or production changes were made for this correction.

## Signing-process wording correction

The user clarified that acceptance is complete only when all required guardians have
signed (normally both). Individual signature collection is an implementation detail, not
a reason to rewrite contractual obligations. Do not call a first guardian signature the
completed family acceptance. The backend candidate already derives `signed_conditional`
only when signature count equals required signer count; otherwise it retains
`awaiting_signatures`. This inspection did not change or deploy backend code.

Review changes:
- 1.1: restored source-based both-Parents acceptance/College waiver and joint-and-several
  obligation wording. Removed separate-signing mechanics and invented financial expansion.
- 1.4: retained agreement composition, removed signature-version recording, copies and uploads.
- 7.4: retained policy obligation, removed online/upload instructions.
- 4.4: removed the internal word “proposed”; the clause 2 payment condition itself remains
  a draft policy choice, not an approved or published fee rule.
- 4.9: removed source-gap/editorial commentary. Refund processing periods and any
  deductions remain unresolved in these review notes; no new rule was invented.
- 4.10: states the verified discount order directly, without narrating website sourcing.
- 7.8: removed the implication parents separately purchase books/stationery already
  included in the resource levy. Uniform and separately disclosed non-levy materials remain.
- Preview: removed repeated separate-signing/upload explanations and changed the finish
  screen to describe one signature preview, with acceptance pending all required signatures.

The full fourteen-section text was reviewed for process/editorial wording. Other substantive
changes from Harkaway (commencement/payment protections, student-needs provisions, arrears,
withdrawal, termination and variation) remain explicit draft policy choices in the review
table. They have not been silently reverted or treated as approved in this correction.

## Historical provisional clarification — introduction since superseded

The user approved labelling the offer Provisional Offer of Enrolment and changing the
place-acceptance statement to “I / We accept the provisional offer of a place for my / our
child at Rosewood College.” A clearly styled introduction immediately before section 1
states that the offer depends on VRQA registration and written commencement confirmation,
and acceptance does not guarantee opening on the proposed date. The terms heading remains
Terms and Conditions of Enrolment. The offer overview also identifies the provisional
status before the agreement checkbox/top Continue button. Clause 2 remains unchanged.
That checkpoint affected only the local review prototype. The later approved introduction
shown at the top of this document supersedes its opening-date disclaimer; the current
fourteen-section draft is integrated into the separate inactive test runtime.
