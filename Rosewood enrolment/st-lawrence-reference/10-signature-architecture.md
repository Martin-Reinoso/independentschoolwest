# Signature Architecture

## Purpose And Confidence

This document translates the observed St Lawrence guardian-signing flow into an
engineering reference for Rosewood. The browser frames and family-visible state machine
are now captured end to end. The exact Enquiry Tracker database schema, cryptographic
implementation and internal API source code were not available, so backend entity names
and endpoint shapes below are a proposed Rosewood design rather than claims about the
vendor's private implementation.

**High confidence, directly observed:** unique guardian task link, prefilled identity,
invisible Turnstile, email OTP, authenticated signing wizard, details save, immutable
review, declaration-gated canvas, automatic date, per-guardian completion, Thank You,
confirmation messages, aggregate Submitted state and immutable signed-form view.

**Inferred:** exact tables, transaction boundaries, token hashing, signature encoding,
document hashing and notification queue design. These are engineering requirements for a
safe Rosewood implementation, not reverse-engineered vendor facts.

## Front-End Frame Contract

| Frame | Purpose | Required state | User action | Result |
| --- | --- | --- | --- | --- |
| Identity | Bind the invited guardian to the task | Signed task link and prefilled email | Confirm email | Turnstile and OTP challenge |
| OTP | Prove mailbox control | Unexpired challenge | Enter six-digit code | Authenticated, task-scoped session |
| Introduction | Explain the signing flow | Verified session | Next | Your Details |
| Your Details | Confirm or correct signer contact data | Prefilled task/contact snapshot | Confirm details | Blocking authenticated save |
| Review | Show the exact agreement snapshot read-only | Saved signer details and frozen form revision | Confirm reviewed and ready | Enable `Continue to sign` |
| Sign | Capture final intent and evidence | Reviewed revision | Optional comments, two declarations, signature | Atomic signature creation |
| Thank You | Confirm the individual signature | Signature record committed | View Signed Form or Logout | Immutable submitted view |
| Signed Form | Durable family receipt | Required signature set complete | Print or Logout | No mutation |

## Validation State Machine

The observed Sign frame uses dependent validation rather than independent fields:

1. The canvas displays `Please agree to the terms above to enable signing` and rejects
   pointer input until both declarations are checked.
2. Unchecking the IP declaration after interaction displays
   `You must acknowledge the IP address recording to continue`.
3. Unchecking the consent declaration displays
   `You must agree to the terms to continue`.
4. When validation is active and no signature exists, the canvas receives a red border
   and displays `Please provide your signature`.
5. The required date also receives a red outline while no valid signature/date exists.
6. Drawing a signature populates today's date automatically, enables Clear Signature and
   makes final Next green only when all requirements remain valid.
7. Clearing the signature must clear the automatic date, restore the signature/date
   errors and disable final Next.

Rosewood should preserve the dependency but improve the explanation: declarations should
state that they unlock signing, errors should be announced accessibly, and the final
button should say `Submit signature`, not `Next`.

## Proposed Rosewood Data Model

```text
Contact
  -> Student
      -> Application
          -> Offer
              -> AgreementFormInstance
                  -> AgreementRevisionSnapshot
                  -> SignatoryAssignment [one per required guardian]
                      -> IdentityChallenge [OTP attempts and expiry]
                      -> SigningSession [short-lived, task scoped]
                      -> SignatureRecord [one immutable completion]
                  -> AgreementAuditEvent [append only]
                  -> NotificationOutbox
```

### AgreementFormInstance

- immutable form/template identifier and mutable lifecycle status
- student, offer and school references
- required-signature count and completed-signature count
- current agreement revision identifier
- created, updated, fully signed and submitted timestamps
- status such as `draft`, `pending_signatures`, `submitted`, `voided` or `superseded`

### AgreementRevisionSnapshot

- canonical JSON representation of every reviewed field and consent
- ordered document references and hashes
- policy/document version identifiers
- canonical-render hash used by every signatory
- created timestamp and creator/audit source

Every guardian must sign the same frozen revision. A material change after one signature
must create a new revision and invalidate or explicitly supersede earlier signatures.

### SignatoryAssignment

- agreement instance and contact identifiers
- role/relationship and whether the signature is legally required
- contact-permission result kept separate from legal-signatory authority
- task-token hash, issue/expiry/revocation timestamps and attempt counters
- state: `invited`, `challenge_issued`, `verified`, `reviewed`, `signed`, `declined`,
  `expired` or `revoked`
- last reminder and completion timestamps

The public task token must be high entropy, stored only as a hash and scoped to exactly
one assignment. It must never be treated as the guardian's signature or sole identity
proof.

### SignatureRecord

- signatory assignment and exact agreement revision identifiers
- declaration text/version identifiers and accepted timestamps
- signature image or stroke payload in a private object store
- signature-content hash and object version identifier
- signer comments
- signing date and authoritative server completion timestamp
- source IP captured at the trusted edge, not accepted from client input
- user-agent/session metadata appropriate to the approved privacy policy
- immutable audit/event identifier

Do not store signature images, OTPs or active task links in Google Sheets. For the interim
Google Drive process, place sensitive artifacts in restricted Drive storage and keep only
opaque references and operational status in the tracking sheet.

## Proposed API Boundaries

These are conceptual contracts; final paths may differ.

| Operation | Method shape | Security and idempotency |
| --- | --- | --- |
| Request OTP | `POST /signature-tasks/{token}/challenges` | Turnstile, rate limit, generic response, task scope |
| Verify OTP | `POST /signature-tasks/{token}/sessions` | Hashed OTP, attempt limit, short expiry, rotate session |
| Load context | `GET /signing-sessions/{session}/context` | Returns only assigned form/contact and current state |
| Save details | `PATCH /signing-sessions/{session}/contact-snapshot` | Version precondition and audit event |
| Load review | `GET /signing-sessions/{session}/agreement-revision` | Frozen revision and canonical hash |
| Submit signature | `POST /signing-sessions/{session}/signature` | Idempotency key, revision hash, atomic transaction |
| View signed form | `GET /signing-sessions/{session}/signed-form` | Read-only, authorised, no active task token in output |

The signature submission transaction should:

1. lock the signatory assignment and agreement instance
2. reject revoked, expired, already-signed or revision-mismatched requests
3. validate both declarations, signature payload, comments length and server date
4. persist the immutable signature artifact and hash
5. mark the assignment signed and append the audit event
6. recompute required-signature completion
7. if complete, mark the agreement Submitted with a server timestamp
8. enqueue individual and all-signatures-complete messages transactionally
9. return the already-created result for a repeated idempotency key

## Audit And Security Requirements

- OTPs are hashed, short lived, single use and protected by retry/rate limits.
- Signing sessions are short lived, assignment scoped, rotated after OTP and invalidated
  after completion or logout.
- Source IP comes from a trusted proxy chain with an approved retention policy.
- Signature artifacts are encrypted, access controlled, malware-safe and never public.
- Audit events are append only and record challenge, verification, review, declaration,
  signature, completion, print/view and administrative override events.
- Notifications use an outbox so a committed signature is not lost when email delivery
  fails, and retries cannot create duplicate signatures.
- Signed-form access requires authorisation and renders a fixed revision with all controls
  disabled. Print is client-side; editing requires a new governed workflow.
- Logs and analytics exclude OTPs, task tokens, signature payloads, document contents and
  unnecessary personal values.

## Aggregate Completion Rule

The observed record moved from Pending Signatures to Submitted only after the additional
guardian completed their task. Rosewood should calculate this from required assignments,
not from a mutable counter alone:

```text
agreement is submitted
  when every non-revoked required SignatoryAssignment
  has exactly one valid SignatureRecord
  for the agreement's current revision
```

This rule must run in the same transaction as signature creation. A background
reconciliation job should independently detect count/state drift and alert staff without
silently changing legal outcomes.

## Remaining Unknowns

- exact invalid/expired OTP and task-link messages
- refusal, revocation, guardian dispute and court-order workflows
- whether Enquiry Tracker stores canvas strokes, an image, or both
- precise IP/user-agent retention and administrative access controls
- reminder scheduling and task expiry
- handling of an agreement edit after the first guardian signs
- completed-agreement download format, if any, beyond browser Print
