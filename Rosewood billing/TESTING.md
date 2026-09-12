# Rosewood Billing test evidence

Evidence date: 12 September 2026. The complete suite passed **64/64 on both Node 24.21.0 and Node 26.7.0**, source checks passed, existing enrolment checks passed, and sample PDFs were visually reviewed. A private backup/restore drill also preserved the complete billing state and revoked recovered sessions. The final local browser suite passed **15/15**, including desktop/mobile accessibility and failure recovery. The implementation commit `ca5c350` also passed [GitHub CI](https://github.com/Martin-Reinoso/independentschoolwest/actions/runs/34677724668) on Ubuntu with Node 24.21.0. This document distinguishes observed passes from checks that still need commissioning. See [acceptance scenarios](IMPLEMENTATION-PLAN.md) and [operating procedures](OPERATIONS.md).

## Commands and environment

Run from `Rosewood billing/app` after the frozen pnpm install:

```sh
npm run check
npm test
corepack pnpm@10.15.0 exec playwright install chromium
npm run test:browser
```

JavaScript syntax checks use the executing Node binary. Unit/integration tests use Node's built-in runner. Browser tests use Chromium, Playwright and axe. CI also installs Poppler for PDF verification, runs with one browser worker, and targets Node 24.21.0 on Ubuntu. The local development machine is macOS arm64 with Node 26.7.0. Docker was not available; container build/runtime verification is not claimed.

For pinned-runtime verification, the official Node 24.21.0 Darwin arm64 archive was downloaded outside the repository, checked against the official release checksum, and executed. The archive SHA-256 was `bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057`; the binary reported `v24.21.0`. Source: [official Node release](https://nodejs.org/en/blog/release/v24.21.0), accessed 12 September 2026. This establishes the runtime used, not Linux/container compatibility by itself.

## Observed checks

| Check | Observed result / outstanding evidence |
| --- | --- |
| Auth and HTTP suite, Node 26.7.0 | **19/19 passed** before the final aggregate run. Covers named accounts, password hashing, sessions, throttles, operator input and HTTP protections. |
| Real demo launcher smoke | **Passed** with a temporary private database: generated 3 synthetic accounts and 5 invoices, authenticated successfully, returned an issued invoice PDF and a receivables CSV with an export ID. The generated password was absent from launcher output. Process and temporary data were cleaned up. |
| Node 24.21.0 aggregate suite | **64/64 passed**, including the allocation, cross-method refund, live-batch and stale-batch recovery regressions. |
| Complete unit/integration suite, Node 26.7.0 | **64/64 passed** after refund, batch-recovery and PDF review fixes. |
| Syntax/local asset check, Node 24.21.0 and Node 26.7.0 | **Passed on both**: 24 JavaScript files checked and local-only staff assets verified. |
| Browser workflows, responsive/keyboard checks and axe | **15/15 passed** in Chromium. All 11 desktop and all 11 mobile workspaces, mobile login/detail/dialog/composer and the mixed-tax composer pass axe WCAG 2 A/AA and 2.1 AA checks with zero violations. Resize, keyboard, safe retries, correction flows and role restrictions pass. |
| PDF page rendering, text/totals and visual inspection | **Passed**: 4 sample artifacts / 5 pages visually reviewed—one-page invoice, receipt and credit; two-page statement. Automated 150-line address and 120-line reason tests preserve text and prevent footer collisions; Melbourne date cases pass. |
| Backup/restore | **Passed** in the aggregate suite and the manual private recovery drill below. |
| Existing enrolment regression | **170/170 passed**, and its pnpm build succeeded. `git diff` against base `af96814` is empty for prior enrolment/pages/assets/scripts and the existing `ci.yml`; the billing workflow is separate. |
| GitHub Actions | **Passed** on implementation `ca5c350`: locked install, source checks, application tests and Chromium/axe workflows on Ubuntu/Node 24.21.0. [Run evidence](https://github.com/Martin-Reinoso/independentschoolwest/actions/runs/34677724668). |
| Docker / production deployment / AU Xero import | **Not tested or commissioned**. No live accounting, email, bank payment, enrolment data or AWS mutation was used. |

## Requirement-to-test map

| Acceptance IDs | Test surface | Main assertions |
| --- | --- | --- |
| B01–B05 | `tests/domain.test.mjs` | Independent accounts/students, optional exact references, draft/issued lifecycle, historical snapshots, revisions and idempotency. |
| B06–B10 | `tests/domain.test.mjs`, `tests/auth.test.mjs` | Pending money does not settle fees; confirmation/receipts are atomic; allocation, excess credit and reversal conserve money; role checks apply inside the service. |
| B11–B14 | `tests/domain.test.mjs` | Line-specific cumulative tax credits, refund limits/deduplication, separate bonds, instalments and reviewed batch generation. |
| B15–B17 | `tests/auth.test.mjs`, `tests/server.test.mjs` | Viewer writes denied, named sessions revoked/expired, exact Origin and Host, CSRF, generic login failures, persistent throttles and bounded fixed/chunked requests. |
| B18 | `tests/documents.test.mjs`, sample renderer and visual review | Issued snapshots, document labels, original payment facts, credits, statements, long text and pages. Final visual evidence must supplement programmatic PDF checks. |
| B19 | `tests/exports.test.mjs`, `tests/server.test.mjs` | Formula-safe reports, strict accounting mappings, exclusions, authenticated downloads, immutable export manifests and separate import evidence. |
| B20 | `tests/backup.test.mjs`, `tests/domain.test.mjs` | WAL backup, independent reopen, checksums/foreign keys, private paths/permissions, database persistence and competing allocations. |
| B21 | `tests/browser/workflows.spec.mjs` | Staff workflows, responsive controls, keyboard/accessibility assertions and usable correction flows. |
| B22 | Repository source comparison and enrolment checks | Billing isolation; final result belongs in release evidence below. |

The API tests include forged Host requests using raw HTTP, because Node's fetch implementation replaces a custom Host header. The corrected test verifies the server's actual host gate rather than relying on an ineffective test request. HTTPS tests verify that an untrusted or non-HTTPS proxy header is refused.

## Independent review regressions

Three defects were reproduced during independent financial review and passed to the domain owner for corrections:

1. Whitespace aliases of the same invoice ID bypassed allocation uniqueness, allowing 12,000 cents to be allocated to a 10,000-cent invoice. IDs are now normalised before uniqueness checks. Regression coverage checks confirmation and subsequent allocation rollback, and consistent credit-line handling.
2. Batches could freeze incomplete seller/tax details and leave drafts without a workable issue path. Live preview now checks configuration, and a deliberate draft review/save refreshes stale payer/seller snapshots while retaining the original batch evidence. The configuration/recovery regressions pass; browser tests also cover reviewed batch creation and explicit invoice workflows.
3. Refund deduplication used the incoming payment method, allowing one outgoing refund to be recorded twice against cash and bank receipts. Outgoing refund identity is now independent of the incoming method. The cross-method regression passes.

No domain record was repaired by deleting financial history. Reproductions used isolated in-memory synthetic databases. The 64-test suites include these regression cases.

## Private recovery drill

An additional drill ran on the verified Node 24.21.0 binary using a fresh OS temporary directory and full synthetic billing/authentication schema. It:

1. Seeded 3 synthetic accounts and 5 invoices, created a synthetic staff account, and established a session.
2. Created an online database backup and invoked `scripts/backup.mjs --verify` against its manifest.
3. Copied the verified backup and manifest into a new private runtime using exclusive file creation, then verified the copied file.
4. Revoked recovered sessions and appended an authentication recovery event, as shown in OPERATIONS.md.
5. Reopened the recovered billing service in the original demo mode and compared its complete returned billing state with the original using strict deep equality. The states matched; the recovered old session was refused.

All steps passed. Processes/database handles and temporary files were cleaned up. This demonstrates local recovery mechanics and ledger parity; it does not establish an off-host backup service, production recovery time, or a retention policy.

## Data and artifact handling

Fixtures use obvious synthetic identities and non-deliverable `example.test` addresses. Unit/API tests use in-memory SQLite or private OS temporary directories. Runtime databases and credentials are excluded from source. The demo smoke did not print its password. Browser traces are disabled; screenshots are intended to contain only synthetic test data. Do not rerun screenshot-based tests against real family records.

Public enrolment health and staff-authentication endpoints were checked read-only. No family records, enrolment credentials or enrolment tables were accessed, and no enrolment deployment or AWS mutation was performed. The billing app records prospective students independently; the external enrolment field is an unverified reference only. Xero export tests exercise generated files and mapping logic; they do not establish that the school's real AU organisation accepted an import.

## Local delivery evidence

The research dossier and initial architecture were committed and pushed as `9542d87` before application source was added. The implementation branch is `codex/rosewood-billing`, based on `af96814`. The application commit is `ca5c350`; its [remote CI run](https://github.com/Martin-Reinoso/independentschoolwest/actions/runs/34677724668) passed. Subsequent review-document updates do not change application code.

Repository checks pass: 98 tracked HTML/CSS files have resolving local references; the implementation public-data scan checked 562 tracked files and found no private export or high-confidence secret pattern. Previous enrolment and public-site paths are byte-identical to the base. A repeated read-only live check returned HTTP 200 for the enrolment page and health endpoint, the same EOI/application form versions (2026.27/2026.28), and HTTP 401 `SESSION_REQUIRED` for the staff dashboard.

The local review portal runs at `http://127.0.0.1:4318` using a private persistent synthetic database. Desktop and mobile overview screenshots were inspected; no real family data was rendered. Four sample PDFs can be reproduced with `node scripts/generate-samples.mjs`; the renderer prints its private temporary output directory. The delivered invoice, receipt and credit each have one page; the statement has two. Additional independent long-document cases used 150-line payer addresses, 100-line seller addresses/payment instructions and 120-line credit reasons, preserving all markers within page bounds.

The 15 browser scenarios cover account/student/invoice creation, issue and partial payment, receipt download, all-role permissions, mobile navigation, plans, allocation release/credit/refund, batch preview/commit, bonds/rejection/reversal, receivables and Xero export/import evidence, stale edits, safe stored text and enrolment references. The uncertain-response test proves two attempts use the same request body and idempotency key and create one record/audit event. The acknowledged-save/failed-refresh test proves only one POST occurs and the form offers a refresh retry.

## Remaining commissioning limits

Real-data operation still requires approved issuer/tax/fee/bank settings, named staff access and account recovery, a working MFA/private gateway, hosting/TLS and monitoring, encrypted off-host backups, AU accounting-template import validation and an approved reconciliation owner. These are not represented as completed by the local tests. The Dockerfile has not been built locally. Live accounting/enrolment adapters, parent login, collection and messaging are future scope. Automated accessibility checks and keyboard review do not replace a full assistive-technology user assessment.

Draft pull-request creation was denied by GitHub because the existing API identity lacks collaborator permission. The branch is pushed; [the prepared review](REVIEW.md) includes the comparison link and description. No PR, merge or deployment is claimed.
