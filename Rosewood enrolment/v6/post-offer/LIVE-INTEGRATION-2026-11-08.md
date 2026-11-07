# Isolated live acceptance test — 8 November 2026

Production is unchanged and real offer issuance remains off. This evidence is from
`rosewood-offer-test-20261108`, runtime `4b9b223`, using fictional Applications and
logical `.test` guardians. The sole actual email destination is the user's authorised
personal inbox. Its real Application was never used, copied, linked or modified.

## Google and AWS boundary

The user approved and completed the dedicated test app's account grant. The actual
refresh token has exactly `drive.file`. Metadata-only requests to all five production
Google destinations were denied. Two app-owned private folders and three app-owned
private Sheets were created, each labelled with the test project. Secrets and IDs
remain outside Git. Production Google credentials were not reused.

The reviewed test activation preserved all 28 resource IDs, the restricted runtime
role and all 18 deployed-role IAM cases. Test readiness, exact-inbox transport and
synthetic contract approval were enabled. Scheduled outbox remained disabled; explicit
workflow actions dispatch their own work. Slack and alarm notification destinations
are absent. The active Lambda artifact, health, parameters and recipient boundary
were checked before seeding two completed fictional Application fixtures.

## Actual staff and guardian journey

1. Staff received and used an actual OTP, selected both fictional siblings, reviewed
   the email and personalised principal letter, and issued one family offer.
2. The primary guardian received that email and attachment, verified a separate OTP,
   and corrected Avery's middle name to Test. Existing signing emails remained locked.
   The original Application remained byte-for-byte unchanged.
3. Both children were signed separately. No secondary invitation existed after only
   the first child was signed. One secondary invitation covering both children was
   delivered after the primary signed the second child.
4. The secondary guardian used their own OTP and saw a read-only three-step review,
   including Avery's corrected name. Each child completed only after that guardian
   signed. No document upload was requested.
5. Staff tracking showed both children at 2/2 signatures, delivered invitation status,
   verified portal access and individual child opens. Both offers ended
   `signed_conditional`, displayed as accepted with commencement conditions pending.
6. Refresh restored the verified family session. Logout and another refresh returned
   to secure access. The policy reader returned without losing the agreement checkbox.

## Expected and actual email ledger

| Message purpose | Expected | SES delivered |
| --- | ---: | ---: |
| Staff verification | 1 | 1 |
| Guardian verification | 2 | 2 |
| Primary offer and secondary signing request | 2 | 2 |
| Individual signature receipt | 4 | 4 |
| Child completion acknowledgements, one copy per guardian | 4 | 4 |
| Total | 13 | 13 |

Gmail showed the primary offer, secondary request, OTPs and completion acknowledgements.
Both actual Gmail attachments were downloaded: the principal letter equals the staff
review and Drive letter; the Avery signed PDF equals the portal download and Drive
record. Both signed records are 49 pages, including the full terms/policies, correct
names, entry details, dates and both electronic signatures. Their first-page signature
layout was visually inspected; the source-policy and PDF layout suites cover the body.
The two signed PDFs have distinct checksums. Private artifacts and screenshots are
retained outside Git; no access link, OTP, signature or provider identifier is published.

## Actual denial and recovery checks

A separate short-lived test fixture session exercised the deployed API after the UI
journey. Unauthenticated context, invalid OTP, unrelated child and expired/logged-out
sessions were rejected. Unknown invitation requests returned a generic response and
sent no email. Retrying a completed signature returned the existing evidence, with no
new signature, notification or changed Application/offer.

A deliberately invalid synthetic Sheets projection was retained after one real worker
failure. Correcting only that test event's destination allowed the real worker to
complete it. A second invocation had no remaining work. All original Application,
offer and signature rows were unchanged; the email count stayed 13. The worker never
replayed an invitation or completion message. The isolated queue was empty afterward.

## Corrections identified by live tests

- Offer OTP HTML incorrectly reused Application wording. A dedicated offer OTP template
  now names the provisional offer in both formats; existing Application OTP is unchanged.
  The deployed-route regression passes and all 283 backend tests pass.
- The signed-out header still displayed a static verified-access label. Its initial and
  unverified states now say “Email verification required”; the verified family view
  says “Verified guardian access”. Unpublished asset pins are updated. No access-control
  defect occurred: the actual session was revoked and protected routes rejected it.

The fixes require the final isolated code update and browser/email recheck before
production deployment. Recovery-table validation, final release reconciliation,
production deployment with issuance off, published-asset verification and scheduled
monitoring remain separate release steps. This report does not claim those are done.
