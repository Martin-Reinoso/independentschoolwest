# Acceptance Submission Observation

## Scope And Privacy

This is a sanitised observation of an authorised parent completing and submitting the
live St Lawrence Enrolment Agreement on 2026-08-01. The observer recorded only step,
validation, autosave, control-state and route-transition signals. It did not record or
retain names, contact details, answers, medical information, filenames, file contents,
signature data, email addresses, OTPs, application identifiers or private URLs.

Source ID: `SLB-014`.

## Observed Sequence

Times are Australia/Melbourne.

1. **12:56:40, Documents:** observation began with Submit visible but disabled and
   outstanding validation markers elsewhere in the five-step agreement.
2. **12:57:27 to 13:01:01, Documents:** two user-action cycles produced a busy state,
   then `Unsaved Changes`, then a settled state. The observer did not inspect uploaded
   filenames or contents.
3. **13:01:07, Conditions:** the active step changed to Conditions. Completing the
   required choices repeatedly produced `Unsaved Changes` followed by a settled state.
   Visible invalid-control count reduced progressively as the step was completed.
4. **13:03:37, Signature:** the active step changed to Signature with two visible
   invalid controls remaining and Submit still disabled.
5. **13:03:38 to 13:03:51, Signature:** two required acknowledgements were completed.
   Validation reached zero and Submit became enabled.
6. **13:03:55 to 13:04:16, Signature autosave:** Submit temporarily alternated between
   disabled and enabled while `Unsaved Changes` appeared and cleared. It ended enabled
   only after the latest changes had settled. This indicates submission is gated by
   both validation and save state.
7. **13:04:19, Submit:** the interface entered a busy state and Submit became disabled.
8. **13:04:22, post-submit transition:** the agreement form disappeared and the route
   changed. The observer stopped automatically at this transition.
9. **Post-submit page:** the destination displayed submitted/complete language while
   also showing a pending further-signature state, a signature-request reference and
   further contact by email. No email was opened during this observation.

## Confirmed Behaviour

- Conditions changes use the same asynchronous save cycle seen elsewhere.
- Submit remains disabled while required validation is outstanding.
- Submit can also be disabled while a valid form still has a save in progress.
- Submitting produces a busy state before navigation.
- The current guardian's submission does not necessarily complete the whole agreement;
  the resulting page can remain pending while another signature request is issued.
- The final all-signatures-complete state, second-guardian email and signing view,
  acceptance receipt and onboarding communications remain uncaptured.

## Rosewood Implications

- Keep Submit disabled until the draft is both valid and durably saved.
- Show a clear submitting state and prevent duplicate submission.
- Distinguish `Your signature submitted` from `Agreement complete` when another signer
  is pending.
- Name the outstanding signer role without exposing their private contact information.
- Provide a safe resend/help path and a clear all-signatures-complete confirmation.
