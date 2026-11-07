# Frozen offer policy assets

These are exact, checksum-named images extracted from verified controlled policy
originals for the unpublished provisional-offer candidate. Private controlled originals
and signature images do not belong in this directory. Reviewed publication copies of
policy PDFs/Word documents may be added only after the outstanding publication review,
using checksum-named paths pinned in the agreement. Fourteen reviewed publication files are included locally, pending remote deployment.

The Student Code map is the original `word/media/image2.png` from evidence
C.4.4.iih, source DOCX SHA-256
`932efba1853f7cc9823b2e2a354cffee3ab6610f239b6073eb2ec7b1f5ef5a96`.
The PNG is 2200 × 1600, 350,808 bytes, SHA-256
`e273b2e02bd71657345e6cddc8131cf4bbc7a37b49f4e48cfd4a6f539d03870d`.

Never overwrite an existing checksum-named asset. Changed source material needs a
new asset, contract and reviewed release; retain assets referenced by existing offers.
The browser contract pins the path, hash, dimensions, caption and source placement.
The backend verifies bytes before PDF generation and packages the current contract's
figures locally. A future contract release must also retain packaged assets needed
by any still-pending earlier offers. Completed acceptance PDFs retain their original
stored bytes.

This is fidelity evidence, not publication approval. The original map contains
cramped/clipped callout text. Controlled originals retain Alfred Road; the user authorised 456 Bridge Road,
Cobblebank for publication copies. Those copies are verified and pinned locally. See
`Rosewood enrolment/v6/post-offer/POLICY-SOURCE-VERIFICATION-2026-11-08.md`.

Policy download metadata is `sourceDownloads: { sourceSha256, pdf, docx }`, with
`assetPath`, `sha256` and `bytes` for each format. The source checksum must match the
policy snapshot. Paths are `Files/Policies/offer-snapshots/<slug>-<sha256>.<format>`.
The release build verifies exact bytes and format signatures. Keep publication copies
and their manifests tied to the reviewed policy version; never silently replace a file.
Private staging instructions are in `v6/scripts/prepare-offer-policy-downloads.py` and
the policy source-verification record. The current local contract pins all seven PDF/Word pairs and their publication DOCX hashes.

Publication address decision: 8 November 2026, “Use 456 Bridge Road, Cobblebank”.
Only the street address and already-corrected contents page numbers differ from the
controlled source packages. `sourceSha256` retains original provenance;
`publicationSha256` matches the downloadable DOCX, and PDF/DOCX hashes are fixed in
`sourceDownloads`. Original map graphics are unchanged. These assets are ready for the
planned release; adding them here does not deploy them or enable real offer issuance.
