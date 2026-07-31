# Rosewood Decisions

Every material St Lawrence feature should receive an explicit Rosewood disposition.

## Decision Values

- Adopt: use substantially the same process outcome.
- Adapt: retain the purpose but change the implementation or wording.
- Defer: reconsider at a defined later stage.
- Reject: intentionally exclude.
- Pending: more evidence or approval is required.

## Decision Register

| Decision ID | St Lawrence feature | Evidence source | Rosewood disposition | Rationale | Owner or approver | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| RWD-001 | Immediate enquiry acknowledgement | SLB-EMAIL-001 | Pending | Families benefit from confirmation and clear timing expectations. | Rosewood enrolment lead | Draft Rosewood-specific timing and contact wording. |
| RWD-002 | Zone and waitlist review before application | SLB-EMAIL-002, SLB-EMAIL-003 | Pending | Rosewood needs its own eligibility, priority and capacity policy before adopting this gate. | Rosewood governance | Define the approved admissions pathway and escalation rules. |
| RWD-003 | Invitation-only application link | SLB-002, SLB-EMAIL-004 | Pending | This matches the proposed controlled-access model, but an opaque URL should route the invitation rather than be treated as sufficient family authentication. | Rosewood governance and technical lead | Define token scope, entropy, expiry, revocation and non-disclosure rules. |
| RWD-004 | Same-email application prefill | SLB-002, SLB-003, SLB-005, SLB-EMAIL-004 | Pending | Prefill reduces repetition and the observed system reused a persistent contact record, but identity, consent, correction and master-record update rules are needed. | Rosewood privacy and technical leads | Define the minimum safe enquiry-to-application transfer and which inherited values remain editable. |
| RWD-005 | Email one-time passcode | SLB-004, SLB-005, SLB-EMAIL-005, SLB-EMAIL-013 | Pending | OTP prevented the invitation URL alone from exposing the matched contact and student records, but expiry, retry, rate-limit and support procedures remain necessary. | Rosewood technical lead | Evaluate link-plus-OTP access and document recovery, lockout and abuse controls. |
| RWD-006 | Multi-party signatures before submission | SLB-EMAIL-006 | Pending | The signing model may support consent requirements but must follow Rosewood-approved legal wording. | Rosewood governance | Confirm required signatories and independent signing workflow. |
| RWD-007 | Submission reference and view link | SLB-EMAIL-007 | Pending | A receipt and durable reference improve family confidence and support. | Rosewood enrolment and technical leads | Define safe access to submitted records. |
| RWD-008 | Additional evidence requested through ordinary email | SLB-EMAIL-008 | Pending | The process is simple but may not be appropriate for sensitive identity documents. | Rosewood privacy lead | Decide whether restricted Google Drive collection should replace email attachments. |
| RWD-009 | Compulsory interview booking with calendar confirmation and reminder | SLB-EMAIL-009 to SLB-EMAIL-011 | Pending | Structured scheduling supports attendance, but the interview purpose and assessment rules must be transparent. | Rosewood enrolment lead | Define interview policy, booking method and reminder schedule. |
| RWD-010 | Separate accept and decline actions | SLB-EMAIL-012 | Pending | Explicit branches provide a clear outcome and enable follow-up. | Rosewood enrolment lead | Capture both interfaces and define confirmation messages. |
| RWD-011 | Offer expires after 48 hours | SLB-EMAIL-012 | Pending | A short deadline may assist capacity planning but could create accessibility and fairness concerns. | Rosewood governance | Approve a response window and exception process. |
| RWD-012 | All recorded guardians sign the acceptance agreement | SLB-EMAIL-012 | Pending | This may strengthen the acceptance record but requires legal and operational review. | Rosewood governance | Confirm guardian rules, disputes, court orders and incomplete signatures. |
| RWD-013 | Public single-page expression-of-interest form | SLB-001 | Pending | A low-friction public entry point is useful, but Rosewood must distinguish an enquiry from an application and invitation. | Rosewood enrolment lead | Define the public EOI purpose, outcome, response time and transition to invitation. |
| RWD-014 | Consent to promotional and informational messages is inferred from contact entry | SLB-001 | Pending | Bundled marketing consent may not provide the clarity or choice Rosewood wants. | Rosewood privacy lead | Obtain privacy review and design separate, explicit communication choices if required. |
| RWD-015 | EOI has no visible collection notice or privacy-policy link | SLB-001 | Pending | Rosewood should explain collection, use, storage and disclosure at the point of entry. | Rosewood privacy lead | Add approved collection notice and privacy-policy links before production. |
| RWD-016 | Binary gender field and detailed religion/additional-needs categories at enquiry stage | SLB-001 | Pending | These fields may be unnecessarily restrictive or collect sensitive data earlier than needed. | Rosewood governance and privacy leads | Test necessity, inclusivity, lawful basis and collection timing for each field. |
| RWD-017 | Localised current-school and discovery-source lists | SLB-001 | Pending | Structured options support reporting, but lists require maintenance and an accessible Other path. | Rosewood enrolment lead | Define Rosewood lists, ownership and review schedule. |
| RWD-018 | Private application gateway presents policy, privacy and evidence guidance before verification | SLB-002 | Pending | Preparing families before a long application is helpful, but Rosewood must use its own approved policies, collection notice and document requirements. | Rosewood governance and privacy leads | Draft the gateway from approved Rosewood sources and distinguish recommended from mandatory evidence. |
| RWD-019 | One persistent contact record can own multiple student applications | SLB-005 | Pending | This reflects real family relationships and supports reuse, but contact ownership, duplicate merging and household changes require clear rules. | Rosewood enrolment and technical leads | Define contact, household, student and application entities plus deduplication and reassignment workflows. |
| RWD-020 | Prefilled contact details are rendered from stored data | SLB-003, SLB-005 | Pending | Stored mobile and other contact values should never be embedded as constants in page code or invitation URLs. | Rosewood technical and privacy leads | Define runtime data binding, field editability, correction history and audit behavior. |
| RWD-021 | Five-step navigation allows review despite missing required fields and marks incomplete steps | SLB-006 | Adapt | The pattern supports orientation and non-linear review, but final validation must be accessible and deterministic. | Rosewood enrolment and accessibility leads | Define marker semantics, inline summaries and final error focus behavior. |
| RWD-022 | Conditional and repeatable family/student fields | SLB-006 | Adapt | Progressive disclosure reduces visual load, but every branch needs an approved purpose and payload rule. | Rosewood privacy and technical leads | Map each approved branch through form, storage, review and correction. |
| RWD-023 | Additional guardian contact permission controls separate signature email | SLB-006 | Pending | This supports restricted-contact circumstances but legal authority cannot be inferred from a communication toggle. | Rosewood governance and privacy leads | Separate contact preference, legal responsibility and required-signatory decisions. |
| RWD-024 | One local signer plus staged remote guardian signatures | SLB-003, SLB-006, SLB-EMAIL-006 | Pending | Independent signatures may be appropriate, but identity, reminders, refusal, expiry and court-order exceptions need approval. | Rosewood governance and technical leads | Design and legally review a complete multi-party signature state machine. |
| RWD-025 | Upload accepts broad office, image and video formats up to 10 MB | SLB-006 | Adapt | Broad support helps families but expands security, privacy and storage risk. | Rosewood privacy and technical leads | Approve the minimum formats, malware scanning, retention and safe preview/download controls. |
| RWD-026 | Fee options are non-exclusive checkboxes and survey wording conflicts with validation | SLB-006 | Reject | Rosewood should not knowingly reproduce contradictory or ambiguous data rules. | Rosewood finance and enrolment leads | Use one explicit fee allocation choice and make influence copy match enforced limits. |
| RWD-027 | Acceptance selector reuses application structure, status labels and wording | SLB-009, SLB-010 | Reject | Families can reasonably think they are reopening or restarting their submitted application because the page says `continue or start a new application` and does not explicitly label existing rows as acceptance forms. | Rosewood enrolment and accessibility leads | Use `Accept your offer`, `Enrolment agreement status`, `Start acceptance form` and `Continue acceptance form`; show application status separately if needed. |
| RWD-028 | Acceptance form bundles promotional and informational messaging with required contact details | SLB-010 | Pending | Mandatory operational contact details should not silently create marketing consent. | Rosewood privacy lead | Separate necessary service communications from optional marketing permission and obtain approved wording. |
| RWD-029 | Acceptance reuses the same five-step shell as the earlier application | SLB-010 | Adapt | Familiar navigation may help, but the workflow identity and current outcome must remain unmistakable. | Rosewood enrolment and accessibility leads | Use acceptance-specific headings, progress language, completion summary and confirmation state. |

## Principles

- Evidence of another school's process is a reference, not automatic authority.
- Rosewood wording must reflect its own governance, policies and operating model.
- Legal, privacy and consent content must identify an approved Rosewood source.
- The static walkthrough documents process behaviour and must not become an
  unreviewed production form.
