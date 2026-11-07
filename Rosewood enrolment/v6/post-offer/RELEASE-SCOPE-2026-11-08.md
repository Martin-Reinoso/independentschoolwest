# Provisional-offer release scope

Current scope checkpoint, 8 November 2026. The implementation is unpublished to
production; the separate inactive test stack is deployed and verified. Production
offers remain disabled. See [test deployment evidence](../backend/INACTIVE-TEST-DEPLOYMENT-2026-11-08.md).
The completion plan retains the full objective,
including actual isolated Google/AWS/email tests, policy downloads and deployment.

## Included

| Boundary | Candidate change |
| --- | --- |
| Offer workflow | Separate offer/family/account/task/revision/signature records; explicit completed-Application selection; per-child acceptance; no Application rewrite |
| Family portal | Shared child overview and scoped navigation between Application and offer stages; verified guardian authority and inherited session expiry |
| Primary and additional guardians | Editable permitted primary details, locked existing emails, added guardians, staged separate signing and completion only after all required signatures |
| Policies and agreement | Frozen fourteen-section draft, seven exact policy texts, source checksums and source-derived reader structure; completed records retain their accepted snapshot |
| Letters and receipts | Personalised principal PDF, private configured signature, reviewed family email, separate guardian requests/receipts and exact stored signed PDFs |
| Staff interface | Existing staff portal integration, preview/review/issue, child and signature state, delivery evidence and recovery controls |
| Release contracts | Unpublished EOI .29 / Application .30 and offer asset pins; preceding definitions unchanged |
| Production configuration | Two offer parameters/environment values, default disabled/hash blank; remove two unsupported IAM action names while retaining the supported item permissions |
| Isolated testing | Separate generated CloudFormation template, resources, role and restricted Google app; sole approved test transport destination and fictional logical identities |

The production template adds no resource, table, bucket, key, subscription or schedule.
The new synthetic template is deployed only as a distinct test stack. No production
data migration or report replay is part of this release. Private principal-signature
bytes, credentials, controlled Word/PDF originals and test exports stay outside Git.

## Explicitly separated

The request-reporting repair and security-topic KMS repair are preserved in local
branch `codex/rosewood-operations-repairs-20261108`, commit `e399d01`. They were removed
from this candidate by reversing only their retained patch, after saving the complete
original candidate diff privately. Their two focused tests pass. Their independent
review, isolated-provider tests and production reconciliation/delivery evidence remain
pending. Do not infer that those existing operational defects are fixed by acceptance.

The acceptance branch was fast-forwarded to canonical `9a613aa`; its sole intervening
change was `emails/email11-v8.html`, with no overlap. The newsletter is inherited
upstream content, not an acceptance change.

## Evidence and remaining gates

After separation, all 275 remaining backend tests pass on Node 22.23.4. The previous
277 total included the two now-separate reporting tests. No frontend or frozen policy
wording changed during separation, so the earlier desktop/mobile, both-signature and
exact stored-PDF browser evidence still applies to those assets.

All seven current controlled originals match their catalogue bytes. Metadata review
found school/exporter names, an empty bibliography element and internal PDF contents
links; no embedded files or external relationships. **All seven originals have the
old Alfred Road address**: six in the body/cover, ICT in its header. This corrects the
earlier body-only conclusion about ICT. The source files have not been altered.

Remaining: finish original-download visual QA and resolve the source address; review
the exact draft agreement; complete the pending Google test-app consent/access setup;
configure the verified isolated resources; run real approved-Gmail delivery and recovery
tests; deploy backend/frontend with family issuance off; verify production health,
canary cycles, live hashes and rollback evidence. A local commit or passing mocked
browser journey is not evidence that those deployment/integration gates are complete.
