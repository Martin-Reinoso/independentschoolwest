# Form, Rules, Documents And Consent Register

## Screen Register

| Screen ID | Screen title | Purpose | Previous | Next | Source ID |
| --- | --- | --- | --- | --- | --- |
| EOI-01 | Expression of Interest Form | Collect initial family, student and proposed-enrolment information | Public enrolment page | Enquiry acknowledgement | SLB-001 |
| APP-00 | Application gateway | Explain the formal application, present governing documents and match the existing enquiry by email | Private invitation link | Email verification and application | SLB-002 |
| APP-01 | Email verification | Verify access to the matching enquiry email before showing the application | Application gateway | Verified application form | SLB-004 |
| APP-02 | Select or enter a student | Show the matched contact, existing student applications and a new-application path | Email verification | View, resume or start application | SLB-005 |
| APP-03 | Online enrolment form | Collect and display the complete application, evidence, agreements, permissions and signatures | Student selection | Pending signatures or submitted application | SLB-003 |
| APP-03E | Editable online enrolment form | Collect the application across five navigable steps with conditional fields, validation markers, uploads and signature capture | Student selection | Pending signatures or submitted application | SLB-006 |
| ACC-00 | Offer acceptance gateway | Begin formal acceptance and match the recipient using the same email address used previously | Private Accept link in offer email | Expected verification screen; first observed transition remained on `Sending...` | SLB-008 |
| ACC-02 | Acceptance contact and student selection | Show matched records and agreement-specific Not Started/In Progress states | Acceptance verification | Start or Continue agreement | SLB-009, SLB-010 |
| ACC-03 | Enrolment Agreement | Collect acceptance, guardians, conduct documents, conditions and signatures across five steps | Acceptance selector | Pending signatures or submitted acceptance | SLB-010 |

### EOI-01 Interface Observations

- The Enquiry Tracker form is embedded in the school website as an iframe.
- It is one long page with three sections: Primary Contact Details, Primary Contact
  Address and Student Details.
- A language selector is available at the top of the embedded form.
- There is no visible progress indicator, save-and-return option or explanation of
  what an expression of interest does and does not guarantee.
- No privacy-policy link, collection notice, zoning guidance or admissions disclaimer
  is visible inside the form.
- An invisible reCAPTCHA control is present.
- The browser review changed only local yes/no selections to reveal conditional
  questions. No personal data was entered and Submit was not pressed.

### APP-00 Interface Observations

- The gateway is branded with the school's contact details and provides a language
  selector.
- It asks the family to use the same email address used in the earlier enquiry so the
  application may be prepopulated.
- It links to the school's Enrolment Policy, the Enrolment Procedure for MACS schools,
  the MACS Privacy Policy and the Privacy Collection Notice for Parents and Students.
- It presents seven document categories to prepare for upload at the end of the
  application.
- The only input is Email. Next is disabled before an email is entered.
- The family-specific invitation URL and all personal identifiers are excluded from
  this record. Email was not entered and Next was not pressed during capture.

### APP-01 Interface Observations

- The screen retains the same school header, language selector and footer artwork as
  the gateway.
- It confirms that a code was sent and asks the family to enter it to continue.
- Verify is disabled while the required code field is empty.
- Resend code and Change email are separate secondary actions.
- Cloudflare Turnstile/Insights and an invisible Google reCAPTCHA are loaded during
  the access transition. No security keys are stored in this repository.

### APP-02 Interface Observations

- A successful match displays one contact row with last-updated, address, email and
  mobile columns. All observed values are restricted and excluded here.
- A second table lists student records with last-updated date, form status and an
  action. Submitted records expose View. A previously opened draft was later observed
  as In Progress with Continue.
- A separate new-enrolment path asks for required student first and last names and
  keeps Start disabled while those fields are empty.
- The screen demonstrates that one verified contact can have multiple student or
  application records in different states.
- Pressing Start with both new-student names completed showed only a brief loading
  progress indicator before navigating directly to a distinct application route.
  There was no substantive interim screen.
- The five-step form opened on Student with the two typed names prefilled. The other
  student fields and primary address were blank. The header already showed Saved.
- The low-level request stream was unavailable in the connected Chrome session, so
  the exact create-draft endpoint, method and payload remain unverified. The private
  route identifier is deliberately excluded.

### Identity Matching And Prefill Findings

- The private email link contains opaque identifiers and should be treated as a
  restricted invitation URL. Its structure suggests invitation-specific routing,
  but the capture does not prove that the URL alone uniquely identifies a family.
- The URL was not sufficient to expose family data. The family still had to provide
  the previously used email address and complete a six-digit OTP challenge.
- After OTP verification, the system displayed the stored contact record, including
  contact channels, and multiple associated student/application records. This
  confirms a persistent contact-to-many-applications data model.
- The gateway and invitation email say that using the same email can prepopulate the
  application. The observed values are therefore described as stored or prefilled,
  not hardcoded into the page or URL.
- In the editable application, inherited Given Name, Surname, Email and Mobile fields
  were enabled and writable. The mobile value is therefore prefilled stored data, not
  a hardcoded or read-only page value. Whether editing it changes the master contact
  record remains unknown.

### APP-03E Editable Interface Observations

- The editable form uses five top markers: Student, Parent/Guardian, Documents,
  Conditions and Signature. Direct marker clicks and Next/Back both change steps.
- Navigation is not blocked by missing required fields. Leaving an incomplete step
  adds a red marker state and `Missing required fields.`
- The header exposes Saved/Unsaved Changes state. The production system auto-saved
  test-draft changes; the static replica deliberately does not persist anything.
- Conditional fields include repeatable siblings/relatives, additional-needs Other,
  Australian-residency evidence, postal address, alumni details and added guardians.
- Minimum-one messages are used for additional needs, medical status, immunisation
  and survey influences.
- The complete field, option, document, validation and signature map is maintained in
  `05-editable-application-map.md`.

### ACC-00 Acceptance Gateway Observations

- The acceptance link opens a separate Enquiry Tracker gateway rather than the
  submitted application view.
- The page asks the Parent / Guardian to use the same email address used previously
  to begin formal acceptance of the offered place.
- It links to the MACS Privacy Policy and Privacy Collection Notice for Parents and
  Students.
- Email is the only family input and Next is disabled while it is empty.
- After one authorised Next click, the button changed to disabled `Sending...` and
  remained there for more than eight seconds. No OTP field, CAPTCHA prompt, inline
  error or acceptance agreement became visible, and the action was not retried.
- The detailed status and future capture checklist are maintained in
  `06-acceptance-process-map.md`.

### ACC-02 And ACC-03 Acceptance Observations

- The selector reuses the application screen structure and the exact instruction
  `Please select a student to continue or start a new application.` even though the
  statuses and actions belong to a separate Enrolment Agreement.
- After Start had previously been used, the selected student row showed `In Progress`
  with `Continue`; the other two matched rows remained `Not Started` with `Start`.
- Continue navigated to a distinct private route after a brief progress-bar-only state.
- The agreement reused the five markers Student, Parent/Guardian, Documents,
  Conditions and Signature and showed `Saved` with a cloud-complete icon.
- Student included prefilled identity, year-level and commencement-year values plus
  one required acceptance declaration.
- Parent/Guardian included prefilled contact values, share choice, relationship,
  contact type, a second contact marked Missing Fields and a no-more-guardians check.
- Opening the second contact kept the first panel expanded, removed the guardian-name
  and Missing Fields summary from the open header, repeated Primary Information and
  exposed required contact permission plus a second-contact Remove action.
- The second-contact permission defaults to Yes. Selecting No is described as
  suppressing both school communication and the separate signature-request email.
- The no-more-guardians confirmation initially has a dotted red outline. Checking it
  clears the outline immediately, changes `Saved` to `Unsaved Changes`, then returns
  to `Saved` after asynchronous persistence.
- Add Contact inserts an expanded blank third-contact panel with the same contact
  fields and Remove action. Share has no default; contact permission defaults to Yes.
- The blank third contact is autosaved despite required-field errors. The existing
  guardian-completeness checkbox incorrectly remains checked after the new contact is
  added.
- The contact panel treats provision of mandatory email/mobile details as agreement
  to promotional and informational messages and describes unsubscribe/STOP only for
  promotional communications.
- Documents required signed Parent and Student Codes of Conduct.
- Conditions included the full enrolment agreement, school-transfer consent,
  photography/recording permission and ICT acceptable-use acknowledgement.
- Signature required an IP-address acknowledgement, a broad guardian declaration,
  local electronic signature and date. A second guardian was marked for contact after
  submission.
- No value, file, signature or submission action was changed during capture.

### ACC-09 To ACC-11 Remote Signing Observations

- Successful OTP opens a separate five-stage Sign Form wizard: Introduction, Your
  Details, Review, Sign and Thank You.
- Your Details prefills editable required identity and contact controls. School-contact
  permission is displayed but locked; a required details-correct confirmation gates Next.
- Next displays `Saving your details...`, persists through an authenticated API request
  and opens Review only after success.
- Review renders Student, all guardians, required-document metadata, the complete
  Conditions and both signature blocks read-only.
- Review explains that comments can be added in Sign and requires a separate
  reviewed-and-ready confirmation before Next. That confirmation and later stages were
  not opened during capture.

### APP-03 Interface Observations

- The submitted record is presented as one very long, read-only page rather than a
  step-by-step wizard. A Print action appears at the top and bottom.
- The header shows submission date, a unique tracking ID and form status. Those
  family-specific values are excluded from this repository.
- The observed status was Pending Signatures. Separate guardian blocks showed one
  completed signature and one outstanding signature.
- The page contains Student, Parent/Guardian, Documents, Conditions and Signature
  sections. Major subsections are recorded below.
- Uploaded filenames and file sizes are displayed in the submitted view. They are
  excluded because filenames can contain student details.
- The verified record includes the Victorian Government admission-consent guidance,
  the privacy disclaimer, IP-address acknowledgement and guardian declaration.

## APP-03 Section And Field Groups

| Section | Subsections and fields observed | Source ID |
| --- | --- | --- |
| Student | Names, date of birth, gender, religion, current year and school, destination campus, entry year and level, commencement term/date, home and primary address | SLB-003 |
| Residence and family | Home care arrangement, family connection, future siblings with repeatable sibling details, existing/new family and other relatives | SLB-003 |
| Citizenship and background | Current residence, birth and nationality countries, citizenship, Indigenous status, main language and other languages | SLB-003 |
| Additional needs | Additional-needs status, health-professional categories, other specialist, NDIS support, court/parenting orders and other information | SLB-003 |
| Sacraments | Parish plus Baptism, Reconciliation, Eucharist and Confirmation checkboxes with date and location | SLB-003 |
| Medical | Condition categories, anaphylaxis and medication, immunisation, humanitarian health check, doctor, Medicare, private health insurance and ambulance cover | SLB-003 |
| Parents and guardians | Repeatable contact panels with identity, phones, messaging consent, relationship, contact type, religion, health-care card, SMS, residential/postal address, alumni, employment/education and residency | SLB-003 |
| Additional guardian and emergency | Add or confirm no additional legal guardian; counter-signature contact choice; emergency contact identity, relationship and phone details | SLB-003 |
| Documents | Birth, immunisation, baptism, medical/specialist, proof-of-address and passport/visa upload categories | SLB-003 |
| Conditions | Fifteen-part enrolment terms, acceptance agreement, previous-school permission, photograph/recording permission, fee responsibility and decision survey | SLB-003 |
| Signature | Victorian admission guidance, per-guardian IP acknowledgement, declaration, electronic signature, date, comments and additional information | SLB-003 |

## Field Register

| Screen ID | Field | Type | Required | Options or format | Conditional logic | Validation or help text | Source ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EOI-01 | Language | Select | No | English shown by default; translation control available | None observed | Refresh translation action available | SLB-001 |
| EOI-01 | Salutation | Select | No visible asterisk | Mr, Mrs, Ms, Dr, Miss, Other | Other response behaviour not tested | None observed | SLB-001 |
| EOI-01 | Primary contact first name | Text | Yes | Free text | None observed | Required asterisk | SLB-001 |
| EOI-01 | Primary contact last name | Text | Yes | Free text | None observed | Required asterisk | SLB-001 |
| EOI-01 | Relationship | Select | Yes | Father, Mother, Stepfather, Stepmother, Guardian, Uncle, Aunt, Grandparent, Friend, Unknown, Brother, Other | Other response behaviour not tested | Required asterisk | SLB-001 |
| EOI-01 | Email | Email | Yes | Email address | None observed | Contact-marketing notice appears below contact fields | SLB-001 |
| EOI-01 | Mobile phone number | Telephone with country code | Yes | Australia +61 default; international country codes available | None observed | Example Australian mobile format shown | SLB-001 |
| EOI-01 | Contact address | Address search | Yes | Location autocomplete field | May populate related address fields; not tested | Enter a location | SLB-001 |
| EOI-01 | Suburb | Text | Yes | Free text | None observed | Required asterisk | SLB-001 |
| EOI-01 | State | Select | No visible asterisk | Victoria shown by default | None observed | None observed | SLB-001 |
| EOI-01 | Postcode | Text | Yes | Free text | None observed | Required asterisk | SLB-001 |
| EOI-01 | Contact country | Select | Yes | Australia shown by default | None observed | Required asterisk | SLB-001 |
| EOI-01 | Student first name | Text | Yes | Free text | None observed | Required asterisk | SLB-001 |
| EOI-01 | Student last name | Text | Yes | Free text | None observed | Required asterisk | SLB-001 |
| EOI-01 | Date of birth | Date picker | Yes | Calendar input | None observed | Required asterisk | SLB-001 |
| EOI-01 | Gender | Radio | Yes | Male, Female | None observed | Required asterisk; no additional option is visible | SLB-001 |
| EOI-01 | Religion | Select | Yes | Catholic and multiple faith/no-religion categories, plus Other | Other response behaviour not tested | Required asterisk; Buddhist appears twice in the observed list | SLB-001 |
| EOI-01 | Year of enrolment | Select | Yes | 2026 through 2046 | None observed | Required asterisk | SLB-001 |
| EOI-01 | Year level of entry | Select | Yes | Foundation, Year 1 through Year 6 | None observed | Required asterisk | SLB-001 |
| EOI-01 | Current school | Select | No | Not at school, a localised school/kindergarten list, Other | Other response behaviour not tested | One observed school label appears to begin with zero instead of capital O | SLB-001 |
| EOI-01 | Current school year | Select | No | Not at School, Early Years/Kinder, Foundation, Year 1 through Year 6 | None observed | None observed | SLB-001 |
| EOI-01 | Additional needs | Radio | Yes | Yes, No | Yes reveals required Please Specify field | Required asterisk | SLB-001 |
| EOI-01 | Additional-needs category | Select | Yes when shown | Autism, acquired brain injury, ADD/ADHD, anxiety, behavioural concerns, giftedness, developmental/language/intellectual/physical/mental-health/vision/hearing categories, Other | Shown only when Additional Needs is Yes | Required asterisk | SLB-001 |
| EOI-01 | Family connection | Radio | Yes | Current Family, Previous Family, New Family | No additional field appeared for Current Family | Required asterisk | SLB-001 |
| EOI-01 | Other children who may attend | Radio | Yes | Yes, No | No additional field appeared for Yes | Required asterisk | SLB-001 |
| EOI-01 | How family first heard about the school | Select | Yes | Advertising, current family, early learning centre, friends, internet, local area, parish, past family, school website, social media, word of mouth, another primary school, Other | Other response behaviour not tested | Required asterisk | SLB-001 |
| EOI-01 | Additional information or questions | Textarea | No | Free text | None observed | None observed | SLB-001 |
| APP-00 | Email | Email | Yes | Must match the address previously used with the school for prepopulation | Enables the next application-access step | Next is disabled before entry | SLB-002 |
| APP-01 | Verification Code | Six-digit one-time code | Yes | Code delivered to the matched email address | Successful verification continues to the application | Verify is disabled before entry; email evidence states a 30-minute expiry | SLB-004, SLB-EMAIL-005, SLB-EMAIL-013 |

## Document Register

| Document | Required when | Format or limit | Collection point | Follow-up if missing | Source ID |
| --- | --- | --- | --- | --- | --- |
| Birth certificate | Formal application | One file required; editable form accepts the documented multiple-file format list up to 10.0 MB per file | Documents section | Staff recovery behaviour not observed | SLB-002, SLB-003, SLB-006 |
| Immunisation statement | Formal application | Submitted view showed one required; the later editable form combined it with medical plans/reports and showed zero required. This is a captured state/version discrepancy, not a resolved rule. | Documents section | Staff recovery behaviour not observed | SLB-002, SLB-003, SLB-006 |
| Sacramental certificates, such as a baptismal certificate | Applicable to the student | Zero files required by form; upload category remains available | Documents section | Not observed | SLB-002, SLB-003 |
| Temporary or permanent residency-status document | Applicable to the student | Not stated | Suggested upload at the end of the online application | Not yet observed | SLB-002 |
| Two most recent school reports and available NAPLAN results | Available for the student's current stage | Zero files required in the editable form; accepted types and 10.0 MB per-file limit apply | Documents section | A later email requested a school report in the observed case | SLB-002, SLB-006, SLB-EMAIL-008 |
| Court order or restriction documentation | Applicable to the family | Not shown as a dedicated upload category in the submitted record; the application says copies must be provided when relevant | Application or later staff follow-up is not confirmed | Not observed | SLB-002, SLB-003 |
| Medical management plans or health-professional reports | Applicable to the student | Combined with the immunisation category and zero files required in the editable form | Documents section | Not observed | SLB-002, SLB-003, SLB-006 |
| Proof of address | Formal application | One file required; gas, electricity or water bill requested; accepted types and 10.0 MB per-file limit apply | Documents section | Not observed | SLB-003, SLB-006 |
| Passport and visa documentation | Applicable to student or overseas-born parents | Zero files required; copy of student residency evidence and relevant parent visa/citizenship evidence requested when applicable | Documents section | Later email accepted a parent citizenship certificate or passport | SLB-003, SLB-006, SLB-EMAIL-008 |
| Most recent school report | Requested after staff review of the submitted application | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Parent citizenship certificate or passport | Requested after staff review; either document was accepted | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Interview calendar file | Appointment is booked | ICS calendar file | Attached to booking confirmation | Reminder email follows near the event | SLB-EMAIL-010, SLB-EMAIL-011 |
| Parent/Guardian/Carer Code of Conduct | Enrolment Agreement | Download, complete and sign; four-page PDF contains two parent/guardian/carer signature blocks | Agreement Documents step; one signed file required for upload | Agreement cannot be completed while required upload is absent | SLB-010, SLB-DOC-005 |
| Student Code of Conduct | Enrolment Agreement | Download, complete and sign; three-page PDF contains student and parent/guardian/carer signature fields | Agreement Documents step; one signed file required for upload | Agreement cannot be completed while required upload is absent | SLB-010, SLB-DOC-006 |
| School Family Occupational Index: Parent Occupation Groups | Formal application | Four-page reference PDF | Linked beside the guardian occupation-group field | Family uses it to select A, B, C, D or N | SLB-006, SLB-DOC-008 |
| Blank St Lawrence enrolment form | Paper/reference equivalent of the formal application | Native DOCX; eight rendered pages | Public policy portal | Not an upload requirement; retained as a field and legal-wording reference | SLB-DOC-010 |
| School Enrolment Agreement | Offer acceptance | Eight-page PDF | Source for the agreement Conditions step | Family accepts the terms in the online agreement | SLB-010, SLB-DOC-009 |
| ICT Acceptable Usage Policy - Students | Offer acceptance | Six-page PDF | Linked from the agreement Conditions step | Read-and-understand acknowledgement is required | SLB-010, SLB-DOC-007 |
| CECV Statement of Commitment to Child Safety | Supporting enrolment-agreement reference | Two-page PDF | Referenced by the School Enrolment Agreement through a dead legacy link; current official MACS-hosted copy archived | No direct upload or acknowledgement observed | SLB-DOC-009, SLB-DOC-011 |

## Consent And Declaration Register

| Item | Who agrees or signs | Required when | Exact legal source identified | Process effect | Source ID |
| --- | --- | --- | --- | --- | --- |
| Promotional and informational email/SMS notice | Primary contact, by providing an email address or mobile number | Contact details are entered | No; wording is presented in the live third-party form | Treats provision of contact details as agreement to receive promotional and informational messages; promotional messages can be stopped through unsubscribe or STOP | SLB-001 |
| Acceptance-form promotional and informational notice | Parent or guardian, by providing required email/mobile details | Enrolment Agreement contact step | No; wording is presented in the live third-party form | Bundles promotional and informational messaging with required contact details; promotional messages can be stopped through unsubscribe or STOP | SLB-010 |
| Offer acceptance declaration | Parent or guardian | Student step of Enrolment Agreement | No independent governing source identified | Records acceptance of the offered place | SLB-010 |
| Signed Parent and Student Codes of Conduct | Family/student as applicable | Documents step of Enrolment Agreement | Exact source PDFs archived as SLB-DOC-005 and SLB-DOC-006 | One signed file for each code is required before completion | SLB-010, SLB-DOC-005, SLB-DOC-006 |
| Consent to transfer school information | Parent or guardian | Conditions step of Enrolment Agreement | MACS privacy documents referenced | Authorises relevant health and educational information to transfer between schools | SLB-010 |
| Photography and recording permission | Parent or guardian | Conditions step of Enrolment Agreement | Form references MACS Privacy Collection Notice | Explicit give/do-not-give choice for listed uses | SLB-010 |
| ICT Acceptable Usage Policy acknowledgement | Parent or guardian | Conditions step of Enrolment Agreement | Exact six-page policy archived as SLB-DOC-007 | Required read-and-understand acknowledgement | SLB-010, SLB-DOC-007 |
| Acceptance signature IP acknowledgement and declaration | Current guardian; second guardian contacted later | Signature step of Enrolment Agreement | No independent governing source identified | Records signing IP, signature/date and broad consent; second guardian signs separately | SLB-010 |
| Enrolment and privacy document presentation | Parent or guardian | Before email verification | Enrolment Policy, MACS Enrolment Procedure, MACS Privacy Policy and Privacy Collection Notice are linked | Family is asked to familiarise themselves with the enrolment documents and read the privacy documents; no acknowledgement checkbox is visible on this screen | SLB-002 |
| Initial application signatures | All people the application identifies as required signatories | Before application submission | No; email evidence describes the workflow only | Application is not submitted until all required signatures are received | SLB-EMAIL-006 |
| Enrolment acceptance agreement | All parents or guardians recorded on the original application | After an offer is accepted | Exact source agreement archived as SLB-DOC-009 and live five-step structure captured as SLB-010 | Acceptance requires the recorded guardian signature set | SLB-EMAIL-012, SLB-010, SLB-DOC-009 |
| Enrolment terms and acceptance | Parent or guardian | During formal application | Fifteen-part Terms and Conditions of Enrolment plus Acceptance of enrolment displayed in the form | Required I / We Agree checkbox records acceptance | SLB-003 |
| Previous school or preschool permission | Parent or guardian | During formal application | Form-specific consent wording | Authorises the school to obtain reports and information for educational planning | SLB-003 |
| Photograph and recording permission | Parent or guardian; student may withdraw if aged 15 or over | During formal application | Form-specific permission with NEALS notice | Separately selects name, photograph/recording and publication channels | SLB-003 |
| School fee responsibility | Parent or guardian | During formal application | Form-specific allocation | Select both guardians, one guardian or percentage split and nominate account responsibility | SLB-003 |
| Admission signature guidance | Student over 15 living independently, parent or eligible informal carer as applicable | Signature stage | Victorian Government guidance reproduced in the form | Explains equal parental responsibility, separated-parent/court-order and informal-carer evidence expectations | SLB-003 |
| IP-address acknowledgement | Each required parent or guardian | Electronic signature | Form-specific acknowledgement | Records that the signer's IP address will be stored for administrative, security and legal-compliance purposes | SLB-003 |
| Parent or guardian declaration | Each required parent or guardian | Electronic signature | Form-specific declaration | Confirms the signer has read, understood and consented to all matters in the form for the period of enrolment | SLB-003 |
| Privacy disclaimer | Parent or guardian | Conditions and signature stages | MACS and school Privacy Collection Notice and Privacy Policy | Personal information is held, used and disclosed under the cited privacy documents | SLB-003 |

## Validation And Error Behaviour

| Screen ID | Trigger | Message | Blocks progress | Recovery | Source ID |
| --- | --- | --- | --- | --- | --- |
| EOI-01 | A required field is incomplete | Required fields are marked with an asterisk | Not tested against the live submission action | Complete the field; exact inline errors were not tested | SLB-001 |
| EOI-01 | Automated-submission protection is invoked | Invisible reCAPTCHA is present | Not tested | Not tested | SLB-001 |
| APP-00 | Email is empty | Email is marked required and Next remains disabled | Yes | Enter the email used for the earlier enquiry | SLB-002 |
| APP-01 | Verification code is empty | Verification Code is marked required and Verify remains disabled | Yes | Enter the emailed code, resend the code or change the email | SLB-004 |
| APP-01 | One-time passcode is more than 30 minutes old | Passcode expires after 30 minutes | Yes | Use Resend code; the exact expired-code message has not been captured | SLB-004, SLB-EMAIL-005, SLB-EMAIL-013 |
| APP-02 | New-student first or last name is empty | Start remains disabled | Yes | Complete both required name fields | SLB-005 |
| APP-03 | Required guardian signature is incomplete | Form status remains Pending Signatures and the additional guardian receives a signed Contact Portal task link | Yes for completed submission, based on observed state and confirmation emails | Required guardian confirms the prefilled email, passes invisible Turnstile, verifies with a 30-minute OTP, confirms prefilled details, reviews the complete read-only form, completes the electronic signature and receives an individual acknowledgement | SLB-003, SLB-017 to SLB-019, SLB-EMAIL-015 to SLB-EMAIL-019 |
| APP-03E | Family leaves an incomplete step | `Missing required fields.` appears under that top marker | No for step navigation; final Submit remained disabled | Return to the marked step and complete its required controls | SLB-006 |
| APP-03E | A custom multi-select has no answer | `Please select a minimum of 1 items.` | No for step navigation; contributes to incomplete state | Select at least one item | SLB-006 |
| APP-03E | More than three survey influences are selected | No maximum-selection warning appeared; four choices were accepted | No | The live implementation does not match the instruction asking for three | SLB-006 |
| APP-03E | Multiple fee-responsibility cards are checked | No exclusivity warning appeared and all three could be selected | No | The live implementation does not enforce its implied choose-one rule | SLB-006 |
| Offer response | Family does not respond within 48 hours | Offer will lapse after 48 hours | Yes, according to the offer | Exact expired-offer and staff recovery process not captured | SLB-EMAIL-012 |

## Workflow Rules

These rules are confirmed by communications but still need to be checked against the
live screens before being treated as a complete specification.

| Rule ID | Rule | Effect | Source ID |
| --- | --- | --- | --- |
| SLB-RULE-001 | The family should use the same email address used for the enquiry. | Existing enquiry information may prefill the application. | SLB-002, SLB-EMAIL-004 |
| SLB-RULE-002 | The six-digit one-time passcode is valid for 30 minutes. | An expired code cannot be used to continue; the verification screen provides Resend code and Change email actions. | SLB-004, SLB-EMAIL-005, SLB-EMAIL-013 |
| SLB-RULE-003 | All required application signatures must be received before submission. | A partly signed application remains unsubmitted; the all-signatures-complete message says submission then occurs for school processing. | SLB-EMAIL-006, SLB-EMAIL-018 |
| SLB-RULE-004 | A submitted application receives a unique reference, submission timestamp and view link. | The family can identify and revisit the submitted record. | SLB-EMAIL-007 |
| SLB-RULE-005 | Staff may request extra evidence after submission. | The application portal is not the only document collection channel. | SLB-EMAIL-008 |
| SLB-RULE-006 | The application interview is compulsory for the observed pathway but does not guarantee an offer. | Attendance is a progression step rather than acceptance. | SLB-EMAIL-009 |
| SLB-RULE-007 | Booking an interview generates confirmation and calendar details, followed by a reminder. | The appointment workflow supports attendance. | SLB-EMAIL-010, SLB-EMAIL-011 |
| SLB-RULE-008 | An offer provides separate accept and decline actions and states a 48-hour response window. | The family must choose a branch before the offer lapses. | SLB-EMAIL-012 |
| SLB-RULE-009 | Acceptance requires signatures from all parents or guardians recorded on the original application. | A single response may not complete acceptance. | SLB-EMAIL-012 |
| SLB-RULE-010 | The gateway advises families to prepare seven categories of evidence for upload at the end of the application. | Document readiness is established before the verified form begins. | SLB-002 |
| SLB-RULE-011 | OTP verification resolves to a contact-and-student selection screen. | A family can view a submitted application, resume a Not Started record or begin another student's application. | SLB-005 |
| SLB-RULE-012 | One verified contact can be associated with multiple student application records and statuses. | The process must not assume one contact equals one application. | SLB-005 |
| SLB-RULE-013 | The application stores separate consent and signature state for each parent or guardian. | A record may display Pending Signatures after one guardian has completed their block; each remote guardian receives an individual acknowledgement. | SLB-003, SLB-EMAIL-017, SLB-EMAIL-018 |
| SLB-RULE-014 | Required document counts differ by upload category. | Birth certificate, immunisation statement and proof of address required one file in the observed form; conditional categories remained available with zero required. | SLB-003 |
| SLB-RULE-015 | The electronic-signature acknowledgement states that the signer's IP address is recorded and stored. | The implementation has an explicit security/legal audit-data disclosure. | SLB-003 |
| SLB-RULE-016 | The invitation URL does not by itself expose the matched family record. | Email matching and OTP verification are still required before contact and student records appear. | SLB-002, SLB-004, SLB-005 |
| SLB-RULE-017 | Contact details shown after verification are stored record values, not values hardcoded into the invitation page or URL. | Rosewood should model reusable contact data separately from student applications and render approved inherited values at runtime. | SLB-002, SLB-003, SLB-005 |
| SLB-RULE-018 | Inherited contact Given Name, Surname, Email and Mobile values are editable in a new application. | Prefill reduces re-entry but Rosewood must decide whether a correction updates the reusable contact record, application snapshot or both. | SLB-006 |
| SLB-RULE-019 | Incomplete steps do not block Next, Back or direct marker navigation. | The departed marker displays a red error and `Missing required fields.` while the family may continue reviewing later steps. | SLB-006 |
| SLB-RULE-020 | Added guardians have a contact-permission choice. | `No, do not contact them` suppresses school communication and the separate signature-request email. | SLB-006 |
| SLB-RULE-021 | The active guardian signs on one local canvas. A second contactable guardian removes the one-signature explanation but does not add a second local canvas. | A dedicated signed Contact Portal task, prefilled identity check, invisible Turnstile, 30-minute OTP, details confirmation, full read-only review and individual acknowledgement directly confirm staged remote signing rather than simultaneous local signatures. | SLB-003, SLB-006, SLB-017 to SLB-019, SLB-EMAIL-014 to SLB-EMAIL-019 |
| SLB-RULE-022 | Uploads accept multiple files up to 10.0 MB in the documented office-document, image and video formats. | Client and server validation would both be needed in a Rosewood implementation. | SLB-006 |
| SLB-RULE-023 | Fee cards are independent checkboxes and survey influences enforce a minimum of one despite wording that asks for three. | The observed validation can accept internally inconsistent answers; Rosewood should not copy these defects. | SLB-006 |
| SLB-RULE-024 | Start from the separate new-student fields opens a distinct application route after a transient loader, without an interim confirmation screen. | The typed first and last names seed the new Student step; the remaining fields begin blank and the draft reports Saved. | SLB-007 |
| SLB-RULE-025 | Continue and Start are different paths. | Continue resumes an existing In Progress record; Start creates or opens a distinct new-draft route from the names entered below the records table. | SLB-005, SLB-007 |
| SLB-RULE-026 | The remote guardian cannot advance from Your Details until confirming the prefilled details; Next performs a blocking authenticated save before Review. | Contact state is persisted before the submitted agreement is disclosed for final review. | SLB-018, SLB-019 |
| SLB-RULE-027 | Remote Review renders the complete agreement read-only and requires a second reviewed-and-ready confirmation before Sign. | The signer sees the student, contacts, documents, conditions, permissions and existing signature state but cannot alter them in Review. | SLB-019 |
