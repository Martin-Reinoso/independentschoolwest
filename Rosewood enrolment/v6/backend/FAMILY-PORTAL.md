# Shared family overview and verified navigation

Deployed integration, 8 November 2026. Real offers are enabled following the user’s
final-terms approval; see [activation evidence](../post-offer/OFFER-ACTIVATION-2026-11-08.md).

## Entry and scope

Existing Application invitation URLs continue to open the Application gateway. The
family offer email contains one private offer portal link for the selected children,
not a separate link for every student. Both verified entries render the same child
cards from the explicit invitation relationship. No email/surname search discovers a
family. A later-issued sibling offer appears when the appropriate guardian request
has actually been released, without requiring the parent to use the newer email.

The primary parent may continue editable Applications, view submitted Application
status and open available offers. Secondary/additional guardians see only offers
included in their active signing requests. They never receive Application editing
or family-creation authority. Contact restrictions are rechecked at each transition.

`GET /v6/family/context` accepts only `application_family` or `enrolment_offer`
sessions. It follows the source invitation's explicit Application IDs, verifies each
Application's invitation ID and resolves each current offer/account/active task.
The response contains names, entry details, stages and allowed actions. It excludes
answers, documents, contact details, storage IDs, task hashes and other guardians'
private information. The overview does not mutate Applications or send messages.

Stages distinguish not-started/in-progress Applications, Application signatures,
submitted/under-review Applications, ready offers, offer signatures, completed
provisional acceptance, and expired/withdrawn offers. Signed conditional acceptance
does not mean the child is finally enrolled or that registration has been granted.

## Navigation and revocation

`POST /v6/family/open` takes the selected Application, target and (for offers) offer
ID. It resolves permissions again, then issues only the target scope. It does not
issue an invitation, OTP, email or new acceptance deadline.

New bridge sessions contain `portalAnchor`, the hash of the original verified
Application-family or offer session. They retain that source's absolute expiry;
repeated transitions cannot extend the eight-hour limit. Activity refreshes the
source idle timeout. The source session, current invitation/contact permissions or
offer task are revalidated on every authenticated bridge request. Derived child
Application editing/status sessions retain the same anchor.

Browser handoff uses a one-time, at-most-60-second same-tab `sessionStorage` item.
Only opaque session metadata, the selected record ID and email are stored. No token
is placed in navigation URLs and no application answers or signature drawings are
stored in browser storage. The destination validates access with the server. Its
normal session recovery handles refresh; expiration requires the private email link.

Switching from an Application screen to an offer retires editing/status sessions
left in the tab, including legacy sessions, before navigation. Explicit Sign out
posts `endFamilyAccess: true`; the server deletes both the bridge and its source,
invalidating linked sessions. Save-and-continue-later uses the existing ordinary
session logout to close only the editing scope and preserves the family overview.
This is not an account-wide revocation of unrelated sessions on other devices.

The destination routes are the existing Application page with
`?workflow=application&portal=1` and offer page with `?portal=1`. These query values
grant no authority. Original invitation lifetimes, individual guardian OTP identity,
offer acceptance deadlines and explicit revocation remain separate controls.

## Evidence

`tests/family-portal.test.mjs` exercises mixed stages, original Application integrity,
cross-family denial, secondary draft denial, contact changes, later sibling offers,
blended families, revoked/expired source access, bridge lifetime, logout versus
save-and-close, editing-session inheritance and expired/withdrawn offers.

Private `offer-terms-review-20261108/check-family-portal.mjs` uses the real service
with fake stores/providers and intercepted browser traffic. It covers the combined
overview, Application status and draft handoff/refresh, offer handoff and sign-out
at 1440/390/320px, preserving the synthetic Applications and making no external
requests. The separate connected-acceptance test retains both guardian signatures,
all seven policy readers and the exact stored signed-PDF download.

The local checks above were supplemented by the completed isolated AWS/Google/Gmail
journey and verified production release/activation recorded in the linked evidence.
