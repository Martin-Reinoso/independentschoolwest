# Rosewood Enrolment V6

V6 is the Rosewood College enrolment interface at:

```text
pages/rosewood-enrolment-v6.html
```

It rebuilds V5 from the field-by-field St Lawrence audit rather than reusing V5's
mixed workflow components. The visible design is Rosewood-branded; the workflow,
questions, section order and observed interaction states are mapped from the captured
St Lawrence evidence.

## URLs

```text
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=eoi
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=acceptance
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=signing
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=decline
https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html
```

Add `&review=1` to reveal the internal frame selector. The normal family-facing URLs
do not show workflow-switching or direct frame navigation.

The EOI URL is live. Application is invitation-only and requires the unique token sent
by staff; the generic Application URL cannot open a family record. Acceptance, signing
review and decline remain non-writing previews.

The last URL is the no-index staff operations portal. Access is restricted by an
allowlisted email OTP and currently covers EOI and Application for Enrolment only.

## Scope

- one-page Expression of Interest
- invited application gateway, OTP frame and record selector for EOI-linked and direct
  staff invitations
- five-step application
- separate offer-acceptance gateway, selector and five-step Enrolment Agreement
- independent guardian identity, OTP, Introduction, Your Details, Review, Sign,
  Thank You and immutable Signed Form frames
- separate decline gateway, selector and three-step decline form
- responsive desktop and mobile presentation
- required-field, repeatable-record, conditional, fee and signature interactions
- the complete 444-entry ABS ASCL 2025 Main Language catalogue

## Backend Boundary

EOI and Application for Enrolment now use the production V6 backend documented in
`backend/README.md`. It sends real OTP and workflow emails, saves application drafts,
records application signatures and documents in restricted Google Drive folders and
writes normalized reporting projections to private Google Sheets owned by
`info@ffe.org.au`. DynamoDB is authoritative for operational records; the Sheets are
replaceable reports rather than the application database. GuardDuty and active S3
document storage are outside the launch scope.

The browser still does not use cookies, local storage, session storage or IndexedDB.
Application access tokens and verified sessions remain in memory. Acceptance, decline
and post-offer Enrolment Agreement frames cannot write to the backend, send messages or
create records.

The staff portal also keeps its two-hour session in memory only. It displays operational
summaries, creates direct or EOI-linked invitations, rotates tokens when resending and
provides audited application review. It lists document metadata but does not create
document-sharing links; authorised staff access documents through the restricted
enrolment Drive. Viewers cannot create invitations.
The portal does not show raw invitation links, signature drawings or network
fingerprints and does not link staff directly into editable Sheets.

V6 is hidden from site navigation and the sitemap and has `noindex`. Its URL is still
public and is not an access-control boundary.

`PRODUCT-DECISIONS.md` is the permanent implementation register for direct invitations,
the staff portal, OTP throttling, excluded fields and application/agreement
boundaries. `SES-PRODUCTION-READINESS.md` records the transactional sender contract and
completed AWS canaries. `ARCHITECTURE-HARDENING.md` and `RECOVERY-RUNBOOK.md` record the
Sydney-only protection and restore model. `DATA-PROCESS-MAP.md` provides the
stakeholder-facing general workflow, section-level data flows, access matrix and
live/preview boundaries. See these records together with
`SOURCE-COMPLIANCE.md`, `TESTING.md`, `STAFF-PORTAL-RUNBOOK.md` and
`RELEASE-BLOCKERS.md` before inviting real families.
