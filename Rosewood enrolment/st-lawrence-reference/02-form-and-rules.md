# Form, Rules, Documents And Consent Register

## Screen Register

| Screen ID | Screen title | Purpose | Previous | Next | Source ID |
| --- | --- | --- | --- | --- | --- |
| EOI-01 | Expression of Interest Form | Collect initial family, student and proposed-enrolment information | Public enrolment page | Enquiry acknowledgement | SLB-001 |

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

## Document Register

| Document | Required when | Format or limit | Collection point | Follow-up if missing | Source ID |
| --- | --- | --- | --- | --- | --- |
| Most recent school report | Requested after staff review of the submitted application | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Parent citizenship certificate or passport | Requested after staff review; either document was accepted | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Interview calendar file | Appointment is booked | ICS calendar file | Attached to booking confirmation | Reminder email follows near the event | SLB-EMAIL-010, SLB-EMAIL-011 |

## Consent And Declaration Register

| Item | Who agrees or signs | Required when | Exact legal source identified | Process effect | Source ID |
| --- | --- | --- | --- | --- | --- |
| Promotional and informational email/SMS notice | Primary contact, by providing an email address or mobile number | Contact details are entered | No; wording is presented in the live third-party form | Treats provision of contact details as agreement to receive promotional and informational messages; promotional messages can be stopped through unsubscribe or STOP | SLB-001 |
| Initial application signatures | All people the application identifies as required signatories | Before application submission | No; email evidence describes the workflow only | Application is not submitted until all required signatures are received | SLB-EMAIL-006 |
| Enrolment acceptance agreement | All parents or guardians recorded on the original application | After an offer is accepted | No; acceptance form wording has not been captured | Acceptance requires the recorded guardian signature set | SLB-EMAIL-012 |

## Validation And Error Behaviour

| Screen ID | Trigger | Message | Blocks progress | Recovery | Source ID |
| --- | --- | --- | --- | --- | --- |
| EOI-01 | A required field is incomplete | Required fields are marked with an asterisk | Not tested against the live submission action | Complete the field; exact inline errors were not tested | SLB-001 |
| EOI-01 | Automated-submission protection is invoked | Invisible reCAPTCHA is present | Not tested | Not tested | SLB-001 |
| Application access | One-time passcode is more than 30 minutes old | Passcode expires after 30 minutes | Yes | Request or receive a new code; exact interface not captured | SLB-EMAIL-005 |
| Offer response | Family does not respond within 48 hours | Offer will lapse after 48 hours | Yes, according to the offer | Exact expired-offer and staff recovery process not captured | SLB-EMAIL-012 |

## Email-Derived Workflow Rules

These rules are confirmed by communications but still need to be checked against the
live screens before being treated as a complete specification.

| Rule ID | Rule | Effect | Source ID |
| --- | --- | --- | --- |
| SLB-RULE-001 | The family should use the same email address used for the enquiry. | Existing enquiry information may prefill the application. | SLB-EMAIL-004 |
| SLB-RULE-002 | The one-time passcode is valid for 30 minutes. | An expired code cannot be used to continue. | SLB-EMAIL-005 |
| SLB-RULE-003 | All required application signatures must be received before submission. | A partly signed application remains unsubmitted. | SLB-EMAIL-006 |
| SLB-RULE-004 | A submitted application receives a unique reference, submission timestamp and view link. | The family can identify and revisit the submitted record. | SLB-EMAIL-007 |
| SLB-RULE-005 | Staff may request extra evidence after submission. | The application portal is not the only document collection channel. | SLB-EMAIL-008 |
| SLB-RULE-006 | The application interview is compulsory for the observed pathway but does not guarantee an offer. | Attendance is a progression step rather than acceptance. | SLB-EMAIL-009 |
| SLB-RULE-007 | Booking an interview generates confirmation and calendar details, followed by a reminder. | The appointment workflow supports attendance. | SLB-EMAIL-010, SLB-EMAIL-011 |
| SLB-RULE-008 | An offer provides separate accept and decline actions and states a 48-hour response window. | The family must choose a branch before the offer lapses. | SLB-EMAIL-012 |
| SLB-RULE-009 | Acceptance requires signatures from all parents or guardians recorded on the original application. | A single response may not complete acceptance. | SLB-EMAIL-012 |
