# V2 Security And Privacy Controls

## Classification

The application may contain child identity, family relationships, health information,
disability/support information, court orders, residency evidence and signatures. Treat
all application content and metadata as restricted.

## Mandatory Controls

- invitation and task tokens are high entropy and stored only as hashes
- OTPs use keyed hashes, short expiry, single use, attempt limits and resend limits
- bearer sessions are short-lived, scope-limited and hashed at rest; completed state
  prevents further mutation and the browser clears its session copy after submission
- TLS is required; responses use `Cache-Control: no-store`
- static V2 pages declare a restrictive meta Content Security Policy because GitHub
  Pages cannot configure per-page response headers for this repository
- CORS permits only the Rosewood site and explicit localhost development origins
- all state-changing requests require an idempotency key
- browser and backend independently validate every field/file rule
- shared-care alternate addresses and health-professional consent are conditional, and
  an emergency contact cannot duplicate any guardian by full name, mobile or email
- backend draft storage rejects unknown fields, out-of-contract values and client-supplied
  document references, and pins schema/policy versions to trusted runtime configuration
- DynamoDB conditional writes enforce revisions, challenge use and signature uniqueness
- Drive and Sheets are private and shared only with named staff and the selected,
  organisation-controlled runtime identity
- the Drive adapter uses the full Drive API OAuth scope because `drive.file` cannot
  discover and manage a pre-existing restricted folder; a user OAuth credential can
  access that dedicated account's Drive, so the account must contain no unrelated data
  and the adapter separately enforces the configured folder target
- preferred storage uses a dedicated Rosewood service account and non-University Shared
  Drive; the supported fallback uses a dedicated organisation-user OAuth refresh token
  with explicit mode selection, exact mailbox verification, MFA, rotation, revocation
  and offboarding controls
- deployment preflight proves Drive writes with a create/delete probe; `canAddChildren`
  alone is insufficient because service accounts have no personal My Drive quota
- Google service-account keys or OAuth client/refresh credentials and AWS credentials
  live in Secrets Manager or deployment configuration, not Git
- production runtime startup fails closed on weak/missing secrets, missing schema/email
  configuration, non-HTTPS origins or non-HTTPS signature/receipt page URLs
- application, OTP, token, signature and document values are excluded from logs
- operational IP data is stored only as an approved keyed fingerprint, never a client-
  supplied address
- signature and document artifacts are immutable or versioned after submission
- audit events are append-only and separate from mutable family answers
- preview mode uses a comprehensive synthetic family record and cannot call the API,
  upload, persist, send email or submit
- private invitation, signature and receipt query tokens are removed from the browser
  address bar after capture and retained only in tab-scoped session storage
- completion state, receipt capabilities and all related outbox records commit in the
  same DynamoDB transaction
- primary and remote-final signature transitions atomically commit their replayable
  idempotency result; 60-second claim leases and claim-specific conditions prevent an
  expired concurrent worker from overwriting or deleting a replacement operation
- receipt responses are explicit minimal projections and never return the frozen
  application, documents, signature artifacts, mailbox addresses or network fingerprints

## Abuse Controls

- generic access/OTP responses prevent invitation/email enumeration
- per-task, per-email-fingerprint and per-network request limits
- resend cooldown with a stable challenge where safe
- maximum challenge attempts and temporary lockout
- server-enforced 60-second resend cooldown for access, signature and receipt OTPs
- payload-size and content-type limits before parsing
- upload metadata reconciliation after Google Drive completion
- optional Turnstile only as an abuse signal, never identity proof
- SES bounce/complaint feedback and account suppression handling
- alarms for OTP spikes, verification failures, save failures and outbox backlog

## Privacy UX

- explain the purpose beside sensitive fields
- separate operational communication from optional community/news consent
- provide `Prefer not to answer` where the field is not operationally mandatory
- hide medical, additional-needs, visa and order details until relevant
- explain who can access incomplete drafts before server-side draft saving is enabled
- show policy version identifiers in review and receipt
- provide correction, withdrawal, support and deletion contact routes

## Test Data Rules

- use synthetic names, dates, addresses, documents and signatures
- the temporary sender mailbox may receive real OTP test messages, but no real student
  data may be included in those messages
- remove synthetic cloud records after end-to-end tests
- never capture or commit OTP values, AWS identifiers, Drive IDs or bearer tokens
- local test-only message inspection is bound to localhost and must never be exposed by
  the deployed Lambda or static site

## Launch Blockers

The application must remain preview/testing-only until approved owners sign off:

- Privacy Collection Notice and Privacy Policy
- Enrolment Policy and Procedure
- admissions, authority and signatory rules
- fee responsibility and refund/withdrawal wording
- document necessity and retention schedule
- authorised staff/administrator access
- data breach and incident response
- SES sender domain and support mailbox
- SPF, DKIM and DMARC alignment, inbox placement, bounce and complaint handling
- a dedicated data-empty organisation Google account or restricted Shared Drive service
  account; the current broad-scope account with unrelated Drive data is test-only
- human accessibility review and a fresh end-to-end synthetic canary after final sender
  and storage identities are installed
