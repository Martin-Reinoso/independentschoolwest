# Rosewood system and fee boundary

Verified 12 September 2026 against canonical repository commit `af96814` and public, non-writing health checks. This map contains no family records. The original working directory was on an older enrolment branch with unrelated edits; billing work uses `codex/rosewood-billing` in a separate worktree based on `origin/main`.

## Existing applications

The public website is hosted from this repository at `ffe.org.au`. The active V6 enrolment application uses version-pinned HTML/CSS/JavaScript under `pages/`, and a Node.js Lambda backend under `Rosewood enrolment/v6/backend/`. DynamoDB owns applications, invitations, sessions, revisions and operational workflows; Google Sheets are reporting projections. Restricted Google Drive holds submitted documents; private S3 provides temporary upload transport. The AWS region is Sydney. Billing must not deploy into this stack or reuse its database, authentication sessions, upload locations, API routes or permissions.

The enrolment staff portal supports admissions, communications, meetings and prospective-cohort planning. It is not a student information system proving enrolment or financial responsibility. Submission, signatures and planning statuses do not establish a billing agreement. Existing decisions explicitly defer fee responsibility and post-offer agreement collection. A student can therefore exist in billing before an enrolment application exists, and an application can exist indefinitely without a billing account.

Sources: [V6 overview](../../Rosewood%20enrolment/v6/README.md), [product decisions](../../Rosewood%20enrolment/v6/PRODUCT-DECISIONS.md), [question matrix](../../Rosewood%20enrolment/v6/QUESTION-MATRIX.md), [schema evolution](../../Rosewood%20enrolment/v6/SCHEMA-EVOLUTION.md), [staff runbook](../../Rosewood%20enrolment/v6/STAFF-PORTAL-RUNBOOK.md), [data process map](../../Rosewood%20enrolment/v6/DATA-PROCESS-MAP.md).

## Optional future link

Billing owns its own student ID and billing account. Staff may deliberately add an external enrolment reference, with a reason and audit trail. The first version records a reference only: it does not claim to validate a live application, read AWS records, infer a match from names/email or alter application status. One active reference must identify at most one billing student. Removing or replacing it is audited.

A future authenticated read adapter should return only application reference, child display name, intended entry year/level and the minimum authorised payer/contact projection. Link review must confirm the child, payer responsibility, permitted contact and source revision independently. Medical information, nationality, signatures, documents, custody details, other guardians' private contacts and raw form answers must not enter billing. The adapter needs separate read-only permissions and tests proving zero enrolment writes. Parent invoice access would need a separate payer authorisation model; enrolment invitation membership is insufficient.

## Published 2027 fee reference

The [published fee schedule](https://ffe.org.au/pages/rosewood-fee-schedule.html), [calculator implementation](../../pages/rosewood-fee-calculator.js) and [calculator tests](../../tests/rosewood-fee-calculator.test.cjs) provide a useful scenario source. At the pinned repository revision:

| Rule | Observed implementation | Billing implication |
|---|---|---|
| Annual tuition | AUD 6,990 per student | Versioned fee catalogue; do not silently change issued invoices |
| Foundation-year reduction | AUD 1,000 per student, applied first | Explicit discount with amount and reason |
| Sibling tuition reductions | 0%, 15%, 30%, 45%, then 100% from fifth child | Staff-approved sibling order and eligibility; resource levy remains payable |
| Resource levy | AUD 910 per student | Separate line; no tuition discounts |
| Larger-bond tuition reduction | Additional 5% for first child at AUD 10,000; each child at AUD 20,000 | Eligibility depends on a verified bond arrangement, not an unchecked promise |
| Annual-payment reduction | 5% of remaining tuition after earlier reductions | Approval/eligibility and discount order must be explicit |
| Term payments | Net annual tuition divided across four terms, remainder cents in earliest terms; levy in term one | Cent-exact schedule; invoice timing separate from agreed payment plan |
| Payment due | Within 14 days | Configurable due date; actual term dates need approval |
| Refundable family bond | AUD 2,000 / 10,000 / 20,000, once per family; different return events | Separate liability register and receipts; never ordinary tuition revenue |

These observations map the public estimator; they do not establish tax classification, an executed family fee agreement, approved accounting codes, concessions, mid-year pro-rating or annual discount clawback policy. Initial data must be labelled synthetic, and no invoice is emailed by this build. Automated policy-based annual billing remains a later enhancement until those details are settled; staff can enter approved individual fee lines and run reviewed batches.

## Baseline evidence

Before billing implementation, all 170 existing enrolment backend tests passed after a frozen-lockfile install. Existing static checks passed for 96 tracked HTML/CSS files and the public-data check passed for 511 tracked files. Public GET checks returned 200 for the family page and `/v6/health`; the unauthenticated staff dashboard returned 401 `SESSION_REQUIRED`. The health response identified EOI `rosewood-eoi-2026.27` and Application `rosewood-application-2026.28`, with community enquiry, cohort planning and family communication features enabled. No OTP, message, family record or AWS mutation was created.

The tracked release-blocker document retains governance warnings despite the technically active production service. Billing should preserve that distinction and make its own readiness claims from test evidence. See [release blockers](../../Rosewood%20enrolment/v6/RELEASE-BLOCKERS.md) and [recovery runbook](../../Rosewood%20enrolment/v6/RECOVERY-RUNBOOK.md).
