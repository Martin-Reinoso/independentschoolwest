# Changelog

All notable changes to this project will be documented in this file.

## 2026-08-26

### Added
- `site-analytics.js` - Added a centrally configured, public-page-only GA4 loader with an inert Measurement ID placeholder and sanitised page-view URLs.
- `tests/site-analytics.test.cjs` - Added coverage for analytics scope, privacy controls, placeholder behaviour and CSP requirements.

### Modified
- `index.html` - Enabled the shared analytics loader and permitted GA4 through the page CSP.
- `family-evening/index.html` - Enabled the shared analytics loader.
- `donate.html` - Enabled the shared analytics loader.
- `pages/info-session.html` - Enabled the shared analytics loader.
- `pages/rosewood-fee-calculator.html` - Enabled the shared analytics loader and permitted GA4 through the page CSP.
- `pages/rosewood-fee-schedule.html` - Enabled the shared analytics loader and permitted GA4 through the page CSP.
