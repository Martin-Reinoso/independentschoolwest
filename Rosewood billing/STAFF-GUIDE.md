# Rosewood billing staff guide

This portal records what the school has charged, what staff have reported, and what finance has verified. A reported payment stays pending until finance confirms the funds. An invoice and a receipt are different documents: an invoice states the charge; a receipt records verified money received.

The review workspace contains synthetic examples. Its amounts are not approved school fees and its PDFs are not requests for payment.

## Access and roles

Sign in using your named billing account. Billing credentials are separate from enrolment staff credentials. The administrator creates or disables access using the operator tool; there is no public registration or password-reset email flow in this release.

| Role | Access |
|---|---|
| Viewer | Read accounts, students, billing progress, history and permitted PDF documents |
| Billing | Viewer access plus maintain accounts/students/fees, create and issue invoices, prepare billing runs, record pending payments and instalment plans |
| Finance | Billing access plus confirm/allocate funds, correct financial records, record completed refunds and generate financial/Xero exports |
| Admin | Finance access plus configure the school identity, payment instructions, tax policy and accounting mappings |

Sign out when finished. The session expires after inactivity and has an absolute lifetime; disabling staff access revokes active sessions. Downloaded documents remain in the computer's downloads folder and should be handled under the school's document policy.

## Start with an account and student

Open **Accounts → New account**. Enter the family account label and the legally appropriate payer name, address and billing email. The account label is how staff find the family; the billing name is printed on documents. Contact permission is recorded but this release sends no communications.

Open the account and choose **Add student**. A name, intended year level and entry year are sufficient to start with a prospective student. The student remains linked to a billing account independently of enrolment.

In **Students**, use **Link** only when the correct existing application identifier is known. Record the reason for linking or unlinking. The reference is unique, case-sensitive and explicitly unverified. Saving it neither checks nor updates the enrolment system. Do not paste a full URL, email address or access token. A future connector will need deliberate authority and matching rules; this field is not automatic enrolment.

The initial model has one billing account per student. Shared-care invoice splitting, third-party sponsorship and moving billed students between debtors need a later workflow; do not simulate these by editing issued records.

## Create and issue an invoice

1. Open a family account and choose **New invoice**. Review the issue date, due date, year and term/period.
2. Add each charge with a description, student, quantity, unit amount and total line discount. Select the appropriate tax treatment and account code. Catalogue prices are a starting point for reviewed drafts.
3. Save the draft and review all lines and the server-calculated total. A draft has no issued invoice number and creates no receivable.
4. Choose **Issue invoice** once the payer, dates and charges are correct. Live operation requires a configured school legal identity, contact details, payment instructions and reviewed tax policy.
5. Download the invoice PDF. The application does not send it to the family.

Issuing assigns one unique number and freezes the seller, payer, student/line and amount details. Later profile or catalogue changes do not rewrite that invoice. The issued invoice keeps its original total; use the account statement for subsequent payments, credits and the current balance.

## Bill a selected cohort

Maintain the **Fee catalogue** with approved descriptions, prices, GST treatment and ledger mappings. In **Billing runs**, choose the students, fees and billing period, then generate a preview. Inspect the proposed account totals and student charges before committing the run.

Committing creates drafts, once. It neither issues nor sends invoices. Each student/fee/year/period combination is claimed to prevent a second run billing the same item again. Reopening or retrying a committed run returns the same drafts. The original preview remains in the history even if an individual generated draft is later reviewed and edited.

If school or tax settings have changed since the preview, open the generated draft, review and save it with current settings before attempting to issue it. Do not vary the period label to work around a duplicate warning; inspect the original run and drafts.

## Track a payment

Open **Payments & receipts** or an account's **Record payment** action. Enter the actual amount, received/report date, method and a unique transaction reference. Choose **School fees** or **Refundable bond** deliberately. Save it for verification.

At this point, the account shows a pending payment. Its invoice balance is unchanged and no receipt exists. A family's transfer screenshot is a report to verify, not automatic bank reconciliation.

Finance opens the payment, checks evidence against the school's actual bank/cash records, records the verification evidence and allocates the confirmed amount to one or more issued invoices on the same account. Confirming creates the numbered receipt and updates the balances atomically. A receipt can be downloaded from that payment record.

| State or amount | Meaning |
|---|---|
| Pending | Reported funds waiting for finance verification; no reduction in fees owing |
| Confirmed | Finance has verified receipt of funds |
| Part paid | Confirmed allocations cover some of the invoice obligation |
| Paid | The remaining invoice obligation has been settled |
| Unapplied fee funds | Confirmed fee money still available for allocation or an evidenced refund |
| Bonds held | Refundable money tracked separately; cannot pay tuition invoices |
| Rejected | A pending report was rejected, with a reason |
| Reversed | A mistaken confirmed payment was reversed; its original receipt remains as marked history |

Incoming transactions use a method/reference/date identity. Re-entering the same transaction under a different family, amount or purpose will be refused. Allocate an excess to another invoice on the same account, or retain it as unapplied fee credit. Do not duplicate the original payment to represent a second allocation.

## Instalments and corrections

A **Payment plan** divides the original invoice total into dated instalments. The sum must match that total. Received allocations and credits determine progress; merely creating a plan does not create cash. Only one plan is permitted per invoice in this release. Voiding the invoice cancels its plan.

Finance can perform explicit corrections with a reason and evidence:

- **Release an allocation** to return money to the same account's unapplied fee funds. This reopens the invoice balance; it does not erase the receipt.
- **Reverse a mistaken payment** when no money should have been recognised. Its allocations are reversed and the receipt is visibly marked. A payment with recorded refunds cannot be reversed through this shortcut.
- **Credit an invoice** against specific original lines, within remaining line and invoice limits. For a paid invoice, release the relevant allocation first. A credit changes the obligation and retains its GST adjustment; it does not refund money.
- **Void an eligible invoice** to cancel its obligation with a recorded reason. Its number and history remain available.
- **Record a refund already made** using the outgoing transaction's unique reference, date, amount and evidence. The application does not transfer money. The amount cannot exceed available funds, and the same outgoing reference/date cannot be reused against another receipt.

For example, to refund $40 from a fully paid $100 fee after an approved reduction, release the original $100 allocation, issue a $40 credit against the charge, and reallocate $60 to settle the remaining invoice balance. Then carry out the $40 refund through the school's authorised banking process and record that completed refund and its evidence. Allocation release currently releases the whole selected allocation. The original invoice, receipt, credit and refund event remain distinct.

## Statements, progress and accounting

The **Overview** separates outstanding fees, overdue amounts, confirmed fee receipts and pending reports. Receivables are aged by invoice due date in Melbourne time. Open an account for its student list, invoice/payment history, separate bond amount and **Statement** download.

Finance can download a receivables CSV in **Reports & exports**. A Xero draft export requires an explicit, unique **Xero contact mapping** on each included account and the school's reviewed Xero tax display names and ledger codes. Matching payer names are not sufficient: two local accounts cannot be exported into the same mapped contact. The export records the exact included invoice versions and excluded items.

Xero exports contain original eligible issued invoices, not current unpaid balances. Draft, void and credited invoices are excluded; credit-note and payment synchronisation are not implemented. The CSV is a candidate for testing against the school's current Australian Xero template and a Demo Company. Reconcile the result before any live import, then record the import evidence against that export. Downloading a CSV does not mean it has been imported or paid. Never import the same invoice again to update its balance.

## If an action fails

Read the displayed error before retrying. A network failure may occur after a save reaches the server. The open form retains its retry identity so the same request can be retried safely. If the save succeeded but refreshing the screen failed, the form freezes its fields and offers **Retry refresh** without saving again.

If a revision conflict appears, close the form, refresh and review the latest record before editing again. If the page was reloaded after an uncertain payment or invoice operation, inspect the account and Activity log before starting a new operation. Server transaction uniqueness protects receipts and billing runs, but a newly composed unrelated draft/account is a new action.

The Activity log displays recent audited events. The durable database retains the complete history; the staff screen currently shows the latest 200 events. Export, backup and restore procedures are in [Operations](OPERATIONS.md).
