import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const PORT = Number(process.env.PORT || 8787);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_RESTRICTED_KEY || '';
const RETURN_URL = process.env.RETURN_URL || 'https://ffe.org.au/donate.html';
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'null,http://localhost,http://127.0.0.1,https://ffe.org.au')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const PRICE_MAP = {
  oneTime: {
    20: 'price_1TVXGcPJukgoPLm77XhWQ2ol',
    50: 'price_1TVVxxPJukgoPLm7fKxukt8F',
    100: 'price_1TVVxyPJukgoPLm7agy3WbnR',
    250: 'price_1TVXGdPJukgoPLm72lBdV7QK',
    500: 'price_1TVVxzPJukgoPLm7SWAu3TDb'
  },
  monthly: {
    20: 'price_1TVXGePJukgoPLm7EFc36Nbq',
    50: 'price_1TVVy0PJukgoPLm7SBXcVCRN',
    100: 'price_1TVVy1PJukgoPLm7eoRywgNa',
    250: 'price_1TVXGfPJukgoPLm7tlLWqX9E',
    500: 'price_1TVVy3PJukgoPLm7I8ADfmQJ'
  }
};

const execFileAsync = promisify(execFile);

function jsonResponse(statusCode, payload, origin) {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
      'Access-Control-Allow-Origin': origin,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      Vary: 'Origin'
    }
  });
}

function textResponse(statusCode, body, origin) {
  return new Response(body, {
    status: statusCode,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
      'Access-Control-Allow-Origin': origin,
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      Vary: 'Origin'
    }
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';

    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 10000) {
        reject(new Error('Request body is too large.'));
      }
    });

    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    request.on('error', reject);
  });
}

function resolveOrigin(requestOrigin) {
  if (!requestOrigin) {
    return 'null';
  }

  if (ALLOWED_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

function appendCustomFields(params) {
  params.set('custom_fields[0][key]', 'first_name');
  params.set('custom_fields[0][label][type]', 'custom');
  params.set('custom_fields[0][label][custom]', 'First name');
  params.set('custom_fields[0][type]', 'text');
  params.set('custom_fields[0][text][minimum_length]', '1');
  params.set('custom_fields[0][text][maximum_length]', '60');

  params.set('custom_fields[1][key]', 'last_name');
  params.set('custom_fields[1][label][type]', 'custom');
  params.set('custom_fields[1][label][custom]', 'Last name');
  params.set('custom_fields[1][type]', 'text');
  params.set('custom_fields[1][text][minimum_length]', '1');
  params.set('custom_fields[1][text][maximum_length]', '60');

  params.set('custom_fields[2][key]', 'message');
  params.set('custom_fields[2][label][type]', 'custom');
  params.set('custom_fields[2][label][custom]', 'Message');
  params.set('custom_fields[2][type]', 'text');
  params.set('custom_fields[2][optional]', 'true');
  params.set('custom_fields[2][text][maximum_length]', '255');
}

function buildSessionParams({ mode, amount }) {
  const params = new URLSearchParams();
  const isMonthly = mode === 'monthly';

  params.set('mode', isMonthly ? 'subscription' : 'payment');
  params.set('ui_mode', 'embedded_page');
  params.set('return_url', RETURN_URL);
  params.set('redirect_on_completion', 'if_required');
  params.set('payment_method_types[0]', 'card');
  params.set('billing_address_collection', 'auto');
  params.set('metadata[donation_mode]', mode);
  params.set('metadata[donation_amount_aud]', String(amount));
  appendCustomFields(params);

  if (isMonthly) {
    params.set('line_items[0][price]', PRICE_MAP.monthly[amount]);
    params.set('line_items[0][quantity]', '1');
    params.set('subscription_data[metadata][donation_mode]', mode);
    params.set('subscription_data[metadata][donation_amount_aud]', String(amount));
    return params;
  }

  params.set('customer_creation', 'always');
  params.set('invoice_creation[enabled]', 'true');
  params.set('invoice_creation[invoice_data][footer]', 'Thank you for supporting Families for Education.');
  params.set('payment_intent_data[metadata][donation_mode]', mode);
  params.set('payment_intent_data[metadata][donation_amount_aud]', String(amount));
  params.set('payment_intent_data[description]', `Families for Education ${amount} AUD one-time donation`);

  if (PRICE_MAP.oneTime[amount]) {
    params.set('line_items[0][price]', PRICE_MAP.oneTime[amount]);
  } else {
    params.set('line_items[0][price_data][currency]', 'aud');
    params.set('line_items[0][price_data][product_data][name]', 'Families for Education One-time Gift');
    params.set('line_items[0][price_data][product_data][description]', 'Custom family gift supporting Families for Education.');
    params.set('line_items[0][price_data][unit_amount]', String(amount * 100));
  }

  params.set('line_items[0][quantity]', '1');
  return params;
}

async function createCheckoutSession(payload) {
  const { amount, mode } = payload || {};
  const normalizedAmount = Number.parseInt(amount, 10);
  const normalizedMode = mode === 'one_time' ? 'oneTime' : mode;

  if (normalizedMode !== 'oneTime' && normalizedMode !== 'monthly') {
    throw new Error('Donation mode must be oneTime or monthly.');
  }

  if (!Number.isInteger(normalizedAmount) || normalizedAmount < 1) {
    throw new Error('Donation amount must be a whole-dollar value of at least A$1.');
  }

  if (normalizedMode === 'monthly' && !PRICE_MAP.monthly[normalizedAmount]) {
    throw new Error('Monthly donations currently support A$20, A$50, A$100, A$250, or A$500.');
  }

  const sessionParams = buildSessionParams({
    amount: normalizedAmount,
    mode: normalizedMode
  });

  if (STRIPE_SECRET_KEY.startsWith('sk_')) {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: sessionParams.toString()
    });

    const stripePayload = await response.json();

    if (!response.ok || !stripePayload.client_secret) {
      const message = stripePayload?.error?.message || 'Stripe could not create the checkout session.';
      throw new Error(message);
    }

    return {
      clientSecret: stripePayload.client_secret
    };
  }

  const cliArgs = ['post', '/v1/checkout/sessions', '--live', '--confirm'];
  for (const [key, value] of sessionParams.entries()) {
    cliArgs.push('-d', `${key}=${value}`);
  }

  const { stdout } = await execFileAsync('stripe', cliArgs, {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024
  });
  const stripePayload = JSON.parse(stdout);

  if (stripePayload?.error?.message) {
    throw new Error(stripePayload.error.message);
  }

  if (!stripePayload.client_secret) {
    throw new Error('Stripe CLI did not return an embedded checkout client secret.');
  }

  return {
    clientSecret: stripePayload.client_secret
  };
}

const server = createServer(async (request, response) => {
  const origin = resolveOrigin(request.headers.origin);

  if (request.method === 'OPTIONS') {
    const preflightOrigin = origin || 'null';
    const preflight = textResponse(204, '', preflightOrigin);
    response.writeHead(preflight.status, Object.fromEntries(preflight.headers.entries()));
    response.end();
    return;
  }

  if (!origin) {
    const forbidden = jsonResponse(403, { error: 'Origin not allowed.' }, 'null');
    response.writeHead(forbidden.status, Object.fromEntries(forbidden.headers.entries()));
    response.end(await forbidden.text());
    return;
  }

  if (request.method === 'GET' && request.url === '/') {
    const help = textResponse(200, `Stripe embedded checkout server is running on port ${PORT}. POST donation details to /create-checkout-session.`, origin);
    response.writeHead(help.status, Object.fromEntries(help.headers.entries()));
    response.end(await help.text());
    return;
  }

  if (request.method !== 'POST' || request.url !== '/create-checkout-session') {
    const notFound = jsonResponse(404, { error: 'Not found.' }, origin);
    response.writeHead(notFound.status, Object.fromEntries(notFound.headers.entries()));
    response.end(await notFound.text());
    return;
  }

  try {
    const payload = await readJsonBody(request);
    const result = await createCheckoutSession(payload);
    const success = jsonResponse(200, result, origin);
    response.writeHead(success.status, Object.fromEntries(success.headers.entries()));
    response.end(await success.text());
  } catch (error) {
    const failure = jsonResponse(400, { error: error.message || 'Unable to create checkout session.' }, origin);
    response.writeHead(failure.status, Object.fromEntries(failure.headers.entries()));
    response.end(await failure.text());
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Stripe embedded checkout server listening on http://127.0.0.1:${PORT}`);
});
