import { createHash } from 'node:crypto';

const decimal = (cents) =>
  `${cents < 0 ? '-' : ''}${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;
const unsafe = (value) => /^[\s\uFEFF]*[=+\-@]/u.test(String(value));
const error = (code, message) => Object.assign(new Error(message), { status: 400, code });
const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csvOf = (rows) =>
  '\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
const humanCell = (value) => (unsafe(value) ? `'${value}` : value);
function exactCell(value, label) {
  const result = String(value ?? '').trim();
  if (unsafe(result) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(result))
    throw error(
      'UNSAFE_EXPORT_TEXT',
      `${label} contains text unsafe for accounting import. Correct the source or mapping and retry.`,
    );
  return result;
}
function auDate(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value || '') ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw error('EXPORT_DATE_INVALID', 'An invoice has an invalid date; inspect it before export.');
  return value.split('-').reverse().join('/');
}
function manifest(kind, state, invoices, csv, rows, exclusions = []) {
  return {
    kind,
    asAt: state.today,
    currency: 'AUD',
    mappingRevision: state.settings.revision,
    invoiceIds: invoices.map((i) => i.id),
    invoices: invoices.map((i) => ({ id: i.id, number: i.number, revision: i.revision })),
    rowCount: rows,
    documentCount: invoices.length,
    netCents: invoices.reduce((sum, i) => sum + i.totalCents - i.taxCents, 0),
    taxCents: invoices.reduce((sum, i) => sum + i.taxCents, 0),
    grossCents: invoices.reduce((sum, i) => sum + i.totalCents, 0),
    sha256: createHash('sha256').update(csv).digest('hex'),
    exclusions,
    note:
      kind === 'xero'
        ? 'Original invoice draft export only. This is not a completed import, bank reconciliation or current-debt synchronisation. Validate the AU tenant template and tax/account mappings in a Xero Demo Company. Credits and voids require separate accounting review.'
        : 'Current fee receivables only. Pending funds, unapplied credit and bonds are separate balances in the portal.',
  };
}

export function buildReceivablesCsv(state) {
  const invoices = state.invoices.filter((i) => i.status !== 'draft');
  const accounts = new Map(state.accounts.map((a) => [a.id, a]));
  const rows = [
    [
      'Invoice',
      'Account',
      'Payer',
      'Issue date',
      'Due date',
      'Document state',
      'Settlement',
      'Overdue',
      'Original AUD',
      'GST AUD',
      'Credits AUD',
      'Applied AUD',
      'Outstanding AUD',
    ],
  ];
  for (const i of invoices) {
    const a = i.accountSnapshot || accounts.get(i.accountId) || {};
    rows.push(
      [
        i.number,
        a.code || '',
        a.billingName || a.name || '',
        i.issueDate,
        i.dueDate,
        i.status,
        i.settlementStatus,
        i.overdue ? 'Yes' : 'No',
        decimal(i.totalCents),
        decimal(i.taxCents),
        decimal(i.creditedCents),
        decimal(i.paidCents),
        decimal(i.balanceCents),
      ].map(humanCell),
    );
  }
  const csv = csvOf(rows);
  return { csv, metadata: manifest('receivables', state, invoices, csv, invoices.length) };
}

/** A deliberately reviewable draft-import candidate; no Xero network access. */
export function buildXeroCsv(state) {
  const mappings = state.settings.xeroTaxMappings || {};
  const accounts = new Map(state.accounts.map((account) => [account.id, account]));
  const mappedContacts = new Map();
  // Check the entire current account register, including accounts absent from
  // this particular file. Otherwise two different export runs could merge payers.
  for (const account of state.accounts) {
    const contact = exactCell(account.xeroContactName, 'Xero contact name');
    if (!contact) continue;
    const key = contact.normalize('NFKC').toLocaleLowerCase('en-AU');
    if (mappedContacts.has(key) && mappedContacts.get(key) !== account.id)
      throw error(
        'EXPORT_CONTACT_COLLISION',
        'Two billing accounts map to the same Xero contact name. Resolve the payer mappings before export.',
      );
    mappedContacts.set(key, account.id);
  }
  const excluded = state.invoices
    .filter((i) => i.status !== 'issued' || i.creditedCents > 0)
    .map((i) => ({
      id: i.id,
      number: i.number || i.id,
      reason:
        i.status === 'draft'
          ? 'Draft not issued'
          : i.status === 'void'
            ? 'Void - review accounting correction separately'
            : 'Credit notes exist - review accounting correction separately',
    }));
  const invoices = state.invoices.filter((i) => i.status === 'issued' && !i.creditedCents);
  if (!invoices.length)
    throw error(
      'NOTHING_TO_EXPORT',
      'No issued invoices without credit adjustments are available for this draft export.',
    );
  const rows = [
    [
      '*ContactName',
      'EmailAddress',
      'POAddressLine1',
      '*InvoiceNumber',
      'Reference',
      '*InvoiceDate',
      '*DueDate',
      '*Description',
      '*Quantity',
      '*UnitAmount',
      '*AccountCode',
      '*TaxType',
      'Currency',
    ],
  ];
  for (const invoice of invoices) {
    const account = invoice.accountSnapshot || {};
    // Accounting identity is a current explicit adapter mapping, independent of the
    // immutable payer display name printed on the original invoice.
    const contact = exactCell(
      accounts.get(invoice.accountId)?.xeroContactName,
      'Xero contact name',
    );
    if (!contact)
      throw error(
        'EXPORT_MAPPING_REQUIRED',
        'Set the exact Xero contact name on every billing account before exporting its invoices.',
      );
    for (const item of invoice.lines) {
      const mapped = mappings[item.taxCode];
      const taxName = exactCell(
        typeof mapped === 'string' ? mapped : mapped?.name || '',
        `Tax mapping for ${item.taxCode}`,
      );
      const accountCode = exactCell(item.accountCode, 'Account code');
      if (!taxName || !accountCode)
        throw error(
          'EXPORT_MAPPING_REQUIRED',
          'Set a Xero tax display name for every tax code and an accounting code on every invoice line before export.',
        );
      const description = exactCell(
        [
          item.description,
          item.studentName,
          item.quantity !== 1 || item.discountCents
            ? `Original quantity ${item.quantity}, unit AUD ${decimal(item.unitCents)}, total discount AUD ${decimal(item.discountCents)}; exported as one net line`
            : '',
        ]
          .filter(Boolean)
          .join(' - '),
        'Invoice description',
      );
      // Export the exact discounted extended net as quantity 1. Dividing an absolute
      // discount across several units could introduce rounding drift in Xero.
      const net = item.totalCents - item.taxCents;
      if (!Number.isSafeInteger(net) || net < 0)
        throw error('EXPORT_AMOUNT_INVALID', 'Invoice line totals cannot be exported.');
      rows.push([
        contact,
        exactCell(account.email, 'Payer email'),
        exactCell(account.address, 'Payer address'),
        invoice.number,
        exactCell(
          [account.code, invoice.year, invoice.term].filter(Boolean).join(' / '),
          'Invoice reference',
        ),
        auDate(invoice.issueDate),
        auDate(invoice.dueDate),
        description,
        '1',
        decimal(net),
        accountCode,
        taxName,
        'AUD',
      ]);
    }
  }
  const csv = csvOf(rows);
  const metadata = manifest('xero', state, invoices, csv, rows.length - 1, excluded);
  metadata.contactMappings = [...new Set(invoices.map((i) => i.accountId))].map((accountId) => ({
    accountId,
    accountRevision: accounts.get(accountId).revision,
    xeroContactName: exactCell(accounts.get(accountId).xeroContactName, 'Xero contact name'),
  }));
  return { csv, metadata };
}
