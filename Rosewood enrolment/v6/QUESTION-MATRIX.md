# V6.6 Parent/Guardian And Signature Question Matrix

This matrix is the release contract for parent/guardian contact permission and
signature routing in `rosewood-application-2026.6`. It supplements the complete V6
section map in `DATA-PROCESS-MAP.md`. Earlier form contracts remain immutable.

## Applicant Questions

| Field | Family-facing wording | Required | Condition | Stored meaning | Downstream effect |
| --- | --- | --- | --- | --- | --- |
| `app_guardian_{n}_permission` | Can the school contact this person? | Yes for every additional guardian | Additional guardian exists | Exact enum: `Yes, the school may contact this person` or `No, do not contact this person` | Controls all automated email, SMS, OTP, request, resend and recovery for this person; never inferred from email/mobile |
| `app_guardian_{n}_email` | Email | Primary: yes. Additional: yes only when contact is permitted | Parent/guardian record exists | Contact email entered in the submitted answers | Copied to the signer control as `currentEmail`; post-submission correction changes the signer control, not the frozen answer revision |
| `application_additional_signature_later` | I understand that each parent or guardian marked Contact permitted will receive a separate signature request after I submit this application. | Yes | At least one additional guardian is contactable | Applicant acknowledgement | Does not itself send; submission transaction creates permitted tasks and email outbox events |
| `application_one_signature_reason` | Explanation for only one signature | Yes | Only one guardian is entered, or any additional guardian is Do not contact | Applicant explanation | Application may submit but is flagged for staff review when a listed required signer is suppressed |

When No is selected, the frontend immediately displays:

> Please note: This person will not receive messages or a separate signature request. If their signature is required, Rosewood College will contact you to discuss the next steps.

The reference to College contact means contact with the submitting applicant. It does
not authorise contact with the prohibited guardian.

## Derived Signer Controls

| Property | Source or transition | Family visibility | Staff visibility |
| --- | --- | --- | --- |
| `contactPermission` | Exact submitted enum or explicit authorised staff change | Label only | Value, changed time and staff actor |
| `signatureRequired` | Legal guardian/signature plan | Yes | Yes |
| `currentEmail` | Submitted email, then eligible pending correction | Masked | Full current value |
| `previousEmails` | Appended on pending email correction | No | Restricted history with time/requester |
| `requestGenerated` / `requestGeneration` | Submission, correction, resend or authorised No-to-Yes change | Generated/request status | Yes |
| `requestSent` / `requestSentAt` | SES send accepted from durable outbox | Yes | Yes |
| `deliveryStatus` / `deliveryAt` | `accepted_by_ses` after SES acceptance | Presented as sent | Exact operational value and time |
| `openedAt` | Current private signing route opened | Yes | Yes |
| `emailVerifiedAt` | Current signing OTP consumed | Yes | Yes |
| `signatureStatus` / `completedAt` | Suppressed, pending or complete | Yes; completed signer displays Complete | Yes |
| `signedDocumentRevision` | Frozen revision hash associated with completed signature | No | Yes |
| `previousLinkRevokedAt` | Correction, resend or Yes-to-No change | No | Yes |

## State Matrix

| Additional guardian | Email requirement | On application submission | Applicant status actions | Application result |
| --- | --- | --- | --- | --- |
| None | Not applicable | No additional task | None | `submitted` after primary signature; one-signature explanation required |
| Contact permitted | Required | Create task and request email only after submission | Correct email and rate-limited resend while pending | `pending_signatures`, then `submitted` after final required signature unless another signer is suppressed |
| Do not contact | Optional | No task, email, SMS or OTP | No correction or resend | `staff_review_required`; one-signature explanation required |
| Permitted and complete | Preserved as signing evidence | No further request | None; display Complete | Signature evidence and signed revision are immutable |

## Post-Submission Correction Inputs

| Input | Required | Security rule |
| --- | --- | --- |
| Step-up OTP | Yes | Sent only to the submitting applicant's verified application email; existing browser session alone is insufficient |
| Corrected email | Yes | Entered twice and normalised; must differ from current value |
| Replacement acknowledgement | Yes | Warns that the old link is cancelled and no application is reopened or created |
| Idempotency key | Yes | Duplicate correction returns the first result and does not generate another task/email |

Correction is allowed only for the submitting applicant, while contact is permitted and
the electronic signature is pending. The conditional transaction advances
`signatureControlRevision`, revokes the current task, creates one replacement and
records the audit/idempotency records. The old task, challenges and signing sessions
cannot access application information after the change.

## Exclusions

- No applicant edit of submitted answers.
- No duplicate application or new submitted revision.
- No applicant contact-permission change after submission.
- No applicant email correction or resend after signature completion.
- No post-signature contact-detail management.
- No automated contact with a person marked Do not contact.

# V6.7 Application Question Matrix

`rosewood-application-2026.7` supersedes the visible/required Application question
contract for new and still-editable applications. Submitted applications remain under
their original immutable definition.

| Area | V6.7 question or rule | Required/condition | Storage and downstream rule |
| --- | --- | --- | --- |
| Entry | Year the student will commence at Rosewood College | Required; 2027 is the first/default option | `entry_year`; Student projection |
| Previous education | Has the student previously attended an early learning centre, kindergarten or school? | Required; Yes reveals institution and year level | `previous_school_attended`, `previous_school_name`, `previous_school_year_level`; no contact permission is collected |
| Interrupted schooling | Has the student experienced an extended absence/interruption? | Required; Yes reveals dates/details | Student record/projection |
| Residence | Home Care Arrangement | Required single answer; Other and Shared Custody reveal their respective required details | Student record/projection |
| Countries | Residence, birth, nationality and guardian country fields | Required where identified; searchable 249+ catalogue | Stored as selected/displayed country name |
| Language | Student Main Language and guardian languages | Student main and guardian languages required; searchable datalists | Existing language keys retained |
| Sacraments | Optional sacrament date/location | Date cannot be after the Melbourne submission day | Browser `max` plus server validation |
| Immunisation | Whether the AIR Immunisation History Statement is held and will be uploaded | Required Yes/No | `immunisation`; upload remains a separate optional document category |
| Assessment | Formal assessment relating to learning, development, wellbeing or giftedness | Required; Yes requires details and report availability | Student record/projection |
| Adjustments | Current support and support that may assist at Rosewood | Optional; shown after Additional Needs Yes | Student record/projection |
| Doctor | Name, practice/address and phone | All required | Student record/projection |
| Medicare | Medicare Number and Ref Number | Both required | Separate `medicare_number` and `medicare_reference` values |
| Private insurance | Provider and policy number | Optional | Separate provider/policy values |
| Student Health Care Card | Yes/No | Required; Yes requires card number and expiry | Student record/projection |
| Guardian sharing | Share your contact details with other parents or guardians on this application? | Required for every contact | Explicit share/private answer; distinct from school contact permission |
| Guardian occupation | ACARA group and St Lawrence occupation catalogue | Both required | Guardian record/projection |
| Guardian identity | Marital status and religion | Required; ethnicity is optional | Guardian record/projection |
| Emergency contact | Relationship | Required fixed catalogue | Emergency Contacts projection |
| Conditions | Student commitments, Parent / Carer commitments, Acknowledgement | Three separate required confirmations | Conditions projection; fees, survey and previous-school permission are absent |
| Signing date | Date | Displayed read-only; authoritative value is generated by Lambda at submission | Frozen values, snapshot, revision hash and signature evidence |

## V6.7 Session And Migration Rules

- Same-tab refresh may restore an unexpired family, child-application or status session
  from an opaque `sessionStorage` token. No answers or documents are stored there.
- Family/application/status sessions still expire after 20 minutes without server
  activity and after an eight-hour absolute limit.
- **Remember me** is staff-only, opt-in and stores only the opaque staff token, email and
  expiry. The backend slides expiry to two hours after each authorised staff request.
- Opening an editable `2026.1`-`2026.6` application upgrades its definition to `2026.7`
  in one conditional transaction, preserves all answer keys, appends an immutable
  upgrade revision and audit event, and does not submit or duplicate the record.
- Submitted applications, submitted snapshots and signature evidence never upgrade.

## Deferred Post-Offer Permission

Permission to contact a previous school/preschool is not part of Application V6.7. If
Rosewood issues an offer and the family accepts it, the future post-offer Enrolment
Agreement/onboarding workflow must request that permission explicitly before any
previous institution is contacted. It must have its own form version, audit event and
consent evidence; it must not infer consent from the institution name supplied here.
