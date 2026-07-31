# Rosewood Decisions

Every material St Lawrence feature should receive an explicit Rosewood disposition.

## Decision Values

- Adopt: use substantially the same process outcome.
- Adapt: retain the purpose but change the implementation or wording.
- Defer: reconsider at a defined later stage.
- Reject: intentionally exclude.
- Pending: more evidence or approval is required.

## Decision Register

| Decision ID | St Lawrence feature | Evidence source | Rosewood disposition | Rationale | Owner or approver | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| RWD-001 | Immediate enquiry acknowledgement | SLB-EMAIL-001 | Pending | Families benefit from confirmation and clear timing expectations. | Rosewood enrolment lead | Draft Rosewood-specific timing and contact wording. |
| RWD-002 | Zone and waitlist review before application | SLB-EMAIL-002, SLB-EMAIL-003 | Pending | Rosewood needs its own eligibility, priority and capacity policy before adopting this gate. | Rosewood governance | Define the approved admissions pathway and escalation rules. |
| RWD-003 | Invitation-only application link | SLB-EMAIL-004 | Pending | This matches the proposed controlled-access model but needs secure token and expiry rules. | Rosewood governance and technical lead | Compare with the current invitation-token design. |
| RWD-004 | Same-email application prefill | SLB-EMAIL-004 | Pending | Prefill reduces repetition but creates identity, consent and data-matching risks. | Rosewood privacy and technical leads | Define the minimum safe enquiry-to-application data transfer. |
| RWD-005 | Email one-time passcode | SLB-EMAIL-005 | Pending | OTP can improve access control but requires expiry, retry and support procedures. | Rosewood technical lead | Evaluate against token-only access and document the recovery path. |
| RWD-006 | Multi-party signatures before submission | SLB-EMAIL-006 | Pending | The signing model may support consent requirements but must follow Rosewood-approved legal wording. | Rosewood governance | Confirm required signatories and independent signing workflow. |
| RWD-007 | Submission reference and view link | SLB-EMAIL-007 | Pending | A receipt and durable reference improve family confidence and support. | Rosewood enrolment and technical leads | Define safe access to submitted records. |
| RWD-008 | Additional evidence requested through ordinary email | SLB-EMAIL-008 | Pending | The process is simple but may not be appropriate for sensitive identity documents. | Rosewood privacy lead | Decide whether restricted Google Drive collection should replace email attachments. |
| RWD-009 | Compulsory interview booking with calendar confirmation and reminder | SLB-EMAIL-009 to SLB-EMAIL-011 | Pending | Structured scheduling supports attendance, but the interview purpose and assessment rules must be transparent. | Rosewood enrolment lead | Define interview policy, booking method and reminder schedule. |
| RWD-010 | Separate accept and decline actions | SLB-EMAIL-012 | Pending | Explicit branches provide a clear outcome and enable follow-up. | Rosewood enrolment lead | Capture both interfaces and define confirmation messages. |
| RWD-011 | Offer expires after 48 hours | SLB-EMAIL-012 | Pending | A short deadline may assist capacity planning but could create accessibility and fairness concerns. | Rosewood governance | Approve a response window and exception process. |
| RWD-012 | All recorded guardians sign the acceptance agreement | SLB-EMAIL-012 | Pending | This may strengthen the acceptance record but requires legal and operational review. | Rosewood governance | Confirm guardian rules, disputes, court orders and incomplete signatures. |

## Principles

- Evidence of another school's process is a reference, not automatic authority.
- Rosewood wording must reflect its own governance, policies and operating model.
- Legal, privacy and consent content must identify an approved Rosewood source.
- The static walkthrough documents process behaviour and must not become an
  unreviewed production form.
