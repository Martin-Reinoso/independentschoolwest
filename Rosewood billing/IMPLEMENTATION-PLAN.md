# Billing delivery and acceptance plan

## Research gate

Complete the school product/manual comparison, pinned open-source maps, accounting/control research, local system map and synthesis. Record source quality and access gaps. Commit and push this evidence and architecture before adding application code. The gate is satisfied when student/payer ownership, document immutability, settlement, corrections, term timing, bonds, optional enrolment integration and accounting authority have explicit decisions supported by multiple independent sources.

## Build increments

1. Independent persistent billing domain, schema, exact-cent arithmetic, transaction/idempotency controls and synthetic fixtures.
2. Authenticated staff server, role enforcement, protected API, secure sessions, operator setup, private storage and consistent backups.
3. Responsive staff portal: overview/attention queue, accounts and students, invoice composer/detail, payment verification/allocation, receipts, plans, batches, fee catalogue, bond register and audit/history.
4. Issued invoice, confirmed receipt, credit-note and account statement PDFs; financial and Xero draft CSV with explicit mapping checks.
5. Domain/API/browser/security/document/recovery tests; existing-enrolment regression checks; CI; runnable local review; staff and operating manuals.

## Acceptance scenarios

| ID | Scenario | Required observation |
|---|---|---|
| B01 | Create a family account and prospective student without enrolment | Persistent independent IDs; no AWS dependency |
| B02 | Add/remove a known external application reference | Explicit reason, uniqueness and audit; no enrolment mutation |
| B03 | Draft a multi-line invoice with sibling and tuition lines | Server arithmetic exact; payer/student snapshots distinct |
| B04 | Issue and retry | One number and one immutable document; changed retry payload fails |
| B05 | Change account/seller/fee after issue | Original invoice output remains unchanged |
| B06 | Record a claimed bank transfer | Pending queue increases; invoice due and receipt count unchanged |
| B07 | Finance confirms partial payment | Invoice becomes part paid; one receipt; allocated and unapplied totals reconcile |
| B08 | Confirm remaining payment / excess | Invoice settles; excess remains available credit |
| B09 | Allocate across several invoices | Same-account restriction; no over-allocation under repeat/competing requests |
| B10 | Reverse a mistaken payment | Balance reopens; receipt marked reversed; evidence retained |
| B11 | Credit/void/refund | Bounded correction, reason, numbered evidence; no deletion or unintended transfer |
| B12 | Record a refundable bond | Bond liability and receipt separate; tuition balance unchanged |
| B13 | Create instalment plan | Sum equals invoice amount; schedule does not become received money |
| B14 | Preview and commit a fee batch twice | Exact reviewed draft set once; no automatic issue/send |
| B15 | Viewer attempts any mutation | Server refuses and database remains unchanged |
| B16 | Invalid origin, missing CSRF, expired/revoked session | Protected data/actions denied; no record leak |
| B17 | Login brute force and malformed/oversized payloads | Bounded/throttled responses and no financial mutation |
| B18 | Generate invoice/receipt/statement documents | Correct labels/totals; long text and multiple pages remain readable |
| B19 | Export financial data | Formula injection neutralised; draft/void/bond handling explicit |
| B20 | Restart and backup/restore | Same totals, relationships, numbers, audit and idempotency; integrity checks pass |
| B21 | Desktop/mobile/keyboard staff workflow | No horizontal page overflow; labelled controls, focus handling and accessible errors |
| B22 | Existing enrolment checks | Original paths byte-identical to base; backend tests/build and public read-only checks pass |

## Second iteration acceptance — documents, communications and access

| ID | Scenario | Required outcome |
| --- | --- | --- |
| B23 | Find and preview a document | Search/filter centre; protected PDF opens in a closable preview and downloads; preview object URL is released |
| B24 | Prepare/review an email | Correct account permission and current recipient required; frozen attachment and editable draft; billing cannot approve |
| B25 | Automate invoices/receipts/reminders | Defaults off/review; start date and Melbourne offsets; repeated scans deduplicate; paid/pending/held accounts suppress reminders |
| B26 | Safely process the outbox | One durable worker claim; recheck after rendering; disabled/demo never contacts provider; exact PDF attached |
| B27 | Recover a lost send outcome | Unknown result becomes uncertain without auto retry; manual provider evidence retained; late callback cannot undo resolution |
| B28 | Send another copy | Finance resend creates one new review draft linked to accepted/cancelled original; no automatic approval |
| B29 | Manage staff accounts | Admin create/update/disable/enable/reset; passwords and roles revoke sessions; preserve one active administrator |
| B30 | Change own password | All roles can change with current password; incorrect current password keeps valid session; successful change signs out |
| B31 | Revoke access during an upload | A disabled or demoted user's partially uploaded request cannot dispatch using their earlier authority |
| B32 | Review new screens on desktop/mobile | Responsive controls, keyboard, existing workflows and accessibility checks remain passing |

## Completion evidence

Record actual commands, results and limitations in `TESTING.md`; include a requirement-to-test map and baseline comparison. Use only obvious synthetic identities and non-deliverable example.test addresses. Keep runtime databases, credentials and rendered personal documents outside the repository. Commit source and synthetic tests in coherent increments and push the billing branch to GitHub. Open a draft pull request for review without changing the live site or enrolment deployment.
