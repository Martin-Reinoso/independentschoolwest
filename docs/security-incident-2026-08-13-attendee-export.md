# Public attendee export incident

## Summary

On 13 August 2026, a registration-platform attendee export was found in the public
GitHub Pages repository and was directly downloadable from `ffe.org.au`. The export
contained attendee names and booking dates for a June 2026 event.

## Immediate containment

- Removed the export from the published repository tree.
- Added repository ignore rules for attendee, booking and registrant CSV exports.
- Confirmed that private operational exports must be stored outside this repository and
  outside public hosting paths.

## Follow-up

- Confirm the live URL returns `404` after GitHub Pages deployment.
- Decide whether repository-history rewriting is proportionate after checking clones,
  forks, branch protection and operational dependencies. A normal deletion does not
  remove earlier Git objects.
- Ask GitHub Support to clear cached content if history is rewritten or if the removed
  object remains available through GitHub infrastructure.
- Record the incident owner, notification assessment and closure outside this public
  repository. Do not add attendee identities or other personal information here.
- Add automated checks preventing likely registration or personal-data exports from
  entering the public repository.
