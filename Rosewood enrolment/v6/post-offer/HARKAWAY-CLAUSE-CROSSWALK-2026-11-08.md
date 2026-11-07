# Harkaway Hills to Rosewood: clause coverage audit

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


Prepared 8 November 2026 after the user challenged the nine-section draft's fidelity.
This is a source comparison, not approval of the source clauses or a legal opinion.

**Follow-through:** the user authorised the redraft. See [fourteen-section review notes](FOURTEEN-SECTION-REVIEW-NOTES.md) for the new prototype wording and complete topic trace. The comparison below describes the earlier nine-section draft.

## Result

The current nine-section Rosewood draft does **not** reproduce every point in the supplied
Harkaway Hills/PARED agreement. It merges topics, omits provisions and materially changes
several remedies and obligations. The earlier high-level reconciliation did not make those
differences sufficiently explicit. Coverage by a general statement or policy reference is
not treated here as equivalent to the source's exact requirement.

## Evidence and scope

- Source: the user-provided Harkaway Hills offer PDF, contract sections 1–14, repeated
  for the two guardians. Private family details, acceptance metadata and signatures
  are excluded from this repository note. The full unique clauses were read, and the
  source's compact grey-text presentation was inspected.
- Target: `agreement-draft.json` and the same main text in the offer-contract/review
  assets, including the seven policy readers. § references below mean Rosewood draft
  section numbers. Existing source policies are cached July extracts, not newly verified
  current approvals.
- The PDF's introductory letter and contract disagree on the acceptance fee ($500/$300).
  Neither amount should be imported as Rosewood policy.
- The source's asserted transfer-reporting requirement is recorded as source wording;
  its current regulatory basis was not independently verified in this comparison.

## Clause-by-clause comparison

| Harkaway clause | Source topic | Coverage | Current Rosewood treatment | Action before final wording |
|---|---|---|---|---|
| 1.1 | Acceptance by both parents; exceptions; joint and several liability | Partly covered / omitted | §1 requires independent guardian acceptance and College-reviewed exceptions. No joint-and-several liability provision. | Decide and review allocation of financial responsibility; do not imply this provision exists. |
| 1.2 | Non-refundable acceptance fee, 14-day deadline and existing-family exemption | Replaced | §§2–3 instead propose conditional payment and Rosewood refundable bond options. No equivalent acceptance fee. | Use Rosewood approved financial policy; source letter says $500 while terms say $300. |
| 1.3 | Deferral to another entry year and waiting-list outcome | Omitted | No deferral/waiting-list provision. | Add the College-approved deferral process if applicable. |
| 2.1 | School discretion to cancel before starting if student needs cannot be met | Materially changed | §4 provides reasonable adjustments and legal qualifications, not the same discretionary cancellation power. | Review with Rosewood enrolment/support policy; not a simple operator-name substitution. |
| 2.2 | Request reports/assessments to determine student needs | Partly covered | §5 requires current support information; no express report/assessment request process. | State a proportionate information and consultation process. |
| 2.3 | English competence prerequisite, intensive course and cancellation | Omitted | No language prerequisite or cancellation term. | Do not import without a deliberate education-policy and legal decision. |
| 3 | Termination when needs can no longer be met, on one term notice | Materially changed | §§4,7 use adjustment/support and fair-process provisions; no equivalent standalone power/notice. | Review any needs-related termination process separately. |
| 4.1 | Board-set fees and discounts with annual revision | Partly covered | §3 specifies a year-specific fee schedule; no explicit annual fee-setting/notification mechanism. | Define fee-setting authority and annual notice rather than treating a generic schedule as complete. |
| 4.2 | Extracurricular/elective fees and annual changes | Partly covered | §3 refers to disclosed charges; categories and annual changes are not explicit. | Include actual charge categories and notice in the fee schedule. |
| 4.3 | Reimbursement of all medical expenses | Materially changed | §5 refers to reasonable charges subject to law and insurance. | Confirm the intended cost allocation; no blanket reimbursement clause was retained. |
| 4.4 | Payment methods in the fee structure and annual amendment | Partly covered | §3 requires payment arrangements but does not set the methods or annual amendment process. | Complete the controlled fee schedule. |
| 4.5 | 60-day arrears suspension and cancellation for broken payment arrangements | Materially changed / omitted detail | §§3,7 cover hardship, arrears and fair process; no 60-day threshold or cancellation without further notice. | Set an approved overdue-fee process. |
| 4.6 | No fee remission for illness, leave or suspension | Omitted | No explicit absence/remission term. | Make the remission policy explicit if adopted. |
| 4.7 | Six weeks notice/fees to discontinue extra-cost activities | Omitted | No activity-specific cancellation term. | Add only if it matches Rosewood activities and charging practice. |
| 5.1 | Written destination-school and year-level notification | Omitted | No transfer/destination notification requirement. | Confirm current transfer process; the source’s regulatory assertion was not independently verified here. |
| 5.2 | Full-term withdrawal notice expiring at term-end | Covered with clarification | §8 specifies full-term written notice and last day of preceding term. | User approved drafting one term notice; final wording still needs review. |
| 5.3 | Full term fees for insufficient withdrawal notice | Materially changed | §8 proposes net unserved tuition capped at one term with hardship/mitigation and other qualifications. | Show this change explicitly; it is not the same fixed full-term charge. |
| 6.1 | Compliance with school rules | Covered generally | §4 plus student/conduct policies address rules and directions. | Ensure the operative rules are identifiable and available. |
| 6.2 | Courtesy to students/staff | Covered | §4 and Student Code of Conduct cover respectful conduct. | Retain concise wording. |
| 6.3 | No conduct bringing school into disrepute, including media | Materially changed | Conduct/ICT policies cover harmful conduct; no equivalent general reputation restriction. | Use specific conduct obligations and preserve legitimate complaints. |
| 6.4 | Support school goals and values | Covered generally | §4 refers to published educational philosophy and learning partnership. | Consider stating Rosewood’s actual educational ethos explicitly. |
| 6.5 | Required assemblies, sport, events, Masses, camps and excursions | Partly covered | §4 says participate appropriately; §5 mentions activity consent. No matching compulsory-activity list. | Specify intended participation and reasonable exemptions. |
| 6.6 | Uniform and appearance including travel | Partly covered through policies | Student/Parent Codes mention uniform; exact travel/appearance scope is not in main terms. | Reference the controlled Uniform Policy if intended. |
| 6.7 | Attendance except sickness, authorised leave or exemption | Covered generally | §4 and codes cover attendance; detailed leave/exemption procedure is absent. | Align with the attendance/leave procedure. |
| 7.1 | Board/principal directions and non-interference in administration | Partly covered / softened | §4 covers reasonable directions/respectful communication; no blanket non-interference obligation. | Retain reasonable boundaries without excluding complaints. |
| 7.2 | Support school values/activities and Parent Code | Covered generally | §4 incorporates Parent Code and support for learning. | Confirm specific ethos/participation expectations. |
| 7.3 | Read policies, amendments, correspondence and fortnightly newsletter | Partly covered | §6 includes policies; no newsletter frequency or regular correspondence obligation. | Include a concise school-communications expectation if desired. |
| 7.4 | Separate signed ICT policy | Deliberately replaced | §6 incorporates online policy readers without signed document uploads. | User explicitly removed acceptance uploads; retain electronic agreement scope. |
| 7.5 | Written contact updates and cancellation if contact is lost | Partly covered / omitted remedy | §5 requires updated contact details, without the written method or cancellation remedy. | Define update channel and reasonable contact-recovery process. |
| 7.6 | Notify student absence | Covered through policy | Parent Code contains absence notification; main terms only general attendance. | A brief explicit sentence would improve coverage visibility. |
| 7.7 | Notify/provide custody and court orders and updates | Partly covered | §5 requires accurate parental-responsibility details and secure discussion of court orders; provision of copies is not explicit. | Specify secure provision where necessary and lawful. |
| 7.8 | Provide uniform, books and stationery | Partly covered | Uniform support appears in codes; full equipment obligation is not explicit. | Clarify required supplies in the handbook/fee schedule. |
| 7.9 | Courteous communications under school guidelines | Covered | §4 and Parent Code cover respectful communication. | Retain. |
| 7.10 | Termly parent-mentor meetings and Key Parent Functions | Omitted specificity | Mentoring/discussion appears in policies; no termly attendance requirement or Key Parent Functions obligation. | Decide Rosewood participation expectations and reasonable alternatives. |
| 7.11 | Encouraged family-enrichment courses | Omitted | No named family-enrichment programme. | Include only if Rosewood actually offers/endorses it. |
| 7.12 | No social-media denigration | Adapted through policies | Codes address respectful/harmful communications; main terms expressly permit good-faith complaints. | Use specific behaviour wording; not a blanket ban on criticism. |
| 8.1 | Immediate special-needs/medical updates | Covered generally | §5 requires current medical/support information; exact immediacy is not stated. | Specify urgent updates for material health/safety changes. |
| 8.2 | Health form before commencement and updates | Partly covered | Application collects health information; §5 requires updates. No explicit acceptance-stage pre-start confirmation deadline. | Decide the pre-commencement health confirmation process; no new upload step assumed. |
| 8.3 | Authority for urgent treatment and broad indemnity | Materially changed | §5 permits urgent assistance while retaining duty of care; broad indemnity is not copied. | Review medical authority and reasonable cost responsibility. |
| 8.4 | Security procedures and Child Safe Code | Covered through policies | §§4,6 and Parent/Child Safety Codes cover safety and site procedures. | Confirm current site/policy versions. |
| 8.5 | Personal property responsibility and no school liability for loss | Partly covered / exclusion omitted | Student Code mentions property; no blanket school-liability exclusion. | Consider appropriate property guidance without importing a broad exclusion. |
| 8.6 | Reasonable-ground searches of bags/lockers/possessions | Omitted | No equivalent search power in the reviewed terms/policy readers. | Only add a policy-aligned, reviewed search provision. |
| 9.1 | School discretion over educational programmes/activities | Partly covered | §4 generally promises education consistent with published philosophy/curriculum. | Clarify school programme-setting role. |
| 9.2 | Programme/content changes without notice | Not retained | No equivalent unlimited programme-change provision; §8 governs material agreed-obligation changes. | Define proportionate flexibility and notice. |
| 9.3 | Compulsory camps/excursions/outdoor education unless exempted | Partly covered | Participation and additional consent are general; no equivalent compulsory attendance/exemption rule. | Use the actual activity and exemption policy. |
| 10 | Report delivery and separated-parent distribution | Omitted | No explicit academic-report delivery/distribution clause. General contact restrictions are not equivalent. | Add report-access wording consistent with lawful orders and authorised access. |
| 11 | Apply to Principal for leave from academic/co-curricular activities | Omitted | No explicit planned-leave application procedure. | Add concise attendance/leave wording matching practice. |
| 12.1 | Suspension/termination for serious breaches, reputation or breakdown with parents | Materially adapted | §7 retains serious/repeated breach and lawful grounds, with proportionality and student-welfare considerations. | Reconcile exact grounds with approved policies; avoid assuming source wording is adopted. |
| 12.2 | Notice and opportunity to respond before expulsion | Covered / expanded | §7 adds written reasons, review options and prompt review of urgent protective action. | Check consistency with approved procedure. |
| 12.3 | Immediate termination for omitted/misleading special-needs information | Not retained | §5 requires accurate disclosure; no matching immediate termination power. | Review consequences and fair process rather than silently restoring the power. |
| 12.4 | Complaints escalation on termination/procedural fairness | Covered | §7 and Complaints and Grievances Policy provide escalation/review. | Verify current controlled policy. |
| 13 | Terms changed on two terms notice for existing/future families | Materially changed | §8 requires express agreement for material obligations; no unilateral two-term mechanism. | Choose and review the actual variation process. |
| 14 | Definitions of parent, school and student | Partly covered | §1 identifies parties and child; the draft lacks a dedicated definitions section. | Restore a short definitions section with Families for Education Ltd and Rosewood identities. |

## Recommended next drafting structure

Use the source's fourteen headings in the same order, with concise Rosewood-specific
wording underneath. Add Rosewood's provisional-registration/commencement condition and
approved bond arrangements explicitly; do not substitute those for Harkaway's distinct
student-needs conditional-enrolment topic. Keep the no-upload electronic acceptance
workflow. Mark every omitted or changed source provision in this crosswalk until resolved.

Specific Rosewood decisions still needed include financial liability allocation, deferrals,
fee remission, arrears and activity cancellation, mentor/function expectations, reports,
leave, property/search provisions and variation procedures. Source cancellation,
indemnity, language-entry and unilateral-change provisions require focused policy/legal
review before use; another school's example does not establish suitability for Rosewood.

## Acceptance wording and presentation proposal

A single checkbox can be labelled: **I agree to the Terms and Conditions of Enrolment.**
Place the complete terms directly above it, with the offer/fee schedule and included policy
versions clearly identified in the agreement. Keep a distinct electronic-signature intent
and final action such as **Accept offer and sign**. Removing “I have read” from the UI is
not a conclusion that a specific contract is enforceable; legal adequacy depends on the
whole agreement and process. No need to add forced-scroll or reading-timer friction.

Compact grey typography can reduce clutter while staying legible. Deliberately obscuring
obligations is not the design objective. The ACCC explains that agreement can be expressed
by a website action and that transparency is considered in unfair-term assessment:
[Contracts](https://www.accc.gov.au/consumers/buying-products-and-services/contracts)
(accessed 8 November 2026). Only a court can finally determine unfairness; this audit does
not declare any individual Harkaway term unlawful.

No form wording, backend or live agreement was changed during this audit.
