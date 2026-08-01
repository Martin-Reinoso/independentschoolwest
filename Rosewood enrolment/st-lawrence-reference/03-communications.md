# Communications Register

Record automatic emails, confirmation pages, reminders, staff messages and attachments.
Store raw or verbatim material only in restricted Drive. Keep this file sanitised and
paraphrased unless publication rights have been confirmed.

| Communication ID | Timing or trigger | Sender | Recipient | Subject or screen | Purpose | Key content | Attachments or links | Source ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SLB-COM-001 | Initial enquiry received | Enquiry Tracker automation | Family | Enquiry acknowledgement | Confirm receipt and set expectations | Enrolment team will follow up; Foundation applications are generally reviewed about one year before commencement | School contact link | SLB-EMAIL-001 |
| SLB-COM-002 | Initial zone review completed | Enrolment team via Enquiry Tracker | Family | Out-of-zone advice | Explain the normal enrolment pathway | Directs the family to the zoned Catholic school | School contact details | SLB-EMAIL-002 |
| SLB-COM-003 | Family provides exceptional circumstances | Enrolment staff | Family | Zone discussion reply | Clarify whether an exception may be considered | A release letter may be requested if the zoned school has no capacity; no outcome is guaranteed | None observed | SLB-EMAIL-002 |
| SLB-COM-004 | Waitlist is being reviewed | Enrolment team via Enquiry Tracker | Family | Continued-interest check | Confirm whether the family wants to remain in consideration | Requests a yes or no response by a stated deadline | Reply action | SLB-EMAIL-003 |
| SLB-COM-005 | Family is approved to progress | Enrolment team via Enquiry Tracker | Family | Invitation to apply | Open the formal application stage | Instructs the family to use the same email so enquiry data can prefill | Application link; duplicate dispatch observed | SLB-EMAIL-004 |
| SLB-COM-006 | Application access requested | Enquiry Tracker automation | Family | Verification code for the school enrolment form | Verify application access | Six-digit one-time code; ignore if not requested; code expires after 30 minutes; message is automatically generated and cannot receive replies | No link observed; family returns to the browser page where the code was requested | SLB-EMAIL-005, SLB-EMAIL-013 |
| SLB-COM-007 | Last required application signature received | Enquiry Tracker automation | Family | All signatures complete | Confirm that the application can now be submitted | Submission occurs only after all required signatures are received | None observed | SLB-EMAIL-006 |
| SLB-COM-008 | Application submitted | Enquiry Tracker automation | Family | Application receipt | Confirm successful submission and provide a reference | Includes a unique ID, timestamp and expected follow-up according to starting year | View-submitted-application link | SLB-EMAIL-007 |
| SLB-COM-009 | Staff review identifies additional evidence | Enrolment team via Enquiry Tracker | Family | Document request | Complete the evidence record | Requests the latest school report and either a parent citizenship certificate or passport | Reply-by-email instruction | SLB-EMAIL-008 |
| SLB-COM-010 | Family supplies requested evidence | Enrolment staff | Family | Document receipt confirmation | Close the immediate document follow-up | Confirms that attachments were received | None observed | SLB-EMAIL-008 |
| SLB-COM-011 | Application is shortlisted | Enrolment team via Enquiry Tracker | Family | Interview invitation | Arrange the application interview | Attendance is compulsory but does not guarantee an offer; family should reply if no longer interested | Event booking link | SLB-EMAIL-009 |
| SLB-COM-012 | Family books an interview | Enquiry Tracker automation | Family | Booking confirmation | Confirm appointment details | Provides time and school location | Calendar file and event details | SLB-EMAIL-010 |
| SLB-COM-013 | Interview is approaching | Enquiry Tracker automation | Family | Event reminder | Reduce missed appointments | Restates the upcoming booking details | Event details | SLB-EMAIL-011 |
| SLB-COM-014 | School approves a place | Enrolment team via Enquiry Tracker | Family | Offer of place | Obtain an acceptance or decline decision | Acceptance requires all recorded parent or guardian signatures; offer states a 48-hour response window | Separate acceptance and decline links | SLB-EMAIL-012 |
| SLB-COM-015 | Current guardian submits a form that requires another signature | Enquiry Tracker automation | Additional guardian | Signature required | Obtain an independent guardian signature | Names the relevant form and says the recipient's signature is now required | Unique signed Contact Portal task link | SLB-EMAIL-014, SLB-EMAIL-015 |
| SLB-COM-016 | Additional guardian opens a signing task and passes the invisible bot check | Enquiry Tracker automation | Additional guardian | Contact Portal login code | Verify access before exposing the signing task | Six-digit one-time code; ignore if not requested; expires after 30 minutes | No link; guardian returns to the open Contact Portal | SLB-EMAIL-016, SLB-EMAIL-019 |
| SLB-COM-017 | Additional guardian signs the historical application | Enquiry Tracker automation | Additional guardian | Thank you for signing | Confirm that the individual signature was stored | States that the signature was successfully recorded | None observed | SLB-EMAIL-017 |
| SLB-COM-018 | Last historical application signature is received | Enquiry Tracker automation | Additional guardian | All signatures complete | Confirm completion of the required signature set | States that all signatures were received and the application was submitted for school processing | None observed | SLB-EMAIL-006, SLB-EMAIL-018 |

## Sequence

| Order | Communication ID | Depends on | Automatic or manual | Family action required |
| --- | --- | --- | --- | --- |
| 1 | SLB-COM-001 | Initial enquiry | Automatic | Wait for or respond to school follow-up |
| 2 | SLB-COM-002 | Zone review | Staff-triggered template, inferred | Follow the zoned pathway or provide relevant circumstances |
| 3 | SLB-COM-003 | Family reply to zone advice | Manual staff reply | Supply any further information requested |
| 4 | SLB-COM-004 | Waitlist review | Staff-triggered template, inferred | Reply yes or no by the deadline |
| 5 | SLB-COM-005 | Continued interest and staff progression | Staff-triggered template, inferred | Open the application using the same email address |
| 6 | SLB-COM-006 | Application access | Automatic | Enter the code within 30 minutes |
| 7 | SLB-COM-007 | All required signatures | Automatic | No immediate action stated |
| 8 | SLB-COM-008 | Successful submission | Automatic | Retain the reference and await follow-up |
| 9 | SLB-COM-009 | Staff document review | Staff-triggered template, inferred | Reply with requested evidence |
| 10 | SLB-COM-010 | Evidence supplied | Manual staff reply | No immediate action stated |
| 11 | SLB-COM-011 | Shortlisting | Staff-triggered template, inferred | Book and attend the interview, or withdraw |
| 12 | SLB-COM-012 | Interview booking | Automatic | Add or retain appointment details |
| 13 | SLB-COM-013 | Upcoming interview | Automatic | Attend the appointment |
| 14 | SLB-COM-014 | School offer decision | Staff-triggered template, inferred | Accept or decline within 48 hours |
| 15 | SLB-COM-015 | A submitted application or agreement still requires another guardian | Automatic | Open the unique signing task |
| 16 | SLB-COM-016 | Guardian signing link opened and Next succeeds | Automatic | Enter the code within 30 minutes |
| 17 | SLB-COM-017 | Historical guardian signature recorded | Automatic | No immediate action stated |
| 18 | SLB-COM-018 | Historical required-signature set completed | Automatic | No immediate action stated |

## Delivery Details

- Reply-to behaviour: system messages direct families to school contact channels;
  staff conversations use the enrolments mailbox or school Google Group.
- Reminder schedule: an interview reminder was observed approximately one day before
  the appointment.
- Failure or bounce handling: not observed.
- Staff notification: not observed.
- Application reference format: a unique application ID is included in the receipt;
  the actual family reference is restricted.
- Link delivery: system links are wrapped by an email tracking service. Active,
  family-specific URLs must never be copied into this repository.
- Passcode delivery: the verification email contains the code itself but no application
  link; it instructs the family to enter the code on the already-open web page.
- Second-guardian delivery: the signature request contains a unique, signed Contact
  Portal task URL. Its observed query structure binds a signing task, form instance,
  form template, contact, expiry, version and signature. All values are restricted.
- Historical signing outcome: the guardian received both an individual signature
  acknowledgement and a separate all-signatures-complete message at the same recorded
  time. The current acceptance has reached the OTP screen but has not been verified or
  signed by the additional guardian.
- Current verification delivery: the Contact Portal generated the current login-code
  message immediately after a successful invisible Turnstile check and verification API
  response. This confirms that the current agreement also requires OTP verification.
- Footer behaviour: system emails include an unsubscribe footer. Staff Google Group
  messages include confidentiality and cloud-service privacy wording.
