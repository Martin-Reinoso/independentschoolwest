# Offer portal access and verified-session recovery

A real offer recipient successfully verified their email, then `/v6/family/context`
failed because their historical Application `INVITE_ID` index was absent. The offer,
active task, submitted Application and contact permission were intact. The screen
stayed on code entry, so retrying the consumed code misleadingly appeared to be expiry.

A verified offer session now resolves its explicitly assigned offer children even when
the historical Application invitation index is absent. It checks current task status,
family offer membership, Application invitation relationship and signer permission.
It does not infer family membership from email, reconstruct invitation records, expose
unissued siblings, grant Application access or change original records. Missing-index
Application sessions still fail closed. Normal indexed-family behaviour is unchanged.

After verification, loading moves immediately to the family screen. A non-authentication
loading failure retains the verified session and provides a retry action. Reload uses
that session; neither action consumes another code. A 401/expired session still clears
access and requires sign-in. OTPs remain single-use; no expiry or throttling is weakened.

Synthetic tests cover missing-index primary/secondary access, handoff/logout, denied
Application/unissued-sibling access, current contact restrictions, revoked tasks,
mismatched families and code replay. Browser checks at 1440/390/320px simulate repeated
loading failures, reload, retry, opening the offer and actual session expiry; exactly
one OTP verification occurs. Providers are in memory, with external requests blocked.

EOI 2026.33/Application 2026.34 advance only frontend pins; all 65 preceding definition
hashes and question contracts remain unchanged. Approved terms, existing offers,
letters and email copy are unchanged. No real emails or record migrations occur.
Deployment evidence is in the associated release PR and privately under
`~/.local/share/ffe-private-runtime/offer-portal-recovery-20261108`.
