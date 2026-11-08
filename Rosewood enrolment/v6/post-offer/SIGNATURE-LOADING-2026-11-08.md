# Signature submission feedback

The user requested a small visual indicator while Sign and submit is saving.
The submit button now reads “Submitting…” and remains disabled during the request.
A visible live status says “Submitting your acceptance—please wait and keep this page
open.” Preview mode uses preview wording. The indicator clears on completion or error;
a failed request restores the original button label and ability to retry.

No signing, email, contact, payment or agreement behaviour changes. Synthetic browser
checks delay saving, fail the first attempt, then verify successful retry and exactly
one recorded signature at desktop/390/320px. No real family request is submitted.
EOI34/Application35 update the pinned assets only; prior contracts are unchanged.
Release evidence is recorded in the associated PR and privately at
`~/.local/share/ffe-private-runtime/offer-signature-loading-20261108`.
