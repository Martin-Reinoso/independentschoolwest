# Enrolment Architecture Exploration Plan

## Status And Boundary

**Status:** Exploration only. No item in this document is approved for implementation
or production deployment.

This plan records architectural questions raised while studying the St Lawrence of
Brindisi Enquiry Tracker process. It must not be treated as authority to change the
current Rosewood portal, add server-side draft collection, alter storage, or describe
a browser indicator as proof of security.

The current portal and the accepted interim Google Drive/Sheets operating model remain
separate. Any change to where draft answers are stored requires an explicit Rosewood
decision, privacy review, retention rule and deployment plan.

## Current Verified Rosewood Model

| Area | Current behavior | Evidence |
| --- | --- | --- |
| Invitation | High-entropy token is validated by Lambda; only its hash is held in the Invitations Sheet | `README.md`, Lambda source |
| Draft answers | Stored in browser `localStorage` and restored only on the same browser/device | Frontend source |
| Visible save state | `Saving...`, `Saved on this device`, `Could not save locally`, or `Preview only` | Frontend source |
| Connection | Invitation validation proves that the service responded at page entry; no persistent connection indicator exists | Frontend source |
| Engagement | Approved non-sensitive events are sent to the private Engagement Sheet | Frontend and Lambda source |
| Documents | Uploaded to private encrypted S3 using short-lived presigned URLs | Portal README and Lambda source |
| Final application | Written to the private Applications Sheet only after final submission | Lambda source |
| Preview | Simulated and non-writing | Frontend source and portal README |

The current label `Saved on this device` is accurate. It does not mean that a draft is
stored by Rosewood, available on another device, backed up, or recoverable after local
browser data is cleared.

## St Lawrence Architecture Inferences

The observed third-party system appears to separate:

- a reusable verified contact record
- student records linked to that contact
- distinct application/draft records with opaque route identifiers
- application status such as In Progress, Pending Signatures and Submitted
- uploaded-document records
- signatory-specific acknowledgement and signature state
- acceptance/decline workflows following an offer

Pressing Start created a distinct application route after a transient loader. The new
form showed Saved shortly after opening. This is consistent with server-side draft
creation and autosave, but the exact database, API, encryption, backup and retention
implementation has not been verified. A Saved marker is not evidence of those wider
security properties.

## Product Principle For Status Indicators

Never combine connectivity, local persistence and server persistence into one vague
green badge. A family must be able to distinguish:

1. whether the Rosewood service is reachable
2. whether the latest changes are stored on this device
3. whether the latest changes have been acknowledged by Rosewood storage
4. whether any changes are still queued or have failed

Suggested language, subject to content and accessibility review:

| State | Candidate message | Meaning |
| --- | --- | --- |
| Initial connection | Checking secure connection... | Invitation validation is in progress |
| Connected, local-only model | Service connected; draft saved on this device | Service responded, but answers have not been server-saved |
| Local write in progress | Saving on this device... | Browser persistence has not yet confirmed success |
| Local write confirmed | Saved on this device at 10:42 am | Latest local draft write succeeded |
| Server draft queued | Changes waiting to save securely | Server save has not been acknowledged |
| Server write in progress | Saving securely... | Authenticated draft request is in flight |
| Server write confirmed | Saved securely at 10:42 am | Server acknowledged the exact latest revision |
| Offline fallback | Offline; saved on this device | Local write succeeded but server is unreachable |
| Server error | Could not save to Rosewood; retrying | Latest revision is not server-confirmed |
| Conflict | This form changed elsewhere; review before continuing | Server revision differs from the browser base revision |
| Session expired | Secure session expired; reconnect to continue | Invitation/session is no longer authorised |

Avoid words such as guaranteed, completely secure or permanently saved. The strongest
defensible claim is that the server acknowledged a particular revision at a stated
time.

## Candidate Server-Draft Model

**Status:** Proposal for evaluation only.

### Proposed Flow

```text
Family edits a field
    -> browser writes an immediate local fallback
    -> short idle debounce or step transition
    -> authenticated draft request with base revision
    -> server validates invitation, schema and revision
    -> private durable store commits the new revision
    -> response returns draft ID, revision and server timestamp
    -> UI may display Saved securely for that exact revision
```

### Candidate API Contract

No endpoint exists today. A possible future contract is:

```text
POST /applications/draft
GET  /applications/draft
DELETE /applications/draft
```

Candidate write request fields:

- invitation token or a derived short-lived session credential
- stable draft ID after the first write
- base revision for optimistic concurrency
- client operation ID for idempotency
- current form schema version and legal-content version
- current step and highest visited step
- validated application snapshot or approved partial field set
- document metadata only, never raw file content

Candidate response fields:

- draft ID
- committed revision
- server timestamp
- schema version
- conflict or expiry state where applicable

The badge must update to server-confirmed only when the response revision equals the
latest browser revision. A response to an older request must not overwrite the status
of newer unsaved changes.

## Storage Options To Evaluate

| Option | Strengths | Risks and limits | Current position |
| --- | --- | --- | --- |
| Browser-only draft | Minimal pre-submission collection; already implemented | Same-device only, can be cleared, no staff recovery | Current portal behavior |
| Google Sheets draft row | Fits interim tools and staff familiarity | Poor fit for frequent writes, concurrency, JSON size and sensitive partial records | Evaluate only for step-level snapshots |
| Private S3 encrypted draft object | Durable, versionable and compatible with existing AWS boundary | Requires index/status metadata, access tooling and lifecycle management | Candidate |
| DynamoDB draft record | Revision control, idempotency, TTL and conditional writes | Adds AWS service and operational ownership | Candidate |
| Relational database | Strong entity relationships and reporting | Highest operational and migration burden at current stage | Defer unless selected platform requires it |
| Google Drive document per draft | Familiar manual access | Weak transactional behavior and unsuitable for frequent autosave | Not recommended for keystroke autosave |

Storage selection must be based on approved operating ownership, not on the appearance
of the St Lawrence interface.

## Save Frequency Options

| Strategy | Benefit | Cost/risk |
| --- | --- | --- |
| Every keystroke | Fast remote recovery | Excess writes and partial sensitive content collection |
| Idle debounce | Responsive and common | Must handle out-of-order requests and navigation |
| Step transition | Clear checkpoint and lower write volume | More work can be lost within a long step |
| Explicit Save and continue | Clear family intent | Adds friction and may be forgotten |
| Hybrid local immediate + server idle/step | Strong usability and recovery | Most implementation and state-machine complexity |

The candidate recommendation for later evaluation is hybrid local immediate saving
plus server saving after a short idle interval and on successful step transitions.

## Privacy And Governance Decision Gates

Server-side draft storage must not proceed until Rosewood approves:

- collection of incomplete answers before the family formally submits
- which fields may be draft-saved, especially medical, disability, court-order,
  residency and identity information
- retention for abandoned, expired, revoked and completed drafts
- family correction, withdrawal and deletion processes
- authorised staff visibility into incomplete applications
- whether staff may contact a family based on an abandoned draft
- storage location, subprocessors and expected disclosures in the collection notice
- encryption, key ownership, audit logging and least-privilege access
- incident response and recovery responsibility
- how uploaded documents relate to an abandoned draft
- multi-guardian privacy and restricted-contact cases

## Reliability Requirements

A future draft service should include:

- idempotent writes and conditional revision updates
- retries with exponential backoff and a bounded queue
- clear offline detection without treating `navigator.onLine` as proof of reachability
- a local fallback that never masquerades as a server save
- explicit session/invitation expiry handling
- conflict detection across tabs and devices
- schema migration or version rejection behavior
- server timestamps rather than trusting the family device clock
- structured, non-sensitive operational logs
- alerting for sustained error rates or storage failures
- tested restore, retention and deletion procedures

## Verification Matrix For A Future Prototype

Test with synthetic information only:

- first draft creation and returned draft ID
- edit, debounce, step-change and manual retry paths
- server response arriving after a newer edit
- duplicate request and interrupted response
- offline edit and successful reconnection
- invalid, expired, revoked and submitted invitations
- two tabs and two devices editing the same revision
- local storage unavailable or full
- server storage unavailable or throttled
- status text, icon, colour independence, screen-reader announcements and keyboard use
- no sensitive answer in URLs, client logs, analytics or engagement metadata
- retention expiry, authorised deletion and submission cleanup
- preview mode performs no draft call

## Architecture Decision Register

| ID | Decision | Status | Required evidence/approval |
| --- | --- | --- | --- |
| ARCH-001 | Retain the truthful local draft marker | Current | None; preserve wording while behavior remains local-only |
| ARCH-002 | Add a distinct service-connection state | Explore | Define what event proves connected and how expiry is represented |
| ARCH-003 | Store incomplete drafts on a Rosewood server | Not approved | Privacy, retention, storage and access decisions |
| ARCH-004 | Select a draft storage technology | Open | Volume, concurrency, ownership, recovery and cost comparison |
| ARCH-005 | Use server revision acknowledgements for Saved securely | Proposed | Draft API and concurrency prototype |
| ARCH-006 | Permit cross-device draft resume | Open | Stronger identity/session model and guardian privacy review |
| ARCH-007 | Let staff view abandoned drafts | Not approved | Purpose, notice, access and retention approval |
| ARCH-008 | Replace the interim Drive/Sheets model | Not proposed | Explicit future migration decision only |

## Exploration Workstreams

### A. External Process Capture

- Complete the St Lawrence acceptance/decline workflow map.
- Capture OTP, matched records, acceptance fields, legal wording, signatures,
  confirmation and communications without accepting or submitting.
- Distinguish observed behavior from inference.

### B. Rosewood Product Decisions

- Decide what recovery promise Rosewood wants to make to families.
- Decide whether same-device draft recovery is sufficient for initial intake.
- Approve status language before changing the interface.

### C. Technical Spike

- Only after the decision gates, create a non-production synthetic-data prototype.
- Compare S3-object, DynamoDB and limited step-level Sheets approaches.
- Test revision, offline and idempotency behavior before any production integration.

### D. Governance And Operations

- Update collection notice, retention schedule and access register.
- Define monitoring, support, correction, withdrawal and incident procedures.
- Record who owns the service after launch.

## Exit Criteria Before Implementation

Implementation may be proposed only when:

1. the acceptance workflow capture is complete enough to inform the data model
2. the required family recovery experience is approved
3. draft collection and retention are approved
4. storage ownership and access are approved
5. a synthetic prototype proves revision-safe saving and honest status behavior
6. rollback and deletion procedures are documented
7. the current portal/interim-process boundary is explicitly resolved
