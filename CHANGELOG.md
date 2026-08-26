# Changelog

All notable changes to this project will be documented in this file.

## 2026-08-26

### Added
- `site-analytics.js` - Added a centrally configured, public-page-only GA4 loader with an inert Measurement ID placeholder and sanitised page-view URLs.
- `tests/site-analytics.test.cjs` - Added coverage for analytics scope, privacy controls, placeholder behaviour and CSP requirements.
- `site-analytics.js` - Added an allowlisted calculator event interface that removes family choices, fee amounts and other unapproved parameters before dispatch.
- `pages/rosewood-fee-calculator.js` - Added deduplicated engagement tracking for calculator starts, step completion, estimate updates, reset, print, fee-schedule and fee-question actions.

### Modified
- `index.html` - Enabled the shared analytics loader and permitted GA4 through the page CSP.
- `family-evening/index.html` - Enabled the shared analytics loader.
- `donate.html` - Enabled the shared analytics loader.
- `pages/info-session.html` - Enabled the shared analytics loader.
- `pages/rosewood-fee-calculator.html` - Enabled the shared analytics loader, permitted GA4 through the page CSP and marked calculator controls and follow-up links for privacy-safe measurement.
- `pages/rosewood-fee-schedule.html` - Enabled the shared analytics loader and permitted GA4 through the page CSP.
- `tests/rosewood-fee-calculator.test.cjs` - Added coverage for calculator event semantics, start deduplication and browser wiring.
- `tests/site-analytics.test.cjs` - Added behavioural coverage for the public analytics interface and parameter filtering.
