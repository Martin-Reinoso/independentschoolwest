# Concise primary offer email

The user approved the full singular and sibling email drafts on 8 November 2026.
Primary offers now use a singular/plural subject, name the selected children, identify
the principal letter without “personalised”, and give a short portal instruction.
A single child’s year/level is in the opening; siblings are listed immediately below it.
The portal action precedes the brief additional-signature explanation and warm closing.
The existing approved registration introduction and private-link reminder are retained.
Both HTML and plain text use the same wording, with escaped names in HTML.

Secondary requests, signature receipts, completion emails, principal letters, agreements,
contact/signature rules, immutable form versions and public assets are unchanged.
Staff preview and send render the same email; changing the reviewed wording requires
fresh review. Existing outbox payloads are frozen and are not rewritten or resent.
No real family emails are triggered by deployment or validation.

Tests cover one/two/three children, compound names, HTML escaping, selected-child scope
and agreement between the reviewed and queued email. Deployment evidence is recorded
in the associated release PR; private rollback/checks are under
`~/.local/share/ffe-private-runtime/offer-email-wording-20261108`.
