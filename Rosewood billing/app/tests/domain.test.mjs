import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { seedDemo } from '../src/seed.mjs';
import { proportional, validDate, melbourneDate } from '../src/money.mjs';

const admin = {
  id: 'admin-test',
  name: 'Synthetic Finance Administrator',
  email: 'admin@example.test',
  role: 'admin',
};
const finance = {
  id: 'finance-test',
  name: 'Synthetic Finance Staff',
  email: 'finance@example.test',
  role: 'finance',
};
const billing = { id: 'billing-test', name: 'Synthetic Billing Staff', role: 'billing' };
const viewer = { id: 'viewer-test', name: 'Synthetic Viewer', role: 'viewer' };
const fixed = () => new Date('2026-09-12T04:00:00Z');
function setup(t, { demoMode = true, path = ':memory:', clock = fixed } = {}) {
  const db = openDatabase(path),
    service = createBillingService({ db, clock, demoMode });
  t.after(() => db.close());
  const cmd = (type, payload, actor = admin, key = randomUUID()) =>
    service.execute(actor, { type, payload }, key);
  const account = (name = 'Synthetic Test') =>
    cmd('account.create', {
      name,
      billingName: name,
      email: 'payer@example.test',
      address: '1 Sample Street',
      contactAllowed: false,
    });
  const student = (accountId, name = 'Synthetic Student') =>
    cmd('student.create', {
      accountId,
      name,
      yearLevel: 'Foundation',
      entryYear: 2027,
      status: 'prospective',
    });
  const line = (amount = 10000, extra = {}) => ({
    description: 'Sample tuition',
    quantity: 1,
    unitCents: amount,
    discountCents: 0,
    taxCode: 'GST_FREE',
    category: 'tuition',
    accountCode: '200',
    ...extra,
  });
  const draft = (accountId, lines = [line()], extra = {}) =>
    cmd('invoice.create', {
      accountId,
      issueDate: '2026-08-01',
      dueDate: '2026-09-01',
      year: 2027,
      term: 'Term 1',
      description: 'Sample invoice',
      lines,
      ...extra,
    });
  const issue = (d) => cmd('invoice.issue', { id: d.id, expectedRevision: d.revision });
  const payment = (accountId, amountCents = 10000, extra = {}) =>
    cmd('payment.record', {
      accountId,
      purpose: 'fees',
      amountCents,
      paidOn: '2026-09-01',
      method: 'bank_transfer',
      reference: randomUUID(),
      ...extra,
    });
  const confirm = (p, allocations = []) =>
    cmd('payment.confirm', {
      id: p.id,
      evidence: 'Verified synthetic bank transaction',
      allocations,
    });
  const state = () => service.getState(admin);
  return { db, service, cmd, account, student, line, draft, issue, payment, confirm, state };
}
function errorCode(fn, code) {
  assert.throws(fn, (e) => e.code === code, `Expected ${code}`);
}

test('empty live database is never silently seeded or reopened as sample', (t) => {
  const f = setup(t, { demoMode: false });
  assert.equal(f.state().settings.demoMode, false);
  assert.equal(f.state().accounts.length, 0);
  assert.throws(() => seedDemo(f.service), /sample database/);
  errorCode(
    () => createBillingService({ db: f.db, clock: fixed, demoMode: true }),
    'MODE_MISMATCH',
  );
});

test('named roles are enforced inside service; direct calls cannot bypass HTTP', (t) => {
  const f = setup(t);
  errorCode(() => f.service.getState(null), 'AUTH_REQUIRED');
  errorCode(() => f.cmd('account.create', { name: 'X' }, viewer), 'FORBIDDEN');
  const a = f.account();
  const p = f.payment(a.id);
  errorCode(() => f.cmd('payment.confirm', { id: p.id, evidence: 'X' }, billing), 'FORBIDDEN');
  errorCode(() => f.cmd('settings.update', {}, finance), 'FORBIDDEN');
  errorCode(() => f.service.recordExport(viewer, 'xero', { sha256: 'a'.repeat(64) }), 'FORBIDDEN');
  assert.equal(f.service.getState(viewer).accounts.length, 1);
});

test('Xero identity is optional, revision controlled and independent of frozen payer identity', (t) => {
  const f = setup(t),
    a = f.account();
  assert.equal(a.xeroContactName, '');
  const invoice = f.issue(f.draft(a.id));
  const mapped = f.cmd('account.update', {
    ...a,
    expectedRevision: a.revision,
    xeroContactName: '  Existing Xero Payer  ',
  });
  assert.equal(mapped.xeroContactName, 'Existing Xero Payer');
  assert.equal(mapped.revision, 2);
  const { xeroContactName, ...withoutMapping } = mapped;
  const renamed = f.cmd('account.update', {
    ...withoutMapping,
    expectedRevision: mapped.revision,
    name: 'New local family label',
    billingName: 'Updated legal payer',
  });
  assert.equal(renamed.xeroContactName, xeroContactName);
  const snapshot = f.service.getDocument(admin, 'invoice', invoice.id).account;
  assert.equal(snapshot.billingName, a.billingName);
  assert.equal(snapshot.xeroContactName, '');
  const cleared = f.cmd('account.update', {
    ...renamed,
    expectedRevision: renamed.revision,
    xeroContactName: '',
  });
  assert.equal(cleared.xeroContactName, '');
  errorCode(
    () =>
      f.cmd('account.update', {
        ...cleared,
        expectedRevision: cleared.revision,
        xeroContactName: 'bad\nname',
      }),
    'INVALID_TEXT',
  );
  assert.equal(f.state().audit.filter((e) => e.action === 'account.update').length, 3);
});

test('existing local schema gets an empty Xero mapping without changing account identity', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'rosewood-schema-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'billing.sqlite');
  const legacy = new DatabaseSync(path);
  legacy.exec(
    "CREATE TABLE billing_accounts(id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,billingName TEXT NOT NULL,email TEXT NOT NULL,address TEXT NOT NULL,contactAllowed INTEGER NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,createdAt TEXT NOT NULL) STRICT; INSERT INTO billing_accounts VALUES('legacy','RWC-ACC-000001','Legacy family','Legacy payer','','',0,'active',1,'2026-09-12T04:00:00Z')",
  );
  legacy.close();
  const db = openDatabase(path);
  assert.equal(
    db.prepare('SELECT xeroContactName FROM billing_accounts').get().xeroContactName,
    '',
  );
  assert.equal(
    db.prepare('SELECT billingName FROM billing_accounts').get().billingName,
    'Legacy payer',
  );
  db.close();
});

test('calendar validation and Melbourne overdue boundaries include partially paid balances', (t) => {
  assert.equal(melbourneDate(new Date('2026-09-11T15:00:00Z')), '2026-09-12');
  assert.equal(melbourneDate(new Date('2026-12-31T13:30:00Z')), '2027-01-01');
  for (const date of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-9-01', 'invalid'])
    errorCode(() => validDate(date), 'INVALID_DATE');
  assert.equal(validDate('2028-02-29'), '2028-02-29');
  const f = setup(t),
    a = f.account();
  const dueToday = f.issue(f.draft(a.id, [f.line(100)], { dueDate: '2026-09-12' }));
  const overdue = f.issue(f.draft(a.id, [f.line(1000)], { dueDate: '2026-09-11' }));
  f.confirm(f.payment(a.id, 300), [{ invoiceId: overdue.id, amountCents: 300 }]);
  const s = f.state();
  assert.equal(s.invoices.find((i) => i.id === dueToday.id).overdue, false);
  assert.equal(s.summary.overdueCents, 700);
  assert.equal(s.summary.ageing[0].amountCents, 100);
  assert.equal(s.summary.ageing[1].amountCents, 700);
  errorCode(() => f.payment(a.id, 100, { paidOn: '2026-09-13' }), 'FUTURE_PAYMENT');
  const midnight = setup(t, { clock: () => new Date('2026-09-11T15:00:00Z') }),
    ma = midnight.account();
  assert.equal(midnight.service.getDocument(viewer, 'statement', ma.id).today, '2026-09-12');
});

test('integer cents, discounts and line tax are calculated by server', (t) => {
  const f = setup(t),
    a = f.account();
  const d = f.draft(a.id, [f.line(1005, { quantity: 3, discountCents: 100, taxCode: 'GST_10' })]);
  assert.equal(d.subtotalCents, 3015);
  assert.equal(d.discountCents, 100);
  assert.equal(d.taxCents, 292);
  assert.equal(d.totalCents, 3207);
  for (const amount of [0.5, -1, NaN, Infinity, '100', Number.MAX_SAFE_INTEGER])
    errorCode(() => f.draft(a.id, [f.line(amount)]), 'INVALID_AMOUNT');
  errorCode(() => f.draft(a.id, [f.line(100, { discountCents: 101 })]), 'INVALID_AMOUNT');
  assert.equal(proportional(11, 1, 2), 6);
});

test('issuing freezes payer/seller/student/line values and SQL guards protect history', (t) => {
  const f = setup(t),
    a = f.account(),
    s = f.student(a.id);
  const d = f.draft(a.id, [f.line(10000, { studentId: s.id })]),
    i = f.issue(d);
  f.cmd('account.update', {
    ...a,
    expectedRevision: a.revision,
    name: 'New name',
    billingName: 'New payer',
    address: 'Different address',
    status: 'active',
  });
  f.cmd('student.update', { ...s, expectedRevision: s.revision, name: 'New student' });
  const oldSettings = f.state().settings;
  f.cmd('settings.update', {
    ...oldSettings,
    expectedRevision: oldSettings.revision,
    paymentInstructions: 'New details',
  });
  const output = f.service.getDocument(viewer, 'invoice', i.id);
  assert.equal(output.account.billingName, 'Synthetic Test');
  assert.equal(output.document.lines[0].studentName, 'Synthetic Student');
  assert.equal(output.settings.paymentInstructions, '');
  assert.equal(output.document.lines[0].id, d.lines[0].id);
  errorCode(
    () => f.cmd('invoice.update', { ...i, expectedRevision: i.revision }),
    'INVOICE_IMMUTABLE',
  );
  assert.throws(
    () => f.db.prepare('UPDATE billing_invoices SET totalCents=1 WHERE id=?').run(i.id),
    /immutable/,
  );
  assert.throws(
    () =>
      f.db
        .prepare('UPDATE billing_invoice_lines SET description=? WHERE id=?')
        .run('tampered', i.lines[0].id),
    /immutable/,
  );
  assert.throws(() => f.db.exec('DELETE FROM billing_audit'), /Immutable/);
});

test('live issuing requires payer, seller and tax approval; GST requires valid registration', (t) => {
  const f = setup(t, { demoMode: false }),
    a = f.account(),
    d = f.draft(a.id);
  errorCode(() => f.issue(d), 'SELLER_NOT_CONFIGURED');
  const reported = f.payment(a.id);
  errorCode(() => f.confirm(reported), 'SELLER_NOT_CONFIGURED');
  assert.equal(f.state().receipts.length, 0);
  let settings = f.state().settings;
  settings = f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    legalName: 'Test Seller',
    address: '1 Test Street',
    email: 'school@example.test',
    paymentInstructions: 'School-configured payment details',
  });
  errorCode(() => f.issue(d), 'TAX_POLICY_NOT_APPROVED');
  f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    taxPolicyApproved: true,
  });
  f.issue(d);
  const taxable = f.draft(a.id, [f.line(1000, { taxCode: 'GST_10' })]);
  errorCode(() => f.issue(taxable), 'GST_NOT_REGISTERED');
  settings = f.state().settings;
  errorCode(
    () =>
      f.cmd('settings.update', {
        ...settings,
        expectedRevision: settings.revision,
        gstRegistered: true,
      }),
    'INVALID_ABN',
  );
  f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    gstRegistered: true,
    abn: '51824753556',
  });
  assert.equal(f.issue(taxable).taxCents, 100);
});

test('idempotent replay is actor scoped and content bound; stale writes never overwrite', (t) => {
  const f = setup(t),
    payload = {
      name: 'Synthetic Replay',
      billingName: 'Synthetic Replay',
      email: '',
      address: '',
      contactAllowed: false,
    };
  const a = f.cmd('account.create', payload, admin, 'operation-1'),
    again = f.cmd('account.create', payload, admin, 'operation-1');
  assert.deepEqual(again, a);
  assert.equal(f.state().accounts.length, 1);
  errorCode(
    () => f.cmd('account.create', { ...payload, name: 'Changed' }, admin, 'operation-1'),
    'IDEMPOTENCY_CONFLICT',
  );
  f.cmd('account.update', {
    ...a,
    expectedRevision: a.revision,
    name: 'Updated',
    status: 'active',
  });
  errorCode(
    () => f.cmd('account.update', { ...a, expectedRevision: a.revision, status: 'active' }),
    'STALE_REVISION',
  );
  assert.equal(f.state().accounts[0].name, 'Updated');
});

test('confirmation is atomic: invalid last allocation rolls back payment, receipt, audit and numbering', (t) => {
  const f = setup(t),
    a = f.account(),
    i = f.issue(f.draft(a.id)),
    p = f.payment(a.id, 20000);
  const before = f.state();
  errorCode(
    () =>
      f.confirm(p, [
        { invoiceId: i.id, amountCents: 10000 },
        { invoiceId: 'missing', amountCents: 10000 },
      ]),
    'NOT_FOUND',
  );
  const after = f.state();
  assert.equal(after.payments[0].status, 'pending');
  assert.equal(after.receipts.length, 0);
  assert.equal(after.allocations.length, 0);
  assert.equal(after.audit.length, before.audit.length);
  const good = f.confirm(p, [{ invoiceId: i.id, amountCents: 10000 }]);
  assert.equal(good.unallocatedCents, 10000);
  assert.equal(f.state().receipts[0].number, 'RWC-RCT-000001');
});

test('whitespace aliases cannot allocate or credit an invoice line twice in one transaction', (t) => {
  const f = setup(t),
    a = f.account(),
    invoice = f.issue(f.draft(a.id)),
    payment = f.payment(a.id, 20000);
  const allocations = [
    { invoiceId: invoice.id, amountCents: 6000 },
    { invoiceId: ` ${invoice.id} `, amountCents: 6000 },
  ];
  const before = f.state();
  errorCode(() => f.confirm(payment, allocations), 'DUPLICATE_ITEM');
  let after = f.state();
  assert.equal(after.payments[0].status, 'pending');
  assert.equal(after.receipts.length, 0);
  assert.equal(after.allocations.length, 0);
  assert.equal(after.audit.length, before.audit.length);
  assert.equal(after.invoices[0].balanceCents, 10000);
  f.confirm(payment);
  const confirmed = f.state();
  errorCode(() => f.cmd('payment.allocate', { id: payment.id, allocations }), 'DUPLICATE_ITEM');
  after = f.state();
  assert.equal(after.receipts.length, 1);
  assert.equal(after.allocations.length, 0);
  assert.equal(after.audit.length, confirmed.audit.length);
  assert.equal(after.payments[0].unallocatedCents, 20000);
  assert.equal(after.invoices[0].balanceCents, 10000);
  errorCode(
    () =>
      f.cmd('credit.create', {
        invoiceId: invoice.id,
        reason: 'Duplicate alias attempt',
        lines: [
          { invoiceLineId: invoice.lines[0].id, amountCents: 3000 },
          { invoiceLineId: ` ${invoice.lines[0].id} `, amountCents: 3000 },
        ],
      }),
    'DUPLICATE_ITEM',
  );
  assert.equal(f.state().credits.length, 0);
  f.cmd('payment.allocate', {
    id: payment.id,
    allocations: [{ invoiceId: ` ${invoice.id} `, amountCents: 10000 }],
  });
  assert.equal(f.state().invoices[0].balanceCents, 0);
});

test('pending money and bonds never reduce tuition balances; confirmed overpayment stays on account', (t) => {
  const f = setup(t),
    a = f.account(),
    i = f.issue(f.draft(a.id));
  const pending = f.payment(a.id, 10000);
  let state = f.state();
  assert.equal(state.summary.outstandingCents, 10000);
  assert.equal(state.summary.pendingCents, 10000);
  assert.equal(state.receipts.length, 0);
  const bond = f.payment(a.id, 5000, { purpose: 'bond' });
  errorCode(() => f.confirm(bond, [{ invoiceId: i.id, amountCents: 5000 }]), 'BOND_ALLOCATION');
  f.confirm(bond);
  f.confirm(pending, [{ invoiceId: i.id, amountCents: 6000 }]);
  state = f.state();
  assert.equal(state.summary.outstandingCents, 4000);
  assert.equal(state.summary.unallocatedCents, 4000);
  assert.equal(state.summary.bondHeldCents, 5000);
  assert.equal(state.summary.receivedCents, 10000);
  assert.equal(state.invoices[0].settlementStatus, 'part_paid');
  const doc = f.service.getDocument(
    admin,
    'receipt',
    state.receipts.find((r) => r.paymentId === bond.id).id,
  );
  assert.equal(doc.document.snapshot.bondHeldCents, 5000);
  assert.equal(doc.document.snapshot.unallocatedCents, 0);
});

test('one deposit can fund sibling invoices; cross-account and over-allocation are refused', (t) => {
  const f = setup(t),
    a = f.account(),
    b = f.account('Synthetic Other'),
    i1 = f.issue(f.draft(a.id)),
    i2 = f.issue(f.draft(a.id)),
    other = f.issue(f.draft(b.id));
  const p = f.confirm(f.payment(a.id, 25000), [
    { invoiceId: i1.id, amountCents: 10000 },
    { invoiceId: i2.id, amountCents: 8000 },
  ]);
  assert.equal(p.allocatedCents, 18000);
  assert.equal(p.unallocatedCents, 7000);
  errorCode(
    () =>
      f.cmd('payment.allocate', {
        id: p.id,
        allocations: [{ invoiceId: other.id, amountCents: 1000 }],
      }),
    'ACCOUNT_MISMATCH',
  );
  errorCode(
    () =>
      f.cmd('payment.allocate', {
        id: p.id,
        allocations: [{ invoiceId: i2.id, amountCents: 3000 }],
      }),
    'OVER_ALLOCATION',
  );
  f.cmd('payment.allocate', { id: p.id, allocations: [{ invoiceId: i2.id, amountCents: 2000 }] });
  assert.equal(f.state().summary.unallocatedCents, 5000);
});

test('duplicate confirmed bank evidence across staff/accounts and after reversal cannot issue a second receipt', (t) => {
  const f = setup(t),
    a = f.account(),
    b = f.account('Synthetic Other');
  const p = f.payment(a.id, 500, { reference: ' BANK Ref 1 ' });
  f.confirm(p);
  const duplicate = f.payment(b.id, 750, { purpose: 'bond', reference: 'bank   ref 1' });
  errorCode(
    () => f.cmd('payment.confirm', { id: duplicate.id, evidence: 'Other claim' }, finance),
    'DUPLICATE_PAYMENT_EVIDENCE',
  );
  f.cmd('payment.reverse', { id: p.id, reason: 'Entry was wrong' });
  errorCode(() => f.confirm(duplicate), 'DUPLICATE_PAYMENT_EVIDENCE');
  assert.equal(f.state().receipts.length, 1);
});

test('reject does not reserve payment evidence and duplicate allocations cannot double spend', (t) => {
  const f = setup(t),
    a = f.account(),
    i = f.issue(f.draft(a.id));
  const p = f.payment(a.id, 10000, { reference: 'ref1' });
  f.cmd('payment.reject', { id: p.id, reason: 'Unverified record' });
  const p2 = f.payment(a.id, 10000, { reference: 'ref1' });
  errorCode(
    () =>
      f.confirm(p2, [
        { invoiceId: i.id, amountCents: 5000 },
        { invoiceId: i.id, amountCents: 5000 },
      ]),
    'DUPLICATE_ITEM',
  );
  f.confirm(p2, [{ invoiceId: i.id, amountCents: 10000 }]);
  assert.equal(f.state().invoices[0].balanceCents, 0);
});

test('receipts retain original allocations; releases and refunds annotate history and preserve conservation', (t) => {
  const f = setup(t),
    a = f.account(),
    i = f.issue(f.draft(a.id)),
    p = f.confirm(f.payment(a.id, 12000), [{ invoiceId: i.id, amountCents: 10000 }]);
  const s = f.state(),
    receipt = s.receipts[0],
    allocation = s.allocations[0];
  errorCode(
    () =>
      f.cmd('payment.refund', {
        id: p.id,
        amountCents: 3000,
        paidOn: '2026-09-05',
        reference: 'RF-1',
        reason: 'Return',
      }),
    'REFUND_EXCEEDS_FUNDS',
  );
  f.cmd('payment.release', { id: p.id, allocationId: allocation.id, reason: 'Correcting fee' });
  f.cmd('credit.create', {
    invoiceId: i.id,
    lines: [{ invoiceLineId: i.lines[0].id, amountCents: 2000 }],
    reason: 'Fee reduction',
  });
  f.cmd('payment.allocate', { id: p.id, allocations: [{ invoiceId: i.id, amountCents: 8000 }] });
  f.cmd('payment.refund', {
    id: p.id,
    amountCents: 4000,
    paidOn: '2026-09-05',
    reference: 'RF-1',
    reason: 'Return excess already sent',
  });
  const after = f.state();
  assert.equal(after.summary.outstandingCents, 0);
  assert.equal(after.summary.receivedCents, 8000);
  assert.equal(after.summary.unallocatedCents, 0);
  assert.equal(after.invoices[0].settlementStatus, 'credited');
  const doc = f.service.getDocument(admin, 'receipt', receipt.id);
  assert.equal(doc.document.snapshot.allocations[0].amountCents, 10000);
  assert.equal(doc.document.snapshot.allocations[0].invoiceNumber, i.number);
  assert.equal(doc.refunds.length, 1);
  assert.throws(
    () => f.db.prepare('UPDATE billing_receipts SET snapshot=? WHERE id=?').run('{}', receipt.id),
    /Immutable/,
  );
  errorCode(() => f.cmd('payment.reverse', { id: p.id, reason: 'Undo' }), 'REFUNDS_EXIST');
  const p2 = f.confirm(f.payment(a.id, 5000));
  errorCode(
    () =>
      f.cmd('payment.refund', {
        id: p2.id,
        amountCents: 1000,
        paidOn: '2026-09-05',
        reference: 'rf-1',
        reason: 'Duplicate bank entry different amount',
      }),
    'DUPLICATE_RECORD',
  );
});

test('one outgoing refund cannot be counted again through a different original payment method', (t) => {
  const f = setup(t),
    a = f.account(),
    b = f.account('Synthetic Other'),
    bank = f.confirm(f.payment(a.id, 5000)),
    cash = f.confirm(f.payment(b.id, 5000, { method: 'cash' }));
  f.cmd('payment.refund', {
    id: bank.id,
    amountCents: 1000,
    paidOn: '2026-09-05',
    reference: 'Outgoing BANK 123',
    reason: 'Refund already completed',
  });
  const before = f.state();
  errorCode(
    () =>
      f.cmd(
        'payment.refund',
        {
          id: cash.id,
          amountCents: 2000,
          paidOn: '2026-09-05',
          reference: ' outgoing  bank 123 ',
          reason: 'Same outgoing event claimed on cash receipt',
        },
        finance,
      ),
    'DUPLICATE_RECORD',
  );
  let after = f.state();
  assert.equal(after.refunds.length, 1);
  assert.equal(after.audit.length, before.audit.length);
  assert.equal(after.payments.find((p) => p.id === cash.id).unallocatedCents, 5000);
  // A retained pre-upgrade refund has an older hash format. Its facts still reserve
  // the outgoing transaction, without rewriting immutable refund history.
  f.db
    .prepare(
      'INSERT INTO billing_refunds(id,paymentId,accountId,amountCents,paidOn,reference,reason,evidenceKey,createdAt) VALUES(?,?,?,?,?,?,?,?,?)',
    )
    .run(
      'legacy-refund',
      bank.id,
      a.id,
      100,
      '2026-09-06',
      'LEGACY-OUTGOING',
      'Synthetic legacy record',
      'legacy-method-dependent-hash',
      fixed().toISOString(),
    );
  errorCode(
    () =>
      f.cmd('payment.refund', {
        id: cash.id,
        amountCents: 200,
        paidOn: '2026-09-06',
        reference: 'legacy-outgoing',
        reason: 'Legacy duplicate',
      }),
    'DUPLICATE_RECORD',
  );
  after = f.state();
  assert.equal(after.refunds.length, 2);
  assert.equal(after.payments.find((p) => p.id === cash.id).unallocatedCents, 5000);
});

test('payment reversal releases every allocation without erasing receipt or evidence', (t) => {
  const f = setup(t),
    a = f.account(),
    i = f.issue(f.draft(a.id)),
    p = f.confirm(f.payment(a.id), [{ invoiceId: i.id, amountCents: 10000 }]);
  f.cmd('payment.reverse', { id: p.id, reason: 'Mistaken recording' });
  const s = f.state();
  assert.equal(s.invoices[0].balanceCents, 10000);
  assert.equal(s.summary.receivedCents, 0);
  assert.ok(s.allocations[0].releasedAt);
  assert.equal(s.receipts[0].reversed, true);
  assert.equal(s.receipts[0].snapshot.amountCents, 10000);
});

test('line-specific credits preserve mixed tax and cumulative final penny', (t) => {
  const f = setup(t),
    a = f.account();
  const settings = f.state().settings;
  f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    gstRegistered: true,
    abn: '51824753556',
  });
  const i = f.issue(
    f.draft(a.id, [
      f.line(101, { taxCode: 'GST_10' }),
      f.line(100, { description: 'GST-free line' }),
    ]),
  );
  assert.equal(i.taxCents, 10);
  let tax = 0;
  for (const amount of [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 101]) {
    const c = f.cmd('credit.create', {
      invoiceId: i.id,
      lines: [{ invoiceLineId: i.lines[0].id, amountCents: amount }],
      reason: 'Cumulative correction',
    });
    tax += c.taxCents;
  }
  assert.equal(tax, 10);
  const last = f.cmd('credit.create', {
    invoiceId: i.id,
    lines: [{ invoiceLineId: i.lines[1].id, amountCents: 100 }],
    reason: 'GST-free reduction',
  });
  assert.equal(last.taxCents, 0);
  assert.equal(last.lines[0].taxCode, 'GST_FREE');
  assert.equal(last.lines[0].description, 'GST-free line');
  assert.equal(f.state().invoices[0].balanceCents, 0);
  errorCode(
    () =>
      f.cmd('credit.create', {
        invoiceId: i.id,
        lines: [{ invoiceLineId: i.lines[0].id, amountCents: 1 }],
        reason: 'Too much',
      }),
    'OVER_CREDIT',
  );
});

test('void retains invoice number, cannot erase payment history even after release', (t) => {
  const f = setup(t),
    a = f.account(),
    i = f.issue(f.draft(a.id));
  f.cmd('plan.create', {
    invoiceId: i.id,
    instalments: [{ dueDate: '2026-10-01', amountCents: 10000 }],
  });
  const voided = f.cmd('invoice.void', { id: i.id, reason: 'Created in error' });
  assert.equal(f.state().plans[0].status, 'cancelled');
  assert.equal(f.state().plans[0].instalments[0].status, 'cancelled');
  assert.equal(voided.number, i.number);
  assert.equal(voided.balanceCents, 0);
  const next = f.issue(f.draft(a.id));
  assert.notEqual(next.number, i.number);
  const p = f.confirm(f.payment(a.id), [{ invoiceId: next.id, amountCents: 10000 }]);
  f.cmd('payment.reverse', { id: p.id, reason: 'Wrong record' });
  errorCode(() => f.cmd('invoice.void', { id: next.id, reason: 'Void' }), 'INVOICE_HAS_ACTIVITY');
});

test('plan dates/total are validated and progression derives from allocations and credits', (t) => {
  const f = setup(t),
    a = f.account(),
    i = f.issue(f.draft(a.id, [f.line(900)]));
  errorCode(
    () =>
      f.cmd('plan.create', {
        invoiceId: i.id,
        instalments: [{ dueDate: '2026-09-01', amountCents: 500 }],
      }),
    'PLAN_TOTAL',
  );
  f.cmd('plan.create', {
    invoiceId: i.id,
    instalments: [
      { dueDate: '2026-09-01', amountCents: 300 },
      { dueDate: '2026-10-01', amountCents: 300 },
      { dueDate: '2026-11-01', amountCents: 300 },
    ],
  });
  f.confirm(f.payment(a.id, 450), [{ invoiceId: i.id, amountCents: 450 }]);
  const plan = f.state().plans[0];
  assert.deepEqual(
    plan.instalments.map((i) => i.paidCents),
    [300, 150, 0],
  );
  assert.deepEqual(
    plan.instalments.map((i) => i.status),
    ['settled', 'part_paid', 'scheduled'],
  );
});

test('student enrolment references are optional unique audited links; no student identity merge', (t) => {
  const f = setup(t),
    a = f.account(),
    s = f.student(a.id),
    s2 = f.student(a.id, 'Synthetic Other');
  assert.equal(s.enrolmentReference, '');
  const linked = f.cmd('student.link', {
    id: s.id,
    expectedRevision: s.revision,
    enrolmentReference: ' app-123 ',
    reason: 'Staff checked correspondence',
  });
  assert.equal(linked.enrolmentReference, 'app-123');
  assert.equal(linked.enrolmentReferenceVerified, false);
  errorCode(
    () =>
      f.cmd('student.link', {
        id: s2.id,
        expectedRevision: s2.revision,
        enrolmentReference: 'app-123',
        reason: 'Duplicate',
      }),
    'DUPLICATE_RECORD',
  );
  f.cmd('student.link', {
    id: s.id,
    expectedRevision: linked.revision,
    enrolmentReference: '',
    reason: 'Remove mistaken link',
  });
  assert.equal(f.state().students[0].enrolmentReference, '');
  errorCode(
    () =>
      f.cmd('student.link', {
        id: s2.id,
        expectedRevision: s2.revision,
        enrolmentReference: 'https://school.test/?token=secret',
        reason: 'URL',
      }),
    'INVALID_REFERENCE',
  );
});

test('batch preview snapshots prices/names and commits once across keys; overlapping previews conflict atomically', (t) => {
  const f = setup(t),
    a = f.account(),
    s = f.student(a.id),
    s2 = f.student(a.id, 'Synthetic Sibling');
  const fee = f.cmd('fee.create', {
    code: 'TUITION',
    description: 'Tuition',
    unitCents: 10000,
    taxCode: 'GST_FREE',
    category: 'tuition',
    accountCode: '200',
    active: true,
  });
  const payload = {
    label: 'Sample Term',
    studentIds: [s.id],
    feeIds: [fee.id],
    year: 2027,
    term: 'Term 1',
    issueDate: '2026-09-01',
    dueDate: '2026-10-01',
  };
  const batch = f.cmd('batch.preview', payload),
    duplicate = f.cmd('batch.preview', { ...payload, label: 'Repeated' });
  assert.equal(batch.id, duplicate.id);
  const overlap = f.cmd('batch.preview', { ...payload, studentIds: [s.id, s2.id] });
  f.cmd('fee.update', { ...fee, expectedRevision: fee.revision, unitCents: 20000 });
  f.cmd('student.update', { ...s, expectedRevision: s.revision, name: 'Changed Name' });
  const committed = f.cmd('batch.commit', { id: batch.id });
  assert.equal(committed.invoiceCount, 1);
  assert.equal(committed.totalCents, 10000);
  const repeated = f.cmd('batch.commit', { id: batch.id });
  assert.deepEqual(repeated.invoiceIds, committed.invoiceIds);
  const invoice = f.state().invoices[0];
  assert.equal(invoice.lines[0].studentName, 'Synthetic Student');
  assert.equal(invoice.totalCents, 10000);
  errorCode(() => f.cmd('batch.commit', { id: overlap.id }), 'DUPLICATE_BILLING_PERIOD');
  assert.equal(f.state().invoices.length, 1);
  errorCode(
    () => f.cmd('batch.preview', { ...payload, dueDate: '2026-11-01' }),
    'DUPLICATE_BILLING_PERIOD',
  );
});

test('live batch preview requires configured payer/seller and approved tax policy before preserving a new snapshot', (t) => {
  const f = setup(t, { demoMode: false }),
    a = f.account(),
    s = f.student(a.id),
    fee = f.cmd('fee.create', {
      code: 'TUITION',
      description: 'Sample tuition',
      unitCents: 10000,
      taxCode: 'GST_FREE',
      category: 'tuition',
      accountCode: '200',
      active: true,
    });
  const payload = {
    label: 'Configured batch',
    studentIds: [s.id],
    feeIds: [fee.id],
    year: 2027,
    term: 'Term 1',
    issueDate: '2026-09-01',
    dueDate: '2026-09-12',
  };
  errorCode(() => f.cmd('batch.preview', payload), 'SELLER_NOT_CONFIGURED');
  assert.equal(f.state().batches.length, 0);
  let settings = f.state().settings;
  settings = f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    legalName: 'Synthetic Seller',
    address: '1 Sample Street',
    email: 'school@example.test',
    paymentInstructions: 'Configured sample details',
  });
  errorCode(() => f.cmd('batch.preview', payload), 'TAX_POLICY_NOT_APPROVED');
  f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    taxPolicyApproved: true,
  });
  const empty = f.cmd('account.update', { ...a, expectedRevision: a.revision, address: '' });
  errorCode(() => f.cmd('batch.preview', payload), 'PAYER_NOT_CONFIGURED');
  assert.equal(f.state().batches.length, 0);
  f.cmd('account.update', {
    ...empty,
    expectedRevision: empty.revision,
    address: '1 Payer Street',
  });
  assert.equal(f.cmd('batch.preview', payload).invoiceCount, 1);
});

test('an old unconfigured batch draft can be explicitly reviewed after setup without erasing preview or claims', (t) => {
  const f = setup(t, { demoMode: false }),
    a = f.account(),
    s = f.student(a.id),
    fee = f.cmd('fee.create', {
      code: 'TUITION',
      description: 'Sample tuition',
      unitCents: 10000,
      taxCode: 'GST_FREE',
      category: 'tuition',
      accountCode: '200',
      active: true,
    }),
    initial = f.state().settings;
  let settings = f.cmd('settings.update', {
    ...initial,
    expectedRevision: initial.revision,
    legalName: 'Synthetic Seller',
    address: '1 Sample Street',
    email: 'school@example.test',
    paymentInstructions: 'Configured sample details',
    taxPolicyApproved: true,
  });
  const payload = {
    label: 'Legacy batch',
    studentIds: [s.id],
    feeIds: [fee.id],
    year: 2027,
    term: 'Term 1',
    issueDate: '2026-09-01',
    dueDate: '2026-09-12',
  };
  const template = f.cmd('batch.preview', payload);
  // Represents a snapshot accepted by the previous local prototype before its
  // new-preview configuration guard. Financial history must remain readable.
  const oldSnapshot = {
    ...template.snapshot,
    sellerSnapshot: initial,
    accounts: template.snapshot.accounts.map((account) => ({
      ...account,
      accountSnapshot: { ...account.accountSnapshot, address: '' },
    })),
  };
  const legacyId = randomUUID();
  f.db
    .prepare(
      'INSERT INTO billing_batches(id,fingerprint,label,year,term,issueDate,dueDate,status,snapshot,createdAt,committedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    )
    .run(
      legacyId,
      'legacy-unconfigured',
      template.label,
      template.year,
      template.term,
      template.issueDate,
      template.dueDate,
      'preview',
      JSON.stringify(oldSnapshot),
      fixed().toISOString(),
      null,
    );
  settings = f.cmd('settings.update', { ...initial, expectedRevision: settings.revision });
  const committed = f.cmd('batch.commit', { id: legacyId });
  const draft = f.state().invoices.find((i) => i.id === committed.invoiceIds[0]);
  errorCode(() => f.issue(draft), 'SELLER_NOT_CONFIGURED');
  settings = f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    legalName: 'Configured Seller',
    address: '1 New Street',
    email: 'school@example.test',
    paymentInstructions: 'Current payment details',
    taxPolicyApproved: true,
  });
  errorCode(() => f.issue(draft), 'SELLER_NOT_CONFIGURED');
  const reviewed = f.cmd('invoice.update', { ...draft, expectedRevision: draft.revision });
  assert.equal(reviewed.sellerSnapshot.legalName, 'Configured Seller');
  assert.equal(reviewed.accountSnapshot.address, a.address);
  assert.equal(reviewed.revision, draft.revision + 1);
  assert.equal(f.issue(reviewed).status, 'issued');
  assert.deepEqual(f.state().batches.find((b) => b.id === legacyId).snapshot, oldSnapshot);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM billing_batch_claims').get().count, 1);
  errorCode(
    () => f.cmd('batch.preview', { ...payload, dueDate: '2026-09-13' }),
    'DUPLICATE_BILLING_PERIOD',
  );
});

test('batch tax policy drift requires explicit draft re-save and retains the original reviewed evidence', (t) => {
  const f = setup(t, { demoMode: false }),
    a = f.account(),
    s = f.student(a.id),
    fee = f.cmd('fee.create', {
      code: 'TUITION',
      description: 'Sample tuition',
      unitCents: 10000,
      taxCode: 'GST_FREE',
      category: 'tuition',
      accountCode: '200',
      active: true,
    });
  let settings = f.state().settings;
  settings = f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    legalName: 'Synthetic Seller',
    address: '1 Sample Street',
    email: 'school@example.test',
    paymentInstructions: 'Original payment instructions',
    taxPolicyApproved: true,
  });
  const batch = f.cmd('batch.preview', {
    label: 'Policy reviewed batch',
    studentIds: [s.id],
    feeIds: [fee.id],
    year: 2027,
    term: 'Term 1',
    issueDate: '2026-09-01',
    dueDate: '2026-09-12',
  });
  const committed = f.cmd('batch.commit', { id: batch.id }),
    draft = f.state().invoices.find((i) => i.id === committed.invoiceIds[0]);
  f.cmd('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    gstRegistered: true,
    abn: '51824753556',
    paymentInstructions: 'Current payment instructions',
  });
  errorCode(() => f.issue(draft), 'STALE_TAX_POLICY');
  const reviewed = f.cmd('invoice.update', { ...draft, expectedRevision: draft.revision });
  assert.equal(reviewed.sellerSnapshot.gstRegistered, true);
  assert.equal(reviewed.sellerSnapshot.paymentInstructions, 'Current payment instructions');
  const issued = f.issue(reviewed);
  assert.equal(issued.taxCents, 0);
  assert.equal(issued.sellerSnapshot.gstRegistered, true);
  const retained = f.state().batches.find((b) => b.id === batch.id).snapshot;
  assert.deepEqual(retained, batch.snapshot);
  assert.equal(retained.sellerSnapshot.gstRegistered, false);
  assert.equal(retained.sellerSnapshot.paymentInstructions, 'Original payment instructions');
});

test('export manifests retain immutable file facts and import is separate evidence', (t) => {
  const f = setup(t);
  const manifest = f.service.recordExport(finance, 'xero', {
    sha256: 'a'.repeat(64),
    invoiceIds: [],
    rowCount: 0,
    documentCount: 0,
    netCents: 0,
    taxCents: 0,
    grossCents: 0,
    mappingRevision: 1,
    exclusions: [],
  });
  assert.equal(manifest.status, 'generated');
  const imported = f.cmd(
    'export.recordImport',
    { id: manifest.id, importReference: 'DEMO-IMPORT-1', reason: 'Checked external draft import' },
    finance,
  );
  assert.equal(imported.status, 'import_recorded');
  assert.equal(imported.metadata.sha256, 'a'.repeat(64));
  assert.equal(f.state().summary.receivedCents, 0);
  assert.throws(
    () => f.db.prepare('UPDATE billing_exports SET metadata=? WHERE id=?').run('{}', manifest.id),
    /Immutable/,
  );
});

test('sample seeding is resumable, idempotent and preserves its date anchor across restarts', (t) => {
  const f = setup(t);
  const first = seedDemo(f.service),
    second = seedDemo(f.service);
  assert.equal(first.invoices.length, 5);
  assert.equal(second.invoices.length, 5);
  assert.equal(second.payments.length, 4);
  assert.equal(second.receipts.length, 3);
  assert.ok(second.summary.overdueCents > 0);
  assert.ok(second.summary.pendingCents > 0);
  assert.ok(second.summary.bondHeldCents > 0);
  const later = createBillingService({
    db: f.db,
    clock: () => new Date('2026-09-13T04:00:00Z'),
    demoMode: true,
  });
  assert.equal(seedDemo(later).invoices.length, 5);
  assert.ok(second.accounts.every((a) => a.email.endsWith('@example.test')));
});

test('file database persists after close and reopen, with foreign key integrity', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'rosewood-domain-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'billing.sqlite');
  let db = openDatabase(path),
    service = createBillingService({ db, clock: fixed, demoMode: true });
  seedDemo(service);
  const before = service.getState(admin);
  db.close();
  db = openDatabase(path);
  service = createBillingService({ db, clock: fixed, demoMode: true });
  assert.deepEqual(service.getState(admin), before);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  db.close();
});

test('concurrent processes cannot allocate more than a single remaining invoice balance', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'rosewood-race-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'billing.sqlite');
  const f = setup(t, { path });
  const a = f.account(),
    invoice = f.issue(f.draft(a.id));
  const p1 = f.confirm(f.payment(a.id)),
    p2 = f.confirm(f.payment(a.id));
  const source = `const {parentPort,workerData}=require('node:worker_threads');(async()=>{const {openDatabase}=await import(workerData.database);const {createBillingService}=await import(workerData.service);const db=openDatabase(workerData.path);try{const service=createBillingService({db,clock:()=>new Date('2026-09-12T04:00:00Z'),demoMode:true});parentPort.postMessage('ready');parentPort.once('message',()=>{try{service.execute(workerData.actor,{type:'payment.allocate',payload:{id:workerData.paymentId,allocations:[{invoiceId:workerData.invoiceId,amountCents:10000}]}},workerData.paymentId);parentPort.postMessage({ok:true});}catch(e){parentPort.postMessage({ok:false,code:e.code});}finally{db.close();}});}catch(e){parentPort.postMessage({error:e.message});db.close();}})();`;
  const workers = [p1, p2].map(
    (p) =>
      new Worker(source, {
        eval: true,
        workerData: {
          path,
          database: new URL('../src/database.mjs', import.meta.url).href,
          service: new URL('../src/service.mjs', import.meta.url).href,
          actor: admin,
          paymentId: p.id,
          invoiceId: invoice.id,
        },
      }),
  );
  t.after(() => Promise.all(workers.map((w) => w.terminate())));
  await Promise.all(
    workers.map(
      (w) =>
        new Promise((resolve, reject) => {
          w.once('message', (m) => (m === 'ready' ? resolve() : reject(Error(JSON.stringify(m)))));
          w.once('error', reject);
        }),
    ),
  );
  const results = workers.map(
    (w) =>
      new Promise((resolve, reject) => {
        w.once('message', resolve);
        w.once('error', reject);
      }),
  );
  workers.forEach((w) => w.postMessage('go'));
  const outcomes = await Promise.all(results);
  assert.equal(outcomes.filter((o) => o.ok).length, 1);
  assert.equal(outcomes.filter((o) => o.code === 'OVER_ALLOCATION').length, 1);
  assert.equal(f.state().invoices[0].balanceCents, 0);
  assert.equal(f.state().summary.unallocatedCents, 10000);
});
