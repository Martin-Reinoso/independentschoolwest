import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const spreadsheetId = requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID');
const dataDir = process.env.STRIPE_RECON_DATA_DIR || '.codex-temp/stripe-recon/data';

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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((candidate) => !(candidate.length === 1 && candidate[0] === ''));
}

async function loadCsv(name) {
  const text = await fs.readFile(`${dataDir}/${name}.csv`, 'utf8');
  return parseCsv(text);
}

async function main() {
  const serviceAccount = await loadServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const datasets = {
    'Donations!A1:AA': await loadCsv('donations'),
    'Payouts!A1:R': await loadCsv('payouts'),
    'Payout Transactions!A1:U': await loadCsv('payout_transactions')
  };

  for (const [range, values] of Object.entries(datasets)) {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ range, majorDimension: 'ROWS', values })
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || `Failed to write ${range}.`);
    }
  }

  console.log(`Backfill complete from ${dataDir}`);
}

await main();
