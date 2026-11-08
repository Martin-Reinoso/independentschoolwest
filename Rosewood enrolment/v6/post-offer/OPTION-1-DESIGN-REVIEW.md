# Option 1 acceptance design review

## Personalised offer email — 8 November 2026

The approved congratulations opening names the selected children using their structured
first names, with singular/plural grammar. Full names/year/level remain listed below;
later instructions and secondary messages are unchanged. See the
[email decision and validation map](PERSONALISED-OFFER-EMAIL-2026-11-08.md).

## Current acceptance workflow

Families accept the provisional offer and terms now; financial choices come later.
Staff do not enter acceptance or registration-condition deadlines, fee schedules,
bond selections/credits, or payment/refund periods. New offers have no automatic
acceptance expiry; registration and written commencement confirmation remain conditions.
Agreement 2026.5 is active; current assets are EOI 2026.31 / Application 2026.32.
See [current release and verification](NO-OFFER-DEADLINES-2026-11-08.md).
Older financial/deadline requirements below are historical and superseded.


## Production activation checkpoint

The acceptance implementation is deployed to AWS and GitHub Pages through PR #56.
On 8 November 2026 the user approved the final terms and real offer issuance was
**enabled** with the exact approved contract hash. EOI `2026.29` / Application `2026.30`
remain live. No production family was selected or emailed during activation. The 283
regression tests and live manual/scheduled canaries passed.
See [exact approval and activation evidence](OFFER-ACTIVATION-2026-11-08.md).
See [current release and operating evidence](PRODUCTION-RELEASE-2026-11-08.md).
Earlier local-only, inactive-runtime and pending-Google statements below are historical.
The user’s final-terms approval is recorded; staff still review and explicitly send each family offer.


## Completion and deployment proposal

The comprehensive current plan is [COMPLETION-TEST-AND-DEPLOYMENT-PLAN-2026-11-08.md](COMPLETION-TEST-AND-DEPLOYMENT-PLAN-2026-11-08.md). It includes formatted policy readers, both parent journeys, family overview, letters/emails/signed PDFs, isolated testing, Gmail review and staged deployment. User constraint: no testing emails to current families and no modification of their records. The plan has not been executed.

Latest preferred registration wording for final alignment: “Rosewood College is preparing to welcome its first students in 2027, subject to registration approval from the Victorian Registration and Qualifications Authority (VRQA). We will provide written confirmation of the commencement date and final enrolment arrangements once these are confirmed.”

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

The user selected Option 1 after asking for the St Lawrence editable-details structure
and smaller grey terms. They requested a proposal before changing the backend. This
checkpoint implements only a non-writing frontend mockup, not persistence or production.

Preview: `pages/rosewood-enrolment-acceptance-review.html`.

Flow: child selector → Student → Parent/Guardian → Conditions → Signature. There is no
Documents step. Names include separate given, middle, surname and preferred-name fields.
Guardian names/mobile can be corrected. Existing signing emails are read-only and come
from the application; corrections must go through the College’s controlled identity process.
The earlier email-change mockup was removed after the user challenged its security implications. Offered
entry year/level changes remain College-reviewed matters. The user clarified that missing
guardians must be addable, as in St Lawrence. The mockup now prefills existing sample
guardians and includes Add parent/guardian and removal of additional guardian panels.
Adding/removing clears the all-legal-guardians confirmation and signature preview. New
guardians require name, mobile, signing email, relationship and explicit contact permission.
No-contact prevents correspondence; it does not waive a required signature. Production
authority, verification and revision handling still require backend implementation.

After the user requested closer Harkaway fidelity, the prototype now uses a separate
fourteen-section draft in `rosewood-enrolment-acceptance-terms-review.js`, with all source
topics traced in [review notes](FOURTEEN-SECTION-REVIEW-NOTES.md). The checkbox reads
“I agree to the Terms and Conditions of Enrolment.” Terms remain continuous numbered
clauses in 14px dark-grey text (15px mobile), with enlarge/print controls. The offer overview remains
prominent. At the user’s request, the offer overview now shows only the place offered and commencement details. Annual fees, sibling reductions, payment, refundable bond and published-schedule links have been removed from this overview. The verified fee provisions in the draft terms remain unchanged. Family-specific totals and acceptance deadlines are not invented. Existing policy readers are retained.
This design choice is not approval of the conditional legal wording or cached policies.

The prototype uses only synthetic data in memory, has `connect-src 'none'`, no storage
and no submission. Refresh resets it. Preview signatures and corrections do not create
records. Backend routes, form-definition hashes and the earlier offer assets are unchanged.

Checked at 1440px, 390px and 320px with Playwright: editable names/contacts propagate to
agreement and signature summaries, four-step navigation stays below the header, terms
size/enlargement/print display, typed-signature preview, no uploads, no horizontal overflow,
no external request, no persistent browser storage and reset on reload. Screenshots inspected.

Before implementing the selected design against live records, settle correction scope,
email verification, guardian-specific editing and revision/signature invalidation. Preserve
the original signed Application and freeze each accepted agreement revision. Do not infer
that this mockup grants permission to alter already-signed records or issue family emails.


The revised draft was checked at 1440, 390 and 320px: all 14 sections render, corrected
names flow to the signing summary, the shorter checkbox is present, the review remains
non-writing and refresh resets sample changes. `?step=conditions` opens the terms directly.
No backend, shared nine-section signing contract or immutable asset pins were changed.

## Completion boundary clarified by the user

Acceptance is complete only once all required guardians have signed (normally both).
An individual signature is not completed family acceptance. Keep signing sequence and
evidence storage out of contractual terms; use brief workflow guidance where needed.
The final preview screen now describes an individual signature and pending acceptance.
Clause 1.1 follows the supplied agreement instead of adding technical process wording.
This remains a non-saving preview; backend behaviour was inspected but not changed.

## Agreement checkbox placement

At the user’s request, the required “I agree to the Terms and Conditions of Enrolment”
checkbox sits immediately after Your offer at a glance. Full terms and policy readers
remain below it, with Continue to signature after them. There is no forced-scroll or
read-tracking gate. Agreement remains required; displaying the checkbox earlier does
not make the terms optional obligations. No collapse/concealment was introduced.

The user subsequently approved a second Continue to signature button directly below the
agreement checkbox, above the terms. Both buttons submit the same conditions form and
require the same agreement checkbox. The original bottom button remains.

## Provisional offer clarification approved for the preview

The user approved labelling the offer Provisional Offer of Enrolment and changing the
place-acceptance statement to “I / We accept the provisional offer of a place for my / our
child at Rosewood College.” A clearly styled introduction immediately before section 1
states that the offer depends on VRQA registration and written commencement confirmation,
and acceptance does not guarantee opening on the proposed date. The terms heading remains
Terms and Conditions of Enrolment. The offer overview also identifies the provisional
status before the agreement checkbox/top Continue button. Clause 2 remains unchanged.
This wording update affects only the local review prototype, not backend or production.

The user approved the signature declaration: “I confirm that the details are correct
and electronically sign my acceptance of this provisional offer of enrolment.” This
replaces the earlier generic electronic enrolment-agreement signing declaration.

The user requested the St Lawrence guardian guidance before email-template work: the
second guardian panel is labelled “Parent/Guardian: Second Guardian” and says “This
person will be contacted to sign after submission of this form.” Additional guardian
panels use the same guidance. Where contact is restricted, show College-arranged signing
guidance instead. Submission here means the first parent’s form/signature; completed
acceptance still requires all required signatures. This is preview wording only.

## Existing Application second-guardian flow checked — 8 November 2026

The user requested verification of the existing flow before designing the offer signer
journey. Live pages/rosewood-application-sign-v6.html and its JS byte-match the inspected
worktree copies (HTML SHA256 299c8c6d0cf8984b5bb3421afad9b9ca1b47edda8064e11d56ea847ca5283d9b;
JS SHA256 60f915c44363bca1aa49f30bffa4fb66bd36fb2960fa96d7e8d936071a904ae3).
The backend service and email templates were inspected locally; no real OTP or signature
was triggered and the deployed backend was not independently re-tested.

Existing Application sequence: private per-child signature-request email; invited email
plus six-digit OTP; read-only review of the submitted application; review confirmation;
two declarations (network-address recording and application consent); drawn signature;
Submit signature; recorded/pending-or-complete status. Signer identity/email come from
the verified signing task. There is no parent-data editing or correction-request feature
on this signing page. Completion emails go to contact-permitted guardians once the
application reaches submitted, subject to any staff-review requirement.

The user rejected a new in-portal correction workflow for offer acceptance: families can
email the College. Do not carry the earlier offer candidate correction-request controls
into the proposed second-guardian preview. Existing primary-applicant signing-email repair
controls are a separate workflow, not an editable-email field for the second signer.
The existing Application uses separate child links; the unpublished grouped-family offer
portal is a separate design. The offer second-guardian preview is still to be built.

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

## Latest portal and offer-email discussion — 8 November 2026

### Confirmed wording and requirements

- Initial offer email is congratulatory and includes Anne-Marie’s provisional offer
  letter as an attachment. Subject/opening must clearly describe a provisional offer.
- In response to the user asking for clearer registration wording, the assistant proposed
  the paragraph below and the user replied “Great”. Preserve this approved email wording:

> Please note that these offers are provisional. Rosewood College must receive registration
> approval from the Victorian Registration and Qualifications Authority (VRQA) before
> students can commence. We will confirm the school’s opening and your children’s
> commencement date in writing. Accepting these offers does not guarantee that the school
> will open on the proposed date.

Use singular offer/child variants for one child without changing the meaning. This exact
expanded email paragraph is recorded here; it is not yet installed in backend templates.
The existing review-form registration notice remains the wording previously approved for
that form; do not silently describe this email revision as already deployed there.

### Discussed family-portal direction, not yet implemented

The user asked whether one link could lead to all family children, including applications
in progress and offers ready to accept. Recommended experience: one portal overview,
with authorised child-specific actions (Continue application, Review and accept, View
progress, View signed form). Each parent retains their own verified identity and access
permissions; do not create shared parent credentials or infer family relationships from
email/name alone. Read-only second-guardian signing remains the confirmed design.

Current unpublished offer candidate groups selected sibling offers for each authorised
guardian but opens an offer-only portal. It does not combine application drafts and offers
in one overview. Existing Application secondary-signing links are per child. A combined
family dashboard is a discussed recommendation, not a completed integration or a newly
approved production change. Backend reconciliation/design remains necessary.

### Proposed multi-child offer email

One notification lists only children actually receiving offers in that issue, with year
level and entry year. Use one portal button, but retain separate acceptance/signature
records per child. The attached Anne-Marie letter must cover the same children; do not
claim a letter lists multiple children until its generated content has been checked.
A later child’s offer gets a new notification pointing to the intended same portal;
identity/access implementation must support that before it is promised as live behaviour.

Subject: Rosewood College — provisional offers for your family

Dear [Parent’s name],

Congratulations! We are delighted to offer provisional places at Rosewood College to:

- [Child’s name] — [Year level], [Entry year]
- [Child’s name] — [Year level], [Entry year]

Please find attached Anne-Marie’s letter outlining the provisional offers for your family.

To accept, open your enrolment portal below and review and sign the offer for each child.

[Open your enrolment portal]

The other required parent or guardian will then receive an invitation to review and sign.
We will confirm acceptance for each child once all required signatures have been received.

[Insert the approved clear provisional-registration paragraph above.]

If you have any questions, please contact enrolment@ffe.org.au.

Kind regards,
Enrolments Team
Rosewood College

Email and implementation details still needing alignment: the existing candidate waits
until the primary has signed all children included in a secondary guardian’s invitation
before sending it. UI/email wording must consistently reflect that grouping. The proposed
congratulations copy and unified portal are not deployed. Keep the approved after-all-
signatures acknowledgement and signed PDF requirement in the preceding section.

### Access and current state

Backend source is accessible in this worktree and has been inspected. Recent edits are
local preview/documentation changes. No production deployment or real family email was
performed during this review. Current AWS authentication has not been independently
verified in this part of the chat; access to source is not proof of a live AWS session.

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

## Personalised letter design preview

Created a separate one-page PDF design preview with Rosewood emblem/navy/terracotta
letterhead, two fictional children in a year-level/entry-year table, current provisional
registration wording, portal acceptance directions and Anne-Marie’s January gathering
paragraph. Date: 8 November 2026. Parents/children are Alex, Taylor, Avery and Jordan Example.
The user supplied Anne marie signature.pdf and explicitly requested its signature be used.
Only the signature appearance was extracted into a private local image; the unrelated
VRQA letter text was not embedded. The sample PDF is marked DESIGN PREVIEW / SAMPLE FAMILY
DETAILS / NOT ISSUED and must not be sent as a real offer. No backend generator was replaced.

Private artifacts: ~/.local/share/ffe-private-runtime/offer-terms-review-20261108/output/pdf/
rosewood-provisional-offer-letter-preview.pdf and matching PNG. Private builder and cropped
signature are under tmp/pdfs in the same evidence directory. Keep the signature asset and
letter artifacts outside the public repository; production use needs private asset
packaging/Drive integration. The original Anne-Marie DOCX was successfully read this time;
earlier hydration failures no longer prevent source review. Meeting/gathering statements
still require staff confirmation for actual issue. Preview layout/text remains for review.
