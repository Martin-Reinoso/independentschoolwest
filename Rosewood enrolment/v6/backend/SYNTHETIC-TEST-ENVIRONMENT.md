# Isolated provisional-offer integration environment

## Current live checkpoint

The Google grant and isolated live staff/primary/secondary journey are complete.
Both fictional children have two signatures; all 13 expected test emails were delivered.
Actual Gmail letter and signed-record bytes match their reviewed/stored counterparts.
Original Applications are unchanged. Read [live integration evidence](../post-offer/LIVE-INTEGRATION-2026-11-08.md).
Production is unchanged; real issuance stays off. Earlier inactive/pending-consent
checkpoints below are historical and superseded by that report. Final test fixes,
recovery validation and the disabled production rollout are still in progress.

Status on 8 November 2026: the separate inactive test stack was created and verified.
See [deployment evidence](INACTIVE-TEST-DEPLOYMENT-2026-11-08.md) for the latest state.
Its current runtime is `9647377`, applied through a reviewed code-only update with
all resources and parameters unchanged. It was initially created from clean
commit `3fb2453`, with 28 additions and no production updates. The actual role matches
the resolved template exactly, has no extra attached/inline policies, and passes all
18 principal-policy simulations. Google consent/configuration and live email tests
remain pending. All delivery/readiness/offer switches remain off.

The first live request exposed a startup defect missed by simulation: Lambda's default
environment key is outside the role's deliberate KMS boundary, causing KMS access denial
and HTTP 502 before handler execution. The candidate now explicitly uses the test
stack's own key for Lambda environment encryption. The outside-key denial is retained;
six focused isolation tests pass. The reviewed update from `e793e7f` is now applied:
the stack is `UPDATE_COMPLETE`, and live health and fictional staff-OTP requests both
return the intended 503 before any record is created. The Lambda code checksum matches
the reviewed artifact. This finding and correction do not affect production.

The separated acceptance candidate passed all 275 backend tests and the locked build;
the new encryption-boundary regression brings the suite to 276. No actual test email
has been sent. See the current completion plan for final live verification evidence.

## User-authorised boundary

Only the exact approved personal Gmail address may receive test messages. It must
never become the logical applicant, guardian or staff identity. That inbox also owns
a real family Application, which must not be used, copied, linked or modified.
Use `alex@rosewood-offer.test`, `taylor@rosewood-offer.test` and
`staff@rosewood-offer.test` with obviously fictional child records. No production
write tests, family email or actual offer issuance are authorised by this test plan.

## Reproducible infrastructure

`scripts/build-synthetic-template.py` derives `template.synthetic.json` from the
production template using PyYAML 6.0.3. It does not call AWS. The production template
is unchanged by the generator. Package from the backend directory, where
`lambda-dist/` resolves to the locked build output.

The only planned deployment name is `rosewood-offer-test-20261108`, account
`274319535046`, region `ap-southeast-2`. Before preparing a CREATE change set, verify
the caller and confirm that name is absent (or explicitly inspect the existing test
stack). Use a clean reviewed release snapshot; inspect all additions/replacements
before execution. Never pass the production stack name to this workflow.

The test stack creates separate records/audit tables, KMS keys, private staging
bucket, runtime role, configuration secret, log group, SES configuration set,
encrypted feedback topic, Lambda and outbox schedule. It cannot reuse production
tables, retained keys, secrets or backup vaults through parameters. DynamoDB PITR
remains enabled; locked production backup plans/vaults are not cloned.

Defaults are deliberately inactive: `SyntheticReady=false`,
`EmailDeliveryMode=disabled`, `OutboxScheduleState=DISABLED`, offers disabled and
the approved contract hash blank. The Lambda returns 503 before reading secrets
when unready. The initial secret contains a provisioning marker, not production
credentials. Replace it with a newly generated test-only configuration when ready;
never copy the production secret.

The role independently restricts all SES recipients to the sole approved inbox,
including mixed To/Cc/Bcc sets. It denies absent recipient context and other sending
actions. Exact test-resource permissions plus explicit outside-resource denials
cover DynamoDB, S3, Secrets Manager and KMS. The runtime has no CloudWatch metric
publishing permission. Four separate test alarms have no notification actions;
there are no security-email subscriptions or scheduled production canary. The
canary event is also explicitly rejected by the synthetic Lambda.

`scripts/check-synthetic-iam.mjs` performs read-only AWS custom-policy simulation:
allowed inbox, other/mixed/missing recipients, raw transport, own/outside database,
storage, secret, KMS, audit append/rewrite/deletion, transaction condition checks and
production metrics. CloudFormation lint also passes after removing the ineffective
`dynamodb:TransactWriteItems` action; transactions use underlying item permissions
as documented in [AWS transaction IAM guidance](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html).
Use `node scripts/check-synthetic-iam.mjs --deployed` to repeat those checks
against the actual role and actual test resource ARNs; it first checks exact deployed
policy equality, trust and absence of additional role policies. Inspect function permissions,
feedback configuration and disabled schedule before enabling any traffic.

## Google isolation

The dedicated Google Cloud project is `rosewood-offer-test-20261108` (display
name **Rosewood Offer Test**, number `836042484839`), under the authorised personal
account. The user completed the Google policy consent and explicitly approved the
**Rosewood Offer Test Local Integration** desktop OAuth credential. It is created
and stored only in the private runtime, with `drive.file` as the sole requested scope.
Both Drive and Sheets APIs are verified enabled. The sole test user is the authorised
personal account. The app remains External/testing;
no billing upgrade or publication was performed. Actual account access/refresh-token
consent and creation of test storage remain pending. Do not repeat the resolved
policy or credential-creation approvals.

Use a distinct OAuth client/project and only
`https://www.googleapis.com/auth/drive.file`. Do not reuse the production app client
or broad Drive/Sheets refresh token. The production grant was inspected in memory
and has broad Drive/Sheets scopes; it is unsuitable for this environment. No shared
drives were listed, so a new service account has no suitable shared-drive file owner.

Restrict testing to the authorised personal account. At the actual account grant,
confirm only app-file access, then create separate folders and
three Sheets with that client. Verify the granted scope and verify that known
production folder/Sheet IDs are inaccessible using metadata-only requests. Never
read family documents to demonstrate denial. Keep tokens in the private runtime
and the new test secret only. Test refresh-token expiry must be monitored; do not
publish the test OAuth app merely to avoid reauthorisation.

Both Drive and Sheets adapters use app-file scope in the synthetic runtime. Every
token refresh requires an explicit exact app-file-only returned grant. Missing or
broader scope is rejected before a file API call, and the token is not cached.
Production auth behaviour is unchanged. `SYNTHETIC_GOOGLE_CLIENT_ID` pins the
expected new client; the secret cannot override runtime resource IDs, staff roles,
URLs, transport policy or Slack settings. Only named OAuth/HMAC/private-signature
secret keys are accepted. All five Google destination IDs must be configured and
distinct. Compare them with the production configuration in preflight.

## Activation and evidence still required

1. Complete Google consent/credential setup and create test-only storage/reporting.
2. The separate inactive AWS stack and actual-role verification are complete. Inspect
   its current state before any continuation; do not recreate it. Further configuration
   uses a reviewed UPDATE change set with all test-only boundaries preserved.
3. Provision newly generated OTP/network HMAC secrets, scoped Google credentials
   and the authorised private principal-signature crop. Do not put any of these
   in Git, template parameters, command-line literals, Pages or Lambda source.
4. Set the five test Google IDs and expected client; verify exact account, region,
   stack, role, resources, destinations, contract hash and no production reference.
   Start with delivery disabled and the schedule disabled.
5. Use a separate local frontend configuration at `http://127.0.0.1:8767` pointing
   only to the test Function URL. All test email portal links target this local UI.
   Do not change tracked production API metadata or publish draft policies.
6. Seed fictional records only, then enable ready/test email mode and the reviewed
   test contract. Enable scheduled outbox delivery only once its initial contents
   are verified synthetic. Inspect every message count and logical recipient.
7. Exercise actual staff issue, primary/secondary OTP and signatures, sibling
   selection, delivery feedback, PDFs/attachments, retry and duplicate handling,
   denial cases and isolated recovery. Read only labelled test messages in Gmail.
   Simulate provider failures; do not email bounce simulators or other recipients.
8. Record a test-email ledger, final queue state and exact stored/attached PDF
   checksums. Disable the test schedule/delivery when the run is complete and
   document resource retention/cleanup separately.

The production release remains a separate backend-first deployment with actual
offer issuance off, followed by frontend verification and read-only monitoring.
