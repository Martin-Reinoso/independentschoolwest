# Provisional-offer production release — 8 November 2026

## Current correction: financial choices are made later

The user clarified that this stage is acceptance only. The six financial-choice inputs
have been removed from staff preparation, new offer packets and the signed PDF schedule.
Bond/payment choices are deferred; the published fee terms remain available. Required
offer dates are now visible before family signing. Agreement 2026.4 is approved and
active; current assets are EOI 2026.30 / Application 2026.31. See the
[verified correction and release evidence](PAYMENT-CHOICES-LATER-2026-11-08.md).
This supersedes earlier requirements to select financial arrangements before issue.


## Current activation state

The user approved the final terms and real issuance was enabled on 8 November 2026.
See [exact approval and successful activation checks](OFFER-ACTIVATION-2026-11-08.md).
The issuance-off state below records the preceding engineering release, not the current
operating configuration. The “before sending” approval/activation steps are now complete;
staff still preview and explicitly send each selected family offer.

## Historical engineering release

The acceptance workflow is deployed to AWS and GitHub Pages. Real offer issuance is
**disabled**, the approved-content hash is blank, and no real family was selected or
emailed. [PR #56](https://github.com/Martin-Reinoso/independentschoolwest/pull/56) merged
as `f717ebe` after both GitHub checks passed. Runtime code is `7bf4e0d`; subsequent `5eded24`
changes only documentation. Production contracts are EOI `2026.29` / Application `2026.30`.

## What is available

- Staff select completed sibling Applications, review one personalised principal letter
  and congratulatory email, and deliberately issue a family offer after activation.
- Each guardian uses their own verified email and the shared child portal. Primary
  guardians can correct permitted names/details and add guardians; existing signing
  emails stay locked. There is no acceptance document-upload step.
- Secondary requests wait until the primary has signed every child in that request.
  Secondary review is read-only. Each child completes only after all required signatures.
- Families receive individual receipts and completion acknowledgements with the exact
  stored signed PDF. Staff track delivery, verified access, child opens and signatures.
- Seven full policy readers include the approved Bridge Road publication address,
  immutable PDF/Word downloads and original Student Code map. Accepted snapshots remain
  fixed even if later policies change.

Use the [non-writing interactive preview](https://ffe.org.au/pages/rosewood-enrolment-offer-v1.html?review=1)
for review. It uses fictional details and cannot call the live service. The ordinary
production acceptance route remains unavailable until the offer feature is activated.

## Release verification

- 283 backend tests, locked build and static/public-data gates passed locally and in CI.
- Actual isolated AWS/Google/Gmail journey: two children, four signatures, 14 authorised
  test emails, all 14 delivered. Original Applications unchanged. Actual letter and
  signed-PDF Gmail attachments equal reviewed/portal/Drive bytes.
- Invalid/unrelated/expired/logged-out access rejected; completed-signature retry created
  no duplicate evidence or email. Actual reporting-worker failure/recovery passed.
- Isolated backup restored 111 rows to a separate table; all 9 critical records identical.
  The temporary duplicate was removed, and the backup/test originals were retained.
- Test readiness, email and offer issuance were disabled afterward; schedule remains off.
- Production UPDATE_COMPLETE / LambdaActive: all 39 physical resources retained, no
  replacements, existing parameters/environment unchanged apart from two default-off
  offer controls. Only the unsupported transaction action entries were removed from IAM.
- The authorised principal signature is in the existing private configuration secret.
  All other secret fields are identical to the preceding version. It is absent from
  Git, browser code and Lambda package. The first immediate Secrets Manager read saw
  the preceding version; explicit current/previous version checks verified the update.
- GitHub Pages built f717ebe. All 45 live frontend/policy assets match pinned hashes,
  including all 14new PDF/Word publication copies. Published preview verified in Chrome.
- Production health 200 with conditionalOffers:false; zero production offer records or
  offer email events. No production write-path tests were performed.
- Records/audit deletion protection and PITR remain enabled. One-minute worker and
  ten-minute canary remain enabled; both security-email subscriptions and SES Lambda
  subscription are confirmed. All five manual canary checks passed after publication.

The post-release observation lasted 1218 seconds (more than twenty minutes). Both scheduled canary cycles passed all five checks, and all nine production alarms were OK at completion. Scheduled observations: 2026-11-07T23:35:08.763Z, 2026-11-07T23:45:08.829Z.

## Before sending real offers

Engineering deployment is complete in the explicitly requested issuance-off mode.
Final substantive agreement approval remains separate from implementation: review
[the exact fourteen-section choices](FOURTEEN-SECTION-REVIEW-NOTES.md), then record
approval of the exact contract hash. The current terms are still marked draft. Do not
substitute the synthetic test hash approval for school approval.

Activation is a separate reviewed configuration update: set the approved content hash
and enable offers, preserving all other production parameters. Enabling alone sends
nothing. Staff must still select an eligible family, confirm children/guardians and
contact permissions, set the actual offer schedule, preview the exact email/PDF, and
explicitly send. Never bulk-send or backfill current families as an activation test.

One primary family email covers all selected siblings. Each completion is per child,
with a private acknowledgement for each required/contact-permitted guardian. Delivered
means acceptance by the recipient mail server, not proof the recipient read the message.

## Rollback and known limits

The exact preceding Lambda ZIP, packaged template, parameters, resource inventory and
secret version reference are retained privately under offer-terms-review-20261108.
The preceding public release is `9a613aa`. Roll back compatible runtime/static artifacts
and keep issuance off; never restore an older database over accepted records or replay
old offer queues. If real offers are later issued, preserve their contracts, signatures
and documents and prefer a compatible forward fix.

GitHub Pages responses use max-age=600. HTML cache/CSP hints do not provide authoritative
frame-ancestors or no-store response headers; a different host is a separate decision.
The Google test app remains External/testing with only drive.file; its refresh-token
expiry must be handled by authorised reauthentication, not publishing the test app.
Previously separated request-reporting and security-topic KMS repairs are not part of
this release. Passing current canaries does not establish that those repairs are done.

For continuation, use the existing frjativa GitHub credential scoped to each command;
the globally active jativaf account is read-only. No global account switch, access grant
or new Google consent is needed for the completed setup. See [live test evidence](LIVE-INTEGRATION-2026-11-08.md)
and [recovery guidance](../RECOVERY-RUNBOOK.md).
