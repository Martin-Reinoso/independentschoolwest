# Staff Review, Family Follow-up And Principal Booking Map

Status: architecture proposal for exploration; not an approved production contract.

Date: 30 August 2026

## Decision summary

Rosewood should treat the submitted Application for Enrolment as a **case** with three
connected but separately stored capabilities:

1. **Application review** — an efficient staff-only, read-only presentation of the
   authoritative submitted application.
2. **Family follow-up** — tracked requests, messages, responses and supplemental
   documents linked to the application without rewriting the signed submission.
3. **Principal meetings** — a separate appointment module linked to the application
   and family, with private family booking access.

The portal may present these capabilities together, but they should not be stored as
extra application answers. This preserves the original form revision, signatures,
audit evidence and future flexibility.

## Why application review comes first

The backend already exposes an audited staff-only application-detail route containing
the latest authoritative values, documents, signatures, signer controls and immutable
revision history. The current staff interface renders those values in a large dialog
and derives labels mechanically from internal field keys. It is technically useful,
but it is not yet a strong assessment workspace.

The urgent work is therefore primarily a **reading and case-navigation problem**, not
a new copy of the family form and not a new database migration for answers.

## Phase 1 — staff application review workspace

### Recommended experience

Selecting **Review** should open a dedicated application case page rather than a modal.
The page should prioritise scanability, comparison and follow-up:

- compact sticky header with student, application reference, entry year/level,
  application date, submission date, status and signature completion
- visible return to the filtered application list without losing list position or
  filters
- section navigation on desktop and a compact sticky section selector on mobile
- two- or three-column label/value layouts where space permits
- plain reading typography, restrained colour and less card padding than the family
  form
- human-readable labels and section order sourced from the immutable form definition,
  not guessed from storage keys
- empty optional answers omitted by default, with a staff control to reveal them
- clear `Not provided`, `Not applicable` and `No` distinctions
- dates, phone numbers, addresses and multi-select values formatted consistently
- print-friendly rendering for an authorised operational copy when required

### Proposed sections

1. **Case summary**
   - student name
   - entry year and level
   - current application/signature status
   - parent/guardian names and contact-permission status
   - staff-review flags
   - application and form versions
2. **Student details**
3. **Residence and primary address**
4. **Education and interrupted schooling**
5. **Nationality and citizenship**
6. **General/additional needs and health professionals**
7. **Medical details**
8. **Parents and guardians**
9. **Emergency contacts**
10. **Documents**
11. **Fee responsibility and application declarations**
12. **Family survey**
13. **Signatures and consent evidence**
14. **Saved revision history** — secondary operational/audit view, not mixed into the
    normal reading flow
15. **Case activity** — added in Phase 2

### Review controls

Phase 1 should remain read-only, but it should support a small operational checklist
stored separately from the application:

- Review not started
- Review in progress
- Further information required
- Ready for principal review/meeting
- On hold
- Review complete

Suggested checklist items:

- identity/birth evidence reviewed
- mandatory documents present
- guardian/signature position understood
- additional-needs information reviewed
- medical information reviewed
- residency/visa evidence reviewed where applicable
- fee responsibility recorded
- follow-up required

Each status/checklist change needs staff identity, Melbourne timestamp and audit event.
It must not change a family answer or imply an enrolment decision.

### Documents

The case page should show each required/conditional document category, submitted file
name, upload date and safety/storage status. Staff need an authorised way to open the
restricted file. That should be a controlled server action or short-lived authorised
link, not a public Drive URL stored in browser HTML.

Document review should record operational metadata separately:

- present / missing / unreadable / wrong document / expired / accepted for review
- staff note
- reviewed by and reviewed at
- replacement requested and request status

`Accepted for review` is not the same as approving enrolment or permanently validating
the document.

## Phase 2 — tracked family follow-up

### Recommended boundary

Show follow-up inside the application case because staff think in terms of one family
case. Store it as separate **communication**, **request** and **response** records.

Do not reopen or edit the submitted application when staff need:

- a missing or replacement document
- clarification of an answer
- additional supporting information
- confirmation that the application is clear
- an invitation to arrange a principal meeting

### Staff workflow

1. Staff selects **Contact family** from the case page.
2. Staff chooses a purpose:
   - Missing or replacement document
   - Clarification required
   - Additional information required
   - Principal meeting invitation
   - General application update
3. The portal offers a short approved template, editable only within safe bounded
   fields.
4. Staff chooses the authorised recipient and verifies contact permission.
5. The backend creates the request and email outbox event transactionally.
6. The case timeline shows queued, sent, delivered/delayed/bounced, opened where
   supportable, responded and closed states.
7. The family uses a private link plus email OTP to see only the request, respond and
   upload requested files.
8. Staff reviews the response and closes, reopens or follows up on the request.

### Family experience

The existing secure family status page should gain a **Requests from Rosewood** area.
It should not expose staff-only notes or reopen the complete application.

For a clarification request, preserve:

- the original submitted question and answer as read-only context
- Rosewood's question
- the family's dated response
- any attachment
- request and response timestamps

If the original answer genuinely needs correction, that should be a later, explicit
append-only correction workflow with reason, before/after values and signature impact.

For a document request, the new file is a supplemental/replacement document with its
own identifier and lineage. The original file must not silently disappear.

### Communication model

Minimum durable entities:

- `CASE#<applicationId>` — review state and current owner
- `REQUEST#<requestId>` — type, subject, approved template revision, status, due date,
  creator and closed metadata
- `MESSAGE#<messageId>` — direction, sender actor, recipient, body, created time and
  reply-to relationship
- `RESPONSE#<responseId>` — family text/attachment response and verified actor
- `DOCUMENT_REVIEW#<documentId>` — review outcome and replacement lineage
- existing outbox/email receipts — transactional delivery evidence
- append-only audit events — views, sends, responses, status changes and document access

Do not put full email addresses, message bodies or family responses in ordinary logs.

### Templates

Start with versioned templates in code/data reviewed through normal releases:

- Missing document
- Replacement document needed
- Please clarify an answer
- Additional information requested
- Application received and review complete
- Invitation to arrange a principal meeting

Do not build a general rich-text campaign editor. Rosewood needs controlled case
communications, not a marketing automation platform.

## Phase 3 — principal meeting appointments

### What School Interviews demonstrates

School Interviews presents an event-code entry followed by a short three-step booking
flow and email confirmation. It supports parent-selected times, staff phone bookings,
multiple events, timetables, code-specific links and QR codes. Its public FAQ warns
that anyone holding an event-code link can book and recommends emailed links rather
than posting sensitive event links publicly. It also lets families revisit a booking
summary and resend confirmation.

Sources:

- [School Interviews home and booking model](https://www.schoolinterviews.com.au/)
- [School Interviews FAQ, staff-assisted bookings and event-code links](https://www.schoolinterviews.com.au/faq)
- [Event-code entry page](https://www.schoolinterviews.com.au/code)
- [Enquiry Tracker: appointments or events for enrolment interviews](https://enquirytracker.zendesk.com/hc/en-us/articles/42242425143319-Should-enrolment-interviews-be-set-up-as-an-Appointment-or-an-Event)
- [Enquiry Tracker: creating appointments](https://enquirytracker.zendesk.com/hc/en-us/articles/17337847176215-Creating-Appointments)

### Recommended Rosewood design

Build appointments as a **separate bounded module** that can link to an application.
Do not store appointment slots inside application answers.

For enrolment interviews, prefer a private application-linked booking invitation over
asking the family to type their name and child name again. The private link and OTP
already establish who the family is, reduce matching errors and prevent nuisance
bookings.

A code-based path remains useful for a future general event or for families without an
application. It should be a separate event-registration mode with clear anti-abuse and
duplicate-booking controls.

### Appointment entities

- **Meeting series** — title, principal/staff member, location or video mode, booking
  window, slot duration, timezone and status
- **Availability slot** — start/end, capacity, hold/available/booked/cancelled state
- **Invitation** — application/family link, private token hash, expiry and recipient
- **Booking** — slot, application/family identity, attendee count, status and notes
- **Notification** — invitation, confirmation, reminder, change and cancellation
- **Audit event** — staff changes, family booking, rescheduling and cancellation

Use conditional writes so two families cannot book the same slot. Display and store all
times in `Australia/Melbourne`, while retaining an unambiguous UTC timestamp.

### Family booking flow

1. Family receives a private meeting invitation from the application case.
2. Family verifies the invited email if their application session is not active.
3. The page shows only available slots and meeting context.
4. Selecting a slot creates a short conditional hold.
5. Confirmation books the slot atomically.
6. The family receives email confirmation and an `.ics` calendar attachment/link.
7. The same private status page supports reschedule or cancellation until the configured
   cutoff.
8. Staff can book by phone for a family that cannot use the internet.

### Buy or build

**Use School Interviews** if Rosewood needs a reliable booking tool immediately and is
comfortable with a separate vendor, duplicate family data, vendor privacy assessment
and manual linkage back to the application. Its public site currently advertises a
small annual subscription, but its home page and FAQ describe pricing in different
currencies, so Rosewood should obtain a current written quote and review privacy/data
terms before relying on the published figure.

**Build the bounded Rosewood module** if application-linked status, one audit trail,
minimal re-entry and future automated workflow transitions are more important. At
approximately 30 applications per year, this is a small slot-allocation module, not a
general school event platform.

Recommended sequence: build Phase 1 review first, add Phase 2 follow-up, then reassess
whether the actual interview volume justifies building Phase 3 or using School
Interviews for the first intake.

## Suggested portal information architecture

```text
Applications
  Application list
    Case review
      Summary
      Submitted application
      Documents
      Signatures
      Requests and messages
      Meeting
      Activity and revisions

Meetings
  Availability
  Upcoming meetings
  Unbooked invitations
  Completed/cancelled
```

The case page is the operational centre. The Meetings area is a cross-application
calendar/register for the principal and enrolment staff.

## Delivery sequence

### Release A — readable application case

- dedicated case route
- human-readable section registry from the immutable form definition
- compact desktop/mobile reading layout
- document and signature summary
- audited access
- no mutations other than existing safe staff controls

### Release B — review state and checklist

- separate case-review entity
- assignment, review status and checklist
- staff-only notes with clear purpose and retention
- dashboard filters and attention items

### Release C — family requests and responses

- controlled templates
- transactional delivery and timeline
- secure family request page
- clarification responses and supplemental documents
- no reopening or duplicate application

### Release D — appointments

- availability and conditional slot booking
- private application-linked invitations
- confirmations, reminders, reschedule/cancel and staff-assisted booking
- cross-application meeting register

## Decisions required before implementation

1. Which staff roles may see medical, additional-needs and family-law information?
2. Should staff-only review notes contain free text, bounded categories, or both, and
   what is their retention rule?
3. Which review states are operational versus formal admissions decisions?
4. Who may send family requests and approve/change templates?
5. Which parent/guardian should receive each type of follow-up when contact permissions
   differ?
6. When does a clarification require a formal correction and renewed signature?
7. Who owns principal availability, cancellations and meeting outcomes?
8. Should the first intake use an external booking service while the integrated module
   is deferred?

## Explicit non-goals

- Do not edit the frozen submitted application in place.
- Do not use the family application form as a staff assessment UI.
- Do not add a general marketing/broadcast system.
- Do not expose restricted Drive identifiers or permanent document URLs.
- Do not treat a document checklist as an admissions decision.
- Do not implement a generic calendar platform or public event-code system before
  measured demand exists.
