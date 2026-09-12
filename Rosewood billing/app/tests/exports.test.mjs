import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildReceivablesCsv, buildXeroCsv } from '../src/exports.mjs';

function state() {
  return {
    today: '2026-09-12',
    settings: {
      revision: 1,
      xeroTaxMappings: { GST_FREE: 'GST Free Income', GST_10: 'GST on Income' },
    },
    accounts: [{ id: 'a1', xeroContactName: 'Synthetic Family [A001]' }],
    invoices: [
      {
        id: 'i1',
        number: 'RWC-INV-000001',
        revision: 2,
        accountId: 'a1',
        status: 'issued',
        settlementStatus: 'part_paid',
        overdue: false,
        accountSnapshot: {
          code: 'A001',
          billingName: 'Synthetic Family',
          email: 'synthetic@example.test',
          address: 'Synthetic address',
        },
        issueDate: '2026-09-12',
        dueDate: '2026-09-26',
        year: '2027',
        term: 'Term 1',
        subtotalCents: 999,
        discountCents: 1,
        taxCents: 100,
        totalCents: 1098,
        creditedCents: 0,
        paidCents: 100,
        balanceCents: 998,
        lines: [
          {
            id: 'l1',
            description: 'Supplies, "sample"',
            studentName: 'Synthetic Child',
            quantity: 3,
            unitCents: 333,
            discountCents: 1,
            taxCode: 'GST_10',
            accountCode: '200',
            totalCents: 1098,
            taxCents: 100,
          },
        ],
      },
    ],
  };
}
test('Xero draft export preserves discounted net cents, AU dates, stable number and manifest hash', () => {
  const input = state();
  const { csv, metadata } = buildXeroCsv(input);
  assert.match(csv, /"12\/09\/2026","26\/09\/2026"/);
  assert.match(csv, /"1","9.98","200","GST on Income","AUD"/);
  assert.match(csv, /Supplies, ""sample""/);
  assert.equal(metadata.sha256, createHash('sha256').update(csv).digest('hex'));
  assert.equal(metadata.grossCents, 1098);
  assert.equal(metadata.taxCents, 100);
  assert.equal(metadata.documentCount, 1);
  assert.equal(metadata.rowCount, 1);
  assert.deepEqual(buildXeroCsv(input), { csv, metadata });
});
test('Xero requires exact mappings and rejects formula-like contact/account/tax text', () => {
  for (const mutate of [
    (s) => (s.settings.xeroTaxMappings = {}),
    (s) => (s.invoices[0].lines[0].accountCode = ''),
    (s) => (s.accounts[0].xeroContactName = ' \t=HYPERLINK("bad")'),
    (s) => (s.invoices[0].lines[0].accountCode = '+200'),
    (s) => (s.settings.xeroTaxMappings.GST_10 = '@formula'),
  ]) {
    const input = state();
    mutate(input);
    assert.throws(
      () => buildXeroCsv(input),
      (e) => e.status === 400,
    );
  }
});
test('Xero rejects ambiguous or missing external payer mappings rather than merging families', () => {
  const input = state();
  input.accounts.push({ id: 'a2', xeroContactName: 'synthetic family [A001]' });
  assert.throws(
    () => buildXeroCsv(input),
    (e) => e.code === 'EXPORT_CONTACT_COLLISION',
    'collision must fail even without another included invoice',
  );
  input.invoices.push({
    ...structuredClone(input.invoices[0]),
    id: 'i2',
    number: 'RWC-INV-000002',
    accountId: 'a2',
  });
  assert.throws(
    () => buildXeroCsv(input),
    (e) => e.code === 'EXPORT_CONTACT_COLLISION',
  );
  input.accounts[1].xeroContactName = '';
  assert.throws(
    () => buildXeroCsv(input),
    (e) => e.code === 'EXPORT_MAPPING_REQUIRED',
  );
  input.accounts[1].xeroContactName = 'Synthetic Family [A002]';
  assert.equal(buildXeroCsv(input).metadata.documentCount, 2);
  assert.equal(
    buildXeroCsv(input).metadata.contactMappings[1].xeroContactName,
    'Synthetic Family [A002]',
  );
});
test('Xero excludes and explains drafts, voids and credited invoices without exporting their debt as new invoices', () => {
  const input = state();
  for (const [id, status, creditedCents] of [
    ['draft', 'draft', 0],
    ['void', 'void', 0],
    ['credit', 'issued', 20],
  ])
    input.invoices.push({
      ...structuredClone(input.invoices[0]),
      id,
      number: id,
      status,
      creditedCents,
    });
  const { metadata } = buildXeroCsv(input);
  assert.deepEqual(metadata.invoiceIds, ['i1']);
  assert.equal(metadata.exclusions.length, 3);
});
test('human receivables protects CSV formulas, while money remains exact', () => {
  const input = state();
  input.invoices[0].accountSnapshot.billingName = '=CMD()';
  const { csv } = buildReceivablesCsv(input);
  assert.match(csv, /"'=CMD\(\)"/);
  assert.match(csv, /"10.98","1.00","0.00","1.00","9.98"/);
});
