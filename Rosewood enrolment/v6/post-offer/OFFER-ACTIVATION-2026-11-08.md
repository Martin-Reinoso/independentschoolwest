# Real provisional-offer activation — 8 November 2026

## User approval and exact version

The user explicitly confirmed the final terms and requested enabling real offers on
8 November 2026: “I confirm the final terms. Please enable real offer.” This closes
the substantive wording and activation decisions recorded in the release gates.
It authorises activation, not an automatic or bulk send to existing families.

Approved contract: `rosewood-provisional-enrolment-agreement-2026.3-review`.
Canonical SHA-256: `61c6ac6ac0be3045d87376e393bcd843332932059bac16adcb9dce6240acf151`.
The deployed contract and canonical-hash module were byte-compared with main
`90fc16b3461b8cde909baa81ee22476e2a6410c1`; both match exactly. All fourteen sections,
seven policy snapshots and the approved registration introduction are included.

The source filename, historical draft metadata and `-review` identifier are retained
to preserve the exact reviewed bytes. They are not displayed as a draft warning in
the live acceptance form or signed PDF. Runtime authorisation uses the explicit
approved-content hash; this approval record supersedes the source's draft status.
No contractual wording or existing EOI/Application contract changes in this activation.

## Configuration change

Use the existing production CloudFormation template and retain every other parameter.
Set `EnrolmentOffersEnabled=true` and `EnrolmentOfferApprovedHash` to the hash above.
Inspect the change set and require only the Lambda environment to change, with no
replacement or code/configuration-secret change. A Lambda configuration update recycles
the runtime automatically; no separate server restart is needed.

Staff still select eligible completed 2027 sibling Applications, confirm the authorised
guardians and contact permissions, fill the actual schedule, review the personalised
letter/email and explicitly send. This activation does not create offers, alter family
records, enqueue messages or authorise a production write-path test.

## Verification

Activation checks are in progress. Record final stack, health, canary, regression,
resource-preservation and no-email evidence here before declaring completion.

## Stop new issuance

Clear `EnrolmentOfferApprovedHash` through CloudFormation to stop new offers while
preserving existing family access. Disabling `EnrolmentOffersEnabled` also stops family
access and is a broader emergency action. Never roll back family records or replay
email queues to reverse a configuration change.
