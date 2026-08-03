# Rosewood Enrolment V3

V3 is a frontend-only content and interaction prototype for the Rosewood College
enrolment application. It corrects the V2 content and visual-direction problems
without changing any backend, API, Google Sheet, Google Drive, AWS or email code.

## Preview

- Page: `pages/rosewood-enrolment-v3.html`
- Styles: `pages/rosewood-enrolment-v3.css`
- Browser behaviour: `pages/rosewood-enrolment-v3.js`
- Public path after an authorised release to the publishing branch:
  `https://ffe.org.au/pages/rosewood-enrolment-v3.html?preview=1`

The current branch does not by itself publish this URL.

## Safety Boundary

V3 deliberately has no:

- invitation validation or password/OTP flow
- API endpoint or `fetch` call
- browser `localStorage` or `sessionStorage`
- Google Sheets, Google Drive, S3 or DynamoDB integration
- file upload
- analytics or engagement writes
- email delivery
- application or signature submission

The final button displays a prototype completion page only. Reviewers must use
synthetic information and should normally navigate without entering any data.

`noindex`, `nofollow`, `noarchive` and `nosnippet` reduce accidental discovery but
are not access control. A unique invitation URL and identity verification remain
production requirements.

## Product Direction

V3 restores the V1 Rosewood identity:

- navy, terracotta, sky and cream palette
- Rosewood emblem and formal serif headings
- persistent desktop introduction with its own scrolling boundary
- introduction above the form on mobile
- plain administrative headings and instructions

The source application's five stages are retained while related information is
grouped into expandable sections:

1. Student and family information
2. Parents, guardians and emergency contacts
3. Supporting documents
4. Conditions and permissions
5. Review and signature

## Content Authority

The field and behaviour baseline is the captured St Lawrence reference process,
particularly:

- `st-lawrence-reference/05-editable-application-map.md`
- `st-lawrence-reference/02-form-and-rules.md`
- `st-lawrence-reference/04-rosewood-decisions.md`
- `st-lawrence-reference/10-signature-architecture.md`

The reference process is evidence, not Rosewood's legal authority. Every privacy,
fee, consent, retention and enrolment-agreement statement marked draft requires
Rosewood governance and qualified legal/privacy review before production.

## Intentional Corrections

- Fee responsibility uses one radio group rather than contradictory independent
  checkboxes.
- The influence survey enforces the stated maximum of three selections.
- Contact permission, legal responsibility and signature requirement are separate
  choices.
- Adding or removing a guardian clears the all-guardians confirmation.
- Review clearly states that signing occurs in the signature area.
- The application and later offer-acceptance process are explicitly separated.
- A locked signature area explains which declarations must be completed.

See `FIELD-CROSSWALK.md` for the complete content disposition.
