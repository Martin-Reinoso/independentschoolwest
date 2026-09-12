# Rosewood College billing

An independent staff application for school invoices, receipts and student billing progress, with optional future enrolment linking.

Start with the [research dossier](research/README.md): school manuals, pinned source-code maps, Xero/accounting boundaries and the Rosewood system map. The [architecture](ARCHITECTURE.md), [API contract](API-CONTRACT.md) and [acceptance plan](IMPLEMENTATION-PLAN.md) record the initial design before implementation.

Billing is developed on its own branch and server. Existing enrolment pages, immutable form contracts, AWS resources and family records are outside the write boundary. Source contains only clearly synthetic fixtures; databases, backups and credentials belong outside the repository and cloud-sync directories.

The implementation and verified run instructions follow in subsequent commits. No invoice, email, payment or production deployment has been created by this research commit.
