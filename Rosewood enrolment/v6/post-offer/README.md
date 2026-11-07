# Conditional offer implementation

The user wants terms in the online form and digital signatures, not a Word agreement.
The acceptance portal has no upload step. The current candidate is incomplete and not
deployed to production. The `c46a705` runtime is deployed to the separate inactive AWS test stack;
email/readiness/issuance remain disabled, with live Google/Gmail tests still pending.
See [current release gates](CURRENT-RELEASE-GATES-2026-11-08.md) for the remaining dependencies.
Follow the [completion plan and execution checkpoint](COMPLETION-TEST-AND-DEPLOYMENT-PLAN-2026-11-08.md)
for current status; older chronological notes are not evidence of completion.
See [implementation and release notes](../POST-OFFER-IMPLEMENTATION-2026-11-08.md).

`agreement-draft.json` is now the single content source for all fourteen reviewed
sections, seven verified policy bodies and the exact Student Code appendix image,
provisional notice and declarations. Run
`backend/scripts/generate-offer-content.mjs` to generate the backend contract and both
browser projections; `--check` verifies parity. Generation does not approve draft
policy departures. Exact content-hash approval and issuance remain disabled by default.
Live signing uses the server-frozen packet. Candidate frontend assets are pinned in
`offer-assets.mjs` and the unpublished EOI .29 / Application .30 definitions.

All previously released EOI/Application definitions remain unchanged. The old
V6 acceptance/signing frames remain their historical previews on production. Use the
new candidate offer page for review; do not claim that it is already live.

The user-approved Bridge Road address is applied to seven publication policy copies.
The local contract pins their PDF/Word downloads and provenance; controlled originals
remain untouched. Google policy/credential approvals are complete; actual scoped grant
and live testing remain. See the newest source-verification checkpoint.
