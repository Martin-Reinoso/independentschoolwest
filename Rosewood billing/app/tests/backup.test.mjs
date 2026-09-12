import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBackup, inspectBackup } from '../scripts/backup.mjs';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { createAuth } from '../src/auth.mjs';
import { createCommunications } from '../src/communications.mjs';

test('online backup includes WAL data, preserves relationships and survives independent reopening', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'rosewood-billing-backup-'));
  const source = join(folder, 'source.sqlite'),
    target = join(folder, 'saved.sqlite');
  const db = new DatabaseSync(source);
  try {
    db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE accounts(id TEXT PRIMARY KEY); CREATE TABLE money(id TEXT PRIMARY KEY, accountId TEXT REFERENCES accounts(id), cents INTEGER NOT NULL);',
    );
    db.prepare('INSERT INTO accounts VALUES(?)').run('synthetic');
    db.prepare('INSERT INTO money VALUES(?,?,?)').run('receipt-1', 'synthetic', 12345);
    const manifest = await createBackup({ sourcePath: source, targetPath: target });
    assert.equal(manifest.rowCounts.money, 1);
    assert.equal(manifest.integrity, 'ok');
    assert.equal(inspectBackup(source).contentSha256, manifest.contentSha256);
    assert.equal(statSync(target).mode & 0o777, 0o600);
    db.prepare('INSERT INTO money VALUES(?,?,?)').run('receipt-2', 'synthetic', 500);
    assert.equal(inspectBackup(target).rowCounts.money, 1);
    assert.equal(inspectBackup(source).rowCounts.money, 2);
    await assert.rejects(
      createBackup({ sourcePath: source, targetPath: target }),
      /already exists/,
    );
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test('backup rejects cloud-sync destinations and relative paths', async () => {
  await assert.rejects(
    createBackup({ sourcePath: '/tmp/missing.sqlite', targetPath: '/tmp/OneDrive/test.sqlite' }),
    /cloud-sync/,
  );
  await assert.rejects(
    createBackup({ sourcePath: 'private.sqlite', targetPath: '/tmp/backup.sqlite' }),
    /absolute/,
  );
});
test('backup refuses a shared destination without changing its directory permissions', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'rosewood-billing-backup-permissions-'));
  const dbPath = join(folder, 'source.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE test(id INTEGER)');
  db.close();
  const before = statSync('/tmp').mode;
  try {
    await assert.rejects(
      createBackup({
        sourcePath: dbPath,
        targetPath: `/tmp/rosewood-backup-test-${process.pid}.sqlite`,
      }),
      /private backup directory/,
    );
    assert.equal(statSync('/tmp').mode, before);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('full billing, staff and communications recovery retains uncertain-attempt evidence and manual resolution', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'rosewood-billing-comms-recovery-'));
  const source = join(folder, 'source.sqlite'),
    backup = join(folder, 'backup.sqlite'),
    restored = join(folder, 'restored.sqlite');
  const clock = () => new Date('2026-09-12T04:00:00Z');
  const db = openDatabase(source);
  let restoredDb;
  try {
    const service = createBillingService({ db, clock, demoMode: true });
    const auth = createAuth({ db, clock });
    const actor = await auth.addUser({
      name: 'Synthetic Recovery Administrator',
      email: 'recovery-admin@example.test',
      role: 'admin',
      password: 'synthetic-backup-fixture-password-42',
    });
    const communications = createCommunications({ db, service, clock });
    const ledger = (type, payload) => service.execute(actor, { type, payload }, randomUUID());
    const communicate = (type, payload, key = randomUUID()) =>
      communications.execute(actor, { type: `communication.${type}`, payload }, key);
    const account = ledger('account.create', {
      name: 'Synthetic Recovery Family',
      billingName: 'Synthetic Recovery Payer',
      email: 'recovery-payer@example.test',
      address: '1 Sample Street',
      contactAllowed: true,
    });
    const draft = ledger('invoice.create', {
      accountId: account.id,
      issueDate: '2026-09-01',
      dueDate: '2026-09-20',
      year: 2027,
      term: 'Term 1',
      description: 'Synthetic recovery invoice',
      lines: [
        {
          description: 'Sample tuition',
          quantity: 1,
          unitCents: 10000,
          discountCents: 0,
          taxCode: 'GST_FREE',
          category: 'tuition',
          accountCode: '200',
        },
      ],
    });
    const invoice = ledger('invoice.issue', { id: draft.id, expectedRevision: draft.revision });
    const payment = ledger('payment.record', {
      accountId: account.id,
      purpose: 'fees',
      amountCents: 3000,
      paidOn: '2026-09-11',
      method: 'bank_transfer',
      reference: 'SYNTHETIC-RECOVERY-TRANSFER',
    });
    ledger('payment.confirm', {
      id: payment.id,
      evidence: 'Synthetic fixture evidence only',
      allocations: [{ invoiceId: invoice.id, amountCents: 3000 }],
    });
    const settings = communications.getState(actor).settings;
    communicate('settings', {
      ...settings,
      expectedRevision: settings.revision,
      automaticInvoices: true,
      reminderOffsets: [0, 7, 14],
    });
    const message = communicate('create', { kind: 'invoice', documentId: invoice.id });
    communicate('approve', { id: message.id, expectedRevision: message.revision });
    const claim = communications.claimNext();
    const identity = {
      id: claim.message.id,
      attemptId: claim.attemptId,
      leaseToken: claim.leaseToken,
    };
    assert.equal(communications.validateClaim(identity), true);
    // Simulate bookkeeping only. No transport, network client or email sender is constructed.
    const uncertain = communications.finishAttempt({
      ...identity,
      outcome: 'uncertain',
      errorCode: 'SYNTHETIC_LOST_RESPONSE',
      attachmentSha256: 'b'.repeat(64),
    });
    const resolutionPayload = {
      id: uncertain.id,
      expectedRevision: uncertain.revision,
      outcome: 'accepted',
      providerId: 'synthetic-provider-acceptance',
      reason: 'Synthetic recovery verification',
      evidence: 'Synthetic provider log fixture confirms acceptance of this attempt.',
    };
    const resolved = communicate('resolve', resolutionPayload, 'synthetic-resolution-operation');
    communicate('hold', {
      accountId: account.id,
      paused: true,
      reason: 'Synthetic outbound pause retained during recovery',
    });
    const before = {
      communications: communications.getState(actor),
      ledger: service.getState(actor),
      staff: auth.listUsers(),
    };
    assert.equal(before.ledger.summary.outstandingCents, 7000);
    const manifest = await createBackup({ sourcePath: source, targetPath: backup });
    for (const table of [
      'billing_accounts',
      'billing_invoices',
      'billing_receipts',
      'auth_users',
      'comms_settings',
      'comms_holds',
      'comms_messages',
      'comms_attempts',
      'comms_results',
      'comms_dispatches',
      'comms_resolutions',
    ])
      assert.equal(manifest.rowCounts[table], 1, table);
    assert.ok(manifest.rowCounts.comms_events > 1);
    assert.ok(manifest.rowCounts.comms_operations > 1);
    assert.equal(inspectBackup(backup).contentSha256, manifest.contentSha256);
    copyFileSync(backup, restored);
    // The live database can change after backup; the separate restore must retain its snapshot.
    communicate('hold', {
      accountId: account.id,
      paused: false,
      reason: 'Later source-only change',
    });
    restoredDb = openDatabase(restored);
    const restoredService = createBillingService({ db: restoredDb, clock, demoMode: true });
    const restoredAuth = createAuth({ db: restoredDb, clock });
    const restoredCommunications = createCommunications({
      db: restoredDb,
      service: restoredService,
      clock,
    });
    assert.deepEqual(restoredService.getState(actor), before.ledger);
    assert.deepEqual(restoredAuth.listUsers(), before.staff);
    assert.deepEqual(restoredCommunications.getState(actor), before.communications);
    assert.deepEqual(
      restoredCommunications.execute(
        actor,
        { type: 'communication.resolve', payload: resolutionPayload },
        'synthetic-resolution-operation',
      ),
      resolved,
    );
    assert.equal(
      restoredDb.prepare('SELECT outcome FROM comms_results WHERE attemptId=?').get(claim.attemptId)
        .outcome,
      'uncertain',
    );
    assert.equal(
      restoredDb
        .prepare('SELECT outcome FROM comms_resolutions WHERE attemptId=?')
        .get(claim.attemptId).outcome,
      'accepted',
    );
    assert.throws(
      () =>
        restoredCommunications.finishAttempt({
          ...identity,
          outcome: 'accepted',
          providerId: 'late-old-worker',
        }),
      (error) => error.code === 'ATTEMPT_MANUALLY_RESOLVED',
    );
    assert.throws(() => restoredDb.exec('DELETE FROM comms_resolutions'), /Immutable/);
    assert.equal(restoredCommunications.claimNext(), null);
    assert.equal(inspectBackup(backup).contentSha256, manifest.contentSha256);
  } finally {
    restoredDb?.close();
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
