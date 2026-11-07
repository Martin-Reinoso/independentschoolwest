# Inactive synthetic acceptance deployment

## Runtime update to 9647377 — latest

The Bridge Road policy candidate is now deployed to the isolated test stack from
clean commit `9647377` (the policy implementation is `e17a885`). Package size is
16,931,483 bytes. Both change-set views were reviewed: the only changed property
is Lambda's code key; three unchanged dependent references are reevaluated.

The stack is UPDATE_COMPLETE, Lambda Active/Successful. Post-update checks confirm
all 28 physical resource IDs and every parameter are unchanged, actual Lambda code
matches the uploaded artifact, five runtime modules match the source, and the original
Student Code map matches its hash. Both tables are empty before and after health and
fictional staff-OTP checks, which return 503 SYNTHETIC_RUNTIME_NOT_AVAILABLE with
no-store. Delivery, readiness, offers and the outbox schedule remain disabled.
Separate SES feedback retains all seven event types and its sole Lambda subscriber;
the four test alarms have no notification actions. No actual email or production
write occurred. Private evidence: synthetic-inactive-stack-9647377-private.json and
synthetic-update-full-review-9647377-private.json.

The newer policy-download canary change is local only at this checkpoint. Google
policy/client creation is resolved; the actual drive.file account grant is pending.


## Runtime update to c46a705 — latest

Verified 8 November 2026 at 07:39 Melbourne time. The existing isolated test stack
now runs the clean `c46a705` candidate, including the policy map and download support.
The 16,929,267-byte package was uploaded under its own synthetic commit prefix.
Preflight rechecked the caller, clean source, inactive parameters, all 28 separate
resources, empty test tables and the actual role's 18 IAM simulation cases.

The local/current templates differed only in `RosewoodFunction.Properties.Code`.
The change set's property-value view listed exactly the S3 code-key change, with no
replacement. Its standard view also listed dynamic reevaluation of the outbox rule,
outbox permission and SES Lambda subscriber references. The execution guard initially
stopped on that difference. Both views were then reviewed: no template setting changed,
and the expected dependency references were explicitly verified before execution.

The update is `UPDATE_COMPLETE`; Lambda is Active/Successful. Post-update verification
proves all 28 physical resource IDs and every stack parameter are unchanged. The actual
Lambda code checksum matches the uploaded ZIP; five key runtime modules equal the clean
source, and the packaged Student Code map has its expected SHA-256. The test remains
unready, email/offer delivery off, approved hash blank, outbox disabled and Google IDs
unconfigured. Both synthetic tables remain empty before and after actual health and
fictional staff-OTP requests, which return the expected 503 with `no-store`.

Separate feedback still has seven events and one Lambda subscriber; all four test
alarms have empty notification-action lists. No secret values were read, no message
sent and no production resource or family record changed. This verifies an inactive
runtime deployment, not successful live email, Drive or signing integration.

Private evidence: `synthetic-update-{preflight,changeset,reviewed,full-review}-c46a705-private.json`,
`synthetic-packaged-c46a705.yaml`, `synthetic-inactive-stack-c46a705-private.json`,
`synthetic-{preupdate,preupdate-iam,postupdate}-c46a705.log`, and the corresponding
private preparation/execution/verification scripts. All handles are terminal.
Google policy consent/new scoped grant, policy publication, exact agreement review,
live Gmail journeys and production rollout remain outstanding.


Verified 8 November 2026. The separate AWS stack `rosewood-offer-test-20261108`
exists in account `274319535046`, region `ap-southeast-2`, and is `UPDATE_COMPLETE`.
**This is not the production release or a successful email/signing integration test.**

## Reviewed deployment

- Runtime artifact: clean commit `3fb2453`; locked build and all 275 acceptance
  regression tests passed after the unrelated reporting/alarm repairs were separated.
- Initial CREATE change set: 28 isolated additions, no production update or replacement.
  The artifact was uploaded to the existing private deployment bucket under a distinct
  synthetic prefix. The test runtime has no permission to read that deployment bucket.
- Configuration correction: clean commit `e793e7f`, explicitly using this stack's own
  KMS key for Lambda environment encryption. The reviewed UPDATE changed that property
  and reevaluated three dependent Lambda/EventBridge/SNS references. It changed no
  database, audit table, storage bucket, key, runtime policy or application code.
- The generated packaged template passes cfn-lint. Six focused isolation tests pass,
  including a new regression tying environment encryption to the allowed test key.

The first live request returned HTTP 502. A direct test Lambda invocation identified
`KMSAccessDeniedException`: its default AWS-managed environment key was correctly
blocked by the role's outside-key denial. The correction retains that denial and uses
the already permitted test key. The corrected deployed endpoint has been exercised;
this is not a fix inferred only from unit tests. See
[AWS environment encryption guidance](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html).

## Actual deployed checks

| Check | Observed result |
| --- | --- |
| Resource identity | 28 test resources, distinct from production; SES destination identity includes its configuration-set parent |
| Function/code | Active, update successful, concurrency 2; deployed code checksum matches the reviewed uploaded artifact |
| Runtime role | Exact resolved policy/trust match; one expected inline policy; no extra attached policy or permissions boundary |
| IAM simulations | 18 cases pass against the deployed principal and actual resource ARNs, including wrong/mixed email recipients, outside resources, audit rewrites and production metrics |
| Environment encryption | Uses this test stack's own key; outside-key denial remains in place |
| Runtime state | Readiness false, email disabled, offers disabled, approved hash blank, Google destinations unconfigured |
| Scheduled work | Test outbox rule disabled; no production canary or email-notification subscription |
| SES feedback | Separate configuration set and encrypted SNS topic; seven feedback event types; sole subscriber is the test Lambda |
| Test alarms | Four alarms, all notification-action lists empty |
| Data/storage | Separate encrypted records/audit tables with PITR; staging public access blocked |
| Live health request | GET `/v6/health` returns 503 with `SYNTHETIC_RUNTIME_NOT_AVAILABLE` and `no-store` |
| Live OTP attempt | POST `/v6/staff/access/request-code` for the fictional test staff returns the same 503 |
| Record integrity | Both synthetic tables empty before and after those requests; no family records accessed |
| Delivery | Zero actual test emails; no family email or production write test |

IAM simulation is evidence about the actual role's policy, not proof of active SES,
Drive or signing behaviour. Those integration tests remain outstanding. The initial
test secret still contains a provisioning marker; it has not received production
credentials, a principal signature, test OAuth credentials or new HMAC secrets.

## Remaining activation work

The specific Google test-app policy acceptance is still pending. Complete that and
the separately required new access grant, then create app-file-only test storage and
reporting destinations. Verify scope and denial of production IDs before configuration.
Provision only test secrets and the authorised private principal signature; recheck
all boundaries before enabling synthetic traffic. Actual delivery remains restricted
to the single user-approved inbox, using fictional logical guardian/staff identities.

The application still needs actual Gmail/attachment/feedback/recovery journeys,
controlled policy download/address review, exact agreement review and production
deployment with issuance off, followed by live hash/canary/rollback verification.

Private evidence is in `offer-terms-review-20261108`: the CREATE/UPDATE reviewed change
sets, packaged templates, `synthetic-deployed-iam.log`,
`synthetic-inactive-stack-verification-private.json`, the read-only verification script
and `release-scope-{tests,build}.log`. Do not copy credentials, file IDs or raw test
message evidence into this repository. All deployment/verification processes finished.
