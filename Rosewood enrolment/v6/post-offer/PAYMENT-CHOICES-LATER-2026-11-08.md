# Provisional acceptance now; financial choices later

## User correction

On 8 November 2026 the user clarified that families are only accepting the provisional
offer at this stage and will choose how to pay later. Requiring staff to select financial
arrangements before issuing an offer was an implementation error. This correction
supersedes the corresponding parts of the earlier offer-schedule mapping and activation.
It does not authorise sending offers or tests to real families.

## Corrected behaviour

Remove the six financial inputs from both staff offer screens: free-text fee schedule,
bond option/amount, existing bond credit, payment period and refund period. There is
no replacement financial-choice step for parents. Staff select the family/children,
review letter wording and dates, then review and explicitly send the offer.

New packets contain acceptance/conditions dates and `financialArrangements: deferred`.
No bond choice, amount, credit or payment/refund days are inferred or recorded.
Stale clients submitting the former financial fields receive a clear reload instruction
before an offer, letter storage or email can be created. Existing frozen packets retain
their original content and legacy financial-schedule PDF rendering where applicable.

The family form and signed PDF state: “Bond and payment options will be chosen separately
at a later stage. No payment is requested when accepting this provisional offer.”
The published fee rates, bond options and other general terms remain available.
Clauses 2.5, 2.6 and 4.8 now remove dependencies on staff-entered payment/refund periods
and record bond/payment selection as a later step. No later-stage billing workflow is
implemented by this correction.

Acceptance and commencement-condition deadlines remain required. They are now shown
in the family’s “Your offer at a glance” before signing, correcting the previously
identified visibility gap. Their underlying rules are unchanged.

## Version and authority

The user’s correction authorises this narrow alignment; their prior approval of the
remaining final terms and activation remains in force. Agreement version is
`rosewood-provisional-enrolment-agreement-2026.4`, canonical content hash
`f5fc1c2ea45f93459eabe6e963109b7b898a83b7c5907159cede5c92035dc926`.
EOI `2026.30` / Application `2026.31` only advance frontend asset pins; their question
and answer contracts are unchanged. All 59 historical form hashes were compared and
remain identical. No family-data migration is required.

## Validation and publication

Fictional staff and both-guardian journeys pass at 1440, 390 and 320px, with every external
request intercepted. Two siblings can be issued without financial selections; original
Applications are unchanged. Both guardians complete acceptance; the downloaded PDF equals
the stored bytes. All seven policies render and return to the checked agreement.
The signed PDF was text-checked and visually inspected: no recorded bond choice, credit
or payment/refund period appears; the deferral notice is present. The frozen-lockfile
production build and static/public-data checks pass.

Production publication is pending final regression/CI and reviewed deployment verification.
