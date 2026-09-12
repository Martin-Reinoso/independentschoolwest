import { createHash, randomUUID } from 'node:crypto';
import {
  BillingError,
  fail,
  integer,
  sum,
  priceLine,
  proportional,
  validDate,
  melbourneDate,
  validABN,
} from './money.mjs';

const roles = ['viewer', 'billing', 'finance', 'admin'];
const financeCommands = new Set([
  'invoice.void',
  'payment.confirm',
  'payment.reject',
  'payment.allocate',
  'payment.release',
  'payment.reverse',
  'payment.refund',
  'credit.create',
  'export.recordImport',
]);
const commands = new Set([
  'account.create',
  'account.update',
  'student.create',
  'student.update',
  'student.link',
  'fee.create',
  'fee.update',
  'invoice.create',
  'invoice.update',
  'invoice.issue',
  'invoice.void',
  'payment.record',
  'payment.confirm',
  'payment.reject',
  'payment.allocate',
  'payment.release',
  'payment.reverse',
  'payment.refund',
  'credit.create',
  'plan.create',
  'batch.preview',
  'batch.commit',
  'settings.update',
  'export.recordImport',
]);
const defaults = {
  schoolName: 'Rosewood College',
  legalName: '',
  abn: '',
  address: '',
  email: '',
  phone: '',
  paymentInstructions: '',
  defaultDueDays: 14,
  gstRegistered: false,
  taxPolicyApproved: false,
  xeroTaxMappings: {},
};
const json = (value) => JSON.stringify(value);
const parse = (value) => (value == null ? null : JSON.parse(value));
const uid = () => randomUUID();
const hash = (value) => createHash('sha256').update(value).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
function text(value, label, { required = true, max = 500, multiline = false } = {}) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') fail('INVALID_TEXT', `${label} must be text.`);
  const result = value.trim();
  if (
    (required && !result) ||
    result.length > max ||
    (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(result)
  )
    fail('INVALID_TEXT', `${label} is missing, too long or contains unsupported characters.`);
  return result;
}
function choice(value, allowed, label) {
  if (!allowed.includes(value)) fail('INVALID_VALUE', `${label} is not a supported value.`);
  return value;
}
function bool(value, label) {
  if (typeof value !== 'boolean') fail('INVALID_VALUE', `${label} must be true or false.`);
  return value;
}
function email(value) {
  const v = text(value, 'Email', { required: false, max: 254 });
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    fail('INVALID_EMAIL', 'Enter a valid email address.');
  return v;
}
function array(value, label, { min = 0, max = 200 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max)
    fail('INVALID_LIST', `${label} must contain ${min}–${max} entries.`);
  return value;
}
function distinct(values, label) {
  if (new Set(values).size !== values.length)
    fail('DUPLICATE_ITEM', `${label} contains a duplicate.`, 409);
  return values;
}
function normalize(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
}
function role(actor, minimum = 'viewer') {
  if (
    !actor ||
    typeof actor.id !== 'string' ||
    !actor.id ||
    typeof actor.name !== 'string' ||
    !actor.name ||
    !roles.includes(actor.role)
  )
    fail('AUTH_REQUIRED', 'Sign in with a named staff account.', 401);
  if (roles.indexOf(actor.role) < roles.indexOf(minimum))
    fail('FORBIDDEN', 'Your staff role does not permit this action.', 403);
}

export function createBillingService({ db, clock = () => new Date(), demoMode = false }) {
  if (!db || typeof clock !== 'function' || typeof demoMode !== 'boolean')
    throw new Error('Billing service requires database, clock and boolean demoMode.');
  const now = () => clock().toISOString();
  const today = () => melbourneDate(clock());
  const all = (sql, ...args) =>
    db
      .prepare(sql)
      .all(...args)
      .map((row) => ({ ...row }));
  const one = (sql, ...args) => {
    const row = db.prepare(sql).get(...args);
    return row ? { ...row } : null;
  };
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  // Table and column identifiers passed here are internal constants, never request strings.
  const insert = (table, row) =>
    run(
      `INSERT INTO billing_${table}(${Object.keys(row).join(',')}) VALUES(${Object.keys(row)
        .map(() => '?')
        .join(',')})`,
      ...Object.values(row),
    );
  const update = (table, id, row) =>
    run(
      `UPDATE billing_${table} SET ${Object.keys(row)
        .map((k) => `${k}=?`)
        .join(',')} WHERE id=?`,
      ...Object.values(row),
      id,
    );
  const requireRow = (table, id) => {
    const row = one(
      `SELECT * FROM billing_${table} WHERE id=?`,
      text(id, 'Record ID', { max: 100 }),
    );
    if (!row) fail('NOT_FOUND', 'The requested billing record does not exist.', 404);
    return row;
  };
  function transaction(fn) {
    try {
      db.exec('BEGIN IMMEDIATE');
      try {
        const value = fn();
        db.exec('COMMIT');
        return value;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      if (error instanceof BillingError) throw error;
      if (String(error.message).includes('UNIQUE constraint'))
        fail(
          'DUPLICATE_RECORD',
          'This reference or billing operation has already been recorded.',
          409,
        );
      if (String(error.message).includes('database is locked'))
        fail('BUSY', 'Billing is busy. Retry the same operation shortly.', 409);
      throw error;
    }
  }
  transaction(() => {
    const mode = one("SELECT value FROM billing_meta WHERE key='demoMode'");
    if (mode && mode.value !== String(demoMode))
      fail(
        'MODE_MISMATCH',
        'This database was created for a different sample/live mode. Use its original mode or a separate database.',
        409,
      );
    run("INSERT OR IGNORE INTO billing_meta(key,value) VALUES('demoMode',?)", String(demoMode));
    run('INSERT OR IGNORE INTO billing_settings(id,revision,data) VALUES(1,1,?)', json(defaults));
  });
  function settings() {
    const s = one('SELECT * FROM billing_settings WHERE id=1');
    return { ...parse(s.data), revision: s.revision, demoMode };
  }
  function audit(actor, action, entityType, entityId, reason = '', details = {}) {
    const entry = {
      id: uid(),
      actorId: actor.id,
      actorName: actor.name,
      action,
      entityType,
      entityId,
      reason,
      createdAt: now(),
      details: json(details),
    };
    insert('audit', entry);
    return entry;
  }
  function number(kind) {
    run(
      'INSERT INTO billing_sequences(kind,value) VALUES(?,1) ON CONFLICT(kind) DO UPDATE SET value=value+1',
      kind,
    );
    const n = one('SELECT value FROM billing_sequences WHERE kind=?', kind).value;
    return `RWC-${kind}-${String(n).padStart(6, '0')}`;
  }
  function revision(row, expected) {
    if (integer(expected, 'Revision', 1) !== row.revision)
      fail('STALE_REVISION', 'This record changed. Refresh before saving.', 409);
  }
  function activeAccount(id) {
    const a = requireRow('accounts', id);
    if (a.status !== 'active')
      fail('ACCOUNT_ARCHIVED', 'Restore the billing account before creating new activity.', 409);
    return a;
  }
  const accountProjection = (a) => ({ ...a, contactAllowed: Boolean(a.contactAllowed) });
  function receivedDate(value, label) {
    value = validDate(value, label);
    if (value > today()) fail('FUTURE_PAYMENT', `${label} cannot be in the future.`);
    return value;
  }
  function allocationsFor(paymentId) {
    return all(
      `SELECT a.*,r.createdAt AS releasedAt,r.reason AS reason FROM billing_allocations a LEFT JOIN billing_allocation_releases r ON r.allocationId=a.id WHERE a.paymentId=? ORDER BY a.createdAt,a.rowid`,
      paymentId,
    );
  }
  function paymentProjection(row) {
    const allocatedCents = sum(
      allocationsFor(row.id)
        .filter((a) => !a.releasedAt)
        .map((a) => a.amountCents),
    );
    const refunds = all(
      'SELECT * FROM billing_refunds WHERE paymentId=? ORDER BY createdAt,rowid',
      row.id,
    );
    const refundedCents = sum(refunds.map((r) => r.amountCents));
    const receipt = one('SELECT id FROM billing_receipts WHERE paymentId=?', row.id);
    const unallocatedCents =
      row.status === 'confirmed' ? row.amountCents - allocatedCents - refundedCents : 0;
    const { evidenceKey, ...publicRow } = row;
    return {
      ...publicRow,
      allocatedCents,
      refundedCents,
      unallocatedCents,
      receiptId: receipt?.id ?? null,
      refunds,
    };
  }
  const invoiceLines = (id) =>
    all('SELECT * FROM billing_invoice_lines WHERE invoiceId=? ORDER BY position', id);
  function invoiceProjection(row) {
    const paidCents = one(
      `SELECT COALESCE(SUM(a.amountCents),0) AS value FROM billing_allocations a JOIN billing_payments p ON p.id=a.paymentId LEFT JOIN billing_allocation_releases r ON r.allocationId=a.id WHERE a.invoiceId=? AND r.id IS NULL AND p.status='confirmed'`,
      row.id,
    ).value;
    const creditedCents = one(
      'SELECT COALESCE(SUM(amountCents),0) AS value FROM billing_credits WHERE invoiceId=?',
      row.id,
    ).value;
    const balanceCents = row.status === 'issued' ? row.totalCents - paidCents - creditedCents : 0;
    if (balanceCents < 0)
      fail(
        'LEDGER_INVARIANT',
        'Invoice balance is inconsistent. Contact the billing administrator.',
        500,
      );
    const settlementStatus =
      row.status !== 'issued'
        ? 'unpaid'
        : balanceCents === 0
          ? creditedCents > 0
            ? 'credited'
            : 'paid'
          : paidCents + creditedCents > 0
            ? 'part_paid'
            : 'unpaid';
    return {
      ...row,
      lines: invoiceLines(row.id),
      accountSnapshot: parse(row.accountSnapshot),
      sellerSnapshot: parse(row.sellerSnapshot),
      paidCents,
      creditedCents,
      balanceCents,
      settlementStatus,
      overdue: row.status === 'issued' && balanceCents > 0 && row.dueDate < today(),
    };
  }
  function creditProjection(row) {
    const snapshot = parse(row.snapshot);
    return {
      ...row,
      lines: all('SELECT * FROM billing_credit_lines WHERE creditId=?', row.id).map((line) => ({
        ...snapshot.lines.find((original) => original.id === line.id),
        ...line,
      })),
      snapshot,
    };
  }
  function receiptProjection(row) {
    const p = requireRow('payments', row.paymentId);
    return {
      ...row,
      snapshot: parse(row.snapshot),
      reversed: p.status === 'reversed',
      reversalReason: p.status === 'reversed' ? p.reason : '',
      refunds: all(
        'SELECT * FROM billing_refunds WHERE paymentId=? ORDER BY createdAt,rowid',
        p.id,
      ),
    };
  }
  function batchProjection(row) {
    const snapshot = parse(row.snapshot);
    const invoiceIds = all(
      'SELECT id FROM billing_invoices WHERE batchId=? ORDER BY createdAt,id',
      row.id,
    ).map((i) => i.id);
    return {
      ...row,
      snapshot,
      invoiceIds,
      invoiceCount: snapshot.accounts.length,
      totalCents: sum(snapshot.accounts.map((a) => a.totalCents)),
    };
  }
  function exportProjection(row) {
    const evidence = one('SELECT * FROM billing_export_imports WHERE exportId=?', row.id);
    return {
      ...row,
      metadata: parse(row.metadata),
      status: evidence ? 'import_recorded' : 'generated',
      importReference: evidence?.importReference ?? '',
      importedAt: evidence?.importedAt ?? null,
      importReason: evidence?.reason ?? '',
    };
  }
  function planProjection(row) {
    const invoice = invoiceProjection(requireRow('invoices', row.invoiceId));
    let remaining = invoice.paidCents + invoice.creditedCents;
    const instalments = parse(row.instalments).map((item) => {
      const paidCents = Math.min(remaining, item.amountCents);
      remaining -= paidCents;
      return {
        ...item,
        paidCents,
        status:
          invoice.status === 'void'
            ? 'cancelled'
            : paidCents === item.amountCents
              ? 'settled'
              : item.dueDate < today()
                ? 'overdue'
                : paidCents > 0
                  ? 'part_paid'
                  : 'scheduled',
      };
    });
    return {
      ...row,
      status:
        invoice.status === 'void' ? 'cancelled' : invoice.balanceCents === 0 ? 'settled' : 'active',
      instalments,
    };
  }
  function state() {
    const invoices = all('SELECT * FROM billing_invoices ORDER BY createdAt,rowid').map(
      invoiceProjection,
    );
    const payments = all('SELECT * FROM billing_payments ORDER BY createdAt,rowid').map(
      paymentProjection,
    );
    const accounts = all('SELECT * FROM billing_accounts ORDER BY code').map((a) => {
      const ap = payments.filter((p) => p.accountId === a.id);
      return {
        ...accountProjection(a),
        balanceCents: sum(invoices.filter((i) => i.accountId === a.id).map((i) => i.balanceCents)),
        unallocatedCents: sum(
          ap.filter((p) => p.purpose === 'fees').map((p) => p.unallocatedCents),
        ),
        bondHeldCents: sum(ap.filter((p) => p.purpose === 'bond').map((p) => p.unallocatedCents)),
        pendingCents: sum(ap.filter((p) => p.status === 'pending').map((p) => p.amountCents)),
      };
    });
    const ageing = [
      { label: 'Current', amountCents: 0, count: 0 },
      { label: '1–30 days', amountCents: 0, count: 0 },
      { label: '31–60 days', amountCents: 0, count: 0 },
      { label: '61–90 days', amountCents: 0, count: 0 },
      { label: '90+ days', amountCents: 0, count: 0 },
    ];
    for (const invoice of invoices.filter((i) => i.status === 'issued' && i.balanceCents > 0)) {
      const days = Math.round(
        (Date.parse(`${today()}T00:00:00Z`) - Date.parse(`${invoice.dueDate}T00:00:00Z`)) /
          86400000,
      );
      const bucket = ageing[days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4];
      bucket.amountCents = sum([bucket.amountCents, invoice.balanceCents]);
      bucket.count++;
    }
    return {
      today: today(),
      settings: settings(),
      accounts,
      students: all('SELECT * FROM billing_students ORDER BY createdAt,rowid').map((s) => ({
        ...s,
        enrolmentReference: s.enrolmentReference ?? '',
        enrolmentReferenceVerified: false,
      })),
      fees: all('SELECT * FROM billing_fees ORDER BY code').map((f) => ({
        ...f,
        active: Boolean(f.active),
      })),
      invoices,
      payments,
      receipts: all('SELECT * FROM billing_receipts ORDER BY issuedAt,rowid').map(
        receiptProjection,
      ),
      allocations: all(
        'SELECT a.*,r.createdAt AS releasedAt,r.reason FROM billing_allocations a LEFT JOIN billing_allocation_releases r ON r.allocationId=a.id ORDER BY a.createdAt,a.rowid',
      ),
      credits: all('SELECT * FROM billing_credits ORDER BY issuedAt,rowid').map(creditProjection),
      refunds: all('SELECT * FROM billing_refunds ORDER BY createdAt,rowid').map(
        ({ evidenceKey, ...r }) => r,
      ),
      plans: all('SELECT * FROM billing_plans ORDER BY createdAt,rowid').map(planProjection),
      batches: all('SELECT * FROM billing_batches ORDER BY createdAt,rowid').map(batchProjection),
      exports: all('SELECT * FROM billing_exports ORDER BY createdAt,rowid').map(exportProjection),
      audit: all(
        'SELECT id,actorId,actorName,action,entityType,entityId,reason,createdAt FROM billing_audit ORDER BY createdAt DESC,rowid DESC LIMIT 200',
      ),
      summary: {
        outstandingCents: sum(invoices.map((i) => i.balanceCents)),
        overdueCents: sum(invoices.filter((i) => i.overdue).map((i) => i.balanceCents)),
        receivedCents: sum(
          payments
            .filter((p) => p.status === 'confirmed' && p.purpose === 'fees')
            .map((p) => p.amountCents - p.refundedCents),
        ),
        pendingCents: sum(accounts.map((a) => a.pendingCents)),
        unallocatedCents: sum(accounts.map((a) => a.unallocatedCents)),
        bondHeldCents: sum(accounts.map((a) => a.bondHeldCents)),
        draftCount: invoices.filter((i) => i.status === 'draft').length,
        overdueCount: invoices.filter((i) => i.overdue).length,
        accountCount: accounts.filter((a) => a.status === 'active').length,
        studentCount: all("SELECT id FROM billing_students WHERE status<>'inactive'").length,
        ageing,
      },
    };
  }
  function invoiceFields(p) {
    const issueDate = validDate(p.issueDate, 'Issue date'),
      dueDate = validDate(p.dueDate, 'Due date');
    if (dueDate < issueDate)
      fail('INVALID_DUE_DATE', 'Due date must be on or after the invoice date.');
    return {
      issueDate,
      dueDate,
      year: integer(p.year, 'Billing year', 1900, 2200),
      term: text(p.term, 'Term', { max: 80 }),
      description: text(p.description, 'Invoice description', {
        required: false,
        max: 2000,
        multiline: true,
      }),
    };
  }
  function prepareLines(inputs, accountId, existing = []) {
    const used = new Set();
    return array(inputs, 'Invoice lines', { min: 1, max: 200 }).map((p, index) => {
      const studentId = p.studentId ? text(p.studentId, 'Student ID', { max: 100 }) : null;
      const student = studentId ? requireRow('students', studentId) : null;
      if (student && student.accountId !== accountId)
        fail('ACCOUNT_MISMATCH', 'Invoice students must belong to its billing account.');
      const id = p.id ? text(p.id, 'Line ID', { max: 100 }) : (existing[index]?.id ?? uid());
      if ((p.id && !existing.some((line) => line.id === p.id)) || used.has(id))
        fail('INVALID_LINE', 'Line identifiers must belong to this draft and be unique.');
      used.add(id);
      const taxCode = choice(p.taxCode, ['GST_FREE', 'GST_10', 'NO_GST'], 'Tax code');
      return {
        id,
        position: index,
        studentId,
        studentName: student?.name ?? '',
        feeId: null,
        description: text(p.description, 'Line description', { max: 500 }),
        taxCode,
        category: choice(p.category, ['tuition', 'levy', 'other'], 'Fee category'),
        accountCode: text(p.accountCode, 'Account code', { required: false, max: 100 }),
        ...priceLine({ ...p, taxCode }),
      };
    });
  }
  function totals(lines) {
    return {
      subtotalCents: sum(lines.map((l) => l.subtotalCents)),
      discountCents: sum(lines.map((l) => l.discountCents)),
      taxCents: sum(lines.map((l) => l.taxCents)),
      totalCents: sum(lines.map((l) => l.totalCents)),
    };
  }
  function createInvoice(
    p,
    { preparedLines = null, batchId = null, accountSnapshot = null, sellerSnapshot = null } = {},
  ) {
    activeAccount(p.accountId);
    const lines = preparedLines ?? prepareLines(p.lines, p.accountId);
    const row = {
      id: uid(),
      accountId: p.accountId,
      number: null,
      status: 'draft',
      ...invoiceFields(p),
      ...totals(lines),
      revision: 1,
      accountSnapshot: accountSnapshot ? json(accountSnapshot) : null,
      sellerSnapshot: sellerSnapshot ? json(sellerSnapshot) : null,
      batchId,
      createdAt: now(),
      issuedAt: null,
      voidedAt: null,
      voidReason: null,
    };
    insert('invoices', row);
    for (const line of lines) insert('invoice_lines', { ...line, invoiceId: row.id });
    return invoiceProjection(row);
  }
  function requireIssued(id) {
    const i = requireRow('invoices', id);
    if (i.status !== 'issued')
      fail('INVOICE_NOT_ISSUED', 'This action requires an issued invoice.', 409);
    return invoiceProjection(i);
  }
  function requireConfirmed(id) {
    const p = requireRow('payments', id);
    if (p.status !== 'confirmed')
      fail('PAYMENT_NOT_CONFIRMED', 'This action requires a confirmed payment.', 409);
    return paymentProjection(p);
  }
  function addAllocations(payment, inputs) {
    const proposals = array(inputs ?? [], 'Allocations', { max: 200 });
    if (payment.purpose === 'bond' && proposals.length)
      fail('BOND_ALLOCATION', 'Bond funds cannot settle fee invoices.');
    const allocations = proposals.map((p) => ({
      id: uid(),
      paymentId: payment.id,
      invoiceId: text(p.invoiceId, 'Invoice ID', { max: 100 }),
      amountCents: integer(p.amountCents, 'Allocation amount', 1),
      createdAt: now(),
    }));
    distinct(
      allocations.map((a) => a.invoiceId),
      'Allocation invoices',
    );
    const available = paymentProjection(requireRow('payments', payment.id)).unallocatedCents;
    if (sum(allocations.map((a) => a.amountCents)) > available)
      fail('INSUFFICIENT_FUNDS', 'Allocations exceed available confirmed funds.', 409);
    for (const a of allocations) {
      const i = requireIssued(a.invoiceId);
      if (i.accountId !== payment.accountId)
        fail('ACCOUNT_MISMATCH', 'Payments and invoices must belong to the same billing account.');
      if (a.amountCents > i.balanceCents)
        fail('OVER_ALLOCATION', 'Allocation exceeds the invoice outstanding balance.', 409);
    }
    for (const a of allocations) insert('allocations', a);
    return allocations;
  }
  function sellerReady(s, account, lines) {
    if (lines.some((l) => l.taxCode === 'GST_10') && !s.gstRegistered)
      fail('GST_NOT_REGISTERED', 'Taxable lines require configured GST registration.');
    if (s.gstRegistered && !validABN(s.abn))
      fail('INVALID_ABN', 'GST registration requires a valid ABN.');
    if (!demoMode) {
      if (!s.legalName || !s.address || !s.email || !s.paymentInstructions)
        fail(
          'SELLER_NOT_CONFIGURED',
          'Complete seller identity, address, contact and payment instructions before issuing.',
        );
      if (!account.billingName || !account.address || !account.email)
        fail('PAYER_NOT_CONFIGURED', 'Complete payer name, address and email before issuing.');
      if (!s.taxPolicyApproved)
        fail(
          'TAX_POLICY_NOT_APPROVED',
          'Finance must approve the configured tax policy before issuing.',
        );
    }
  }
  function dispatch(actor, type, p) {
    if (type === 'account.create' || type === 'account.update') {
      const old = type.endsWith('update') ? requireRow('accounts', p.id) : null;
      if (old) revision(old, p.expectedRevision);
      const row = {
        name: text(p.name, 'Account name', { max: 160 }),
        billingName: text(p.billingName ?? p.name, 'Payer name', { max: 160 }),
        email: email(p.email),
        address: text(p.address, 'Payer address', { required: false, max: 1000, multiline: true }),
        xeroContactName: text(
          p.xeroContactName ?? old?.xeroContactName ?? '',
          'Xero contact name',
          { required: false, max: 160 },
        ),
        contactAllowed: Number(bool(p.contactAllowed ?? false, 'Contact permission')),
        status: choice(
          p.status ?? old?.status ?? 'active',
          ['active', 'archived'],
          'Account status',
        ),
        revision: (old?.revision ?? 0) + 1,
      };
      if (old) update('accounts', old.id, row);
      else insert('accounts', { id: uid(), code: number('ACC'), ...row, createdAt: now() });
      return accountProjection(
        old
          ? requireRow('accounts', old.id)
          : one('SELECT * FROM billing_accounts ORDER BY rowid DESC LIMIT 1'),
      );
    }
    if (type === 'student.create' || type === 'student.update') {
      const old = type.endsWith('update') ? requireRow('students', p.id) : null;
      if (old) revision(old, p.expectedRevision);
      else activeAccount(p.accountId);
      const row = {
        name: text(p.name, 'Student name', { max: 160 }),
        yearLevel: text(p.yearLevel, 'Year level', { max: 60 }),
        entryYear: integer(p.entryYear, 'Entry year', 1900, 2200),
        status: choice(
          p.status ?? 'prospective',
          ['prospective', 'active', 'inactive'],
          'Student status',
        ),
        revision: (old?.revision ?? 0) + 1,
      };
      const id = old?.id ?? uid();
      if (old) update('students', id, row);
      else
        insert('students', {
          id,
          accountId: p.accountId,
          ...row,
          enrolmentReference: null,
          createdAt: now(),
        });
      return {
        ...requireRow('students', id),
        enrolmentReference: old?.enrolmentReference ?? '',
        enrolmentReferenceVerified: false,
      };
    }
    if (type === 'student.link') {
      const old = requireRow('students', p.id);
      revision(old, p.expectedRevision);
      text(p.reason, 'Link reason', { max: 1000, multiline: true });
      const reference = text(p.enrolmentReference, 'Enrolment reference', {
        required: false,
        max: 120,
      });
      if (reference && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(reference))
        fail(
          'INVALID_REFERENCE',
          'Enter the enrolment record reference only, without a URL, email, access token or notes.',
        );
      update('students', old.id, {
        enrolmentReference: reference || null,
        revision: old.revision + 1,
      });
      return {
        ...requireRow('students', old.id),
        enrolmentReference: reference,
        enrolmentReferenceVerified: false,
      };
    }
    if (type === 'fee.create' || type === 'fee.update') {
      const old = type.endsWith('update') ? requireRow('fees', p.id) : null;
      if (old) revision(old, p.expectedRevision);
      const row = {
        code: normalize(text(p.code, 'Fee code', { max: 60 })),
        description: text(p.description, 'Fee description', { max: 500 }),
        unitCents: integer(p.unitCents, 'Fee amount'),
        taxCode: choice(p.taxCode, ['GST_FREE', 'GST_10', 'NO_GST'], 'Tax code'),
        category: choice(p.category, ['tuition', 'levy', 'other'], 'Category'),
        accountCode: text(p.accountCode, 'Account code', { required: false, max: 100 }),
        active: Number(bool(p.active ?? true, 'Active')),
        revision: (old?.revision ?? 0) + 1,
      };
      const id = old?.id ?? uid();
      if (old) update('fees', id, row);
      else insert('fees', { id, ...row, createdAt: now() });
      return { ...requireRow('fees', id), active: Boolean(row.active) };
    }
    if (type === 'invoice.create') return createInvoice(p);
    if (type === 'invoice.update') {
      const old = requireRow('invoices', p.id);
      revision(old, p.expectedRevision);
      if (old.status !== 'draft')
        fail('INVOICE_IMMUTABLE', 'Only draft invoices can be edited.', 409);
      if (p.accountId !== old.accountId)
        fail('ACCOUNT_MISMATCH', 'A draft cannot be moved to another account.');
      const account = activeAccount(old.accountId);
      // A deliberate draft save reviews current payer/seller configuration. The
      // original batch snapshot and duplicate-billing claims remain immutable.
      const refreshed = old.batchId
        ? { accountSnapshot: json(accountProjection(account)), sellerSnapshot: json(settings()) }
        : {};
      const lines = prepareLines(p.lines, old.accountId, invoiceLines(old.id));
      update('invoices', old.id, {
        ...invoiceFields(p),
        ...totals(lines),
        ...refreshed,
        revision: old.revision + 1,
      });
      run('DELETE FROM billing_invoice_lines WHERE invoiceId=?', old.id);
      for (const line of lines) insert('invoice_lines', { ...line, invoiceId: old.id });
      return invoiceProjection(requireRow('invoices', old.id));
    }
    if (type === 'invoice.issue') {
      const old = requireRow('invoices', p.id);
      revision(old, p.expectedRevision);
      if (old.status !== 'draft') fail('INVOICE_IMMUTABLE', 'Only a draft can be issued.', 409);
      if (old.issueDate > today())
        fail('FUTURE_ISSUE', 'Wait until the invoice issue date before issuing.');
      const currentAccount = activeAccount(old.accountId),
        currentSettings = settings();
      const lines = invoiceLines(old.id);
      const a = old.batchId ? parse(old.accountSnapshot) : accountProjection(currentAccount);
      const s = old.batchId ? parse(old.sellerSnapshot) : currentSettings;
      sellerReady(currentSettings, accountProjection(currentAccount), lines);
      sellerReady(s, a, lines);
      // An untouched batch draft retains the preview. Saving the draft explicitly
      // refreshes its seller snapshot without erasing the original batch evidence.
      if (
        old.batchId &&
        (s.taxPolicyApproved !== currentSettings.taxPolicyApproved ||
          s.gstRegistered !== currentSettings.gstRegistered)
      )
        fail(
          'STALE_TAX_POLICY',
          'Tax policy changed after batch preview. Open and save the draft to review current settings before issuing.',
          409,
        );
      update('invoices', old.id, {
        number: number('INV'),
        status: 'issued',
        revision: old.revision + 1,
        accountSnapshot: json(a),
        sellerSnapshot: json(s),
        issuedAt: now(),
      });
      return invoiceProjection(requireRow('invoices', old.id));
    }
    if (type === 'invoice.void') {
      const i = requireIssued(p.id),
        reason = text(p.reason, 'Void reason', { max: 1000, multiline: true });
      if (
        one('SELECT id FROM billing_allocations WHERE invoiceId=? LIMIT 1', i.id) ||
        one('SELECT id FROM billing_credits WHERE invoiceId=? LIMIT 1', i.id)
      )
        fail(
          'INVOICE_HAS_ACTIVITY',
          'Invoices with payment or credit history cannot be voided. Record a credit adjustment.',
          409,
        );
      update('invoices', i.id, {
        status: 'void',
        revision: i.revision + 1,
        voidReason: reason,
        voidedAt: now(),
      });
      return invoiceProjection(requireRow('invoices', i.id));
    }
    if (type === 'payment.record') {
      activeAccount(p.accountId);
      const row = {
        id: uid(),
        accountId: p.accountId,
        purpose: choice(p.purpose, ['fees', 'bond'], 'Payment purpose'),
        amountCents: integer(p.amountCents, 'Payment amount', 1),
        paidOn: receivedDate(p.paidOn, 'Payment date'),
        method: choice(p.method, ['bank_transfer', 'cash', 'eftpos', 'other'], 'Payment method'),
        reference: text(p.reference, 'Transaction reference', { max: 250 }),
        status: 'pending',
        evidence: '',
        evidenceKey: null,
        createdAt: now(),
        confirmedAt: null,
        confirmedBy: null,
        reason: '',
      };
      insert('payments', row);
      return paymentProjection(row);
    }
    if (type === 'payment.confirm') {
      const old = requireRow('payments', p.id);
      if (old.status !== 'pending')
        fail('PAYMENT_STATE', 'Only a pending payment can be confirmed.', 409);
      receivedDate(old.paidOn, 'Payment date');
      const evidence = text(p.evidence, 'Verification evidence', { max: 2000, multiline: true });
      sellerReady(settings(), accountProjection(requireRow('accounts', old.accountId)), []);
      const evidenceKey = hash(json([old.method, normalize(old.reference), old.paidOn]));
      if (one('SELECT id FROM billing_payments WHERE evidenceKey=?', evidenceKey))
        fail(
          'DUPLICATE_PAYMENT_EVIDENCE',
          'That transaction has already been confirmed. Check the original payment or use its unique bank transaction identifier.',
          409,
        );
      const confirmedAt = now();
      update('payments', old.id, {
        status: 'confirmed',
        evidence,
        evidenceKey,
        confirmedAt,
        confirmedBy: actor.id,
      });
      const allocations = addAllocations(requireRow('payments', old.id), p.allocations ?? []).map(
        (a) => ({ ...a, invoiceNumber: requireRow('invoices', a.invoiceId).number }),
      );
      const payment = paymentProjection(requireRow('payments', old.id));
      const accountSnapshot = accountProjection(requireRow('accounts', old.accountId)),
        sellerSnapshot = settings();
      const snapshot = {
        paymentId: old.id,
        amountCents: old.amountCents,
        purpose: old.purpose,
        paidOn: old.paidOn,
        method: old.method,
        reference: old.reference,
        evidence,
        verifiedBy: actor.name,
        confirmedAt,
        allocations,
        accountSnapshot,
        sellerSnapshot,
        unallocatedCents: old.purpose === 'fees' ? payment.unallocatedCents : 0,
        bondHeldCents: old.purpose === 'bond' ? payment.unallocatedCents : 0,
      };
      insert('receipts', {
        id: uid(),
        number: number('RCT'),
        paymentId: old.id,
        accountId: old.accountId,
        amountCents: old.amountCents,
        issuedAt: confirmedAt,
        snapshot: json(snapshot),
      });
      return paymentProjection(requireRow('payments', old.id));
    }
    if (type === 'payment.reject') {
      const old = requireRow('payments', p.id);
      if (old.status !== 'pending')
        fail('PAYMENT_STATE', 'Only a pending payment can be rejected.', 409);
      update('payments', old.id, {
        status: 'rejected',
        reason: text(p.reason, 'Rejection reason', { max: 1000, multiline: true }),
      });
      return paymentProjection(requireRow('payments', old.id));
    }
    if (type === 'payment.allocate') {
      const payment = requireConfirmed(p.id);
      if (!array(p.allocations, 'Allocations', { min: 1 }).length)
        fail('INVALID_LIST', 'Add an allocation.');
      addAllocations(payment, p.allocations);
      return paymentProjection(requireRow('payments', payment.id));
    }
    if (type === 'payment.release') {
      const payment = requireConfirmed(p.id),
        a = requireRow('allocations', p.allocationId);
      if (a.paymentId !== payment.id)
        fail('PAYMENT_MISMATCH', 'The allocation does not belong to this payment.');
      if (one('SELECT id FROM billing_allocation_releases WHERE allocationId=?', a.id))
        fail('ALREADY_RELEASED', 'That allocation was already released.', 409);
      insert('allocation_releases', {
        id: uid(),
        allocationId: a.id,
        reason: text(p.reason, 'Release reason', { max: 1000, multiline: true }),
        createdAt: now(),
      });
      return paymentProjection(requireRow('payments', payment.id));
    }
    if (type === 'payment.reverse') {
      const payment = requireConfirmed(p.id),
        reason = text(p.reason, 'Reversal reason', { max: 1000, multiline: true });
      if (payment.refundedCents > 0)
        fail(
          'REFUNDS_EXIST',
          'A refunded payment cannot be reversed. Review its existing refund history.',
          409,
        );
      for (const a of allocationsFor(payment.id).filter((a) => !a.releasedAt))
        insert('allocation_releases', { id: uid(), allocationId: a.id, reason, createdAt: now() });
      update('payments', payment.id, { status: 'reversed', reason });
      return paymentProjection(requireRow('payments', payment.id));
    }
    if (type === 'payment.refund') {
      const payment = requireConfirmed(p.id),
        amountCents = integer(p.amountCents, 'Refund amount', 1),
        paidOn = receivedDate(p.paidOn, 'Refund date'),
        reference = text(p.reference, 'Refund transaction reference', { max: 250 }),
        reason = text(p.reason, 'Refund reason', { max: 1000, multiline: true });
      if (paidOn < payment.paidOn)
        fail('INVALID_REFUND_DATE', 'Refund date cannot be earlier than the received payment.');
      if (amountCents > payment.unallocatedCents)
        fail(
          'REFUND_EXCEEDS_FUNDS',
          'Release the relevant allocation before recording a refund. Refunds cannot exceed available funds.',
          409,
        );
      // Outgoing refund identity is independent of how the original money arrived.
      // Check retained legacy rows too: their historical evidence hashes included
      // the incoming payment method and cannot be rewritten in append-only history.
      if (
        all('SELECT reference FROM billing_refunds WHERE paidOn=?', paidOn).some(
          (refund) => normalize(refund.reference) === normalize(reference),
        )
      )
        fail(
          'DUPLICATE_RECORD',
          'That outgoing refund transaction has already been recorded. Use its unique transaction identifier.',
          409,
        );
      const row = {
        id: uid(),
        paymentId: payment.id,
        accountId: payment.accountId,
        amountCents,
        paidOn,
        reference,
        reason,
        evidenceKey: hash(json([normalize(reference), paidOn])),
        createdAt: now(),
      };
      insert('refunds', row);
      const { evidenceKey, ...result } = row;
      return result;
    }
    if (type === 'credit.create') {
      const invoice = requireIssued(p.invoiceId),
        reason = text(p.reason, 'Credit reason', { max: 1000, multiline: true });
      const input = array(p.lines, 'Credit lines', { min: 1, max: 200 }).map((l) => ({
        ...l,
        invoiceLineId: text(l.invoiceLineId, 'Invoice line ID', { max: 100 }),
      }));
      distinct(
        input.map((l) => l.invoiceLineId),
        'Credit lines',
      );
      const lines = input.map((l) => {
        const original = invoice.lines.find((x) => x.id === l.invoiceLineId);
        if (!original) fail('INVALID_LINE', 'Credit lines must reference this invoice.');
        const amountCents = integer(l.amountCents, 'Credit amount', 1);
        const prior = one(
          'SELECT COALESCE(SUM(amountCents),0) AS amount,COALESCE(SUM(taxCents),0) AS tax FROM billing_credit_lines WHERE invoiceLineId=?',
          original.id,
        );
        if (amountCents + prior.amount > original.totalCents)
          fail('OVER_CREDIT', 'Credit exceeds the original line remaining value.', 409);
        const taxCents =
          proportional(original.taxCents, amountCents + prior.amount, original.totalCents) -
          prior.tax;
        return {
          id: uid(),
          invoiceLineId: original.id,
          amountCents,
          taxCents,
          description: original.description,
          taxCode: original.taxCode,
          studentName: original.studentName,
          accountCode: original.accountCode,
        };
      });
      const amountCents = sum(lines.map((l) => l.amountCents)),
        taxCents = sum(lines.map((l) => l.taxCents));
      if (amountCents > invoice.balanceCents)
        fail(
          'OVER_CREDIT',
          'Credit exceeds the current invoice outstanding balance. Release payments first if appropriate.',
          409,
        );
      const row = {
        id: uid(),
        number: number('CN'),
        accountId: invoice.accountId,
        invoiceId: invoice.id,
        amountCents,
        taxCents,
        reason,
        issuedAt: now(),
        snapshot: json({
          invoiceNumber: invoice.number,
          accountSnapshot: invoice.accountSnapshot,
          sellerSnapshot: invoice.sellerSnapshot,
          lines,
          amountCents,
          taxCents,
          reason,
        }),
      };
      insert('credits', row);
      for (const l of lines)
        insert('credit_lines', {
          id: l.id,
          creditId: row.id,
          invoiceLineId: l.invoiceLineId,
          amountCents: l.amountCents,
          taxCents: l.taxCents,
        });
      return creditProjection(row);
    }
    if (type === 'plan.create') {
      const invoice = requireIssued(p.invoiceId);
      if (invoice.balanceCents <= 0)
        fail('NO_BALANCE', 'A settled invoice does not need a payment plan.', 409);
      const instalments = array(p.instalments, 'Instalments', { min: 1, max: 100 }).map((i) => ({
        dueDate: validDate(i.dueDate, 'Instalment date'),
        amountCents: integer(i.amountCents, 'Instalment amount', 1),
      }));
      if (
        instalments.some(
          (i, index) =>
            i.dueDate < invoice.issueDate ||
            (index > 0 && i.dueDate <= instalments[index - 1].dueDate),
        )
      )
        fail(
          'INVALID_PLAN_DATES',
          'Instalments need distinct ascending dates on or after the invoice date.',
        );
      if (sum(instalments.map((i) => i.amountCents)) !== invoice.totalCents)
        fail(
          'PLAN_TOTAL',
          'The instalment schedule must total the original invoice amount. Existing payments/credits will be reflected in its progress.',
        );
      const row = {
        id: uid(),
        invoiceId: invoice.id,
        instalments: json(instalments),
        createdAt: now(),
      };
      insert('plans', row);
      return planProjection(row);
    }
    if (type === 'batch.preview') {
      const fields = invoiceFields({ ...p, description: p.label });
      const label = text(p.label, 'Batch label', { max: 160 });
      const studentIds = distinct(
        array(p.studentIds, 'Students', { min: 1, max: 200 }).map((id) =>
          text(id, 'Student ID', { max: 100 }),
        ),
        'Students',
      ).sort();
      const feeIds = distinct(
        array(p.feeIds, 'Fees', { min: 1, max: 50 }).map((id) => text(id, 'Fee ID', { max: 100 })),
        'Fees',
      ).sort();
      if (studentIds.length * feeIds.length > 1000)
        fail(
          'BATCH_TOO_LARGE',
          'A billing batch may contain at most 1,000 student-fee combinations.',
        );
      const fingerprint = hash(
        json({
          studentIds,
          feeIds,
          year: fields.year,
          term: normalize(fields.term),
          issueDate: fields.issueDate,
          dueDate: fields.dueDate,
        }),
      );
      const prior = one('SELECT * FROM billing_batches WHERE fingerprint=?', fingerprint);
      if (prior) return batchProjection(prior);
      const fees = feeIds.map((id) => {
        const fee = requireRow('fees', id);
        if (!fee.active) fail('FEE_INACTIVE', 'Select active fee items.');
        return fee;
      });
      const groups = new Map();
      const claims = [];
      for (const id of studentIds) {
        const student = requireRow('students', id);
        if (student.status === 'inactive')
          fail('STUDENT_INACTIVE', 'Select active or prospective students.');
        const account = activeAccount(student.accountId);
        if (!groups.has(account.id))
          groups.set(account.id, {
            accountId: account.id,
            accountSnapshot: accountProjection(account),
            lines: [],
          });
        const group = groups.get(account.id);
        for (const fee of fees) {
          if (
            one(
              'SELECT batchId FROM billing_batch_claims WHERE studentId=? AND feeId=? AND year=? AND term=?',
              id,
              fee.id,
              fields.year,
              normalize(fields.term),
            )
          )
            fail(
              'DUPLICATE_BILLING_PERIOD',
              'A selected student and fee have already been billed for this year and term.',
              409,
            );
          group.lines.push({
            id: uid(),
            position: group.lines.length,
            studentId: id,
            studentName: student.name,
            feeId: fee.id,
            description: fee.description,
            quantity: 1,
            unitCents: fee.unitCents,
            discountCents: 0,
            taxCode: fee.taxCode,
            category: fee.category,
            accountCode: fee.accountCode,
            ...priceLine({ ...fee, quantity: 1, discountCents: 0 }),
          });
          claims.push({
            studentId: id,
            feeId: fee.id,
            year: fields.year,
            term: normalize(fields.term),
            accountId: account.id,
          });
        }
      }
      const accounts = [...groups.values()].map((g) => ({ ...g, ...totals(g.lines) })),
        sellerSnapshot = settings();
      if (!demoMode)
        for (const group of accounts)
          sellerReady(sellerSnapshot, group.accountSnapshot, group.lines);
      const snapshot = { accounts, sellerSnapshot, claims };
      const row = {
        id: uid(),
        fingerprint,
        label,
        year: fields.year,
        term: fields.term,
        issueDate: fields.issueDate,
        dueDate: fields.dueDate,
        status: 'preview',
        snapshot: json(snapshot),
        createdAt: now(),
        committedAt: null,
      };
      insert('batches', row);
      return batchProjection(row);
    }
    if (type === 'batch.commit') {
      const batch = requireRow('batches', p.id);
      if (batch.status === 'committed') return batchProjection(batch);
      const snapshot = parse(batch.snapshot),
        ids = new Map();
      for (const claim of snapshot.claims)
        if (
          one(
            'SELECT batchId FROM billing_batch_claims WHERE studentId=? AND feeId=? AND year=? AND term=?',
            claim.studentId,
            claim.feeId,
            claim.year,
            claim.term,
          )
        )
          fail(
            'DUPLICATE_BILLING_PERIOD',
            'This student and fee period was committed by another batch. Nothing was created.',
            409,
          );
      for (const group of snapshot.accounts) {
        activeAccount(group.accountId);
        for (const line of group.lines) {
          const student = requireRow('students', line.studentId);
          if (student.status === 'inactive' || student.accountId !== group.accountId)
            fail(
              'BATCH_STUDENT_CHANGED',
              'A selected student is no longer eligible. Review the batch.',
              409,
            );
        }
        const invoice = createInvoice(
          {
            accountId: group.accountId,
            issueDate: batch.issueDate,
            dueDate: batch.dueDate,
            year: batch.year,
            term: batch.term,
            description: batch.label,
          },
          {
            preparedLines: group.lines,
            batchId: batch.id,
            accountSnapshot: group.accountSnapshot,
            sellerSnapshot: snapshot.sellerSnapshot,
          },
        );
        ids.set(group.accountId, invoice.id);
      }
      for (const claim of snapshot.claims) {
        const { accountId, ...rest } = claim;
        insert('batch_claims', { ...rest, batchId: batch.id, invoiceId: ids.get(accountId) });
      }
      update('batches', batch.id, { status: 'committed', committedAt: now() });
      return batchProjection(requireRow('batches', batch.id));
    }
    if (type === 'settings.update') {
      const old = settings();
      revision(old, p.expectedRevision);
      if (p.demoMode !== undefined && p.demoMode !== demoMode)
        fail('MODE_CONTROLLED', 'Sample/live mode is controlled by the server.');
      const s = {
        schoolName: text(p.schoolName, 'School name', { max: 160 }),
        legalName: text(p.legalName, 'Legal name', { required: false, max: 160 }),
        abn: text(p.abn, 'ABN', { required: false, max: 30 }).replace(/\s/g, ''),
        address: text(p.address, 'Seller address', { required: false, max: 1000, multiline: true }),
        email: email(p.email),
        phone: text(p.phone, 'Phone', { required: false, max: 80 }),
        paymentInstructions: text(p.paymentInstructions, 'Payment instructions', {
          required: false,
          max: 3000,
          multiline: true,
        }),
        defaultDueDays: integer(p.defaultDueDays, 'Default due days', 0, 365),
        gstRegistered: bool(p.gstRegistered, 'GST registered'),
        taxPolicyApproved: bool(p.taxPolicyApproved, 'Tax policy approved'),
        xeroTaxMappings: {},
      };
      if (s.abn && !validABN(s.abn)) fail('INVALID_ABN', 'Enter an ABN with a valid checksum.');
      if (s.gstRegistered && !validABN(s.abn))
        fail('INVALID_ABN', 'GST registration requires a valid ABN.');
      const mappings = p.xeroTaxMappings ?? {};
      if (!mappings || Array.isArray(mappings) || typeof mappings !== 'object')
        fail('INVALID_MAPPING', 'Tax mappings must be an object.');
      for (const [key, value] of Object.entries(mappings)) {
        choice(key, ['GST_FREE', 'GST_10', 'NO_GST'], 'Mapping tax code');
        s.xeroTaxMappings[key] = text(value, 'Xero tax mapping', { required: false, max: 100 });
      }
      run('UPDATE billing_settings SET revision=?,data=? WHERE id=1', old.revision + 1, json(s));
      return settings();
    }
    if (type === 'export.recordImport') {
      const manifest = requireRow('exports', p.id);
      if (manifest.kind !== 'xero')
        fail('INVALID_EXPORT', 'Only Xero exports have an external import result.');
      insert('export_imports', {
        id: uid(),
        exportId: manifest.id,
        importReference: text(p.importReference, 'Import reference', { max: 250 }),
        reason: text(p.reason, 'Import review note', { max: 1000, multiline: true }),
        importedAt: now(),
      });
      return exportProjection(manifest);
    }
    fail('UNKNOWN_COMMAND', 'This billing command is not supported.');
  }
  function execute(actor, command, idempotencyKey) {
    role(actor, 'billing');
    if (!command || typeof command !== 'object' || !commands.has(command.type))
      fail('UNKNOWN_COMMAND', 'This billing command is not supported.');
    if (financeCommands.has(command.type)) role(actor, 'finance');
    if (command.type === 'settings.update') role(actor, 'admin');
    const key = text(idempotencyKey, 'Idempotency key', { max: 200 });
    const payload = command.payload;
    if (!payload || Array.isArray(payload) || typeof payload !== 'object')
      fail('INVALID_PAYLOAD', 'A command payload object is required.');
    const requestHash = hash(json(canonical(command)));
    return transaction(() => {
      const existing = one(
        'SELECT requestHash,response FROM billing_operations WHERE actorId=? AND key=?',
        actor.id,
        key,
      );
      if (existing) {
        if (existing.requestHash !== requestHash)
          fail(
            'IDEMPOTENCY_CONFLICT',
            'This operation key was already used for different content.',
            409,
          );
        return parse(existing.response);
      }
      const result = dispatch(actor, command.type, payload);
      audit(
        actor,
        command.type,
        command.type.split('.')[0],
        result.id ?? 'settings',
        typeof payload.reason === 'string' ? payload.reason.trim() : '',
      );
      insert('operations', {
        actorId: actor.id,
        key,
        requestHash,
        response: json(result),
        createdAt: now(),
      });
      return result;
    });
  }
  function projectDocument(kind, id) {
    let document,
      account,
      seller,
      extras = {};
    if (kind === 'invoice') {
      document = invoiceProjection(requireRow('invoices', id));
      account =
        document.accountSnapshot ?? accountProjection(requireRow('accounts', document.accountId));
      seller = document.sellerSnapshot ?? settings();
      extras = {
        payments: all(
          'SELECT p.* FROM billing_payments p WHERE p.accountId=?',
          document.accountId,
        ).map(paymentProjection),
        credits: all('SELECT * FROM billing_credits WHERE invoiceId=?', id).map(creditProjection),
        allocations: all(
          'SELECT a.*,r.createdAt AS releasedAt,r.reason FROM billing_allocations a LEFT JOIN billing_allocation_releases r ON a.id=r.allocationId WHERE a.invoiceId=?',
          id,
        ),
      };
    } else if (kind === 'receipt') {
      document = receiptProjection(requireRow('receipts', id));
      account = document.snapshot.accountSnapshot;
      seller = document.snapshot.sellerSnapshot;
      extras = {
        refunds: document.refunds,
        payment: paymentProjection(requireRow('payments', document.paymentId)),
      };
    } else if (kind === 'credit') {
      document = creditProjection(requireRow('credits', id));
      account = document.snapshot.accountSnapshot;
      seller = document.snapshot.sellerSnapshot;
    } else if (kind === 'statement') {
      const s = state();
      account = s.accounts.find((a) => a.id === id);
      if (!account) fail('NOT_FOUND', 'This billing account does not exist.', 404);
      document = account;
      seller = s.settings;
      extras = {
        invoices: s.invoices.filter((i) => i.accountId === id),
        payments: s.payments.filter((p) => p.accountId === id),
        credits: s.credits.filter((c) => c.accountId === id),
        refunds: s.refunds.filter((r) => r.accountId === id),
        receipts: s.receipts.filter((r) => r.accountId === id),
        balances: {
          balanceCents: account.balanceCents,
          unallocatedCents: account.unallocatedCents,
          bondHeldCents: account.bondHeldCents,
          pendingCents: account.pendingCents,
        },
      };
    } else fail('INVALID_DOCUMENT', 'That document type is not supported.', 404);
    return {
      kind,
      document,
      account,
      settings: seller,
      today: today(),
      generatedAt: now(),
      ...extras,
    };
  }
  function getDocument(actor, kind, id) {
    role(actor);
    return transaction(() => {
      const document = projectDocument(kind, id);
      audit(actor, 'document.download', kind, id);
      return document;
    });
  }
  function recordExport(actor, kind, metadata) {
    role(actor, 'finance');
    choice(kind, ['receivables', 'xero'], 'Export type');
    if (
      !metadata ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata) ||
      json(metadata).length > 200000
    )
      fail('INVALID_EXPORT', 'Export metadata is invalid.');
    if (typeof metadata.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(metadata.sha256))
      fail('INVALID_EXPORT', 'An export file SHA-256 is required.');
    return transaction(() => {
      const row = {
        id: uid(),
        kind,
        metadata: json(metadata),
        createdAt: now(),
        actorId: actor.id,
      };
      insert('exports', row);
      audit(actor, 'export.generated', 'export', row.id, '', { kind, sha256: metadata.sha256 });
      return exportProjection(row);
    });
  }
  return {
    getState(actor) {
      role(actor);
      return transaction(state);
    },
    execute,
    getDocument,
    recordExport,
    // Internal synchronous integrations share one consistent database transaction.
    // The callback must never perform network I/O or return a Promise.
    withSnapshot(actor, callback) {
      role(actor);
      if (typeof callback !== 'function') throw new TypeError('A snapshot callback is required.');
      return transaction(() => {
        const result = callback({ state: state(), getDocument: projectDocument });
        if (result && typeof result.then === 'function')
          throw new TypeError('Snapshot callbacks must be synchronous.');
        return result;
      });
    },
  };
}
