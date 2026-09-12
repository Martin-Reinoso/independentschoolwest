import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { fail, integer, validDate, melbourneDate } from './money.mjs';

const roles = ['viewer', 'billing', 'finance', 'admin'];
const kinds = ['invoice', 'receipt', 'credit', 'statement'];
const statuses = [
  'draft',
  'queued',
  'sending',
  'accepted',
  'failed',
  'uncertain',
  'blocked',
  'cancelled',
];
const financeCommands = new Set([
  'communication.approve',
  'communication.retry',
  'communication.settings',
  'communication.prepare',
  'communication.hold',
  'communication.resend',
  'communication.resolve',
]);
const commandNames = new Set([
  'communication.create',
  'communication.update',
  'communication.approve',
  'communication.cancel',
  'communication.refresh',
  'communication.retry',
  'communication.settings',
  'communication.prepare',
  'communication.hold',
  'communication.resend',
  'communication.resolve',
]);
const worker = {
  id: 'communications-worker',
  name: 'Billing communications worker',
  role: 'finance',
};
const json = (value) => JSON.stringify(value);
const parse = (value) => (value == null ? null : JSON.parse(value));
const digest = (value) => createHash('sha256').update(value).digest('hex');
const uid = () => randomUUID();
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const hash = (value) => digest(json(canonical(value)));
const money = (value) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value / 100);
const displayDate = (value) => value.split('-').reverse().join('/');
const deliverableEmail = (value) =>
  typeof value === 'string' &&
  value.length <= 254 &&
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(
    value,
  );
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
    fail('FORBIDDEN', 'Your staff role does not permit this communication action.', 403);
}
function text(value, label, { max = 200, optional = false, multiline = false } = {}) {
  if (value == null && optional) return '';
  if (typeof value !== 'string') fail('INVALID_TEXT', `${label} must be text.`);
  const result = value.trim();
  if (
    (!optional && !result) ||
    result.length > max ||
    (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(result)
  )
    fail('INVALID_TEXT', `${label} is missing, too long or contains unsupported characters.`);
  return result;
}
function bool(value) {
  if (typeof value !== 'boolean')
    fail('INVALID_VALUE', 'Use true or false for communication options.');
  return value;
}
function choice(value, allowed) {
  if (!allowed.includes(value))
    fail('INVALID_VALUE', 'That communication option is not supported.');
  return value;
}

/** Persistent preparation and delivery bookkeeping. This module never sends email. */
export function createCommunications({ db, service, clock = () => new Date() }) {
  if (!db || typeof service?.withSnapshot !== 'function' || typeof clock !== 'function')
    throw new TypeError(
      'Communications requires a database, snapshot-capable billing service and clock.',
    );
  const now = () => clock().toISOString();
  const today = () => melbourneDate(clock());
  const all = (sql, ...values) =>
    db
      .prepare(sql)
      .all(...values)
      .map((row) => ({ ...row }));
  const one = (sql, ...values) => {
    const row = db.prepare(sql).get(...values);
    return row ? { ...row } : null;
  };
  const run = (sql, ...values) => db.prepare(sql).run(...values);
  const insert = (table, row) =>
    run(
      `INSERT INTO comms_${table}(${Object.keys(row).join(',')}) VALUES(${Object.keys(row)
        .map(() => '?')
        .join(',')})`,
      ...Object.values(row),
    );
  const update = (table, id, row) =>
    run(
      `UPDATE comms_${table} SET ${Object.keys(row)
        .map((key) => `${key}=?`)
        .join(',')} WHERE id=?`,
      ...Object.values(row),
      id,
    );
  const within = (actor, fn) => service.withSnapshot(actor, fn);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
CREATE TABLE IF NOT EXISTS comms_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS comms_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS comms_holds(accountId TEXT PRIMARY KEY REFERENCES billing_accounts(id),paused INTEGER NOT NULL CHECK(paused IN(0,1)),reason TEXT NOT NULL,revision INTEGER NOT NULL,updatedAt TEXT NOT NULL,actorId TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS comms_messages(
 id TEXT PRIMARY KEY,eventKey TEXT NOT NULL UNIQUE,kind TEXT NOT NULL CHECK(kind IN('invoice','receipt','credit','statement','reminder')),
 documentKind TEXT NOT NULL,documentId TEXT NOT NULL,accountId TEXT NOT NULL REFERENCES billing_accounts(id),source TEXT NOT NULL CHECK(source IN('manual','automation')),
 offsetDays INTEGER,recipient TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,snapshot TEXT NOT NULL,attachmentHash TEXT NOT NULL,fingerprint TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('draft','queued','sending','accepted','failed','uncertain','blocked','cancelled')),revision INTEGER NOT NULL,
 approvedFingerprint TEXT,autoApproved INTEGER NOT NULL CHECK(autoApproved IN(0,1)),approvedBy TEXT,approvedAt TEXT,
 createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,acceptedAt TEXT,providerId TEXT NOT NULL,blockReason TEXT NOT NULL,errorCode TEXT NOT NULL,
 currentAttemptId TEXT REFERENCES comms_attempts(id),parentMessageId TEXT REFERENCES comms_messages(id)
) STRICT;
CREATE INDEX IF NOT EXISTS comms_messages_queue ON comms_messages(status,createdAt);
CREATE INDEX IF NOT EXISTS comms_messages_account ON comms_messages(accountId);
CREATE TABLE IF NOT EXISTS comms_attempts(id TEXT PRIMARY KEY,messageId TEXT NOT NULL REFERENCES comms_messages(id),leaseHash TEXT NOT NULL UNIQUE,leasedUntil TEXT NOT NULL,startedAt TEXT NOT NULL,payload TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS comms_results(id TEXT PRIMARY KEY,attemptId TEXT NOT NULL REFERENCES comms_attempts(id),outcome TEXT NOT NULL CHECK(outcome IN('accepted','failed','uncertain')),providerId TEXT NOT NULL,errorCode TEXT NOT NULL,createdAt TEXT NOT NULL,attachmentSha256 TEXT NOT NULL DEFAULT '') STRICT;
CREATE TABLE IF NOT EXISTS comms_dispatches(attemptId TEXT PRIMARY KEY REFERENCES comms_attempts(id),validatedAt TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS comms_resolutions(id TEXT PRIMARY KEY,messageId TEXT NOT NULL REFERENCES comms_messages(id),attemptId TEXT NOT NULL UNIQUE REFERENCES comms_attempts(id),outcome TEXT NOT NULL CHECK(outcome IN('accepted','not_sent')),providerId TEXT NOT NULL,reason TEXT NOT NULL,evidence TEXT NOT NULL,actorId TEXT NOT NULL,actorName TEXT NOT NULL,resolvedAt TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS comms_events(id TEXT PRIMARY KEY,messageId TEXT REFERENCES comms_messages(id),action TEXT NOT NULL,actorId TEXT NOT NULL,actorName TEXT NOT NULL,createdAt TEXT NOT NULL,details TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS comms_operations(actorId TEXT NOT NULL,key TEXT NOT NULL,requestHash TEXT NOT NULL,response TEXT NOT NULL,createdAt TEXT NOT NULL,PRIMARY KEY(actorId,key)) STRICT;
`);
    const version = one("SELECT value FROM comms_meta WHERE key='schemaVersion'");
    if (version && version.value !== '1') throw new Error('Unsupported communications schema.');
    if (
      !all('PRAGMA table_info(comms_messages)').some((column) => column.name === 'parentMessageId')
    )
      db.exec(
        'ALTER TABLE comms_messages ADD COLUMN parentMessageId TEXT REFERENCES comms_messages(id)',
      );
    if (
      !all('PRAGMA table_info(comms_results)').some((column) => column.name === 'attachmentSha256')
    )
      db.exec("ALTER TABLE comms_results ADD COLUMN attachmentSha256 TEXT NOT NULL DEFAULT ''");
    run("INSERT OR IGNORE INTO comms_meta VALUES('schemaVersion','1')");
    run(
      'INSERT OR IGNORE INTO comms_settings VALUES(1,1,?)',
      json({
        automaticInvoices: false,
        automaticReceipts: false,
        remindersEnabled: false,
        reminderOffsets: [-7, 0, 7, 14],
        mode: 'review',
        startDate: today(),
      }),
    );
    for (const table of [
      'attempts',
      'results',
      'dispatches',
      'resolutions',
      'events',
      'operations',
    ])
      for (const op of ['UPDATE', 'DELETE'])
        db.exec(
          `CREATE TRIGGER IF NOT EXISTS comms_${table}_no_${op.toLowerCase()} BEFORE ${op} ON comms_${table} BEGIN SELECT RAISE(ABORT,'Immutable communication history'); END;`,
        );
    db.exec(`
CREATE TRIGGER IF NOT EXISTS comms_messages_no_delete BEFORE DELETE ON comms_messages BEGIN SELECT RAISE(ABORT,'Communication history is retained'); END;
CREATE TRIGGER IF NOT EXISTS comms_messages_identity BEFORE UPDATE ON comms_messages WHEN NEW.eventKey IS NOT OLD.eventKey OR NEW.kind IS NOT OLD.kind OR NEW.documentKind IS NOT OLD.documentKind OR NEW.documentId IS NOT OLD.documentId OR NEW.accountId IS NOT OLD.accountId OR NEW.source IS NOT OLD.source OR NEW.offsetDays IS NOT OLD.offsetDays OR NEW.createdAt IS NOT OLD.createdAt BEGIN SELECT RAISE(ABORT,'Communication identity is immutable'); END;
CREATE TRIGGER IF NOT EXISTS comms_messages_parent BEFORE UPDATE ON comms_messages WHEN NEW.parentMessageId IS NOT OLD.parentMessageId BEGIN SELECT RAISE(ABORT,'Communication parent is immutable'); END;
CREATE TRIGGER IF NOT EXISTS comms_messages_frozen BEFORE UPDATE ON comms_messages WHEN OLD.status NOT IN('draft','blocked','failed') AND (NEW.recipient IS NOT OLD.recipient OR NEW.subject IS NOT OLD.subject OR NEW.body IS NOT OLD.body OR NEW.snapshot IS NOT OLD.snapshot OR NEW.attachmentHash IS NOT OLD.attachmentHash OR NEW.fingerprint IS NOT OLD.fingerprint) BEGIN SELECT RAISE(ABORT,'Approved communication content is immutable'); END;
`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  function settings() {
    const row = one('SELECT * FROM comms_settings WHERE id=1');
    return { ...parse(row.data), revision: row.revision };
  }
  function get(id) {
    const row = one(
      'SELECT * FROM comms_messages WHERE id=?',
      text(id, 'Message ID', { max: 100 }),
    );
    if (!row) fail('NOT_FOUND', 'The communication does not exist.', 404);
    return row;
  }
  function publicMessage(row) {
    const { snapshot, fingerprint, approvedFingerprint, recipient, autoApproved, ...message } = row;
    const result = row.currentAttemptId
      ? one(
          'SELECT attachmentSha256 FROM comms_results WHERE attemptId=? ORDER BY rowid DESC LIMIT 1',
          row.currentAttemptId,
        )
      : null;
    return {
      ...message,
      to: recipient,
      snapshotHash: row.attachmentHash,
      sentAttachmentSha256: result?.attachmentSha256 || '',
      autoApproved: Boolean(autoApproved),
      resolution: row.currentAttemptId
        ? one(
            'SELECT outcome,providerId,reason,evidence,actorId,actorName,resolvedAt FROM comms_resolutions WHERE attemptId=?',
            row.currentAttemptId,
          )
        : null,
    };
  }
  function event(actor, action, messageId = null, details = {}) {
    insert('events', {
      id: uid(),
      messageId,
      action,
      actorId: actor.id,
      actorName: actor.name,
      createdAt: now(),
      details: json(details),
    });
  }
  function revise(row, fields) {
    update('messages', row.id, { ...fields, revision: row.revision + 1, updatedAt: now() });
    return get(row.id);
  }
  function revision(row, expected) {
    if (integer(expected, 'Revision', 1) !== row.revision)
      fail(
        'STALE_REVISION',
        'This communication changed. Refresh and review it before continuing.',
        409,
      );
  }
  function allowedStatus(row, allowed) {
    if (!allowed.includes(row.status))
      fail(
        'COMMUNICATION_STATE',
        'This action is not available for the current communication state.',
        409,
      );
  }
  function hold(accountId) {
    return one('SELECT * FROM comms_holds WHERE accountId=?', accountId);
  }
  function facts(snapshot, kind, documentId, offsetDays = null) {
    const documentKind = kind === 'reminder' ? 'invoice' : kind;
    const document = snapshot.getDocument(documentKind, documentId);
    const accountId = kind === 'statement' ? document.document.id : document.document.accountId;
    const account = snapshot.state.accounts.find((candidate) => candidate.id === accountId);
    if (!account) fail('NOT_FOUND', 'The billing account does not exist.', 404);
    let blocked = '';
    if (account.status !== 'active') blocked = 'Account is archived.';
    else if (!account.contactAllowed) blocked = 'Account contact permission is not enabled.';
    else if (!deliverableEmail(account.email))
      blocked = 'Account has no valid billing email supported by the delivery provider.';
    else if (hold(account.id)?.paused)
      blocked = 'All outbound communication is paused for this account.';
    else if (documentKind === 'invoice' && document.document.status !== 'issued')
      blocked = 'Only an active issued invoice can be communicated.';
    else if (documentKind === 'receipt' && document.document.reversed)
      blocked = 'A reversed receipt cannot be sent.';
    else if (kind === 'reminder' && document.document.balanceCents <= 0)
      blocked = 'This invoice has no outstanding balance.';
    else if (
      kind === 'reminder' &&
      snapshot.state.payments.some(
        (payment) =>
          payment.accountId === account.id &&
          payment.purpose === 'fees' &&
          payment.status === 'pending',
      )
    )
      blocked = 'A reported fee payment is awaiting verification for this account.';
    if (!blocked && kind === 'reminder') {
      const days = Math.round(
        (Date.parse(`${today()}T00:00:00Z`) -
          Date.parse(`${document.document.dueDate}T00:00:00Z`)) /
          86400000,
      );
      if (days < offsetDays) blocked = 'The reminder date has not been reached.';
    }
    const clean = { ...document };
    delete clean.generatedAt;
    if (kind !== 'statement') delete clean.today;
    const fingerprint = hash({
      kind,
      offsetDays,
      account: {
        id: account.id,
        name: account.name,
        billingName: account.billingName,
        email: account.email,
        contactAllowed: account.contactAllowed,
        status: account.status,
      },
      paused: Boolean(hold(account.id)?.paused),
      document: clean,
    });
    return { documentKind, document, account, blocked, fingerprint };
  }
  function content(kind, current) {
    const { document: projection, account } = current,
      document = projection.document;
    const name = account.billingName || account.name,
      school = projection.settings.schoolName || 'Rosewood College';
    const sample = projection.settings.demoMode ? '[SAMPLE] ' : '';
    let subject, detail;
    if (kind === 'invoice') {
      subject = `${school} invoice ${document.number}`;
      detail = `Please find invoice ${document.number} attached. The original invoice total is ${money(document.totalCents)}, due ${displayDate(document.dueDate)}. Consult your account statement for subsequent payments or credits.`;
    } else if (kind === 'receipt') {
      subject = `${school} receipt ${document.number}`;
      detail = `Please find receipt ${document.number} attached for ${money(document.amountCents)} received on ${displayDate(document.snapshot.paidOn)}.${document.snapshot.purpose === 'bond' ? ' This is a refundable family bond and is separate from tuition fees.' : ' This receipt records the payment received and does not by itself confirm that all fees are settled.'}`;
    } else if (kind === 'credit') {
      subject = `${school} credit note ${document.number}`;
      detail = `Please find credit note ${document.number} attached for ${money(document.amountCents)}. This adjusts the invoice obligation and is not evidence of a cash refund.`;
    } else if (kind === 'statement') {
      subject = `${school} account statement ${account.code}`;
      detail = `Please find your account statement as at ${displayDate(today())} attached. Outstanding fees are ${money(account.balanceCents)}. Pending payments, unapplied fee funds and bonds are shown separately.`;
    } else {
      subject = `${school} invoice reminder ${document.number}`;
      detail = `Our records currently show ${money(document.balanceCents)} outstanding on invoice ${document.number}, due ${displayDate(document.dueDate)}. The attachment is the original invoice and may show its original total. If you have recently paid, please contact the school so finance can verify the transaction.`;
    }
    const body = `${projection.settings.demoMode ? 'SAMPLE ONLY — synthetic records; no payment is requested.\n\n' : ''}Dear ${name},\n\n${detail}\n\nPlease contact the school if you have any questions.\n\n${school}`;
    return {
      subject: text(sample + subject, 'Subject', { max: 200 }),
      body: text(body, 'Message body', { max: 12000, multiline: true }),
    };
  }
  function materialize(current, kind) {
    const snapshot = json(current.document);
    if (Buffer.byteLength(snapshot) > 2_000_000)
      fail(
        'DOCUMENT_TOO_LARGE',
        'The document is too large for email preparation. Review the account with finance.',
      );
    return {
      recipient: current.account.email,
      ...content(kind, current),
      snapshot,
      attachmentHash: digest(snapshot),
      fingerprint: current.fingerprint,
    };
  }
  function eventKey(kind, id, offsetDays = null) {
    return `${kind}:${id}${kind === 'statement' ? `:${today()}` : kind === 'reminder' ? `:${offsetDays}` : ''}`;
  }
  function create(
    actor,
    snapshot,
    kind,
    documentId,
    {
      source = 'manual',
      offsetDays = null,
      autoApprove = false,
      parentMessageId = null,
      keyOverride = null,
    } = {},
  ) {
    const key = keyOverride || eventKey(kind, documentId, offsetDays),
      previous = one('SELECT * FROM comms_messages WHERE eventKey=?', key);
    if (previous) return { row: previous, created: false };
    const current = facts(snapshot, kind, documentId, offsetDays);
    if (current.blocked) fail('COMMUNICATION_INELIGIBLE', current.blocked, 409);
    const row = {
      id: uid(),
      eventKey: key,
      kind,
      documentKind: current.documentKind,
      documentId,
      accountId: current.account.id,
      source,
      offsetDays,
      ...materialize(current, kind),
      status: autoApprove ? 'queued' : 'draft',
      revision: 1,
      approvedFingerprint: autoApprove ? current.fingerprint : null,
      autoApproved: Number(autoApprove),
      approvedBy: autoApprove ? actor.id : null,
      approvedAt: autoApprove ? now() : null,
      createdAt: now(),
      updatedAt: now(),
      acceptedAt: null,
      providerId: '',
      blockReason: '',
      errorCode: '',
      currentAttemptId: null,
      parentMessageId,
    };
    insert('messages', row);
    event(actor, autoApprove ? 'communication.prepared_queued' : 'communication.created', row.id, {
      kind,
      source,
    });
    return { row, created: true };
  }
  function block(actor, row, reason) {
    const updated = revise(row, {
      status: 'blocked',
      blockReason: reason,
      approvedFingerprint: null,
      autoApproved: 0,
    });
    event(actor, 'communication.blocked', row.id, { reason });
    return updated;
  }
  function recheck(actor, snapshot, row, { approval = false } = {}) {
    const current = facts(snapshot, row.kind, row.documentId, row.offsetDays);
    let reason = current.blocked;
    if (!reason && current.fingerprint !== (approval ? row.fingerprint : row.approvedFingerprint))
      reason = 'The recipient or billing facts changed. Refresh this draft and review it again.';
    if (!reason && row.autoApproved) {
      const config = settings();
      const enabled =
        row.kind === 'invoice'
          ? config.automaticInvoices
          : row.kind === 'receipt'
            ? config.automaticReceipts
            : config.remindersEnabled;
      if (
        config.mode !== 'automatic' ||
        !enabled ||
        melbourneDate(new Date(row.createdAt)) < config.startDate
      )
        reason = 'The automatic communication policy changed. Review this message before sending.';
    }
    if (reason) return { blocked: block(actor, row, reason) };
    return { current };
  }
  function prepare(actor, snapshot, payload, quiet = false) {
    const limit = integer(payload.limit ?? 50, 'Preparation limit', 1, 100),
      config = settings();
    const candidates = [];
    for (const invoice of snapshot.state.invoices) {
      if (
        invoice.status !== 'issued' ||
        melbourneDate(new Date(invoice.issuedAt)) < config.startDate
      )
        continue;
      if (config.automaticInvoices) candidates.push({ kind: 'invoice', id: invoice.id });
      if (config.remindersEnabled) {
        const days = Math.round(
          (Date.parse(`${today()}T00:00:00Z`) - Date.parse(`${invoice.dueDate}T00:00:00Z`)) /
            86400000,
        );
        const offsetDays = config.reminderOffsets.filter((offset) => offset <= days).at(-1);
        if (offsetDays !== undefined)
          candidates.push({ kind: 'reminder', id: invoice.id, offsetDays });
      }
    }
    if (config.automaticReceipts)
      for (const receipt of snapshot.state.receipts)
        if (!receipt.reversed && melbourneDate(new Date(receipt.issuedAt)) >= config.startDate)
          candidates.push({ kind: 'receipt', id: receipt.id });
    const result = {
      createdCount: 0,
      queuedCount: 0,
      skippedCount: 0,
      supersededCount: 0,
      messageIds: [],
      hasMore: false,
    };
    for (const candidate of candidates) {
      if (
        one(
          'SELECT id FROM comms_messages WHERE eventKey=?',
          eventKey(candidate.kind, candidate.id, candidate.offsetDays),
        )
      )
        continue;
      if (result.createdCount >= limit) {
        result.hasMore = true;
        break;
      }
      const current = facts(snapshot, candidate.kind, candidate.id, candidate.offsetDays);
      if (current.blocked) {
        result.skippedCount++;
        continue;
      }
      if (candidate.kind === 'reminder') {
        const older = all(
          "SELECT * FROM comms_messages WHERE kind='reminder' AND documentId=?",
          candidate.id,
        );
        if (older.some((message) => ['sending', 'uncertain'].includes(message.status))) {
          result.skippedCount++;
          continue;
        }
        for (const old of older.filter(
          (message) =>
            message.offsetDays < candidate.offsetDays &&
            ['draft', 'queued', 'blocked', 'failed'].includes(message.status),
        )) {
          revise(old, {
            status: 'cancelled',
            blockReason: 'Superseded by the latest reminder date.',
          });
          event(actor, 'communication.superseded', old.id, { offsetDays: candidate.offsetDays });
          result.supersededCount++;
        }
      }
      const { row } = create(actor, snapshot, candidate.kind, candidate.id, {
        source: 'automation',
        offsetDays: candidate.offsetDays ?? null,
        autoApprove: config.mode === 'automatic',
      });
      result.createdCount++;
      result.queuedCount += Number(row.status === 'queued');
      result.messageIds.push(row.id);
    }
    if (!quiet || result.createdCount || result.supersededCount)
      event(actor, 'communication.prepare', null, result);
    return result;
  }
  function dispatch(actor, snapshot, type, payload) {
    if (type === 'communication.create') {
      const kind = choice(payload.kind, kinds),
        id = text(payload.documentId, 'Document ID', { max: 100 });
      return publicMessage(create(actor, snapshot, kind, id).row);
    }
    if (type === 'communication.settings') {
      const old = settings();
      revision(old, payload.expectedRevision);
      if (
        !Array.isArray(payload.reminderOffsets) ||
        payload.reminderOffsets.length > 12 ||
        new Set(payload.reminderOffsets).size !== payload.reminderOffsets.length
      )
        fail('INVALID_REMINDERS', 'Choose up to 12 distinct reminder offsets.');
      const offsets = payload.reminderOffsets
        .map((offset) => integer(offset, 'Reminder offset', -90, 365))
        .sort((a, b) => a - b);
      const value = {
        automaticInvoices: bool(payload.automaticInvoices),
        automaticReceipts: bool(payload.automaticReceipts),
        remindersEnabled: bool(payload.remindersEnabled),
        reminderOffsets: offsets,
        mode: choice(payload.mode, ['review', 'automatic']),
        startDate: validDate(payload.startDate, 'Automation start date'),
      };
      if (value.remindersEnabled && !offsets.length)
        fail('INVALID_REMINDERS', 'Choose at least one reminder date before enabling reminders.');
      run('UPDATE comms_settings SET revision=?,data=? WHERE id=1', old.revision + 1, json(value));
      event(actor, type, null, { before: old, after: { ...value, revision: old.revision + 1 } });
      return settings();
    }
    if (type === 'communication.hold') {
      const accountId = text(payload.accountId, 'Account ID', { max: 100 });
      if (!snapshot.state.accounts.some((account) => account.id === accountId))
        fail('NOT_FOUND', 'The account does not exist.', 404);
      const paused = bool(payload.paused),
        reason = text(payload.reason, 'Hold reason', { max: 1000, multiline: true }),
        old = hold(accountId);
      run(
        'INSERT INTO comms_holds VALUES(?,?,?,?,?,?) ON CONFLICT(accountId) DO UPDATE SET paused=excluded.paused,reason=excluded.reason,revision=excluded.revision,updatedAt=excluded.updatedAt,actorId=excluded.actorId',
        accountId,
        Number(paused),
        reason,
        (old?.revision ?? 0) + 1,
        now(),
        actor.id,
      );
      event(actor, type, null, { accountId, paused, reason });
      return { ...hold(accountId), paused };
    }
    if (type === 'communication.prepare') return prepare(actor, snapshot, payload);
    const row = get(payload.id);
    revision(row, payload.expectedRevision);
    if (type === 'communication.resend') {
      allowedStatus(row, ['accepted', 'cancelled']);
      const reason = text(payload.reason, 'Resend reason', { max: 1000, multiline: true });
      const clone = create(actor, snapshot, row.kind, row.documentId, {
        parentMessageId: row.id,
        offsetDays: row.offsetDays,
        keyOverride: `resend:${row.id}:${uid()}`,
      }).row;
      event(actor, type, clone.id, { parentMessageId: row.id, reason });
      return publicMessage(clone);
    }
    if (type === 'communication.resolve') {
      allowedStatus(row, ['uncertain']);
      const outcome = choice(payload.outcome, ['accepted', 'not_sent']);
      const reason = text(payload.reason, 'Resolution reason', { max: 1000, multiline: true });
      const evidence = text(payload.evidence, 'Verified provider evidence', {
        max: 2000,
        multiline: true,
      });
      const providerId = text(payload.providerId, 'Provider identifier', {
        optional: outcome !== 'accepted',
        max: 200,
      });
      if (!row.currentAttemptId)
        fail('ATTEMPT_MISSING', 'The uncertain message has no recorded delivery attempt.', 409);
      const resolution = {
        id: uid(),
        messageId: row.id,
        attemptId: row.currentAttemptId,
        outcome,
        providerId,
        reason,
        evidence,
        actorId: actor.id,
        actorName: actor.name,
        resolvedAt: now(),
      };
      insert('resolutions', resolution);
      const resolved = revise(row, {
        status: outcome === 'accepted' ? 'accepted' : 'failed',
        providerId,
        acceptedAt: outcome === 'accepted' ? now() : null,
        errorCode: outcome === 'accepted' ? '' : 'MANUALLY_VERIFIED_NOT_SENT',
      });
      event(actor, type, row.id, {
        resolutionId: resolution.id,
        outcome,
        providerId,
        reason,
        evidence,
      });
      return publicMessage(resolved);
    }
    if (type === 'communication.update') {
      allowedStatus(row, ['draft']);
      const updated = revise(row, {
        subject: text(payload.subject, 'Subject', { max: 200 }),
        body: text(payload.body, 'Message body', { max: 12000, multiline: true }),
      });
      event(actor, type, row.id);
      return publicMessage(updated);
    }
    if (type === 'communication.refresh') {
      allowedStatus(row, ['draft', 'blocked', 'failed']);
      if (row.status !== 'draft') role(actor, 'finance');
      const current = facts(snapshot, row.kind, row.documentId, row.offsetDays);
      if (current.blocked) return publicMessage(block(actor, row, current.blocked));
      const updated = revise(row, {
        ...materialize(current, row.kind),
        status: 'draft',
        approvedFingerprint: null,
        autoApproved: 0,
        approvedBy: null,
        approvedAt: null,
        blockReason: '',
        errorCode: '',
      });
      event(actor, type, row.id);
      return publicMessage(updated);
    }
    if (type === 'communication.approve') {
      allowedStatus(row, ['draft']);
      const checked = recheck(actor, snapshot, row, { approval: true });
      if (checked.blocked) return publicMessage(checked.blocked);
      const updated = revise(row, {
        status: 'queued',
        approvedFingerprint: row.fingerprint,
        autoApproved: 0,
        approvedBy: actor.id,
        approvedAt: now(),
        blockReason: '',
        errorCode: '',
      });
      event(actor, type, row.id);
      return publicMessage(updated);
    }
    if (type === 'communication.cancel') {
      allowedStatus(row, ['draft', 'queued', 'blocked', 'failed']);
      if (row.status !== 'draft') role(actor, 'finance');
      const reason = text(payload.reason, 'Cancellation reason', { max: 1000, multiline: true });
      const updated = revise(row, { status: 'cancelled', blockReason: reason });
      event(actor, type, row.id, { reason });
      return publicMessage(updated);
    }
    if (type === 'communication.retry') {
      allowedStatus(row, ['failed']);
      const reason = text(payload.reason, 'Retry reason', { max: 1000, multiline: true });
      const checked = recheck(actor, snapshot, row);
      if (checked.blocked) return publicMessage(checked.blocked);
      const updated = revise(row, {
        status: 'queued',
        autoApproved: 0,
        approvedBy: actor.id,
        approvedAt: now(),
        errorCode: '',
        blockReason: '',
      });
      event(actor, type, row.id, { reason });
      return publicMessage(updated);
    }
    fail('UNKNOWN_COMMAND', 'This communication command is not supported.');
  }
  function execute(actor, command, key) {
    role(actor, 'billing');
    if (!commandNames.has(command?.type))
      fail('UNKNOWN_COMMAND', 'This communication command is not supported.');
    if (financeCommands.has(command.type)) role(actor, 'finance');
    key = text(key, 'Idempotency key', { max: 200 });
    const payload = command.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      fail('INVALID_PAYLOAD', 'A communication payload object is required.');
    const requestHash = hash(command);
    return within(actor, (snapshot) => {
      const prior = one('SELECT * FROM comms_operations WHERE actorId=? AND key=?', actor.id, key);
      if (prior) {
        if (prior.requestHash !== requestHash)
          fail(
            'IDEMPOTENCY_CONFLICT',
            'This operation key was already used for different content.',
            409,
          );
        return parse(prior.response);
      }
      const result = dispatch(actor, snapshot, command.type, payload);
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
  function getState(actor) {
    role(actor);
    return within(actor, () => {
      const counts = Object.fromEntries(
        statuses.map((status) => [
          `${status}Count`,
          one('SELECT COUNT(*) AS count FROM comms_messages WHERE status=?', status).count,
        ]),
      );
      return {
        settings: settings(),
        messages: all(
          'SELECT * FROM comms_messages ORDER BY createdAt DESC,rowid DESC LIMIT 300',
        ).map(publicMessage),
        events: all('SELECT * FROM comms_events ORDER BY createdAt DESC,rowid DESC LIMIT 200').map(
          (row) => ({ ...row, details: parse(row.details) }),
        ),
        holds: all('SELECT * FROM comms_holds ORDER BY accountId').map((row) => ({
          ...row,
          paused: Boolean(row.paused),
        })),
        summary: { ...counts, totalCount: Object.values(counts).reduce((a, b) => a + b, 0) },
      };
    });
  }
  function getAttachment(actor, id) {
    role(actor);
    return within(actor, () => {
      const row = get(id);
      event(actor, 'communication.attachment_preview', row.id);
      return parse(row.snapshot);
    });
  }
  function claimNext() {
    return within(worker, (snapshot) => {
      for (const row of all(
        "SELECT * FROM comms_messages WHERE status='queued' ORDER BY createdAt,rowid LIMIT 100",
      )) {
        const checked = recheck(worker, snapshot, row);
        if (checked.blocked) continue;
        const leaseToken = randomBytes(32).toString('base64url'),
          attemptId = uid();
        const payload = {
          to: row.recipient,
          subject: row.subject,
          body: row.body,
          document: parse(row.snapshot),
        };
        insert('attempts', {
          id: attemptId,
          messageId: row.id,
          leaseHash: digest(leaseToken),
          leasedUntil: new Date(clock().getTime() + 120_000).toISOString(),
          startedAt: now(),
          payload: json(payload),
        });
        const message = revise(row, { status: 'sending', currentAttemptId: attemptId });
        event(worker, 'communication.claimed', row.id, { attemptId });
        return { message: publicMessage(message), attemptId, leaseToken, payload };
      }
      return null;
    });
  }
  function ownedAttempt(id, attemptId, leaseToken) {
    const row = get(id),
      attempt = one('SELECT * FROM comms_attempts WHERE id=?', attemptId);
    if (
      !attempt ||
      attempt.messageId !== row.id ||
      row.currentAttemptId !== attemptId ||
      !timingSafeEqual(
        Buffer.from(attempt.leaseHash, 'hex'),
        Buffer.from(digest(leaseToken), 'hex'),
      )
    )
      fail('INVALID_LEASE', 'This delivery attempt is not owned by the caller.', 409);
    return { row, attempt };
  }
  function validateClaim({ id, attemptId, leaseToken }) {
    id = text(id, 'Message ID', { max: 100 });
    attemptId = text(attemptId, 'Attempt ID', { max: 100 });
    leaseToken = text(leaseToken, 'Lease token', { max: 100 });
    return within(worker, (snapshot) => {
      const { row, attempt } = ownedAttempt(id, attemptId, leaseToken);
      if (row.status !== 'sending') return false;
      if (one('SELECT attemptId FROM comms_dispatches WHERE attemptId=?', attemptId))
        fail(
          'ATTEMPT_DISPATCHED',
          'This attempt already passed its dispatch check. Do not dispatch it twice.',
          409,
        );
      const checked = recheck(worker, snapshot, row);
      if (checked.blocked || attempt.leasedUntil <= now()) {
        if (!checked.blocked)
          block(
            worker,
            row,
            'The send lease expired before dispatch. Refresh and review this message.',
          );
        insert('results', {
          id: uid(),
          attemptId,
          outcome: 'failed',
          providerId: '',
          errorCode: 'PRE_DISPATCH_BLOCKED',
          createdAt: now(),
          attachmentSha256: '',
        });
        return false;
      }
      insert('dispatches', { attemptId, validatedAt: now() });
      event(worker, 'communication.dispatch_validated', row.id, { attemptId });
      return true;
    });
  }
  function finishAttempt({
    id,
    attemptId,
    leaseToken,
    outcome,
    providerId = '',
    errorCode = '',
    attachmentSha256 = '',
  }) {
    id = text(id, 'Message ID', { max: 100 });
    attemptId = text(attemptId, 'Attempt ID', { max: 100 });
    leaseToken = text(leaseToken, 'Lease token', { max: 100 });
    choice(outcome, ['accepted', 'failed', 'uncertain']);
    providerId = text(providerId, 'Provider identifier', {
      optional: outcome !== 'accepted',
      max: 200,
    });
    errorCode = text(errorCode, 'Provider error code', { optional: true, max: 100 });
    if (errorCode && !/^[A-Za-z0-9_.:-]+$/.test(errorCode))
      fail('INVALID_ERROR_CODE', 'Use a concise provider error code without message content.');
    if (attachmentSha256 !== '' && !/^[a-f0-9]{64}$/.test(attachmentSha256))
      fail(
        'INVALID_ATTACHMENT_HASH',
        'The attachment SHA-256 must be a lowercase hexadecimal digest.',
      );
    return within(worker, () => {
      const { row } = ownedAttempt(id, attemptId, leaseToken);
      if (one('SELECT id FROM comms_resolutions WHERE attemptId=?', attemptId))
        fail(
          'ATTEMPT_MANUALLY_RESOLVED',
          'Finance has resolved this attempt from provider evidence. A late worker response cannot change that decision.',
          409,
        );
      const previous = one(
        'SELECT * FROM comms_results WHERE attemptId=? ORDER BY rowid DESC LIMIT 1',
        attemptId,
      );
      if (
        previous &&
        previous.outcome === outcome &&
        previous.providerId === providerId &&
        previous.errorCode === errorCode &&
        previous.attachmentSha256 === attachmentSha256
      )
        return publicMessage(row);
      if (previous && previous.outcome !== 'uncertain')
        fail('ATTEMPT_FINAL', 'This delivery attempt already has a final result.', 409);
      if (!['sending', 'uncertain'].includes(row.status))
        fail('ATTEMPT_FINAL', 'This delivery attempt is no longer active.', 409);
      if (
        outcome === 'accepted' &&
        !one('SELECT attemptId FROM comms_dispatches WHERE attemptId=?', attemptId)
      )
        fail(
          'DISPATCH_NOT_VALIDATED',
          'Validate the current recipient and billing facts before provider dispatch.',
          409,
        );
      insert('results', {
        id: uid(),
        attemptId,
        outcome,
        providerId,
        errorCode,
        createdAt: now(),
        attachmentSha256,
      });
      const updated = revise(row, {
        status: outcome,
        providerId,
        errorCode,
        acceptedAt: outcome === 'accepted' ? now() : null,
      });
      event(worker, `communication.${outcome}`, row.id, { attemptId, providerId, errorCode });
      return publicMessage(updated);
    });
  }
  function recoverExpired() {
    return within(worker, () => {
      let recoveredCount = 0;
      for (const row of all(
        "SELECT m.* FROM comms_messages m JOIN comms_attempts a ON a.id=m.currentAttemptId WHERE m.status='sending' AND a.leasedUntil<=?",
        now(),
      )) {
        insert('results', {
          id: uid(),
          attemptId: row.currentAttemptId,
          outcome: 'uncertain',
          providerId: '',
          errorCode: 'LEASE_EXPIRED',
          createdAt: now(),
        });
        revise(row, { status: 'uncertain', errorCode: 'LEASE_EXPIRED' });
        event(worker, 'communication.uncertain', row.id, {
          attemptId: row.currentAttemptId,
          errorCode: 'LEASE_EXPIRED',
        });
        recoveredCount++;
      }
      return { recoveredCount };
    });
  }
  function prepareAutomatic() {
    return within(worker, (snapshot) => prepare(worker, snapshot, {}, true));
  }
  return {
    getState,
    getAttachment,
    execute,
    prepareAutomatic,
    claimNext,
    validateClaim,
    finishAttempt,
    recoverExpired,
  };
}
