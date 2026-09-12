# Rosewood billing staff guide

This portal records what the school has charged, what staff have reported, and what finance has verified. A reported payment stays pending until finance confirms the funds. An invoice and a receipt are different documents: an invoice states the charge; a receipt records verified money received.

The review workspace contains synthetic examples. Its amounts are not approved school fees and its PDFs are not requests for payment.

## Access and roles

Sign in using your named billing account. Billing credentials are separate from enrolment staff credentials. Administrators manage accounts in **Staff access**; the local operator tool supports setup and recovery. There is no public registration or password-reset email flow.

| Role | Access |
|---|---|
| Viewer | Read accounts, students, billing progress, communication history and permitted PDF documents |
| Billing | Viewer access plus maintain accounts/students/fees, create and issue invoices, prepare billing runs, record pending payments and instalment plans, and prepare/edit email drafts |
| Finance | Billing access plus confirm/allocate funds, correct financial records, record completed refunds, generate financial/Xero exports, and approve/manage communications and preparation rules |
| Admin | Finance access plus manage staff and configure the school identity, payment instructions, tax policy and accounting mappings |

Every role can choose **Change password** beside their name, enter their current password, and confirm a new password of 15–128 characters. The change ends their existing sessions; sign in again with the new password. Administrators use **Staff access → Add staff member**, **Edit access** or **Reset password**. **Staff login is active** controls access. A staff email is fixed after creation, and the last active administrator cannot be disabled or demoted. Initial and reset passwords must be shared through the school's approved secure channel; the application does not email them.

Sign out when finished. Sessions expire after thirty minutes idle or eight hours in total. Disabling access, changing a role or changing/resetting a password immediately revokes that staff member's sessions; a name-only edit preserves them. Downloaded documents remain on the computer and should be handled under the school's document policy.

## Start with an account and student

Open **Accounts → New account**. Enter the family account label and the legally appropriate payer name, address and billing email. The account label is how staff find the family; the billing name is printed on documents. Select **School has permission to contact this payer about billing** only when that permission is established. The email queue uses this account's billing email; missing permission, an archived account or a contact hold prevents eligible messages from being sent.

Open the account and choose **Add student**. A name, intended year level and entry year are sufficient to start with a prospective student. The student remains linked to a billing account independently of enrolment.

In **Students**, use **Link** only when the correct existing application identifier is known. Record the reason for linking or unlinking. The reference is unique, case-sensitive and explicitly unverified. Saving it neither checks nor updates the enrolment system. Do not paste a full URL, email address or access token. A future connector will need deliberate authority and matching rules; this field is not automatic enrolment.

The initial model has one billing account per student. Shared-care invoice splitting, third-party sponsorship and moving billed students between debtors need a later workflow; do not simulate these by editing issued records.

## Create and issue an invoice

1. Open a family account and choose **New invoice**. Review the issue date, due date, year and term/period.
2. Add each charge with a description, student, quantity, unit amount and total line discount. Select the appropriate tax treatment and account code. Catalogue prices are a starting point for reviewed drafts.
3. Save the draft and review all lines and the server-calculated total. A draft has no issued invoice number and creates no receivable.
4. Choose **Issue invoice** once the payer, dates and charges are correct. Live operation requires a configured school legal identity, contact details, payment instructions and reviewed tax policy.
5. Use **Preview PDF** or download the invoice. **Email draft** prepares a copy for review. If invoice preparation rules are enabled, issuing can also prepare a draft or queue an eligible message under the configured mode; external delivery still needs an enabled mail transport and its worker.

Issuing assigns one unique number and freezes the seller, payer, student/line and amount details. Later profile or catalogue changes do not rewrite that invoice. The issued invoice keeps its original total; use the account statement for subsequent payments, credits and the current balance.

## Bill a selected cohort

Maintain the **Fee catalogue** with approved descriptions, prices, GST treatment and ledger mappings. In **Billing runs**, choose the students, fees and billing period, then generate a preview. Inspect the proposed account totals and student charges before committing the run.

Committing creates drafts, once. It neither issues nor sends invoices. Each student/fee/year/period combination is claimed to prevent a second run billing the same item again. Reopening or retrying a committed run returns the same drafts. The original preview remains in the history even if an individual generated draft is later reviewed and edited.

If school or tax settings have changed since the preview, open the generated draft, review and save it with current settings before attempting to issue it. Do not vary the period label to work around a duplicate warning; inspect the original run and drafts.

## Track a payment

Open **Payments & receipts** or an account's **Record payment** action. Enter the actual amount, received/report date, method and a unique transaction reference. Choose **School fees** or **Refundable bond** deliberately. Save it for verification.

At this point, the account shows a pending payment. Its invoice balance is unchanged and no receipt exists. A family's transfer screenshot is a report to verify, not automatic bank reconciliation.

Finance opens the payment, checks evidence against the school's actual bank/cash records, records the verification evidence and allocates the confirmed amount to one or more issued invoices on the same account. Confirming creates the numbered receipt and updates the balances atomically. A receipt can be previewed/downloaded from that payment record or **Documents**. If receipt preparation is enabled, confirmation also makes the receipt eligible for the configured email workflow.

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

## Find and preview documents

Open **Documents** to use the **Document centre**. Search by document or account, and filter by document type or state. It brings invoices, receipts, credit notes and current account statements together. Choose **Preview PDF**, then **Download PDF** if a local copy is needed; the document list also has **Download**. If the browser cannot display the preview, download the PDF.

Draft, void and reversed records remain available as marked history. An issued invoice retains its original charge; a current statement shows subsequent payments, credits and the account position. The **Email draft** action appears for eligible documents and prepares a separate, preserved attachment. A message's **Preview attachment** shows the document kept with that message, which can differ from a newly generated current statement.

## Prepare and review family emails

Open **Communications** for the **Family communications** workspace. Delivery is disabled in this review, and the synthetic demo can never send externally. The proposed sender is `Rosewood College Accounts <rosewood.accounts@ffe.org.au>`; the mailbox and sending identity have not been created or verified by this work. The screen displays whether a transport is configured. See [Communications](COMMUNICATIONS.md) for commissioning and delivery details.

1. Choose **Email draft** beside an eligible document, then **Create email draft**. The recipient comes from the account's billing email; this step sends nothing.
2. In the message's **Review** screen, check the recipient, subject, wording and **Preview attachment**. **Edit draft** allows wording changes. Fix recipient details on the account, then use **Refresh document** to rebuild and review the draft.
3. Finance or an administrator chooses **Approve and queue**. Approval records the reviewed message. A separate worker rechecks contact permission, holds, recipient and billing facts before using an enabled provider.
4. Review the status and message history. If the account or document changed, refresh and review the blocked message before approving again. **Refresh document** replaces its wording and attachment with current details, so check any earlier custom wording again.

| Message status | Meaning and next action |
| --- | --- |
| Draft | Prepared for review; not approved for delivery |
| Queued | Approved; awaiting the worker and delivery checks |
| Sending | A worker owns the attempt; wait for its result |
| Accepted by provider | The provider accepted the submission; delivery to the family's inbox is not confirmed |
| Blocked | Contact permission, a hold, changed details or another eligibility check prevents sending; correct the cause and review again |
| Failed | A definite failure is recorded; finance investigates before **Retry failed message** |
| Uncertain | The provider may have accepted the message; investigate externally before any resolution |
| Cancelled | This message will no longer be processed; its history remains |

Finance can use **Contact hold**, select the account, choose **Pause billing emails for this account**, record the reason, and **Save contact hold**. **Review hold** changes or releases a hold. A hold is checked before dispatch; it cannot recall an email already submitted. Releasing a hold does not by itself reapprove a blocked message.

## Automatic invoices, receipts and reminders

Finance opens **Communications → Edit rules** to configure **Email preparation rules**. The controls are **Prepare email drafts for newly issued invoices**, **Prepare email drafts for newly confirmed receipts**, and **Prepare invoice reminders around the due date**. Set **Process documents from** and the reminder days; `-7, 0, 7, 14` means one week before the due date, the due date, and seven/fourteen days afterwards.

Under **Preparation mode**, **Prepare drafts for staff review** keeps each message for approval. **Automatically queue eligible messages** is an ongoing instruction to queue qualifying messages when preparation runs. It is separate from the operator's server delivery switch. Contact permission, holds and the final document checks apply in both modes.

Choose **Prepare automation → Prepare messages** to evaluate the enabled rules. Invoice issue and payment confirmation also trigger preparation, and a commissioned worker can run the rules periodically. Duplicate preparation for the same document/rule is prevented. If several reminder dates have passed, the latest applicable stage is prepared rather than sending every missed reminder. Settled invoices and pending fee-payment reports prevent reminder dispatch. Review the recorded preparation counts and message history; run preparation again if the result says more eligible records remain.

## Resends and uncertain email outcomes

For an **Accepted by provider** or **Cancelled** message that needs another copy, finance chooses **Prepare resend**, records **Reason for another copy**, and selects **Create resend draft**. This creates a new draft using current account/document details and keeps the earlier message history. Review it and use **Approve and queue** separately. Reopening the original document's **Email draft** action is not a resend request.

For **Uncertain**, use **Resolve provider outcome** only after an operator has examined the external provider's send/event logs. Record the reason and **External provider log evidence**, including the log reference, checked time and finding. Do not paste credentials or access tokens.

- **Provider logs confirm acceptance** requires a **Provider message reference** and records acceptance; it still does not confirm inbox delivery.
- **Provider logs prove not accepted** records `not_sent` and moves the message to **Failed**. Finance must separately review and choose **Retry failed message** before it can be attempted again.

If the logs do not establish the outcome, leave the message uncertain. A family saying they cannot find the email does not establish that the provider rejected it. The recorded resolution and previous attempt remain in the message history.

## Statements, progress and accounting

The **Overview** separates outstanding fees, overdue amounts, confirmed fee receipts and pending reports. Receivables are aged by invoice due date in Melbourne time. Open an account for its student list, invoice/payment history, separate bond amount and **Statement** download.

Finance can download a receivables CSV in **Reports & exports**. A Xero draft export requires an explicit, unique **Xero contact mapping** on each included account and the school's reviewed Xero tax display names and ledger codes. Matching payer names are not sufficient: two local accounts cannot be exported into the same mapped contact. The export records the exact included invoice versions and excluded items.

Xero exports contain original eligible issued invoices, not current unpaid balances. Draft, void and credited invoices are excluded; credit-note and payment synchronisation are not implemented. The CSV is a candidate for testing against the school's current Australian Xero template and a Demo Company. Reconcile the result before any live import, then record the import evidence against that export. Downloading a CSV does not mean it has been imported or paid. Never import the same invoice again to update its balance.

## If an action fails

Read the displayed error before retrying. A network failure may occur after a save reaches the server. The open form retains its retry identity so the same request can be retried safely. If the save succeeded but refreshing the screen failed, the form freezes its fields and offers **Retry refresh** without saving again.

If a revision conflict appears, close the form, refresh and review the latest record before editing again. If the page was reloaded after an uncertain payment or invoice operation, inspect the account and Activity log before starting a new operation. Server transaction uniqueness protects receipts and billing runs, but a newly composed unrelated draft/account is a new action.

The Activity log displays recent audited events. The durable database retains the complete history; the staff screen currently shows the latest 200 events. Export, backup and restore procedures are in [Operations](OPERATIONS.md).
