# School billing product and manual map

Research date: **12 September 2026**. Scope: school receivables, invoices, receipts, family responsibility, payment progress, staff operations and future enrolment integration. This is a design evidence map, not a vendor recommendation, implementation claim or statement of Australian tax treatment.

The research inspected substantive official operational documentation for **eight school products**: TASS, Compass, Sentral, Synergetic, FACTS, Blackbaud Tuition Management, Arbor and Bromcom. It also examined iSAMS and Veracross vendor material, attempted their support resources, and checked Schoolbox's integration boundary. Schoolbox is an adjacent portal/integration comparator, not counted as a verified billing engine. Vendor source code was not obtained for these proprietary products; public code comparisons belong in the separate open-source research.

## Evidence quality and scope

| Product | Market/context examined | Evidence actually inspected | Confidence and limits |
|---|---|---|---|
| TASS | Australian school parent accounts | Operational billing checklist; receipts and electronic processing; split billing; account enquiry; enrolment receipt types | Strong workflow evidence. No live school instance, complete role matrix or proprietary code inspected. |
| Compass | Australian Billing Management | Official 9-page setup PDF, official billing hub and guide index | Strong setup/entities/permissions evidence. Four advanced guide viewers exposed titles but their image previews failed; their contents are not treated as verified. PDF includes a 2022 example; current hub adds newer capabilities. |
| Sentral | Fees, Billing & Payments and Xero integration | Official FAQs for invoice payment, debtor instalment plan, automatic Xero push and prepayment sync | Strong evidence for those specific workflows. NSW DoE Finance is a separate module/context; do not assume identical functionality. |
| Synergetic | Australian debtor and community portal workflows | Current support guide on debtor instalments; historic split-payment and outstanding-charge manuals | Strong charging/instalment workflow evidence, with historic split-payment documentation explicitly dated. Portal FAQ was discoverable but full subsequent reads failed, so only discovery is recorded. |
| FACTS | Australian caregiver payment plans | Detailed official Australian caregiver FAQ; official implementation milestone checklist | Strong payer-facing operation evidence. School administrator manual and full permission catalogue were not public in this inspection. |
| Blackbaud Tuition Management | Independent K–12 school family receivables | Official billing adjustments, fee/discount, reports and enrolment integration help | Strong ledger, adjustment and enrolment boundary evidence. US payment rail and tax terms are not Rosewood requirements. |
| Arbor | UK school meals, clubs, trips and top-up accounts | Official create/cancel/credit invoice and receipt guidance | Strong operational evidence, but these prepaid/service accounts differ from annual independent-school tuition billing. |
| Bromcom | UK school/MAT accounts receivable | Current user-guide index and invoice, receipt, credit, refund, statement guides | Strong finance operations evidence. No assumption that UK VAT or BACS conventions apply in Australia. |
| iSAMS | Independent-school fee billing | Official module page; support site attempted | Marketing-level feature evidence only. Four-stage checks and split billing advertised, exact states/permissions not verified. |
| Veracross | Independent-school tuition portal | Official product and support pages; payer-support page attempted | Marketing and access-boundary evidence only; support page did not expose a usable manual. |
| Schoolbox | School portal/SIS integration | Official TASS Schoolbox integration checklist; Schoolbox help attempted | Verified partner integration boundary, not a school billing workflow. Schoolbox help redirected to login. |

Every URL below was accessed or attempted on the research date. Dates are vendor dates only when visible in the source; search-engine crawl/publication estimates are not treated as publication dates. The notes are short original paraphrases, not copied manuals. A feature absent from inspected material is **unverified**, not necessarily absent from the product.

## 1. TASS: the most complete Australian operational reference

**T1 — [Auto Account Billing Checklist](https://tasshub.kb.tassweb.com.au/documentation/auto-account-billing-checklist).** Official live manual; no publication date shown in the inspected text. The sequence checks student entry/leaving dates, current billing period, fee/discount structures, billing flags and split arrangements. It uses a repeatable pre-billing preview, performs the billing once per period, compares the resulting batch to the preview, then generates statements. Statements must be published to retain internal copies even when the parent portal is unused. Statements and ledger cut-off dates must agree. This supports a reviewed batch with stable inputs, an explicit issue action, duplicate prevention and stored documents.

**T2 — [Split Billing Accounts](https://tasshub.kb.tassweb.com.au/documentation/pac-split-billing-accounts).** Official live manual. A source parent account and recipient accounts carry the split; supported dimensions are overall percentage, specified students, or fee codes. Fee-code splits may use percentages or amounts. A parent flagged for split billing but lacking an arrangement is visibly unresolved. This argues for explicit payer responsibility records and a validation error for incomplete responsibility, rather than deriving liability from household composition.

**T3 — [Receipts](https://tasshub.kb.tassweb.com.au/documentation/pac-receipts).** Official live manual. Receipt batches can be prepared progressively. A receipt is separate from its applications to charges; it may be unapplied or partially applied. Allocation can be manual or oldest-first. A third party can receive the receipt while the payment reduces the parent's account. Fee, enrolment and sundry receipts have distinct purposes. A receipt may include non-fee distributions. Reprinting is a first-class operation. These details justify independent payment, allocation and document entities, including payer identity separate from the account debtor.

**T4 — [Electronic Receipts Processing](https://tasshub.kb.tassweb.com.au/documentation/pac-electronic-receipts-processing).** Official live manual. Successful gateway batches are converted to receipts after checking against the provider's settlement report. Pending versus approved mismatch can occur after a communication failure. Uploaded/provider batches remain identifiable; accounting settlement groups are distinct from individual parent payments. Rosewood should preserve external references and treat an interrupted response as uncertain, with reconciliation rather than blind retries or a manual “paid” toggle.

**T5 — [Parent Account Inquiry](https://tasshub.kb.tassweb.com.au/documentation/pac-parent-account-inquiry).** Official live manual. Account status is system-maintained, with last statement, later charges, payments, credits and current balance. Staff can inspect overdue arrangements, transactions, stored statements and diary notes. Payment schedules show instalment state and a change log; declined/recalled payments can need follow-up. Future/missed instalments have different edit restrictions from attempted payments. Administrator comments and parent-visible comments are explicitly separate. The central Rosewood screen should therefore show why an amount is due and what action is next, while preserving a restricted financial history.

**T6 — [Enrolment Detailed Entry](https://tasshub.kb.tassweb.com.au/documentation/enr-detailed-entry-for-enrolment-applications).** Official live manual. Its enrolment receipt definitions include school fees paid before the student is current; the advance is credited to the parent debtor when transferred to current. An application-stage payment is consequently possible without full enrolment. Rosewood can model a prospective student and a billing account independently, then link an enrolment reference later. This does not require changing the existing application workflow.

**T7 — [How to Reverse Fee Receipts](https://tasshub.kb.tassweb.com.au/documentation/how-to-reverse-fee-receipts).** Official live reversal guide inspected. Once a bank deposit report has been generated, its documented correction restores the parent balance and corrects the cashbook through linked accounting operations. The page also advertises a newer automated reversal as “Coming Soon” for a specified version and friendly-school testing. That announcement is not treated as universally released behaviour. Rosewood should make one reversal transaction restore the relevant allocations and preserve links to the original receipt, with tests that verify both account and cash-record effects.

**Most useful adoption:** batch preview, account-level receivables, student-level line attribution, explicit allocation, retained statement snapshots, follow-up flags and separate staff/family comments. **Do not copy mechanically:** desktop-era exclusive processing windows, vendor-specific codes, gateway dates or accounting configuration.

## 2. Compass: approachable billing setup and permissions

**C1 — [Billing Setup Guide](https://home.compass.education/hubfs/Billing%20Setup%20Guide.pdf), 9 pages.** Official PDF inspected, including pages 2–4 text; undated, with a 2022 billing-run example. Its core entities are debtor, reusable item, date-based billing run and cohort billing schedule. Debtors may be created from parents or manually. The guide handles split families, discounts and multiple payments. It distinguishes `Billing.Base` (view dashboard/log/schedules), `Billing.Create`, `Billing.Configure` (templates) and `Billing.Admin`. The setup presents debtor creation before the run and instalment options. This is a strong precedent for separating staff who need visibility from staff who alter financial records, and for a guided first-run setup.

**C2 — [Billing Management hub](https://www.compass.education/compass-billing-management/).** Official product/training hub inspected. The current hub lists partial payment, refunds, statements/tax receipts, locked item amounts and tracking categories, and describes reconciliation into the SIS/accounting system. Its guide index separately covers failed plans, unallocated funds, manual payments, reallocation, receipts and new/exited students. These are useful categories for staff navigation, but an index listing alone does not verify the detailed procedure.

**C3 — Advanced guide access attempts.** Official links for [failed plans](https://files.compass.education/external/bc11a8b2523197c206726d573b44b5a45fed693358f4b472c654aa65ac102545), [unallocated funds/credit](https://files.compass.education/external/7e6e38e3d9a4dbbc49d31d45794b6422a207e333b98a653bce43de20421b7026), [receipts](https://files.compass.education/external/e1c69fff288e2b62745eebfd2b5ef1b754e2ced069f1676d4444c9d6ace20bcb) and [dashboard](https://files.compass.education/external/bea9510d428543e67ab10653e8660f0737524aa9ca158a04d1fb810fc89a7170) resolved to named viewer pages. Their downstream preview images returned tool errors. They are mapped for future access, not represented as read. The [one-page checklist](https://home.compass.education/hubfs/Billing%20Checklist.pdf) initially resolved as a PDF but a repeated read returned 403; no detailed conclusion depends on it.

**Most useful adoption:** the short setup path, fee templates, cohort runs, simple staff permission levels and searchable payment history. **Rosewood departure:** require staff-confirmed responsibility; do not copy automatic 50/50 responsibility based solely on separate parent households. Compulsory tuition and voluntary gifts need separate behaviour.

## 3. Sentral: operational billing with an accounting-system boundary

**S1 — [How to Receive a Payment on an Invoice](https://help.sentral.com.au/modules/payments/faq/1810471).** Official operational FAQ, no visible update date. Staff filter the invoice-management list, select an invoice, open its payment action, enter details and create the payment. This is a useful concise staff workflow: identify the exact obligation before recording the financial event.

**S2 — [Apply an Instalment Plan to a Debtor](https://help.sentral.com.au/modules/payments/faq/1810477).** Official operational FAQ. The plan is chosen from the debtor's settings. It is not stored as an enrolment-status field. Rosewood should have a financial arrangement associated with an account and a separate payment schedule beneath it.

**S3 — [Automatically push invoices to Xero](https://help.sentral.com.au/modules/payments/faq/1912489).** Official operational FAQ. The guide describes an integration setup and a school setting controlling automatic invoice push; it recommends verifying manual pushes before automation. Its certificate/webhook setup wording may reflect an older integration implementation, so it is not an API specification. The applicable lesson is a visible export/sync policy with a manual trial path, not silent financial writes as a side effect of saving a student.

**S4 — [Xero overpayments and prepayments in Sentral](https://help.sentral.com.au/modules/fees%26billing/faq/2013614).** Official operational FAQ. A nightly sync retrieves transactions within a 90-day transaction-date window, while debtor-specific manual sync retrieves older data. This shows a real failure mode: entering a backdated adjustment today may not appear in a recent-date sync. Rosewood's future integration needs external IDs, a watermark strategy, reconciliation and a repair/backfill mechanism. A balance cannot be treated as fresh merely because a job ran successfully.

**S5 — [NSW DoE Finance FAQ index](https://help.sentral.com.au/index.php/modules/finance/faq/2014205).** Official index examined only. It names credits, subsidies, overpayments, partial fee balance removal, receipt/payment correction, reversal/refund and end-of-day approval. Specific procedures were not exposed in this result. This is a separate evidence tier and should not be merged with Fees, Billing & Payments as though one exact module was inspected.

**Most useful adoption:** invoice-centred staff actions, debtor-based arrangements, optional explicit accounting export and repairable sync. **Implementation caution:** the user said “Xerox”; confirm whether that means Xero before configuring any external account. The internal system can be developed without making that assumption operational.

## 4. Synergetic: distinguish staged charges from payment arrangements

**Y1 — [Debtor Instalments](https://synergetic.help.tes.com/support/solutions/articles/75000141113-debtor-instalments).** Official current support guide, displaying “Modified on Wed, 4 Mar at 3:12 AM” without a visible year. It explicitly describes instalments as the timing of **charging**, separate from payments. Fee rules determine which students are charged; a “What If” run previews detailed student charges and a summary. Statements/invoices are generated, stored and authorised before publication or email. The guide addresses midyear entry, changed instalment frequency and leaving before completion. This distinction is essential: a payment plan for an already issued annual invoice is a different object from a schedule that raises new term invoices.

**Y2 — [Split Payments tab, v65](https://static.synergetic.net.au/v65/w65_html/1259.html).** Official historical manual: published 15 October 2013, tab last modified 7 November 2012. It attaches split rules to debtors; category, percentage and fixed-amount rules can redirect charges. Concessions need compatible splits. The historic manual states percentages are based on gross rather than successively reduced amounts. Use this as a test-design example for the order of discounts and responsibility, not evidence of current product behaviour.

**Y3 — [Outstanding tab, v67](https://static.synergetic.net.au/v67/w67_html/1295.html).** Official historical manual: published 16 September 2016. Outstanding balances compare charges to allocations; default allocation favours older debts. Staff can inspect allocation detail and the general-ledger allocation. For Rosewood, the source of a balance should remain inspectable, rather than storing an unexplained outstanding number on each student.

**Y4 — [Community Portal & Payments FAQ](https://synergetic.help.tes.com/support/solutions/articles/75000142057-synergetic-community-portal-payments).** Official support URL resolved, and search excerpts exposed discussion of payment-plan changes and portal display. Subsequent full-section reads returned errors. Mapped for follow-up; no detailed feature claim depends on it.

**Most useful adoption:** separate invoice-generation schedules from debt-payment schedules, dry-run summaries, archived documents and explicit midyear/withdrawal handling. **Do not assume:** copying an accounting recognition workflow is appropriate for a small billing application alongside an existing ledger.

## 5. FACTS: unusually useful Australian payer guidance

**F1 — [Australian caregiver payment-plan FAQ](https://factsmgt.com/caregiver-faqs-ftm/).** Official detailed operational FAQ, no visible publication date. Balances, upcoming schedule, payments made and printable confirmations are separate views. Prepay funds do not automatically settle the next scheduled payment. Additional authorised payers can contribute without owning the plan; ownership transfer uses an invitation and new financial details. Weekly/fortnightly missed payments and longer-frequency plans have different retry behaviour, with unresolved payments needing action. Terminating a plan does not erase the school balance. Financial account tokens are used instead of exposing account details to staff. This supports separate plan state, payment-attempt state, account balance and person permissions. Vendor retry rules and fees should not be copied as Rosewood policy.

**F2 — [Tuition Management Implementation Milestone Checklist](https://factsmgt.com/wp-content/uploads/FACTS_Welcome_Kit_Milestone_Checklist.pdf).** Official two-page onboarding checklist. It separates family sign-up approval/go-live, payment-plan finalisation training, system training, accounting reports, incidental billing and prepay training. The design implication is an operational launch checklist covering billing staff competence and realistic family scenarios, in addition to software tests.

**F3 — [Support](https://factsmgt.com/support/).** Official support page inspected. It distinguishes SIS/Family Portal support from tuition-plan support and lists Australian support separately. Public parent documentation is useful, but the school-side administrator workflow and exact role matrix remain unverified.

**Most useful adoption:** readable account dashboard, permissions for non-guardian payers, explicit retry/failure history, token-only future gateway integration and plan changes that preserve prior activity. **MVP boundary:** tracking an agreed manual plan is useful without collecting payment credentials or initiating debits.

## 6. Blackbaud Tuition Management: adjustment audit and reporting depth

**B1 — [Edit Billing Details](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/tuition-management/content/st-edit-billing-details.html).** Official help. Family accounts contain student- or family-based fees/discounts by month. Changes require a reason; the audit records the original amount, adjustment, replacement amount, time, scope and actor. Future amounts can be zeroed while previous payments remain intact. Removing a fee is restricted when payments have been applied. This is a strong reason to correct issued Rosewood financial records with credit/reversal events rather than editing history in place.

**B2 — [Apply Fees & Discounts](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/tuition-management/content/st-family-fee-discount.html).** Official help. A fee/discount can target a family or a particular student. Batch actions operate in the corresponding family/student view and carry reasons and effective months. Rosewood should distinguish a once-per-family levy from a per-student tuition item and show both line attribution and the responsible account.

**B3 — [Reports](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/tuition-management/content/st-reports.html).** Official help. Report families include billed-versus-paid, receivable ageing, scheduled/failed/cancelled payments, refunded payments, changed allocations, remittance detail and family/student statements. Forecast incoming payments and actual remitted cash are distinct reporting concerns. Rosewood's staff dashboard should make overdue action visible and offer reconciliation exports; a large “collected” total alone would hide allocation failures and unsettled payments.

**B4 — [Enrolment contract integration: payer experience](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/education/k12/full-help/content/ems-smart-users.html).** Official K–12 help. Contract acceptance, tuition-plan choice, billing identity and deposit/fee handling form an integration workflow that creates or finds a family account. A signer may be distinct from a payer, and siblings can share a family account. Offline deposits are an available school option. Rosewood can support this eventual workflow through explicit linking; a parent signing an application should not automatically gain financial responsibility or permissions.

**Most useful adoption:** student/family line scope, reasoned adjustments, actor-and-time audit, billed/paid/remitted reporting and an optional enrolment link. **Do not transplant:** US banking rules, tax report meanings, automated fee collection or vendor-specific contract authority rules.

## 7. Arbor: useful account operations and a documented receipt gap

**A1 — [Creating invoices](https://support.arbor-education.com/hc/en-us/articles/360002935178-Creating-invoices).** Official guide dated 20 March 2025. It separates `Finance: View` from `Finance: Administer`, offers bulk student invoicing for specified account types and individual invoices from a profile. Meal invoices can be generated after meals; club/trip invoices arise in a different payment-led workflow. Top-up account invoicing reduces the prepaid account balance. This is a useful role and navigation model, but the meaning of “invoice” is context-dependent.

**A2 — [Reviewing, cancelling and crediting invoices](https://support.arbor-education.com/hc/en-us/articles/212025145-Reviewing-cancelling-and-crediting-invoices).** Official guide dated 30 March 2023. Meal corrections may cancel an invoice or create a credit note when the register changes. Club/trip payment-linked invoices require credit/refund operations instead of the same cancellation action. Date filters and exports support review. Rosewood should make available actions depend on the transaction's state, with business rules applied on the server as well as in the interface.

**A3 — [Providing an invoice or receipt showing payment](https://support.arbor-education.com/hc/en-us/articles/4405377817105-Can-I-give-a-parent-an-invoice-or-receipt-showing-they-have-paid).** Official guide dated 3 September 2024. It explicitly says payment receipts cannot be printed in those Arbor workflows and offers payment screenshots/table downloads plus printable invoices. This is a valuable negative finding: invoice generation alone does not satisfy Rosewood's receipt requirement. A numbered, reproducible receipt must be independently designed and tested.

**Most useful adoption:** narrow roles, profile-to-account navigation, filters and state-specific correction actions. **Do not copy:** using a payment screenshot as the school's formal receipt.

## 8. Bromcom: document numbering, allocation and corrections

**M1 — [Accounts Receivable User Guide](https://docs.bromcom.com/knowledge-base/accounts-receivable-user-guide/).** Official index updated 17 August 2026. It maps setup of reference/receipt/invoice books, customers and products, then invoice, receipt, credit, refund, statement and write-off operations. It is a compact example of the modules a finance workspace needs. Numbering is an explicit setup concern.

**M2 — [Add a Sales Invoice in MAT Finance](https://docs.bromcom.com/knowledge-base/how-to-add-a-sales-invoice-in-mat-finance/).** Official guide updated 14 March 2024. A customer is required; products populate accounting codes, and posting is followed by print/dispatch. The invoice includes remittance instructions. Rosewood should preserve payer and school/payment-instruction snapshots at issue time, with a visible issue step and a downloadable document.

**M3 — [Process an Invoice Receipt](https://docs.bromcom.com/knowledge-base/how-to-process-an-invoice-receipt-in-accounts-receivable/).** Official guide updated 12 June 2026. A receipt can match multiple invoices, with matched value no greater than receipt total. Cash/cheque and direct-debit/standing-order posting paths differ. Receipts can be downloaded or dispatched, and cancellation needs a reason. The directly useful invariant is that allocations cannot exceed money received; transport and posting state must remain visible.

**M4 — [Process a Credit Note](https://docs.bromcom.com/knowledge-base/how-to-process-a-credit-note-in-accounts-receivable/).** Official guide updated 17 April 2026. A credit refers to an invoice and selected quantities, may carry attachments, and can be saved for later authorisation. It appears in customer activity and statements. This supports a first-class credit document with reason, line references and authorisation.

**M5 — [Process a Refund](https://docs.bromcom.com/knowledge-base/how-to-process-a-refund-in-accounts-receivable/).** Official guide updated 17 April 2026. Refunds identify customer, reason, amount, method and payment line; full and partial refunds are distinguished. The documented configuration requires the customer account to be in credit. Rosewood should separate crediting an obligation from returning cash, and enforce a clearly chosen refund availability rule.

**M6 — [Create a Customer Statement](https://docs.bromcom.com/knowledge-base/how-to-create-a-customer-statement-in-accounts-receivable/).** Official guide updated 4 June 2026. Statements can be generated for selected customers, reprinted, downloaded and retrieved from the customer page. Separate document types and a document history are useful even when invoices are initially distributed manually.

**Most useful adoption:** stable numbering, explicit posting/issue actions, many-to-many allocation, reasoned corrections and downloadable document history. **Do not copy:** UK payment rails, currency or VAT defaults.

## 9. Additional products and evidence gaps

**I1 — [iSAMS Fee Billing Manager](https://www.isams.com/platform/modules/feebilling/).** Official marketing/module page inspected. Advertised capabilities include billing applicants/current/former students, batch or individual charges, split payers, recurring charges, discount ordering, invoice history and four-stage checking. These are useful prompts for the Rosewood backlog, particularly billing before enrolment and time-bounded recurring fees. The [support site](https://support.isams.com/) returned a fetch error in this inspection. Actual state transitions, role names, ledger behaviour, API and code remain unverified.

**V1 — [Veracross Tuition Management](https://www.veracross.com/veracross-tuition-management/).** Official marketing page inspected. It advertises a shared parent portal, tuition/incidental autopay, reminders, payments dashboard, payout reconciliation and integrity checks. These are product claims, not validated runtime behaviour. [Official support](https://www.veracross.com/support/) directs school administrators to a login; [payer-support](https://community.veracross.com/s/payersupport) returned a minimal shell without readable operational content. Public school-authored help was discoverable, but was not used to infer vendor internals. No Veracross manual or codebase is claimed as mapped in depth.

**K1 — [Schoolbox integration checklist, published by TASS](https://tasshub.kb.tassweb.com.au/documentation/schoolbox-integration-checklist).** Official partner implementation guide inspected. It scopes identity, LMS, student details, calendar/notices APIs to a dedicated security role and specific read permissions. That does not establish a billing ledger or invoicing capability in Schoolbox. The [Schoolbox administrator help](https://help.schoolbox.com.au/homepage/2911) redirected to login. A search hit named “Accounts and Billing Information” describes Schoolbox's own vendor invoicing, so it is excluded as school-fee evidence. The transferable principle is to integrate through a narrow, separately permissioned interface rather than share the whole enrolment database with billing.

## Cross-product decisions for Rosewood

These are **proposed Rosewood decisions inferred from the evidence**, not descriptions of any one product. They should be reconciled with repository constraints and the separate accounting/security research before implementation.

| Decision | Why the manuals change the design | Concrete Rosewood shape |
|---|---|---|
| Billing account is separate from student and family relationship | TASS, Synergetic, Compass and Blackbaud all distinguish a debtor/family account from student-attributed charges | An account can fund multiple students; a student can have several responsibility arrangements; third-party payers need not be guardians. |
| Financial responsibility is explicit | Household structures and legal/consensual payment responsibility can differ | Store account membership and charge responsibility separately; confirm percentages/amounts in a draft preview; never silently infer a split from separation status. |
| Prospective students are supported | TASS enrolment receipts and iSAMS's advertised applicant billing show a pre-enrolment use case | Local billing student may have `prospective`, `active`, `withdrawn` lifecycle and an optional external enrolment reference; no auto-enrolment or admissions write-back. |
| Issued obligations are durable | TASS and Synergetic preserve statement snapshots; Blackbaud audits amendments | Draft is editable; issuing freezes header/line snapshots and assigns a unique number. Correct via credits/voiding rules with audit history. |
| Payment, allocation and receipt are independent | TASS and Bromcom allocate receipts across obligations; FACTS distinguishes prepaid funds | Store actual payment with source/reference/status; allocations target invoice balances; receipt is a reproducible document derived from accepted payment. |
| “Payment progressing” needs several facts | TASS pending/approved processing and Blackbaud settlement reports expose uncertainty | Show awaiting payment, reported/pending verification, received, partially allocated, fully allocated, failed, reversed/refunded as appropriate. A reported transfer cannot reduce the confirmed balance. |
| Payment arrangement does not equal cash received | Synergetic differentiates charge instalments; FACTS keeps plan state separate from balance | Separate recurring billing plan, instalment agreement and payment attempt. MVP can track dates/amounts with manual receipts and no automatic bank debit. |
| Staff permissions are functional | Arbor and Compass separate view from administration/configuration | Viewer sees billing progress; finance officer creates drafts/records payments; manager issues/corrects/exports; administrator manages access/settings. Enforce on each API action. |
| Internal notes have a private audience | TASS explicitly has administrator and parent-facing comments | Default notes to staff-only; customer-facing invoice text is a separate field. Do not include hardship/collection commentary in an invoice or receipt. |
| Batch operations need review and duplicate prevention | TASS pre-billing and Synergetic what-if runs are central workflows | Preview eligible students, exclusions, split amounts, discounts and total; preserve preview version; one idempotent issue per scope/period; report any conflicts. |
| Accounting integration is an optional adapter | Sentral demonstrates explicit push and backfill; other products retain AR detail | Internal external-ID mappings and export status exist early. Begin with a reviewable accounting export; enable live integration only with chosen ownership and actual account credentials. |
| Balances must be explainable | Outstanding and account-enquiry screens expose ledger/allocation detail | Derive confirmed due from issued invoices minus credits and valid allocations; show unallocated cash and due-date ageing separately. |

## Proposed staff portal information architecture

1. **Overview:** confirmed receivables, overdue amount, receipts in a chosen period, pending verification, unallocated funds and next follow-ups. Every total drills into the rows that produce it. Show an “as at” timestamp.
2. **Accounts:** payer/contact details, linked students, responsibility arrangements, account timeline, balances, documents and staff-only notes. Name/email search is useful for finding a record, but not for automatically merging identities.
3. **Students:** prospective/current/withdrawn status, cohort and linked accounts. Display billing position independently of admission progress.
4. **Invoices:** draft, issued, partially paid, paid, credited/voided; due-date and account filters; print/download; explicit action to issue a reviewed draft. Overdue should be a computed condition on outstanding issued obligations, not a permanent manually maintained flag.
5. **Payments and receipts:** reported payments awaiting verification, confirmed payments, allocation detail, receipt downloads, duplicate warnings and correction history. Accept bank-transfer/cash/EFTPOS recordkeeping without claiming to execute a bank transaction.
6. **Arrangements:** instalment amounts/dates, next due, progress and missed commitments. Show total debt alongside scheduled instalments; make rescheduling a reasoned event that preserves the previous schedule.
7. **Fee catalogue and billing runs:** active fee templates, currency/tax/account mapping, student/family scope, eligibility period, batch preview and issue history.
8. **Reports and exports:** aged receivables, billed-versus-paid, payment register, unallocated money, credits/reversals, and accounting export history. Include enough stable IDs for reconciliation.
9. **Settings and audit:** school legal/display identity, numbering, remittance instructions, staff access, document branding, integration status and actor/time/reason event trail.

The initial portal need not include a parent login, automatic debit, collection emails, scholarships engine, donor accounting, cash register, general ledger or school-wide SIS. It must already have the entities and invariants needed to add those features without rewriting financial history.

## Edge cases that must drive acceptance tests

These scenarios are original proposed tests prompted by the manuals' failure and correction workflows. All fixtures should be synthetic.

| Scenario | Expected financial/operational result |
|---|---|
| No enrolled students | Staff can create a prospective billing student/account and draft an invoice; dashboard zero state works; enrolment stays untouched. |
| Two siblings, one account | Separate tuition line attribution, family levy charged once, one account balance; no double-counting on dashboard. |
| Two payers for one student | Exact responsibility is reviewed; issued amounts sum to intended charge, including any one-cent rounding remainder. |
| Third-party payer | Receipt can identify payer while settling the right debtor account; no automatic grant of student-record access. |
| Part payment | Outstanding amount falls only by the confirmed allocated amount; invoice remains partially paid and receipt is available. |
| One payment for several invoices | Allocations sum to no more than the payment; each invoice balance updates consistently. |
| Overpayment or deposit before invoice | Unallocated money is explicit; no negative invoice total or fictitious line item; later allocation is traceable. |
| Transfer reported, not verified | Staff sees pending verification; confirmed receivables and issued receipt count do not change. |
| Duplicate submit/import/provider event | Same action/reference does not create two payments, receipts or invoices. A conflicting payload is flagged. |
| Paid invoice needs reduction | Credit and resulting account credit/refund are distinct; original invoice and receipt remain retrievable. |
| Payment recorded against wrong invoice | Reverse/reallocate with reason; preserve prior event; avoid creating or destroying money. |
| Previously confirmed payment is dishonoured | Reverse associated effect with audit and restored outstanding amount; mark previous receipt appropriately. |
| Student withdraws midyear | No automatic deletion of debt/history; stop future billing as configured and apply a reviewed credit where warranted. |
| Instalment frequency changes | Paid history remains fixed; remaining schedule sums exactly to its agreed amount; missed history stays visible. |
| Draft fee changes after preview | Issue rejects stale preview or recomputes and requires review; no silent amount change. |
| Issued invoice is reprinted after address/fee change | Original snapshot and number remain stable; current display contact does not rewrite a historical document. |
| Staff viewer calls a write API | Server refuses mutation even if the interface hides the button. |
| Private note entered | It never appears on customer document or permitted payer response. |
| Accounting export rerun | Stable external identifiers/manifest prevent duplicate posting; failures remain visible for repair. |
| Backdated external adjustment | Reconciliation/backfill can find it even outside the normal lookback period. |

## Questions still requiring Rosewood policy, not vendor inference

- Which existing accounting product is meant by “Xerox”, and which system will own legal invoice numbers, credit notes and bank reconciliation?
- What are the approved fees, due dates, deposit/refund policies, sibling discounts, financial-assistance approval process and tax classifications?
- Who is permitted to issue invoices, confirm funds, approve corrections/refunds and read hardship notes?
- Are responsibility splits legal debt splits or merely expected payment shares? Is a family account jointly liable, and what does each payer receive?
- Will the first operational release track confirmed manual receipts only, import bank/accounting exports, or use an approved gateway?
- What admission milestone makes optional linking appropriate, and which minimum student/payer fields may be imported?

These open policies need not prevent a safe isolated implementation with sample data and configurable defaults. They do prevent treating synthetic amounts, assumed bank details, assumed tax treatment or an unconnected accounting adapter as production-ready financial operation.
