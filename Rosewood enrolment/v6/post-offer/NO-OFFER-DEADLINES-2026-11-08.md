# Provisional acceptance without deadline inputs

## User correction

After the financial-choice correction, the user highlighted the still-required “Accept
by” and “Commencement conditions must be satisfied by” inputs. Remove both requirements
from this acceptance stage. No additional terms approval or family send is requested.
The previously agreed registration and written-confirmation condition remains.

## Behaviour

Both staff surfaces now require only the family/children and letter details before
review. No acceptance date, registration deadline, fee schedule, bond selection or
payment/refund period is requested. The letter date still dates Anne-Marie’s letter.

New offer schedules explicitly record `expiryPolicy: none` and financial choices as
deferred. New unsigned offers do not expire automatically. Staff can still withdraw
unsigned offers, and all contact checks, guardian scopes, OTP/session lifetimes,
revocation, separate signatures and reviewed-send controls remain unchanged.
Additional guardians can sign later; their request is released after the relevant
primary signatures even when months have elapsed. No fake far-future date is used.

Old frozen offer deadlines remain authoritative. Invalid/missing legacy expiry state
fails closed; an explicit stored deadline takes precedence over the no-expiry marker.
The PDF and family summary display dates only when present in an existing frozen offer.
New PDFs have the issue date but no acceptance or commencement-condition deadline.
Stale staff date payloads are rejected with a reload message before any offer/email write.

Clauses 2.5, 2.6 and 14.3 remove the dependency on a dated offer schedule. Clause 2.4
and the approved registration introduction are unchanged. If commencement conditions
cannot be satisfied, the existing written termination/refund provision remains, without
a fixed deadline. Bond and payment choices still happen later, as already instructed.

## Immutable release

Agreement `rosewood-provisional-enrolment-agreement-2026.5`, canonical SHA-256
`e9a0404f52b7e3f68cf7cc66f552c640b7869ab42e9c5fc49d9bfd6661f52c8a`.
EOI `2026.31` / Application `2026.32` advance frontend pins only; existing question
contracts and all 61 historical form hashes are unchanged. No record migration.

Fictional staff and both-guardian browser checks cover 1440/390/320px, no deadline or
financial inputs, unchanged Applications and signed-PDF bytes. External requests are
intercepted; no real family is contacted. All 286 regression tests and the locked deployment build pass. The signed PDF was
text-checked and visually inspected: the issue date remains, with no acceptance or
commencement-condition deadline. Registration wording and later financial choices remain.

## Verified production release

Runtime `83b3d02` deployed through PR #61 / merge
`c1a47bb0dd8f7cedf75a131b20ebe2c96f2a51a2`. Both CI checks passed. CloudFormation changed
only Lambda code and the approved hash. Stack UPDATE_COMPLETE, Lambda Active/Successful;
exact code checksum verified, all 39 resources retained, other configuration unchanged.
Offers remain enabled with the 2026.5 hash above. No production offer records existed
before or after this release; no real family was selected, modified or emailed.

GitHub Pages built the merge commit. All 45 public frontend/policy assets match the
tested hashes. The live canary at `2026-11-08T03:36:36.380Z` passed all five checks.
All nine alarms are OK, both schedules enabled, protected tables and confirmed
notification subscriptions preserved; three unauthenticated GET routes still return 401.

Private baseline/rollback and verification evidence:
`~/.local/share/ffe-private-runtime/offer-no-deadlines-20261108`.
Refresh the staff portal to discard cached date inputs. Stale clients receive a reload
message instead of issuing an offer with silently discarded dates.
