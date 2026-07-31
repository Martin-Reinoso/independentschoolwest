# Process Map

## Scope

Record the full observed sequence from invitation or enquiry through submission,
confirmation, document follow-up and enrolment outcome. Distinguish automatic system
behaviour from staff activity and family activity.

## Stages

| Order | Stage | Actor | Trigger | Output | Source ID | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Submit initial enquiry | Family | Family expresses interest | Enquiry record | SLB-EMAIL-001 | Interface to capture |
| 2 | Acknowledge enquiry | Enquiry Tracker | Enquiry received | Confirmation email and indicative review timing | SLB-EMAIL-001 | Captured |
| 3 | Review zone and initial eligibility | Enrolment staff | Staff reviews enquiry | Zone decision or next-step advice | SLB-EMAIL-002 | Captured |
| 4 | Consider exceptional circumstances | Enrolment staff | Out-of-zone family supplies context | Capacity-based response and possible release-letter requirement | SLB-EMAIL-002 | Captured |
| 5 | Reconfirm waitlist interest | Enrolment staff and family | Place is not yet offered | Yes or no response recorded by a deadline | SLB-EMAIL-003 | Captured |
| 6 | Issue invitation to apply | Enrolment staff via Enquiry Tracker | Family is progressed | Application link | SLB-EMAIL-004 | Captured |
| 7 | Start application with matching email | Family | Application link opened | Existing enquiry details may prefill | SLB-EMAIL-004, SLB-001 | Interface to capture |
| 8 | Verify email address | Enquiry Tracker and family | Application access begins | One-time passcode valid for 30 minutes | SLB-EMAIL-005 | Captured |
| 9 | Complete application | Family | Verification succeeds | Application data and uploaded evidence | SLB-001 | To capture |
| 10 | Obtain all required signatures | Family and other recorded signatories | Application is ready to sign | Completed signature set | SLB-EMAIL-006 | Rule captured; interface to capture |
| 11 | Submit application | Enquiry Tracker | All required signatures are received | Submitted application | SLB-EMAIL-006 | Captured |
| 12 | Confirm receipt | Enquiry Tracker | Application is submitted | Receipt, unique reference, timestamp and view link | SLB-EMAIL-007 | Captured |
| 13 | Review application and identify missing evidence | Enrolment staff | Submitted application is assessed | Additional document request when needed | SLB-EMAIL-008 | Captured |
| 14 | Supply and acknowledge extra documents | Family and enrolment staff | Document request is received | Email attachments and staff receipt confirmation | SLB-EMAIL-008 | Captured |
| 15 | Shortlist for interview | Enrolment staff via Enquiry Tracker | Application progresses | Interview invitation | SLB-EMAIL-009 | Captured |
| 16 | Book interview | Family | Invitation link opened | Selected appointment | SLB-EMAIL-009 | Interface to capture |
| 17 | Confirm interview booking | Enquiry Tracker | Appointment is booked | Confirmation email and calendar file | SLB-EMAIL-010 | Captured |
| 18 | Remind family | Enquiry Tracker | Interview approaches | Reminder email | SLB-EMAIL-011 | Captured |
| 19 | Attend and assess interview | Family and school | Appointment occurs | Enrolment assessment outcome | SLB-EMAIL-009 | Inferred; assessment method unknown |
| 20 | Issue offer | Enrolment staff via Enquiry Tracker | School approves a place | Offer with acceptance and decline options | SLB-EMAIL-012 | Captured |
| 21 | Accept or decline | Family | Offer is received | Branch selection within 48 hours | SLB-EMAIL-012 | Rule captured; interface to capture |
| 22 | Complete acceptance signatures | All parents or guardians recorded on application | Acceptance selected | Signed enrolment acceptance form | SLB-EMAIL-012 | Rule captured; interface to capture |
| 23 | Complete post-acceptance onboarding | School and family | Acceptance is complete | Onboarding communications and school-readiness tasks | | To capture |

## Conditional Branches

| Branch ID | Condition | Path A | Path B | Source ID |
| --- | --- | --- | --- | --- |
| SLB-BR-001 | Applicant is outside the priority zone | Advise that the zoned Catholic school is the expected pathway | Consider exceptional circumstances, capacity and a possible release letter | SLB-EMAIL-002 |
| SLB-BR-002 | Family is asked to reconfirm interest | Yes: retain or progress the record | No or no response: outcome not yet observed | SLB-EMAIL-003 |
| SLB-BR-003 | Application review identifies missing evidence | Request documents by email and continue after receipt | Continue without an additional request | SLB-EMAIL-008 |
| SLB-BR-004 | Family receives an interview invitation | Book and attend | Reply that the family is no longer interested | SLB-EMAIL-009 |
| SLB-BR-005 | School makes an offer | Accept and obtain all required guardian signatures | Decline the place | SLB-EMAIL-012 |
| SLB-BR-006 | No response is received within the offer window | Outcome not yet observed | Timely response continues the selected branch | SLB-EMAIL-012 |

## Open Questions

- What fields, declarations, uploads and validation appear in the initial enquiry and application interfaces?
- Can a family save and return?
- How does a second parent or guardian receive and complete a signature request?
- What is displayed after OTP expiry, failed verification or an interrupted session?
- What caused the duplicate application invitation on consecutive days?
- What criteria and staff actions determine interview shortlisting and the final offer?
- What appears on the acceptance and decline pages before a family commits?
- What happens when the 48-hour offer window expires?
- What emails, documents, payments or onboarding tasks follow acceptance?
