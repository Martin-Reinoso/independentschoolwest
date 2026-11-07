# Provisional offer policy source verification

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


## Complete original-page QA and contents correction — latest

All **75 pages** of the seven original conversions have now been visually inspected.
Body text and registers are readable, with no observed body clipping or overlap.
The inherited bullet spacing is inconsistent. The previously recorded Student Code
map label defects remain; no diagram or policy wording was changed.

The original conversions retained 28 stale contents page numbers: Parent 10,
Student 1, Behaviour 2, Suspension 7 and Complaints 8. Child Safety needed no
correction. ICT has no contents list. All 140 PDF outline headings are accounted for;
the 122 contents links in the six documents target the correct actual heading pages,
but their displayed cached numbers were not all current.

`scripts/check-policy-contents.py` verifies original checksums, matches contents to
PDF outlines, checks actual link targets and displayed page numbers, and can prepare
separate copies changing only cached contents page-number fields. It verifies all
other package entries and canonical document XML remain unchanged. The originals
are never overwritten. Use `--review-copies` after rendering the prepared copies;
`--copies` and `--review-copies` are deliberately separate operations.

All seven private review copies are prepared and rendered. Rechecking proves zero
remaining contents mismatches. Only the five contents pages differ visually; the
other **70 pages are pixel-identical** to the fully reviewed original renders.
All five changed contents pages were also visually inspected. Child Safety and ICT
copies are byte-identical to their originals.

These are not published download assets. All seven still retain the Alfred Road
address pending the requested publication decision, and the original map defect
requires publication review. Do not label the five corrected copies as byte-identical
originals. No source wording, contract, backend runtime, production record or external
document changed in this checkpoint. Remaining work is publication/address resolution,
download packaging/links, scoped Google setup, live email/signature tests, exact
agreement review and production rollout.

Private evidence: `policy-visual-review-private.json`,
`policy-contents-{review,copies,recheck,final}-private.json`,
`contents-review-copies/` and `contents-review-render/` under
`offer-terms-review-20261108`. The recheck includes per-page changed pixel bounds;
the final report separately verifies originals, copy-only changes and rendered links.

## Appendix image correction — latest

Visual review found that text-only extraction omitted the Student Code's Appendix A
site-supervision map. It is now included in the local reader and signed-record PDF,
using the exact 350,808-byte, 2200 × 1600 PNG from the controlled original.
Image SHA-256:
`e273b2e02bd71657345e6cddc8131cf4bbc7a37b49f4e48cfd4a6f539d03870d`.

The mapper now accounts for body images, explicitly excludes the verified decorative
cover logo, and rejects unmapped figures, legacy images, embedded objects, text boxes
and images within tables/structured content. The contract includes compact figure
metadata and placement, with no base64 data or changes to existing policy prose.
The reader includes a responsive image and full-size link. PDF generation verifies
local bytes, checksum, dimensions and placement; unavailable or altered images fail
closed. The deployment bundle includes the verified image.

All 278 backend tests pass, including new figure integrity and PDF-embedding tests.
The locked build and packaged-image read pass. Browser journeys at 1440, 390 and
320 pixels include the fully loaded map, all seven policy texts, return state,
both guardian signatures and exact stored/downloaded PDF equality, with zero external
requests and unchanged fictional Application records. The regenerated synthetic
acceptance PDF is 49 pages / 434,885 bytes; its two signature images and one source
map are present. All terms/policy text and page bounds pass automated checks.
All pages were rendered and contact-sheet layout reviewed, with the new map and
adjacent page inspected at full size. This is local synthetic evidence only.

All 36 original pages of Parent Code (13), ICT (12) and Student Code (11) have now
been visually inspected. Remaining original page QA: Child Safety 9, Behaviour 10,
Suspension 8 and Complaints 12. The Student Code's original map has cramped/clipped
callout labels; preserve the exact source and resolve publication suitability with
the document owner. No address change or corrected diagram is authorised yet.
No controlled originals, production resources or family records were changed.
The AWS test stack still runs the earlier inactive artifact; this correction is local.

The seven controlled Word originals were read from the school Google Drive on
8 November 2026. Each was located through the exact parent path under
`VRQA Submission/RC_Submission_Evidence`, downloaded through a bounded read-only
request, checked against Drive size/MD5 and hashed independently with SHA-256.
All seven match the private VRQA catalogue's original bytes. The full cached policy
texts also match that catalogue's extracted text after trimming outer whitespace.
No school source, family record or Google permission was changed.

This supersedes the earlier filesystem-timeout limitation. It proves current-file
identity and text fidelity; it does not approve a new agreement or resolve the old
address printed on six source covers.

| Evidence | Policy | Source SHA-256 | Numbered headings | Rendered original pages |
| --- | --- | --- | ---: | ---: |
| C.2.2.iif | Parent Code of Conduct | `83a080f98d87819d18a789e60d2172ee967cf6958bc9e5cc2a4748f267d66408` | 22 | 13 |
| C.4.4.iih | Student Code of Conduct | `932efba1853f7cc9823b2e2a354cffee3ab6610f239b6073eb2ec7b1f5ef5a96` | 17 | 11 |
| C.4.2.iib | Child Safety Code of Conduct | `1141a422a9fb651887eca0fe1f835cb0c82692485fa61555ecaa84d053791627` | 19 | 9 |
| C.4.1.iiw | ICT Acceptable Use Agreement | `b592e26cf19a8ea92b0c1bd159722a25dfb1adfeecf8cbded925d570760b59ab` | 18 | 12 |
| C.4.4.iia | Student Behaviour Management | `17548af80a482099bb6bc9c171a31df25949092a49e8a9bd638d9739ff7e5d35` | 17 | 10 |
| C.4.4.iic | Suspension and Expulsion | `fbb4b32516abeb78ec68232d9a1698d63de6da92b1dac6b2cd63ba4e8f5c3552` | 18 | 8 |
| C.4.1.iva | Complaints and Grievances | `103181940de45f8c0a95686d476fd18236ada90163b702aa680e2076e57f8e7c` | 29 | 12 |

All source modified timestamps remain 30 June 2026. Structural inspection found no
comments, tracked insertions/deletions or external relationships in any original.
Original metadata review is now complete: the author is Families for Education Ltd,
the editor/generator identifies the Word exporter, and the custom XML is an empty
bibliography configuration. PDF annotations are internal contents links only; there
are no embedded files. Complete page-by-page visual review is still pending.

## Reader implementation

`scripts/map-offer-policy-structure.py` maps the verified Word structure onto line
references in each existing frozen policy text. It checks the source hashes and
titles, compares every paragraph and table cell, validates Word numbering, and
requires complete coverage of every non-empty frozen line. It does not duplicate
the prose or silently remove source text. Unsupported structures fail for review.

The local agreement source now retains the source evidence code, original checksum,
verification statement and compact structure. The browser renderer uses those
references for all 140 numbered headings, nested bullet lists and document registers
in source order. Earlier frozen text without structure still has the existing reader
fallback. Text remains escaped; no HTML is imported from Word or trusted from a
remote source. The complete compact contract is approximately 156 KB, below the
200 KB test guard, leaving space for the other fields of the DynamoDB offer record.

The source policies have not been edited. All seven originals still say
`108-134 Alfred Road, Cobblebank Victoria, 3338`: six in the body/cover and the ICT
agreement in its header. Visual/header review corrected the earlier body-only
finding that ICT had no address. Its frozen body text remains unchanged.
That discrepancy must be reconciled with the controlled-document owner before the
new policy downloads/real offers are released. Do not replace it silently in the
online accepted text or label an edited copy as the unchanged original.

Final verification: 277/277 backend tests pass on Node 22.23.4; locked deployment
build and generated-content check pass. All pre-v30 definitions remain unchanged.
Connected synthetic browser checks at 1440/390/320px verify all seven full texts,
all heading counts, valid lists, readable register captions, no horizontal overflow,
return/Back preserving agreement state, both signatures and exact stored/downloaded
signed-PDF equality. Source Applications remain unchanged and external requests are
blocked. Visual review caught and corrected a mobile caption layout defect. Static
references and public-data checks pass (108 HTML/CSS and 589 tracked files).

## Private evidence and remaining work

The non-cloud private review directory `offer-terms-review-20261108` contains:

- `policy-originals-verification-private.json`: exact Drive identity, path, metadata,
  checksums and structure checks. Do not copy its Drive IDs into public assets.
- `controlled-policy-originals/`: the seven byte-identical Word copies, mode 0600.
- `controlled-policy-render/`: all seven PDF conversions and 75 page images from
  the bundled LibreOffice renderer. These are QA artifacts, not published downloads.
- `verify-policy-originals.py`: read-only source retrieval/verification. OAuth tokens
  remain in process memory and are not saved or logged.

See the latest checkpoint above for the expanded original-page visual review.
The private metadata and page-boundary review reports supplement those images;
automated bounds checks are not a substitute for visual inspection. All-page
review, any conversion issues, source-address reconciliation, final download names,
checksums and actual download links remain pending. Do not
claim the original PDF/Word links have been published or that all 75 pages passed QA.
