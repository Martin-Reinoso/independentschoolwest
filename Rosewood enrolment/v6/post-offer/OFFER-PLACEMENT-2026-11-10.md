# Offered year level — 10 November 2026

The College can approve an offered year level that differs from the requested level
in a completed Application. The user authorised Year 4 offers for two specific 2027
applicants previously requesting Year 5. Identities and operation evidence stay in the
private runtime directory, never in this public repository.

A separate `offer_placement` record uses `OFFER_PLACEMENT#applicationId / META` and
contains `applicationId`, `entryYear`, `entryLevel`, `recordedBy`, `recordedAt` and an
internal authorisation reason. It does not rewrite signed Application answers,
revisions, documents, hashes, signatures or historical requested-level reports.
No new family question, public wording, form version or contract change is required.

Staff offer candidates and server preview use this placement. The same frozen packet
supplies the email, principal letter, portal, acceptance record and notifications.
Families see the offered level in the existing layout; no explanation is added.
Other children use their requested level. Placement comes only from trusted server
storage, never a request-body override. Invalid or mismatched placement fails closed.
Preview hashes bind the reviewed placement; issuance condition-checks its exact value
(or absence) in the offer transaction. Concurrent changes require a fresh preview.
Already issued offer packets remain frozen.

## Restricted operation

No portal write endpoint is added. An authorised operator uses an explicit private
manifest and dry-run-first conditional transaction:

1. Verify AWS account/region and save current runtime and record evidence privately.
2. Match exactly the authorised completed IDs, names, entry year and requested level.
3. Check no offer link or previous placement exists for either Application.
4. Atomically create both placement records and append two audit events, with
   Application revision/status and offer-absence condition checks.
5. Re-read placements, compare full Applications with their preceding copies and verify
   no offer or email was generated.

Do not apply to an issued offer; use reviewed withdrawal/replacement and account for
recorded signatures. Do not change other children, the older duplicate application,
general year-level options or fees. Before issuance, rollback may conditionally remove
only the exact placement records and append audit evidence. Never delete audit history.

Synthetic tests cover siblings, candidates, preview, letter/email, family review/signing,
Application preservation, stale-preview rejection, request-body isolation and
transactional checks for present/absent placement. Private release/operation evidence:
`~/.local/share/ffe-private-runtime/offer-placement-20261110`.
