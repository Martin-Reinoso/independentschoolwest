# Real provisional-offer activation — 8 November 2026

## Current acceptance workflow

Families accept the provisional offer and terms now; financial choices come later.
Staff do not enter acceptance or registration-condition deadlines, fee schedules,
bond selections/credits, or payment/refund periods. New offers have no automatic
acceptance expiry; registration and written commencement confirmation remain conditions.
Agreement 2026.5 is active; current assets are EOI 2026.31 / Application 2026.32.
See [current release and verification](NO-OFFER-DEADLINES-2026-11-08.md).
Older financial/deadline requirements below are historical and superseded.


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

Activation completed and verified at `2026-11-08T00:35:04Z` (11:35 Melbourne).
CloudFormation change set `enable-approved-offers-20261108` changed only the two
reviewed Lambda environment values. Stack `UPDATE_COMPLETE`; Lambda `Active` and
last update `Successful`. All 39 physical resources, runtime code checksum, template,
other parameters/environment and the configuration-secret version are unchanged.

- Live `/v6/health` returns `conditionalOffers:true`, EOI `2026.29`, Application `2026.30`.
- All 283 backend regression tests passed again (zero failures/skips).
- Static references and the public-data scan passed; no runtime rebuild was necessary
  because the exact deployed ZIP and contract match the already-tested release.
- The production schedule check at `00:35:08.606Z` and explicit manual check at
  `00:35:11.446Z` each passed all five canary checks, including enabled-offer health.
- All nine alarms are OK; the one-minute worker and ten-minute canary are enabled.
- Record/audit deletion protection and point-in-time recovery are enabled; both
  security-email subscriptions and the SES feedback Lambda subscription are confirmed.
- Three unauthenticated GET checks (offer, staff-offer and family context) returned 401.
- The private principal signature checksum and SES production sending readiness passed.
- Production has zero offer records and zero offer email events following activation.
  No family was selected or contacted, no production write-path test was performed,
  and the separate synthetic stack remains inactive.

Private baseline, reviewed change set and verification evidence are retained in
`~/.local/share/ffe-private-runtime/offer-activation-20261108`. This record supersedes
historical issuance-off/draft-approval checkpoints; no further terms approval is pending.

## Stop new issuance

Clear `EnrolmentOfferApprovedHash` through CloudFormation to stop new offers while
preserving existing family access. Disabling `EnrolmentOffersEnabled` also stops family
access and is a broader emergency action. Never roll back family records or replay
email queues to reverse a configuration change.
