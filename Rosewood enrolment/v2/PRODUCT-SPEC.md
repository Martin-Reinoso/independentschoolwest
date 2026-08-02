# V2 Product Specification

## Product Principles

1. **Family confidence:** explain what happens, why information is requested and what
   remains outstanding.
2. **Data minimisation:** ask sensitive questions only when the answer activates a
   relevant branch.
3. **Truthful status:** distinguish connection, local fallback, server save, step
   completeness and final submission.
4. **Informed consent:** present policies before declarations, make permissions granular
   and place the real signature control only on the signing stage.
5. **Independent guardians:** each required guardian verifies their own mailbox, reviews
   the frozen application revision and creates one attributable signature record.
6. **Accessible recovery:** allow non-linear review, focus the first invalid field,
   provide error summaries and never communicate status through colour alone.
7. **Rosewood identity:** reflect faith, character, academic excellence and parent
   partnership without copying another school's visual or verbal design.

## Family Stages

| Stage | Purpose | Completion gate |
| --- | --- | --- |
| Access | Match the invitation and verify the invited email | Valid invitation, current OTP, unused challenge |
| Prepare | Explain time, evidence, privacy and saved-draft behaviour | Readiness acknowledgement |
| Student | Collect identity, proposed entry, residence, language and school history | Required student and address fields |
| Family | Collect guardians, legal authority, household/care arrangements and emergency contact | Primary guardian, authority choices and guardian-completeness attestation |
| Care | Collect only relevant learning, medical, allergy, medication and support information | Explicit none/yes choices and required conditional details |
| Choices | Collect previous-school permission, granular media choices, optional community updates and exclusive fee responsibility | Every required decision answered |
| Documents | Collect minimum evidence and explain conditional/deferrable items | Required uploads or an approved not-yet-available explanation |
| Review | Present a concise, navigable summary and policy versions | Accuracy, privacy and authority declarations |
| Sign | Capture terms-gated signature and server date | Declarations, typed name, signature and revision match |
| Complete | Explain pending additional signatures or show final receipt | All required signatories complete the frozen revision |
| Receipt | Verify the recipient again and show only completion evidence | Private receipt link, current OTP and receipt-scoped session |

## Core Fields

### Student

- legal first, middle and family names; preferred name
- date of birth and optional gender/self-description
- proposed commencement year and Prep to Grade 5 entry level
- current kindergarten/school and current level
- primary residential address and living arrangement
- country of birth, citizenship/residency branch and home languages
- interpreter requirement
- optional Catholic parish, faith tradition and sacramental information
- sibling/current-family connection, collected only where relevant

### Family And Authority

- repeatable parent/guardian/carer identity and contact details
- relationship, primary/secondary contact role and lives-with-student status
- legal responsibility, permission to contact and required-signatory status as distinct
  concepts
- residential/postal address controls
- care arrangement and shared-care schedule
- court/parenting order branch with restricted-contact warning
- informal-carer/statutory-declaration branch
- guardian-completeness attestation that resets after add/remove
- at least one independent emergency contact
- optional alumni and family-partnership context

### Learning, Wellbeing And Health

- learning/support needs with multi-select categories and free-text strengths
- existing adjustments, specialist reports and NDIS branch
- wellbeing information needed for safe transition
- medical-condition none/selected branch
- allergy/anaphylaxis, action-plan and medication branches
- immunisation statement status
- doctor/practice and emergency health instructions
- explicit consent to contact current educators/health professionals where required

### Choices And Responsibilities

- previous school/kindergarten information-transfer permission
- separate name, internal publication, website, social and media/publicity permissions
- operational enrolment communication is required and explained
- optional community/news communication is a separate unticked choice
- one exclusive fee responsibility model: joint, one account holder or approved split
- discovery source and no-more-than-three decision factors

### Documents

- birth certificate: required
- immunisation history statement: required or approved pending explanation
- proof of address: required
- recent school report: required when the student has attended school, otherwise hidden
- visa/residency evidence: conditional
- court/parenting orders: conditional and restricted
- medical/action plans and specialist reports: conditional
- baptism/sacramental evidence: optional

Allowed production types are PDF, JPEG and PNG only. Default maximum size is 8 MB per
file. Client validation is advisory; the backend must independently verify type, size,
Drive metadata and task ownership.

## Signature Rules

- The primary guardian signs only after reviewing the exact revision.
- The canvas is visibly locked until both signature declarations are checked.
- The button says `Submit my signature`, never generic `Next`.
- A second guardian never signs in the first guardian's session.
- Each additional required signer receives a unique task and OTP challenge.
- A material application change after a signature creates a new revision and supersedes
  prior signatures.
- Aggregate completion is calculated from required assignments, not a mutable count.
- Families receive separate individual-signature and all-signatures-complete messages.
- Every required signer receives a different 30-day receipt capability after aggregate
  completion and must use a new OTP to open the minimal receipt.
- Receipt access never returns the complete application, uploaded files or signature
  image; it is evidence of recorded completion, not an offer.

## Deliberate Improvements Over The Reference

- Acceptance and application are named as distinct workflows.
- Marketing consent is never inferred from entering mandatory contact information.
- Fee responsibility is exclusive and internally consistent.
- Guardian completeness resets when the guardian set changes.
- Sensitive branches are collapsed until relevant.
- Review is grouped and anchored; it does not display a fake interactive signature area.
- OTP errors cover expiry, attempts, resend cooldown and support recovery.
- Save state identifies the exact storage boundary.
- Document collection avoids broad office/video formats.
- The process supports explicit not-yet-available explanations rather than silently
  accepting incomplete mandatory evidence.

## Production Decision Gates

- year levels and 2027 intake scope
- approved admissions priorities and offer authority
- legal guardian, informal carer and mature-student signing rules
- final privacy collection notice and policy suite
- required documents and retention periods
- fee schedule and split-account approval process
- staff roles, Drive/Sheet ownership and incident response
- whether server-side incomplete drafts may be viewed by staff
- approved sender domain, support mailbox and message templates
