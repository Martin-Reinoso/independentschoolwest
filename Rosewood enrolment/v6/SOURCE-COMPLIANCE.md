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
| Application access | Brief welcome, subtle policy/procedure sentence, invitation email, separate OTP, matched contact, student/application statuses, Start/View/Continue and new-student start | Supports either an EOI-linked invitation or a direct staff invitation without asking the family which path applies; removes gateway language and document-preparation sections |
| Application Student | Identity, current schooling, Entry Year/Year Level of Entry, residence/care, future siblings, nationality/residency, full ASCL language catalogue, fourteen support categories, always-visible professional/report/NDIS/order controls, sacraments and medical record | Removes Commencement Term; temporarily hides Family Connection, Siblings Already Attending and Other Relatives for a new school; restores source labels, required Yes/No controls and Other-detail branches |
| Application Parent / Guardian | Full repeatable source contact, conditional postal/card/visa details, mandatory residential address, occupation/education/residency sections, contact permission, completeness confirmation and two emergency contacts | No longer shares the smaller acceptance/decline component; removes Past Student, Spouse and emergency-sharing questions by Rosewood decision |
| Application Documents | Five retained categories, multiple-file behavior, 10 MB guidance and broad captured extension list | Corrects School Reports wording, requests the latest report and excludes Proof of Address permanently |
| Application Conditions | Previous-school permission, three fee branches and survey/influence choices | Keeps Enrolment Agreement terms and photography permissions out of the application; adds the source fee-responsibility explanation and fee-account nominee branch |
| Application Signature | No-guarantee/formalisation statement, subtle privacy disclaimer, IP/declaration gates, one canvas/date, conditional one-signature explanation or prefilled separate-guardian state, additional information | Removes Victorian admission guidance and makes the separate guardian's later signature request explicit |
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
- Application invitations may originate from an EOI or from direct staff entry. This
  is a Rosewood operating requirement documented in `PRODUCT-DECISIONS.md`.
- Family Connection, Siblings Already Attending and Other Relatives are retained as
  inactive future schema fields but hidden for Rosewood's first intake.
- Proof of Address, parent Past Student, parent Spouse and emergency-contact sharing
  are deliberately not collected.
- Application terms and photography permissions move to the post-offer Enrolment
  Agreement rather than being duplicated in the application.
- The influence question enforces no more than three choices, matching its instruction
  rather than the observed permissive validator.
- Review explains that a pending signature is status only and signing is on the next
  page.
- The decline process ends at a labelled capture boundary because its source outcome
  was not observed.
- EOI acknowledgement and current-guardian completion cards explicitly state that the
  frontend did not submit or send anything.

## Known Fidelity Limits

- the country datalist is a representative subset of the source's country catalogue
- Main Language uses the complete 444-entry language-level catalogue from the ABS
  Australian Standard Classification of Languages 2025, with English first
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
