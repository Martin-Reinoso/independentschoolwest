# V5 To St Lawrence Field Audit

## Finding

V5 is **not** a strict St Lawrence replica. It combines captured St Lawrence fields,
V4 Rosewood product adaptations and newly written prototype content. That blend was not
made sufficiently explicit and does not satisfy a source-only implementation request.

This document supersedes the completeness claims in `SOURCE-CROSSWALK.md`.

## Method And Legend

The deployed V5 source at commit `c038f7f` was compared with `SLB-001`, `SLB-002`,
`SLB-004`, `SLB-006`, `SLB-010`, `SLB-016` and `SLB-017` through `SLB-021`. Detailed
evidence comes from `02-form-and-rules.md`, `05-editable-application-map.md`,
`06-acceptance-process-map.md`, `09-decline-form-map.md` and
`10-signature-architecture.md`.

Repeated records are listed once per template; every generated instance has the same
status.

| Status | Meaning |
| --- | --- |
| `MATCH` | Same question/control in the same workflow |
| `RENAMED` | Same question, changed label |
| `ADAPTED` | Source-based, but type, options, requiredness, logic, placement or behavior changed |
| `ADDED` | No captured St Lawrence control in that workflow supports it |
| `MISSING` | Captured St Lawrence control is absent from V5 |
| `UNVERIFIED` | Capture confirms the concept but not enough detail for an exact claim |

## Commencement Fields

| V5 control | Status | Evidence |
| --- | --- | --- |
| Commencement year | `RENAMED` in application; `MATCH` in acceptance/decline | Application source says `Entry Year`; acceptance/decline say commencement year |
| Commencement year level | `RENAMED`/`ADAPTED` | Application says `Year Level of Entry`; acceptance says year level; decline says `Year Level Commencing`. V5 also adds Years 7-12 beyond the captured primary-school catalogue |
| Commencement term | `ADDED` as an editable required field | One submitted read-only application showed a term/date, but the captured editable application, acceptance and decline forms did not ask for a term. V5 had no basis to require it in all three workflows |

## Expression Of Interest

Source: `SLB-001`, `02-form-and-rules.md` lines 218-244.

| V5 control(s) | Status | Difference |
| --- | --- | --- |
| First name; family name; email; suburb; postcode; student first/family name; date of birth; additional information/questions | `MATCH` | Same source questions |
| Title | `ADAPTED` | Required in V5; Mx added; Miss omitted |
| Mobile | `ADAPTED` | International dialling-code selector and format help omitted |
| Relationship | `ADAPTED` | V5 free text replaces the source controlled list |
| Street address | `ADAPTED` | Plain text replaces location search/autocomplete |
| State | `ADAPTED` | V5 requires it and changes the source default/list behavior |
| Gender | `ADAPTED` | V5 select has five options; source radio had Male/Female |
| Calendar year | `ADAPTED` | V5 2027-2045; source 2026-2046 |
| Year level | `ADAPTED` | V5 adds Years 7-12; source stopped at Year 6 |
| Current school/ELC | `ADAPTED` | Free text replaces localised catalogue and Other |
| Additional needs | `ADAPTED` | V5 adds Unsure; source EOI used Yes/No |
| Need categories | `ADAPTED` | V5 multi-select replaces one required conditional select |
| Family connection | `ADAPTED` | V5 Yes/No replaces Current/Previous/New Family |
| How family heard about school | `ADAPTED` | V5 makes it optional multi-select and changes options |
| Middle name; preferred name; connection-detail text; decision factors | `ADDED` | These were not in the captured EOI |
| Four-step Review/Finish flow | `ADDED` | Source EOI was one long page with direct Submit |

### Missing From V5 EOI

| Source control | Status |
| --- | --- |
| Language selector/translation refresh | `MISSING` |
| Contact country | `MISSING` |
| Religion | `MISSING` |
| Current school year | `MISSING` |
| Other children who may attend, Yes/No | `MISSING` |
| Source communication/marketing notice | `MISSING` |
| Invisible reCAPTCHA | `MISSING` |

## Application Access

| V5 control | Status | Difference |
| --- | --- | --- |
| Invited email | `MATCH` | Same matching purpose |
| Six-digit code | `ADAPTED` | V5 puts it beside Email; source sends it on a separate screen after Email/Next |
| One synthetic invitation card | `ADAPTED` | Replaces persistent contact and student/application tables |

### Missing From V5 Application Access

| Source control/process | Status |
| --- | --- |
| Language selector | `MISSING` |
| Enrolment Policy; MACS Enrolment Procedure; Privacy Policy; Collection Notice links | `MISSING` |
| Seven-document preparation list | `MISSING` |
| Send-code/Sending state; Resend code; Change email | `MISSING` |
| Turnstile/reCAPTCHA | `MISSING` |
| Matched contact table | `MISSING` |
| Multiple student/application rows and Not Started/In Progress/Submitted states | `MISSING` |
| New-student first/last name and Start | `MISSING` |
| Start/View/Continue actions | `MISSING` |

## Application Student

### Identity, Entry And Schooling

| V5 control | Status | Difference |
| --- | --- | --- |
| Legal first; middle; legal family; preferred name; date of birth | `MATCH` | Same questions |
| Gender | `UNVERIFIED` | Editable source confirms field, not full catalogue; V5 uses five options |
| Religion | `ADAPTED` | Source catalogue changed and Prefer not to say added |
| Commencement year | `RENAMED` | Source says Entry Year; V5 also omits 2026 |
| Commencement year level | `ADAPTED` | Source says Year Level of Entry and stops at Year 6; V5 adds Years 7-12 |
| Commencement term | `ADDED` | Not in captured editable application |
| Current year level | `ADAPTED` | Renamed and Years 7-12 added |
| Current school/ELC | `ADAPTED` | Free text replaces captured local list |

### Residence And Family

| V5 control(s) | Status | Difference |
| --- | --- | --- |
| Address-sharing choice; home-care arrangement; street; suburb; state; postcode; family connection | `MATCH` | Same source concepts |
| Other care arrangement; shared-care schedule | `ADAPTED` | Source fields are conditional; V5 always shows them |
| Country of residence | `ADAPTED` | V5 collapses address-country/current-residence context |
| Attending-sibling gateway plus name/status/DOB/year/school | `MATCH` | Same repeatable source record |
| Future-sibling gateway plus first/last/level/start year/DOB/school | `MATCH` | Same repeatable source record |
| Other-relative gateway plus name/relationship/year | `MATCH` | Same repeatable source record |

### Citizenship, Language And Residency

| V5 control(s) | Status | Difference |
| --- | --- | --- |
| Birth country; nationality; arrival/return date; residential status; other languages; Australian citizen; residency evidence; visa subclass; visa expiry; previous visa | `MATCH` | Same source concepts; V5 does not reproduce large catalogues or conditional requiredness |
| Cultural/ethnic background | `RENAMED` | Source calls it Ethnicity |
| Main language | `ADAPTED` | Free text replaces source language catalogue |
| Indigenous status | `ADAPTED` | Prefer not to say added |

### Learning, Development And Wellbeing

| V5 control | Status | Difference |
| --- | --- | --- |
| Additional-needs gateway | `ADAPTED` | Unsure added |
| Fourteen support/need categories | `MATCH` | Same categories, including Other |
| Needs/strengths/current support | `ADAPTED` | Rewritten/combined source support context |
| Professionals/services text | `ADAPTED` | Overlaps source professional category/other specialist controls |
| NDIS support | `ADAPTED` | Same concept, changed to free text |
| Professional categories | `ADAPTED` | Counsellor added; Other-detail branch omitted |
| Reports/support plans available; court/parenting orders; other relevant information | `MATCH` | Same source concepts |

Missing here: required free-entry detail after Need category = Other, and required
Other-professional detail.

### Sacraments

| V5 control | Status | Difference |
| --- | --- | --- |
| Parish | `MATCH` | Same source field |
| Baptism/Reconciliation/First Eucharist/Confirmation received, date and place | `ADAPTED` | Source used independent checkboxes and conditional date/location; V5 uses Yes/No and always displays detail fields |

### Medical

| V5 control(s) | Status | Difference |
| --- | --- | --- |
| Medical-condition catalogue; condition details; allergy details; anaphylaxis risk; immunisation; doctor name/address/phone; Medicare number/reference/expiry; insurer; ambulance; Health Care Card | `MATCH` | Same source concepts |
| Medication/dose/timing | `ADAPTED` | Medication context is sourced; exact editable label was not captured |
| Medical device/action plan | `ADAPTED` | Combines source device/management-plan concepts into a new field |
| EpiPen/Anapen | `ADAPTED` | Neither and Not applicable added |
| Humanitarian assessment | `ADAPTED` | V5 options exceed captured detail |
| Private policy number | `UNVERIFIED` | Insurance captured; separate policy field not explicit in detailed map |

## Application Parent/Guardian And Emergency Contacts

| V5 control(s) | Status | Difference |
| --- | --- | --- |
| First/family name; email; home/work phone; share choice; HCC; employer; school/further education; birth country; nationality; languages; residency; emergency-contact names/relationship/phones/email/share | `MATCH` | Same source concepts |
| Title | `ADAPTED` | Mx/Other added; Miss omitted |
| Relationship | `ADAPTED` | Several step-parent/extended-family options omitted; Parent/Carer/Other added |
| Mobile | `ADAPTED` | International country-code selector omitted |
| Contact role | `RENAMED` | Source says Contact Type |
| Marital status; religion | `ADAPTED` | Source lists changed |
| Residential address | `ADAPTED` | V5 combines address components |
| Postal same/address | `ADAPTED` | One always-visible field replaces conditional full postal address |
| Alumni/year/name | `ADAPTED` | Source detail fields are conditional; V5 always displays them |
| Occupation group | `MATCH` | Source help-document link omitted |
| Occupation | `ADAPTED` | Free text replaces fixed source catalogue |
| Ethnicity | `RENAMED` | Cultural/ethnic background in V5 |
| Visa subclass and expiry | `ADAPTED` | Two source controls collapsed to one text field |
| Indigenous status; SMS; contact permission | `ADAPTED` | Options/scope changed |
| Contact completeness confirmation | `ADAPTED` | V5 broadens no-more-legal-guardians wording to day-to-day care |
| Add/remove contact | `MATCH` | Same repeatable concept |

Missing here: spouse selector, full conditional postal address components, separate visa
expiry control, occupation-group help link and source communication notice.

## Application Documents

| V5 category/control | Status | Difference |
| --- | --- | --- |
| Birth certificate, required | `MATCH` | Required count 1 |
| Immunisation/medical plans/professional reports, optional | `MATCH` | Required count 0 in editable capture |
| School reports/NAPLAN, optional | `MATCH` | Required count 0 |
| Sacramental certificates, optional | `MATCH` | Required count 0 |
| Proof of address, required | `MATCH` | Required count 1 and utility-bill guidance |
| Passport/visa, optional | `MATCH` | Required count 0 |
| Multiple files, 10 MB | `MATCH` | Same source behavior |
| PDF/JPG/PNG only | `ADAPTED` | Source accepted 22 document/image/video extensions |

## Application Conditions, Permissions And Fees

| V5 control/content | Status | Difference |
| --- | --- | --- |
| Fifteen clause summaries: Accuracy; Authority; Assessment; Educational records; Health/safety; Learning support; Family arrangements; Attendance; Behaviour; Communication; Digital services; Images; Fees; Privacy; Changes | `ADDED` | These are newly authored summaries, not the captured fifteen-part legal text |
| Previous-school permission | `ADAPTED` | Radio give/do-not-give replaces required source checkbox |
| Previous school name/address/interstate | `MATCH` | Same source controls |
| Photograph; recording; name-use; publication channels | `ADAPTED` | Source has detailed permission structure; V5 changes grouping/options |
| NEALS notice | `ADAPTED` | Same source concept, paraphrased copy |
| Fee allocation model | `ADAPTED` | Exclusive choice improves source defect, but unsupported `Another approved arrangement` replaces percentage split/court-order choice |
| Responsible people, percentages and dates | `ADAPTED` | Source fields are branch-specific; V5 always displays them |
| Discovery source | `MATCH` | Same 12 source choices |
| Decision factors | `ADAPTED` | Same 22 choices; V5 enforces max three while source validator allowed more |

Missing here: actual fifteen-part Terms and Conditions, required I/We Agree control,
exact percentage-split/custodial-order choice and branch-specific fee validation.

## Application Signature

| V5 control | Status | Difference |
| --- | --- | --- |
| Victorian admission guidance; privacy disclaimer | `ADAPTED` | Source content is paraphrased |
| IP acknowledgement; signer identity; canvas/Clear; additional information | `MATCH` | Same source concepts |
| Application declaration | `ADAPTED` | Newly authored shorter wording |
| Date | `ADAPTED` | V5 makes it readonly/client-generated |
| Only signer Yes/No | `ADDED` | Source requires a textual explanation when only one signature is present |

Missing here: no-guarantee/formalisation statement, required one-signature explanation,
and represented pending-signature/separate-guardian state.

## Offer Acceptance

### Gateway And Student

| V5 control | Status | Difference |
| --- | --- | --- |
| Email | `MATCH` | Same gateway field |
| Verification code | `ADAPTED` | Source has separate OTP screen |
| Correct student/offer? | `ADDED` | Not in captured source gateway |
| First/family name; commencement year; year level | `MATCH` | Source shows these prefilled |
| Middle name; DOB; gender; term; current school; details-correct question | `ADDED` | Application fields/check brought into acceptance |

Missing: Privacy Policy/Collection Notice links, OTP transitions, contact/student
selector with agreement statuses and the required `Enrolment Acceptance` declaration.

### Acceptance Parent/Guardian

Core source matches: share, first/family name, email, mobile, relationship, contact type,
additional-contact permission, Add/Remove and no-more-guardians confirmation.

| V5 control(s) added to acceptance by shared application component | Status |
| --- | --- |
| Title; home/work phone; marital status; religion; HCC | `ADDED` |
| Residential/postal address fields | `ADDED` |
| Alumni/year/name fields | `ADDED` |
| Occupation group/occupation/employer/education | `ADDED` |
| Birth country/nationality/ethnicity/languages | `ADDED` |
| Residency/visa/Indigenous status/SMS | `ADDED` |
| Two complete emergency contacts | `ADDED` |

The source communication notice is missing.

### Acceptance Documents, Agreement And Signature

| V5 control/content | Status | Difference |
| --- | --- | --- |
| Signed Parent Code and signed Student Code uploads | `MATCH` | Both required; document links disabled in V5 |
| File-format restriction | `UNVERIFIED` | Exact source acceptance formats not captured |
| Fifteen application summaries reused plus Acceptance summary | `ADDED` | Not the complete source agreement text |
| Transfer permission | `ADAPTED` | V5 wording narrower than captured education/health transfer consent |
| Media permission | `ADAPTED` | Detailed source permission collapsed to one Yes/No |
| ICT acknowledgement | `MATCH` | Policy link missing |
| Agreement-ready checkbox | `ADAPTED` | New copy substitutes for complete agreement acceptance |
| Victorian guidance | `ADDED` | Not captured on acceptance Signature step |
| Privacy disclaimer | `ADAPTED` | Changed placement/copy |
| IP; declaration; signer/date/canvas/Clear; comments | `ADAPTED` | Same concepts, but declaration/copy/date behavior changed |
| Only signer Yes/No | `ADDED` | Source instead identifies another guardian for later contact |

Missing: complete sixteen-part agreement, source agreement/policy links, detailed media
permission and explicit pending second-guardian state.

## Independent Guardian Signing

| V5 control | Status | Difference |
| --- | --- | --- |
| Email and verification code | `ADAPTED` | Source uses two stages with prefilled email, send, 30-minute OTP, Resend and Change email |
| Introduction and form/student context | `MATCH` | Synthetic Rosewood copy |
| Title | `ADDED` | Not in captured signer-detail panel |
| First/family name; email; mobile; relationship; share; contact type; details-correct | `MATCH` | Same source controls |
| Contact permission | `ADAPTED` | Source shows it locked to Yes; V5 makes it editable |
| Short read-only review | `ADAPTED` | Source renders the complete submitted agreement |
| Pending-signature warning | `ADDED` | Deliberate fix for observed source usability defect |
| Reviewed-and-ready | `MATCH` | Same gate |
| IP; declaration; canvas/Clear; automatic date | `ADAPTED` | Same controls; declaration paraphrased |
| Completion/View signed preview | `ADAPTED` | V5 loops to short Review rather than immutable Submitted form |

Missing: personalised identity sentence, Turnstile/send state, separate OTP controls,
communication notice, Saving-details checkpoint, complete Student/guardian/document/
permission/signature review, filename/size metadata, optional 1000-character signer
comments, and immutable Submitted view with status, Last Updated, Print and Logout.

## Decline Offer

### Gateway And Student

| V5 control | Status | Difference |
| --- | --- | --- |
| Email | `MATCH` | Same gateway input |
| Verification code | `ADAPTED` | Source uses separate OTP stage |
| Correct student/offer? | `ADDED` | Not in captured gateway |
| First/family name; reason; destination school | `MATCH` | Same required source controls |
| Gender | `ADAPTED` | V5 five-option select; source Male/Female radio |
| Offer year; offered year level | `RENAMED` | Source says Commencement Year and Year Level Commencing |
| Commencement | `ADDED` | No third commencement/term field in source decline form |
| Decline confirmation | `ADAPTED` | Source has a longer declaration |
| Additional information on Student step | `ADAPTED` | Source places it on Signature; V5 later duplicates comments |

Missing: separate OTP flow, decline record selector, Not Started/In Progress and
Start/Continue/Last Updated states, and fixed School Name context.

### Decline Parent/Guardian

Source matches: share, salutation, first/family name, email, mobile, relationship,
contact type, Add Contact and no-more-guardians confirmation.

| V5 control(s) added to decline by shared application component | Status |
| --- | --- |
| Home/work phone; marital status; religion; HCC | `ADDED` |
| Residential/postal addresses | `ADDED` |
| Alumni/year/name | `ADDED` |
| Occupation/employer/education | `ADDED` |
| Birth country/nationality/ethnicity/languages | `ADDED` |
| Residency/visa/Indigenous/SMS/contact permission | `ADDED` |
| Two complete emergency contacts | `ADDED` |

Missing: source international dialling-code selector and communication notice.

### Decline Signature

| V5 control | Status | Difference |
| --- | --- | --- |
| Victorian guidance and privacy disclaimer | `ADDED` | Shared application content not captured in decline |
| IP acknowledgement; canvas/Clear; date; additional information | `MATCH` | Same source concepts; V5 duplicates additional information |
| Decline declaration | `ADAPTED` | Source declaration changed |
| Signer full legal name | `ADDED` | Separate source text field not captured |
| Only signer Yes/No | `ADDED` | Source asks for required explanatory text |

Missing: preview instruction, e-signature-equivalence statement, required
`Explanation only one signature` textarea and a source-proven final transition.

## Cross-Cutting Differences

| V5 feature | Status | Difference |
| --- | --- | --- |
| One public workflow selector for all five processes | `ADDED` | Source uses separate invitation-specific routes |
| Fill synthetic example and Clear workflow | `ADDED` | Prototype-only controls |
| Direct step navigation in every workflow | `ADAPTED` | Only some source workflows use steppers |
| Invented frontend completion cards | `ADDED` | Source completion differs or is unobserved |
| No Saved/Unsaved Changes state or persistence | `MISSING` | Source application, acceptance and decline visibly autosave |

## Correction Boundary

A strict correction must:

1. remove every `ADDED` family-input field from that workflow;
2. restore each safely representable `MISSING` source field/control;
3. restore source labels such as Entry Year and Year Level of Entry;
4. remove required Commencement Term from application, acceptance and decline;
5. replace shared acceptance/decline Family and Signature components with
   workflow-specific components;
6. restore source conditional logic and requiredness;
7. stop substituting invented topic summaries for the complete agreement structure;
8. visibly map non-writing OTP, record-selection, Saved, pending-signature and immutable
   signed-view states; and
9. label any deliberate Rosewood improvement as an approved adaptation, never as St
   Lawrence content.

Until that work is complete, V5 must be described as a mixed Rosewood prototype, not
an exact frontend copy of the St Lawrence process.
