# Billing application contract

This is the initial implementation contract shared by the domain service, HTTP layer, documents and portal. All monetary inputs are integer AUD cents; dates are strict `YYYY-MM-DD`, timestamps ISO UTC. IDs are opaque strings. Ordinary mutations require role permission, an idempotency key and current revision for updates. Error shape is `{ error: "CODE", message: "Actionable message" }` and never includes a stack or request body.

## Server routes

| Method/path | Contract |
|---|---|
| `GET /api/health` | Public aggregate availability only |
| `GET /api/session` | Authenticated `{ user: {id,name,email,role}, csrfToken }`; 401 otherwise |
| `POST /api/login` | Exact configured Origin, JSON `{email,password}`; rate limited; returns same shape and sets host-only HttpOnly session cookie |
| `POST /api/logout` | Session, exact Origin and `X-CSRF-Token`; revoke and clear cookie |
| `GET /api/state` | Authorised server-calculated billing state; no-store |
| `POST /api/commands` | Session, Origin, CSRF, `Idempotency-Key`; JSON `{type,payload}`; returns `{result}` |
| `GET /api/documents/:kind/:id.pdf` | Protected `invoice`, `receipt`, `credit`, `statement`; snapshot-based PDF download, audited access |
| `GET /api/communications` | All authenticated roles; `{settings,messages,events,holds,summary,transport}`; latest 300 messages/200 events, full summary counts; no secrets or lease tokens |
| `POST /api/communications/commands` | Same Origin, session, CSRF and idempotency requirements as billing commands; returns `{result}` |
| `GET /api/communications/:id/document.pdf` | Authenticated PDF from that message's frozen attachment facts, not current account details |
| `GET /api/staff` | Admin only; `{staff:[{id,name,email,role,active,revision,createdAt}]}`; no hashes or sessions |
| `POST /api/staff/commands` | Same mutation protection; asynchronous password work; admin commands plus self password change for any role |
| `GET /api/exports/receivables.csv` | Finance/admin; formula-safe receivables report, audited |
| `GET /api/exports/xero.csv` | Finance/admin; validated mapped issued fee invoice draft export, audited; not a completed import |

No CORS wildcard. The web server and browser make no AWS/Xero calls; an independently configured mail worker can call SES. Browser sends credentials only to same-origin API. No browser-held financial persistence. Failed or missing auth is 401; disallowed role is 403; stale/duplicate/state conflict is 409; invalid data is 400; rate limiting is 429 with Retry-After. Static CSS/JS references are relative so existing repository asset checks can resolve them. Mutations revalidate the session and CSRF token after reading the request body, so disable/demotion during an upload cannot preserve earlier authority.

## Service boundary

`src/database.mjs` exports `openDatabase(path)` returning a `DatabaseSync` configured for relational integrity/durability and domain migrations. `src/service.mjs` exports `createBillingService({ db, clock, demoMode = false })`. `clock` is optional and returns a Date. The database retains its immutable sample/live marker and refuses the opposite mode. Service methods are synchronous; no network work occurs inside a transaction:

- `getState(actor)` returns the shape below. Valid actor is `{id,name,email,role}`.
- `execute(actor, {type,payload}, idempotencyKey)` returns a serialisable command result, normally the affected entity or `{id,...}`. It checks roles itself even if invoked without HTTP.
- `getDocument(actor, kind, id)` returns `{kind, document, account, settings, today, generatedAt, ...}` using preserved snapshot values for issued documents; this is an audited read. `today` is the Melbourne calendar date and `generatedAt` is an ISO timestamp. A `statement` additionally includes account invoices/payments/credits/refunds and computed balances. Finance service must return enough data for the document renderer without direct SQL in the PDF layer.
- `recordExport(actor, kind, metadata)` stores a durable authorised export manifest and audits it; returns the manifest. Metadata includes invoice IDs/revisions, row/document counts, net/tax/gross totals, SHA-256, settings mapping revision and exclusions. Xero manifests also retain the exact contact mapping, account ID and account revision used for each included payer. No balance mutation.
- `withSnapshot(actor, callback)` gives trusted internal synchronous code `{state,getDocument}` under one immediate transaction. Communications uses it to freeze and recheck consistent document facts. It is not an HTTP interface, accepts no untrusted callback, and must not perform network work or nest service transactions.

Business exceptions expose `.status`, `.code`, `.message`. `src/seed.mjs` exports `seedDemo(service)` and creates obvious synthetic accounts/students/fees/documents through the service, idempotently. It creates no staff password. HTTP/auth tables use `auth_` prefix and are owned by `src/auth.mjs`, avoiding schema collisions.

## State projection

`{ today, settings, accounts, students, fees, invoices, payments, receipts, allocations, credits, refunds, plans, batches, exports, audit, summary }`.

| Collection | Minimum fields (additional derived fields may be supplied) |
|---|---|
| settings | `revision, schoolName, legalName, abn, address, email, phone, paymentInstructions, defaultDueDays, gstRegistered, taxPolicyApproved, demoMode, xeroTaxMappings` |
| accounts | `id,code,name,billingName,email,address,contactAllowed,xeroContactName,status,revision,createdAt,balanceCents,unallocatedCents,bondHeldCents,pendingCents` |
| students | `id,accountId,name,yearLevel,entryYear,status,enrolmentReference,revision` |
| fees | `id,code,description,unitCents,taxCode,category,accountCode,active,revision` |
| invoices | `id,accountId,number,status,settlementStatus,overdue,issueDate,dueDate,year,term,description,lines,subtotalCents,discountCents,taxCents,totalCents,paidCents,creditedCents,balanceCents,revision,accountSnapshot,sellerSnapshot,createdAt,issuedAt` |
| payments | `id,accountId,purpose,amountCents,paidOn,method,reference,status,evidence,receiptId,allocatedCents,unallocatedCents,refundedCents,createdAt` |
| receipts | `id,number,paymentId,accountId,amountCents,issuedAt,snapshot,reversed` |
| allocations | `id,paymentId,invoiceId,amountCents,createdAt,releasedAt,reason` (append-only release event implementation is acceptable) |
| credits | `id,number,accountId,invoiceId,amountCents,taxCents,lines,reason,issuedAt,snapshot` |
| refunds | `id,paymentId,accountId,amountCents,paidOn,reference,reason,createdAt` |
| plans | `id,invoiceId,instalments:[{dueDate,amountCents,paidCents,status}],createdAt` |
| batches | `id,label,year,term,issueDate,dueDate,status,invoiceCount,totalCents,invoiceIds,createdAt` |
| exports | `id,kind,status,metadata,createdAt,actorId,importReference,importedAt` |
| audit | `id,actorId,actorName,action,entityType,entityId,reason,createdAt` (latest bounded 200 in state; durable full history in DB) |
| summary | `outstandingCents,overdueCents,receivedCents,pendingCents,unallocatedCents,bondHeldCents,draftCount,overdueCount,accountCount,studentCount,ageing:[{label,amountCents,count}]` |

`status` on invoices is the stored document lifecycle `draft/issued/void`. `settlementStatus` is the calculated `unpaid/part_paid/paid/credited`. Payment purpose is `fees/bond`; payment status is `pending/confirmed/rejected/reversed`. Student status is `prospective/active/inactive`; account status is `active/archived`. Fees permit `tuition/levy/other` and tax codes `GST_FREE/GST_10/NO_GST`. Issued invoice lines include frozen `studentName` as well as optional student ID.

## Commands

| Type | Payload |
|---|---|
| `account.create` | `name,billingName,email,address,contactAllowed,xeroContactName` (email/address optional until live issue) |
| `account.update` | `id,expectedRevision,name,billingName,email,address,contactAllowed,xeroContactName,status` |
| `student.create` | `accountId,name,yearLevel,entryYear,status` |
| `student.update` | `id,expectedRevision,name,yearLevel,entryYear,status` (no silent account move) |
| `student.link` | `id,expectedRevision,enrolmentReference` (empty clears), `reason` |
| `fee.create` / `fee.update` | `code,description,unitCents,taxCode,category,accountCode,active`; update adds `id,expectedRevision` |
| `invoice.create` | `accountId,issueDate,dueDate,year,term,description,lines` |
| `invoice.update` | Same editable fields + `id,expectedRevision`; draft only. Explicit save of a batch draft refreshes its payer/seller snapshot to current configuration; original batch preview and period claims remain unchanged |
| `invoice.issue` | `id,expectedRevision` |
| `invoice.void` | `id,reason`; finance/admin only, no allocations/credits |
| `payment.record` | `accountId,purpose,amountCents,paidOn,method,reference`; always pending |
| `payment.confirm` | `id,evidence,allocations:[{invoiceId,amountCents}]`; finance/admin; bond allocations prohibited |
| `payment.reject` | `id,reason` |
| `payment.allocate` | `id,allocations:[{invoiceId,amountCents}]`; confirmed fee funds only |
| `payment.release` | `id` (payment), `allocationId,reason`; releases whole active allocation |
| `payment.reverse` | `id,reason`; no existing refunds; release all active allocations |
| `payment.refund` | `id,amountCents,paidOn,reference,reason`; already completed outgoing refund evidence, unique normalized reference/date across original payments; limited to unapplied/held funds |
| `credit.create` | `invoiceId,lines:[{invoiceLineId,amountCents}],reason`; positive gross credit amounts targeted to original lines, bounded by line remaining credit capacity and invoice outstanding; cumulative tax rounding preserves the original line tax exactly |
| `plan.create` | `invoiceId,instalments:[{dueDate,amountCents}]`; one plan per invoice; exact total and ordered dates |
| `batch.preview` | `label,studentIds,feeIds,year,term,issueDate,dueDate`; groups selected students per account, snapshots current prices/identities, no invoice issue. New live previews require complete seller/payer setup and approved tax policy |
| `batch.commit` | `id` (batch); generates its reviewed drafts exactly once |
| `export.recordImport` | `id,importReference,reason`; finance/admin, marks manual external import evidence only; does not claim reconciliation |
| `settings.update` | Full settings + `expectedRevision`; admin only, settings demoMode controlled by server environment rather than browser |

Each invoice line input is `{id?,studentId?,description,quantity,unitCents,discountCents,taxCode,category,accountCode}`; an update retains the line IDs belonging to that draft. A per-line discount is an absolute amount for the extended quantity, not a percentage. Backend validates student belongs to account, computes net/tax/gross and rejects unsafe/negative values. Fee lookup is optional; staff may enter a custom line. Reissued PDFs preserve historical names, descriptions, prices, tax classification and instructions.

An untouched batch draft retains its original preview facts. If seller/payer setup was incomplete in an older preview, or tax policy changes before issue, staff complete configuration and explicitly open/save the draft, review the refreshed draft, then issue it using the new revision. This refresh changes only the unissued draft. The original batch snapshot, student/fee/year/term claims and any previously issued document remain unchanged. A fresh batch cannot circumvent an existing period claim.

The first UI may stage more complex operations on detail screens; all commands above need server tests and usable staff controls before claiming full implementation. Any deferred surface is recorded explicitly in delivery evidence rather than hidden behind a nonfunctional action.

Confirmation refuses duplicate evidence across staff/keys using the normalized `(method, reference, paidOn)` identity across accounts and fee/bond purposes (regardless of amount), preventing a transfer recorded twice from becoming two receipts. Rejected claims do not consume evidence; reversed confirmed records retain the claim so corrections remain traceable. A source reference must identify the actual transaction; a reused generic family reference requires a distinct bank transaction identifier before confirmation. All financial dates are valid calendar dates and received/refunded dates cannot be in the future. Non-demo issuance requires configured seller/payer identity and explicit `taxPolicyApproved`; GST_10 is prohibited when `gstRegistered` is false. Taxable registration selection requires a valid ABN but is an operator assertion, not external ABN verification.

Xero export rejects formula-like text in exact contact/account/tax mapping fields, requires a mapping for every included tax code and an account code per line, and excludes/flags drafts, voids and invoices with credits. Original invoice exports are not an aged-debt sync. The manifest includes exclusions and the UI warns that later corrections require separate accounting review. Real AU tenant template/Demo Company validation remains outstanding.

The optional current account `xeroContactName` is an explicit accounting mapping to the exact external contact display name, separate from the immutable payer snapshot. It is trimmed, limited to 160 characters, defaults to empty, and is preserved if omitted on update; explicit empty text clears it. Xero export requires it on included accounts, checks mapping collisions across the entire current account register (including accounts absent from this file), and never infers contact identity from payer names. Finance reviews mappings before export; account maintenance uses the normal billing/finance/admin role gate.

Refund uniqueness uses normalized `(reference, paidOn)` across all accounts and original receipts, independent of refund amount and incoming payment method. A refund reference identifies the actual outgoing transaction. Repeating the same outgoing refund against a cash receipt and a bank-transfer receipt is rejected. Existing immutable refund rows with an older hash format still reserve their normalized reference/date; their historical facts are not rewritten.

## Communications commands and worker

`createCommunications({db,service,clock?})` owns additive `comms_*` tables in the same private database. Every public command uses the financial service's trusted consistent snapshot, its own role check, durable idempotency record and immutable events. Message updates require the current `expectedRevision`. The original financial ledger and financial operation identities remain separate.

| Type | Payload and authority |
| --- | --- |
| `communication.create` | `{kind,documentId}`; billing+; kind invoice/receipt/credit/statement; creates or returns the existing logical document email |
| `communication.update` | `{id,expectedRevision,subject,body}`; billing+, draft only; subject 200/body 12,000 characters |
| `communication.approve` | `{id,expectedRevision}`; finance+; current eligible draft becomes queued |
| `communication.cancel` | `{id,expectedRevision,reason}`; billing+ for draft, finance+ for other cancellable states |
| `communication.refresh` | `{id,expectedRevision}`; billing+; draft/blocked/failed; restores current facts/default wording to draft |
| `communication.retry` | `{id,expectedRevision,reason}`; finance+; definite failed only; rechecks eligibility before queueing |
| `communication.resend` | `{id,expectedRevision,reason}`; finance+; accepted/cancelled only; creates one new current draft linked by `parentMessageId`, never auto-approves |
| `communication.resolve` | `{id,expectedRevision,outcome,providerId?,reason,evidence}`; finance+; uncertain only; outcome accepted/not_sent; accepted requires providerId; immutable resolution, not_sent becomes failed for separate retry |
| `communication.settings` | `{expectedRevision,automaticInvoices,automaticReceipts,remindersEnabled,reminderOffsets,mode,startDate}`; finance+; mode review/automatic, calendar start date, up to 12 unique integer offsets |
| `communication.prepare` | `{limit?}`; finance+; bounded eligible event scan |
| `communication.hold` | `{accountId,paused,reason}`; finance+; records an account-wide outbound hold and its history |

Worker-only methods are not exposed over HTTP: `prepareAutomatic()`, `claimNext()`, `validateClaim({id,attemptId,leaseToken})`, `finishAttempt({id,attemptId,leaseToken,outcome,providerId?,errorCode?,attachmentSha256?})`, and `recoverExpired()`. Claim, validate, outcome recording and lease recovery are separate bounded transactions; PDF rendering and provider calls occur outside transactions. Expired attempts become uncertain, never automatically queued. Manual resolution preserves the original attempt/result and prevents late callbacks from changing the decision. See [Communications](COMMUNICATIONS.md) for state meanings, automation, hashes and sender configuration.

## Staff commands

`auth.manageStaff(actor,command,key)` is asynchronous and returns `{staff,replayed}`. The safe staff projection includes `active` as a boolean and `createdAt` as epoch milliseconds (unlike domain ISO timestamps). Password-bearing commands use secret-safe idempotency verification, never plaintext passwords or unsalted fast password digests. Role, active state and revision are rechecked after password hashing.

| Type | Payload and authority |
| --- | --- |
| `staff.create` | `{name,email,role,password}`; admin only |
| `staff.update` | `{id,expectedRevision,name,role,active}`; admin only |
| `staff.resetPassword` | `{id,expectedRevision,password}`; admin only; does not implicitly enable a disabled account |
| `staff.changePassword` | `{currentPassword,password}`; any authenticated role, self only |

Names are limited to 120 characters; passwords to 15–128. Disable, role changes and password reset/change revoke the target's sessions. The last active administrator cannot be disabled or demoted by either the API or operator CLI. A wrong current password returns `CURRENT_PASSWORD_FAILED` (401) while the valid session remains; the UI displays that form error without treating it as session expiry. There is no public password-reset link or email recovery endpoint.
