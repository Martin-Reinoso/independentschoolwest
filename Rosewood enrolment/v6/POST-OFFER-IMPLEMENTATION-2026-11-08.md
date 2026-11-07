# Conditional enrolment offer implementation

## Current checkpoint

Runtime `c46a705` is deployed to the separate **inactive** test stack. The candidate
passes 280 backend tests and mocked desktop/mobile guardian journeys. Its complete
policy bodies and map are verified; PDF/Word download controls are implemented but
publication assets are not yet bound to the contract. Production is unchanged and no
actual test email has been sent. Google consent/scoped setup blocks live provider
journeys. See [current release gates](post-offer/CURRENT-RELEASE-GATES-2026-11-08.md)
and the linked completion/deployment evidence for authoritative status.

The integration entries below are chronological history. Their “latest”, test counts,
“not deployed” and outstanding-feature statements apply to those earlier checkpoints.


**Latest shared-portal integration:** both verified entries now show Applications and
issued provisional offers together, using explicit invitation associations and current
guardian permissions. Scoped browser navigation preserves source-session expiry and
revocation. Secondary guardians cannot open drafts; later-issued siblings appear only
after their signing requests are released. See [shared portal](backend/FAMILY-PORTAL.md)
and the current completion-plan checkpoint. The candidate is still not deployed; policy
originals, isolated external tests, approved-inbox delivery and release gates remain open.

**Latest principal-letter integration:** the backend now renders the reviewed branded
letter and selected child table with the supplied principal signature from restricted
configuration. Staff can explicitly confirm meeting/gathering wording; stale gathering
copy is blocked. Exact reviewed PDF bytes are stored and delivered unchanged. Both staff
surfaces have matching family-bond and letter controls. All 258 tests and the locked
build pass on Node22; integrated staff browser tests pass at 1440/390/320px. Real signature
configuration, controlled policy originals, combined overview and isolated external tests
remain pending. No deployment or actual email send. See `backend/PRIVATE-LETTER-ASSETS.md`.

**Latest PDF integration:** recorded signatures now produce immutable partial/final
acceptance PDFs; completion emails and authorised downloads use the exact stored copy.
Drive ownership/checksum checks, pre-commit cleanup, dispatch-time contact rechecks and
browser checksum verification are tested. Offer hashes use canonical object-key ordering
for DynamoDB round trips. All 252 tests and the locked build pass on Node22; desktop/mobile
synthetic downloads match stored bytes. Principal-letter design/private signature,
policy-source verification, combined overview and isolated external tests remain pending.
Not deployed; no actual email sent. See the completion-plan checkpoint for evidence.

**Latest local integration:** the reviewed primary form, offer-only detail revisions,
added required guardians, read-only secondary form and seven formatted frozen policy
readers are now connected and browser-tested at desktop/mobile sizes with synthetic
providers. Original Applications remain unchanged. The family correction-request route
is removed. See the current completion-plan checkpoint for exact evidence and remaining
PDF, source-verification, combined-portal and external-release work. Not deployed.

**Current execution status:** [completion, test and deployment plan](post-offer/COMPLETION-TEST-AND-DEPLOYMENT-PLAN-2026-11-08.md). Implementation is in progress. This supersedes older completeness and nine-section claims below. Local changes include email test restrictions, a single fourteen-section content source, revised email copy, published family bond amounts and protection for committed signature artifacts. No deployment or actual email send has occurred. The user's exact personal Gmail is authorised for synthetic test delivery only; their daughter's real Application must remain untouched. IAM isolation and real email tests are not yet implemented/verified. Production verification remains read-only.

## Latest registration wording — supersedes the earlier guarantee sentence

The user rejected “Accepting these offers does not guarantee that the school will open
on the proposed date.” Remove that sentence from the current letter/form notice and
do not include it in future offer emails. Their preferred replacement is:

> We will provide written confirmation of the commencement date and final enrolment
> arrangements once they are established.

Keep the provisional status and requirement for VRQA registration. The letter PDF preview
and form introduction now use this wording. For the initial email, use:

> Please note that these offers are provisional. Rosewood College must receive
> registration approval from the Victorian Registration and Qualifications Authority
> (VRQA) before students can commence. We will provide written confirmation of the
> commencement date and final enrolment arrangements once they are established.

This supersedes earlier notes approving the “does not guarantee” sentence. No deployment
or email send occurred; the backend email templates still need the agreed wording.

## AWS CLI refreshed — 8 November 2026

At the user’s explicit request, refreshed the existing default AWS CLI login through
the active Chrome AWS session. STS verified account 274319535046 (existing root console
identity); read-only CloudFormation describe-stacks verified rosewood-enrolment-v6-production
in ap-southeast-2 is UPDATE_COMPLETE. This supersedes the earlier expired-CLI finding.
No credentials/auth codes are recorded here. No stack, application, data or email changes
were made. Refreshing access does not resolve the implementation/release gaps above.

## Live access and release-readiness check — 8 November 2026

At the user’s request to check whether the server can be updated:
- Public /v6/health returned ok: EOI .28, Application .29, request/community .1. This
  confirms reachability/version only, not an end-to-end email/signature test.
- Chrome showed an authenticated AWS console for the expected account 274319535046.
- Default AWS CLI session is expired; STS requests require renewed login before CLI deployment.
- GitHub Pages serves main/root. The currently active CLI account has read access only,
  but existing authenticated frjativa and fjativag accounts both report repository push
  permission. No global account switch or permission change was made.
- Candidate remains uncommitted/unpublished. Backend offer-contract.mjs still contains
  the earlier nine-section contract and incorrect $10,000-per-child bond wording, whereas
  the reviewed frontend uses the new fourteen-section draft and corrected fee rules.
- Reviewed editable primary-guardian flow, second-guardian read-only flow and current
  email/PDF requirements are not fully integrated. Combined application/offer overview
  remains a proposed additional integration.

Conclusion: AWS console and GitHub publishing access are available, but this candidate
is not ready to replace the live flow. Reconcile implementation/content, refresh CLI
access, run release checks and inspect the deployment change set before release. No
production mutation, family email, OTP or signature was triggered in this check.

## Latest review checkpoint

See post-offer/OPTION-1-DESIGN-REVIEW.md for the latest user-approved provisional email
paragraph and proposed multi-child congratulations email. The initial email attaches
Anne-Marie’s letter; completion after all required signatures must attach a signed PDF.
The unified application/offer family portal was discussed as the recommended experience
and is not implemented; the current candidate offers an offer-only grouped portal.
Second-guardian read-only review/signing without a correction-request workflow is the
confirmed direction. Latest wording/PDF/portal changes are not deployed or fully integrated
into this backend candidate. Current AWS authentication has not been verified here.

## Completion email after all required signatures

User requirement: send an acceptance acknowledgement after both parents/all required
guardians have signed, following the supplied Harkaway email example. The example
acknowledges the child’s place/year, says this stage is complete, attaches the signed form
and invites the family to email if anything is incorrect. Do not reproduce the example’s
real family identities, school logo or staff signature in Rosewood artifacts.

Delivery/design requirements:
- Trigger only when all required signatures for that child’s offer are recorded.
- Send a private personalised copy to each authorised, contact-permitted guardian; do
  not share recipient email addresses through To/Cc. Recheck permissions at dispatch.
- Use the accepted offer’s child name, entry year and year level; do not hard-code 2027.
- Rosewood branding and enrolments-team signature. Subject excludes child identity.
- Attach a PDF copy of the completed acceptance form: agreed details, provisional offer,
  exact accepted terms/policies and all required signature evidence. Generate from the
  frozen accepted record, not current mutable website text. Keep source/attachment private;
  exclude internal IDs, network addresses, access tokens and provider/storage identifiers.
- Acknowledge completed acceptance, not unconditional enrolment or permission to commence.
- Families email the College about errors; no new correction-request portal feature.
- Completion notice/attachment creation and delivery must be retry-safe, with recorded
  delivery status and no repeat business send for an already-completed transition.

Draft wording for review:

Subject: Rosewood College — provisional offer acceptance confirmed

Dear [Parent’s name],

Thank you for accepting Rosewood College’s provisional offer of enrolment for [Child’s
full name] in [Year level], [Entry year].

All required parent/guardian signatures have now been received, and this stage of the
enrolment process is complete. Attached is a copy of your signed acceptance form. Please
keep it for your records and let us know if anything is incorrect.

The offer remains subject to VRQA registration and written confirmation of commencement.

If you have any questions, please contact enrolment@ffe.org.au.

Kind regards,
Enrolments Team
Rosewood College

Implementation status: the earlier unpublished backend candidate already queues a basic
completion email, but that message refers families back to the portal and has no signed
PDF attachment. Its downloadable agreement record is HTML. The acknowledgement wording,
PDF generation/attachment, dispatch-permission review and tests remain to be implemented
before release. This note changes no backend behaviour and sends no email.

## Confirmed direction — second-guardian offer signing

The user explicitly confirmed following the existing Application for Enrolment
second-guardian pattern when building offer acceptance. This is a confirmed design
direction, not merely an assistant recommendation.

- Use the existing signing identity and invited email, with OTP verification.
- Present the provisional offer and submitted details for read-only review.
- Agree and sign without repeating the first parent’s editable form or guardian setup.
- Do not add editable second-guardian details or an in-portal Request a correction flow.
  Families can email enrolment@ffe.org.au about errors before signing.
- Record the individual signature; complete acceptance only after all required signatures.
- Retain the clear provisional registration/commencement condition.
- Existing Application links are per child; grouped child selection belongs to the
  separate proposed offer design, not a claim about current Application behaviour.

The second-guardian offer preview is not yet built. The older backend candidate contains
correction-request functionality and must be reconciled with this direction before
integration/release. No existing Application behaviour or backend was changed by this note.

## Published fee schedule verified — 8 November 2026

The live fee page, linked two-page PDF and calculator HTML were retrieved and byte-matched
to repository copies. Sources: https://ffe.org.au/pages/rosewood-fee-schedule.html and
https://ffe.org.au/Files/Fees/Rosewood-College-2027-Fee-Schedule.pdf.

- 2027 Prep–Grade 5: $6,990 tuition less $1,000 foundation-year reduction for every
  student, plus $910 resource levy = $6,900 before further tuition reductions.
- Siblings: 0%, 15%, 30%, 45%, 100% for fifth/subsequent children; levy remains payable.
- Option A: $2,000 once per family, no tuition discount, returned when the last child leaves.
- Option B: $10,000 gives the first child 5% tuition reduction; $20,000 total gives all
  siblings 5%. The family maximum is $20,000 regardless of child count. First $10,000
  returned when first child leaves; second $10,000 when last child leaves.
  Earlier candidate wording “$10,000 per child” is incorrect and superseded.
- Tuition each term and full levy in Term 1, due within 14 days. Annual payment at the
  start of Term 1 gives another 5% tuition reduction. Website/calculator apply foundation
  reduction first, then sibling, bond and annual reductions, rounding each percentage stage.
- Levy includes camps, excursions, books, stationery and IT; uniforms are separate.
  Draft optional-activity charges must not duplicate these levy inclusions.

Only the non-saving fourteen-section review prototype was aligned. Backend candidate,
shared nine-section contract, approval hashes and production remain unchanged and need
alignment before enablement. The preview displays published rates, not a calculated
personal family quote. Family bond/payment choices and existing credits still need to be
recorded. The acceptance deadline, refund processing period and deduction rules are not
specified by these sources. Proposed clause 2 postponing payment until commencement is
confirmed remains a review choice: the published bond wording says when first enrolled/
first year, and does not itself establish this postponement.


Status: local candidate, not deployed; no family email sent. Prepared 8 November 2026.
Branch `codex/rosewood-offer-agreement-20261108`, based on `4c91733`.

The [context and alignment assessment](CONTEXT-AND-ALIGNMENT-2026-11-08.md)
was followed by the user's “ok let's do it” instruction. The integrated implementation
below supersedes its initial candidate gaps. Development is verified locally; production
issuance and approval of the agreement content remain separate.

## Integrated implementation checkpoint

- **Staff:** Enrolment offers is now a workspace in the existing V6 staff portal,
  using its current session, roles, navigation and styling. Family communications
  shows linked offer history. The standalone staff page remains a secondary entry.
- **Family:** existing V5/V6 typography, colours, emblem, layout and child cards;
  per-child confirmation, nine concise terms sections, full policy readers and independent
  signatures. There is no acceptance upload step.
- **Sequence:** issue queues only the primary family's email and attached letter. Each
  additional guardian receives one request after the primary has accepted all children
  included in that guardian's request. Signing transactions also condition-check the
  family revision, preventing concurrent signatures from duplicating those invitations.
- **Completion:** personal receipts remain separate from an all-signatures-recorded
  message to each authorised guardian for that child. The final state remains
  `signed_conditional`; no payment or commencement confirmation is triggered.
- **Corrections:** an unsigned guardian can request review, pausing further signatures
  on that child. Admissions/admin can record a resolution without changing the packet.
  Material changes require a replacement agreement; signed-contract variations are not
  automated. This control never edits the original Application.
- **Records:** verified signers can download a self-contained printable HTML copy of
  the frozen terms, policies, schedule, declarations and all recorded signature names,
  times and hashes. It is an agreement copy, not a PDF containing signature images;
  original image evidence remains in restricted Drive. No private access/storage URLs
  or internal file identifiers are included.
- **Sessions:** opaque sessionStorage recovery, backend revalidation, 90-minute idle
  expiry with a five-minute warning, eight-hour absolute limit and explicit logout.
  No application answers or signature drawings are cached in browser storage.
- **Release contracts:** local EOI `.29` / Application `.30` pin family JS38, staff JS19
  and the offer assets. All 57 existing definitions retain their hashes and their question
  contracts. Production last observed on EOI `.28` / Application `.29`.
- **Operations:** the missing ApplicationLinkRequests reporting header/tab and a targeted
  upsert-only recovery mode are implemented. The security-alert topic now proposes a
  retained customer-managed KMS key permitting scoped CloudWatch and Backup publication.
  Neither repair has been applied to production. See RECOVERY-RUNBOOK.md.

## User decisions

- Full terms in the online form, with independent digital guardian signatures.
- No Word deliverable and no document-upload step in acceptance.
- One reviewed congratulatory email per family, with a personalised PDF of the supplied provisional-offer letter and a private portal link. Staff trigger and track delivery/access/signatures; parents choose each child and accept separately. Additional required guardians receive their own verified signing requests.
- Keep the main terms succinct: the revised candidate has nine sections (about 960 words), with complete policies in expandable readers.
- Retain both refundable bond options: $2,000 per family and $10,000 per child with a tuition discount.
- Draft one full term's withdrawal notice with hardship exceptions and legal review.
- The supplied provisional offer makes opening subject to VRQA decisions and registration requirements.
- The user challenged two separate signing stages as less official and unnecessarily burdensome. The proposed replacement is one formal conditional agreement, followed by commencement confirmation without another signature unless material terms change.
- Payment after commencement conditions, a conditions deadline, refund timing and ending without withdrawal charges if conditions fail are proposed safeguards. They are not represented as adopted policy.

## Source authority

The supplied Harkaway Hills/PARED offer contains 14 substantive sections repeated for
two guardians, and a $500/$300 acceptance-fee discrepancy. No completed family PDF,
family identity, signature, private link or IP address was copied into the repository.

The Rosewood agreement, Fee Policy/Schedule and seven policy texts were read from the
28 July extraction of the individual final submission sources. Current Google Drive
hydration failed on 8 November (BadZipFile). The originals and their current approval
metadata must be verified before issue. Source submission files were not changed.
Cached policy bodies are included for review and exact-version binding, not as newly
approved publication. The policies contain historical site details requiring review.

The latest supplied Rosewood provisional offer has FINAL in its filename but DRAFT in
its body. It supplies the 2027 opening/registration qualification; it is not evidence
that the adapted full terms have been approved. The attached-letter template replaces the September-specific meeting reference with “Thank you for meeting with us”, personalises the date, parent names, child names and year levels, and directs acceptance to the portal. It retains the conditional-opening wording, January 17 gathering and principal name/title as text; it does not copy a handwritten signature. The attachment drops the source’s DRAFT marker only in the reviewed issue template; previewing it is not evidence of approval. Staff must verify the meeting and gathering statements for the selected family. These are correspondence, not additional contractual conditions.

Official references checked: current VRQA guidelines landing page, ACCC contracts
guidance, Disability Standards for Education, Victorian Electronic Transactions Act.
The April 2026 VRQA consultation draft was not treated as an adopted standard.

- https://www2.vrqa.vic.gov.au/guidelines-and-standards-for-schools
- https://www.accc.gov.au/consumers/buying-products-and-services/contracts
- https://www.education.gov.au/download/851/disability-standards-education-2005-plus-guidance-notes/16957/document/pdf
- https://www.legislation.vic.gov.au/in-force/acts/electronic-transactions-victoria-act-2000

## Clause reconciliation

**Later fidelity audit:** the high-level table below is not proof of full Harkaway
coverage. The user challenged the nine-section rewrite; the [53-entry clause comparison](post-offer/HARKAWAY-CLAUSE-CROSSWALK-2026-11-08.md) identifies omitted, partial and materially changed terms across all fourteen source sections.
Use that comparison before redrafting or claiming complete coverage.

| Area | Candidate treatment | Remaining review |
|---|---|---|
| Parties | Families for Education Ltd operates Rosewood; independent guardians | Authority and single-signer arrangements |
| Conditional agreement | One signature process; separate signed-conditional state | Conditions deadline and legal structure |
| Education | Catholic formation, curriculum, mentoring and care | Actual opening scope |
| Student needs | Consultation and reasonable adjustments; no diagnosis-only cancellation | Disability/discrimination consistency |
| Fees | Disclosed year-specific schedule; hardship process | Current amounts and fee version |
| Bond | Both options, existing credit, no duplicate family bond | Discount interaction, refund trigger/timing |
| Conduct | Existing age-appropriate codes and reasonable alternatives for parent attendance | Current policy versions |
| Medical authority | Reasonable urgent assistance; no blanket negligence indemnity | Legal and medical consent review |
| Policies | Online readers; no signed uploads | Current controlled originals |
| Termination | Notice, response, reasons, child welfare, complaints | Approved procedures |
| Withdrawal | Full-term notice, hardship, lawful explained calculation | Fees in lieu and before-start treatment |
| Changes | Express agreement for material changes | Variation mechanism |
| Signatures | Email OTP, intent, exact packet, server time | Final declarations and approval evidence |

## Candidate application

Family: `pages/rosewood-enrolment-offer-v1.html`.
Staff: `pages/rosewood-enrolment-admin-v6.html` → Enrolment offers.
Secondary entry: `pages/rosewood-enrolment-offers-admin-v1.html`.
Append `?review=1` to the family page for a network-free synthetic walkthrough.

Staff sign in with existing role-controlled OTP. Admissions/admin choose a family and
one to eight submitted children linked to the same canonical invitation. Matching names
or emails alone never establish a family link. The primary application recipient must
be contact-permitted on every selected child; distinct guardians cannot share a signing
email. The first-opening template rejects non-2027 offers.

Staff enter the actual fee schedule, dates/periods and agreed bond choice, then preview
every recipient copy, the exact downloadable PDF and all child agreements. The exact
review hash binds child/application/contact revisions, terms, schedule, letter bytes,
letter date and email wording. Only an explicit reviewed action queues delivery.
One primary email contains the letter covering the selected children. Each additional
required guardian receives one separate signing request after primary acceptance of their authorised children,
without the all-family attachment. No To/Cc sharing or duplicate per-child invitations.
The standard $2,000 bond remains a single family obligation, not a charge per signature.
Viewer access is read-only.

Family: private invitation → invited-email OTP → authorised child selector → child’s
short terms, fee schedule and policy readers → review/conditions/terms/electronic-consent
acknowledgements → drawn or typed signature → return to children. There are no document
uploads or payment capture. Each required guardian signs independently for each child.
The backend derives the allowed child and guardian from verified access. A sibling is
not disclosed to a guardian who lacks permission for that child. Completed records can
be reopened with fresh OTP and printed/saved from the browser.

Staff tracking distinguishes current queued/failed outbox work, SES handoff, actual SES
delivery/delay/failure, OTP-verified portal access, child opened and each signature.
Delivered means mail-server acceptance, not inbox placement or proof the email was read.
There is no tracking pixel. Receipt/OTP emails cannot overwrite invitation delivery.
Missing correlation makes SES feedback retry; late send feedback cannot downgrade
an already delivered or failed result. Old delivery/access evidence remains on revoked
tasks and in audit when staff rotate a recipient link; the list shows the current link.

Optional photo, marketing and previous-school permissions are not silently inferred.
They remain separate future onboarding work, not a prerequisite to this acceptance.

## Storage and integrity

- `OFFER_FAMILY#id/META`: canonical invitation, selected child offer IDs, recipient accounts, reviewed letter content/hash/Drive reference, issue evidence and operational revision.
- `OFFER#id/META`: frozen packet reference, operational status/revision and signers.
- `OFFER#id/ISSUED`: immutable packet, policies and issue evidence.
- `OFFER#id/SIGNATURE#signerId`: independent immutable signature evidence.
- `OFFER_APPLICATION#applicationId/META`: unique current offer association.
- `OFFER_TASK#tokenHash/META`: high-entropy family-recipient access with only its authorised child/guardian mappings, delivery state and verified access times.
- Existing challenge/session, audit and transactional outbox use the distinct `enrolment_offer` scope.
- Restricted Drive receives separately tagged family-letter PDF, offer snapshots and signature PNGs. Failed authoritative transactions clean up new artifacts.

Family issue atomically condition-checks every selected submitted application and writes all child offers, snapshots, associations, recipient tasks, audit and outbox work. Signing condition-checks the active recipient task, offer revision and current source contact-control revision, records evidence and queues a private receipt for that signer.

The PDF is generated with pinned pdf-lib, stored in restricted Drive and referenced by hash in the outbox. Delivery checks the family/primary-recipient reference and revalidates Drive parent, app properties, MIME, size, magic bytes and SHA-256 before passing raw PDF bytes to SESv2. Both direct and staged Drive adapters support the separate offer artifacts. PDF bytes are not stored in the outbox. The current standard-font renderer supports Latin/Windows-1252 characters; unsupported names fail preview explicitly rather than being changed. A broader embedded font is required before issuing for a name outside that repertoire.
Final status is `signed_conditional`, never `enrolled`. Original Application records,
answers, signatures and versions are not written. No new table, Sheet projection,
public Drive sharing or Slack notification is introduced.

Contact permission is checked at issue, OTP, child listing/selection, signing and outbox send. A family attachment is suppressed if any selected child no longer permits that recipient; it is never silently shortened after review. No-contact
never waives a required signature. Unsupported guardian arrangements require staff
resolution before issue. Pending links expire at the disclosed acceptance deadline;
signed guardians can reverify and read their record afterwards. Resend rotates one recipient’s family task if they still have an available unsigned child offer, invalidating earlier task/code/session access for every child under that link. An
unsigned offer may be withdrawn and replaced while retaining historical evidence.
Signed agreements cannot be withdrawn through that control.

## Release requirements

`EnrolmentOffersEnabled` defaults false; `EnrolmentOfferApprovedHash` defaults empty.
Issue requires both enablement and SHA-256 approval of the exact contract object.
The local offer manifest pins six new assets and three reused stylesheets. New EOI `.29`
and Application `.30` definitions pin the integrated staff/family release while preserving
all historical hashes. No AWS/GitHub deployment occurred.

Before issue:

1. Verify current policy originals and update the cached source snapshots if needed.
2. Review and approve the conditional agreement, particularly payment/refund treatment; finalise its version/status and record approval evidence.
3. Resolve the current 2027 fee schedule, higher-bond discount and sibling interaction, ordinary bond refund trigger, and withdrawal before commencement. Staff must provide actual offer dates/payment/refund periods; there are no production defaults.
4. Complete the focused legal consistency review of needs, termination, joint liability, medical authority, charges, notice and variations. This build is not legal approval.
5. Update the contract approval hash and asset hashes, then rerun tests and the locked deployment build.
6. Publish reviewed agreement/policies and assets through a reviewable release. The staff integration has new pinned frontend versions; old V6 preview routes are not silently redirected here.
7. Deploy the reviewed change set, verify monitoring and perform an authorised synthetic OTP/Drive/SES exercise. Never use a real family as a canary.
8. Enable issuance only after verification. Sending particular family offers remains an explicit reviewed staff action.

When enabled, the canary includes new family/staff pages and protected routes. Shared
outbox/SES alarms cover delivery work. The offer list shows separate delivery, verified access and per-child signature evidence. Queued/failed state is derived from the current outbox; persisted send/feedback state is kept on the relevant task. Missing evidence is shown as unavailable.

## Recovery and limits

Clear only the approved hash to stop new offers while preserving signed-record access.
Disabling the whole feature also stops family access. Prefer a compatible forward fix.
Restore offer, association, task, immutable snapshot/signature, audit and outbox records
together to isolated tables. Never overwrite production tables or signed packets.

The candidate does not automate later registration/commencement confirmation, fee
collection, optional onboarding consents or cancellation of signed contracts. Existing
staff communications can deliver a separately reviewed commencement message; a durable
commencement-status workflow remains future work. Signature completion does not perform
any of those actions.

Review-mode dates, 14-day payment period, 30-day refund period and saved indicative fees
are illustrative, not approved defaults. Current policy verification remains a real
release dependency. Real SES delivery, Drive persistence and production deployment have
not been exercised here.

## Validation

219 backend tests pass on bundled Node 24.22.1, including staged sibling requests,
completion receipts and idempotency, correction holds, session expiry/logout, scoped
signed-record downloads, reporting recovery, recipient isolation, transactional integrity,
PDF delivery and cleanup. Production remains Node 22; repeat the release test matrix
on that runtime before deployment. Frozen-lockfile deployment build passes.

Playwright used the actual service handlers with synthetic stores and intercepted API
traffic. At 1440px and 390px, both guardians verified OTP and signed both children,
producing four signatures, four completion notifications and two downloaded records per
exercise. Reload restored authorised access; logout cleared personal display state.
The integrated staff portal previewed/downloaded the letter, issued one primary message
and rendered the tracking view at desktop/mobile widths. No real email or AWS/Drive
record was created. Review mode made zero external requests. Design checks passed at
320, 390, 768, 1024 and 1440px using the existing family styles. Screenshots were inspected.

CloudFormation lint found no errors and the same four warnings as the baseline (three
W3037 legacy action warnings, one W3002 local package warning). This does not establish
live alarm delivery. All 57 historical definition hashes were compared and unchanged.
See TESTING.md for the release checkpoint and remaining external verification.
