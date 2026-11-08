# Founding-year tuition reduction clarification

The user approved “$1,000 founding-year tuition reduction for 2027” to avoid
confusion with Foundation/Prep as a year level. Clauses 4.1 and 4.10 use that wording.
No amount, eligibility, discount order or payment obligation changes. The public fee
schedule, both calculators and downloadable fee PDF use the same terminology.

Agreement `rosewood-provisional-enrolment-agreement-2026.6` is approved by this request,
canonical SHA-256 `e5c21f6b6093598251bc637b400eaea4a3a3899192aae4a604abbf0fccd30a07`. Existing issued offers and signed PDFs retain their frozen
2026.5 content; this release does not rewrite records or resend email. Old reviewed
previews must be refreshed before issuance. The approved-hash deployment parameter
must advance with the new agreement so future offers remain enabled.

EOI `2026.35` / Application `2026.36` change asset pins only; question and answer
contracts remain unchanged and all 69 earlier hashes are preserved. While advancing
the pins, the family browser compatibility list was found to stop at Application 30.
It now accepts all published versions through 36; the existing regression check now
compares against the actual definition catalogue instead of a stale hardcoded 28.
Unknown versions still fail closed. This does not upgrade submitted records.

The two-page fee PDF preserves all other extracted text and the second page's pixels.
The updated labels were visually reviewed. Backend, calculator and browser checks use
fictional records and intercept all live service requests. Production verification and
release evidence are recorded in the associated PR and privately under
`~/.local/share/ffe-private-runtime/offer-founding-year-20261108`.
