# Rosewood College Enrolment V2

V2 is a new invitation-only enrolment application. It is intentionally separate from
the earlier portal and does not import its HTML, JavaScript, Lambda handler, data schema
or legal wording.

## Status

**Development and synthetic testing only. Not approved for real applications.**

Production remains blocked until Rosewood approves the policy placeholders, privacy
collection notice, guardian/signatory rules, retention schedule, document requirements,
fee wording and staff access model.

## Product Shape

The family journey is:

1. private invitation and email OTP
2. welcome and document-readiness briefing
3. student and enrolment details
4. family, authority and emergency contacts
5. learning, wellbeing and medical support
6. permissions, communications and fee responsibility
7. documents
8. review, declarations and primary signature
9. additional guardian OTP/signature tasks where required
10. immutable receipt when the required signature set is complete

The interface is served from `pages/rosewood-enrolment-v2.html`. Separate remote-signer
and OTP-protected receipt experiences are served from `pages/rosewood-sign-v2.html` and
`pages/rosewood-receipt-v2.html`. All three read one deployment endpoint from
`pages/rosewood-enrolment-v2-config.js`.

## Operating Model

- GitHub Pages serves static HTML, CSS and JavaScript.
- AWS Lambda provides invitation, OTP, session, draft, upload, submission and signing
  endpoints.
- DynamoDB stores short-lived challenges/sessions, revisioned drafts, signatory state,
  idempotency records and append-only audit events.
- Amazon SES sends transactional OTP, signature and receipt messages.
- A restricted Google Drive folder stores submitted application snapshots, signature
  artifacts and uploaded documents during the approved interim period.
- A private Google Sheet stores bounded engagement events only, not family answers,
  Drive references, OTPs, active tokens or signature images.
- DynamoDB atomically stores completion state, recipient-specific receipt capabilities
  and notification outbox records; a scheduled worker retries unsent messages.

The temporary sender identity is configured through `OTP_FROM_EMAIL`; no personal
mailbox address or password is committed. The temporary test identity will be replaced
by a Rosewood-controlled domain identity without changing the OTP protocol.

## Safety Boundaries

- `?preview=1` is always synthetic and non-writing.
- Local tests use in-memory adapters and synthetic family records.
- No live family data belongs in Git, logs, test fixtures or screenshots.
- Placeholder policies are visibly labelled and must not be represented as approved.
- A hidden URL and invitation token are routing controls, not sufficient authentication.
- OTP proves access to an invited mailbox; it does not independently prove legal
  identity or parental authority.

See `PRODUCT-SPEC.md`, `ARCHITECTURE.md`, `SECURITY-AND-PRIVACY.md`, `DEPLOYMENT.md`,
`OPERATIONS.md`, `TESTING.md`, `COMPLETION-AUDIT.md` and `policies/`.
