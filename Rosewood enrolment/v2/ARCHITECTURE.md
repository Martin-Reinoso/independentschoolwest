# V2 Architecture

## System Boundary

```text
GitHub Pages family UI
    -> invitation + email OTP
    -> short-lived bearer session
    -> revisioned draft and document sessions
    -> frozen review revision
    -> primary signature
    -> independent guardian tasks
    -> recipient-specific receipt link + fresh email OTP
    -> minimal completed receipt view

AWS Lambda
    -> DynamoDB: invitations, challenges, sessions, drafts, assignments, audit/outbox
    -> Amazon SES: transactional email
    -> Google Drive API: private documents and immutable application artifacts
    -> Google Sheets API: operational tracker and engagement summaries
```

## API Contract

The Lambda response layer owns CORS, including OPTIONS requests. Function URL CORS is
left unset to prevent duplicate `Access-Control-Allow-Origin` headers.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v2/access/request-otp` | Validate invitation/email and issue a bounded challenge |
| `POST` | `/v2/access/verify-otp` | Consume the challenge and create a task-scoped session |
| `GET` | `/v2/session` | Return minimal invitation context and current state |
| `PUT` | `/v2/draft` | Conditionally save a complete validated draft revision |
| `POST` | `/v2/engagement` | Record a bounded, non-sensitive authenticated journey event |
| `POST` | `/v2/documents/session` | Create a scoped Google Drive resumable-upload session |
| `POST` | `/v2/documents/confirm` | Verify uploaded Drive metadata and attach it to the draft |
| `POST` | `/v2/documents/remove` | Detach and delete one confirmed draft document idempotently |
| `POST` | `/v2/applications/submit` | Freeze a revision, create signatory assignments and commit the primary signature |
| `POST` | `/v2/signatures/request-otp` | Issue an OTP for one remote signatory assignment |
| `POST` | `/v2/signatures/verify-otp` | Create an assignment-scoped signing session |
| `GET` | `/v2/signatures/context` | Return signer details and frozen revision summary |
| `PATCH` | `/v2/signatures/details` | Save signer-specific contact corrections with audit history |
| `POST` | `/v2/signatures/submit` | Atomically commit one immutable signature |
| `POST` | `/v2/receipts/request-otp` | Validate a receipt capability/mailbox pair and issue a bounded challenge |
| `POST` | `/v2/receipts/verify-otp` | Consume the receipt challenge and create a receipt-scoped session |
| `GET` | `/v2/receipts/context` | Return the minimal completed receipt to its scoped session |

Every write uses an idempotency key. Revision writes use an expected base revision.
Repeated accepted operations return the original result rather than creating duplicates.
Primary submission atomically changes the invitation from `active` to `submitted`; the
original application link cannot reopen or mutate the frozen record afterward.
For primary submission and a remote signer's final submission, the completed idempotency
result commits in the same DynamoDB transaction as the irreversible state transition.
Pending claims are leased for 60 seconds: a later request may reclaim a genuinely stale
claim, while claim timestamps prevent the expired worker from completing or deleting the
replacement operation.

## DynamoDB Single-Table Records

| Partition/sort shape | Record |
| --- | --- |
| `INVITE#<sha256>` / `META` | Hashed invitation, recipient, expiry, status and application ID |
| `CHALLENGE#<id>` / `META` | HMAC code, purpose, subject, attempt/resend limits and TTL |
| `SESSION#<sha256>` / `META` | Hashed bearer session, scope, subject, expiry and revocation |
| `APP#<id>` / `CURRENT` | Current draft or submitted state, revision, signer register and signature metadata |
| `TASK#<sha256>` / `META` | Required signatory assignment, frozen revision hash and task expiry |
| `RECEIPT#<sha256>` / `META` | Recipient-specific receipt capability, mailbox, signer and explicit expiry |
| `APP#<id>` / `EVENT#<timestamp>#<id>` | Append-only audit event |
| `OUTBOX` / `<timestamp>#<id>` | Idempotent pending/sent notification event |
| `IDEMPOTENCY#<key>` / `META` | Pending/completed operation result with TTL |
| `RATE#<dimension>#<bucket>` / `META` | Atomic abuse-control counter with TTL |

DynamoDB TTL is cleanup assistance, not authorisation. Every read validates the stored
expiry explicitly because physical TTL deletion is asynchronous.

## OTP Protocol

1. Require both a high-entropy invitation/task token and the expected mailbox.
2. Always return a generic request response to prevent mailbox enumeration.
3. Generate six digits with a cryptographically secure random source.
4. Store only `HMAC-SHA256(server secret, challenge id + code)`.
5. Expire after 10 minutes; limit to five verification attempts.
6. Enforce a server-side 60-second resend cooldown and bounded per-task, per-mailbox and
   per-network rates.
7. Consume the challenge with a conditional write and rotate to a 30-minute session.
8. Never log OTP, bearer session, invitation or signing task values.

Application and signature task links have their own explicit expiries. Those expiries
are rechecked at OTP request, verification, context read and signature submission, not
only when the email is first sent. Receipt links last 30 days in the test design and a
receipt session lasts 30 minutes.

For development, the SES sender is configured externally as a verified temporary email
identity. Production changes only `OTP_FROM_EMAIL`, `REPLY_TO_EMAIL` and the verified SES
domain configuration.

## Save Protocol

- Browser local storage remains an immediate fallback.
- Server save occurs after idle debounce and valid step transitions.
- The browser sends `baseRevision`, `operationId`, schema version and complete snapshot.
- The backend requires the configured schema and policy versions and writes those trusted
  values into the draft; a client cannot relabel the legal version recorded in a receipt.
- The server conditionally increments the revision and returns its timestamp.
- The UI says `Saved securely` only when the acknowledged revision equals the newest
  browser revision.
- Conflicts stop autosave and require reload/review; they are never last-write-wins.

## Google Drive Interim Storage

- A dedicated Rosewood service account receives editor access to one restricted folder
  inside a non-University Google Shared Drive. A folder in an individual's My Drive is
  not supported because service accounts have no personal storage quota, even when its
  ACL reports `canAddChildren`.
- The OAuth token uses the full Drive API scope because `drive.file` cannot discover a
  folder shared manually through Drive. The Google ACL remains the resource boundary.
- Deployment preflight creates and deletes a tiny probe file; an ACL-only read check is
  not accepted as proof that binary uploads will work.
- The backend creates scoped resumable uploads with fixed type, name, size and application
  metadata.
- After upload, `/documents/confirm` reads Drive metadata and verifies ownership, parent,
  size, MIME type and application marker.
- Submitted canonical JSON and signature artifacts are written to the restricted Drive
  folder. The receipt is a minimal API projection, not a second copy of the application.
- The tracking Sheet stores only bounded engagement rows; no family answers, Drive IDs,
  OTPs, receipt links or signature images.
- Drive and Sheet access is reviewed using the interim guidelines before deployment.

## Email Events

- `signature.invited`
- `signature.completed`
- `application.completed`

OTP messages are sent directly after a challenge is durably created and use a generic
HTTP response whether the capability/mailbox pair is valid or not. Signature invitations,
signature confirmations, recipient-specific receipt tasks and completion messages are
written in the same DynamoDB transaction as the associated application/signature state.
They are dispatched through leased outbox records immediately and by a one-minute
EventBridge retry schedule. A delivery failure therefore never rolls back a valid
signature or loses the notification record. Bounce and complaint events must suppress
unsafe retries and alert the operational owner before production.

## Receipt Boundary

The emailed receipt URL contains a high-entropy capability whose hash is stored in
DynamoDB. Opening the URL removes the capability from the address bar and keeps it only
in tab-scoped session storage. A fresh OTP creates a separate `receipt` session. The
response includes reference, student name, revision, policy version, submission and
completion timestamps, and required-signer names/status/timestamps. It excludes DOB,
address, email, health/support answers, uploaded documents, signature images, network
fingerprints and every raw token.
