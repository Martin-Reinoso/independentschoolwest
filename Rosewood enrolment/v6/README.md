# Rosewood Enrolment V6

V6 is the frontend-only Rosewood College enrolment review at:

```text
pages/rosewood-enrolment-v6.html
```

It rebuilds V5 from the field-by-field St Lawrence audit rather than reusing V5's
mixed workflow components. The visible design is Rosewood-branded; the workflow,
questions, section order and observed interaction states are mapped from the captured
St Lawrence evidence.

## Review URLs

```text
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=eoi
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=application
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=acceptance
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=signing
https://ffe.org.au/pages/rosewood-enrolment-v6.html?workflow=decline
```

Add `&review=1` to reveal the internal frame selector. The normal family-facing URLs
do not show workflow-switching or direct frame navigation.

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

## Safety Boundary

V6 has no backend. It makes no API requests and does not use cookies, local storage,
session storage or IndexedDB. It cannot send an OTP or email, save answers, upload a
file, record an IP address, create a legal signature, accept an offer or decline an
offer. The content security policy blocks connections and form actions.

V6 is hidden from site navigation and the sitemap and has `noindex`. Its URL is still
public and is not an access-control boundary.

`PRODUCT-DECISIONS.md` is the permanent implementation register for direct invitations,
the future staff portal, OTP throttling, excluded fields and application/agreement
boundaries. See it together with `SOURCE-COMPLIANCE.md`, `TESTING.md` and
`RELEASE-BLOCKERS.md` before treating any part of this review as approved production
content.
