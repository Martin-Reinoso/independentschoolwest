import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { renderDocument } from '../src/documents.mjs';

const settings = {
  schoolName: 'Rosewood College',
  legalName: 'Synthetic School Operator',
  demoMode: true,
  gstRegistered: true,
  abn: '',
  address: 'Synthetic school address',
  email: 'accounts@example.test',
  paymentInstructions: 'Sample instructions only. No payment is requested.',
};
const account = {
  id: 'a1',
  code: 'SYN001',
  billingName: 'Synthetic García family',
  address: 'A synthetic postal address',
  email: 'synthetic@example.test',
  balanceCents: 10100,
  unallocatedCents: 0,
  pendingCents: 5000,
  bondHeldCents: 200000,
};
const item = {
  id: 'l1',
  description: 'Synthetic tuition',
  studentName: 'Synthetic Zoë',
  quantity: 1,
  unitCents: 10000,
  discountCents: 0,
  taxCode: 'GST_FREE',
  taxCents: 0,
  totalCents: 10000,
};
const invoice = {
  id: 'i1',
  number: 'RWC-INV-000001',
  status: 'issued',
  issuedAt: '2026-09-12T01:00:00Z',
  issueDate: '2026-09-12',
  dueDate: '2026-09-26',
  year: '2027',
  term: 'Term 1',
  lines: [
    item,
    {
      ...item,
      id: 'l2',
      description: 'Synthetic materials',
      unitCents: 1000,
      taxCode: 'GST_10',
      taxCents: 100,
      totalCents: 1100,
    },
  ],
  subtotalCents: 11000,
  discountCents: 0,
  totalCents: 11100,
  taxCents: 100,
  creditedCents: 0,
  paidCents: 1000,
  balanceCents: 10100,
  accountSnapshot: account,
  sellerSnapshot: settings,
};
const base = { settings, account, generatedAt: '2026-09-12T02:00:00Z', today: '2026-09-12' };
function extract(buffer) {
  const result = spawnSync('pdftotext', ['-layout', '-', '-'], {
    input: buffer,
    maxBuffer: 2_000_000,
  });
  if (result.error?.code === 'ENOENT')
    throw new Error(
      'PDF verification requires Poppler (pdftotext). Install it before running document tests.',
    );
  assert.equal(result.status, 0, result.stderr?.toString());
  return result.stdout.toString();
}
test('invoice PDF contains frozen identity, accented names, tax, total and explicit sample boundary', async () => {
  const pdf = await renderDocument({ ...base, kind: 'invoice', document: invoice });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const text = extract(pdf);
  for (const value of [
    'Tax invoice',
    'RWC-INV-000001',
    'García',
    'Zoë',
    '$111.00',
    '$1.00',
    'SAMPLE DOCUMENT',
    '26/09/2026',
    'Invoice total',
  ])
    assert.ok(text.includes(value), value);
  assert.ok(!text.includes('Xero'));
  assert.equal(
    text.split('\f').filter((page) => page.trim()).length,
    1,
    'a one-page invoice must not acquire blank footer pages',
  );
});
test('long multi-page invoice keeps every line, total and page numbers', async () => {
  const lines = Array.from({ length: 45 }, (_, i) => ({
    ...item,
    id: `l${i}`,
    description: `Item ${String(i + 1).padStart(2, '0')} - ${'A clear detailed description of synthetic educational charges. '.repeat(2)}`,
  }));
  const pdf = await renderDocument({
    ...base,
    kind: 'invoice',
    document: { ...invoice, lines, subtotalCents: 450000, taxCents: 0, totalCents: 450000 },
  });
  const text = extract(pdf);
  for (let i = 1; i <= 45; i++)
    assert.ok(text.includes(`Item ${String(i).padStart(2, '0')}`), `missing line ${i}`);
  assert.ok(text.includes('$4,500.00'));
  assert.match(text, /2\s*\/\s*\d/);
});
test('receipt clearly distinguishes confirmed funds, unallocated money, reversal and later refund', async () => {
  const receipt = {
    id: 'r1',
    number: 'RWC-RCT-000001',
    issuedAt: invoice.issuedAt,
    reversed: true,
    snapshot: {
      accountSnapshot: account,
      sellerSnapshot: settings,
      amountCents: 5000,
      paidOn: '2026-09-12',
      method: 'bank_transfer',
      purpose: 'fees',
      reference: 'SYN-TRANSFER-1',
      allocations: [{ invoiceNumber: invoice.number, amountCents: 3000 }],
      unallocatedCents: 2000,
    },
  };
  const text = extract(
    await renderDocument({
      ...base,
      kind: 'receipt',
      document: receipt,
      refunds: [{ paidOn: '2026-09-12', reference: 'SYN-REFUND-1', amountCents: 1000 }],
    }),
  );
  for (const value of [
    'REVERSED PAYMENT',
    '$50.00',
    '$30.00',
    '$20.00',
    '$10.00',
    'SYN-REFUND-1',
    'partial payment',
  ])
    assert.ok(text.includes(value), value);
});
test('bond receipt and credit note cannot be mistaken for tuition settlement or new cash', async () => {
  const receipt = {
    number: 'RWC-RCT-000002',
    issuedAt: invoice.issuedAt,
    snapshot: {
      accountSnapshot: account,
      sellerSnapshot: settings,
      amountCents: 200000,
      purpose: 'bond',
      method: 'bank_transfer',
      reference: 'SYN-BOND-1',
      paidOn: '2026-09-12',
    },
  };
  const receiptText = extract(
    await renderDocument({ ...base, kind: 'receipt', document: receipt }),
  );
  assert.ok(receiptText.includes('refundable family bond'));
  assert.ok(receiptText.includes('not been applied to tuition'));
  const creditText = extract(
    await renderDocument({
      ...base,
      kind: 'credit',
      document: {
        number: 'RWC-CN-000001',
        issuedAt: invoice.issuedAt,
        invoiceNumber: invoice.number,
        amountCents: 1000,
        taxCents: 0,
        reason: 'Synthetic adjustment',
        lines: [{ description: 'Tuition correction', amountCents: 1000, taxCents: 0 }],
        snapshot: {
          accountSnapshot: account,
          sellerSnapshot: settings,
          invoiceNumber: invoice.number,
        },
      },
    }),
  );
  assert.ok(creditText.includes('not a receipt of money'));
  assert.ok(creditText.includes('Tuition correction'));
});
test('statement has separately labelled pending funds, unapplied credit and bonds', async () => {
  const text = extract(
    await renderDocument({
      ...base,
      kind: 'statement',
      document: account,
      invoices: [invoice],
      payments: [],
      credits: [],
      refunds: [],
    }),
  );
  for (const value of [
    'Account statement',
    'Outstanding fees',
    'Pending verification',
    'Refundable bonds held',
    '$101.00',
    '$50.00',
    '$2,000.00',
    'not a new invoice',
  ])
    assert.ok(text.includes(value), value);
});
test('unsupported glyphs produce an actionable failure instead of a corrupted name', async () => {
  await assert.rejects(
    renderDocument({
      ...base,
      kind: 'invoice',
      document: { ...invoice, accountSnapshot: { ...account, billingName: 'Synthetic 漢字' } },
    }),
    (e) => e.code === 'DOCUMENT_UNSUPPORTED_TEXT',
  );
});

test('long immutable addresses and credit reasons paginate without losing text or colliding with footers', async () => {
  const longAccount = {
    ...account,
    address: Array.from({ length: 150 }, (_, i) => `Address${i}`).join('\n'),
  };
  const reason = Array.from({ length: 120 }, (_, i) => `Reason${i}`).join('\n');
  for (const kind of ['invoice', 'credit', 'statement']) {
    const credit = {
      number: 'RWC-CN-000001',
      issuedAt: '2026-09-12T15:30:00Z',
      invoiceNumber: invoice.number,
      amountCents: 1000,
      taxCents: 0,
      reason,
      lines: [{ description: 'Tuition adjustment', amountCents: 1000, taxCents: 0 }],
      snapshot: {
        accountSnapshot: longAccount,
        sellerSnapshot: settings,
        invoiceNumber: invoice.number,
      },
    };
    const payload = {
      ...base,
      kind,
      account: longAccount,
      document:
        kind === 'invoice'
          ? { ...invoice, accountSnapshot: longAccount }
          : kind === 'credit'
            ? credit
            : longAccount,
      invoices: [invoice],
      credits: [credit],
      payments: [],
      refunds: [],
    };
    const pdf = await renderDocument(payload);
    const plain = extract(pdf);
    for (let i = 0; i < 150; i++) assert.ok(plain.includes(`Address${i}`), `${kind} address ${i}`);
    if (kind !== 'invoice') {
      for (let i = 0; i < 120; i++) assert.ok(plain.includes(`Reason${i}`), `${kind} reason ${i}`);
      assert.ok(plain.includes('13/09/2026'), 'timestamp uses Melbourne calendar day');
    }
    const boxes = spawnSync('pdftotext', ['-bbox', '-', '-'], {
      input: pdf,
      maxBuffer: 5_000_000,
    }).stdout.toString();
    for (const match of boxes.matchAll(
      /<word[^>]*yMax="([\d.]+)"[^>]*>(Address\d+|Reason\d+)<\/word>/g,
    )) {
      assert.ok(Number(match[1]) < 758, `${kind} ${match[2]} overlaps footer at ${match[1]}`);
    }
    assert.ok(plain.split('\f').filter((page) => page.trim()).length >= 4);
  }
});
