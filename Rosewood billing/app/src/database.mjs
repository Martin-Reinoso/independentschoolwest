import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync, lstatSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const schema = `
CREATE TABLE IF NOT EXISTS billing_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS billing_settings (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, data TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS billing_sequences (kind TEXT PRIMARY KEY, value INTEGER NOT NULL CHECK(value>0)) STRICT;
CREATE TABLE IF NOT EXISTS billing_accounts (
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, billingName TEXT NOT NULL,
 email TEXT NOT NULL, address TEXT NOT NULL, xeroContactName TEXT NOT NULL DEFAULT '', contactAllowed INTEGER NOT NULL CHECK(contactAllowed IN(0,1)),
 status TEXT NOT NULL CHECK(status IN('active','archived')), revision INTEGER NOT NULL CHECK(revision>0), createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_students (
 id TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES billing_accounts(id), name TEXT NOT NULL,
 yearLevel TEXT NOT NULL, entryYear INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN('prospective','active','inactive')),
 enrolmentReference TEXT UNIQUE, revision INTEGER NOT NULL CHECK(revision>0), createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS billing_students_account ON billing_students(accountId);
CREATE TABLE IF NOT EXISTS billing_fees (
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL, unitCents INTEGER NOT NULL CHECK(unitCents>=0),
 taxCode TEXT NOT NULL CHECK(taxCode IN('GST_FREE','GST_10','NO_GST')), category TEXT NOT NULL CHECK(category IN('tuition','levy','other')),
 accountCode TEXT NOT NULL, active INTEGER NOT NULL CHECK(active IN(0,1)), revision INTEGER NOT NULL CHECK(revision>0), createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_batches (
 id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE, label TEXT NOT NULL, year INTEGER NOT NULL, term TEXT NOT NULL,
 issueDate TEXT NOT NULL, dueDate TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN('preview','committed')),
 snapshot TEXT NOT NULL, createdAt TEXT NOT NULL, committedAt TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS billing_invoices (
 id TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES billing_accounts(id), number TEXT UNIQUE,
 status TEXT NOT NULL CHECK(status IN('draft','issued','void')), issueDate TEXT NOT NULL, dueDate TEXT NOT NULL,
 year INTEGER NOT NULL, term TEXT NOT NULL, description TEXT NOT NULL,
 subtotalCents INTEGER NOT NULL CHECK(subtotalCents>=0), discountCents INTEGER NOT NULL CHECK(discountCents>=0),
 taxCents INTEGER NOT NULL CHECK(taxCents>=0), totalCents INTEGER NOT NULL CHECK(totalCents>=0),
 revision INTEGER NOT NULL CHECK(revision>0), accountSnapshot TEXT, sellerSnapshot TEXT,
 batchId TEXT REFERENCES billing_batches(id), createdAt TEXT NOT NULL, issuedAt TEXT, voidedAt TEXT, voidReason TEXT,
 CHECK(status='draft' OR (number IS NOT NULL AND accountSnapshot IS NOT NULL AND sellerSnapshot IS NOT NULL AND issuedAt IS NOT NULL))
) STRICT;
CREATE INDEX IF NOT EXISTS billing_invoices_account ON billing_invoices(accountId);
CREATE TABLE IF NOT EXISTS billing_invoice_lines (
 id TEXT PRIMARY KEY, invoiceId TEXT NOT NULL REFERENCES billing_invoices(id), position INTEGER NOT NULL,
 studentId TEXT REFERENCES billing_students(id), studentName TEXT NOT NULL, feeId TEXT REFERENCES billing_fees(id),
 description TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0), unitCents INTEGER NOT NULL CHECK(unitCents>=0),
 discountCents INTEGER NOT NULL CHECK(discountCents>=0), taxCode TEXT NOT NULL CHECK(taxCode IN('GST_FREE','GST_10','NO_GST')),
 category TEXT NOT NULL CHECK(category IN('tuition','levy','other')), accountCode TEXT NOT NULL,
 subtotalCents INTEGER NOT NULL CHECK(subtotalCents>=0), netCents INTEGER NOT NULL CHECK(netCents>=0),
 taxCents INTEGER NOT NULL CHECK(taxCents>=0), totalCents INTEGER NOT NULL CHECK(totalCents>=0), UNIQUE(invoiceId,position)
) STRICT;
CREATE TABLE IF NOT EXISTS billing_batch_claims (
 studentId TEXT NOT NULL REFERENCES billing_students(id), feeId TEXT NOT NULL REFERENCES billing_fees(id),
 year INTEGER NOT NULL, term TEXT NOT NULL, batchId TEXT NOT NULL REFERENCES billing_batches(id),
 invoiceId TEXT NOT NULL REFERENCES billing_invoices(id), PRIMARY KEY(studentId,feeId,year,term)
) STRICT;
CREATE TABLE IF NOT EXISTS billing_payments (
 id TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES billing_accounts(id), purpose TEXT NOT NULL CHECK(purpose IN('fees','bond')),
 amountCents INTEGER NOT NULL CHECK(amountCents>0), paidOn TEXT NOT NULL, method TEXT NOT NULL CHECK(method IN('bank_transfer','cash','eftpos','other')),
 reference TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN('pending','confirmed','rejected','reversed')),
 evidence TEXT NOT NULL, evidenceKey TEXT UNIQUE, createdAt TEXT NOT NULL, confirmedAt TEXT, confirmedBy TEXT, reason TEXT NOT NULL,
 CHECK(status NOT IN('confirmed','reversed') OR (evidenceKey IS NOT NULL AND confirmedAt IS NOT NULL))
) STRICT;
CREATE INDEX IF NOT EXISTS billing_payments_account ON billing_payments(accountId);
CREATE TABLE IF NOT EXISTS billing_allocations (
 id TEXT PRIMARY KEY, paymentId TEXT NOT NULL REFERENCES billing_payments(id), invoiceId TEXT NOT NULL REFERENCES billing_invoices(id),
 amountCents INTEGER NOT NULL CHECK(amountCents>0), createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS billing_allocations_payment ON billing_allocations(paymentId);
CREATE INDEX IF NOT EXISTS billing_allocations_invoice ON billing_allocations(invoiceId);
CREATE TABLE IF NOT EXISTS billing_allocation_releases (
 id TEXT PRIMARY KEY, allocationId TEXT NOT NULL UNIQUE REFERENCES billing_allocations(id), reason TEXT NOT NULL, createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_receipts (
 id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, paymentId TEXT NOT NULL UNIQUE REFERENCES billing_payments(id),
 accountId TEXT NOT NULL REFERENCES billing_accounts(id), amountCents INTEGER NOT NULL CHECK(amountCents>0), issuedAt TEXT NOT NULL, snapshot TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_credits (
 id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, accountId TEXT NOT NULL REFERENCES billing_accounts(id),
 invoiceId TEXT NOT NULL REFERENCES billing_invoices(id), amountCents INTEGER NOT NULL CHECK(amountCents>0),
 taxCents INTEGER NOT NULL CHECK(taxCents>=0), reason TEXT NOT NULL, issuedAt TEXT NOT NULL, snapshot TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_credit_lines (
 id TEXT PRIMARY KEY, creditId TEXT NOT NULL REFERENCES billing_credits(id), invoiceLineId TEXT NOT NULL REFERENCES billing_invoice_lines(id),
 amountCents INTEGER NOT NULL CHECK(amountCents>0), taxCents INTEGER NOT NULL CHECK(taxCents>=0), UNIQUE(creditId,invoiceLineId)
) STRICT;
CREATE TABLE IF NOT EXISTS billing_refunds (
 id TEXT PRIMARY KEY, paymentId TEXT NOT NULL REFERENCES billing_payments(id), accountId TEXT NOT NULL REFERENCES billing_accounts(id),
 amountCents INTEGER NOT NULL CHECK(amountCents>0), paidOn TEXT NOT NULL, reference TEXT NOT NULL,
 reason TEXT NOT NULL, evidenceKey TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_plans (
 id TEXT PRIMARY KEY, invoiceId TEXT NOT NULL UNIQUE REFERENCES billing_invoices(id), instalments TEXT NOT NULL, createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_exports (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, metadata TEXT NOT NULL, createdAt TEXT NOT NULL, actorId TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_export_imports (
 id TEXT PRIMARY KEY, exportId TEXT NOT NULL UNIQUE REFERENCES billing_exports(id), importReference TEXT NOT NULL, reason TEXT NOT NULL, importedAt TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS billing_audit (
 id TEXT PRIMARY KEY, actorId TEXT NOT NULL, actorName TEXT NOT NULL, action TEXT NOT NULL,
 entityType TEXT NOT NULL, entityId TEXT NOT NULL, reason TEXT NOT NULL, createdAt TEXT NOT NULL, details TEXT NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS billing_audit_time ON billing_audit(createdAt);
CREATE TABLE IF NOT EXISTS billing_operations (
 actorId TEXT NOT NULL, key TEXT NOT NULL, requestHash TEXT NOT NULL, response TEXT NOT NULL, createdAt TEXT NOT NULL, PRIMARY KEY(actorId,key)
) STRICT;
`;

export function openDatabase(path) {
  if (typeof path !== 'string' || !path) throw new Error('A billing database path is required.');
  if (path !== ':memory:') {
    path = resolve(path);
    if (existsSync(path) && lstatSync(path).isSymbolicLink())
      throw new Error('Billing database must not be a symbolic link.');
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  }
  const db = new DatabaseSync(path, {
    enableForeignKeyConstraints: true,
    enableDoubleQuotedStringLiterals: false,
  });
  try {
    db.exec(
      'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;',
    );
    db.exec('BEGIN IMMEDIATE');
    db.exec(schema);
    const version = db.prepare("SELECT value FROM billing_meta WHERE key='schemaVersion'").get();
    if (version && version.value !== '1') throw new Error('Unsupported billing database schema.');
    db.prepare("INSERT OR IGNORE INTO billing_meta(key,value) VALUES('schemaVersion','1')").run();
    // Additive migration for local databases created during the first implementation.
    if (
      !db
        .prepare('PRAGMA table_info(billing_accounts)')
        .all()
        .some((column) => column.name === 'xeroContactName')
    )
      db.exec("ALTER TABLE billing_accounts ADD COLUMN xeroContactName TEXT NOT NULL DEFAULT ''");
    for (const table of [
      'allocations',
      'allocation_releases',
      'receipts',
      'credits',
      'credit_lines',
      'refunds',
      'plans',
      'exports',
      'export_imports',
      'audit',
      'operations',
      'batch_claims',
    ]) {
      for (const operation of ['UPDATE', 'DELETE'])
        db.exec(
          `CREATE TRIGGER IF NOT EXISTS billing_${table}_no_${operation.toLowerCase()} BEFORE ${operation} ON billing_${table} BEGIN SELECT RAISE(ABORT,'Immutable billing record'); END;`,
        );
    }
    db.exec(`
CREATE TRIGGER IF NOT EXISTS billing_mode_no_update BEFORE UPDATE ON billing_meta WHEN OLD.key='demoMode' BEGIN SELECT RAISE(ABORT,'Billing environment mode is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_mode_no_delete BEFORE DELETE ON billing_meta WHEN OLD.key='demoMode' BEGIN SELECT RAISE(ABORT,'Billing environment mode is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_invoice_no_delete BEFORE DELETE ON billing_invoices BEGIN SELECT RAISE(ABORT,'Invoice history is retained'); END;
CREATE TRIGGER IF NOT EXISTS billing_invoice_frozen BEFORE UPDATE ON billing_invoices WHEN OLD.status<>'draft' AND (
 NEW.status<>'void' OR OLD.status<>'issued' OR NEW.number IS NOT OLD.number OR NEW.accountId IS NOT OLD.accountId OR
 NEW.issueDate IS NOT OLD.issueDate OR NEW.dueDate IS NOT OLD.dueDate OR NEW.year IS NOT OLD.year OR NEW.term IS NOT OLD.term OR
 NEW.description IS NOT OLD.description OR NEW.subtotalCents IS NOT OLD.subtotalCents OR NEW.discountCents IS NOT OLD.discountCents OR
 NEW.taxCents IS NOT OLD.taxCents OR NEW.totalCents IS NOT OLD.totalCents OR NEW.accountSnapshot IS NOT OLD.accountSnapshot OR
 NEW.sellerSnapshot IS NOT OLD.sellerSnapshot OR NEW.createdAt IS NOT OLD.createdAt OR NEW.issuedAt IS NOT OLD.issuedAt OR NEW.batchId IS NOT OLD.batchId
) BEGIN SELECT RAISE(ABORT,'Issued invoice is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_line_frozen_update BEFORE UPDATE ON billing_invoice_lines WHEN (SELECT status FROM billing_invoices WHERE id=OLD.invoiceId)<>'draft' BEGIN SELECT RAISE(ABORT,'Issued invoice line is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_line_frozen_delete BEFORE DELETE ON billing_invoice_lines WHEN (SELECT status FROM billing_invoices WHERE id=OLD.invoiceId)<>'draft' BEGIN SELECT RAISE(ABORT,'Issued invoice line is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_line_frozen_insert BEFORE INSERT ON billing_invoice_lines WHEN (SELECT status FROM billing_invoices WHERE id=NEW.invoiceId)<>'draft' BEGIN SELECT RAISE(ABORT,'Issued invoice line is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_payment_no_delete BEFORE DELETE ON billing_payments BEGIN SELECT RAISE(ABORT,'Payment history is retained'); END;
CREATE TRIGGER IF NOT EXISTS billing_payment_frozen BEFORE UPDATE ON billing_payments WHEN OLD.status<>'pending' AND (
 OLD.status<>'confirmed' OR NEW.status<>'reversed' OR NEW.accountId IS NOT OLD.accountId OR NEW.purpose IS NOT OLD.purpose OR
 NEW.amountCents IS NOT OLD.amountCents OR NEW.paidOn IS NOT OLD.paidOn OR NEW.method IS NOT OLD.method OR NEW.reference IS NOT OLD.reference OR
 NEW.evidence IS NOT OLD.evidence OR NEW.evidenceKey IS NOT OLD.evidenceKey OR NEW.confirmedAt IS NOT OLD.confirmedAt OR NEW.confirmedBy IS NOT OLD.confirmedBy OR NEW.createdAt IS NOT OLD.createdAt
) BEGIN SELECT RAISE(ABORT,'Confirmed payment facts are immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_batch_frozen BEFORE UPDATE ON billing_batches WHEN OLD.status<>'preview' OR NEW.status<>'committed' OR NEW.snapshot IS NOT OLD.snapshot OR NEW.fingerprint IS NOT OLD.fingerprint OR NEW.label IS NOT OLD.label OR NEW.year IS NOT OLD.year OR NEW.term IS NOT OLD.term OR NEW.issueDate IS NOT OLD.issueDate OR NEW.dueDate IS NOT OLD.dueDate OR NEW.createdAt IS NOT OLD.createdAt BEGIN SELECT RAISE(ABORT,'Reviewed batch is immutable'); END;
CREATE TRIGGER IF NOT EXISTS billing_batch_no_delete BEFORE DELETE ON billing_batches BEGIN SELECT RAISE(ABORT,'Batch history is retained'); END;
`);
    db.exec('COMMIT');
    if (path !== ':memory:') chmodSync(path, 0o600);
    return db;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    db.close();
    throw error;
  }
}
