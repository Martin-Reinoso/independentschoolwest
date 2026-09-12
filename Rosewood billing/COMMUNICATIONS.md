# Billing documents and communications

Implemented 12 September 2026. The staff portal now supports PDF previews/downloads, reviewed invoice/receipt/credit/statement emails, automatic invoice and receipt preparation, and dated payment reminders. Actual external delivery is **disabled** in the review environment. No family email has been sent. The synthetic demo cannot enable external delivery, even if sending flags are supplied.

## Sender proposal

Use **Rosewood College Accounts <rosewood.accounts@ffe.org.au>**, with replies to the same monitored mailbox. This is a proposed identity, not an assertion that the mailbox exists or that Amazon SES has verified it. The school must establish mailbox ownership, staff coverage, sender verification and email-domain configuration before commissioning delivery. The portal distinguishes the proposed identity from configured sender details.

## Staff workflow

**Documents** brings invoice, receipt, credit-note and current account-statement PDFs together with search, type filters, protected previews and downloads. PDF previews fetch authenticated, no-store content into a temporary browser object URL; the URL is revoked when the preview closes or the user signs out. A downloaded document remains on the user's computer.

In **Communications**, billing staff can prepare a document email, inspect its recipient and frozen PDF facts, and edit its subject/body while it is a draft. Finance or an administrator approves the draft into the queue. Approval is a durable decision to send when an enabled worker processes it; it does not itself contact SES. All roles can inspect message status and history, subject to normal staff authentication.

Each message targets one current account billing address. The account must be active, have contact permission recorded, have a valid address, and have no communication hold. There are no CC/BCC recipients or family email lists. Seeded demo accounts retain their original contact permission; tests explicitly opt in their own isolated synthetic fixtures.

Financial changes can make an already reviewed message stale. Before approval, at claim, and again after rendering immediately before dispatch, the application rechecks the recipient, permission, hold, document state and relevant financial facts. Voided invoices and reversed receipts cannot be sent as current payment documents. A blocked message must be reviewed and refreshed; refreshing restores current facts and default wording and requires a new approval. Frozen historical previews remain available and are not rewritten by later account changes.

## Automation and reminders

Finance controls the policy in Communications. All automatic features start off, in **review** mode:

- Automatic invoices prepare an email after a qualifying invoice is issued.
- Automatic receipts prepare an email after finance confirms a qualifying payment.
- Reminders use Melbourne calendar dates and configured offsets from the invoice due date. Defaults are seven days before, on the due date, seven days after and fourteen days after (`-7, 0, 7, 14`).
- Review mode creates drafts for finance approval. Automatic mode queues eligible new messages under the policy; actual delivery still requires separate operator configuration and a running worker.

The policy has an explicit start date. It limits which invoice and receipt issue timestamps are eligible for new automatic preparation, including reminders for those invoices. It does not cancel existing manually approved messages; use an account hold or message cancellation for that. Turning automation on is not an unrestricted historical mailing operation. Repeated preparation and polling use durable logical-event identities and do not create duplicate invoice/receipt emails.

For a reminder, the invoice must remain unpaid. Any pending fee-payment report on the account suppresses reminders while finance checks it. An active communication hold pauses all outbound messages on that account. The worker chooses only the latest matured reminder offset, and cancels superseded unsent reminder drafts; a missed week does not produce a bundle of old reminders. It rechecks the balance before sending, so a newly settled invoice stops a queued reminder.

The web server prepares eligible work after invoice issue/payment confirmation. **Prepare messages** and the standalone worker also scan for eligible events and due reminders. A running web server alone does not provide a scheduled reminder service: commissioning must run and monitor the worker. A disabled worker may prepare drafts/recover expired attempts, but cannot claim or send them. `--dry-run` performs no preparation or queue mutation.

## Status and recovery

| Status | Meaning and next action |
| --- | --- |
| Draft | Prepared content awaiting review; billing staff may edit it. |
| Queued | Finance or the configured automatic policy approved this message. Delivery may still be disabled. |
| Sending | One worker owns a bounded durable attempt. Do not start another send. |
| Accepted | The provider returned an acceptance identifier, or finance recorded verified provider acceptance. This does **not** establish inbox delivery or that a parent read it. |
| Blocked | Permission, recipient, hold, policy or financial facts no longer allow dispatch. Correct the underlying record and refresh/review. |
| Failed | A definite rejection or failure before sending. Finance may retry with a reason after reviewing current eligibility. |
| Uncertain | A timeout, ambiguous provider response, lost result or expired attempt means acceptance is unknown. It is never retried automatically. |
| Cancelled | Retained history of an intentionally cancelled or superseded message. |

For an **accepted or cancelled** message, finance can choose **Prepare resend** with a reason. This creates a new draft using current facts, linked to the original message, and requires fresh review/approval. The original remains unchanged; retrying the same resend action creates only one new draft. A parent requesting a copy does not require deleting the earlier email history.

For an **uncertain** attempt, check the provider's independent logs before choosing **Resolve provider outcome**. Record the reason and supporting evidence. Confirmed acceptance requires the provider's message identifier. If the evidence establishes that the message was not sent, resolve it as **not sent**, which marks it failed; a separate deliberate retry performs all current eligibility checks. Absence of a visible message in a parent's inbox alone does not prove the provider did not accept it. The original uncertain result and the manual resolution remain immutable. Late worker responses cannot override a manual decision or a later attempt.

SDK send retries are disabled because SES SendEmail provides no application idempotency token. A worker claims one durable lease, records its dispatch marker and saves one result. If the process dies or cannot save a provider response, expiration leaves an uncertain outcome rather than automatically sending again. The queue handles concurrent workers, but commissioning should begin with a single monitored worker.

The displayed **Document snapshot hash** identifies frozen document facts. **Submitted PDF SHA-256**, when available, identifies the exact attachment bytes passed to the provider. A re-rendered preview is not claimed to be byte-identical to an earlier attachment. Provider identifiers and manual evidence are retained with attempt history. The screen shows the latest 300 messages and 200 communication events; summary counts cover the full durable outbox. There is no archived-message search/export screen in this iteration.

## Optional Amazon SES transport

These settings are implemented but have not been commissioned against a real sender or AWS account. Keep delivery off during local review. The school needs a verified SES identity, suitable account/sandbox permissions, a dedicated least-privilege runtime identity for `ses:SendEmail`, a monitored reply mailbox and a reviewed delivery-event destination. Do not reuse enrolment credentials or change its SES resources.

| Variable | Behaviour |
| --- | --- |
| `BILLING_MAIL_TRANSPORT` | `disabled` by default; `ses` selects the implemented provider. |
| `BILLING_MAIL_DELIVERY_ENABLED` | Only the exact value `1`, together with SES mode and valid configuration, permits delivery outside demo mode. |
| `BILLING_MAIL_FROM_NAME` | Defaults to `Rosewood College Accounts`. |
| `BILLING_MAIL_FROM_ADDRESS` | Required verified sender address when enabling delivery; no automatic default to the proposal. |
| `BILLING_MAIL_REPLY_TO` | Monitored reply address; defaults to the configured sender address. |
| `BILLING_MAIL_REGION` | Explicit SES region, such as `ap-southeast-2`; required for enabled delivery. |
| `BILLING_MAIL_AWS_PROFILE` | Optional dedicated SDK credential profile; otherwise the normal SDK credential chain applies. Credentials never enter the portal or repository. |
| `BILLING_MAIL_CONFIGURATION_SET` | Optional existing SES configuration set for provider-side event handling. The application does not create it or consume its events. |

Select the same private runtime and mode as the web service using the variables in [Operations](OPERATIONS.md). Then run:

```sh
# Inspect queued counts without preparing, claiming or sending.
pnpm mail:worker --dry-run

# One bounded cycle; delivery remains disabled unless explicitly configured.
pnpm mail:worker

# Repeat bounded cycles at 60-second intervals until stopped.
pnpm mail:worker --watch
```

Each cycle processes at most ten claims by default; messages have a 120-second claim lease and provider requests a 20-second timeout. Attachments are limited to 5 MB. The worker renders PDF attachments locally and uses SES v2 Simple content with plain-text and escaped HTML alternatives. It logs aggregate counts or a generic operational error, never addresses, email bodies, credentials or PDF content. Operate it under the school's service manager with access, restart and monitoring controls before live use. Keep web and worker configuration consistent so the portal's configured-delivery indicator accurately reflects operations.

SES acceptance, attachment support and error behaviour were checked against the [official SendEmail API](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html). Sender verification requirements are described in the [AWS SDK SES guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/ses-examples-sending-email.html); SDK retry configuration is documented in the [SES v2 client reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/). Accessed 12 September 2026.

## Remaining scope

No actual delivery, bounce/complaint webhook ingestion, inbox/read tracking, incoming-email processing or self-service password-reset emails have been commissioned. A bounced message is not automatically marked bounced or used to update contact permission. Live Xero/bank feeds, card collection, parent login and the enrolment connector remain separate work. Local tests use injected provider responses and synthetic addresses; they establish application behaviour, not real email deliverability.
