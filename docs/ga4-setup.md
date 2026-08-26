# GA4 setup

The site analytics loader remains inactive while `site-analytics.js` contains the
`G-XXXXXXXXXX` placeholder. Complete this checklist before replacing it with the
production web stream Measurement ID.

## Required stream settings

- Enhanced Measurement must remain disabled because outbound measurement can collect full link URLs and bypass this repository's event allowlist.
- Do not add Google Tag Manager, extra Google tag destinations or other automatic event collectors to these pages.
- Keep Google Signals and ad-personalisation signals disabled as configured in `site-analytics.js`.

These settings are part of the privacy boundary. Google documents Enhanced
Measurement as a data-stream setting rather than a page-code setting, so the
repository cannot enforce it through `gtag.js`.

## Calculator reporting

Register `step` and `option` as event-scoped custom dimensions if they are needed
in GA4 reports. The permitted option labels are intentionally categorical:

- family: `one`, `two`, `three`, `four`, `five_plus`
- payment: `term`, `annual`
- bond: `option_a`, `option_b_10k`, `option_b_20k`

The bond amount-already-paid control reports only that the bond step changed. It
does not report the selected amount or payment status. Calculated fees and all
other unapproved parameters are removed by the shared analytics interface.

## Release verification

After setting the Measurement ID, use GA4 DebugView to confirm that only the
documented page view and calculator events appear. Confirm that page locations
and referrers contain no query strings or fragments, and that calculator events
contain no fee totals, raw form values, names or email addresses.
