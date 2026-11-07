# Offer acceptance: completion, testing and deployment proposal

## Latest monitoring gap correction

The existing offer canary checked page markers but did not fetch the fourteen pinned
policy downloads or original Student Code map. The candidate now fetches these public
assets with GET only and verifies bounded byte lengths, SHA-256 and file signatures.
Tests cover missing files, same-size corruption of PDF/DOCX/map, and oversized content.
All 282 backend tests, frozen-lockfile install/build, static references and public-data
checks pass. The first build attempt had a local pnpm PATH error; correcting PATH
produced the successful bundle without source changes.
This extends `PublicFormAvailability` when offer monitoring is enabled. With issuance
still off during initial production rollout, offer-specific checks stay gated; verify
published assets manually against their pinned hashes before any later activation.
The five existing checks, their alarm routing and non-writing behavior remain intact.


## Bridge Road publication copies — user decision applied

The user instructed “Use 456 Bridge Road, Cobblebank” on 8 November 2026. Seven
publication DOCX copies and PDFs now use that address, retaining the existing state/
postcode layout. Six cover pages change; ICT's header changes on its twelve pages.
The controlled originals remain private and unchanged. Only that approved address
and the previously verified cached contents-page numbers may differ; the new
`policy_publication.py` verifier rejects other package/XML changes.

All75 rendered pages are checked against the reviewed preceding copies. Only18 address
regions differ (each under70 pixels high); the other57 pages are pixel-identical.
Extracted text differs only by the street address. All18 changed regions were visually
inspected; all140 heading/outline and122 contents-link checks pass with zero stale
numbers. The original Student Code map is retained unchanged, including its previously
noted source label limitations; no map redraw or substantive policy change is implied.

The local candidate now contains14 immutable publication assets (5,111,907 bytes) and
pins their paths/hashes/byte counts in each policy's sourceDownloads. Original source
hashes remain in sourceSha256; publicationSha256 pins the address-corrected DOCX.
The mapper and download build verify this provenance; online body text is aligned.
These are publication copies, not replacements for controlled originals. No remote
website or AWS runtime was updated in this checkpoint.

281 backend tests and the locked build pass. Desktop/mobile download checks verify
all14 hashes and7 actual Word downloads at1440/390/320; both-guardian mocked journeys
pass with unchanged fictional Applications. Static references and content projections
pass. Private evidence uses bridge-road-* under the existing restricted review root.
The Google policy consent and credential-creation approvals have now been received;
those old blockers are resolved. Actual scoped account consent, live provider tests,
exact agreement review and production rollout remain.


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


## Policy download controls and private staging — latest

The local reader now supports PDF and Word links pinned to the exact policy source,
file checksum, byte count and immutable local filename. PDF opens separately so the
acceptance remains open; Word uses a download link. Missing metadata remains supported
for earlier snapshots. A partially specified or mismatched pair is rejected. The
release build verifies referenced files, checksum, size and PDF/ZIP signatures before
packaging; Word/PDF copies are public-site assets, not Lambda payloads.

`scripts/prepare-offer-policy-downloads.py` stages a new private review package only.
It rechecks all seven controlled originals against the contract/catalogue, verifies
contents-only Word changes, rechecks the rendered contents destinations/numbers and
requires an exact match to the final review report. It writes 14 checksum-named files
and a `download-review-manifest.json` with `publicationApproved: false`. It never
edits the agreement, publishes files or overwrites a package. Changed evidence,
existing-output and repository-output rejection checks pass.

All 14 reviewed copies are staged privately. **The current contract still has no
download metadata, and no PDF/Word copy is published.** Address/map publication
review remains outstanding. After that review, bind the approved manifest as each
policy's `sourceDownloads`, publish its exact immutable files, regenerate contract
projections, review the changed agreement hash and verify the live URLs. Retain files
referenced by earlier offers. The private contents-only staging tool intentionally
rejects other Word changes; any later address revision needs fresh source verification.

280 backend tests, the locked deployment build, generated-content check and static
reference checks pass. Production and the inactive AWS test artifact are unchanged.
No email or real Application record was touched.

Browser verification uses the private staged copies through a localhost-only server.
At 1440/390/320 widths all fourteen fetched hashes and seven actual Word downloads
match, PDF opens a separate tab, and returning preserves checkbox/focus. The policy
heading remains below the toolbar; no horizontal overflow or external request occurs.
Desktop/mobile screenshots were inspected. Chrome's headless PDF viewer does not emit
a normal document-loaded event; the test verifies separate-tab opening and exact PDF
response bytes, not viewer internals. The earlier intercepted-download fixture cancelled
Word downloads; retesting over real localhost HTTP resolves that fixture limitation.
The complete mocked primary/additional-guardian acceptance journeys also pass at all
three widths, including exact signed-record download and unchanged fictional Application.

Private evidence: `policy-download-review/`, `policy-download-browser-evidence.json`,
`policy-download-{all-tests,build,browser,connected-browser}.log`. No review document is
in Git. The 14-file staging package is not approved for publication or bound to an offer.


Prepared 8 November 2026. Status: IMPLEMENTATION IN PROGRESS; not deployed. The user requested a
comprehensive plan and explicitly prohibited testing from emailing current families or
damaging their records. Gmail access is authorised for reviewing test email. That does
not authorise sending offers to real families. No deployment, test message or family
record change was performed while preparing this plan.

## Execution checkpoint — 8 November 2026

### All original policy pages reviewed — latest

All 75 original policy pages have now been visually checked. Read
[policy source evidence](POLICY-SOURCE-VERIFICATION-2026-11-08.md).
Review identified 28 stale contents-page numbers across five conversions.
Separate private review copies correct only those cached fields; rerender/recheck
proves all 122 contents links and page numbers agree, all 140 outline headings are
accounted for, and the other 70 page images are pixel-identical. All five changed
contents pages were visually inspected. Controlled originals remain unchanged.

No policy copy is published: the address decision and source map's cramped labels
remain open. Download packaging/links, Google consent/scoped setup, live Gmail tests,
exact agreement review and production rollout remain incomplete. This checkpoint
does not change the AWS test deployment, application code or family records.

### Policy appendix image — latest local correction

The Student Code's source map was omitted by text-only extraction. The local reader,
contract and signed PDF now include the exact checksum-pinned source image; the
deployment builder packages it and PDF generation rejects missing/altered bytes.
All 278 tests, locked build and 1440/390/320 connected synthetic journeys pass.
Read [policy source evidence](POLICY-SOURCE-VERIFICATION-2026-11-08.md) for exact
checks, full-size map review and remaining source defects. Original-policy visual
QA is now 36/75 pages complete. No publication address decision has been received.

This correction has not been uploaded to the inactive AWS stack or production.
Google consent and scoped storage, live Gmail testing, source publication review,
exact agreement review, deployment and monitoring remain open. No real email sent.

### Inactive AWS test deployment — latest

The separate test stack is now deployed and verified inactive. Read
[actual deployment evidence](../backend/INACTIVE-TEST-DEPLOYMENT-2026-11-08.md).
Runtime code is clean commit `3fb2453`; the environment-key correction is `e793e7f`.
All 28 resources are separate, the deployed role passes 18 policy simulations, and
the artifact checksum matches. A real HTTP 502 startup defect was diagnosed through
direct Lambda invocation and corrected by using the test key for environment encryption.
The strict outside-key denial was preserved. The stack is `UPDATE_COMPLETE`.

Live health and fictional staff-OTP requests now return the intended unready 503;
both synthetic tables remained empty. Email, offers and scheduled delivery remain
disabled. No actual email, family record access or production update occurred.
Google consent/scoped storage, active integration tests, policy download/address
review, exact agreement review and production release remain outstanding.

### Release scope and download metadata — current

See [current release scope](RELEASE-SCOPE-2026-11-08.md). The reporting/SNS repairs
are now preserved separately in local commit `e399d01`, outside the acceptance
candidate. Canonical newsletter commit `9a613aa` is incorporated without overlap.
All 275 remaining backend tests pass (the two reporting tests are on the other branch).
The production template now contains only the offer switches and the independently
verified unsupported-IAM-action cleanup; it adds no production resources.

Metadata review found no embedded files or external links in the controlled downloads.
Visual/header inspection corrected an earlier finding: ICT also has Alfred Road in
its header, so **all seven originals** need the address resolved before publication.
ICT pages 1, 2 and 12 are additionally visually inspected. Full 75-page QA remains
pending; no source wording, current-family record or production resource was changed.

The older checkpoint sections below are historical evidence, not current completion
claims. Google consent, live isolated tests, policy downloads and production deployment
remain open; this separation does not reduce the objective.

### Controlled policy originals and structure — latest

The current Google Drive originals for all seven policies are now verified as exact
byte matches to the private catalogue; cached policy text matches too. This resolves
the earlier filesystem-read timeout. See `POLICY-SOURCE-VERIFICATION-2026-11-08.md`.
The local reader now uses source-derived compact structure for all 140 numbered
headings, nested lists and document registers in source order. The source text is
unchanged; exact source checksums/provenance are frozen into the local contract.
All seven original PDF conversions exist privately (75 pages), but complete visual
review and download publication are still pending. Six originals retain Alfred Road;
no address was silently rewritten. The Google test-app consent request remains pending.

Additional infrastructure validation found two ineffective `dynamodb:TransactWriteItems`
IAM entries; these were removed from the candidate production/test templates. AWS
authorises transactions through the underlying item actions already present. Audit
permissions remain append/query only. The regenerated template passes cfn-lint with
no warnings; IAM simulation now passes 18 cases, including audit rewrite/deletion
denial and transaction condition checks. No AWS stack change or email was performed.

Final verification for this checkpoint: 277/277 backend tests, locked build,
generated-content check and static/public-data checks pass. Browser journeys pass
1440/390/320px with all source text/headings, both signatures and exact signed-PDF
download equality. Mobile document-register caption wrapping was caught visually,
fixed and retested. No actual email was sent; Google consent, isolated live tests,
download/address review and production deployment remain pending.

### Isolated integration preparation

The separate test template and runtime credential/resource guards are implemented;
see `backend/SYNTHETIC-TEST-ENVIRONMENT.md`. CloudFormation validates the generated
template and 14 AWS IAM custom-policy simulation cases pass. They verify the sole
test inbox is allowed, other/mixed/missing recipients are denied, outside-resource
access is denied and production metric publishing is unavailable. No AWS stack,
test role or test message has yet been created. Deployed-role verification remains
required. The final regression suite is now 275 tests; the locked build and existing
static/public-data checks pass.

The Google project `rosewood-offer-test-20261108` was created separately. App branding
is prepared but the final Google User Data Policy acceptance is awaiting the specific
browser-required confirmation. No new Google credential/grant or Drive/Sheet has been
created. Production Google credentials are broad and will not be copied. The planned
new OAuth app uses `drive.file` only; the synthetic runtime rejects missing/broad
returned scopes before any Google file access, pins its client ID, and rejects secret
overrides of resources, email policy, staff roles or Slack settings. Test monitoring
is separate and the production canary cannot run from this environment.

Next: complete Google setup/consent, create isolated AWS resources from a clean
reviewed snapshot, provision private signature and synthetic-only secrets, and run
the authorised Gmail integration matrix. Existing family records remain untouched.

### Shared family portal checkpoint

Implemented locally, not deployed:

- The Application and offer entries now share one child-card renderer and computed
  overview. It distinguishes Application progress/review/signatures from ready offers,
  offer signatures and completed provisional acceptance. Expired and withdrawn offers
  remain unavailable and are labelled explicitly.
- The server joins only explicit invitation/Application/offer/account/task relationships.
  It does not discover siblings by email or surname. Primary parents may open their
  Applications and offers; additional guardians see only released, contact-permitted
  signing requests. Later-issued siblings appear when that guardian's request is active.
- Cross-page navigation creates a narrowly scoped session tied to the original verified
  session, inherits its absolute expiry and rechecks current authority. A one-time,
  same-tab handoff carries opaque session metadata, never tokens in navigation URLs.
  Derived Application editing/status scopes retain the same revocation anchor. The
  browser also retains the inherited absolute expiry rather than starting another eight
  hours on each child selection.
- Sign out invalidates linked portal access; Save and continue later closes only the
  child editing scope. Application-to-offer navigation retires editing/status scopes
  left in the tab, including legacy scopes. This does not claim account-wide revocation
  of unrelated sessions on other devices.
- Nine focused backend scenarios cover mixed stages, foreign/blended families, staged
  secondary requests, later offers, contact/email corrections, original record integrity,
  expiry, revocation, logout, editing-session inheritance and deadlines. All 267 backend
  tests pass on Node22.23.4 and the locked deployment build passes. Latest final-run
  logs are in the private review directory.
- Browser exercises at 1440/390/320px cover both navigation directions, Application
  status, a 2028 draft and refresh, overview stages and sign-out. The separate connected
  journey still covers policy-return state, both guardian signatures and an exact stored
  PDF download. Synthetic Applications remain unchanged; external requests are blocked.
- Shared asset `pages/rosewood-family-portal.js` is pinned only in the unpublished
  EOI .29 / Application .30 candidate (30 frontend assets). Earlier contracts are intact.
  See `backend/FAMILY-PORTAL.md` for routes, entry strategy and session boundaries.

Still pending: controlled policy originals/address reconciliation and download assets;
exact draft agreement approval; isolated AWS/IAM/Google resources and private signature
configuration; actual approved-Gmail integration tests; bounded clean release,
deployment with issuance off, and production read-only monitoring/rollback evidence.
No actual email, AWS/Google production write or deployment occurred in this checkpoint.

### Policy source verification checkpoint

All seven `agreement-draft.json` policy texts match the private VRQA map's July
extracted text exactly, including whitespace after trimming outer whitespace. Sources
map to C.2.2.iif, C.4.4.iih, C.4.2.iib, C.4.1.iiw, C.4.4.iia, C.4.4.iic and
C.4.1.iva respectively. The controlled package originals were located in Google
Drive's `VRQA Submission/RC_Submission_Evidence`, but the first attempted byte read
failed with filesystem timeout (errno 60). This establishes cached-text fidelity only,
not current original-file verification. No source or policy wording was changed.

Six policies retain `108-134 Alfred Road`; ICT has no such address. Keep current-source
verification and address reconciliation open before publication. Do not silently replace
the address, treat the July catalogue hashes as fresh checks, or publish unverified
download links. Continue independent portal/isolation work while source access is resolved.

### Personalised principal letter checkpoint — latest

Implemented locally, still not deployed:

- The backend generator now reproduces the reviewed navy/clay Rosewood letterhead,
  emblem, serif title, student/year-level/year table and principal signature. It uses
  the latest agreed provisional-registration notice. One/two-child samples fit one page;
  eight deliberately long child/guardian names wrap safely to three pages. Singular,
  plural, accented names and page numbering are handled by the generator.
- The authorised signature crop stays outside Git/public assets/Lambda packages. The
  restricted application secret supplies `OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64` and
  `OFFER_PRINCIPAL_SIGNATURE_SHA256`. Missing or invalid configuration fails closed.
  Tests use fictional signature fixtures. The real crop is used only for private visual
  evidence so far; its private test/production secret provisioning is still pending.
- Both staff surfaces now expose explicit meeting/gathering choices. The letter does
  not claim a meeting unless confirmed; the January gathering paragraph is optional and
  cannot be restored after its date by backdating the letter. This avoids stale claims
  from the supplied source template. Staff review includes the exact PDF checksum.
- Changed names, selection, wording, date or principal signature invalidate a reviewed
  issue. Issue stores the matching bytes; delivery/resend reads that protected copy.
  Both named PDF attachment types are bounded at 2 MB. The principal letter is about
  1.65 MB with the original high-resolution emblem; no runtime image/font download.
- Fixed a previously missed integrated-staff mismatch: the embedded offer panel had
  retained `$10,000 per child` text and lacked `bond-amount`. It now matches the reviewed
  $10,000/$20,000 family-bond choices and the standalone panel. A regression check covers
  required controls on both surfaces.
- Verification: all 258 backend tests pass on Node22.23.4; locked deployment build,
  static/public-data gates and `git diff --check` pass. The actual integrated staff portal
  passes at 1440/390/320px with synthetic providers, including reviewed options, the
  $20,000 family bond, two selected children, exact downloaded-to-stored PDF match, one
  queued invitation and unchanged Applications. No external browser requests or real email.
- Private evidence: `check-personalised-letter.mjs`,
  `check-personalised-letter-render.py`, `personalised-letter-pdf-evidence.json`,
  `check-staff-offer-letter.mjs`, `staff-letter-browser-evidence.json` under the existing
  private review directory. Visual/text checks cover all one/two-child and long-family
  pages, exact signature-crop dimensions, text completeness and margins. A byte/base64
  scan found no principal signature payload in tracked files or the deployment bundle.

Remaining: controlled policy originals/source verification (including cached address),
combined Application/offer overview, private signature configuration in isolated AWS
test resources, isolated Google/IAM destinations, approved-Gmail delivery/error tests,
and final release/deployment/monitoring/rollback. See `backend/PRIVATE-LETTER-ASSETS.md`.
No AWS/Google production write, actual email or deployment occurred in this checkpoint.

### Signed acceptance PDF checkpoint — latest

Implemented locally, still not deployed:

- Each signature now produces a bounded PDF from the frozen offer, complete fourteen
  sections, seven policy snapshots and exact signature images. Partial copies clearly
  show outstanding signatures. The final copy states completed provisional acceptance.
  Private guardian contact fields, access tokens, IPs and storage identifiers are excluded.
- Signature PNGs are decoded and dimension-bounded before storage. Stored images and
  records have SHA-256 checksums. Reads verify private Drive folder, offer, signer,
  signature/revision, packet, MIME, size and checksum before returning bytes.
- The record and signature are staged before the conditional signing transaction. Its
  immutable snapshot binds the PDF reference; failures clean staged artifacts, while
  post-commit worker failures preserve committed evidence. Original Applications are
  unchanged. Completion outbox items reference the exact stored final PDF and dispatch
  rechecks recipient contact/access and record ownership. No attachment is regenerated
  from mutable live text at delivery time.
- Downloads now return the stored PDF, with a browser checksum check. The obsolete HTML
  record renderer is removed. SES accepts only the two named reviewed PDF types, with
  separate size limits and no expanded recipient list.
- Offer content hashing now sorts object keys recursively, retaining array order, so a
  DynamoDB map round trip cannot invalidate the agreement. This affects only the
  unpublished offer candidate. Compute its approval value with
  `offerContentHash(OFFER_CONTRACT)` from `offer-content-hash.mjs`; old raw JSON hashes
  are not the candidate approval value. Issuance remains disabled until approved.
- Noto Sans Regular/Bold are bundled with their licence, supporting accented Latin,
  Greek and Cyrillic names. Unsupported characters fail explicitly instead of disappearing.
  This font change applies to acceptance PDFs; principal-letter redesign remains pending.
- Verification: all 252 backend tests pass on Node 22.23.4; the frozen-lockfile deployment
  build succeeds on Node22. Browser primary/secondary signing and exact PDF download pass
  at 1440/390/320px with fake providers and zero external requests. Local static/public
  gates pass. The synthetic PDF is also extracted and rendered for completeness, privacy,
  margin and signature-image checks. Private evidence and repeatable scripts are under
  `offer-terms-review-20261108` (`check-signed-record-pdf.mjs`,
  `check-signed-record-render.py`, `signed-record-pdf-evidence.json`).

Remaining: principal-letter design/private principal signature deployment; controlled
policy originals and source verification (including the cached historical address);
combined Application/offer family overview; isolated AWS/IAM/Google resources; actual
approved-Gmail delivery/error tests; final release, deployment, monitoring and rollback.
No actual email, deployment or production family write has occurred in this checkpoint.

### Connected form and policy-reader checkpoint

Implemented in the local candidate (still not deployed):

- The live candidate now uses the reviewed Student → Parent/Guardian → Conditions →
  Signature layout. Existing signing emails are locked. Primary corrections save to
  offer-specific revisions, never to the source Application. The original issued
  packet remains retained; changed details produce a new packet hash before signing.
- Added guardians have distinct identities and become required signers. Their requests
  wait for primary acceptance and their own email verification. Saving details sends
  no email. An existing required guardian cannot be removed or have their email changed
  through this form. Contact restrictions block signing/requests, not the responsibility
  to sign. Existing authorised Application relationships are preserved.
- Detail saves condition-check the unsigned offer, source Application, active primary
  task and family revision in one transaction, retaining an immutable detail revision.
  Stale changes and any changes after a signature are rejected.
- The second guardian reviews submitted details read-only, then terms and signature.
  The rejected family correction-request route and UI are removed; email assistance
  remains. Unshared contact details are omitted from another guardian's projection.
- Seven frozen policy snapshots now render using the existing policy-reader visual
  system, with headings, paragraphs, lists, tables, contents and top/bottom return.
  Browser Back and return retain the checked agreement and form position. Policy
  originals/download links remain pending controlled-source verification; no links
  were invented. The historical address in the cached sources still needs review.
- Connected browser exercise passed at 1440/390/320px against the real service code
  with in-memory stores/fake providers: primary detail correction, all seven complete
  policy texts, return/Back, primary signature, refresh recovery, secondary read-only
  review/signature, final completion, logout clearing, unchanged Application, no external
  network requests. Visual inspection caught/fixed mobile policy toolbar overlap.
- Evidence: private `offer-terms-review-20261108/connected-acceptance-evidence.json` and
  `check-acceptance-connected.mjs`. Reusable synthetic harness is now in
  `backend/tests/helpers/offer-harness.mjs`.
- Final checks for this checkpoint: all 242 backend tests pass on Node24; locked
  deployment build passes; 108 HTML/CSS files have resolving local references; public
  data checks pass over 561 tracked files; `git diff --check` is clean. The new layout
  and policy-reader assets are pinned only in the unpublished candidate definitions.

Still pending: current policy originals and full structured source verification;
reviewed principal-letter PDF/private signature asset; signed completion PDF attachment;
combined Application/offer family overview; isolated AWS/IAM/Google destinations;
actual approved-Gmail delivery and error exercises; Node22 and final release/deployment,
monitoring/rollback verification. A passing local journey does not prove those items.

The user authorised test delivery to the exact personal mailbox `frjativa@gmail.com`
and Gmail review. That mailbox is also associated with a real child's Application:
never use, link, update or copy that Application for testing. The active goal is
"complete the acceptance of provisional offer". Technical implementation and isolated
testing are authorised; real-family offer issuance is not.

- Implemented locally: immutable test delivery configuration; fictional `.test` identity
  allowlist; validation at the service's atomic outbox-write boundary, direct OTP send,
  queued dispatch and SES transport; fixed approved inbox routing; conspicuous test
  subject/body; test Reply-To also routes to the approved inbox. Configuration secrets
  cannot override these runtime safety controls.
- Verified locally: all 235 backend tests pass on bundled Node 24, including eight new
  delivery-policy tests, six content/email tests and two bond/evidence failure tests.
  These are fake-provider tests, not proof of IAM isolation or
  actual email delivery. Node 22 and the isolated AWS/Gmail exercise remain pending.
- No deployment, real email send or production record change has occurred.
- Content alignment now implemented locally: `agreement-draft.json` is the single source
  for fourteen sections, seven cached policies and the latest provisional notice. Its
  generator produces backend and browser copies; exact hash approval remains required.
  This resolves the older nine-section mismatch, not the pending policy-source check.
- Initial/secondary/receipt/completion email templates now carry authorised child lists
  and the provisional notice. Completion copy claims an attachment only when one exists;
  signed PDF generation/attachment is still pending.
- Staff/backend support the published $2,000 / $10,000 / $20,000 family bond amounts,
  with credit bounded by the selected amount. Removed incorrect per-child bond wording.
- Fixed a post-commit cleanup defect: a worker error after a successful signature write
  cannot delete committed signature evidence. A retry returns the existing signature.
- The reviewed non-saving primary prototype passes 1440/390/320px browser checks,
  fourteen sections, editable names/mobile, locked existing emails, no uploads, no
  external requests, no persistent form data and no horizontal overflow. The live
  candidate is not yet this complete reviewed flow.
- Local locked build succeeds on Node 24; static references and tracked public-data
  checks pass. Production Node 22, new final asset checks and AWS isolation are pending.
- All subsequent phases below remain incomplete until separately evidenced. Existing
  draft legal/policy departures are not approved merely by authorising implementation.

## Non-negotiable testing boundary

1. All write-path tests run against isolated synthetic data, never existing family records.
2. Local tests use fake providers. Real email tests use a separate test stack and exact
   allowlisted addresses belonging to the user's Gmail account, verified before use.
3. The test stack has separate tables, audit/outbox, storage, secrets, Drive folders,
   reporting destinations, schedules and delivery feedback. Do not copy production
   family data, pending outbox items, invitations, documents or signed records into it.
4. A restricted test runtime role cannot access production DynamoDB/S3/KMS/Secrets
   resources. Google credentials can access test destinations only. Slack is disabled
   or replaced with a test sink. No production reporting projections are written.
5. Enforce recipient restrictions at both queue creation and actual SES dispatch, plus
   a recipient condition in the test IAM role. Empty or malformed allowlists fail closed.
   Check every destination; no To/Cc/Bcc expansion, forwarding, bulk resend or real-family
   fallback. Test messages have a conspicuous subject/body marker and fictional data.
6. Before every end-to-end run, assert account, region, test stack ARN, table/bucket/folder
   identifiers, role and recipient configuration. Abort on any production identifier.
7. Production deployment does not issue offers. New offer issuance stays disabled;
   existing outbox work is not replayed, cleared or used for tests. Leave normal current
   application operations intact; this task must cause no family communications.
8. Production verification uses health/static/metadata and non-writing canary checks.
   No production OTP, invitation, signing, submission or synthetic family write tests.
9. Never create a public signature asset, export real family records into the repo, log
   OTPs/tokens, or alter a frozen Application, its documents or its existing signatures.

## Baseline evidence and gaps before implementation

The execution checkpoints above supersede this historical starting-state list.

- Production observed healthy on EOI .28 / Application .29. AWS CLI was refreshed and
  expected account 274319535046 and ap-southeast-2 stack UPDATE_COMPLETE verified.
  Credentials and deployment state must be rechecked at execution time.
- GitHub Pages publishes main/root; existing authenticated publishing accounts have
  push access. The local candidate remains uncommitted/unpublished.
- Reviewed primary-parent prototype contains the current fourteen-section draft,
  provisional notice, locked existing emails, edited student/guardian names/mobile,
  add-guardian UI, agreement checkbox and duplicate Continue buttons.
- Earlier backend contract still has nine sections and wrong $10,000-per-child wording.
  It is not interchangeable with the prototype. Some old docs still call this complete.
- Existing Application second-signing page is verified as email OTP, read-only review,
  declarations/signature and status. The offer equivalent still needs alignment.
- Earlier offer candidate has a correction-request workflow rejected by the user.
- Earlier candidate has basic family-grouped issue, staged guardian requests and
  completion email, but not the latest email copy or signed completion PDF attachment.
- SES adapter currently accepts only one small attachment named Rosewood-offer.pdf;
  completed acceptance PDFs need a separately validated attachment type and size budget.
- Reviewed letter design with supplied principal signature is a separate local PDF
  preview. Production generator does not yet reproduce it and uses limited standard fonts.
- Existing Application has a formatted policy reader; acceptance currently expands
  plain text. Cached policies require controlled-source verification.
- Application drafts and issued offers are not yet combined into a single family overview.
- Existing test results predate these changes. Re-run after final implementation; do not
  use the historical 219-test result as evidence for the new release.

## Phase 1: reconcile the release specification

Deliver one current decision/implementation matrix and a bounded release diff.

- Keep confirmed user wording and list remaining proposed contractual choices separately.
  Freeze the exact fourteen-section text only after its final review; do not silently
  promote every assistant-authored clause into approved school policy.
- Latest preferred opening paragraph for final preview:
  "Rosewood College is preparing to welcome its first students in 2027, subject to
  registration approval from the Victorian Registration and Qualifications Authority
  (VRQA). We will provide written confirmation of the commencement date and final
  enrolment arrangements once these are confirmed."
  This supersedes earlier wording in the notes. Do not restore the rejected opening-date
  guarantee sentence. Singular/plural variants must preserve meaning.
- Preserve corrected published tuition/levy/sibling/bond rules. $20,000 is the maximum
  family bond; $10,000 per child is incorrect. Removing fee rows from the overview does
  not remove the fee clauses from the agreement.
- Identify actual unresolved choices: offer/commencement-condition deadlines, refund
  processing/deductions, proposed pre-commencement payment protection, extra-activity
  rules and other draft departures documented in FOURTEEN-SECTION-REVIEW-NOTES.md.
  The published fee amounts and discount order are not unresolved.
- Confirm source/version for each policy and Anne-Marie letter. Check meeting/gathering
  wording for issue eligibility rather than asserting every family attended a meeting.
- Separate unrelated reporting/SNS repairs already present in the candidate. Exclude
  them from this release unless needed and independently reviewed/tested; no surprise
  migration or infrastructure repair bundled into the acceptance feature.
- Consolidate overlapping historical notes with a current-status index. Keep history
  labelled as superseded rather than treating older completion claims as current evidence.

Exit evidence: current scope/wording map, source-version inventory, enumerated changed
assets/routes/resources and explicit remaining decisions. This phase changes no family data.

## Phase 2: policy-reader improvement and both parent journeys

### Policy readers

Reuse the existing Application policy-reader component and visual system: headings,
paragraphs/lists/tables, contents links, desktop navigation/mobile selector, original PDF
and Word links where controlled originals exist, and Return to offer acceptance at top
and bottom. Preserve form values, selected child, checked agreement and scroll/focus
position on return; reading does not submit, sign or constitute acceptance. Browser Back,
refresh and session expiry must have truthful recovery behaviour.

Map the seven currently listed policies to their exact controlled versions: Parent Code
of Conduct, Student Code of Conduct, Child Safety Code of Conduct, ICT Acceptable Use,
Student Behaviour Management, Suspension and Expulsion, Complaints and Grievances.
Verify all substantive text, numbered clauses, tables and appendices. No headings-only
rendering, plain-text truncation, invented PDF links or silent update of signed versions.
Bind the policy snapshots/version hashes to the offer. Completed records display the
version accepted, even if a public policy is later updated. Review stale/missing sources
before enabling signature rather than substituting placeholders.

### Primary parent

Keep the reviewed Student -> Parent/Guardian -> Conditions -> Signature flow and no
upload step. Keep provisional wording, offer summary without fee rows, agreement checkbox
above terms, top and bottom Continue buttons and clear registration notice. Live final
button is Sign and submit. Existing signing emails remain locked.

Store allowed detail corrections in an offer-specific revision, preserving the signed
Application. Validate added guardians and their authority/contact permission. Removing a
panel must not silently waive a required signature; reconcile the authorised signer set.
Changing accepted details must invalidate stale pending signatures/review hashes, never
rewrite signed evidence. Freeze the exact offer packet when primary signing commits.

### Second guardian

Use the existing Application pattern: own verified email/access -> read-only review of
child/offer/details and the same terms/policies -> agree and sign -> receipt/status.
No editable duplicate form or Request a correction feature. Show email assistance for
errors. Remove/disable rejected correction routes/actions from the new offer experience
and adjust their tests; retain appropriate internal staff protections for issued records.
Acceptance becomes complete only after all required signatures, remaining provisional.

### Shared family overview

Implement the discussed combined overview as a distinct integration item: application in
progress, submitted/under review, offer ready to accept, awaiting signatures, acceptance
complete. Keep one parent entry experience with child-specific records and actions.

Reuse explicit application/family associations and guardian permissions. Do not infer a
family from surname or email. The second guardian sees only authorised children/actions
and cannot edit application drafts. Test blended families and later-issued sibling offers.
Choose and document one durable portal entry/deep-link strategy; a common portal URL
must not weaken OTP, session revocation or individual guardian identity. Separate access
lifetime from an actual offer acceptance deadline. Do not promise non-expiring offer links
or auto-renewed deadlines without an explicit decision. This overview is not live today.

Exit evidence: synthetic primary/secondary desktop/mobile previews; policy-return and
permission tests; clear specification of what is frozen, editable and final.

## Phase 3: integrate offers, staff review, emails and PDFs

### Backend and staff

- One approved content source generates backend contract, frontend projection and PDF
  content. Advance contract/form versions and asset hashes; preserve every old definition.
- Staff select explicit sibling Applications and see child, entry year/level, recipients,
  signature requirements, contact restrictions, exact email and exact attached letter.
  Any source/recipient/content change invalidates the staff preview before issue.
- Offer issue creates offer/family records, immutable content, audit and outbox atomically.
  No bulk backfill of offers to current families; no new send on page load or deployment.
- Existing application, invitation, draft, signature and document records stay intact.
- Staff statuses distinguish preparation, queued, SES handoff, delivery, verified portal
  access, each signature and complete acceptance. Inbox delivery is not proof of reading.
- Backend enforces roles and permissions, idempotency, stale revision checks, consent,
  OTP attempts/cooldowns, session idle/absolute expiry, logout and revocation.

### Email sequence

1. One initial congratulations email to the primary recipient listing only selected
   offered children, with Anne-Marie’s matching personalised PDF and one portal link.
2. Primary signature receipt distinguishes individual signature from completed acceptance.
3. Secondary guardian gets one grouped request after the primary has signed all children
   included in that guardian’s invitation (current candidate sequence). UI/email wording
   must explain this consistently; no duplicate request on retry. Other guardians’ child
   sets may differ and must not expose unauthorised siblings.
4. When all required signatures for a child are recorded, send private confirmation to
   each eligible guardian, with that child’s completed signed acceptance PDF. Recheck
   permissions at queue and send time. No recipient sharing through To/Cc.
5. A later sibling offer creates a notification for that offer only, not a resend of
   already-issued offers. Completed signed records remain accessible to authorised users.

Use the latest provisional wording, singular/plural handling and email-help route. No
real family messages during testing, staging, deployment or feature commissioning.

### Letter and signed record

- Reproduce the reviewed Rosewood letterhead/table/spacing and supplied principal
  signature. Embed fonts supporting accented/long names; wrap and paginate safely.
- Keep signature asset in private storage/deployment assets, never public website/Git.
  Verify the document contains only the authorised signature crop, not source PDF content.
- Preview and store exact issued letter bytes/hash; use those bytes in the attachment.
- Build completed acceptance PDF from frozen offer, details, exact terms/policies and
  both/all signatures with recorded dates. Include enough accepted content to be a
  self-contained record; do not point only to mutable live policy pages.
- Separate letter attachment validation from signed-record attachment validation. Validate
  filename, MIME, PDF magic, size, ownership and checksum. Large/failed attachments must
  produce a visible failure, not a false success or partial completion email.
- Store assets privately; authorised download checks every request and contact/access
  restrictions. No raw tokens, network addresses or storage identifiers in family PDFs.
- Handle artifact creation failures and database conflicts without orphaned files or
  missing signed evidence. Never erase committed evidence during cleanup.

Exit evidence: final staff/family previews, exact email snapshots, letter PDF and complete
signed PDF using synthetic family data; all routes covered by relevant tests.

## Phase 4: automated and browser test matrix

Run locked dependency install, the entire backend suite and deployment build on production
Node 22. Run syntax, immutable-version/hash, local-link and public-data/secret checks.
Tests must verify behaviour and failure boundaries, not merely repeat implementation.

| Area | Required scenarios and expected result |
|---|---|
| Send protection | Allowlist empty/malformed; non-allowlisted synthetic address; stale queued payload; header/recipient injection: rejected before SES. IAM independently restricts recipients. |
| Environment isolation | Production ARN/table/bucket/folder accidentally supplied; wrong account/region/role: harness aborts before writes. Test role access to production is denied. |
| Single child | Primary issue/verification/review/sign; secondary invitation/verification/sign; exactly one completed child record and intended notification set. |
| Multiple children | One primary email/letter covers correct selection; partial primary signing does not send secondary invitation early; separate completion/signature records per child. |
| Family scope | Unrelated matching-name/email families; different guardians per sibling; forged child ID; second guardian opening another child: no access/disclosure. |
| Authority | Single authorised guardian; extra required guardian; contact restricted/revoked; added/removed guardian: no bypass of required signatures or contact restriction. |
| Editing | Correct names/mobile, Unicode and long names; locked emails; source Application unchanged; stale page/review rejected after relevant revision. |
| Policy reader | Every section/table/appendix present; accessible contents; return/back/refresh; agreement and inputs retained; no signing by reading; missing source fails visibly. |
| Signatures | Required agreement/declaration, empty/malformed/oversized signature, wrong signer, simultaneous signatures and repeated Submit: valid evidence only, no double completion. |
| OTP/session | Wrong email, wrong/expired/replayed code, throttling, multiple siblings, old replaced link, idle/absolute expiry, refresh/logout: scoped access and truthful recovery. |
| PDF quality | One/many children, long/accented names, singular/plural, date/year accuracy, page breaks, signature placement, exact content and no preview markers in issued artifacts. |
| Signed record | Original accepted version survives later policy changes; signatures/dates correct; another family cannot retrieve it; no source-private data or tokens leak. |
| Retries/failures | Drive/S3/SES/Sheets timeouts, DB conflict, worker retry, queued contact withdrawal, rendering failure: no corruption or unbounded replay; visible recoverable status. |
| Email semantics | Initial vs receipt vs secondary vs completion clearly distinct; correct recipients and attachments; provisional condition preserved. |
| Delivery feedback | Send/delivery/delay/bounce/complaint/reject/rendering failure events and out-of-order/duplicate feedback: truthful state and alerts, no resend triggered by feedback. |
| Accessibility | Keyboard, screen-reader labels, focus/error announcements, zoom, contrast, checkbox hit targets, no mandatory scroll trick, print/PDF readability. |
| Responsive | 1440px desktop, 390px mobile and 320px narrow layout; sticky header, policy return, signature canvas, buttons and long content without clipping. |
| Regression | Existing EOI, Application drafts/autosave/uploads, invitations/OTP, secondary signatures, staff roles, family communications, meetings and cohort planning continue to pass. |

Exactly-once business transitions are tested with conditional writes/idempotency. SES
acceptance followed by a lost response can be ambiguous; do not claim distributed email
is mathematically exactly-once. Persist/reconcile attempt evidence and surface ambiguous
sends for review instead of blindly resending or recreating the business action.

## Phase 5: isolated AWS and Gmail end-to-end exercise

Provision a dedicated non-production stack using narrowly scoped permissions, deployment
parameters and test provider identities. Do not deploy the unmodified production template
with its production secrets/Drive/Sheets/Slack references or enabled shared-worker wiring.
Verify protective IAM/environment controls first, then seed explicitly synthetic families.

Use distinct fictional `.test` identities for parent 1, parent 2 and staff. Configure the
test-only SES transport to deliver to the exact authorised `frjativa@gmail.com` inbox.
The logical identities remain separate throughout OTP/session/signature processing;
the destination rewrite happens only at final delivery. Do not use Gmail aliases that
have not been authorised, and never turn the personal Gmail address into a test
Application identity. Family names are unmistakably Synthetic/Test; no real child data
or real invitation links are used. The test IAM recipient condition must allow only
that exact inbox independently of application code.

Run the complete staff issue -> primary -> secondary -> completion journey. In Gmail,
review only matching test-prefixed messages and record:
- fictional intended guardian identity, actual authorised destination, sender and Reply-To;
- readable subject/body on available desktop/mobile layouts;
- branding, singular/plural wording and provisional condition;
- private link resolves to test environment and correct authorised children;
- OTP receipt, use of newest code, timing and cross-child behaviour;
- actual letter attachment and final signed PDF download/open/content;
- expected message count and absence of premature/duplicate notifications;
- delivered feedback versus actual inbox/spam placement.

Use mocked events or the dedicated SES test/simulator boundary for error feedback, never
bounce a real family address or send to a third party. Search test outbox/SES evidence to
prove every test destination is allowlisted. Leave Gmail messages available for user review;
do not send replies, forward messages or delete unrelated mail.

Exercise backup/recovery with synthetic test data only. No restoration over production,
no production export for fixtures and no bulk report/outbox replay. Record failure evidence
privately without OTPs/access URLs. Document fixes, then rerun affected tests plus final suite.

Exit evidence: signed test PDFs, rendered letter/email screenshots, expected-vs-actual
notification ledger, SES feedback, isolated-record integrity and regression report.

## Phase 6: release preparation and controlled deployment

1. Prepare a clean release commit/worktree and reconcile against current main. Include
   only reviewed scope. Record previous frontend/backend versions and rollback artifacts.
2. Recheck AWS account/region/role, stack health, backup/PITR/deletion protections, alarms,
   resource names and new-feature disabled state. Verify no test credentials/links or
   sample details enter production. Prepare recovery, not a production data rewrite.
3. Build reproducibly and prepare a CloudFormation change set. Inspect every resource,
   IAM permission, schedule and configuration change. Stop on any unexpected replacement
   of tables/KMS/Drive configuration or destructive migration. No replacement of records.
4. Backend-first additive deployment, offer issue disabled. Keep existing routes and
   historical contracts compatible. No schema rewrite of submitted applications.
5. Publish the pinned frontend and policy assets through GitHub Pages. Verify actual live
   hashes, routing and policy documents; ensure all referenced assets exist before clients
   depend on them. Coordinate canary contract/asset checks during staged publication to
   avoid a false healthy or false failure result. Keep new navigation gated until ready.
6. Production checks are non-writing: health, deployed versions, protected-route rejection,
   public assets, Lambda state, stack status, schedules, alarms and bounded outbox metadata.
   Do not invoke email-request or sign endpoints with production identities.
7. Confirm that deployment has queued zero new offers or family notifications. Existing
   normal traffic can occur during the window; distinguish it by workflow and attributable
   audit IDs rather than expecting all production counts/timestamps to remain unchanged.
8. Deliver the release evidence and the exact feature state. Test-only mode/issue-disabled
   state remains until readiness review. Enabling staff offer issue does not select or send
   any family offer. Actual family selection/preview/send is a separate explicit staff action.

If a production write-path test is later considered necessary, it is a separate proposal:
this plan deliberately relies on isolated end-to-end writes and read-only production checks.

## Phase 7: monitoring and rollback

Extend existing monitoring to new routes, versioned policy assets, offer outbox age,
attachment generation/dispatch failures and signing failures without logging child answers
or signature contents. Preserve current 10-minute non-writing canary, one-minute worker,
SES feedback and existing alarms. Check a healthy observation after release and again
through at least two scheduled canary intervals (20 minutes), plus queue/delivery health.

If offer defects appear, disable new offer issuance using its narrow gate/approved-content
control while preserving viewing/downloading existing signed records. Roll back compatible
frontend/backend artifacts; do not restore an old database over newly signed records.
After any real signatures exist, preserve newer schemas/contracts/evidence and prefer a
compatible forward fix if an older binary cannot read them. Never delete signatures,
replay old offer queues or disable existing family services as a shortcut.

## Completion criteria and user review package

The feature is ready only when:
- current approved content is consistent across reader, backend, email and PDFs;
- primary and secondary journeys match confirmed decisions;
- family overview scope and guardian access are implemented and verified;
- policy readers preserve state and show the complete accepted versions;
- test-only sending cannot target current families;
- isolated end-to-end tests and current Node 22 full regression/build pass;
- production verification is healthy and caused no family email or record mutations;
- rollback and operational ownership are documented;
- remaining policy/fee/letter choices are resolved rather than invented.

Provide a concise evidence pack: changed scope/versions, known limits, screenshots of
both journeys/policy readers, actual test emails and PDFs, test results, deployment change
set/commit, monitoring and rollback references. Update design notes, implementation map,
release blockers, recovery/testing docs and skill continuity so future work follows the
same confirmed decisions. Keep all credentials, signatures and family artifacts private.
