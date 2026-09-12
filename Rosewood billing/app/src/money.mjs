/** Money is integer AUD cents. BigInt intermediates avoid floating-point rounding. */
export const MAX_CENTS = 1_000_000_000_000;
export class BillingError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.status = status;
  }
}
export function fail(code, message, status = 400) {
  throw new BillingError(code, message, status);
}
export function integer(value, label, min = 0, max = MAX_CENTS) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail('INVALID_AMOUNT', `${label} must be a whole number between ${min} and ${max}.`);
  return value;
}
export function sum(values) {
  return integer(
    values.reduce((a, b) => a + b, 0),
    'Total',
  );
}
export function proportional(numerator, multiplier, denominator) {
  integer(numerator, 'Numerator');
  integer(multiplier, 'Multiplier');
  integer(denominator, 'Denominator', 1);
  return Number(
    (BigInt(numerator) * BigInt(multiplier) * 2n + BigInt(denominator)) /
      (2n * BigInt(denominator)),
  );
}
export function priceLine(line) {
  const quantity = integer(line.quantity, 'Quantity', 1, 10_000);
  const unitCents = integer(line.unitCents, 'Unit amount');
  const subtotalCents = integer(quantity * unitCents, 'Line subtotal');
  const discountCents = integer(line.discountCents ?? 0, 'Discount', 0, subtotalCents);
  const netCents = subtotalCents - discountCents;
  const taxCents = line.taxCode === 'GST_10' ? proportional(netCents, 1, 10) : 0;
  return {
    quantity,
    unitCents,
    subtotalCents,
    discountCents,
    netCents,
    taxCents,
    totalCents: sum([netCents, taxCents]),
  };
}
export function validDate(value, label = 'Date') {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '1900-01-01' ||
    value > '2200-12-31'
  )
    fail('INVALID_DATE', `${label} must be a calendar date (YYYY-MM-DD).`);
  const d = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value)
    fail('INVALID_DATE', `${label} is not a valid calendar date.`);
  return value;
}
export function melbourneDate(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime()))
    fail('INVALID_CLOCK', 'The server clock is invalid.', 500);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validABN(value) {
  const s = String(value ?? '').replace(/\s/g, '');
  if (!/^\d{11}$/.test(s)) return false;
  const digits = [...s].map(Number);
  digits[0]--;
  return (
    digits.reduce((v, d, i) => v + d * [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19][i], 0) % 89 === 0
  );
}
