import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_RESTRICTED_KEY || '';
const API_BASE = 'https://api.stripe.com/v1';
const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 100;
const DISPLAY_TIME_ZONE = process.env.STRIPE_EXPORT_TIME_ZONE || 'Australia/Melbourne';

function parseArgs(argv) {
  const options = {
    days: DEFAULT_DAYS,
    limit: DEFAULT_LIMIT,
    out: null,
    since: null
  };

  for (const arg of argv) {
    if (arg.startsWith('--days=')) {
      options.days = Number.parseInt(arg.slice('--days='.length), 10);
      continue;
    }

    if (arg.startsWith('--limit=')) {
      options.limit = Number.parseInt(arg.slice('--limit='.length), 10);
      continue;
    }

    if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length);
      continue;
    }

    if (arg.startsWith('--since=')) {
      options.since = arg.slice('--since='.length);
      continue;
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error('`--limit` must be a positive integer.');
  }

  if (options.since) {
    const timestamp = Date.parse(`${options.since}T00:00:00Z`);
    if (Number.isNaN(timestamp)) {
      throw new Error('`--since` must be in YYYY-MM-DD format.');
    }
  } else if (!Number.isInteger(options.days) || options.days < 1) {
    throw new Error('`--days` must be a positive integer.');
  }

  return options;
}

function cutoffUnixTimestamp(options) {
  if (options.since) {
    return Math.floor(Date.parse(`${options.since}T00:00:00Z`) / 1000);
  }

  return Math.floor(Date.now() / 1000) - (options.days * 24 * 60 * 60);
}

async function stripeRequest(endpoint, params = {}) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_RESTRICTED_KEY.');
  }

  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
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
    const message = payload?.error?.message || `Stripe request failed for ${endpoint}.`;
    throw new Error(message);
  }

  return payload;
}

async function stripeList(endpoint, params = {}, totalLimit = DEFAULT_LIMIT) {
  const items = [];
  let startingAfter = null;

  while (items.length < totalLimit) {
    const pageSize = Math.min(100, totalLimit - items.length);
    const payload = await stripeRequest(endpoint, {
      ...params,
      limit: pageSize,
      starting_after: startingAfter
    });

    items.push(...payload.data);

    if (!payload.has_more || payload.data.length === 0) {
      break;
    }

    startingAfter = payload.data[payload.data.length - 1].id;
  }

  return items;
}

async function fetchPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) {
    return null;
  }

  return stripeRequest(`/payment_intents/${paymentIntentId}`, {
    'expand[]': ['latest_charge']
  });
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

function formatTimestampParts(timestamp) {
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
    formatter.formatToParts(new Date(timestamp * 1000)).map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`
  };
}

function currencyAmount(amount, currency) {
  if (typeof amount !== 'number') {
    return '';
  }

  return (amount / 100).toFixed(2);
}

function csvEscape(value) {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function buildCsv(rows) {
  const headers = [
    'transaction_date',
    'transaction_time',
    'mode',
    'amount',
    'currency',
    'payment_status',
    'donor_email',
    'donor_name',
    'first_name',
    'last_name',
    'message',
    'invoice_id',
    'stripe_hosted_receipt_url'
  ];

  const lines = [
    headers.join(',')
  ];

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function donorName(firstName, lastName, fallbackName) {
  const combined = [firstName, lastName].filter(Boolean).join(' ').trim();
  return combined || fallbackName || '';
}

function invoiceDonationLine(invoice) {
  const lines = invoice?.lines?.data || [];
  return lines.find((line) => line?.metadata?.donation_mode === 'monthly') || null;
}

function invoiceSubscriptionId(invoice) {
  const line = invoiceDonationLine(invoice);
  return line?.parent?.subscription_item_details?.subscription || null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const since = cutoffUnixTimestamp(options);
  const outPath = options.out || path.resolve(process.cwd(), `stripe-donations-${new Date().toISOString().slice(0, 10)}.csv`);

  const subscriptionSessionCache = new Map();
  const paymentIntentCache = new Map();

  async function getSubscriptionSession(subscriptionId) {
    if (!subscriptionId) {
      return null;
    }

    if (subscriptionSessionCache.has(subscriptionId)) {
      return subscriptionSessionCache.get(subscriptionId);
    }

    const sessions = await stripeList('/checkout/sessions', {
      subscription: subscriptionId
    }, 1);

    const session = sessions[0] || null;
    subscriptionSessionCache.set(subscriptionId, session);
    return session;
  }

  const [checkoutSessions, invoices] = await Promise.all([
    stripeList('/checkout/sessions', {
      'created[gte]': since
    }, options.limit),
    stripeList('/invoices', {
      status: 'paid',
      'created[gte]': since,
      'expand[]': ['data.subscription']
    }, options.limit)
  ]);

  const oneTimeRows = checkoutSessions
    .filter((session) => session.metadata?.donation_mode === 'oneTime' && session.payment_status === 'paid')
    .map(async (session) => {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      let paymentIntent = null;

      if (paymentIntentId) {
        if (paymentIntentCache.has(paymentIntentId)) {
          paymentIntent = paymentIntentCache.get(paymentIntentId);
        } else {
          paymentIntent = await fetchPaymentIntent(paymentIntentId);
          paymentIntentCache.set(paymentIntentId, paymentIntent);
        }
      }

      const latestCharge = paymentIntent?.latest_charge;
      const fields = customFieldMap(session.custom_fields);
      const timestamp = formatTimestampParts(session.created);
      return {
        transaction_date: timestamp.date,
        transaction_time: timestamp.time,
        mode: 'oneTime',
        amount: currencyAmount(session.amount_total, session.currency),
        currency: (session.currency || '').toUpperCase(),
        payment_status: session.payment_status || '',
        donor_email: session.customer_details?.email || session.customer_email || '',
        donor_name: donorName(fields.first_name, fields.last_name, session.customer_details?.name),
        first_name: fields.first_name || '',
        last_name: fields.last_name || '',
        message: fields.message || '',
        invoice_id: session.invoice || '',
        stripe_hosted_receipt_url: latestCharge?.receipt_url || ''
      };
    });
  const resolvedOneTimeRows = await Promise.all(oneTimeRows);

  const monthlyRows = [];
  for (const invoice of invoices) {
    const donationLine = invoiceDonationLine(invoice);
    const subscriptionId = invoiceSubscriptionId(invoice);
    const subscription = subscriptionId
      ? await stripeRequest(`/subscriptions/${subscriptionId}`)
      : null;
    const isDonationSubscription = donationLine?.metadata?.donation_mode === 'monthly'
      || subscription?.metadata?.donation_mode === 'monthly';

    if (!isDonationSubscription) {
      continue;
    }

    const session = await getSubscriptionSession(subscriptionId);
    const fields = customFieldMap(session?.custom_fields);
    const timestamp = formatTimestampParts(invoice.created);

    monthlyRows.push({
      transaction_date: timestamp.date,
      transaction_time: timestamp.time,
      mode: 'monthly',
      amount: currencyAmount(invoice.amount_paid, invoice.currency),
      currency: (invoice.currency || '').toUpperCase(),
      payment_status: invoice.status || '',
      donor_email: invoice.customer_email || session?.customer_details?.email || '',
      donor_name: donorName(fields.first_name, fields.last_name, invoice.customer_name),
      first_name: fields.first_name || '',
      last_name: fields.last_name || '',
      message: fields.message || '',
      invoice_id: invoice.id,
      stripe_hosted_receipt_url: invoice.hosted_invoice_url || invoice.invoice_pdf || ''
    });
  }

  const rows = [...resolvedOneTimeRows, ...monthlyRows]
    .sort((a, b) => `${a.transaction_date} ${a.transaction_time}`.localeCompare(`${b.transaction_date} ${b.transaction_time}`));

  const csv = buildCsv(rows);
  await writeFile(outPath, csv, 'utf8');

  console.log(`Exported ${rows.length} donation transactions to ${outPath}`);
  console.log(`One-time donations: ${resolvedOneTimeRows.length}`);
  console.log(`Monthly invoice payments: ${monthlyRows.length}`);
  const cutoff = formatTimestampParts(since);
  console.log(`Cutoff: ${cutoff.date} ${cutoff.time} (${DISPLAY_TIME_ZONE})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
