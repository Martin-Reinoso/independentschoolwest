# V3 Field And Terms Crosswalk

This crosswalk records how the complete mapped formal-application content is
represented in V3. `Adapt` means the purpose and information are retained with
clearer Rosewood structure or wording. `Defer` means the content is shown as a
future production requirement but is not operational in this frontend prototype.

## Student And Family

| Reference requirement | V3 disposition | V3 location or rule |
| --- | --- | --- |
| Legal, middle, surname and preferred names | Adopt | Student details |
| Date of birth, gender and religion | Adapt | Student details; inclusive additional choices require approval |
| Current year level and current early learning centre, kindergarten or school | Adopt | Student details |
| Entry year and year level | Adopt | Student details; years retained through 2045 |
| Share-address privacy choice | Adopt | Residence and care arrangements |
| Home care arrangement | Adopt | Complete both-parents, single-parent, shared, carer, out-of-home, kinship and Other choices |
| Other care arrangement and shared parenting schedule | Adopt | Residence and care arrangements |
| Residential address, suburb, state, postcode and country | Adopt | Residence and care arrangements |
| Current, previous or new family connection | Adopt | Family connections |
| Repeatable future siblings | Adopt | Add-sibling control records name, year, start year, birth date and current school |
| Repeatable attending siblings | Adopt | Add-sibling control records name, status, birth date, year and school |
| Repeatable other relatives | Adopt | Add-relative control records name, relationship and year |
| Residence, birth and nationality countries | Adopt | Citizenship, residency and languages |
| Ethnicity and arrival/return date | Adopt | Citizenship, residency and languages |
| Permanent/temporary status and Australian citizenship | Adopt | Citizenship, residency and languages |
| Indigenous status | Adapt | Complete choices plus prefer-not-to-say option, subject to approval |
| Main and other languages | Adopt | Citizenship, residency and languages |
| Residency evidence category, visa subclass, expiry and previous subclass | Adopt | Revealed when Australian citizen is No |
| Full country and language catalogues | Adapt | Searchable text controls in prototype; approved maintained catalogues required in production |
| Additional-needs Yes/No | Adopt | Learning and additional needs |
| ASD, acquired brain injury, ADD/ADHD, anxiety, behaviour, giftedness, global delay, communication, intellectual, physical, mental health, vision, hearing and Other categories | Adopt | Complete checkbox group |
| Health-professional categories | Adopt | Paediatrician, psychologist, speech pathologist, occupational therapist, physiotherapist and other specialist |
| Reports available, NDIS support and court/parenting orders | Adopt | Learning and additional needs |
| Other relevant information | Adopt | Learning and additional needs |
| Parish | Adopt | Sacramental information |
| Baptism, Reconciliation, Eucharist and Confirmation with date and location | Adopt | Sacramental information |
| No condition, anaphylaxis, asthma, diabetes, epilepsy, migraines and Other | Adopt | Medical information |
| Condition and allergy details | Adopt | Medical information |
| Anaphylaxis risk and EpiPen/Anapen | Adopt | Medical information |
| Immunisation statement and humanitarian health check | Adopt | Medical information |
| Doctor name, address and phone | Adopt | Medical information |
| Medicare number, reference and expiry | Adopt | Medical information |
| Private health insurer and policy number | Adopt | Medical information |
| Ambulance cover and student Health Care Card details | Adopt | Medical information |

## Parents, Guardians And Emergency Contacts

| Reference requirement | V3 disposition | V3 location or rule |
| --- | --- | --- |
| Repeatable parent/guardian/carer contact | Adopt | Full contact template and add/remove controls |
| Share-contact-details privacy choice | Adopt | Primary information |
| Title, names, email and mobile | Adopt | Primary information |
| Home and work phone | Adopt | Primary information |
| Relationship and primary/secondary contact type | Adopt | Primary information |
| Marital status and religion | Adopt | Primary information |
| Operational SMS choice | Adapt | Operational messaging is explicit; no bundled marketing consent |
| Guardian Health Care Card number and expiry | Adopt | Primary information |
| Residential and conditional postal address | Adopt | Address |
| Alumni status, graduation year and name at school | Adopt | Alumni, workplace and education |
| Occupational group A-D/N | Adopt | Alumni, workplace and education |
| Fixed occupation catalogue | Adapt | Search control identifies the standard catalogue requirement; source anomalies are not copied into Rosewood copy |
| Employer, school education and further education | Adopt | Alumni, workplace and education |
| Birth country, nationality, ethnicity and languages | Adopt | Citizenship, residency and languages |
| Guardian Indigenous status | Adapt | Complete choices plus prefer-not-to-say, subject to approval |
| Residency, visa subclass and expiry | Adopt | Citizenship, residency and languages |
| School-contact permission | Adapt | Separate from legal responsibility and signature requirement |
| Spouse selector | Adapt | Spouse/partner field; production will populate recorded contacts |
| Confirmation that all legal guardians are included | Adopt | Required declaration after contact cards |
| Clear confirmation after contact change | Adapt | Adding/removing a contact clears the declaration |
| Two emergency contacts | Adopt | Both collect names, relationship, mobile, alternative phone and email |
| First emergency-contact share choice | Adopt | Emergency contact 1 |
| Prefill from earlier enquiry | Defer | Production identity/data-binding requirement; no personal data in prototype |

## Documents

| Reference requirement | V3 disposition | V3 location or rule |
| --- | --- | --- |
| Birth certificate, one required | Adopt | Birth certificate card |
| Immunisation, medical plans and professional reports | Adopt | Combined health evidence card displays 0 required from the latest editable form |
| Earlier submitted record showed Immunisation Certificate as one required file | Adopt | Visible version-discrepancy note; Rosewood must approve one rule before production |
| Two recent reports and available NAPLAN results, zero required | Adopt | School reports and NAPLAN card with exact observed count |
| Sacramental certificates, zero required | Adopt | Sacramental card with exact observed count |
| Proof of address, one required | Adopt | Proof-of-address card |
| Passport and visa evidence, zero required | Adopt | Passport and visa card with exact observed count and applicable-family guidance |
| Court or parenting orders | Adapt | Dedicated restricted-evidence card rather than leaving it implicit |
| Drag-and-drop and Browse controls | Adopt | Every evidence and signed-document card has both local-only interactions |
| Multiple files and 10 MB source limit | Adopt | File names and sizes display locally; files over 10 MB are identified |
| Broad source format list | Adapt | Captured in guidance; Rosewood must approve a smaller safe list |
| Upload and storage | Defer | File names display locally only; no file is read, sent or stored |
| Parent / Guardian / Carer Code of Conduct download | Adopt | Actual archived four-page reference PDF linked in Offer-acceptance documents |
| Two parent/guardian/carer signature blocks | Adopt | Completion instruction displayed before the signed-file control |
| One signed Parent Code upload required | Adopt | Required-count badge and local-only signed-file control |
| Student Code of Conduct download | Adopt | Actual archived three-page reference PDF linked in Offer-acceptance documents |
| Student and parent/guardian/carer signature fields | Adopt | Completion instruction displayed before the signed-file control |
| One signed Student Code upload required | Adopt | Required-count badge and local-only signed-file control |
| School Enrolment Agreement, ICT Policy and Child Safety Commitment | Adopt | Reference links displayed with the acceptance documents |
| Application evidence and post-offer conduct documents are separate transactions | Adapt | Both are visible in Documents under explicit Formal application and After an offer headings |

## Conditions, Permissions And Survey

| Reference requirement | V3 disposition | V3 location or rule |
| --- | --- | --- |
| Complete terms topic structure | Adopt | All 15 observed headings displayed under Terms and conditions |
| Education, enrolment, fees, minimum-age, child safety, period, policies, conduct, ethos, accurate information, additional needs, assessment, discipline, termination and general topics | Adopt | Terms list, without pretending draft summaries are approved legal text |
| Family obligations and privacy disclaimer | Adapt | Full observed obligation structure with Rosewood approval warning |
| Agreement checkbox | Defer | Demonstrative until final legal text is approved |
| Previous-school permission | Adopt | Full permission, name, address and interstate choice |
| Both guardians, one guardian or percentage split | Adapt | Exclusive radio group fixes source contradiction |
| Nominee, date, guardian names and percentages | Adopt | Fee responsibility details |
| Discovery-source list | Adopt | All 12 observed choices plus Other |
| Three decision factors | Adapt | All 22 captured choices with an enforced maximum of three |
| Final fee schedule and binding enrolment agreement | Defer | Clearly identified as later offer-acceptance documents |

## Review, Consent And Signature

| Reference requirement | V3 disposition | V3 location or rule |
| --- | --- | --- |
| Application does not guarantee enrolment | Adopt | Full note immediately before guidance |
| Student over 15 and living independently | Adopt | Victorian admission and consent guidance |
| Parent under Family Law Act 1975 | Adopt | Victorian admission and consent guidance |
| Equal parental responsibility absent a court order | Adopt | Victorian admission and consent guidance |
| Both separated parents or relevant court order | Adopt | Victorian admission and consent guidance |
| Informal carer and statutory declaration | Adopt | Victorian admission and consent guidance |
| Carer definition and consent role | Adopt | Complete three-point carer list |
| Twelve-month statutory declaration | Adopt | Informal-carer notes |
| Parent wishes prevail in a dispute | Adopt | Informal-carer notes |
| Secondary student participation/co-signing | Adopt | Victorian admission and consent guidance |
| Privacy disclaimer | Adapt | Rosewood policy references, marked pending approval |
| IP-address recording acknowledgement | Defer | Visible declaration and signature gate; no IP is recorded in V3 |
| Read, understand and consent declaration | Defer | Visible declaration and signature gate; no record is created |
| Full signer name, signature canvas and date | Adopt | Signature card; date is local display only |
| Explanation for only one signature | Adopt | Signature card |
| Additional information | Adopt | Signature card |
| Separate verified task for each additional guardian | Defer | Explained in the form; backend state machine is out of V3 scope |
| Frozen review revision, immutable signature event and aggregate status | Defer | Documented production architecture; not simulated as a real record |

## Separate Post-offer Acceptance

The following reference content is preserved in V3 as a clearly separate later
stage rather than being silently bundled into the application:

- final School Enrolment Agreement and fee schedule
- Parent / Guardian / Carer Code of Conduct
- Student Code of Conduct
- ICT Acceptable Usage Policy - Students
- school-information transfer consent
- photography and recording permission with give/do-not-give choices
- independent signatures from each required guardian

The final Rosewood application conditions and the later binding Enrolment Agreement
must be reconciled by governance and legal review. V3 does not claim that the draft
summaries are sufficient terms.
