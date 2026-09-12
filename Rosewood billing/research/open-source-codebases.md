# Open-source and source-available billing codebase map

Research date: **12 September 2026 (Australia/Melbourne)**. This is an architectural evidence map for a new Rosewood College billing application, covering **six application families and seven official repositories**. The Frappe Education and ERPNext repositories are considered together because school fee generation delegates the accounting lifecycle to ERPNext.

## Scope and method

Official repositories were shallow-cloned outside the school repository into `/tmp/rosewood-billing-source-map`. Each link below is pinned to the inspected commit, not a moving branch. Inspected files include schemas/models, creation and mutation workflows, payment allocation paths, document/receipt generation, and meaningful tests. Official manuals were read live on the research date. No upstream application was installed, no upstream test suite was executed, and no production school data was used in this research. Static inspection supports the specific findings below; it is not a security audit or a certification of an entire product.

The resulting proposal is an independent implementation. No third-party application code, screenshots, logos, templates or manual text has been copied into the product. Invoice Ninja and Akaunting are explicitly classified as **source-available at these revisions**, rather than assumed to be unrestricted open-source building blocks. The source map is for learning workflows and failure cases.

### Version and licence register

| Family / repository | Inspected branch and immutable revision | Licence evidence and reuse boundary |
|---|---|---|
| Frappe Education | `develop`, `71aada478bf682f6d034fd4caa6f2f5438b5ace9` | [Repository licence file](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/license.txt) says GNU GPL v3. The live [product page](https://frappe.io/education) displays AGPL-3.0; this disagreement must be resolved with the vendor before reuse. No reuse is proposed. |
| ERPNext | `develop`, `bec627c3eba9bef369b64faadebde23ae3776217` | [GPL v3 licence](https://github.com/frappe/erpnext/blob/bec627c3eba9bef369b64faadebde23ae3776217/license.txt). Study concepts; do not paste application code into Rosewood. |
| Gibbon | `v31.0.00`, `912cb5abc73a047f0c0ad64d26c398067e38a6eb` | [GPL v3 licence](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/LICENSE); inspected PHP file headers permit v3 or later. Study concepts only. |
| RosarioSIS | `mobile`, `e159aec090c5b8cc25ac8955bb83621252d3d685` | [GPL v2 licence](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/LICENSE) and [README](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/README.md). Premium modules have separate availability/licensing; only public core source was inspected. |
| Odoo Community | `19.0`, `c50a4e0513e5247f1b680ccbb5c0d27795a10b55` | [LGPL v3 licence](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/LICENSE); bundled components can have other licences. Community source inspected; Enterprise modules are outside this review. |
| Invoice Ninja | `v5-stable`, `d69e2acf6a42574fea96c3c9f5c9414c22fa2891` | [Elastic License 2.0](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/LICENSE), with hosting and licence/notice restrictions. Treat as source-available reference. |
| Akaunting | `master`, `80f98363cf8f5e89db3203daa74263b5bdeb9848` | [Business Source License 1.1](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/LICENSE.txt), with a four-year change date and production-use limits including users, companies and invoices. Treat as source-available reference. |

Machine-readable commit timestamps, branch names and subjects are saved in [source-pins.json](source-pins.json). A branch name here identifies retrieval provenance, not a recommendation to deploy a development branch.

## 1. Frappe Education + ERPNext: school schedules feeding receivables

**Why relevant:** this is the clearest school-specific example of keeping academic fee planning separate from issued financial documents. The manuals explain reusable [Fee Structures](https://docs.frappe.io/education/fee-structure) and [Fee Schedules](https://docs.frappe.io/education/fee-schedule); the latter also describes creating sales orders before recognition is appropriate.

### Concrete source map

| Concern | Inspected evidence | What it establishes |
|---|---|---|
| Fee template | [FeeStructure](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/education/education/doctype/fee_structure/fee_structure.py) and [Fee Component schema](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/education/education/doctype/fee_component/fee_component.json) | A reusable structure has categorized components, amounts and discounts. Distribution can be monthly, quarterly, half-yearly, yearly or by academic term. |
| Cohort billing | [FeeSchedule](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/education/education/doctype/fee_schedule/fee_schedule.py) and [schedule schema](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/education/education/doctype/fee_schedule/fee_schedule.json) | A schedule references a structure, academic period, student groups and due date; invoice generation iterates the selected students. |
| Student-to-customer boundary | [get_customer_from_student / get_fees_mapped_doc](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/education/education/doctype/fee_schedule/fee_schedule.py) | Student identity remains on the invoice, while a customer identity supplies accounting-party details. |
| Payment allocation | [Payment Entry Reference schema](https://github.com/frappe/erpnext/blob/bec627c3eba9bef369b64faadebde23ae3776217/erpnext/accounts/doctype/payment_entry_reference/payment_entry_reference.json) | One payment has multiple reference rows: target document, payment term, current outstanding and allocated amount. |
| Posting and cancellation | [PaymentEntry](https://github.com/frappe/erpnext/blob/bec627c3eba9bef369b64faadebde23ae3776217/erpnext/accounts/doctype/payment_entry/payment_entry.py) | Submission updates schedules, requests, accounting entries and outstanding balances; cancellation coordinates the corresponding reversals/updates. |
| Receivables ledger | [PaymentLedgerEntry](https://github.com/frappe/erpnext/blob/bec627c3eba9bef369b64faadebde23ae3776217/erpnext/accounts/doctype/payment_ledger_entry/payment_ledger_entry.py) | Voucher and target-voucher references, party, currency, due date and delinking distinguish ledger data from a UI badge. |
| Student portal | [get_student_invoices](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/education/education/api.py) and [Fees page](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/frontend/src/pages/Fees.vue) | Submitted invoices are exposed with unpaid, overdue, partly paid or paid states; the portal includes payment and invoice-download actions. |
| Regression examples | [schedule tests](https://github.com/frappe/education/blob/71aada478bf682f6d034fd4caa6f2f5438b5ace9/education/education/doctype/fee_schedule/test_fee_schedule.py) and [payment tests](https://github.com/frappe/erpnext/blob/bec627c3eba9bef369b64faadebde23ae3776217/erpnext/accounts/doctype/payment_entry/test_payment_entry.py) | Cohort totals, invoice/order generation, income-account defaults, over-allocation, stale draft payments, returns and duplicate reference rows receive direct assertions. |

### Lifecycle and relationships

`Academic year/term → fee structure → components → fee schedule → student groups → student/customer → sales invoice → payment-entry references → receivable balance`.

The schedule moves through draft, pending generation, in process, created or failed states. It creates sales invoices or sales orders according to settings; invoice submission is a separate configurable step. Generation switches to a background job above ten student records, reports progress, and records a failure state. It does not equate “schedule created” with “student paid”.

Payment Entry validates the same references again when posting. `validate_allocated_amount_with_latest_data` re-fetches outstanding amounts; a payment drafted before another payment arrives cannot safely trust its old balance. `validate_duplicate_entry` rejects repeated reference tuples **inside the payment**. This is not evidence of general HTTP replay idempotency. In the inspected fee-generation function, no per-student/schedule uniqueness guard was found; Rosewood must design its own rerun protection rather than infer that a disabled UI button guarantees uniqueness.

Receipts are a separate output concern from invoice balances. The school portal maps its payment-date display from linked Payment Entry records; a single displayed date is not an adequate receipt ledger for multiple instalments. Rosewood should show each payment and its allocations explicitly.

**Design lessons for Rosewood:** use editable fee schedules and drafts, freeze invoice facts on issue, and make cohort billing a previewable job with a stable `(billing run, student, fee period)` identity. A prospective student can exist in billing before full enrolment. Retain fee category, service period and future accounting code on each line. Revalidate available balances under the same transaction that posts an allocation.

**Do not import wholesale:** ERPNext's full general ledger, multicurrency, withholding and stock coupling is much broader than this staff billing portal. The school-to-customer model is predominantly student-oriented; Rosewood needs a separate family/payer account model and can link multiple students. School fee generation retries, cross-family allocations and separate responsible payers require explicit acceptance tests.

## 2. Gibbon Finance: practical school invoicing and immutable fee facts

**Why relevant:** a school SIS with family/company invoice destinations, standard and ad hoc fees, invoice management, online payment entry points, and receipts. Its [official Finance introduction](https://docs.gibbonedu.org/guides/modules/finance/) confirms billing creation/sharing/tracking, but the public manual is brief; source inspection supplies the detailed map.

### Concrete source map

| Concern | Inspected evidence | What it establishes |
|---|---|---|
| Relational structure | [gibbon.sql](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/gibbon.sql) | `gibbonFinanceFeeCategory`, `Fee`, `BillingSchedule`, `Invoicee`, `Invoice`, `InvoiceFee`, and shared `gibbonPayment` records. Money columns use decimal values. |
| Invoice query surface | [InvoiceGateway](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/src/Domain/Finance/InvoiceGateway.php) | Staff can filter by school year, payer, issue month, schedule, category and status; overdue and late payment are date-based views. |
| Issue boundary | [invoice issue process](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/modules/Finance/invoices_manage_issueProcess.php) | Only pending invoices are issued. The schedule due date and standard-fee facts are copied into invoice-owned fields/rows, marked as separated from their templates. |
| Payment and staff edit | [invoice edit process](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/modules/Finance/invoices_manage_editProcess.php) | Partial payment adds to previously recorded payments; a payment log is written and optional receipt email is handled. Table locking is explicitly used around invoice updates. |
| Payment/receipt history | [payment log and receiptContents](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/modules/Finance/moduleFunctions.php) | Individual payment rows include type, status, amount, operator and gateway references. Receipt generation can address a particular payment in a sequence. |
| Online entry point | [online payment process](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/modules/Finance/invoices_payOnlineProcess.php) | Invoice ID and access key are checked, remaining payment value is calculated, and a shared payment service is used for confirmation. |
| Workflow tests | [ManageInvoices acceptance test](https://github.com/GibbonEdu/core/blob/912cb5abc73a047f0c0ad64d26c398067e38a6eb/tests/acceptance/Finance/ManageInvoicesCept.php) | Add, edit, issue and delete-pending-invoice flows are exercised through the UI. Other finance test files cover invoice viewing, schedule/fee configuration and online payment pages. |

### Lifecycle and relationships

A person has an invoicee configuration. Invoicees may direct fees to a family or a company, with company category coverage and optional family copying. A school-year invoice contains standard or ad hoc fee lines and either a schedule reference or its own due date. States include pending, issued, partially paid, paid, cancelled and refunded.

The most reusable idea is the **issue-time snapshot**. A draft can follow a fee template, but an issued invoice must preserve the amount and description that the family was actually asked to pay. Changing next term's fee catalogue must not change an old PDF. “Overdue” is computed using issue state and dates rather than requiring a scheduled task to rewrite every invoice.

The payment log supplies evidence for multiple receipts rather than treating a receipt as an “invoice with a paid stamp”. However, in the inspected staff-edit flow, invoice-table changes and the later payment-log call are not enclosed in one clearly shared database transaction; table locks are released before logging. The code tracks partial failure. This is a **design limitation to avoid**, not a claim that every Gibbon installation loses records. Rosewood should commit payment, allocations, receipt identity and audit event atomically, then render/send documents afterward with retryable status.

**Design lessons for Rosewood:** include family and third-party payer details, standard/ad hoc fee lines, school-year and term filtering, a distinct issue action, visible payment history and a receipt per confirmed payment. Make parent contact visibility independent from liability; sending a copy does not establish financial responsibility.

**Do not import wholesale:** a status editor that accepts “Paid” is not sufficient evidence that funds arrived. Preserve separate payment-recorded and payment-verified states. Use permanent receipt IDs, not a mutable row position. Gibbon's simple invoice-focused payment linkage does not establish all cross-invoice/family allocation requirements; implement those explicitly.

## 3. RosarioSIS: a small student ledger, with important allocation limits

**Why relevant:** demonstrates how little is needed for a usable school fee ledger and which shortcuts become problematic for a richer billing application. The [official documentation index](https://www.rosariosis.org/documentation/) describes profile-specific generated manuals; the [Student Billing Premium manual page](https://www.rosariosis.org/modules/student-billing-premium/) describes additional recurring fees, invoice/receipt PDFs, imports and online payment. Premium source was **not** purchased or inspected, so those features are manual-level evidence only.

### Concrete source map

| Concern | Inspected evidence | What it establishes |
|---|---|---|
| Core schema | [billing_fees and billing_payments tables](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/rosariosis.sql) | Both tables reference student and school/year; amounts are `numeric(14,2)`. Fees have assigned/due dates and waiver linkage. Payments have payment date and refund linkage. Both retain creator/time and attachment fields. |
| Fee management | [StudentFees](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/modules/Student_Billing/StudentFees.php) | Fees can be entered, changed, deleted or waived. A waiver is represented by a negative fee row linked to the original. |
| Payment/refund management | [StudentPayments](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/modules/Student_Billing/StudentPayments.php) | A refund is a negative payment referencing the original. Delete/refund permissions are separated from normal entry; UI can display creator and creation time. |
| Match suggestion | [_makePaymentsCommentsInput](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/modules/Student_Billing/functions.inc.php) | A fee dropdown fills payment amount/comment, excluding candidate fees using amount, comment/title and payment-date comparisons. This is a heuristic, not a payment-to-invoice allocation relation. |
| Balances and statements | [StudentBalances](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/modules/Student_Billing/StudentBalances.php) and [Statements](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/modules/Student_Billing/Statements.php) | Balance is fees less payments. A cumulative option removes school-year grouping so older debt remains visible. Statements assemble student fees/payments. |
| Batch entry | [MassAssignFees](https://github.com/francoisjacquet/rosariosis/blob/e159aec090c5b8cc25ac8955bb83621252d3d685/modules/Student_Billing/MassAssignFees.php) | The staff workflow can assign charges to selected students as a batch. |

### Lifecycle and limitations

The core stores two student ledgers rather than an invoice header/line/allocation graph. A fee can be assigned now and due later; total account balance includes the charge regardless of due date. That distinction is visible both in the balance query and the [maintainer's billing discussion](https://www.rosariosis.org/forum/d/501-student-billing-report). Rosewood must show **total outstanding** separately from **overdue outstanding**, including the past-due portion of partially paid invoices.

Linked negative records preserve the relationship between an original payment and a refund, or an original fee and a waiver. This is valuable. But unrestricted editing/deletion is not an adequate final accounting audit trail: the core payment deletion also deletes refund rows referring to that payment. Rosewood should retain issued records and correct them with recorded reversals or credit notes, plus actor, reason and time.

The selected core contains no explicit invoice-to-payment allocation table. Matching equal amounts and similar descriptions cannot reliably handle two identical term fees, part payment, one deposit for siblings, a renamed fee or an overpayment. Do not copy this shortcut. No dedicated billing automated test suite was found in the inspected public tree; that is an evidence gap, not proof that maintainers do no testing.

**Design lessons for Rosewood:** start with a clear student ledger, carry balances across years, record supporting payment evidence, offer batch charge entry, and make creator/history visible. Keep fee waivers distinct from cash refunds. Add first-class account, invoice and allocation entities before building complex payment status logic.

## 4. Odoo Community: payment state, reconciliation and reversals

**Why relevant:** supplies mature separation between invoice posting, payments, payment-provider transactions and bank reconciliation. The [Odoo 19 payments manual](https://www.odoo.com/documentation/19.0/applications/finance/accounting/payments/online.html) distinguishes “in payment” from “paid”, with behaviour depending on outstanding-account configuration. Recording a payment need not move money.

### Concrete source map

| Concern | Inspected evidence | What it establishes |
|---|---|---|
| Invoice lifecycle | [account.move](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/account/models/account_move.py) | Draft/posted/cancelled document state is separate from computed payment state. Invoice details are tracked; posted numbering has a database uniqueness guard and optional inalterability hashing. |
| Lines and allocation | [account.move.line](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/account/models/account_move_line.py) and [account.partial.reconcile](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/account/models/account_partial_reconcile.py) | Reconciliation connects debit and credit lines with an explicit positive amount, currency amounts and date; full reconciliation is a separate relationship. |
| Payment records | [account.payment](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/account/models/account_payment.py) | Payment identities and bank/account linkage are distinct from invoices; reconciliation status can affect invoice paid status. |
| Provider transaction | [payment.transaction](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/payment/models/payment_transaction.py) | Unique transaction reference, provider reference, amount/currency, draft/pending/authorized/done/cancel/error states, source/child transaction links for refunds and post-processing marker. |
| Invoice report | [invoice reports](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/account/report/account_invoice_report.py) | Reporting can produce invoice outputs with or without payment lines. Document presentation and accounting relationships remain distinct concerns. |
| Payment/reconciliation tests | [duplicate payment tests](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/account/tests/test_account_payment_duplicate.py), [reconciliation tests](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/account/tests/test_account_move_reconcile.py), [provider transaction tests](https://github.com/odoo/odoo/blob/c50a4e0513e5247f1b680ccbb5c0d27795a10b55/addons/payment/tests/test_payment_transaction.py) | Duplicate payment cases, multiple invoices/currencies, partial reconciliation, unlinking, refund permissions and partial capture have direct tests. |

### Lifecycle and safety patterns

`Partner → invoice/accounting move → receivable lines ↔ partial reconciliations ↔ payment/bank lines`; separately, `payment provider → transaction → possible child refund transaction`.

Invoice payment state is computed from residual amount and matching evidence. A full amount alone does not always imply bank reconciliation is finished. Payment-provider state changes permit only specified transitions, skip a transaction already in the target state and log invalid transitions. A scheduled post-processing pass retries records marked as not yet processed. These are useful ingredients for handling webhooks and delayed settlement, but they do not by themselves prove every provider implements exactly-once external charging.

Refunds are linked child transactions. Unreconciling has deliberate consequences: partial matching records are removed, full matching is adjusted, related tax/exchange moves may be reversed, and payment state is recomputed. Rosewood's much smaller system still needs this principle: reversing a payment must update invoice outstanding, allocation records and audit history consistently, not just flip a badge.

**Design lessons for Rosewood:** maintain independent invoice, payment and reconciliation states. For manual bank transfer, “reported/recorded” should not issue a final paid receipt until an authorised staff member verifies receipt of funds. A confirmed overpayment can remain unapplied. Keep original transaction and reversal/refund links; make duplicate notifications harmless.

**Do not import wholesale:** Rosewood is not being commissioned as a full ledger or bank-reconciliation replacement. If the existing accounting product is Xero, retain that system as the accounting authority and distinguish “verified in school billing” from “reconciled/exported in Xero”. Account configuration can change Odoo behaviour, so its UI labels should inform Rosewood's design rather than be copied without definitions.

## 5. Invoice Ninja: many-to-many allocation, credits and receipt history

**Why relevant:** a billing-first product that makes unapplied funds, invoice balances, credits and cash refunds visible. Its [invoice guide](https://invoiceninja.github.io/docs/user-guide/invoices) and [payment guide](https://invoiceninja.github.io/docs/user-guide/payments) explain the user-facing distinction between payment value and the portion used against invoices. The inspected version is source-available under ELv2.

### Concrete source map

| Concern | Inspected evidence | What it establishes |
|---|---|---|
| Invoice/payment models | [Invoice](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Models/Invoice.php), [Payment](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Models/Payment.php), [Paymentable](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Models/Paymentable.php) | Separate clients, invoices, payments and credits. Payment totals include amount, applied and refunded; a pivot records amount/refunded for each invoice or credit relationship. |
| Database constraints | [base schema](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/database/migrations/2014_10_13_000000_create_users_table.php) | One payment can cover multiple invoices; payment numbers are unique within company. Pivot records retain allocation amounts rather than only a link. |
| Duplicate prevention | [idempotency migration](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/database/migrations/2022_09_30_235337_add_idempotency_key_to_payments.php) and [payment request validation](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Http/Requests/Payment/StorePaymentRequest.php) | Database uniqueness on `(company_id, idempotency_key)`, company/client-scoped invoice and credit validation, distinct IDs and amount rules. |
| Payment application | [UpdateInvoicePayment](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Services/Payment/UpdateInvoicePayment.php) | Overpayment is limited to invoice balance; invoice, client and payment applied amounts must be coordinated. |
| Refund lifecycle | [RefundPayment](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Services/Payment/RefundPayment.php) | Calculates invoice-level refunds, handles credits separately from cash, invokes optional gateway refund, updates allocation and invoice values, records activity and optionally queues email. |
| Numbering and PDF | [ApplyNumber](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Services/Invoice/ApplyNumber.php) and [GetInvoicePdf](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Services/Invoice/GetInvoicePdf.php) | Number assignment depends on document lifecycle; save retries handle number collisions. PDF generation is separate from the invoice model. |
| History | [Activity](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/app/Models/Activity.php) | Actor, company, client, invoice/payment links, backup/history relations and event types support a timeline. |
| High-value tests | [credit/refund double-spend test](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/tests/Feature/Payments/CreditRefundDoubleSpendTest.php), [unapplied refund tests](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/tests/Feature/Payments/UnappliedPaymentRefundTest.php), [payment validation tests](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/tests/Feature/Payments/StorePaymentValidationTest.php), [provider reference lookup tests](https://github.com/invoiceninja/invoiceninja/blob/d69e2acf6a42574fea96c3c9f5c9414c22fa2891/tests/Unit/PaymentDrivers/Stripe/FindPaymentByStripeReferenceTest.php) | Money invariants and boundary cases are treated as regression concerns, including mixed credit/cash payments and refund eligibility. |

### Lifecycle and failure cases

A client may pay before an invoice exists. The payment keeps its value on account; allocations consume some or all of it. An invoice can be paid by several payments, and one payment can be used across invoices. A credit note is a reduction in debt/value owed to the customer; it must not become an accidental additional cash payment when refunded.

The inspected regression scenario creates an invoice covered partly by a credit and partly by cash, then attempts a refund of the entire invoice value. That scenario is exactly why invoice settlement, cash received, credit applied and cash refunded should be separate fields/records. Rosewood should test with small amounts, but preserve the invariant: a credit restoration is not a cash refund and must not allow the same value to be spent twice.

The request's idempotency key is a strong database constraint, but the fallback generated key includes the current time. Rosewood should require a stable client-generated operation key and bind it to a request digest; an identical replay returns the original result, while the same key with different content is rejected. Unique-key validation alone is not necessarily a replay-friendly API.

**Design lessons for Rosewood:** make payment allocation explicit, preserve unapplied account credit, store paid/refunded/allocation facts, give each receipt a durable number and retain actor history. Use database uniqueness and atomic balance validation rather than relying on a double-click guard.

**Evidence discrepancy:** the live payment manual limits refund eligibility to allocated amounts, while the pinned `UnappliedPaymentRefundTest` contains a successful partial-refund expectation for an unapplied payment. That test also has a conditional path after request validation, so it is weaker evidence than an unconditional regression test. Do not infer a universal product rule from either source alone; Rosewood must define and test its own policy.

**Do not import wholesale:** archived/deleted payment semantics and number reuse described in the product guide are not Rosewood requirements. For the school, do not recycle issued invoice or receipt numbers and do not erase confirmed money history. Online payment, gateway refund and automatic emails must remain separate, explicitly commissioned integrations. ELv2 code/templates are not being adopted.

## 6. Akaunting: simple document history and transaction splitting

**Why relevant:** a compact business-invoicing model with a customer overview and transactions separate from documents. Its manual describes [adding confirmed payment and sending a receipt](https://akaunting.com/hc/docs/invoices-and-estimates/adding-payment-to-an-invoice/) and [connecting or splitting bank transactions](https://akaunting.com/hc/docs/banking-feeds-reconciliations/transactions/). The inspected version is source-available under BSL, with production-use restrictions documented above.

### Concrete source map

| Concern | Inspected evidence | What it establishes |
|---|---|---|
| Document graph | [Document](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/app/Models/Document/Document.php) | Header stores contact details, currency, dates, amount and document number; relations link items, totals, history and transactions. Contact values are also stored on the document. |
| Transactional creation | [CreateDocument](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/app/Jobs/Document/CreateDocument.php) | Total starts from zero and is derived from lines by the totals job, not accepted as caller authority. Document/items/totals/recurrence writes share a database transaction. |
| Payment creation | [CreateBankingDocumentTransaction](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/app/Jobs/Banking/CreateBankingDocumentTransaction.php) | Checks outstanding amounts, prepares document/contact/currency fields, creates transaction and history in one database transaction. |
| Split transactions | [SplitTransaction](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/app/Jobs/Banking/SplitTransaction.php) | Child transactions link to an original transaction; split sum must match the parent in currency precision, and document existence is checked before writes. |
| Cancellation | [CancelDocument](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/app/Jobs/Document/CancelDocument.php) | Cancellation is refused if linked transactions are reconciled; allowed cancellation removes relationships inside a transaction and changes document state. |
| Audit history | [CreateDocumentHistory](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/app/Jobs/Document/CreateDocumentHistory.php) | History records document, status, notification flag, description, source and actor. |
| Tests | [SplitTransactionTest](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/tests/Feature/Banking/SplitTransactionTest.php), [CancelDocumentTest](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/tests/Feature/Document/CancelDocumentTest.php), [DocumentTransactionsTest](https://github.com/akaunting/akaunting/blob/80f98363cf8f5e89db3203daa74263b5bdeb9848/tests/Feature/Banking/DocumentTransactionsTest.php) | Tests cover invalid split targets, nonmatching sums, reconciled cancellation, overpayments and partial payments with currency conversion. |

### Lifecycle and lessons

A document has independent transaction history and computed paid/reconciled amounts. A single bank entry may be split into child transactions connected to individual bills/invoices. Status includes draft, sent/received, viewed, partial, paid and cancelled; payment history need not be inferred from a “viewed” event.

The inspected split regression test documents a prior early-return error that skipped later split items. This reinforces an acceptance criterion for Rosewood: a multi-invoice allocation either fully commits or changes nothing; a missing final invoice cannot leave the first invoice paid. The cancellation test similarly guards against destroying reconciled bank evidence.

**Design lessons for Rosewood:** calculate financial totals on the server, validate the entire proposed split before mutation, wrap related database writes in a transaction, preserve source bank reference and recording actor, and show the contact snapshot on the document.

**Do not import wholesale:** deleting payment relationships on cancellation is unsuitable for Rosewood's desired permanent money trail. Prefer auditable reversal records. No general replay-safe idempotency guarantee or full credit/refund lifecycle was established from the inspected Akaunting paths; do not imply one. Its user/invoice limits also make “just rebrand the free product” an unsupported option.

## Cross-product decisions for Rosewood

The following are **design recommendations inferred from the evidence**, not claims that every source product implements them.

| Decision | Evidence that informed it | Rosewood implementation consequence |
|---|---|---|
| Family/payer account separate from student | Gibbon invoicees; ERPNext customer boundary; Invoice Ninja client | `BillingAccount` with contacts and one or more students; the student can be prospective. Optional enrolment ID is an external reference, not the primary key. |
| Fee definition separate from invoice | Frappe structure/schedule; Gibbon issue snapshot | Versioned fee templates and draft invoices; issue assigns a durable number and freezes contact/line/tax/service-period facts. |
| Explicit allocation table | ERPNext reference rows; Odoo partial reconciliation; Invoice Ninja paymentables | A payment may fund several invoices and several payments may fund one invoice. Every allocation names account, invoice, payment and amount. |
| Payment evidence has its own state | Odoo payment versus reconciliation; Akaunting confirmation instruction | Record/reported, verified, failed and reversed states are distinct. Verification is an authorised staff action with evidence/reference. Only verified funds affect final paid balances/receipts. |
| Money movement and credit adjustment differ | Invoice Ninja mixed-credit refund regression; Rosario waiver/refund linkage | Credit notes reduce charges; payments record cash; refunds reduce net cash; reversals repair recording errors. Never combine these as a free-form negative amount. |
| Idempotency is persistent | Invoice Ninja unique key; Odoo state transition guards; ERPNext stale-payment tests | Durable operation IDs and request hashes, unique bank/provider references when supplied, conditional writes and revalidation under transaction. |
| History survives corrections | Gibbon creator/payment log; Odoo reversals; Akaunting history | Append-only audit events and linked corrections with actor/time/reason. Retain issued invoice and receipt numbers permanently. |
| Document rendering is downstream | Gibbon receipt generator; Invoice Ninja PDF service | Durable invoice/receipt snapshot first; PDF/download re-render can retry. Delivery state is separate from financial state. |
| Dashboard numbers need definitions | Rosario balance vs overdue; Odoo in-payment distinction | Separate billed, total outstanding, overdue outstanding, verified received, unverified payments and unapplied funds. Never count draft charges as issued debt. |
| Future integrations require clear ownership | Frappe school/accounting boundary; Odoo bank matching | Enrolment is a read-only optional identity source. Xero, if confirmed as the existing accounting product, needs explicit source-of-truth/export mapping before bidirectional sync. |

### Minimum acceptance cases derived from the research

1. Create a prospective student and family account without enrolment; later link a verified enrolment identifier without changing past documents or balances.
2. Issue a term invoice, then edit the fee catalogue and payer address; the issued document remains unchanged.
3. Enter a partial payment; invoice balance falls only after verification. Download a receipt tied to that exact verified payment.
4. Apply one verified deposit to two sibling invoices. A failing allocation target rolls back the entire operation.
5. Accept an overpayment as unapplied funds and use part against a later invoice; total value is conserved.
6. Replay the same payment request and concurrently submit two full allocations against one balance; there is one payment outcome and no over-allocation.
7. Reuse an idempotency key with a different amount or account; reject it rather than silently return an unrelated result.
8. Apply a credit note plus cash, then refund only eligible cash; restored credit cannot be spent twice or reported as cash received.
9. Reverse an incorrectly recorded payment with a reason; original receipt/history remains visible and affected balances recompute consistently.
10. Mark an issued invoice overdue by due date, including the remaining portion of a partially paid invoice; future fees do not inflate overdue totals.
11. Ensure a staff member without finance permission cannot verify payments, issue/cancel invoices, export sensitive data, or obtain another account's documents through direct API calls.
12. Regenerate a PDF and repeat a download without creating new financial records. An email/rendering failure does not lose the payment or reissue a number.
13. Preserve old-year outstanding balances through a new school year. Reports reconcile to source invoices, credit notes, payments, refunds and allocations.
14. Keep all billing code, data tables, credentials, routes and deployment configuration separate from enrolment; billing outages must not block enrolment submissions.

### Remaining research/commissioning gaps

- This review does not establish Rosewood's actual fee policy, discounts, responsible payers, invoice legal wording, GST treatment, bank details or approved payment methods. These must be supplied/configured and verified before real invoices are issued.
- No third-party package was run as a proof of concept, and upstream tests were read rather than executed. Rosewood tests must validate its own implementation independently.
- No Xero tenant or accounting API was accessed in this subtask. The user's “Xerox” wording is treated as a likely reference to Xero, to be confirmed before any integration.
- Connector setup, card charging, refund execution, email delivery and production deployment were not exercised in this research. The initial staff portal can record/verify external payment evidence and generate documents while those integrations remain unconfigured.
