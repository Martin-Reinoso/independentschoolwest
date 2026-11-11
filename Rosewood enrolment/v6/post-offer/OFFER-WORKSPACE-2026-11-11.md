# Staff offer workspace — 11 November 2026

New-offer preparation appears before collapsed, searchable sent-offer history on both staff surfaces. History counts offer batches: one family can have several batches for different children.

## Child-level selection

Match existing offers by exact Application ID, never by names or email. A completed 2027 child with no active or signed offer remains selectable. Keep a family in the picker while any child is eligible, and label it with ready/already-offered child counts. Show its already-offered siblings unchecked and disabled. Families with no eligible children disappear only from preparation, not from history. Unsigned withdrawn offers permit a new offer; signed or active records block duplicate preparation. Future-year children are not eligible for this 2027 workflow. Existing backend transaction guards remain authoritative if another staff member issues an offer after the page loads.

Only selected children enter the reviewed email, principal letter and new offer batch. Existing siblings retain their offers and links. Resending an existing invitation stays a separate history action.

## Progress and recovery

Preparing and Sending labels include a spinner and nearby live progress message. Disable conflicting controls during the operation. Failure restores the reviewed send controls and preserves the operation ID for an idempotent retry. An interrupted connection does not claim the offer failed to save. A confirmed successful save followed by a failed list refresh remains a success notice and asks staff to refresh before preparing another offer. Success notices use the existing green style.

## Release and verification

EOI 2026.37 and Application 2026.38 pin the updated assets; all 73 preceding definition hashes and question contracts remain unchanged. Agreement 2026.7 and its approval hash are unchanged. No data migration, guardian-rule change, automatic resend or new email trigger is introduced.

Validation: 315 backend tests passed, including five child-selection cases. Isolated browser tests used three synthetic siblings with two previously offered: only the remaining sibling entered the next preview/send. Failure then retry reused the same operation ID and created only one additional offer/email event in the in-memory test harness. Confirmed-save/list-refresh failure retained success and blocked stale preparation. History search, closed history, desktop and narrow viewport were visually checked. No production family records were used for writes or test emails. Private baseline, rollback bundle, screenshot and release evidence are retained outside the repository.
