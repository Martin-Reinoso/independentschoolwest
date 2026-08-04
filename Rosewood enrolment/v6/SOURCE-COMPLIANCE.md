# V6 St Lawrence Source Compliance

## Conclusion

V6 corrects the unsupported questions and cross-workflow leakage identified in
`../v5/ST-LAWRENCE-FIELD-AUDIT.md`. No family-input question is knowingly added to a
workflow without captured St Lawrence evidence. Prototype-only navigation, safety
messages and synthetic statuses are interface aids, not enrolment questions.

This is a source-mapped Rosewood frontend, not a legal or technical copy of Enquiry
Tracker. It does not reproduce third-party code, private records, live links, backend
calls or St Lawrence policy text as Rosewood policy.

## Commencement Controls

| Workflow | V6 controls | Source status |
| --- | --- | --- |
| EOI | Year of Enrolment; Year Level of Entry | Captured EOI labels |
| Application | Entry Year; Year Level of Entry | Captured editable-application labels |
| Acceptance | Year Level; Commencement Year | Captured prefilled agreement fields |
| Decline | Year Level Commencing; Commencement Year | Captured decline labels |

There is no editable Commencement Term in any V6 workflow. The term shown in one
submitted source record was not an editable application, acceptance or decline
question and is therefore not carried into V6.

## Workflow Crosswalk

| V6 area | Captured content represented | V5 correction |
| --- | --- | --- |
| EOI | Language, contact identity and relationship, email/mobile, communication notice, full contact address, student identity, religion, enrolment year/level, current school/year, additional needs, family connection, other children, discovery and questions | Removes middle/preferred name, connection detail, Unsure and decision-factor additions; restores missing source questions; returns to one form page |
| Application access | Language, four policy/document positions, seven-document preparation list, email, separate OTP, matched contact, student/application statuses, Start/View/Continue and new-student start | Splits email and OTP and restores the source selector rather than one invitation card |
| Application Student | Identity, current schooling, Entry Year/Year Level of Entry, residence/care, three repeatable family branches, nationality/residency/language, exact fourteen support categories, professional/report/NDIS/order controls, sacraments and medical record | Removes Commencement Term and Rosewood-only support/medical questions; restores Other-detail branches and source labels/options |
| Application Parent / Guardian | Full repeatable source contact, conditional postal and alumni details, spouse selector, contact permission, completeness confirmation and two emergency contacts | No longer shares the smaller acceptance/decline component; restores missing fields and communication notice |
| Application Documents | Six observed categories, observed required counts, multiple-file behavior, 10 MB guidance and broad captured extension list | Restores source extension coverage and exact category structure |
| Application Conditions | Fifteen captured agreement headings, required agreement, previous-school permission, media/name/publication controls, NEALS notice, three fee branches and survey/influence choices | Removes invented clause summaries and unsupported fee arrangement; restores branch-specific fee fields |
| Application Signature | No-guarantee/formalisation statement, Victorian guidance, privacy disclaimer, IP/declaration gates, one canvas/date, one-signature explanation or separate-guardian state, additional information | Removes Only Signer Yes/No and restores source explanation/routing |
| Acceptance access | Language, privacy positions, separate OTP, contact/student agreement selector and workflow-qualified statuses | Removes the added correct-student/offer question and distinguishes acceptance from application |
| Acceptance Student | First name, last name, year level, commencement year and Enrolment Acceptance declaration | Removes DOB, gender, term, current school and details-correct additions |
| Acceptance Parent / Guardian | Smaller repeatable agreement contact, additional-contact permission and completeness confirmation | Removes application-only address, demographic, occupation, visa and emergency fields |
| Acceptance Documents / Conditions | Two required signed conduct documents, sixteen agreement headings, transfer consent, media permission and ICT acknowledgement | Stops reusing application summaries and preserves workflow-specific structure |
| Acceptance Signature | Current-guardian IP/declaration/signature/date and separate second-guardian contact state | Removes application-only Victorian guidance and Only Signer question |
| Independent signing | Identity and OTP, Introduction, exact smaller details panel, locked contact permission, details confirmation, complete read-only review, reviewed-and-ready gate, comments, declaration-gated canvas, automatic date, Thank You and immutable Signed Form | Restores omitted stages and prevents signing on the read-only Review frame |
| Decline | Email and OTP, existing decline-record selector, Student/Parent / Guardian/Signature only, exact decline student questions, smaller contact with Salutation, destination school, declarations, one-signature explanation and additional information | Removes application-only fields, extra correct-offer/term questions, new-record fields and Victorian guidance |

## Deliberate Adaptations

These differ from the source and are explicit rather than accidental:

- Rosewood branding and synthetic people replace St Lawrence and private family data.
- Bare acceptance statuses and actions are workflow-qualified to reduce the confusion
  documented during observation.
- Adding a guardian clears the contact-completeness confirmation, correcting the
  observed contradictory state.
- Fee responsibility is one exclusive choice. The source displayed checkbox cards
  that could be selected simultaneously despite the wording requiring one choice.
- The influence question enforces no more than three choices, matching its instruction
  rather than the observed permissive validator.
- Review explains that a pending signature is status only and signing is on the next
  page.
- The decline process ends at a labelled capture boundary because its source outcome
  was not observed.
- EOI acknowledgement and current-guardian completion cards explicitly state that the
  frontend did not submit or send anything.

## Known Fidelity Limits

- country and language datalists are representative subsets of the source's 249-country
  and approximately 395-language catalogues
- the application occupation control is free entry instead of the source's long fixed
  occupation catalogue
- Google Maps address autocomplete is represented by ordinary address fields
- translation refresh is structural only because only English is available
- invisible Turnstile/reCAPTCHA and transient network states are not executed
- source policy and conduct files are represented by unavailable Rosewood-document
  positions until approved Rosewood versions exist
- only captured agreement headings are shown; third-party legal wording is not
  republished as Rosewood terms
- autosave, durable statuses, timestamps, emails, uploads and signatures are simulated
  visually and not persisted

These are omissions or controlled adaptations, not added family questions. They remain
release blockers where production equivalence depends on them.
