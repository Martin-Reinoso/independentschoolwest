# V6 Form And Data Evolution

## Purpose

This is the operating contract for changing Rosewood enrolment questions without
losing, silently reinterpreting or overwriting family information. It applies before
any real family-facing change to EOI or Application for Enrolment.

DynamoDB is the authoritative record store. Google Sheets remain replaceable reporting
projections, not the source of truth. Google Drive remains the authoritative file store
for submitted snapshots, uploads and signatures.

## Permanent Record Identity

Every EOI and application records:

- `schemaVersion`: the storage shape used by the service;
- `formVersion`: the immutable question/validation contract used by that family;
- `formDefinitionHash`: the SHA-256 hash of that exact contract.

The definitions are in `backend/form-definitions.mjs` and are also stored once in
DynamoDB under `FORM#workflow#formVersion`. An existing definition must never be edited
in place. Its hash makes accidental reuse of a version identifier fail closed.
The deployment build also verifies the pinned SHA-256 hashes of the family HTML,
JavaScript, CSS, policy projection and original policy assets, so a question,
interaction or approved policy cannot change without updating the form contract and
deliberately creating a new version.

Current launch contracts:

```text
EOI:         rosewood-eoi-2026.5
Application: rosewood-application-2026.5
```

The original `2026.1`, `2026.2`, `2026.3` and `2026.4` contracts and validators remain
addressable for existing records.
The `2026.2` release changes document-upload interaction and transport without changing
question meaning, required answers or stored answer keys. Existing `2026.1`
applications use the corrected uploader and remain pinned to their original contract;
records created under that release remain pinned to `2026.2`. The `2026.3` release
adds exact-three client validation for the existing decision-influences rule, translates
server validation into field/section guidance and preserves an unsigned drawing during
in-form navigation. It does not change stored answer keys or reinterpret earlier data.
The `2026.4` release clarifies that an additional guardian's general contact preference
does not suppress the required transactional signing request, and corrects family-facing
status labels so `pending_signatures` is never presented as Completed. No stored answer
key is removed or reinterpreted. New records receive `2026.4`.
The `2026.5` release adds the approved three-policy reader and updates the
additional-guardian request email without changing any question, answer key,
validation rule, session boundary or signature-security control. It pins all reader,
Word and PDF assets. New records receive `2026.5`; existing records remain pinned to
their earlier contracts.

Acceptance, Decline and the Enrolment Agreement must receive their own independent
version series when their backends are built. They must not reuse the Application
contract.

## Application Draft Behaviour

The browser sends the visible answers together with the record's form version and
definition hash. The service:

1. reads the authoritative current application;
2. verifies the expected revision and pinned form contract;
3. sanitizes only the incoming fields against that contract;
4. merges incoming values into the existing answer map;
5. preserves omitted and retired fields;
6. atomically writes the new current state and a full immutable answer revision.

Therefore removing a question from a future page does not erase an earlier answer.
Sending an explicit empty value can record that a currently visible answer was cleared;
simply omitting a field cannot delete it.

Each acknowledged create, start, autosave, manual save and submission state has an
append-only `APP#applicationId / REV#revision#kind` record. The staff portal lists the
history without returning all sensitive values, and fetches one selected historical
snapshot through a separately authorised and audited request.

The final submitted Drive JSON snapshot also contains the form version, definition
hash, schema version, revision and revision hash. Signatures continue to bind to the
frozen submitted revision.

## Rules For Changing Questions

Create a new form version whenever any of these changes:

- a field is added, removed or renamed;
- wording changes the meaning of a question;
- an option is added, removed or reinterpreted;
- required/optional status changes;
- conditional display or required logic changes;
- validation, normalization or storage meaning changes;
- a repeated group or maximum count changes.

For a new version:

1. keep the old definition and validator in code;
2. add a new immutable definition and a dedicated validator mapping;
3. keep or add a browser renderer that supports every editable version;
4. add compatibility tests for both the old and new versions;
5. make new invitations use the new version only after deployment;
6. let existing applications continue under their pinned old version;
7. never make a newly required question retroactively required for an old application;
8. rebuild Sheets only after verifying the authoritative records and headers.

If an old renderer or validator cannot safely be retained, the service must block that
record with `FORM_VERSION_UNSUPPORTED` rather than process it under newer rules. Staff
must then perform an explicit, documented migration or assist the family; silent
conversion is prohibited.

## Migration Policy

Migration is required only when meaning or structure must change for an existing
record. It must be explicit, idempotent and auditable. Preserve the pre-migration
revision and record the source/target versions, transformed fields, operator and time.
Do not delete the source answer.

The initial V6 version backfill is dry-run by default:

```text
pnpm migrate-form-versioning -- --table=TABLE_NAME
pnpm migrate-form-versioning -- --table=TABLE_NAME --apply
```

Before `--apply`:

1. verify the AWS account and Sydney region;
2. create and verify a pre-migration backup for the main and audit tables;
3. record aggregate counts only;
4. run the dry run;
5. deploy code that can read both legacy and versioned records;
6. apply the migration;
7. verify zero unversioned EOI/application records and open a synthetic history entry.

The backfill pins existing records to the launch contract and creates one immutable
`migrated` baseline for each existing application without printing family answers.

## Google Sheets

Application and EOI projection rows include `form_version` and
`form_definition_hash`, appended after legacy columns. Mapping functions use the
record's own `schemaVersion`, not the latest global version. A Sheet edit cannot alter
the DynamoDB record or revision history. If Sheets are damaged, use the documented
projection rebuild after verifying backups and destination workbook IDs.

## Verification Before Release

- Old/retired answers survive a partial save from a newer client.
- A stale or mismatched form version/hash is rejected without a write.
- Old records validate under their pinned contract.
- New required fields affect only the new version.
- Every accepted save has a matching immutable revision.
- Staff revision access is authorised and audited.
- Submitted snapshots and signatures retain the pinned version/hash.
- Sheet columns are appended without shifting existing data.
- Backup and restore procedures remain valid after the schema change.
