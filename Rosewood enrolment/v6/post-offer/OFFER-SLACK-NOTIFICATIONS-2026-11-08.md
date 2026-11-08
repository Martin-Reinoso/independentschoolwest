# Offer acceptance notifications and clause 1.1 clarification

## Approved behaviour

The user requested “where applicable” instead of “where appropriate” in clause 1.1,
and Slack alerts for provisional-offer acceptance using the existing channels:

- Each non-final required guardian signature: private `#enrolments-committee`.
- All required signatures complete: board-access-only `#enrolments`.
- An explicitly approved sole-guardian arrangement completes after that guardian signs;
  do not create a misleading pending alert or automatically waive another signature.
- More than two guardians and siblings follow the actual required signatures per child.

Notifications distinguish offer acceptance from the original Application submission.
They show only the child name, entry year/level, completed signer names, signature
count, optional Application reference, Melbourne time and generic staff-portal link.
No guardian email, contact restriction/reason, signature image, private family token,
agreement attachment or other Application answers are included. Completion remains
provisional and subject to registration/written commencement confirmation.

## Delivery and recovery

`offer_signature_pending` and `offer_acceptance_complete` use the existing separate
pending/completion webhook secrets. No new Slack channel, secret or schedule is created.
Production configuration was read-only verified to contain both routes and a staff URL.
The notification is queued in the same DynamoDB transaction as the signature and
acceptance record. A failed transaction creates no notification; repeated successful
signing returns existing state without enqueueing again. Normal outbox retries,
eight-attempt terminal failure and alarms apply. Slack incoming webhooks are at-least-once:
a network ambiguity after Slack accepts a message can still cause a delivery duplicate.
There is no historical backfill, replay or real test post. Original Application alerts
and guardian contact/signing rules remain unchanged.

## Immutable wording release

Agreement `rosewood-provisional-enrolment-agreement-2026.7`, approved by the user’s
explicit correction, canonical SHA-256 `6972b4ae652a06774d0ae2b4ce774ed560bc0a6560ec39b784a7ab4c2226d009`. Apart from the version ID, only clause
1.1 changes. Existing issued offers and signed records retain their frozen wording;
no family-record migration or resend. New previews must use the new hash.

EOI 2026.36 / Application 2026.37 pin the updated shared assets only; question/answer
contracts and all 71 earlier definition hashes are unchanged. The browser recognises
the newly published Application version and still rejects unknown versions.

Regression coverage includes channel routing, partial/final acceptance, approved sole
signer, three signers, siblings, restricted guardians, duplicate requests, transactional
failure, payload privacy and delivery retry without repeating signatures or family email.
Tests use fictional records and mocked Slack transport. Full release evidence is in the
associated PR and `~/.local/share/ffe-private-runtime/offer-applicable-20261108`.
