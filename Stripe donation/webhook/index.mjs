import crypto from 'node:crypto';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
const GOOGLE_SHEETS_DONATIONS_RANGE = process.env.GOOGLE_SHEETS_DONATIONS_RANGE || 'Donations!A:AA';
const GOOGLE_SHEETS_PAYOUTS_RANGE = process.env.GOOGLE_SHEETS_PAYOUTS_RANGE || 'Payouts!A:I';
const GOOGLE_SHEETS_PAYOUT_TXNS_RANGE = process.env.GOOGLE_SHEETS_PAYOUT_TXNS_RANGE || 'Payout Transactions!A:U';
const GOOGLE_SHEETS_EVENT_LOG_RANGE = process.env.GOOGLE_SHEETS_EVENT_LOG_RANGE || 'Event Log!A:C';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const DISPLAY_TIME_ZONE = process.env.DISPLAY_TIME_ZONE || 'Australia/Melbourne';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

const SHEET_HEADERS = {
  Donations: [
    'transaction_date', 'transaction_time', 'mode', 'amount', 'currency', 'payment_status', 'donor_email',
    'donor_name', 'first_name', 'last_name', 'message', 'invoice_id', 'stripe_hosted_receipt_url',
    'charge_id', 'charge_date', 'charge_time', 'gross_amount', 'stripe_fee', 'net_amount', 'payout_id',
    'payout_date', 'payout_time', 'payout_arrival_date', 'payout_amount', 'payout_status',
    'payout_trace_id', 'reconciliation_note'
  ],
  Payouts: [
    'payout_date', 'payout_id', 'trace_id', 'payout_amount', 'donations_grouped_in_this_payout',
    'gross_donations_in_this_payout', 'fees_adjustments', 'net_donations_in_this_payout',
    'stripe_payout_status'
  ],
  'Payout Transactions': [
    'payout_id', 'payout_date', 'payout_time', 'payout_arrival_date', 'payout_status', 'payout_trace_id',
    'payout_amount', 'balance_transaction_id', 'available_on_date', 'reporting_category', 'type',
    'description', 'source_id', 'source_object', 'amount', 'fee', 'net', 'currency', 'source_invoice_id',
    'source_payment_intent_id', 'source_receipt_url'
  ],
  'Event Log': ['event_id', 'event_type', 'processed_at']
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

function requiredEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function formattedDateParts(unixSeconds) {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(unixSeconds * 1000)).map((part) => [part.type, part.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`
  };
}

function amountDecimal(amountInCents) {
  if (typeof amountInCents !== 'number') {
    return '';
  }
  return (amountInCents / 100).toFixed(2);
}

function parseStripeSignature(signatureHeader) {
  const entries = signatureHeader.split(',').map((part) => part.trim());
  const parsed = {};
  for (const entry of entries) {
    const [key, value] = entry.split('=');
    if (!key || !value) {
      continue;
    }
    parsed[key] = value;
  }
  return parsed;
}

function verifyStripeWebhook(rawBody, signatureHeader) {
  requiredEnv('STRIPE_WEBHOOK_SECRET', STRIPE_WEBHOOK_SECRET);
  if (!signatureHeader) {
    throw new Error('Missing Stripe signature header.');
  }

  const parsed = parseStripeSignature(signatureHeader);
  const timestamp = Number(parsed.t);
  const providedSignature = parsed.v1;
  if (!timestamp || !providedSignature) {
    throw new Error('Invalid Stripe signature header.');
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > 300) {
    throw new Error('Stripe webhook timestamp is outside the 5-minute tolerance.');
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expected = Buffer.from(expectedSignature, 'hex');
  const provided = Buffer.from(providedSignature, 'hex');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new Error('Stripe webhook signature verification failed.');
  }
}

async function stripeRequest(pathname, params = {}) {
  requiredEnv('STRIPE_SECRET_KEY', STRIPE_SECRET_KEY);
  const url = new URL(`${STRIPE_API_BASE}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Stripe request failed for ${pathname}.`);
  }

  return payload;
}

async function getGoogleAccessToken() {
  requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', GOOGLE_SERVICE_ACCOUNT_EMAIL);
  requiredEnv('GOOGLE_PRIVATE_KEY', GOOGLE_PRIVATE_KEY);

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: issuedAt + 3600,
    iat: issuedAt
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaims = base64Url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).end().sign(GOOGLE_PRIVATE_KEY);
  const assertion = `${signingInput}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error_description || 'Failed to obtain Google Sheets access token.');
  }

  return payload.access_token;
}

async function googleSheetsGet(range) {
  requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', GOOGLE_SHEETS_SPREADSHEET_ID);
  const token = await getGoogleAccessToken();
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_SPREADSHEET_ID}/values/${encodedRange}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Failed to read Google Sheets range ${range}.`);
  }

  return payload.values || [];
}

async function googleSheetsAppend(range, rows) {
  if (!rows.length) {
    return;
  }

  requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', GOOGLE_SHEETS_SPREADSHEET_ID);
  const token = await getGoogleAccessToken();
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_SPREADSHEET_ID}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: rows
      })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Failed to append Google Sheets range ${range}.`);
  }

  return payload;
}

async function googleSheetsBatchUpdate(data) {
  if (!data.length) {
    return;
  }

  const token = await getGoogleAccessToken();
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Failed to update Google Sheets values.');
  }
}

function sheetNameFromRange(range) {
  return range.split('!')[0].replace(/^'|'$/g, '');
}

async function assertSheetSchema(range) {
  const sheetName = sheetNameFromRange(range);
  const expected = SHEET_HEADERS[sheetName];
  if (!expected) {
    throw new Error(`No schema is configured for Google Sheet tab ${sheetName}.`);
  }

  const [actual = []] = await googleSheetsGet(`${sheetName}!1:1`);
  const matches = expected.length === actual.length && expected.every((header, index) => actual[index] === header);
  if (!matches) {
    throw new Error(
      `Google Sheet schema mismatch in ${sheetName}. Expected ${expected.length} columns; refusing to write.`
    );
  }
}

async function hasProcessedEvent(eventId) {
  const values = await googleSheetsGet(GOOGLE_SHEETS_EVENT_LOG_RANGE);
  return values.some((row) => row[0] === eventId);
}

async function markEventProcessed(event) {
  const now = new Date().toISOString();
  await googleSheetsAppend(GOOGLE_SHEETS_EVENT_LOG_RANGE, [[event.id, event.type, now]]);
}

function customFieldMap(customFields = []) {
  const mapped = {};
  for (const field of customFields) {
    if (!field?.key) {
      continue;
    }
    mapped[field.key] = field.text?.value || field.dropdown?.value || '';
  }
  return mapped;
}

async function fetchCheckoutSession(sessionId) {
  return stripeRequest(`/checkout/sessions/${sessionId}`, {
    'expand[]': ['payment_intent.latest_charge.balance_transaction', 'subscription']
  });
}

async function fetchInvoice(invoiceId) {
  return stripeRequest(`/invoices/${invoiceId}`);
}

async function fetchChargesForInvoice(invoiceId) {
  const payload = await stripeRequest('/charges', {
    invoice: invoiceId,
    limit: 10,
    'expand[]': ['data.balance_transaction']
  });
  return payload.data || [];
}

async function fetchPayoutTransactions(payoutId) {
  const transactions = [];
  let startingAfter = '';

  do {
    const payload = await stripeRequest('/balance_transactions', {
      payout: payoutId,
      limit: 100,
      starting_after: startingAfter,
      'expand[]': ['data.source']
    });
    const page = payload.data || [];
    transactions.push(...page);
    startingAfter = payload.has_more && page.length ? page[page.length - 1].id : '';
  } while (startingAfter);

  return transactions;
}

function donationRowFromSession(session) {
  const timestamp = formattedDateParts(session.created);
  const fields = customFieldMap(session.custom_fields);
  const charge = session.payment_intent?.latest_charge || null;
  const chargeBalance = charge?.balance_transaction || null;

  return [
    timestamp.date,
    timestamp.time,
    session.metadata?.donation_mode || (session.mode === 'subscription' ? 'monthly' : 'oneTime'),
    amountDecimal(session.amount_total),
    (session.currency || '').toUpperCase(),
    session.payment_status || '',
    session.customer_details?.email || session.customer_email || '',
    session.customer_details?.name || [fields.first_name, fields.last_name].filter(Boolean).join(' ').trim(),
    fields.first_name || '',
    fields.last_name || '',
    fields.message || '',
    session.invoice || '',
    charge?.receipt_url || '',
    charge?.id || '',
    charge ? formattedDateParts(charge.created).date : '',
    charge ? formattedDateParts(charge.created).time : '',
    amountDecimal(charge?.amount),
    amountDecimal(chargeBalance?.fee),
    amountDecimal(chargeBalance?.net),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Inserted automatically from Stripe webhook'
  ];
}

function donationRowFromInvoice(invoice, charge, session) {
  const timestamp = formattedDateParts(invoice.created);
  const fields = customFieldMap(session?.custom_fields || []);
  const chargeBalance = charge?.balance_transaction || null;

  return [
    timestamp.date,
    timestamp.time,
    'monthly',
    amountDecimal(invoice.amount_paid),
    (invoice.currency || '').toUpperCase(),
    invoice.status || '',
    invoice.customer_email || session?.customer_details?.email || '',
    invoice.customer_name || [fields.first_name, fields.last_name].filter(Boolean).join(' ').trim(),
    fields.first_name || '',
    fields.last_name || '',
    fields.message || '',
    invoice.id,
    charge?.receipt_url || invoice.hosted_invoice_url || invoice.invoice_pdf || '',
    charge?.id || '',
    charge ? formattedDateParts(charge.created).date : '',
    charge ? formattedDateParts(charge.created).time : '',
    amountDecimal(charge?.amount),
    amountDecimal(chargeBalance?.fee),
    amountDecimal(chargeBalance?.net),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Inserted automatically from Stripe webhook'
  ];
}

function payoutSummaryRow(payout, transactions) {
  const created = formattedDateParts(payout.created);
  const chargeTransactions = transactions.filter((txn) => txn.type === 'charge');
  const grossTotal = chargeTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const netTotal = payout.amount;

  return [
    created.date,
    payout.id,
    payout.trace_id?.value || '',
    amountDecimal(payout.amount),
    String(chargeTransactions.length),
    amountDecimal(grossTotal),
    amountDecimal(grossTotal - netTotal),
    amountDecimal(netTotal),
    payout.status || ''
  ];
}

function payoutTransactionRows(payout, transactions) {
  const payoutCreated = formattedDateParts(payout.created);
  return transactions.map((txn) => [
    payout.id,
    payoutCreated.date,
    payoutCreated.time,
    payout.arrival_date ? formattedDateParts(payout.arrival_date).date : '',
    payout.status || '',
    payout.trace_id?.value || '',
    amountDecimal(payout.amount),
    txn.id,
    txn.available_on ? formattedDateParts(txn.available_on).date : '',
    txn.reporting_category || '',
    txn.type || '',
    txn.description || '',
    typeof txn.source === 'object' ? txn.source?.id || '' : txn.source || '',
    typeof txn.source === 'object' ? txn.source?.object || '' : '',
    amountDecimal(txn.amount),
    amountDecimal(txn.fee),
    amountDecimal(txn.net),
    (txn.currency || '').toUpperCase(),
    typeof txn.source === 'object' ? txn.source?.invoice || '' : '',
    typeof txn.source === 'object' ? txn.source?.payment_intent || '' : '',
    typeof txn.source === 'object' ? txn.source?.receipt_url || '' : ''
  ]);
}

async function sendSlackDonationMessage({ donorName, firstName, lastName, amount, message, mode }) {
  if (!SLACK_WEBHOOK_URL) {
    return;
  }

  const lines = [
    '*New donation received*',
    `Name: ${donorName || [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown donor'}`,
    `Amount: A$${amount}`,
    `Type: ${mode === 'monthly' ? 'Monthly' : 'One-time'}`
  ];

  if (message) {
    lines.push(`Message: ${message}`);
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: lines.join('\n')
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack webhook failed: ${text}`);
  }
}

async function handleCheckoutCompleted(eventObject) {
  if (eventObject.mode !== 'payment' || eventObject.payment_status !== 'paid') {
    return { skipped: true, reason: 'Checkout session is not a paid one-time donation.' };
  }

  const session = await fetchCheckoutSession(eventObject.id);
  const row = donationRowFromSession(session);
  await assertSheetSchema(GOOGLE_SHEETS_DONATIONS_RANGE);
  const donationRows = await googleSheetsGet(GOOGLE_SHEETS_DONATIONS_RANGE);
  const alreadyInserted = donationRows.slice(1).some((existing) =>
    (row[13] && existing[13] === row[13]) || (row[11] && existing[11] === row[11])
  );
  if (alreadyInserted) {
    return { skipped: true, reason: 'Donation already exists.', sessionId: session.id };
  }
  await googleSheetsAppend(GOOGLE_SHEETS_DONATIONS_RANGE, [row]);
  await sendSlackDonationMessage({
    donorName: row[7],
    firstName: row[8],
    lastName: row[9],
    amount: row[3],
    message: row[10],
    mode: row[2]
  });

  return { inserted: 'donation', sessionId: session.id };
}

async function handleInvoicePaid(eventObject) {
  const invoice = eventObject;
  const subscriptionMetadata = invoice.parent?.subscription_details?.metadata || {};
  if (subscriptionMetadata.donation_mode !== 'monthly') {
    return { skipped: true, reason: 'Invoice is not a monthly donation payment.' };
  }

  let session = null;
  try {
    const sessionsPayload = await stripeRequest('/checkout/sessions', {
      subscription: invoice.parent?.subscription_details?.subscription || '',
      limit: 1
    });
    session = sessionsPayload.data?.[0] || null;
  } catch {
    session = null;
  }

  const charges = await fetchChargesForInvoice(invoice.id);
  const charge = charges.find((item) => item.paid && item.captured) || charges[0] || null;
  const row = donationRowFromInvoice(invoice, charge, session);
  await assertSheetSchema(GOOGLE_SHEETS_DONATIONS_RANGE);
  const donationRows = await googleSheetsGet(GOOGLE_SHEETS_DONATIONS_RANGE);
  const alreadyInserted = donationRows.slice(1).some((existing) =>
    (row[13] && existing[13] === row[13]) || (row[11] && existing[11] === row[11])
  );
  if (alreadyInserted) {
    return { skipped: true, reason: 'Donation already exists.', invoiceId: invoice.id };
  }
  await googleSheetsAppend(GOOGLE_SHEETS_DONATIONS_RANGE, [row]);
  await sendSlackDonationMessage({
    donorName: row[7],
    firstName: row[8],
    lastName: row[9],
    amount: row[3],
    message: row[10],
    mode: row[2]
  });

  return { inserted: 'monthly_donation', invoiceId: invoice.id };
}

async function handlePayoutPaid(eventObject) {
  const payout = eventObject;
  const transactions = await fetchPayoutTransactions(payout.id);
  const payoutRow = payoutSummaryRow(payout, transactions);
  const transactionRows = payoutTransactionRows(payout, transactions);

  await assertSheetSchema(GOOGLE_SHEETS_PAYOUTS_RANGE);
  await assertSheetSchema(GOOGLE_SHEETS_PAYOUT_TXNS_RANGE);
  await assertSheetSchema(GOOGLE_SHEETS_DONATIONS_RANGE);

  const existingPayouts = await googleSheetsGet(GOOGLE_SHEETS_PAYOUTS_RANGE);
  if (!existingPayouts.slice(1).some((row) => row[1] === payout.id)) {
    await googleSheetsAppend(GOOGLE_SHEETS_PAYOUTS_RANGE, [payoutRow]);
  }

  const existingTransactions = await googleSheetsGet(GOOGLE_SHEETS_PAYOUT_TXNS_RANGE);
  const existingTransactionIds = new Set(existingTransactions.slice(1).map((row) => row[7]).filter(Boolean));
  const newTransactionRows = transactionRows.filter((row) => !existingTransactionIds.has(row[7]));
  await googleSheetsAppend(GOOGLE_SHEETS_PAYOUT_TXNS_RANGE, newTransactionRows);

  const donationRows = await googleSheetsGet(GOOGLE_SHEETS_DONATIONS_RANGE);
  const transactionByChargeId = new Map(
    transactions
      .filter((txn) => txn.type === 'charge')
      .map((txn) => [typeof txn.source === 'object' ? txn.source?.id : txn.source, txn])
      .filter(([chargeId]) => chargeId)
  );
  const payoutCreated = formattedDateParts(payout.created);
  const donationUpdates = [];
  donationRows.slice(1).forEach((row, index) => {
    const transaction = transactionByChargeId.get(row[13]);
    if (!transaction) {
      return;
    }
    donationUpdates.push({
      range: `Donations!Q${index + 2}:AA${index + 2}`,
      majorDimension: 'ROWS',
      values: [[
        amountDecimal(transaction.amount),
        amountDecimal(transaction.fee),
        amountDecimal(transaction.net),
        payout.id,
        payoutCreated.date,
        payoutCreated.time,
        payout.arrival_date ? formattedDateParts(payout.arrival_date).date : '',
        amountDecimal(payout.amount),
        payout.status || '',
        payout.trace_id?.value || '',
        'Linked automatically from Stripe payout webhook'
      ]]
    });
  });
  await googleSheetsBatchUpdate(donationUpdates);

  return {
    inserted: 'payout',
    payoutId: payout.id,
    transactionCount: newTransactionRows.length,
    linkedDonationCount: donationUpdates.length
  };
}

export async function handler(event) {
  try {
    requiredEnv('STRIPE_SECRET_KEY', STRIPE_SECRET_KEY);
    requiredEnv('STRIPE_WEBHOOK_SECRET', STRIPE_WEBHOOK_SECRET);
    requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', GOOGLE_SERVICE_ACCOUNT_EMAIL);
    requiredEnv('GOOGLE_PRIVATE_KEY', GOOGLE_PRIVATE_KEY);
    requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID', GOOGLE_SHEETS_SPREADSHEET_ID);

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';
    const signatureHeader = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'];

    verifyStripeWebhook(rawBody, signatureHeader);
    const stripeEvent = JSON.parse(rawBody);

    await assertSheetSchema(GOOGLE_SHEETS_EVENT_LOG_RANGE);
    if (await hasProcessedEvent(stripeEvent.id)) {
      return jsonResponse(200, { ok: true, duplicate: true, eventId: stripeEvent.id });
    }

    let result = { skipped: true, reason: 'Unhandled event type.' };
    if (stripeEvent.type === 'checkout.session.completed') {
      result = await handleCheckoutCompleted(stripeEvent.data.object);
    } else if (stripeEvent.type === 'invoice.paid') {
      result = await handleInvoicePaid(stripeEvent.data.object);
    } else if (stripeEvent.type === 'payout.paid') {
      result = await handlePayoutPaid(stripeEvent.data.object);
    }

    await markEventProcessed(stripeEvent);
    return jsonResponse(200, { ok: true, eventType: stripeEvent.type, result });
  } catch (error) {
    return jsonResponse(400, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected webhook error.'
    });
  }
}
