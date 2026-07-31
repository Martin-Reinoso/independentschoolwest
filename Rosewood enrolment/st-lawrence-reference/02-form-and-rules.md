# Form, Rules, Documents And Consent Register

## Screen Register

| Screen ID | Screen title | Purpose | Previous | Next | Source ID |
| --- | --- | --- | --- | --- | --- |
| EOI-01 | Expression of Interest Form | Collect initial family, student and proposed-enrolment information | Public enrolment page | Enquiry acknowledgement | SLB-001 |
| APP-00 | Application gateway | Explain the formal application, present governing documents and match the existing enquiry by email | Private invitation link | Email verification and application | SLB-002 |
| APP-01 | Email verification | Verify access to the matching enquiry email before showing the application | Application gateway | Verified application form | SLB-004 |
| APP-02 | Select or enter a student | Show the matched contact, existing student applications and a new-application path | Email verification | View, resume or start application | SLB-005 |
| APP-03 | Online enrolment form | Collect and display the complete application, evidence, agreements, permissions and signatures | Student selection | Pending signatures or submitted application | SLB-003 |

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
  action. Submitted records expose View; Not Started records expose Start.
- A separate new-enrolment path asks for required student first and last names and
  keeps Start disabled while those fields are empty.
- The screen demonstrates that one verified contact can have multiple student or
  application records in different states.

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
- The mobile number was shown in the matched contact row and rendered by the
  application phone component. The submitted application was a read-only view, so
  this capture cannot determine whether a family can edit an inherited mobile number
  while starting or completing an application.

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
| Birth certificate | Formal application | One file required in observed form; format and maximum size not shown in submitted view | Documents section | Staff recovery behaviour not observed | SLB-002, SLB-003 |
| Immunisation statement | Formal application | One file required in observed form; format and maximum size not shown in submitted view | Documents section | Staff recovery behaviour not observed | SLB-002, SLB-003 |
| Sacramental certificates, such as a baptismal certificate | Applicable to the student | Zero files required by form; upload category remains available | Documents section | Not observed | SLB-002, SLB-003 |
| Temporary or permanent residency-status document | Applicable to the student | Not stated | Suggested upload at the end of the online application | Not yet observed | SLB-002 |
| Most recent school report and most recent NAPLAN report | Available for the student's current stage | Not stated | Suggested upload at the end of the online application | A later email requested the school report in the observed case | SLB-002, SLB-EMAIL-008 |
| Court order or restriction documentation | Applicable to the family | Not shown as a dedicated upload category in the submitted record; the application says copies must be provided when relevant | Application or later staff follow-up is not confirmed | Not observed | SLB-002, SLB-003 |
| Medical management plans or health-professional reports | Applicable to the student | Zero files required by form; upload category remains available | Documents section | Not observed | SLB-002, SLB-003 |
| Proof of address | Formal application | One file required; gas, electricity or water bill requested | Documents section | Not observed | SLB-003 |
| Passport and visa documentation | Applicable to student or overseas-born parents | Zero files required by form; copy of student residency evidence and relevant parent visa/citizenship evidence requested when applicable | Documents section | Later email accepted a parent citizenship certificate or passport | SLB-003, SLB-EMAIL-008 |
| Most recent school report | Requested after staff review of the submitted application | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Parent citizenship certificate or passport | Requested after staff review; either document was accepted | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Interview calendar file | Appointment is booked | ICS calendar file | Attached to booking confirmation | Reminder email follows near the event | SLB-EMAIL-010, SLB-EMAIL-011 |

## Consent And Declaration Register

| Item | Who agrees or signs | Required when | Exact legal source identified | Process effect | Source ID |
| --- | --- | --- | --- | --- | --- |
| Promotional and informational email/SMS notice | Primary contact, by providing an email address or mobile number | Contact details are entered | No; wording is presented in the live third-party form | Treats provision of contact details as agreement to receive promotional and informational messages; promotional messages can be stopped through unsubscribe or STOP | SLB-001 |
| Enrolment and privacy document presentation | Parent or guardian | Before email verification | Enrolment Policy, MACS Enrolment Procedure, MACS Privacy Policy and Privacy Collection Notice are linked | Family is asked to familiarise themselves with the enrolment documents and read the privacy documents; no acknowledgement checkbox is visible on this screen | SLB-002 |
| Initial application signatures | All people the application identifies as required signatories | Before application submission | No; email evidence describes the workflow only | Application is not submitted until all required signatures are received | SLB-EMAIL-006 |
| Enrolment acceptance agreement | All parents or guardians recorded on the original application | After an offer is accepted | No; acceptance form wording has not been captured | Acceptance requires the recorded guardian signature set | SLB-EMAIL-012 |
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
| APP-03 | Required guardian signature is incomplete | Form status remains Pending Signatures | Yes for completed submission, based on observed state and confirmation email | Required guardian completes acknowledgement, declaration and electronic signature | SLB-003, SLB-EMAIL-006 |
| Offer response | Family does not respond within 48 hours | Offer will lapse after 48 hours | Yes, according to the offer | Exact expired-offer and staff recovery process not captured | SLB-EMAIL-012 |

## Workflow Rules

These rules are confirmed by communications but still need to be checked against the
live screens before being treated as a complete specification.

| Rule ID | Rule | Effect | Source ID |
| --- | --- | --- | --- |
| SLB-RULE-001 | The family should use the same email address used for the enquiry. | Existing enquiry information may prefill the application. | SLB-002, SLB-EMAIL-004 |
| SLB-RULE-002 | The six-digit one-time passcode is valid for 30 minutes. | An expired code cannot be used to continue; the verification screen provides Resend code and Change email actions. | SLB-004, SLB-EMAIL-005, SLB-EMAIL-013 |
| SLB-RULE-003 | All required application signatures must be received before submission. | A partly signed application remains unsubmitted. | SLB-EMAIL-006 |
| SLB-RULE-004 | A submitted application receives a unique reference, submission timestamp and view link. | The family can identify and revisit the submitted record. | SLB-EMAIL-007 |
| SLB-RULE-005 | Staff may request extra evidence after submission. | The application portal is not the only document collection channel. | SLB-EMAIL-008 |
| SLB-RULE-006 | The application interview is compulsory for the observed pathway but does not guarantee an offer. | Attendance is a progression step rather than acceptance. | SLB-EMAIL-009 |
| SLB-RULE-007 | Booking an interview generates confirmation and calendar details, followed by a reminder. | The appointment workflow supports attendance. | SLB-EMAIL-010, SLB-EMAIL-011 |
| SLB-RULE-008 | An offer provides separate accept and decline actions and states a 48-hour response window. | The family must choose a branch before the offer lapses. | SLB-EMAIL-012 |
| SLB-RULE-009 | Acceptance requires signatures from all parents or guardians recorded on the original application. | A single response may not complete acceptance. | SLB-EMAIL-012 |
| SLB-RULE-010 | The gateway advises families to prepare seven categories of evidence for upload at the end of the application. | Document readiness is established before the verified form begins. | SLB-002 |
| SLB-RULE-011 | OTP verification resolves to a contact-and-student selection screen. | A family can view a submitted application, resume a Not Started record or begin another student's application. | SLB-005 |
| SLB-RULE-012 | One verified contact can be associated with multiple student application records and statuses. | The process must not assume one contact equals one application. | SLB-005 |
| SLB-RULE-013 | The application stores separate consent and signature state for each parent or guardian. | A record may display Pending Signatures after one guardian has completed their block. | SLB-003, SLB-EMAIL-006 |
| SLB-RULE-014 | Required document counts differ by upload category. | Birth certificate, immunisation statement and proof of address required one file in the observed form; conditional categories remained available with zero required. | SLB-003 |
| SLB-RULE-015 | The electronic-signature acknowledgement states that the signer's IP address is recorded and stored. | The implementation has an explicit security/legal audit-data disclosure. | SLB-003 |
| SLB-RULE-016 | The invitation URL does not by itself expose the matched family record. | Email matching and OTP verification are still required before contact and student records appear. | SLB-002, SLB-004, SLB-005 |
| SLB-RULE-017 | Contact details shown after verification are stored record values, not values hardcoded into the invitation page or URL. | Rosewood should model reusable contact data separately from student applications and render approved inherited values at runtime. | SLB-002, SLB-003, SLB-005 |
| SLB-RULE-018 | Editable-state behavior for inherited contact values has not been observed. | Rosewood must make an explicit product decision about which prefilled fields families can update and how changes affect the master contact record. | SLB-003 |
