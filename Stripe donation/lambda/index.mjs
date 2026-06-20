const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const RETURN_URL = process.env.RETURN_URL || 'https://ffe.org.au/donate.html';
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://ffe.org.au')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const PRICE_MAP = {
  oneTime: {
    1: 'price_1TVqyZPJukgoPLm7JTFXKM1S',
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

function resolveOrigin(originHeader) {
  if (!originHeader) {
    return ALLOWED_ORIGINS.values().next().value || 'https://ffe.org.au';
  }

  if (ALLOWED_ORIGINS.has(originHeader)) {
    return originHeader;
  }

  return null;
}

function response(statusCode, payload, origin, contentType = 'application/json; charset=utf-8') {
  return {
    statusCode,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': contentType
    },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload)
  };
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
  params.set('custom_fields[2][label][custom]', 'Private note for our team');
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
    if (PRICE_MAP.monthly[amount]) {
      params.set('line_items[0][price]', PRICE_MAP.monthly[amount]);
    } else {
      params.set('line_items[0][price_data][currency]', 'aud');
      params.set('line_items[0][price_data][product_data][name]', 'Families for Education Ltd Monthly Gift');
      params.set('line_items[0][price_data][product_data][description]', 'Custom monthly family gift supporting Families for Education Ltd.');
      params.set('line_items[0][price_data][recurring][interval]', 'month');
      params.set('line_items[0][price_data][unit_amount]', String(amount * 100));
    }
    params.set('line_items[0][quantity]', '1');
    params.set('subscription_data[metadata][donation_mode]', mode);
    params.set('subscription_data[metadata][donation_amount_aud]', String(amount));
    return params;
  }

  params.set('customer_creation', 'always');
  params.set('payment_intent_data[metadata][donation_mode]', mode);
  params.set('payment_intent_data[metadata][donation_amount_aud]', String(amount));
  params.set('payment_intent_data[description]', 'Donation to Families for Education Ltd — non-tax-deductible');

  if (PRICE_MAP.oneTime[amount]) {
    params.set('line_items[0][price]', PRICE_MAP.oneTime[amount]);
  } else {
    params.set('line_items[0][price_data][currency]', 'aud');
    params.set('line_items[0][price_data][product_data][name]', 'Families for Education Ltd One-time Gift');
    params.set('line_items[0][price_data][product_data][description]', 'Custom family gift supporting Families for Education Ltd.');
    params.set('line_items[0][price_data][unit_amount]', String(amount * 100));
  }

  params.set('line_items[0][quantity]', '1');
  return params;
}

async function createCheckoutSession(payload) {
  if (!STRIPE_SECRET_KEY.startsWith('sk_')) {
    throw new Error('Lambda is missing a valid STRIPE_SECRET_KEY.');
  }

  const { amount, mode } = payload || {};
  const normalizedAmount = Number.parseInt(amount, 10);
  const normalizedMode = mode === 'one_time' ? 'oneTime' : mode;

  if (normalizedMode !== 'oneTime' && normalizedMode !== 'monthly') {
    throw new Error('Donation mode must be oneTime or monthly.');
  }

  if (!Number.isInteger(normalizedAmount) || normalizedAmount < 1) {
    throw new Error('Donation amount must be a whole-dollar value of at least A$1.');
  }

  const sessionParams = buildSessionParams({
    amount: normalizedAmount,
    mode: normalizedMode
  });

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: sessionParams.toString()
  });

  const stripePayload = await stripeResponse.json();

  if (!stripeResponse.ok || !stripePayload.client_secret) {
    const message = stripePayload?.error?.message || 'Stripe could not create the checkout session.';
    throw new Error(message);
  }

  return {
    clientSecret: stripePayload.client_secret
  };
}

export async function handler(event) {
  const origin = resolveOrigin(event.headers?.origin || event.headers?.Origin);
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.rawPath || event.path || '/';

  if (!origin) {
    return response(403, { error: 'Origin not allowed.' }, 'https://ffe.org.au');
  }

  if (method === 'OPTIONS') {
    return response(204, '', origin, 'text/plain; charset=utf-8');
  }

  if (method === 'GET' && path === '/') {
    return response(200, 'Stripe embedded checkout lambda is running.', origin, 'text/plain; charset=utf-8');
  }

  if (method !== 'POST' || path !== '/create-checkout-session') {
    return response(404, { error: 'Not found.' }, origin);
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const result = await createCheckoutSession(payload);
    return response(200, result, origin);
  } catch (error) {
    return response(400, { error: error instanceof Error ? error.message : 'Unexpected error.' }, origin);
  }
}
