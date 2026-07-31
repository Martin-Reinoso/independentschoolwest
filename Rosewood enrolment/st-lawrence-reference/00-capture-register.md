# Capture Register

Use one row for every form, page, email, document, screenshot or interview note.
Do not include active access links, tokens or personal information.

| ID | Source type | Title or stage | Observed date | Raw Drive location | Sanitised | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SLB-001 | Public live form | Expression of Interest Form | 2026-07-31 | Public school website | Yes | Read-only Chrome review completed. No data was entered and the form was not submitted. |
| SLB-002 | Invited live form | Application gateway | 2026-07-31 | Restricted live system | Yes | Sanitised read-only capture completed. The family-specific access link is excluded; email was not entered and Next was not pressed. |
| SLB-003 | Verified live form | Submitted online application view | 2026-07-31 | Restricted live system | Yes | Complete single-page read-only application captured. Family answers, addresses, medical identifiers, uploads, tracking ID, signatures and access data are excluded. |
| SLB-004 | Invited live form | Email verification screen | 2026-07-31 | Restricted live system | Yes | Sanitised Chrome capture completed. OTP, email and security keys are excluded. |
| SLB-005 | Verified live form | Contact and student selection | 2026-07-31 | Restricted live system | Yes | Existing contact, student records, application statuses and start/view actions captured without retaining personal row data. |
| SLB-006 | Verified editable form | Five-step online enrolment application | 2026-07-31 | Restricted live system | Yes | All five steps, navigation, field types, principal option catalogues, conditional branches, validation states, upload rules and signature behavior captured in an authorised test draft. No upload, signature or submission occurred. |
| SLB-007 | Verified live transition | Start a new student application | 2026-08-01 | Restricted live system | Yes | The authorised Start action was observed from typed synthetic student names through a brief loading state to a distinct five-step application route. Private route identifiers are excluded; no further data, upload, signature or submission was provided. |
| SLB-008 | Invited live form | Offer acceptance gateway and first transition | 2026-08-01 | Restricted live system | Yes | Gateway content, privacy links, required Email field and Next behavior captured. After one authorised click, the button remained disabled on `Sending...`; no OTP or acceptance form was reached and no retry occurred. Active link and recipient address are excluded. |
| SLB-009 | Verified live form | Acceptance contact and student selection | 2026-08-01 | Restricted live system | Yes | One reusable contact and three student rows were displayed. Every enrolment agreement was `Not Started` with a Start action, including a student whose earlier application had been submitted. This confirms acceptance status is separate from application status. Personal row values and the active link are excluded. |
| SLB-010 | Verified live form | Continue transition and five-step enrolment agreement | 2026-08-01 | Restricted live system | Yes | Continue changed the acceptance row from its selector into a distinct private agreement route via a brief progress bar. Student, Parent/Guardian, Documents, Conditions and Signature steps, save state, validation markers, bundled messaging notice, conduct-document requirements and staged second-guardian signature message were captured read-only. No value, upload, signature or submission was changed. |
| SLB-011 | Verified live interaction | Expand second agreement contact | 2026-08-01 | Restricted live system | Yes | The authorised second-contact accordion click kept the first contact expanded, replaced the collapsed name/error summary with a full editable Primary Information panel, exposed contact permission and Remove, and left Add Contact below both panels. No contact value or selection was changed. |
| SLB-DOC-001 | PDF | St Lawrence Enrolment Policy | 2026-07-31 | Public source and repository snapshot | Yes | Six-page third-party reference snapshot; source URL and hash recorded. |
| SLB-DOC-002 | PDF | Enrolment Procedures for MACS Schools | 2026-07-31 | Public source and repository snapshot | Yes | Nine-page third-party reference snapshot; source URL and hash recorded. |
| SLB-DOC-003 | PDF | MACS Privacy Policy | 2026-07-31 | Public source and repository snapshot | Yes | Ten-page third-party reference snapshot; source URL and hash recorded. |
| SLB-DOC-004 | PDF | Privacy Collection Notice - Students and Parents | 2026-07-31 | Public source and repository snapshot | Yes | Seven-page third-party reference snapshot; source URL and hash recorded. |
| SLB-WALK-001 | Static HTML | Process map, EOI, gateway, OTP, contact selection and application replicas | 2026-07-31 | Public repository | Yes | No backend, production endpoint, tokens, persistence or uploads. Uncaptured screens are marked pending. |
| SLB-EMAIL-001 | Email | Enquiry acknowledgement | 2026-06-05 | Restricted Gmail mailbox | Yes | Automated acknowledgement and indicative review timing. |
| SLB-EMAIL-002 | Email thread | Zone decision and exception discussion | 2026-06-09 to 2026-06-10 | Restricted Gmail mailbox | Yes | Staff explained the out-of-zone position, capacity limits and possible release-letter path. |
| SLB-EMAIL-003 | Email thread | Waitlist interest reconfirmation | 2026-06-16 to 2026-06-24 | Restricted Gmail mailbox | Yes | Family confirmed continued interest; staff updated the record and progressed the application. |
| SLB-EMAIL-004 | Email | Invitation to apply | 2026-06-23 and 2026-06-24 | Restricted Gmail mailbox | Yes | The same invitation appears to have been sent twice. |
| SLB-EMAIL-005 | Email | One-time passcode | 2026-06-24 | Restricted Gmail mailbox | Yes | Expired code and access link are deliberately excluded. |
| SLB-EMAIL-006 | Email | All application signatures complete | 2026-06-24 | Restricted Gmail mailbox | Yes | Confirms that submission waits for all required signatures. |
| SLB-EMAIL-007 | Email | Application receipt | 2026-06-24 | Restricted Gmail mailbox | Yes | Application ID, timestamp and submitted-application link are deliberately excluded. |
| SLB-EMAIL-008 | Email thread | Additional document request and receipt | 2026-06-25 to 2026-06-26 | Restricted Gmail mailbox | Yes | Documents were supplied by ordinary email; attachments were not opened or copied. |
| SLB-EMAIL-009 | Email | Interview invitation | 2026-07-04 | Restricted Gmail mailbox | Yes | Attendance was compulsory but did not guarantee an offer. |
| SLB-EMAIL-010 | Email | Interview booking confirmation | 2026-07-04 | Restricted Gmail mailbox | Yes | Included appointment details and a calendar file. |
| SLB-EMAIL-011 | Email | Interview reminder | 2026-07-13 | Restricted Gmail mailbox | Yes | Sent approximately one day before the booked event. |
| SLB-EMAIL-012 | Email | Offer of place | 2026-07-31 | Restricted Gmail mailbox | Yes | Active acceptance and decline links are deliberately excluded; the offer states a 48-hour response window. |
| SLB-EMAIL-013 | Email | Repeated one-time passcode request | 2026-07-31 | Restricted Gmail mailbox | Yes | Confirms the same access-verification template is sent on a later return. The live code and recipient address are deliberately excluded. |
| SLB-WALK-002 | Static HTML | Sanitised one-time passcode email replica | 2026-07-31 | Public repository | Yes | Structural reference only. It contains no recipient address, active code, private URL or tracking link. |
| SLB-WALK-003 | Static HTML | Contact selection and submitted application replicas | 2026-07-31 | Public repository | Yes | No backend, persistence, uploads, signatures or personal values. Long legal conditions are structurally mapped and linked to the archived source documents. |
| SLB-WALK-004 | Static HTML | Interactive editable-application replica | 2026-07-31 | Public repository | Yes | Five-step, non-submitting reference with synthetic placeholders, conditional branches and validation markers. It performs no network request, storage, upload, email, signature persistence or submission. |
| SLB-WALK-005 | Static HTML | Acceptance gateway, selector and five-step agreement replicas | 2026-08-01 | Public repository | Yes | Sanitised, non-submitting acceptance branch with the observed ambiguous source wording, agreement-specific statuses, transient loader, field groups and messages. Personal values, private routes and full third-party legal text are excluded. |

## Capture Status

- Not started
- In progress
- Captured
- Cross-checked
- Superseded
