import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const spreadsheetId = requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID');

function requiredEnv(name) {
  const value = process.env[name] || '';
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function loadServiceAccount() {
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if (jsonPath) {
    return JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  }

  const clientEmail = requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = requiredEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  return {
    client_email: clientEmail,
    private_key: privateKey
  };
}

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).end().sign(serviceAccount.private_key);
  const assertion = `${signingInput}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || 'Failed to obtain Google access token.');
  }
  return payload.access_token;
}

async function fetchSpreadsheet(token) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Failed to load spreadsheet metadata.');
  }
  return payload;
}

async function batchUpdate(token, requests) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Batch update failed.');
  }
  return payload;
}

async function updateValues(token, range, values) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values })
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Failed to write ${range}.`);
  }
}

async function main() {
  const serviceAccount = await loadServiceAccount();
  const token = await getAccessToken(serviceAccount);
  const spreadsheet = await fetchSpreadsheet(token);
  const existing = spreadsheet.sheets || [];
  const existingRecon = existing.find((sheet) => sheet.properties.title === 'Reconciliation');
  let sheetId;

  if (existingRecon) {
    sheetId = existingRecon.properties.sheetId;
    await batchUpdate(token, [
      { updateSheetProperties: { properties: { sheetId, index: 0 }, fields: 'index' } },
      { updateCells: { range: { sheetId }, fields: 'userEnteredValue,userEnteredFormat,note,textFormatRuns,dataValidation' } }
    ]);
  } else {
    const created = await batchUpdate(token, [{ addSheet: { properties: { title: 'Reconciliation', index: 0 } } }]);
    sheetId = created.replies[0].addSheet.properties.sheetId;
  }

  await updateValues(token, 'Reconciliation!A1:I2', [
    ['Stripe Deposit Reconciliation'],
    ['This sheet ties individual Stripe donations to grouped payouts deposited into the bank. Differences usually reflect Stripe fees, refunds, or donations that have not yet reached a payout.']
  ]);

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
      'Payout Date',
      'Payout ID',
      'Trace ID',
      'Payout Amount',
      'Donations Grouped in This Payout',
      'Gross Donations in This Payout',
      'Fees / Adjustments',
      'Net Donations in This Payout',
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

  await batchUpdate(token, [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 13 },
          tabColorStyle: { rgbColor: { red: 0.09, green: 0.21, blue: 0.36 } }
        },
        fields: 'gridProperties.frozenRowCount,tabColorStyle'
      }
    },
    { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontFamily: 'Aptos', fontSize: 20, bold: true, foregroundColor: { red: 0.09, green: 0.21, blue: 0.36 } },
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontFamily: 'Aptos', fontSize: 10, italic: true, foregroundColor: { red: 0.31, green: 0.36, blue: 0.4 } },
            wrapStrategy: 'WRAP',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(textFormat,wrapStrategy,verticalAlignment)'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.72, green: 0.8, blue: 0.89 },
            textFormat: { bold: true, fontFamily: 'Aptos', foregroundColor: { red: 0.12, green: 0.12, blue: 0.12 } },
            horizontalAlignment: 'CENTER',
            borders: {
              top: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } },
              bottom: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } },
              left: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } },
              right: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } }
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,borders)'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontFamily: 'Aptos', fontSize: 10 },
            verticalAlignment: 'MIDDLE',
            borders: {
              top: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
              bottom: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
              left: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
              right: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } }
            }
          }
        },
        fields: 'userEnteredFormat(textFormat,verticalAlignment,borders)'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 12, endRowIndex: 13, startColumnIndex: 0, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.72, green: 0.8, blue: 0.89 },
            textFormat: { bold: true, fontFamily: 'Aptos', foregroundColor: { red: 0.12, green: 0.12, blue: 0.12 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
            borders: {
              top: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } },
              bottom: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } },
              left: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } },
              right: { style: 'SOLID', color: { red: 0.72, green: 0.8, blue: 0.89 } }
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 13, startColumnIndex: 0, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontFamily: 'Aptos', fontSize: 10 },
            verticalAlignment: 'MIDDLE',
            borders: {
              top: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
              bottom: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
              left: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } },
              right: { style: 'SOLID', color: { red: 0.85, green: 0.89, blue: 0.95 } }
            }
          }
        },
        fields: 'userEnteredFormat(textFormat,verticalAlignment,borders)'
      }
    },
    { repeatCell: { range: { sheetId, startRowIndex: 4, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: { horizontalAlignment: 'RIGHT' } }, fields: 'userEnteredFormat.horizontalAlignment' } },
    { repeatCell: { range: { sheetId, startRowIndex: 4, endRowIndex: 7, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' } } }, fields: 'userEnteredFormat.numberFormat' } },
    { repeatCell: { range: { sheetId, startRowIndex: 7, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"A$"#,##0.00' } } }, fields: 'userEnteredFormat.numberFormat' } },
    { repeatCell: { range: { sheetId, startRowIndex: 13, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'd mmm yyyy' } } }, fields: 'userEnteredFormat.numberFormat' } },
    { repeatCell: { range: { sheetId, startRowIndex: 13, startColumnIndex: 3, endColumnIndex: 4 }, cell: { userEnteredFormat: { horizontalAlignment: 'RIGHT', numberFormat: { type: 'CURRENCY', pattern: '"A$"#,##0.00' } } }, fields: 'userEnteredFormat(horizontalAlignment,numberFormat)' } },
    { repeatCell: { range: { sheetId, startRowIndex: 13, startColumnIndex: 4, endColumnIndex: 5 }, cell: { userEnteredFormat: { horizontalAlignment: 'RIGHT', numberFormat: { type: 'NUMBER', pattern: '#,##0' } } }, fields: 'userEnteredFormat(horizontalAlignment,numberFormat)' } },
    { repeatCell: { range: { sheetId, startRowIndex: 13, startColumnIndex: 5, endColumnIndex: 8 }, cell: { userEnteredFormat: { horizontalAlignment: 'RIGHT', numberFormat: { type: 'CURRENCY', pattern: '"A$"#,##0.00' } } }, fields: 'userEnteredFormat(horizontalAlignment,numberFormat)' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 34 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 46 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 12, endIndex: 13 }, properties: { pixelSize: 44 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 130 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 210 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 170 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 8 }, properties: { pixelSize: 170 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 8, endIndex: 9 }, properties: { pixelSize: 170 }, fields: 'pixelSize' } }
  ]);

  console.log(JSON.stringify({ sheetId, title: 'Reconciliation', firstTab: true }, null, 2));
}

await main();
