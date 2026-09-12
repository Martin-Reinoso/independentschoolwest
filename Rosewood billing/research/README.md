# School billing research dossier

Rosewood needs a small, independent school receivables application: staff create bills for responsible payer accounts, attribute charges to students, verify money received, generate receipts and follow outstanding balances. Research across school manuals and financial codebases supports this structure. A student enrolment form is an optional source of identity; it is not the financial ledger or proof of fee responsibility.

The evidence was inspected on 12 September 2026. It covers **11 school products or adjacent comparators**, with substantive official operating manuals for **eight**, and **six billing/SIS application families across seven pinned source repositories**. The accounting/control map adds **30 source entries** spanning Xero, ATO, OWASP, Node and SQLite. Evidence includes detailed failure, reversal, allocation and retry paths, not simply feature lists. No vendor application was installed or tested, and marketing-only/gated sources are clearly distinguished.

## Reading map

| Artifact | What it answers |
|---|---|
| [School manuals and product comparison](school-products.md) | How staff set up fees, bill cohorts, manage debtors, receive money, correct errors and review accounts across eight well-documented school systems |
| [School source inventory](school-product-sources.json) | 46 individual sources/access attempts, product, title, exact URL, date and evidence tier |
| [Pinned codebase map](open-source-codebases.md) | Concrete models, schemas, workflows, allocations, snapshots, tests and limitations across Frappe/ERPNext, Gibbon, RosarioSIS, Odoo, Invoice Ninja and Akaunting |
| [Source pins](source-pins.json) | Exact upstream branches/commit identities for reproducible inspection and licence review |
| [Accounting integration and controls](accounting-integration-and-controls.md) | Xero entity/authority boundaries, invoices versus receipts, tax configuration, security, durability and evidence limits |
| [Local system and fee map](local-system-map.md) | Existing Rosewood enrolment boundary, published fee scenarios, bond distinction and pre-change verification |
| [Architecture](../ARCHITECTURE.md) | Chosen product, storage, authority, security and integration design |
| [Application contract](../API-CONTRACT.md) | Concrete state/commands shared by the portal, service, PDFs and tests |
| [Acceptance plan](../IMPLEMENTATION-PLAN.md) | Research/build gate, increments and 22 end-to-end acceptance scenarios |

## Design synthesis

### The payer account is the centre of billing

TASS parent accounts, Compass debtors, Synergetic debtor rules and Blackbaud family/student fees demonstrate that a student's identity differs from the party receiving and paying an invoice. School fees may be per student or per family; siblings should not create duplicated family-level debt. TASS also documents fees before a student becomes current. [TASS receipts](https://tasshub.kb.tassweb.com.au/documentation/pac-receipts), [Compass setup](https://home.compass.education/hubfs/Billing%20Setup%20Guide.pdf), [Blackbaud fees](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/tuition-management/content/st-family-fee-discount.html), [TASS enrolment entry](https://tasshub.kb.tassweb.com.au/documentation/enr-detailed-entry-for-enrolment-applications).

**Rosewood decision:** independent billing accounts and prospective student IDs, one responsible account per student initially, with optional explicitly linked application references. Split-liability arrangements and third-party payer permissions are recognised future requirements; this release does not infer them from family relationships. No application signature, matching email or completed admissions status creates a fee account automatically.

### A charge, a plan and received money are different facts

Synergetic explicitly distinguishes instalment charging from payment arrangements. FACTS separates prepaid funds from scheduled payments. TASS and Bromcom show receipt allocation across outstanding charges, while Odoo's code models document and payment states independently. These are consistent reasons to avoid a single editable “paid” flag. [Synergetic instalments](https://synergetic.help.tes.com/support/solutions/articles/75000141113-debtor-instalments), [FACTS AU FAQ](https://factsmgt.com/caregiver-faqs-ftm/), [Bromcom receipt process](https://docs.bromcom.com/knowledge-base/how-to-process-an-invoice-receipt-in-accounts-receivable/), [Odoo mapping](open-source-codebases.md#4-odoo-community-separate-posting-payment-and-reconciliation).

**Rosewood decision:** a reported transfer is pending; finance verification creates a receipt and permits allocation; unallocated fee funds, scheduled instalments and held bonds remain separate. The dashboard exposes confirmed debt, overdue debt, pending verification, unapplied funds and bonds. Receipt totals must never be inferred from current invoice balance, because credits and refunds can change that balance without new cash.

### Issue is an immutable boundary

Gibbon's issue process snapshots fees and due dates, TASS retains statements, and Blackbaud records reasoned adjustments. The code review also found patterns to avoid: a later logging call outside the invoice write boundary, generated retry keys that change with time, and fee loops without an evident per-student run uniqueness guard. These observations are limited to inspected paths, not product-wide defect allegations. [Gibbon issue code](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/modules/Finance/invoices_manage_issueProcess.php), [Blackbaud adjustments](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/tuition-management/content/st-edit-billing-details.html), [codebase limitations](open-source-codebases.md).

**Rosewood decision:** draft, issued snapshot and subsequent credit/reversal are separate stages. Number allocation, domain changes, financial evidence and idempotency result commit together. Reprints preserve original payer/seller/price facts. Credits target original lines so a GST-free tuition adjustment cannot mistakenly reverse GST on another line. A receipt reversal remains visible instead of deleting its history.

### Billing runs require review and transaction guards

TASS's pre-billing checks and Synergetic's what-if runs make review central to school operations; Frappe fee structures/schedules provide a useful academic-year/term model. The strong upstream tests target stale balances, failed multi-target allocations, duplicate payments and refunds that might consume the same value twice. [TASS billing checklist](https://tasshub.kb.tassweb.com.au/documentation/auto-account-billing-checklist), [Frappe schedule](https://docs.frappe.io/education/fee-schedule), [Invoice Ninja double-spend test](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/tests/Feature/Payments/CreditRefundDoubleSpendTest.php).

**Rosewood decision:** staff preview the selected students, fees, dates and totals; committing that batch creates the reviewed drafts once. Issue is separate. Every allocation checks current funds and invoice debt in one transaction. Duplicate payment evidence is checked independently of browser retry keys, including when two staff enter the same transfer.

### Existing accounting remains a separate authority

Sentral documents explicit invoice push and a repair path for older external transactions. Xero distinguishes authorised invoices, payments and credit notes; its classic Receipts API is for expense claims, not school customer receipts. CSV import creates drafts and needs organisation-specific account/tax mappings. An exported file is not proof of import, approval, settlement or bank reconciliation. [Sentral sync](https://help.sentral.com.au/modules/fees%26billing/faq/2013614), [Xero invoice states](https://developer.xero.com/documentation/best-practices/user-experience/invoice-status/), [Xero payments](https://developer.xero.com/documentation/api/accounting/payments), [Xero changelog](https://developer.xero.com/changelog).

**Rosewood decision:** implement local documents and reviewed export manifests first. Keep live accounting credentials and writes out of this build. Flag credits/voids for separate reconciliation; record a manual import outcome separately. The actual Australian Xero template and Demo Company import remain validation work before operational adoption. Tax registration/classification and the legal issuer require school finance configuration, not assumptions derived from vendor defaults.

## Options considered

| Option | Advantages | Why selected or deferred |
|---|---|---|
| Add payment fields to enrolment records | Appears quick and uses existing staff access | Rejected: admissions status is not debt, frozen answers cannot become a ledger, payers differ from signers, and it risks the active form |
| Rebrand a full SIS/ERP | Broad mature finance functions | Deferred: unnecessary operational coupling, migration burden and significant licence conditions; source study does not authorise copying |
| Static browser-only billing page | Easy to publish | Rejected: no reliable shared authoritative ledger, transactional numbering or server role boundary; inappropriate for school billing records |
| Full Xero integration first | Can reduce double entry once configured | Deferred: product/tenant authority and tax/account mapping unconfirmed; does not replace school student/fee arrangements |
| Independent staff app and transactional store | Works before enrolment, has bounded integration, testable ledger and authentic shared server state | Selected: Node/SQLite for one local persistent host initially, with source-controlled contracts and a future managed-database path |

## Research gate conclusion

The material design questions are sufficiently resolved to begin an isolated implementation: entity ownership, before-enrolment operation, issue/receipt semantics, payment progression, allocations, corrections, tax configuration, bonds, staff permissions, reviewed batches, accounting export and persistence all have explicit choices and test scenarios. Further vendor scanning is unlikely to change the core structure. Missing product manuals, source licence discrepancies and country-specific details remain documented limits rather than hidden assumptions.

The first release is a tested staff application using synthetic data until operating settings are configured. It is not a live Xero integration, parent portal, direct-debit facility or automatically commissioned production system. Research artifacts and this architecture are committed before application code so later changes have a reviewable rationale.
