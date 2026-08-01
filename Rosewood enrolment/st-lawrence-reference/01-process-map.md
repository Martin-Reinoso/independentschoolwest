# Process Map

## Scope

Record the full observed sequence from invitation or enquiry through submission,
confirmation, document follow-up and enrolment outcome. Distinguish automatic system
behaviour from staff activity and family activity.

## Stages

| Order | Stage | Actor | Trigger | Output | Source ID | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Submit expression of interest | Family | Family completes the public single-page form | Enquiry record | SLB-001, SLB-EMAIL-001 | Interface captured; submission not tested |
| 2 | Acknowledge enquiry | Enquiry Tracker | Enquiry received | Confirmation email and indicative review timing | SLB-EMAIL-001 | Captured |
| 3 | Review zone and initial eligibility | Enrolment staff | Staff reviews enquiry | Zone decision or next-step advice | SLB-EMAIL-002 | Captured |
| 4 | Consider exceptional circumstances | Enrolment staff | Out-of-zone family supplies context | Capacity-based response and possible release-letter requirement | SLB-EMAIL-002 | Captured |
| 5 | Reconfirm waitlist interest | Enrolment staff and family | Place is not yet offered | Yes or no response recorded by a deadline | SLB-EMAIL-003 | Captured |
| 6 | Issue invitation to apply | Enrolment staff via Enquiry Tracker | Family is progressed | Application link | SLB-EMAIL-004 | Captured |
| 7 | Open private application gateway | Family | Invitation link opened | Introductory screen with policies, privacy notices, document checklist and email field | SLB-EMAIL-004, SLB-002 | Captured |
| 8 | Identify the existing enquiry | Family and Enquiry Tracker | Family enters the same email used for the EOI | Existing contact and application records are matched for possible prefill | SLB-002, SLB-005, SLB-EMAIL-004 | Confirmed after OTP: the existing contact and multiple student records were located |
| 9 | Verify email address | Enquiry Tracker and family | Application access continues | Required code field, Verify, Resend code and Change email actions; six-digit passcode valid for 30 minutes | SLB-004, SLB-EMAIL-005, SLB-EMAIL-013 | Interface and repeated email template captured |
| 10 | Select an existing student or start an application | Family | Verification succeeds | Submitted records expose View, active drafts expose Continue and the separate new-student fields expose Start | SLB-005, SLB-007 | Captured, including the new-application transition |
| 11 | Complete application | Family | Existing or new student application is opened | Start shows a brief loading indicator and then opens the five editable steps directly; only the typed new-student names were prefilled in the observed fresh draft | SLB-003, SLB-006, SLB-007 | Editable, new-draft and submitted states captured |
| 12 | Obtain all required signatures | Family and other recorded signatories | Application is ready to sign | First guardian signs locally; each additional contactable guardian receives a dedicated signed Contact Portal task link; status can remain Pending Signatures | SLB-003, SLB-006, SLB-EMAIL-015 | Local signature behavior and separate request delivery directly captured |
| 12A | Verify additional guardian | Enquiry Tracker and additional guardian | Guardian opens the signing task | Contact Portal issues a six-digit passcode valid for 30 minutes | SLB-EMAIL-016 | Historical application email captured; access screen itself remains to capture |
| 12B | Confirm individual guardian signature | Enquiry Tracker | Guardian completes the historical signing task | Successful-signature acknowledgement | SLB-EMAIL-017 | Email captured; signing screen remains to capture |
| 13 | Submit application | Enquiry Tracker | All required signatures are received | Application is submitted for school processing and all-signatures-complete notices are sent | SLB-EMAIL-006, SLB-EMAIL-018 | Captured from both guardian perspectives |
| 14 | Confirm receipt | Enquiry Tracker | Application is submitted | Receipt, unique reference, timestamp and view link | SLB-EMAIL-007 | Captured |
| 15 | Review application and identify missing evidence | Enrolment staff | Submitted application is assessed | Additional document request when needed | SLB-EMAIL-008 | Captured |
| 16 | Supply and acknowledge extra documents | Family and enrolment staff | Document request is received | Email attachments and staff receipt confirmation | SLB-EMAIL-008 | Captured |
| 17 | Shortlist for interview | Enrolment staff via Enquiry Tracker | Application progresses | Interview invitation | SLB-EMAIL-009 | Captured |
| 18 | Book interview | Family | Invitation link opened | Selected appointment | SLB-EMAIL-009 | Interface to capture |
| 19 | Confirm interview booking | Enquiry Tracker | Appointment is booked | Confirmation email and calendar file | SLB-EMAIL-010 | Captured |
| 20 | Remind family | Enquiry Tracker | Interview approaches | Reminder email | SLB-EMAIL-011 | Captured |
| 21 | Attend and assess interview | Family and school | Appointment occurs | Enrolment assessment outcome | SLB-EMAIL-009 | Inferred; assessment method unknown |
| 22 | Issue offer | Enrolment staff via Enquiry Tracker | School approves a place | Offer with acceptance and decline options | SLB-EMAIL-012 | Captured |
| 23 | Accept or decline | Family | Offer is received | Both choices open purpose-specific email-matching gateways with privacy links; after verification, each route locates the reusable contact and presents matched students | SLB-EMAIL-012, SLB-008, SLB-009, SLB-015 | Both gateways and matched-record screens captured |
| 23D | Verify decline access | Enquiry Tracker and family | Family selects Decline and enters the previously used email | Standard OTP screen with Verify, Resend code and Change email; verified contact and student records appear without a visible route change | SLB-015 | Captured; OTP excluded |
| 24D | Start or continue a decline record | Family | A matched student is selected | Start creates a separate decline draft and changes the row to `In Progress`/Continue; Continue opens the three-step form after a short delay | SLB-016 | Captured without changing form values |
| 25D | Complete decline form | Parent or guardian | Decline draft is open | Student decline reason and destination school, guardian details and signed declaration | SLB-016 | Form mapped read-only; final confirmation and completion not captured |
| 24 | Start or continue an enrolment agreement | Family | A matched student is selected | A separate acceptance record changes from `Not Started`/Start to `In Progress`/Continue; Continue briefly shows a progress bar then opens a distinct private agreement route | SLB-009, SLB-010 | Captured; source wording incorrectly calls this a new application |
| 25 | Complete acceptance conditions and signatures | All parents or guardians recorded on application | Five-step agreement is completed | Acceptance declaration, signed conduct documents, conditions, permissions and staged guardian signatures | SLB-EMAIL-012, SLB-010, SLB-014 | Current guardian submission and pending-further-signature state captured |
| 25A | Request additional acceptance signature | Enquiry Tracker | Current guardian submits while another signature is required | Dedicated Enrolment Agreement signature-request email with a unique Contact Portal task link | SLB-EMAIL-014 | Email captured and link opened under authorisation |
| 25B | Verify additional acceptance guardian | Enquiry Tracker and additional guardian | Guardian opens the signed task link, confirms the prefilled email and selects Next | Invisible Turnstile validation and a successful verification API request replace the identity form with an OTP field on the same URL; a six-digit code valid for 30 minutes is emailed | SLB-017, SLB-EMAIL-019 | Identity gateway, transition, current email and OTP screen captured; code excluded from the repository |
| 25C | Confirm additional guardian details | Additional guardian | OTP verification succeeds | A separate five-stage Sign Form route opens; Introduction leads to prefilled editable details and a required confirmation; Next performs a blocking authenticated save | SLB-018, SLB-019 | Captured without editing a contact value |
| 25D | Review agreement before remote signature | Additional guardian | Details save succeeds | Complete agreement is rendered read-only; a reviewed-and-ready checkbox gates Sign | SLB-019, SLB-020 | Captured; the disabled Pending Signature preview is confusing because signing occurs on the next page |
| 25E | Prepare additional acceptance signature | Additional guardian | Review confirmation succeeds and Next is selected | Dedicated Sign stage provides optional comments, two declarations, a locked signature canvas, automatic date and gated Next | SLB-020 | Interface captured without changing a signing control |
| 25F | Complete additional acceptance signature | Additional guardian | Declarations and signature are completed | Thank You stage, completion outcome and final notices | SLB-EMAIL-017, SLB-EMAIL-018 | Current completion interface and copy to capture; historical emails evidence the pattern |
| 26 | Complete post-acceptance onboarding | School and family | Acceptance is complete | Onboarding communications and school-readiness tasks | | To capture |

## Conditional Branches

| Branch ID | Condition | Path A | Path B | Source ID |
| --- | --- | --- | --- | --- |
| SLB-BR-001 | Applicant is outside the priority zone | Advise that the zoned Catholic school is the expected pathway | Consider exceptional circumstances, capacity and a possible release letter | SLB-EMAIL-002 |
| SLB-BR-002 | Family is asked to reconfirm interest | Yes: retain or progress the record | No or no response: outcome not yet observed | SLB-EMAIL-003 |
| SLB-BR-003 | Application review identifies missing evidence | Request documents by email and continue after receipt | Continue without an additional request | SLB-EMAIL-008 |
| SLB-BR-004 | Family receives an interview invitation | Book and attend | Reply that the family is no longer interested | SLB-EMAIL-009 |
| SLB-BR-005 | School makes an offer | Accept and obtain all required guardian signatures | Verify access, create a separate decline draft and complete a three-step decline form | SLB-EMAIL-012, SLB-015, SLB-016 |
| SLB-BR-006 | No response is received within the offer window | Outcome not yet observed | Timely response continues the selected branch | SLB-EMAIL-012 |
| SLB-BR-007 | A required field remains incomplete when the family changes application steps | Navigation continues and the departed marker shows `Missing required fields.` | Completing the step avoids or clears its error state | SLB-006 |
| SLB-BR-008 | A Yes/No or Other answer activates dependent details | Repeatable sibling/relative, additional-needs, residency, postal or alumni fields appear | The dependent section stays hidden or not applicable | SLB-006 |
| SLB-BR-009 | An additional guardian may be contacted about the student | The guardian can receive a separate signature request | `No, do not contact them` suppresses school communication and signature email | SLB-006 |
| SLB-BR-010 | Family selects Add Contact in the agreement | Insert and autosave an expanded blank additional guardian with required-field errors | Do not add another guardian | SLB-013 |

## Open Questions

- Does pressing Next on the gateway always send a new OTP? Returning users are shown existing Submitted and Not Started records, but other record states remain unknown.
- Does the opaque invitation URL identify an individual family, a campaign, a school/form configuration or some combination? The link appears invitation-specific, but email plus OTP was still required before family records were exposed.
- Do edits to inherited contact values update the reusable contact master record, only the application snapshot or both?
- Does the observed autosaved draft reliably resume after expiry, logout or a new
  browser session, and what support recovery is available?
- What exact signing screen follows successful verification of the additional guardian's Contact Portal task?
- Which create-draft API request is made by Start, and when does the new route become a visible In Progress row? Chrome exposed the route transition but not its low-level network event stream during this capture.
- What is displayed after OTP expiry, failed verification or an interrupted session?
- What security challenge is shown when Cloudflare Turnstile or invisible reCAPTCHA requires user interaction?
- What caused the duplicate application invitation on consecutive days?
- What criteria and staff actions determine interview shortlisting and the final offer?
- What appears on the acceptance and decline pages before a family commits?
- Does the acceptance guardian receive the full agreement, a signature-only view or a
  different view after the now-captured Contact Portal OTP step?
- Why does the acceptance selector expose three student records with Start actions, and
  are all three backed by active offers or merely associated with the matched contact?
- Does the acceptance screen's Last Updated value come from the student, application,
  offer or agreement record?
- What happens when the 48-hour offer window expires?
- What emails, documents, payments or onboarding tasks follow acceptance?
