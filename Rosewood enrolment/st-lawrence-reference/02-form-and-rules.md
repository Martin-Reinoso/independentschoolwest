# Form, Rules, Documents And Consent Register

## Screen Register

| Screen ID | Screen title | Purpose | Previous | Next | Source ID |
| --- | --- | --- | --- | --- | --- |

## Field Register

| Screen ID | Field | Type | Required | Options or format | Conditional logic | Validation or help text | Source ID |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Document Register

| Document | Required when | Format or limit | Collection point | Follow-up if missing | Source ID |
| --- | --- | --- | --- | --- | --- |
| Most recent school report | Requested after staff review of the submitted application | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Parent citizenship certificate or passport | Requested after staff review; either document was accepted | Not stated | Reply to enrolment email | Staff confirms receipt; further escalation not observed | SLB-EMAIL-008 |
| Interview calendar file | Appointment is booked | ICS calendar file | Attached to booking confirmation | Reminder email follows near the event | SLB-EMAIL-010, SLB-EMAIL-011 |

## Consent And Declaration Register

| Item | Who agrees or signs | Required when | Exact legal source identified | Process effect | Source ID |
| --- | --- | --- | --- | --- | --- |
| Initial application signatures | All people the application identifies as required signatories | Before application submission | No; email evidence describes the workflow only | Application is not submitted until all required signatures are received | SLB-EMAIL-006 |
| Enrolment acceptance agreement | All parents or guardians recorded on the original application | After an offer is accepted | No; acceptance form wording has not been captured | Acceptance requires the recorded guardian signature set | SLB-EMAIL-012 |

## Validation And Error Behaviour

| Screen ID | Trigger | Message | Blocks progress | Recovery | Source ID |
| --- | --- | --- | --- | --- | --- |
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
