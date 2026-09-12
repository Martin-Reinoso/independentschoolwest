# Rosewood College billing

An independent staff application for school invoices, receipts and student billing progress, with optional future enrolment linking.

Start with the [research dossier](research/README.md): school manuals, pinned source-code maps, Xero/accounting boundaries and the Rosewood system map. The [architecture](ARCHITECTURE.md), [API contract](API-CONTRACT.md) and [acceptance plan](IMPLEMENTATION-PLAN.md) record the initial design before implementation.

Billing is developed on its own branch and server. Existing enrolment pages, immutable form contracts, AWS resources and family records are outside the write boundary. Source contains only clearly synthetic fixtures; databases, backups and credentials belong outside the repository and cloud-sync directories.

## Run the review workspace

Use Node 24.21.0 (the pinned CI runtime), or a compatible Node >=24.14.0, and pnpm 10.15.0 or later. From the repository root:

```sh
cd 'Rosewood billing/app'
pnpm install --frozen-lockfile
pnpm demo
```

Open [the local staff portal](http://127.0.0.1:4318). The launcher prints the path to a private credentials file containing the generated demo password. It never prints the password itself. The default file is `~/.local/share/rosewood-billing/demo/demo-credentials.txt`; the SQLite database is alongside it. This directory is outside the repository and the user's cloud-synchronised Documents folder.

The demo includes three synthetic family accounts, prospective students, issued and draft invoices, a pending transfer, partial/full payments, a separate refundable bond and an instalment plan. Amounts and identities are demonstrations, not the school's approved fee schedule. Re-running the launcher retains edits and does not duplicate the initial transactions. All generated documents are visibly marked as samples. Use Ctrl-C to stop the server.

## What is implemented

- Named staff access with viewer, billing, finance and administrator roles; server-enforced permissions, revocable sessions, login throttling and audited financial changes.
- Independent family accounts and prospective students, with optional manually reviewed enrolment references for a later integration.
- A fee catalogue, reviewed billing runs, editable drafts and immutable numbered invoices, with exact-cent calculations, discounts and explicit GST treatment.
- Pending payment reports, finance verification, partial payments, allocation across invoices, unapplied credit and a separate bond register.
- Receipts, invoice voiding, credit notes, allocation release, payment reversals and evidence of refunds already made.
- Instalment progress, ageing, account statements, PDF downloads, a receivables CSV and a controlled Xero draft-invoice export with account-specific contact mapping and export/import evidence.
- A searchable document centre with PDF previews; reviewed email drafts with frozen attachments, invoice/receipt automation, due-date reminders, account holds, resend/recovery controls and an optional SES worker.
- In-app staff administration, role/access changes, password resets and staff password changes, with session revocation and protection for the last active administrator.
- Durable SQLite transactions, duplicate/retry controls, online backup and verified restore tooling; automated domain, authentication, API, PDF, export, backup and browser tests.

The Xero assumption follows the user's reference to “Xerox”. This release uses exports; it makes no Xero API calls. The actual school's AU CSV template and a Xero Demo Company import still need validation before live use. Email delivery is disabled and the demo cannot send; the implemented SES worker needs a verified sender and commissioning. Card collection, bank transfers, automatic enrolment synchronisation and public deployment remain outside this release.

## Documentation

| Read | Purpose |
|---|---|
| [Research dossier](research/README.md) | Eleven school comparators, seven pinned repositories, source quality, design lessons and accounting boundaries; committed before application code |
| [Staff guide](STAFF-GUIDE.md) | Daily workflows, payment states and corrections |
| [Documents and communications](COMMUNICATIONS.md) | PDF centre, email policy, queue/recovery, sender proposal and disabled-by-default SES transport |
| [Operations](OPERATIONS.md) | Runtime setup, staff accounts, private hosting, backup/restore and live commissioning requirements |
| [Testing and acceptance](TESTING.md) | Actual validation, acceptance coverage and remaining limits |
| [Prepared GitHub review](REVIEW.md) | Branch comparison and a ready pull-request description; API creation permission is unavailable |
| [Architecture](ARCHITECTURE.md) | Domain model, ownership and integration decisions |
| [API contract](API-CONTRACT.md) | Commands, permissions, revisions and idempotency |

## Verify locally

Install Poppler (`pdftotext`, `pdfinfo`, `pdftoppm`) for document verification, then:

```sh
pnpm check
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
```

The browser suite starts its own temporary synthetic server and cleans it up. It does not use the persistent demo or any enrolment deployment. CI runs independently of existing site workflows. The source is ready for local review; real fee approvals, staff access infrastructure and accounting commissioning are separate release work described in Operations.
