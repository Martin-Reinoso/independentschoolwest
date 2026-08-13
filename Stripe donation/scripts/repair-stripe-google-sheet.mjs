import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const spreadsheetId = requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID');
const serviceAccountPath = requiredEnv('GOOGLE_SERVICE_ACCOUNT_JSON');
const privateRuntimeRoot = process.env.FFE_PRIVATE_RUNTIME_DIR || path.join(os.homedir(), 'Documents', 'random', 'ffe-private-runtime');
const backupDir = process.env.STRIPE_SHEET_BACKUP_DIR || path.join(privateRuntimeRoot, 'stripe-sheet-backups');

const PAYOUT_HEADERS = [
  'payout_date', 'payout_id', 'trace_id', 'payout_amount', 'donations_grouped_in_this_payout',
  'gross_donations_in_this_payout', 'fees_adjustments', 'net_donations_in_this_payout',
  'stripe_payout_status'
];

function requiredEnv(name) {
  const value = process.env[name] || '';
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))}`;
  const assertion = `${signingInput}.${base64Url(
    crypto.createSign('RSA-SHA256').update(signingInput).end().sign(serviceAccount.private_key)
  )}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || 'Failed to obtain Google access token.');
  }
  return payload.access_token;
}

async function sheetsRequest(token, pathname, options = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Google Sheets request failed: ${pathname}`);
  }
  return payload;
}

async function getValues(token, range, valueRenderOption = 'UNFORMATTED_VALUE') {
  const payload = await sheetsRequest(
    token,
    `/values/${encodeURIComponent(range)}?valueRenderOption=${valueRenderOption}`
  );
  return payload.values || [];
}

async function clearValues(token, range) {
  await sheetsRequest(token, `/values/${encodeURIComponent(range)}:clear`, {
    method: 'POST',
    body: '{}'
  });
}

async function updateValues(token, range, values) {
  await sheetsRequest(token, `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values })
  });
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPayoutRows(payoutRows, transactionRows) {
  const payoutOrder = [];
  const payoutById = new Map();

  for (const row of payoutRows.slice(1)) {
    const isNewSchema = String(row[1] || '').startsWith('po_');
    const payoutId = isNewSchema ? row[1] : row[0];
    if (!payoutId || payoutById.has(payoutId)) {
      continue;
    }
    payoutOrder.push(payoutId);
    payoutById.set(payoutId, {
      payoutDate: isNewSchema ? row[0] : row[1],
      traceId: isNewSchema ? row[2] : row[5],
      payoutAmount: number(isNewSchema ? row[3] : row[6]),
      status: isNewSchema ? row[8] : row[4]
    });
  }

  const transactionsByPayout = new Map();
  for (const row of transactionRows.slice(1)) {
    const payoutId = row[0];
    if (!payoutId) {
      continue;
    }
    if (!transactionsByPayout.has(payoutId)) {
      transactionsByPayout.set(payoutId, []);
    }
    transactionsByPayout.get(payoutId).push(row);
  }

  return payoutOrder.map((payoutId) => {
    const payout = payoutById.get(payoutId);
    const transactions = transactionsByPayout.get(payoutId) || [];
    const charges = transactions.filter((row) => row[10] === 'charge');
    const gross = charges.reduce((sum, row) => sum + number(row[14]), 0);
    const net = payout.payoutAmount;

    return [
      payout.payoutDate,
      payoutId,
      payout.traceId,
      payout.payoutAmount,
      charges.length,
      gross,
      gross - net,
      net,
      payout.status
    ];
  });
}

function buildDonationAccounting(donationRows, transactionRows) {
  const payoutByCharge = new Map();
  for (const row of transactionRows.slice(1)) {
    if (row[10] !== 'charge' || !row[12]) {
      continue;
    }
    payoutByCharge.set(row[12], [
      row[14], row[15], row[16],
      row[0], row[1], row[2], row[3], row[6], row[4], row[5],
      'Linked from Stripe payout transaction data.'
    ]);
  }

  return donationRows.slice(1).map((row) => payoutByCharge.get(row[13]) || [
    row[16] || '', row[17] || '', row[18] || '',
    row[19] || '', row[20] || '', row[21] || '', row[22] || '', row[23] || '', row[24] || '',
    row[25] || '', row[26] || 'Awaiting a Stripe payout.'
  ]);
}

async function main() {
  const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
  const token = await getAccessToken(serviceAccount);
  const ranges = {
    donations: 'Donations!A:AA',
    payouts: 'Payouts!A:R',
    payoutTransactions: 'Payout Transactions!A:U',
    reconciliation: 'Reconciliation!A:I',
    eventLog: 'Event Log!A:C'
  };
  const current = {};
  for (const [name, range] of Object.entries(ranges)) {
    current[name] = await getValues(token, range, 'FORMULA');
  }

  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${backupDir}/stripe-sheet-before-schema-repair-${timestamp}.json`;
  await fs.writeFile(backupPath, `${JSON.stringify(current, null, 2)}\n`, { mode: 0o600 });

  const payoutRows = buildPayoutRows(current.payouts, current.payoutTransactions);
  const donationAccounting = buildDonationAccounting(current.donations, current.payoutTransactions);

  await clearValues(token, 'Payouts!A:R');
  await updateValues(token, `Payouts!A1:I${payoutRows.length + 1}`, [PAYOUT_HEADERS, ...payoutRows]);
  if (donationAccounting.length) {
    await updateValues(token, `Donations!Q2:AA${donationAccounting.length + 1}`, donationAccounting);
  }

  await clearValues(token, 'Reconciliation!A4:I1000');
  await updateValues(token, 'Reconciliation!A4:B10', [
    ['Metric', 'Value'],
    ['Donation rows', '=COUNTA(Donations!A2:A)'],
    ['Grouped into payouts', '=COUNTIF(Donations!Y2:Y,"paid")'],
    ['Not yet grouped', '=B5-B6'],
    ['Donation gross total', '=SUM(Donations!D2:D)'],
    ['Total paid out to bank', '=SUM(Payouts!D2:D)'],
    ['Net amount in grouped payouts', '=SUM(Payouts!H2:H)']
  ]);
  await updateValues(token, 'Reconciliation!A13:I14', [
    [
      'Payout Date', 'Payout ID', 'Trace ID', 'Payout Amount', 'Donations Grouped in This Payout',
      'Gross Donations in This Payout', 'Fees / Adjustments', 'Net Donations in This Payout',
      'Stripe Payout Status'
    ],
    [
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!A2:A))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!B2:B))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!C2:C))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!D2:D))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!E2:E))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!F2:F))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!G2:G))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!H2:H))',
      '=ARRAYFORMULA(IF(Payouts!A2:A="",,Payouts!I2:I))'
    ]
  ]);

  const metadata = await sheetsRequest(token, '?fields=sheets.properties');
  const sheetIds = Object.fromEntries(metadata.sheets.map((sheet) => [sheet.properties.title, sheet.properties.sheetId]));
  await sheetsRequest(token, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: { sheetId: sheetIds.Payouts, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
            cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd mmm yyyy' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        {
          repeatCell: {
            range: { sheetId: sheetIds.Payouts, startRowIndex: 1, startColumnIndex: 3, endColumnIndex: 8 },
            cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'A$#,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        {
          repeatCell: {
            range: { sheetId: sheetIds.Payouts, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 5 },
            cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '0' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId: sheetIds.Payouts, dimension: 'COLUMNS', startIndex: 0, endIndex: 9 }
          }
        },
        {
          repeatCell: {
            range: { sheetId: sheetIds.Donations, startRowIndex: 1, startColumnIndex: 20, endColumnIndex: 21 },
            cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd mmm yyyy' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        {
          repeatCell: {
            range: { sheetId: sheetIds.Donations, startRowIndex: 1, startColumnIndex: 21, endColumnIndex: 22 },
            cell: { userEnteredFormat: { numberFormat: { type: 'TIME', pattern: 'hh:mm:ss' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        {
          repeatCell: {
            range: { sheetId: sheetIds.Donations, startRowIndex: 1, startColumnIndex: 22, endColumnIndex: 23 },
            cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'dd mmm yyyy' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        {
          repeatCell: {
            range: { sheetId: sheetIds.Donations, startRowIndex: 1, startColumnIndex: 16, endColumnIndex: 19 },
            cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'A$#,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        {
          repeatCell: {
            range: { sheetId: sheetIds.Donations, startRowIndex: 1, startColumnIndex: 23, endColumnIndex: 24 },
            cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'A$#,##0.00' } } },
            fields: 'userEnteredFormat.numberFormat'
          }
        }
      ]
    })
  });

  const repairedPayouts = await getValues(token, 'Payouts!A:I');
  const repairedDonations = await getValues(token, 'Donations!A:AA');
  const repairedReconciliation = await getValues(token, 'Reconciliation!A4:I30');
  if (JSON.stringify(repairedPayouts[0]) !== JSON.stringify(PAYOUT_HEADERS)) {
    throw new Error('Payout header verification failed after repair.');
  }

  console.log(JSON.stringify({
    backupPath,
    payouts: repairedPayouts.length - 1,
    donations: repairedDonations.length - 1,
    linkedDonations: repairedDonations.slice(1).filter((row) => row[24] === 'paid').length,
    reconciliationRows: repairedReconciliation.length
  }, null, 2));
}

await main();
