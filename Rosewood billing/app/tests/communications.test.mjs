import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { createCommunications } from '../src/communications.mjs';

const admin = { id: 'comms-admin', name: 'Synthetic Administrator', role: 'admin' };
const finance = { id: 'comms-finance', name: 'Synthetic Finance', role: 'finance' };
const billing = { id: 'comms-billing', name: 'Synthetic Billing', role: 'billing' };
const viewer = { id: 'comms-viewer', name: 'Synthetic Viewer', role: 'viewer' };
function setup(t, { path = ':memory:' } = {}) {
  let instant = new Date('2026-09-12T04:00:00Z');
  const clock = () => new Date(instant),
    db = openDatabase(path),
    service = createBillingService({ db, clock, demoMode: true });
  const comms = createCommunications({ db, service, clock });
  t.after(() => db.close());
  const ledger = (type, payload) => service.execute(admin, { type, payload }, randomUUID());
  const command = (type, payload, actor = finance, key = randomUUID()) =>
    comms.execute(actor, { type: `communication.${type}`, payload }, key);
  const account = () =>
    ledger('account.create', {
      name: 'Synthetic Family',
      billingName: 'Synthetic Payer',
      email: `${randomUUID()}@example.test`,
      address: '1 Sample Street',
      contactAllowed: true,
    });
  const invoice = (a, dueDate = '2026-09-05') => {
    const draft = ledger('invoice.create', {
      accountId: a.id,
      issueDate: '2026-09-01',
      dueDate,
      year: 2027,
      term: 'Term 1',
      description: 'Synthetic fee',
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
    return ledger('invoice.issue', { id: draft.id, expectedRevision: draft.revision });
  };
  const payment = (a, extra = {}) =>
    ledger('payment.record', {
      accountId: a.id,
      amountCents: 10000,
      purpose: 'fees',
      paidOn: '2026-09-10',
      method: 'bank_transfer',
      reference: randomUUID(),
      ...extra,
    });
  const confirm = (p, allocations = []) =>
    ledger('payment.confirm', { id: p.id, evidence: 'Verified synthetic evidence', allocations });
  const state = () => comms.getState(admin);
  const settings = (extra) =>
    command('settings', {
      ...state().settings,
      expectedRevision: state().settings.revision,
      ...extra,
    });
  const draft = (kind, id) => command('create', { kind, documentId: id }, billing);
  const approve = (message) =>
    command('approve', { id: message.id, expectedRevision: message.revision });
  const owned = (claim) => ({
    id: claim.message.id,
    attemptId: claim.attemptId,
    leaseToken: claim.leaseToken,
  });
  return {
    db,
    service,
    comms,
    ledger,
    command,
    account,
    invoice,
    payment,
    confirm,
    state,
    settings,
    draft,
    approve,
    owned,
    setTime: (value) => {
      instant = new Date(value);
    },
  };
}
const errorCode = (fn, code) =>
  assert.throws(fn, (error) => error.code === code, `Expected ${code}`);

test('default automation is off, roles are enforced and empty internal polls create no history', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a);
  assert.equal(f.state().settings.mode, 'review');
  assert.equal(f.state().settings.automaticInvoices, false);
  assert.equal(f.state().settings.startDate, '2026-09-12');
  assert.equal(f.comms.prepareAutomatic().createdCount, 0);
  assert.equal(f.state().events.length, 0);
  errorCode(
    () => f.command('create', { kind: 'invoice', documentId: invoice.id }, viewer),
    'FORBIDDEN',
  );
  const draft = f.draft('invoice', invoice.id);
  errorCode(
    () => f.command('approve', { id: draft.id, expectedRevision: draft.revision }, billing),
    'FORBIDDEN',
  );
  errorCode(() => f.command('settings', {}, billing), 'FORBIDDEN');
  assert.equal(f.state().summary.draftCount, 1);
});

test('manual and automatic event identities prevent duplicate documents across actors and keys', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a),
    payload = { kind: 'invoice', documentId: invoice.id };
  const first = f.command('create', payload, billing, 'same-key');
  assert.deepEqual(f.command('create', payload, billing, 'same-key'), first);
  assert.equal(f.command('create', payload, finance).id, first.id);
  errorCode(
    () => f.command('create', { ...payload, kind: 'statement' }, billing, 'same-key'),
    'IDEMPOTENCY_CONFLICT',
  );
  f.settings({ automaticInvoices: true, mode: 'automatic' });
  assert.equal(f.comms.prepareAutomatic().createdCount, 0);
  assert.equal(f.state().messages.length, 1);
  assert.equal(f.state().messages[0].status, 'draft');
  assert.throws(() => f.db.exec('DELETE FROM comms_events'), /Immutable/);
});

test('draft content is editable but current recipient changes require a fresh review before approval', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a);
  let draft = f.draft('invoice', invoice.id);
  draft = f.command(
    'update',
    {
      id: draft.id,
      expectedRevision: draft.revision,
      subject: 'Reviewed sample subject',
      body: 'Reviewed plain text body',
    },
    billing,
  );
  f.ledger('account.update', {
    ...a,
    expectedRevision: a.revision,
    email: 'new-payer@example.test',
  });
  const blocked = f.approve(draft);
  assert.equal(blocked.status, 'blocked');
  assert.equal(f.comms.claimNext(), null);
  const refreshed = f.command('refresh', { id: blocked.id, expectedRevision: blocked.revision });
  assert.equal(refreshed.status, 'draft');
  assert.equal(refreshed.to, 'new-payer@example.test');
  const queued = f.approve(refreshed);
  assert.equal(queued.status, 'queued');
  errorCode(
    () =>
      f.command('update', {
        id: queued.id,
        expectedRevision: queued.revision,
        subject: 'Change',
        body: 'Change',
      }),
    'COMMUNICATION_STATE',
  );
  errorCode(
    () => f.command('approve', { id: queued.id, expectedRevision: draft.revision }),
    'STALE_REVISION',
  );
});

test('missing consent, account holds and archived accounts cannot prepare or dispatch outbound email', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a);
  f.command('hold', { accountId: a.id, paused: true, reason: 'Family asked for a pause' });
  errorCode(() => f.draft('invoice', invoice.id), 'COMMUNICATION_INELIGIBLE');
  f.command('hold', { accountId: a.id, paused: false, reason: 'Family confirmed contact' });
  const queued = f.approve(f.draft('invoice', invoice.id));
  f.ledger('account.update', { ...a, expectedRevision: a.revision, contactAllowed: false });
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.state().messages.find((m) => m.id === queued.id).status, 'blocked');
  const b = f.account(),
    other = f.invoice(b);
  f.ledger('account.update', { ...b, expectedRevision: b.revision, status: 'archived' });
  errorCode(() => f.draft('invoice', other.id), 'COMMUNICATION_INELIGIBLE');
});

test('final pre-dispatch validation stops a hold introduced while the PDF is rendering', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a);
  f.approve(f.draft('invoice', invoice.id));
  const claim = f.comms.claimNext();
  assert.ok(claim);
  f.command('hold', { accountId: a.id, paused: true, reason: 'Stop all contact now' });
  assert.equal(f.comms.validateClaim(f.owned(claim)), false);
  const message = f.state().messages[0];
  assert.equal(message.status, 'blocked');
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.db.prepare('SELECT outcome FROM comms_results').get().outcome, 'failed');
});

test('reminders suppress paid invoices and pending reported fees, then choose only the highest matured offset', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a),
    pending = f.payment(a);
  f.settings({ remindersEnabled: true });
  assert.equal(f.comms.prepareAutomatic().createdCount, 0);
  f.ledger('payment.reject', { id: pending.id, reason: 'Duplicate report' });
  const result = f.comms.prepareAutomatic();
  assert.equal(result.createdCount, 1);
  const reminder = f.state().messages[0];
  assert.equal(reminder.kind, 'reminder');
  assert.equal(reminder.offsetDays, 7);
  assert.match(reminder.body, /100\.00/);
  f.approve(reminder);
  const paid = f.payment(a);
  f.confirm(paid, [{ invoiceId: invoice.id, amountCents: 10000 }]);
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.state().messages[0].status, 'blocked');
  f.setTime('2026-09-25T04:00:00Z');
  assert.equal(f.comms.prepareAutomatic().createdCount, 0);
});

test('newer reminder cycles supersede unsent older drafts and automation never backfills before its start date', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a);
  f.settings({ remindersEnabled: true, automaticInvoices: true, startDate: '2026-09-13' });
  assert.equal(f.comms.prepareAutomatic().createdCount, 0);
  f.settings({ automaticInvoices: false, startDate: '2026-09-12' });
  assert.equal(f.comms.prepareAutomatic().createdCount, 1);
  f.setTime('2026-09-20T04:00:00Z');
  const result = f.comms.prepareAutomatic();
  assert.equal(result.createdCount, 1);
  assert.equal(result.supersededCount, 1);
  const messages = f.state().messages;
  assert.equal(messages.find((m) => m.offsetDays === 7).status, 'cancelled');
  assert.equal(messages.find((m) => m.offsetDays === 14).status, 'draft');
  assert.equal(f.comms.prepareAutomatic().createdCount, 0);
});

test('automatic mode queues only eligible new events and disabling the policy blocks queued automatic work', (t) => {
  const f = setup(t),
    a = f.account();
  f.invoice(a);
  f.settings({ automaticInvoices: true, mode: 'automatic' });
  const result = f.comms.prepareAutomatic();
  assert.equal(result.queuedCount, 1);
  assert.equal(f.comms.prepareAutomatic().createdCount, 0);
  f.settings({ automaticInvoices: false });
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.state().messages[0].status, 'blocked');
});

test('void invoices and reversed receipts are blocked at claim, while original snapshot previews remain immutable', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.invoice(a),
    draft = f.draft('invoice', invoice.id);
  const before = f.comms.getAttachment(viewer, draft.id);
  f.approve(draft);
  f.ledger('invoice.void', { id: invoice.id, reason: 'Cancelled charge' });
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.comms.getAttachment(viewer, draft.id).document.status, 'issued');
  assert.deepEqual(f.comms.getAttachment(viewer, draft.id), before);
  const p = f.confirm(f.payment(a)),
    receipt = f.service.getState(admin).receipts.find((r) => r.paymentId === p.id);
  f.approve(f.draft('receipt', receipt.id));
  f.ledger('payment.reverse', { id: p.id, reason: 'Wrong entry' });
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.state().summary.blockedCount, 2);
});

test('accepted means provider acknowledgement, records actual attachment hash and never retries automatically', (t) => {
  const f = setup(t),
    a = f.account();
  f.approve(f.draft('invoice', f.invoice(a).id));
  const claim = f.comms.claimNext();
  const lease = f.owned(claim);
  assert.equal(f.comms.validateClaim(lease), true);
  errorCode(() => f.comms.validateClaim(lease), 'ATTEMPT_DISPATCHED');
  const outcome = {
    ...lease,
    outcome: 'accepted',
    providerId: 'synthetic-provider-id',
    attachmentSha256: 'a'.repeat(64),
  };
  const accepted = f.comms.finishAttempt(outcome);
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.sentAttachmentSha256, 'a'.repeat(64));
  assert.deepEqual(f.comms.finishAttempt(outcome), accepted);
  assert.equal(f.comms.claimNext(), null);
  errorCode(
    () =>
      f.command('retry', {
        id: accepted.id,
        expectedRevision: accepted.revision,
        reason: 'Try again',
      }),
    'COMMUNICATION_STATE',
  );
  const stored = f.db.prepare('SELECT leaseHash,payload FROM comms_attempts').get();
  assert.notEqual(stored.leaseHash, lease.leaseToken);
  assert.equal(JSON.parse(stored.payload).to, a.email);
  assert.ok(!JSON.stringify(f.state()).includes(lease.leaseToken));
});

test('definite failure requires an explicit finance retry; unknown outcomes and expired leases never requeue', (t) => {
  const f = setup(t),
    a = f.account();
  f.approve(f.draft('invoice', f.invoice(a).id));
  let claim = f.comms.claimNext();
  let failed = f.comms.finishAttempt({
    ...f.owned(claim),
    outcome: 'failed',
    errorCode: 'MAIL_REJECTED',
  });
  assert.equal(f.comms.claimNext(), null);
  f.command('retry', {
    id: failed.id,
    expectedRevision: failed.revision,
    reason: 'Definite rejection resolved',
  });
  claim = f.comms.claimNext();
  assert.equal(f.comms.validateClaim(f.owned(claim)), true);
  f.setTime('2026-09-12T04:03:00Z');
  assert.equal(f.comms.recoverExpired().recoveredCount, 1);
  assert.equal(f.comms.recoverExpired().recoveredCount, 0);
  const uncertain = f.state().messages[0];
  assert.equal(uncertain.status, 'uncertain');
  assert.equal(f.comms.claimNext(), null);
  errorCode(
    () =>
      f.command('retry', {
        id: uncertain.id,
        expectedRevision: uncertain.revision,
        reason: 'Network timed out',
      }),
    'COMMUNICATION_STATE',
  );
  const accepted = f.comms.finishAttempt({
    ...f.owned(claim),
    outcome: 'accepted',
    providerId: 'late-confirmed-provider-id',
  });
  assert.equal(accepted.status, 'accepted');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM comms_attempts').get().count, 2);
});

test('a lost provider response stays uncertain and a forged lease cannot finalize another attempt', (t) => {
  const f = setup(t),
    a = f.account();
  f.approve(f.draft('invoice', f.invoice(a).id));
  const claim = f.comms.claimNext();
  f.comms.validateClaim(f.owned(claim));
  errorCode(
    () =>
      f.comms.finishAttempt({
        ...f.owned(claim),
        leaseToken: 'forged-token',
        outcome: 'accepted',
        providerId: 'invalid',
      }),
    'INVALID_LEASE',
  );
  f.comms.finishAttempt({ ...f.owned(claim), outcome: 'uncertain', errorCode: 'MAIL_TIMEOUT' });
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.state().summary.uncertainCount, 1);
});

test('finance can prepare one current resend draft per idempotent request without rewriting accepted history', (t) => {
  const f = setup(t),
    a = f.account();
  f.approve(f.draft('invoice', f.invoice(a).id));
  const claim = f.comms.claimNext();
  f.comms.validateClaim(f.owned(claim));
  const accepted = f.comms.finishAttempt({
    ...f.owned(claim),
    outcome: 'accepted',
    providerId: 'original-provider-id',
  });
  const originalAttachment = f.comms.getAttachment(admin, accepted.id);
  f.ledger('account.update', {
    ...a,
    expectedRevision: a.revision,
    email: 'requested-recipient@example.test',
  });
  const payload = {
    id: accepted.id,
    expectedRevision: accepted.revision,
    reason: 'Payer requested another copy; address verified',
  };
  errorCode(() => f.command('resend', payload, billing), 'FORBIDDEN');
  errorCode(() => f.command('resend', { ...payload, reason: '' }), 'INVALID_TEXT');
  const draft = f.command('resend', payload, finance, 'resend-once');
  assert.notEqual(draft.id, accepted.id);
  assert.equal(draft.parentMessageId, accepted.id);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.to, 'requested-recipient@example.test');
  assert.equal(draft.approvedAt, null);
  assert.deepEqual(f.command('resend', payload, finance, 'resend-once'), draft);
  assert.equal(f.state().messages.length, 2);
  assert.equal(f.comms.claimNext(), null);
  assert.deepEqual(
    f.state().messages.find((message) => message.id === accepted.id),
    accepted,
  );
  assert.deepEqual(f.comms.getAttachment(admin, accepted.id), originalAttachment);
  assert.throws(
    () => f.db.prepare('UPDATE comms_messages SET parentMessageId=NULL WHERE id=?').run(draft.id),
    /immutable/,
  );
});

test('cancelled drafts can restart as a new review draft, while holds and uncertain status still prevent resend', (t) => {
  const f = setup(t),
    a = f.account(),
    initial = f.draft('invoice', f.invoice(a).id);
  const cancelled = f.command(
    'cancel',
    { id: initial.id, expectedRevision: initial.revision, reason: 'Prepared too soon' },
    billing,
  );
  const restarted = f.command('resend', {
    id: cancelled.id,
    expectedRevision: cancelled.revision,
    reason: 'Family is ready for the invoice',
  });
  assert.equal(restarted.status, 'draft');
  assert.equal(restarted.parentMessageId, cancelled.id);
  assert.equal(
    f.state().messages.find((message) => message.id === cancelled.id).status,
    'cancelled',
  );
  f.approve(restarted);
  const claim = f.comms.claimNext();
  f.comms.validateClaim(f.owned(claim));
  const uncertain = f.comms.finishAttempt({
    ...f.owned(claim),
    outcome: 'uncertain',
    errorCode: 'MAIL_TIMEOUT',
  });
  errorCode(
    () =>
      f.command('resend', {
        id: uncertain.id,
        expectedRevision: uncertain.revision,
        reason: 'Unknown is not proof of failure',
      }),
    'COMMUNICATION_STATE',
  );
  f.command('hold', { accountId: a.id, paused: true, reason: 'No further messages' });
  errorCode(
    () =>
      f.command('resend', {
        id: cancelled.id,
        expectedRevision: cancelled.revision,
        reason: 'Attempt while held',
      }),
    'COMMUNICATION_INELIGIBLE',
  );
});

test('uncertain delivery requires finance evidence and provider acceptance ID before manual acceptance', (t) => {
  const f = setup(t),
    a = f.account();
  f.approve(f.draft('invoice', f.invoice(a).id));
  const claim = f.comms.claimNext();
  f.comms.validateClaim(f.owned(claim));
  const uncertain = f.comms.finishAttempt({
    ...f.owned(claim),
    outcome: 'uncertain',
    errorCode: 'MAIL_TIMEOUT',
  });
  const payload = {
    id: uncertain.id,
    expectedRevision: uncertain.revision,
    outcome: 'accepted',
    providerId: 'verified-provider-id',
    reason: 'Reviewed provider acceptance logs',
    evidence:
      'Synthetic provider log acceptance event at the original attempt time, verified by finance.',
  };
  errorCode(() => f.command('resolve', payload, billing), 'FORBIDDEN');
  for (const missing of ['reason', 'evidence', 'providerId'])
    errorCode(() => f.command('resolve', { ...payload, [missing]: '' }), 'INVALID_TEXT');
  const resolved = f.command('resolve', payload, finance, 'resolve-accepted-once');
  assert.equal(resolved.status, 'accepted');
  assert.equal(resolved.providerId, 'verified-provider-id');
  assert.equal(resolved.resolution.outcome, 'accepted');
  assert.equal(resolved.resolution.evidence, payload.evidence);
  assert.deepEqual(f.command('resolve', payload, finance, 'resolve-accepted-once'), resolved);
  assert.equal(
    f.db.prepare('SELECT outcome FROM comms_results WHERE attemptId=?').get(claim.attemptId)
      .outcome,
    'uncertain',
  );
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM comms_resolutions').get().count, 1);
  assert.throws(() => f.db.exec('DELETE FROM comms_resolutions'), /Immutable/);
  errorCode(
    () =>
      f.comms.finishAttempt({
        ...f.owned(claim),
        outcome: 'accepted',
        providerId: 'late-callback-id',
      }),
    'ATTEMPT_MANUALLY_RESOLVED',
  );
  assert.equal(f.state().messages[0].providerId, 'verified-provider-id');
  assert.equal(f.comms.claimNext(), null);
});

test('verified not-sent resolution permits only a separate checked retry and rejects late original callbacks', (t) => {
  const f = setup(t),
    a = f.account();
  f.approve(f.draft('invoice', f.invoice(a).id));
  const original = f.comms.claimNext();
  f.comms.validateClaim(f.owned(original));
  f.setTime('2026-09-12T04:03:00Z');
  f.comms.recoverExpired();
  const uncertain = f.state().messages[0];
  const failed = f.command('resolve', {
    id: uncertain.id,
    expectedRevision: uncertain.revision,
    outcome: 'not_sent',
    reason: 'Provider review completed',
    evidence: 'Provider support confirmed the original attempt was rejected before acceptance.',
  });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.resolution.outcome, 'not_sent');
  assert.equal(f.comms.claimNext(), null);
  errorCode(
    () =>
      f.comms.finishAttempt({
        ...f.owned(original),
        outcome: 'accepted',
        providerId: 'late-old-result',
      }),
    'ATTEMPT_MANUALLY_RESOLVED',
  );
  f.command('retry', {
    id: failed.id,
    expectedRevision: failed.revision,
    reason: 'Verified rejection; retry approved',
  });
  const retry = f.comms.claimNext();
  assert.notEqual(retry.attemptId, original.attemptId);
  errorCode(
    () =>
      f.comms.finishAttempt({
        ...f.owned(original),
        outcome: 'uncertain',
        errorCode: 'OLD_CALLBACK',
      }),
    'INVALID_LEASE',
  );
  f.comms.validateClaim(f.owned(retry));
  const accepted = f.comms.finishAttempt({
    ...f.owned(retry),
    outcome: 'accepted',
    providerId: 'new-attempt-provider-id',
  });
  assert.equal(accepted.status, 'accepted');
  assert.equal(
    f.db.prepare('SELECT outcome FROM comms_resolutions WHERE attemptId=?').get(original.attemptId)
      .outcome,
    'not_sent',
  );
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM comms_attempts').get().count, 2);
});

test('statement review expires on a new Melbourne day, without ordinary preview reads invalidating approvals', (t) => {
  const f = setup(t),
    a = f.account();
  f.invoice(a);
  const statement = f.draft('statement', a.id);
  f.comms.getAttachment(admin, statement.id);
  assert.equal(f.approve(statement).status, 'queued');
  f.setTime('2026-09-12T15:00:00Z');
  assert.equal(f.comms.claimNext(), null);
  assert.equal(f.state().messages[0].status, 'blocked');
});

test('preparation has a bounded batch size and its durable unique events survive reopening', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'rwc-comms-persist-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const f = setup(t, { path: join(folder, 'billing.sqlite') }),
    a = f.account();
  f.invoice(a);
  f.invoice(a);
  f.settings({ automaticInvoices: true });
  const result = f.command('prepare', { limit: 1 });
  assert.equal(result.createdCount, 1);
  assert.equal(result.hasMore, true);
  assert.equal(f.command('prepare', { limit: 1 }).createdCount, 1);
  const otherDb = openDatabase(join(folder, 'billing.sqlite'));
  try {
    const service = createBillingService({
      db: otherDb,
      demoMode: true,
      clock: () => new Date('2026-09-12T04:00:00Z'),
    });
    const reopened = createCommunications({ db: otherDb, service });
    assert.equal(reopened.prepareAutomatic().createdCount, 0);
    assert.equal(reopened.getState(admin).messages.length, 2);
  } finally {
    otherDb.close();
  }
});

test('two real worker connections cannot claim the same queued message', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'rwc-comms-race-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const path = join(folder, 'billing.sqlite');
  const f = setup(t, { path }),
    a = f.account();
  f.approve(f.draft('invoice', f.invoice(a).id));
  const shared = new SharedArrayBuffer(4),
    gate = new Int32Array(shared);
  const script = `const {parentPort,workerData}=require('node:worker_threads'); (async()=>{const {openDatabase}=await import(workerData.database);const {createBillingService}=await import(workerData.service);const {createCommunications}=await import(workerData.communications);const db=openDatabase(workerData.path);const clock=()=>new Date('2026-09-12T04:00:00Z');const service=createBillingService({db,clock,demoMode:true});const comms=createCommunications({db,service,clock});parentPort.postMessage({ready:true});Atomics.wait(new Int32Array(workerData.shared),0,0);const result=comms.claimNext();parentPort.postMessage({id:result?.message.id??null});db.close();})().catch(error=>{parentPort.postMessage({error:error.message});process.exitCode=1;});`;
  const launch = () =>
    new Promise((resolve, reject) => {
      const worker = new Worker(script, {
        eval: true,
        workerData: {
          path,
          shared,
          database: new URL('../src/database.mjs', import.meta.url).href,
          service: new URL('../src/service.mjs', import.meta.url).href,
          communications: new URL('../src/communications.mjs', import.meta.url).href,
        },
      });
      worker.on('error', reject);
      worker.on('message', (result) => {
        if (result.ready) {
          if (Atomics.add(gate, 0, 0) === 0) ready++;
          if (ready === 2) {
            Atomics.store(gate, 0, 1);
            Atomics.notify(gate, 0);
          }
        } else if (result.error) reject(new Error(result.error));
        else resolve(result.id);
      });
    });
  let ready = 0;
  const results = await Promise.all([launch(), launch()]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM comms_attempts').get().count, 1);
});
