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

async function main() {
  const serviceAccount = await loadServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const meta = await metaResponse.json();
  if (!metaResponse.ok) {
    throw new Error(meta.error?.message || 'Failed to load spreadsheet metadata.');
  }

  const existing = new Set((meta.sheets || []).map((sheet) => sheet.properties.title));
  const wanted = ['Donations', 'Payouts', 'Payout Transactions', 'Event Log'];
  const addRequests = wanted
    .filter((title) => !existing.has(title))
    .map((title) => ({ addSheet: { properties: { title } } }));

  if (addRequests.length) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ requests: addRequests })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || 'Failed to add sheets.');
    }
  }

  const values = {
    'Donations!A1:AA1': [[
      'transaction_date', 'transaction_time', 'mode', 'amount', 'currency', 'payment_status', 'donor_email',
      'donor_name', 'first_name', 'last_name', 'message', 'invoice_id', 'stripe_hosted_receipt_url',
      'charge_id', 'charge_date', 'charge_time', 'gross_amount', 'stripe_fee', 'net_amount', 'payout_id',
      'payout_date', 'payout_time', 'payout_arrival_date', 'payout_amount', 'payout_status',
      'payout_trace_id', 'reconciliation_note'
    ]],
    'Payouts!A1:I1': [[
      'payout_date', 'payout_id', 'trace_id', 'payout_amount', 'donations_grouped_in_this_payout',
      'gross_donations_in_this_payout', 'fees_adjustments', 'net_donations_in_this_payout',
      'stripe_payout_status'
    ]],
    'Payout Transactions!A1:U1': [[
      'payout_id', 'payout_date', 'payout_time', 'payout_arrival_date', 'payout_status', 'payout_trace_id',
      'payout_amount', 'balance_transaction_id', 'available_on_date', 'reporting_category', 'type',
      'description', 'source_id', 'source_object', 'amount', 'fee', 'net', 'currency', 'source_invoice_id',
      'source_payment_intent_id', 'source_receipt_url'
    ]],
    'Event Log!A1:C1': [[
      'event_id', 'event_type', 'processed_at'
    ]]
  };

  for (const [range, rows] of Object.entries(values)) {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ range, majorDimension: 'ROWS', values: rows })
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || `Failed to write ${range}.`);
    }
  }

  console.log('Stripe Google Sheet tabs initialized.');
}

await main();
