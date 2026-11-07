# Current provisional-offer release gates

Reviewed against clean runtime `c46a705` and deployment-evidence commit `2899369` on
8 November 2026. **The full goal is not complete.** No live test email has been sent;
production remains unchanged. This table distinguishes local evidence from provider
integration and school policy approval.

| Requirement | Current evidence | Remaining action |
| --- | --- | --- |
| Confirmed primary/secondary form and family overview | Current source and mocked browser journeys at 1440/390/320; editable primary details, locked emails, read-only secondary, both signatures, exact stored PDF and unchanged fictional Application | Repeat the complete journey against isolated real providers |
| Wording and fourteen sections consistent across outputs | `agreement-draft.json`; generated-content check; 280-test suite; current introduction matches user wording | Resolve proposed substantive clauses in `FOURTEEN-SECTION-REVIEW-NOTES.md`; do not enable real issue on an unapproved content hash |
| Seven full policies and downloadable versions | Source hashes; 140 headings; 75 pages inspected; exact Student Code map; private 14-file package; download/return browser checks | Settle Alfred Road publication treatment and original map label defects; publish exact reviewed copies, bind `sourceDownloads`, regenerate/review hash. Current contract has zero download entries |
| Isolated runtime and recipient boundary | Stack UPDATE_COMPLETE on c46a705; 28 distinct resources unchanged; 18 deployed-role IAM cases; email/readiness/issuance off; tables empty; actual health/fictional OTP fail closed | Configure separately scoped Google test storage and test-only secrets; then activate only the authorised synthetic workflow |
| Google test account/app | Current Chrome screen: Rosewood Offer Test under personal account, final Google API Services User Data Policy checkbox unchecked | Pending specific consent approval; then client/setup and action-time approval for new app-file-only access. General test-email permission does not accept Google terms |
| Actual emails, attachments, feedback and recovery | Unit/provider-mocked tests only; no actual-email ledger or live signed-record evidence exists | After Google setup, run staff issue → primary → secondary → completion, sibling/denial/retry/recovery cases; receive only at the authorised personal inbox; record Gmail/SES/PDF evidence |
| Production release and recovery | Scope separated, clean commits, default-off feature gates, documented backend-first approach | After integration/publication gates, capture current rollback baseline, review change set, deploy disabled, publish pinned assets, verify live hashes and no offer notifications |
| Monitoring and operational completion | Candidate canary/queue checks and recovery design exist | Verify production health/alarms and two scheduled canary intervals after rollout; deliver final evidence and operating instructions |

## Immediate dependency

The live-provider path is waiting on the Google policy consent already requested.
The current browser state was rechecked; it is not an active job or a completed setup.
The browser tool requires confirmation at the time of accepting legal terms and,
separately, granting new security-sensitive access. No checkbox or credential grant
was accepted. Private evidence screenshot: `google-test-consent-current.png` in the
existing restricted review directory. Keep the prepared Chrome tab for continuation.

## Next authorised sequence after consent

Complete the dedicated test app and obtain only `drive.file` access, with the distinct
client pinned to the test runtime. Create only app-owned test folders and three Sheets;
prove production IDs are inaccessible using metadata requests. Configure new test
HMAC secrets and the authorised private principal signature without copying production
credentials. Recheck environment and exact recipient restrictions before activating
synthetic traffic. Use fictional logical identities; never use the real Application
associated with the personal test inbox. Disable test delivery/schedule after the run.

## Evidence references

- [Completion specification and detailed test matrix](COMPLETION-TEST-AND-DEPLOYMENT-PLAN-2026-11-08.md)
- [Actual inactive AWS deployment](../backend/INACTIVE-TEST-DEPLOYMENT-2026-11-08.md)
- [Google/environment isolation](../backend/SYNTHETIC-TEST-ENVIRONMENT.md)
- [Policy sources and private publication copies](POLICY-SOURCE-VERIFICATION-2026-11-08.md)
- [Release scope and excluded operations repairs](RELEASE-SCOPE-2026-11-08.md)

No additional implementation change is justified merely to replace the missing live
integration evidence. Preserve the tested candidate while the required consent is pending.
