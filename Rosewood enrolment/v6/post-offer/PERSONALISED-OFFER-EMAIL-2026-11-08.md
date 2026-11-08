# Personalised congratulations email

The user approved using the selected children's first names in the initial family
offer email. Examples with fictional names:

- One child: “Congratulations! We are delighted to offer Avery a place at Rosewood College.”
- Two children: “Congratulations! We are delighted to offer Avery and Jordan places at Rosewood College.”
- Three children: “Congratulations! We are delighted to offer Avery, Jordan and Mary Rose places at Rosewood College.”

Use the structured student first-name field, preserving compound given names. Carry
it from the selected Applications through staff preview, saved family/task children
and invitation rendering. Permitted name corrections also update the family account's
child name for a later resend. For older saved accounts without a first-name field,
use their stored full name rather than guessing where to split it. No migration.

Only the initial congratulations paragraph changes. The full-name/year/level list,
later “your child” / “each child” instructions, secondary request, receipts, principal
letter, provisional conditions, agreement and signing process are unchanged. Subjects
still contain no child names. Staff review remains mandatory and the exact rendered
message is bound into the review hash; changed source names invalidate a stale review.

Regression coverage includes singular/plural openings, three children, compound and
hyphenated names, accented characters, HTML escaping, legacy fallback, selected-child
scope, preview/queued-message agreement, stale review rejection and unchanged source
Applications. All workflow tests use synthetic in-memory providers. No real family
send or production write-path test is needed for this copy change.

This is a backend-only release. EOI 2026.31, Application 2026.32, agreement 2026.5 and
its approved hash remain unchanged. Deployment must change only Lambda code, preserve
all stack parameters/environment/resources and pass the read-only production canary.
The associated release PR records deployment results. Private baseline, exact rollback
package, test/build logs and operational checks are held under
`~/.local/share/ffe-private-runtime/offer-personal-greeting-20261108`.
