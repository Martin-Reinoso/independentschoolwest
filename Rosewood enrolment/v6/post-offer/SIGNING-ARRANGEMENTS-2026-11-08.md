# Offer signing arrangements and older Applications

## Approved behaviour

A contact restriction must prevent messages to that guardian, without preventing the
main carer from receiving or signing a provisional offer. Contact permission and the
requirement to sign are separate. The user approved this correction on 8 November 2026.

Staff choose a signing arrangement for each selected child before reviewing the offer:

- **All listed guardians** is the default. The main carer may sign while acceptance
  remains pending for other required signatures. Restricted guardians receive no
  invitation, OTP, receipt or completion email. The staff view identifies a signature
  needing a school arrangement instead of promising an automatic email.
- **Main carer only (approved)** requires a recorded College approval reason and the
  existing explicit reviewed-send confirmation. It records the staff identity, time,
  primary guardian and excluded guardian IDs with the offer and in the audit trail.
  The main carer's signature completes acceptance for those listed guardians.

The release itself approves no particular family's sole-signing arrangement and issues
no offer. Staff must choose the applicable arrangement. An already signed offer is not
retrospectively changed; existing withdrawal/replacement constraints remain in place.
An offline-signature capture workflow is not added in this correction. Cases still
requiring an unavailable signature remain pending for the school to resolve.

## Family experience and integrity

The guardian list remains visible and existing email identities remain locked. Families
cannot waive a required signature or lift a source Application contact restriction by
editing a request. Newly added guardians are required to sign even when the original
listed guardians had a main-carer-only approval. Permitted corrections remain available
before the first signature. Existing placeholder contact details for a restricted
person are preserved without forcing the main carer to replace them; newly entered
contact details are validated.

Preview and issue use the same per-child arrangement; changing it or its reason after
review invalidates the review hash. Family text and the signed PDF identify the recorded
arrangement. Completion and signature counts use only required signers. All guardian
identities remain in the record, and original Applications, answers and signatures are
never migrated or rewritten. Approval reasons remain in staff/audit records, not family
emails or signed PDFs.

## Older completed Applications

Completed 2026.1–2026.5 Applications may predate `signerControls`. Resolve their guardian
identities from their frozen guardian IDs and answer fields without persisting a new
control set. Honour their recorded contact choices, including “No, do not contact them”.
Do not use this fallback for modern, unknown or incomplete records, or to fill a partial
modern control set. Duplicate IDs/indices or missing main-carer identity fail closed.

## Release and validation

EOI 2026.32 / Application 2026.33 pin the changed staff/family assets only. All 63 prior
form hashes and the existing question contracts remain unchanged. Agreement 2026.5
and approved hash `e9a0404f52b7e3f68cf7cc66f552c640b7869ab42e9c5fc49d9bfd6661f52c8a`
are unchanged. No financial choices, dates, uploads or additional family step is added.

Synthetic regression checks cover both completion paths, contact suppression, absence
of legacy controls, stale reviews, staff permissions, family tampering, added guardians,
PDF evidence and unchanged source records. Browser checks at 1440, 390 and 320px cover
one family with two children using different arrangements. Every external request is
intercepted and provider data is held in memory. A local read-only check of the reported
legacy record confirms preparation and detail validation without any write or email.

Deployment results are recorded in the associated release PR. Private baseline,
rollback package, browser screenshots, synthetic PDF and test/build/operation evidence:
`~/.local/share/ffe-private-runtime/offer-guardian-compatibility-20261108`.
