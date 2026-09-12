# Prepared GitHub review

The implementation and research commits are pushed to `codex/rosewood-billing`. Draft pull-request creation was attempted with the existing GitHub API identity and was denied with `must be a collaborator`. No pull request was created. The comparison and prepared description below are available for a collaborator to review and create one.

[Review the branch against main](https://github.com/Martin-Reinoso/independentschoolwest/compare/main...codex/rosewood-billing)

Suggested title: **Add researched Rosewood school billing application and staff portal**

---

Rosewood needs student billing before enrolments are complete. This adds an independent staff application for family accounts, prospective students, immutable invoices, verified receipts and payment progress, with no dependency on the enrolment backend.

The research commit (`9542d87`) preceded implementation: 11 school comparators, substantive manuals for eight, seven pinned source repositories and 30 accounting/control references. The dossier records source quality, licensing, entity ownership, correction paths and the reasons for the chosen architecture.

The application includes named staff roles, transactional SQLite with exact-cent calculations, reviewed billing runs, pending/confirmed payments, allocation, separate bonds, plans, credits/refund evidence, four PDF document types, receivables and controlled Xero draft exports, audit history, private runtime storage and backup/restore procedures. Optional enrolment references are unverified manual links; they do not change admissions records.

Validation:

- 64 application tests pass locally; Node 24.21.0 and 26.7.0 verified.
- 15 Chromium browser workflows pass, including all desktop/mobile workspaces, keyboard/axe checks, role enforcement and lost-response retry handling.
- Four sample PDFs (five pages) visually reviewed; long text, date, tax and footer bounds tested.
- Full backup/restore drill preserves billing state and revokes recovered sessions.
- Existing enrolment: 170 tests and deployment build pass. Previous enrolment/public-site paths are unchanged from `af96814`; read-only live page/health checks pass and unauthenticated staff access remains denied.
- Static links and public-data scan pass. GitHub CI passed on Ubuntu/Node 24.21.0 for implementation `ca5c350`: [run evidence](https://github.com/Martin-Reinoso/independentschoolwest/actions/runs/34677724668).

Run `pnpm install --frozen-lockfile` and `pnpm demo` in `Rosewood billing/app`. The launcher prints a private credential-file path. The demo is synthetic and all PDFs are marked as samples. Staff/operations/test manuals are included.

This PR is for review. No production deployment, live Xero connection, email, bank transfer or enrolment mutation occurred. Actual fee/tax/issuer configuration, a school MFA/private gateway, staff recovery, encrypted off-host backups and AU Xero template/Demo Company validation remain commissioning work. Docker packaging is present but has not been built locally.
