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
    -> immutable completed receipt

AWS Lambda
    -> DynamoDB: invitations, challenges, sessions, drafts, assignments, audit/outbox
    -> Amazon SES: transactional email
    -> Google Drive API: private documents and immutable application artifacts
    -> Google Sheets API: operational tracker and engagement summaries
```

## API Contract

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v2/access/request-otp` | Validate invitation/email and issue a bounded challenge |
| `POST` | `/v2/access/verify-otp` | Consume the challenge and create a task-scoped session |
| `GET` | `/v2/session` | Return minimal invitation context and current state |
| `PUT` | `/v2/draft` | Conditionally save a complete validated draft revision |
| `POST` | `/v2/engagement` | Record a bounded, non-sensitive authenticated journey event |
| `POST` | `/v2/documents/session` | Create a scoped Google Drive resumable-upload session |
| `POST` | `/v2/documents/confirm` | Verify uploaded Drive metadata and attach it to the draft |
| `POST` | `/v2/applications/submit` | Freeze a revision, create signatory assignments and commit the primary signature |
| `POST` | `/v2/signatures/request-otp` | Issue an OTP for one remote signatory assignment |
| `POST` | `/v2/signatures/verify-otp` | Create an assignment-scoped signing session |
| `GET` | `/v2/signatures/context` | Return signer details and frozen revision summary |
| `PATCH` | `/v2/signatures/details` | Save signer-specific contact corrections with audit history |
| `POST` | `/v2/signatures/submit` | Atomically commit one immutable signature |
| `GET` | `/v2/receipt` | Return the authorised immutable receipt |

Every write uses an idempotency key. Revision writes use an expected base revision.
Repeated accepted operations return the original result rather than creating duplicates.

## DynamoDB Single-Table Records

| Partition/sort shape | Record |
| --- | --- |
| `INVITE#<sha256>` / `META` | Hashed invitation, recipient, expiry, status and application ID |
| `CHALLENGE#<id>` / `META` | HMAC code, purpose, subject, attempt/resend limits and TTL |
| `SESSION#<sha256>` / `META` | Hashed bearer session, scope, subject, expiry and revocation |
| `APP#<id>` / `CURRENT` | Current draft/application state and revision |
| `APP#<id>` / `REV#<n>` | Canonical immutable revision snapshot/hash |
| `APP#<id>` / `SIGNER#<id>` | Required signatory assignment and task-token hash |
| `APP#<id>` / `SIGNATURE#<id>` | Immutable signature metadata and private Drive reference |
| `APP#<id>` / `EVENT#<timestamp>#<id>` | Append-only audit event |
| `OUTBOX` / `<timestamp>#<id>` | Idempotent pending/sent notification event |

DynamoDB TTL is cleanup assistance, not authorisation. Every read validates the stored
expiry explicitly because physical TTL deletion is asynchronous.

## OTP Protocol

1. Require both a high-entropy invitation/task token and the expected mailbox.
2. Always return a generic request response to prevent mailbox enumeration.
3. Generate six digits with a cryptographically secure random source.
4. Store only `HMAC-SHA256(server secret, challenge id + code)`.
5. Expire after 10 minutes; limit to five verification attempts.
6. Enforce 60-second resend cooldown and bounded per-task/per-address/per-network rates.
7. Consume the challenge with a conditional write and rotate to a 30-minute session.
8. Never log OTP, bearer session, invitation or signing task values.

For development, the SES sender is configured externally as a verified temporary email
identity. Production changes only `OTP_FROM_EMAIL`, `REPLY_TO_EMAIL` and the verified SES
domain configuration.

## Save Protocol

- Browser local storage remains an immediate fallback.
- Server save occurs after idle debounce and valid step transitions.
- The browser sends `baseRevision`, `operationId`, schema version and complete snapshot.
- The server conditionally increments the revision and returns its timestamp.
- The UI says `Saved securely` only when the acknowledged revision equals the newest
  browser revision.
- Conflicts stop autosave and require reload/review; they are never last-write-wins.

## Google Drive Interim Storage

- A service account receives minimum access to one restricted folder.
- The backend creates scoped resumable uploads with fixed type, name, size and application
  metadata.
- After upload, `/documents/confirm` reads Drive metadata and verifies ownership, parent,
  size, MIME type and application marker.
- Submitted canonical JSON, rendered receipt and signature artifacts are written to
  application-specific restricted subfolders.
- The tracking Sheet stores opaque Drive IDs/status only; no OTP or signature image.
- Drive and Sheet access is reviewed using the interim guidelines before deployment.

## Email Events

- `access.otp_requested`
- `signature.invited`
- `signature.otp_requested`
- `signature.completed`
- `application.pending_signatures`
- `application.completed`
- `application.receipt`

Messages are dispatched from an outbox after the state transaction commits. Delivery
failure never rolls back a valid signature. Bounce and complaint events must suppress
unsafe retries and alert the operational owner.
