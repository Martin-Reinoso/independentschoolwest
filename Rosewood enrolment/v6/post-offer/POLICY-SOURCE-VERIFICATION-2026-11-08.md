# Provisional offer policy source verification

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

Parent Code pages 1, 2 and 13 and ICT pages 1, 2 and 12 have been visually inspected.
The private metadata and page-boundary review reports supplement those images;
automated bounds checks are not a substitute for visual inspection. All-page
review, any conversion issues, source-address reconciliation, final download names,
checksums and actual download links remain pending. Do not
claim the original PDF/Word links have been published or that all 75 pages passed QA.
