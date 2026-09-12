# Rosewood Billing operations

Last reviewed: 12 September 2026. These procedures describe the independent billing application in `app/`. They do not deploy it or change the existing enrolment system. See [architecture](ARCHITECTURE.md), [staff guide](STAFF-GUIDE.md), [communications operations](COMMUNICATIONS.md), and [test evidence](TESTING.md).

## Runtime and installation

Use Node.js **24.21.0**, the version pinned in CI and the Dockerfile. The package declares a minimum of 24.14.0 because it uses built-in SQLite and its backup API. Node 26.7.0 was used for initial local development; pinned Node 24.21.0 compatibility is recorded in TESTING.md. The [official Node 24.21.0 release](https://nodejs.org/en/blog/release/v24.21.0) was checked on 12 September 2026.

Run the following in the checkout's `Rosewood billing/app` directory. The repository commits `pnpm-lock.yaml`; install with its locked dependency versions:

```sh
corepack pnpm@10.15.0 install --frozen-lockfile
npm run check
npm test
```

`npm run` executes the package scripts; it does not replace the locked pnpm installation. The server has no `.env` loader: supply settings in its environment or the eventual service manager configuration.

## Local synthetic demo

```sh
npm run demo
```

The portal listens at `http://127.0.0.1:4318`. The initial identity is `demo.admin@example.test`. The launcher generates a random password and prints **only the path** of its private credential file. Open that file locally to sign in; do not paste its contents into a task, screenshot, log, or repository.

Default files are:

| File or directory | Purpose |
| --- | --- |
| `~/.local/share/rosewood-billing/demo/` | Persistent private demo runtime; directory permissions 0700 |
| `billing.sqlite` | Billing records, staff password hashes, sessions, audit, document snapshots, export manifests and the communications outbox/history; permissions 0600 |
| `billing.sqlite-wal`, `billing.sqlite-shm` | SQLite runtime files; leave them under SQLite's control |
| `demo-credentials.txt` | Local synthetic demo login; permissions 0600 |

On this computer, the default directory is `/Users/jativaf/.local/share/rosewood-billing/demo`. The `Documents` directory resolves into OneDrive, including the development worktree under `Documents/random`. That is acceptable for synthetic source code, **not runtime billing data**. Runtime checks resolve directory symlinks and reject repository/cloud-sync paths; choosing an innocent-looking alias to OneDrive does not bypass the check. The final database path must not be a symbolic link.

The sample data and credentials persist between runs. Ctrl+C stops the server; rerunning `npm run demo` reuses the same database and resumes seeding idempotently. The database records whether it is a demo or live database and refuses to open in the other mode. Never point the demo launcher at real records.

To use a different loopback port:

```sh
BILLING_PORT=4320 BILLING_ORIGIN=http://127.0.0.1:4320 npm run demo
```

Changing or resetting the demo password does not update the initial credential file; use the new password afterwards. If that file is lost, preserve the runtime and recover the named account with the operator `reset` command below. Start the recovered demo with the correct `BILLING_DATA_DIR`, `BILLING_DEMO=1` and `npm start`; the demo launcher itself still expects its original credential file. Select a new private demo directory only when a fresh demonstration is intended. Removing financial database files is not an account-recovery procedure.

## Configuration

| Variable | Actual behaviour |
| --- | --- |
| `BILLING_DATA_DIR` | Absolute private directory; required outside demo mode. Database filename is fixed as `billing.sqlite`. |
| `BILLING_ORIGIN` | Exact browser origin, with scheme and optional port; no path or trailing slash. Required outside demo mode. Requests must use its Host; mutations must send exactly this Origin. |
| `BILLING_HOST` | Defaults to `127.0.0.1`; this release accepts loopback binds only. `0.0.0.0` is rejected. |
| `BILLING_PORT` | Defaults to 4318; integer 1–65535. |
| `BILLING_DEMO` | `1` enables the sample mode. The demo launcher supplies it; normal `npm start` does not seed data. |
| `BILLING_ACCESS_GATEWAY` | HTTPS configuration requires `acknowledged`. This records an operator prerequisite; it does **not** install or enforce an MFA gateway by itself. |
| `BILLING_TRUST_PROXY` | HTTPS configuration requires `loopback`. Only a loopback connection with `X-Forwarded-Proto: https` is accepted as the HTTPS proxy path. Arbitrary forwarded headers and remote plaintext access are not trusted. |

A separate local empty runtime can be prepared without touching the demo:

```sh
export BILLING_DATA_DIR="$HOME/.local/share/rosewood-billing/local-review"
export BILLING_ORIGIN="http://127.0.0.1:4318"
unset BILLING_DEMO
npm run staff -- add --name "Review Administrator" --email admin@example.test --role admin
npm start
```

This creates no synthetic families automatically. The command prompts privately for a password. Use synthetic identities for review. Issuing real invoices or confirming receipts also requires the configured seller/payer details and finance-approved tax policy; an ABN checksum is not external verification of registration.

## Staff administration

Set `BILLING_DATA_DIR`, `BILLING_ORIGIN`, and the correct `BILLING_DEMO` mode before running operator commands. To administer the default demo, set `BILLING_DEMO=1` and its explicit data directory. Operator commands act only on the selected local database and send no messages.

```sh
npm run staff -- add --name "Finance Reviewer" --email finance@example.test --role finance
npm run staff -- list
npm run staff -- disable --email finance@example.test
npm run staff -- reset --email finance@example.test
npm run staff -- enable --email finance@example.test
npm run staff -- update --email finance@example.test --name "Finance Reviewer" --role finance
```

Roles are `viewer`, `billing`, `finance`, and `admin`. Each staff account must be named; names are limited to 120 characters. `add` and `reset` prompt twice without echoing characters; passwords must contain 15–128 characters. An existing email is not overwritten, and an account's email identity cannot be edited. `update` accepts `--name`, `--role`, or both. Resetting a disabled account's password leaves it disabled; `enable` is a separate action. `list` includes the current revision.

For private non-interactive input, `add` and `reset` support `--password-stdin`, accepting a single bounded line from an approved private secret-input mechanism. There is no password argument or password environment variable; do not put a secret into a shell command or command history. Passwords are not sent by email. Share an initial or reset password only through the school's approved secure channel.

Administrators can also use **Staff access → Add staff member**, **Edit access** and **Reset password** in the portal. **Edit access → Staff login is active** enables or disables an account. Every signed-in role can use the **Change password** button beside their name, supplying their current password. Account changes check revisions, and the server rechecks the administrator's access before committing password work. The last active administrator cannot be disabled or demoted through either interface; create or enable another administrator first.

Disabling a user, changing their role, or changing/resetting their password immediately revokes all that user's sessions. A name-only change preserves sessions. Login errors do not reveal whether an identity exists. Throttles persist in the database: five attempts per identity and thirty per connecting network address per fifteen-minute window, with a shared limit of three concurrent password operations. Current-password verification is also throttled. Since the backend trusts only the loopback gateway connection, network throttling is shared by users coming through that gateway. Sessions expire after thirty minutes idle or eight hours absolute lifetime.

Local operator access remains the recovery route when no administrator can sign in. Use the selected private runtime and the commands above; do not hand-edit password hashes or delete audit history. Public registration and password-reset emails/tokens are not implemented.

## Documents and communications

**Documents** opens the **Document centre** for invoice, receipt, credit-note and current statement searches, **Preview PDF**, and **Download**. Eligible records also offer **Email draft**. Each email preserves its reviewed document snapshot; **Preview attachment** in the message review displays that snapshot. Downloaded files remain under the school's handling policy.

**Communications** contains the review queue, message history, **Contact hold**, **Prepare automation**, and **Edit rules**. Billing staff prepare/edit drafts. Finance and administrators approve delivery, configure automatic invoice/receipt/reminder preparation, manage holds, retry definite failures, and review resends or uncertain outcomes. Review mode creates drafts; automatic mode queues eligible messages when preparation runs. Issuing an invoice or confirming a payment can trigger preparation, and the separate mail worker also prepares enabled rules. A queued message still requires an enabled transport and a running worker.

Email delivery defaults to disabled, and demo mode cannot send externally even if delivery environment switches are supplied. The proposed sender is `Rosewood College Accounts <rosewood.accounts@ffe.org.au>`; this work has not created or verified that mailbox, its sending identity or DNS. Account contact permission, holds, recipient changes and document eligibility are checked before dispatch. **Accepted by provider** means that SES accepted the request; it does not establish delivery to a family's inbox.

For an accepted or cancelled message, finance can choose **Prepare resend**, record a reason, and review the new draft before **Approve and queue**. An uncertain outcome has no direct retry: **Resolve provider outcome** requires external provider-log evidence and a reason. Confirmed acceptance requires the provider message reference. **Provider logs prove not accepted** records the `not_sent` outcome and moves the message to failed; **Retry failed message** is a separate reviewed action. If evidence is inconclusive, leave the outcome uncertain. These decisions and the earlier attempt remain recorded.

See [COMMUNICATIONS.md](COMMUNICATIONS.md) for exact delivery configuration, worker commands, sender commissioning, reminder behaviour, provider investigation and operational limits. The web process does not submit email itself. No live email provider or sending identity was commissioned during this work.

## Backup and restore

The backup command uses SQLite's online backup API, then checks integrity, foreign keys, row content, and a SHA-256 manifest. It includes committed WAL data, staff/session records, email content/snapshots, queued messages and recorded delivery history. A download of a CSV or PDF is not a database backup. Backups are private and contain personal data plus credential hashes; the tool does not encrypt them or copy them off-host.

Create and verify a uniquely named backup, with the source runtime selected explicitly:

```sh
export BILLING_DATA_DIR="$HOME/.local/share/rosewood-billing/demo"
export BILLING_BACKUP="$BILLING_DATA_DIR/backups/billing-review-20260912.sqlite"
npm run backup -- "$BILLING_BACKUP"
npm run backup -- --verify "$BILLING_BACKUP"
```

The parent backup directory must be private (0700), owned by the operator, and outside cloud-sync folders. A newly created private directory is supported. Existing backup filenames are never overwritten. Omitting the destination makes a timestamped file under `$BILLING_DATA_DIR/backups/`. Preserve the adjacent `.manifest.json` file. Use a school-approved encrypted off-host backup destination and retention policy when commissioning; neither is currently automated.

Restore into a **new** private directory so no stale WAL files or current database can be overwritten. Stop both the billing service and any mail worker first (Ctrl+C locally, or the commissioned service manager). Keep email delivery disabled throughout recovery. Verify the chosen backup as above, then set an unused restore path:

```sh
export BILLING_RESTORE_DIR="$HOME/.local/share/rosewood-billing/recovery-20260912"
export BILLING_MAIL_TRANSPORT=disabled
export BILLING_MAIL_DELIVERY_ENABLED=0
node --input-type=module <<'NODE'
import { mkdirSync, copyFileSync, constants, chmodSync } from 'node:fs';
import path from 'node:path';
import { prepareRuntime } from './src/config.mjs';
const source = process.env.BILLING_BACKUP;
const target = process.env.BILLING_RESTORE_DIR;
if (!source || !target || !path.isAbsolute(source) || !path.isAbsolute(target)) throw new Error('Set absolute backup and new restore paths.');
mkdirSync(target, { mode: 0o700 });
const { databasePath } = await prepareRuntime({ dataDir: target });
copyFileSync(source, databasePath, constants.COPYFILE_EXCL);
copyFileSync(source + '.manifest.json', databasePath + '.manifest.json', constants.COPYFILE_EXCL);
chmodSync(databasePath, 0o600);
chmodSync(databasePath + '.manifest.json', 0o600);
NODE
npm run backup -- --verify "$BILLING_RESTORE_DIR/billing.sqlite"
```

The copy step fails if the new directory already exists. Keep the original runtime and backup unchanged. Before allowing access to the restored instance, revoke sessions recovered from the backup so staff must sign in again:

```sh
node --input-type=module <<'NODE'
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { prepareRuntime } from './src/config.mjs';
const { databasePath } = await prepareRuntime({ dataDir: process.env.BILLING_RESTORE_DIR });
const db = new DatabaseSync(databasePath);
try {
  if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_sessions'").get()) {
    db.exec('BEGIN IMMEDIATE');
    db.exec('DELETE FROM auth_sessions');
    db.prepare('INSERT INTO auth_events VALUES(?,?,?,?,?,?)').run(randomUUID(), 'recovery.sessions_revoke', 'operator:restore', null, 'success', Date.now());
    db.exec('COMMIT');
  }
} finally { db.close(); }
NODE
export BILLING_DATA_DIR="$BILLING_RESTORE_DIR"
npm start
```

Use the original database's mode and the correct origin when restarting. For a demo restore, set `BILLING_DEMO=1` and use `npm start` to inspect the restored data without requiring a copied demo credential file. Staff hashes are in the backup, so the existing demo password still works. Session revocation deliberately changes the restored file after its initial manifest verification; retain the source manifest as recovery evidence and generate a new backup after validation.

Check account/invoice/receipt counts, balances, bonds, unapplied credits, recent audit history and a known document. Reconcile the restored outbox with external provider logs before allowing delivery: a restored queued message may already have been accepted after the backup was taken. Do not restart the sending worker against that queue until finance has reviewed possible duplicates, applied necessary contact holds and reconciled delivery evidence. A database backup cannot roll back an email already accepted by a provider. Record the backup source, restore directory, verification result and operator in the recovery log. Do not discard the previous runtime until finance has accepted parity. No in-place restore or automatic failover command is implemented.

## HTTPS and production commissioning

Public hosting has **not** been commissioned. The intended deployment uses one application process on a durable local disk behind a separately configured school MFA/SSO or private-access gateway and an HTTPS reverse proxy. The proxy must preserve the configured Host and send the HTTPS protocol header over loopback. Direct access to the backend must remain unavailable outside the host.

Before real-data use, the school must establish the actual gateway controls, named staff permissions/recovery, fixed origin/TLS, private encrypted storage, off-host backup and tested restore, health monitoring, and a responsible operator. Finance must confirm the legal issuer, accounting product, ABN/GST assertions, fee and deposit treatment, bank instructions, document numbering and reconciliation process. There is no native MFA implementation. Setting the acknowledgement variable alone is not a security deployment.

The Dockerfile is reference packaging for Node 24.21.0; Docker was unavailable locally and its build/run have **not** been tested. Because the application binds to loopback, ordinary Docker port publishing is not a validated deployment route. A containerised gateway would need a correctly designed shared network namespace or another reviewed arrangement. Do not advertise the Dockerfile as a ready public deployment.

## Operational boundaries and troubleshooting

- `GET /api/health` reports aggregate availability; it discloses no billing data. Use the exact configured host and, for HTTPS operation, the trusted proxy path. It is not a full reconciliation or backup-health check.
- `LOGIN_THROTTLED`: wait for the stated Retry-After window. Do not delete throttle/audit records to bypass it.
- `MODE_MISMATCH`: select the original runtime mode or a different database directory. Never relabel a database to seed it.
- Storage refusal: check the **resolved** directory, ownership and permissions, especially the Documents-to-OneDrive symlink on this computer.
- `STALE_REVISION` or failed command: refresh, review the current record, and retry deliberately. A network retry of the same intended operation must retain its idempotency key.
- Stale batch seller/tax details: review the resulting draft and save it to refresh its account/seller snapshots before issuing. The original batch evidence is retained; never edit an issued snapshot.
- Duplicate payment/refund evidence: locate the existing transaction and verify the actual bank identifier. Do not invent a different reference to bypass the guard.
- A ledger invariant failure requires stopping financial entry and inspecting a private verified backup plus the audit trail. Never “fix” it by deleting allocations, receipts or credits.

There is no live Xero connection, bank feed, gateway charging, parent portal, or deployment into the enrolment stack. Email preparation and the guarded SES worker are implemented, with external delivery disabled for this review and no live sender commissioned. Accounting CSV generation records an export manifest; a manually recorded import outcome is separate and does not prove payment reconciliation. The AU Xero tenant template and Demo Company import still require validation. Public enrolment health and staff-authentication endpoints were checked read-only. No family records or enrolment credentials were accessed, and no enrolment deployment or AWS mutation was performed.
