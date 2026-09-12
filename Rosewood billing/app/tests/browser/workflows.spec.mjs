import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function login(page, role = 'admin') {
  await page.goto('/');
  await page.getByLabel(/^Email address\s*\*?$/).fill(`${role}@example.test`);
  await page.getByLabel(/^Password\s*\*?$/).fill(process.env.BILLING_BROWSER_PASSWORD);
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page.getByRole('heading', { name: 'Billing overview' })).toBeVisible();
}
async function state(page) {
  return page.evaluate(async () => (await fetch('/api/state')).json());
}
async function nav(page, name) {
  await page
    .locator('nav')
    .getByRole('button', {
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+\\d+)?$`),
    })
    .click();
}
const modal = (page) => page.getByRole('dialog');
const errorsFor = (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('401') && !m.text().includes('403'))
      errors.push(m.text());
  });
  return errors;
};

test('staff overview and all workspaces render with live data and no script/CSP errors', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = errorsFor(page),
    violations = [];
  await login(page);
  for (const name of [
    'Accounts',
    'Students',
    'Invoices',
    'Payments & receipts',
    'Payment plans',
    'Billing runs',
    'Fee catalogue',
    'Reports & exports',
    'Activity log',
    'Settings',
    'Overview',
  ]) {
    await nav(page, name);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('#notice.error')).toHaveCount(0);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    violations.push(
      ...result.violations.map((v) => ({
        screen: name,
        id: v.id,
        count: v.nodes.length,
        nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    );
  }
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('create account, prospective student, draft invoice, issue, verify partial payment and download receipt', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Accounts');
  await page
    .getByRole('button', { name: /New account|Create account|Create billing account/ })
    .first()
    .click();
  await modal(page)
    .getByLabel(/^Account name\s*\*?$/)
    .fill('Synthetic Browser Family');
  await modal(page)
    .getByLabel(/^Name on invoices\s*\*?$/)
    .fill('Synthetic Browser Payer');
  await modal(page)
    .getByLabel(/^Billing email\s*\*?$/)
    .fill('browser-family@example.test');
  await modal(page)
    .getByLabel(/^Billing address\s*\*?$/)
    .fill('1 Synthetic Lane, Sample VIC 3000');
  await modal(page)
    .getByLabel(/^Xero contact name/)
    .fill('Synthetic Browser exact contact');
  await modal(page).getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Synthetic Browser Family', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Add student/ })
    .first()
    .click();
  await modal(page)
    .getByLabel(/^Student name\s*\*?$/)
    .fill('Synthetic Browser Child');
  await modal(page)
    .getByLabel(/^Intended year level\s*\*?$/)
    .fill('Foundation');
  await modal(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await page.getByRole('button', { name: 'New invoice', exact: true }).first().click();
  await modal(page)
    .getByLabel(/^Term \/ period\s*\*?$/)
    .fill('Browser test term');
  await modal(page)
    .getByLabel(/^Description\s*\*?$/)
    .fill('Synthetic browser tuition');
  await modal(page)
    .getByLabel(/^Unit AUD\s*\*?$/)
    .fill('123.45');
  await modal(page)
    .getByLabel(/^Accounting code/)
    .fill('200');
  await modal(page)
    .getByLabel(/^Student\s*\*?$/)
    .selectOption({ label: 'Synthetic Browser Child' });
  await modal(page).getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await page.getByRole('button', { name: 'Issue invoice', exact: true }).click();
  await modal(page).getByRole('button', { name: 'Issue invoice', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  let snapshot = await state(page);
  const invoice = snapshot.invoices.find(
    (i) =>
      i.description === '' && i.lines.some((l) => l.description === 'Synthetic browser tuition'),
  );
  expect(invoice.status).toBe('issued');
  expect(invoice.totalCents).toBe(12345);
  await page.getByRole('button', { name: 'Record payment', exact: true }).first().click();
  await modal(page)
    .getByLabel(/Amount.*AUD|Payment amount/, { exact: false })
    .fill('40.00');
  await modal(page)
    .getByLabel(/^Unique transaction reference\s*\*?$/)
    .fill('SYNTHETIC-BROWSER-TRANSFER');
  await modal(page).getByRole('button', { name: 'Record for verification', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  snapshot = await state(page);
  expect(snapshot.invoices.find((i) => i.id === invoice.id).balanceCents).toBe(12345);
  const payment = snapshot.payments.find((p) => p.reference === 'SYNTHETIC-BROWSER-TRANSFER');
  expect(payment.receiptId).toBeNull();
  await page
    .getByRole('button', { name: /Verify payment|Verify received payment/ })
    .first()
    .click();
  await modal(page)
    .getByLabel(/^Verification evidence\s*\*?$/)
    .fill('Synthetic statement entry independently checked.');
  await modal(page).locator('[data-invoice-allocation]').first().fill('40.00');
  await modal(page).getByRole('button', { name: 'Confirm receipt of funds', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  snapshot = await state(page);
  expect(snapshot.invoices.find((i) => i.id === invoice.id).balanceCents).toBe(8345);
  expect(snapshot.receipts.some((r) => r.paymentId === payment.id)).toBeTruthy();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Receipt PDF' }).first().click();
  expect((await downloaded).suggestedFilename()).toMatch(/\.pdf$/);
});

test('viewer can inspect records and PDF, while direct write and export attempts fail', async ({
  page,
}) => {
  await login(page, 'viewer');
  await expect(page.getByRole('button', { name: 'New invoice', exact: true })).toHaveCount(0);
  const response = await page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json();
    const mutation = await fetch('/api/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.csrfToken,
        'Idempotency-Key': 'synthetic-viewer-write',
      },
      body: JSON.stringify({ type: 'account.create', payload: { name: 'Forbidden' } }),
    });
    const report = await fetch('/api/exports/receivables.csv');
    return { mutation: mutation.status, report: report.status };
  });
  expect(response).toEqual({ mutation: 403, report: 403 });
  await nav(page, 'Invoices');
  await expect(page.locator('table tbody tr').first()).toBeVisible();
});

test('mobile navigation and dialogs fit a narrow screen and keyboard focus is restored', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await nav(page, 'Accounts');
  await page
    .getByRole('button', { name: /New account|Create account|Create billing account/ })
    .first()
    .click();
  await expect(modal(page)).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(modal(page)).not.toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON');
});

async function command(page, type, payload) {
  return page.evaluate(
    async ({ type, payload }) => {
      const session = await (await fetch('/api/session')).json();
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': session.csrfToken,
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ type, payload }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(`${response.status}: ${body.message}`);
      return body.result;
    },
    { type, payload },
  );
}
async function fixture(page, name, totalCents = 10000) {
  const snapshot = await state(page);
  const account = await command(page, 'account.create', {
    name: `Synthetic ${name}`,
    billingName: `Synthetic ${name} payer`,
    email: 'synthetic@example.test',
    address: '1 Synthetic Lane, Sample VIC 3000',
    contactAllowed: false,
    xeroContactName: `Synthetic ${name} exact contact`,
  });
  const invoice = await command(page, 'invoice.create', {
    accountId: account.id,
    issueDate: snapshot.today,
    dueDate: snapshot.today,
    year: Number(snapshot.today.slice(0, 4)),
    term: `${name} term`,
    description: `Synthetic ${name} tuition`,
    lines: [
      {
        description: `Synthetic ${name} fee`,
        quantity: 1,
        unitCents: totalCents,
        discountCents: 0,
        taxCode: 'NO_GST',
        category: 'tuition',
        accountCode: '200',
      },
    ],
  });
  const issued = await command(page, 'invoice.issue', {
    id: invoice.id,
    expectedRevision: invoice.revision,
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Billing overview' })).toBeVisible();
  return { account, invoice: issued, today: snapshot.today };
}
async function openInvoice(page, id) {
  await nav(page, 'Invoices');
  await page.locator(`[data-action="invoice-open"][data-id="${id}"]`).first().click();
}
async function openPayment(page, id) {
  await nav(page, 'Payments & receipts');
  await page.locator(`[data-action="payment-open"][data-id="${id}"]`).first().click();
}
async function newAccountForm(page, name) {
  await nav(page, 'Accounts');
  await page.getByRole('button', { name: 'New account', exact: true }).click();
  await modal(page)
    .getByLabel(/^Account name/)
    .fill(name);
  await modal(page)
    .getByLabel(/^Name on invoices/)
    .fill(`${name} payer`);
}

test('a lost command response reuses the same key and creates exactly one account', async ({
  page,
}) => {
  await login(page);
  await newAccountForm(page, 'Synthetic lost-response family');
  const keys = [],
    bodies = [];
  let requests = 0;
  await page.route('**/api/commands', async (route) => {
    if (route.request().postDataJSON()?.type !== 'account.create') return route.continue();
    requests++;
    keys.push(route.request().headers()['idempotency-key']);
    bodies.push(route.request().postData());
    const response = await route.fetch();
    expect(response.ok()).toBeTruthy();
    if (requests === 1) await route.abort('failed');
    else await route.fulfill({ response });
  });
  await modal(page).getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(modal(page).locator('#dialog-error')).toContainText(
    'save result could not be confirmed',
  );
  await expect(modal(page).getByLabel(/^Account name/)).toBeDisabled();
  await modal(page).getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  const snapshot = await state(page),
    accounts = snapshot.accounts.filter((a) => a.name === 'Synthetic lost-response family');
  expect(requests).toBe(2);
  expect(new Set(keys).size).toBe(1);
  expect(new Set(bodies).size).toBe(1);
  expect(accounts).toHaveLength(1);
  expect(
    snapshot.audit.filter((a) => a.action === 'account.create' && a.entityId === accounts[0].id),
  ).toHaveLength(1);
});

test('a saved command followed by failed refresh retries only the refresh with frozen fields', async ({
  page,
}) => {
  await login(page);
  await newAccountForm(page, 'Synthetic refresh-retry family');
  let requests = 0,
    failRefresh = false;
  await page.route('**/api/commands', async (route) => {
    requests++;
    const response = await route.fetch();
    failRefresh = true;
    await route.fulfill({ response });
  });
  await page.route('**/api/state', async (route) => {
    if (failRefresh) {
      failRefresh = false;
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Synthetic state refresh outage' }),
      });
    }
    await route.continue();
  });
  await modal(page).getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(modal(page).locator('#dialog-error')).toContainText('Saved successfully');
  await expect(modal(page).getByLabel(/^Account name/)).toBeDisabled();
  await modal(page).getByRole('button', { name: 'Retry refresh', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  expect(requests).toBe(1);
  const snapshot = await state(page),
    accounts = snapshot.accounts.filter((a) => a.name === 'Synthetic refresh-retry family');
  expect(accounts).toHaveLength(1);
  expect(
    snapshot.audit.filter((a) => a.action === 'account.create' && a.entityId === accounts[0].id),
  ).toHaveLength(1);
});

test('payment plan, allocation release, line credit and completed refund preserve financial history', async ({
  page,
}) => {
  await login(page);
  const { account, invoice, today } = await fixture(page, 'corrections');
  await openInvoice(page, invoice.id);
  await page.getByRole('button', { name: 'Create plan', exact: true }).click();
  await modal(page).getByRole('button', { name: 'Save payment plan', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  const payment = await command(page, 'payment.record', {
    accountId: account.id,
    purpose: 'fees',
    amountCents: 10000,
    paidOn: today,
    method: 'bank_transfer',
    reference: 'SYNTHETIC-CORRECTIONS-PAYMENT',
  });
  await command(page, 'payment.confirm', {
    id: payment.id,
    evidence: 'Synthetic verified statement transaction',
    allocations: [{ invoiceId: invoice.id, amountCents: 10000 }],
  });
  await page.reload();
  await openPayment(page, payment.id);
  await page.getByRole('button', { name: 'Release allocation', exact: true }).click();
  await modal(page)
    .getByLabel(/^Reason/)
    .fill('Synthetic credit correction followed by completed refund');
  await modal(page).getByRole('button', { name: 'Release allocation', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await openInvoice(page, invoice.id);
  await page.getByRole('button', { name: 'Credit lines', exact: true }).click();
  await modal(page).locator('[data-credit-line]').fill('25.00');
  await modal(page)
    .getByLabel(/^Reason for credit/)
    .fill('Synthetic agreed fee reduction');
  await modal(page).getByRole('button', { name: 'Issue credit note', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  let snapshot = await state(page);
  expect(snapshot.invoices.find((i) => i.id === invoice.id).balanceCents).toBe(7500);
  await openPayment(page, payment.id);
  await page.getByRole('button', { name: 'Allocate funds', exact: true }).click();
  await modal(page).locator('[data-invoice-allocation]').fill('75.00');
  await modal(page).getByRole('button', { name: 'Save allocations', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await page.getByRole('button', { name: 'Record refund', exact: true }).click();
  await modal(page)
    .getByLabel(/^Refund amount/)
    .fill('25.00');
  await modal(page)
    .getByLabel(/^Refund transaction reference/)
    .fill('SYNTHETIC-CORRECTIONS-REFUND');
  await modal(page)
    .getByLabel(/^Reason and completed/)
    .fill('Synthetic outgoing refund independently confirmed');
  await modal(page).getByRole('button', { name: 'Record completed refund', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  snapshot = await state(page);
  const result = snapshot.invoices.find((i) => i.id === invoice.id),
    plan = snapshot.plans.find((p) => p.invoiceId === invoice.id);
  expect(result.balanceCents).toBe(0);
  expect(result.settlementStatus).toBe('credited');
  expect(result.paidCents).toBe(7500);
  expect(result.creditedCents).toBe(2500);
  expect(snapshot.refunds.filter((r) => r.paymentId === payment.id)).toHaveLength(1);
  expect(
    snapshot.allocations.filter((a) => a.paymentId === payment.id && a.releasedAt),
  ).toHaveLength(1);
  expect(plan.instalments[0].status).toBe('settled');
  expect(snapshot.payments.find((p) => p.id === payment.id).unallocatedCents).toBe(0);
});

test('reviewed billing run groups students, commits once and retains draft invoices', async ({
  page,
}) => {
  await login(page);
  const snapshot = await state(page);
  const account = await command(page, 'account.create', {
    name: 'Synthetic batch family',
    billingName: 'Synthetic batch payer',
    email: 'batch@example.test',
    address: 'Synthetic test address',
    xeroContactName: 'Synthetic batch contact',
  });
  const student = await command(page, 'student.create', {
    accountId: account.id,
    name: 'Synthetic batch child',
    yearLevel: 'Year 1',
    entryYear: Number(snapshot.today.slice(0, 4)),
    status: 'prospective',
  });
  const fee = await command(page, 'fee.create', {
    code: 'SYNTHETIC-BATCH-FEE',
    description: 'Synthetic batch tuition',
    unitCents: 12500,
    taxCode: 'NO_GST',
    category: 'tuition',
    accountCode: '200',
    active: true,
  });
  await page.reload();
  await nav(page, 'Billing runs');
  await page.getByRole('button', { name: 'Preview a run', exact: true }).click();
  await modal(page)
    .getByLabel(/^Run name/)
    .fill('Synthetic reviewed browser run');
  await modal(page)
    .getByLabel(/^Term \/ period/)
    .fill('Synthetic batch term');
  await modal(page).locator(`input[name="studentIds"][value="${student.id}"]`).check();
  await modal(page).locator(`input[name="feeIds"][value="${fee.id}"]`).check();
  await modal(page).getByRole('button', { name: 'Create priced preview', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await expect(page.getByText('Synthetic batch tuition', { exact: false }).first()).toBeVisible();
  let current = await state(page);
  const batch = current.batches.find((b) => b.label === 'Synthetic reviewed browser run');
  expect(batch.status).toBe('preview');
  expect(batch.invoiceCount).toBe(1);
  expect(batch.totalCents).toBe(12500);
  expect(current.invoices.filter((i) => i.batchId === batch.id)).toHaveLength(0);
  await page.getByRole('button', { name: 'Create reviewed drafts', exact: true }).click();
  await modal(page).getByRole('button', { name: 'Create invoice drafts', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  current = await state(page);
  const committed = current.batches.find((b) => b.id === batch.id);
  expect(committed.status).toBe('committed');
  expect(committed.invoiceIds).toHaveLength(1);
  expect(current.invoices.find((i) => i.id === committed.invoiceIds[0]).status).toBe('draft');
  await expect(
    page.getByRole('button', { name: 'Create reviewed drafts', exact: true }),
  ).toHaveCount(0);
});

test('bond verification, rejection and reversal remain distinct from fee settlement', async ({
  page,
}) => {
  await login(page);
  const { account, invoice, today } = await fixture(page, 'bond-controls');
  const bond = await command(page, 'payment.record', {
    accountId: account.id,
    purpose: 'bond',
    amountCents: 20000,
    paidOn: today,
    method: 'eftpos',
    reference: 'SYNTHETIC-BOND-CONTROLS',
  });
  await page.reload();
  await openPayment(page, bond.id);
  await page.getByRole('button', { name: 'Verify payment', exact: true }).click();
  await modal(page)
    .getByLabel(/^Verification evidence/)
    .fill('Synthetic terminal settlement independently checked');
  await expect(modal(page).locator('[data-invoice-allocation]')).toHaveCount(0);
  await modal(page).getByRole('button', { name: 'Confirm receipt of funds', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  let snapshot = await state(page);
  expect(snapshot.accounts.find((a) => a.id === account.id).bondHeldCents).toBe(20000);
  expect(snapshot.invoices.find((i) => i.id === invoice.id).balanceCents).toBe(10000);
  await page.getByRole('button', { name: 'Reverse payment', exact: true }).click();
  await modal(page)
    .getByLabel(/^Reason/)
    .fill('Synthetic settled transaction was reversed');
  await modal(page).getByRole('button', { name: 'Reverse confirmed payment', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  snapshot = await state(page);
  expect(snapshot.payments.find((p) => p.id === bond.id).status).toBe('reversed');
  expect(snapshot.receipts.find((r) => r.paymentId === bond.id).reversed).toBeTruthy();
  expect(snapshot.accounts.find((a) => a.id === account.id).bondHeldCents).toBe(0);
  const rejected = await command(page, 'payment.record', {
    accountId: account.id,
    purpose: 'fees',
    amountCents: 100,
    paidOn: today,
    method: 'cash',
    reference: 'SYNTHETIC-REJECT-CONTROLS',
  });
  await page.reload();
  await openPayment(page, rejected.id);
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await modal(page)
    .getByLabel(/^Reason/)
    .fill('Synthetic report not supported by evidence');
  await modal(page).getByRole('button', { name: 'Reject payment report', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  snapshot = await state(page);
  expect(snapshot.payments.find((p) => p.id === rejected.id).status).toBe('rejected');
  expect(snapshot.receipts.some((r) => r.paymentId === rejected.id)).toBeFalsy();
});

test('accounting exports show manifests and record explicit Xero import evidence only', async ({
  page,
}) => {
  await login(page, 'finance');
  await nav(page, 'Reports & exports');
  const reportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV', exact: true }).click();
  expect((await reportDownload).suggestedFilename()).toMatch(/receivables/);
  await expect(page.locator('tr').filter({ hasText: 'Receivables' }).last()).toBeVisible();
  await expect(
    page
      .locator('tr')
      .filter({ hasText: 'Receivables' })
      .getByRole('button', { name: 'Record import', exact: true }),
  ).toHaveCount(0);
  const invoiceDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export invoice CSV', exact: true }).click();
  expect((await invoiceDownload).suggestedFilename()).toMatch(/accounting/);
  const rows = page.locator('tbody tr').filter({ hasText: 'Xero' });
  await rows.last().getByRole('button', { name: 'Manifest', exact: true }).click();
  await expect(modal(page)).toContainText('File SHA-256');
  await expect(modal(page).locator('pre')).toContainText('invoiceIds');
  await page.keyboard.press('Escape');
  await rows.last().getByRole('button', { name: 'Record import', exact: true }).click();
  await modal(page)
    .getByLabel(/^External import/)
    .fill('SYNTHETIC-REVIEWED-IMPORT');
  await modal(page)
    .getByLabel(/^Import notes/)
    .fill('Synthetic external import reviewed; not live accounting evidence.');
  await modal(page).getByRole('button', { name: 'Record import evidence', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  const snapshot = await state(page);
  expect(
    snapshot.exports.some(
      (e) =>
        e.kind === 'xero' &&
        e.importReference === 'SYNTHETIC-REVIEWED-IMPORT' &&
        e.status === 'import_recorded',
    ),
  ).toBeTruthy();
});

test('a stale account edit cannot overwrite another staff change', async ({ page }) => {
  await login(page);
  const { account } = await fixture(page, 'stale-edit');
  await nav(page, 'Accounts');
  await page.locator(`[data-action="account-open"][data-id="${account.id}"]`).first().click();
  await page.getByRole('button', { name: 'Edit account', exact: true }).click();
  await modal(page)
    .getByLabel(/^Account name/)
    .fill('Synthetic stale browser edit');
  await command(page, 'account.update', {
    ...account,
    expectedRevision: account.revision,
    name: 'Synthetic concurrent staff edit',
  });
  await modal(page).getByRole('button', { name: 'Save account', exact: true }).click();
  await expect(modal(page).locator('#dialog-error')).toContainText('Close and reopen');
  await expect(
    modal(page).getByRole('button', { name: 'Save account', exact: true }),
  ).toBeDisabled();
  expect((await state(page)).accounts.find((a) => a.id === account.id).name).toBe(
    'Synthetic concurrent staff edit',
  );
});

async function expectAccessible(page, context) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      context,
      id: v.id,
      count: v.nodes.length,
      nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}

test('multiline composer previews discounts and mixed tax, then preserves exact server totals', async ({
  page,
}) => {
  await login(page);
  const { account } = await fixture(page, 'composer');
  await nav(page, 'Invoices');
  await page.getByRole('button', { name: 'New invoice', exact: true }).click();
  await modal(page)
    .getByLabel(/^Billing account/)
    .selectOption(account.id);
  await modal(page)
    .getByLabel(/^Term \/ period/)
    .fill('Synthetic mixed-tax draft');
  let line = modal(page).locator('.editor-line').first();
  await line.getByLabel('Description', { exact: true }).fill('Synthetic taxable fee');
  await line.getByLabel('Quantity', { exact: true }).fill('3');
  await line.getByLabel('Unit AUD', { exact: true }).fill('19.99');
  await line.getByLabel('Discount AUD', { exact: true }).fill('5.00');
  await line.getByLabel('Tax', { exact: true }).selectOption('GST_10');
  await modal(page).getByRole('button', { name: 'Add line', exact: true }).click();
  line = modal(page).locator('.editor-line').nth(1);
  await line.getByLabel('Description', { exact: true }).fill('Synthetic GST-free item');
  await line.getByLabel('Unit AUD', { exact: true }).fill('10.00');
  await line.getByLabel('Tax', { exact: true }).selectOption('GST_FREE');
  await expect(modal(page).locator('#invoice-totals .grand')).toContainText('$70.47');
  await expectAccessible(page, 'multiline invoice composer');
  await modal(page).getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  const invoice = (await state(page)).invoices.find((i) => i.term === 'Synthetic mixed-tax draft');
  expect(invoice.lines).toHaveLength(2);
  expect(invoice.totalCents).toBe(7047);
  expect(invoice.taxCents).toBe(550);
  expect(invoice.discountCents).toBe(500);
  expect(invoice.status).toBe('draft');
  await page.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await expect(modal(page).getByLabel(/^Billing account/)).toBeDisabled();
  await expect(modal(page).locator('#invoice-totals .grand')).toContainText('$70.47');
});

test('mobile screens, document details and representative dialogs pass accessibility checks without page overflow', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  await expectAccessible(page, 'mobile sign in');
  await login(page);
  for (const name of [
    'Accounts',
    'Students',
    'Invoices',
    'Payments & receipts',
    'Payment plans',
    'Billing runs',
    'Fee catalogue',
    'Reports & exports',
    'Activity log',
    'Settings',
    'Overview',
  ]) {
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await nav(page, name);
    await expect(page.locator('main h1')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${name} page width`,
    ).toBeTruthy();
    await expectAccessible(page, `mobile ${name}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.setViewportSize({ width: 390, height: 844 });
  const sidebar = await page.locator('.sidebar').boundingBox();
  expect(sidebar.x + sidebar.width).toBeLessThanOrEqual(1);
  await page.screenshot({ path: test.info().outputPath('mobile-overview.png'), fullPage: true });
  const snapshot = await state(page),
    invoice = snapshot.invoices.find((i) => i.status === 'issued');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await nav(page, 'Invoices');
  await page.locator(`[data-action="invoice-open"][data-id="${invoice.id}"]`).first().click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await expectAccessible(page, 'mobile invoice detail');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await nav(page, 'Accounts');
  await page.getByRole('button', { name: 'New account', exact: true }).click();
  await expectAccessible(page, 'mobile new account');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await nav(page, 'Invoices');
  await page.getByRole('button', { name: 'New invoice', exact: true }).click();
  await expectAccessible(page, 'mobile invoice composer');
  expect(await modal(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await page.screenshot({
    path: test.info().outputPath('mobile-invoice-composer.png'),
    fullPage: true,
  });
});

test('billing staff can prepare records but cannot verify funds or edit school settings', async ({
  page,
}) => {
  await login(page, 'billing');
  const { account, today } = await fixture(page, 'billing-role');
  const payment = await command(page, 'payment.record', {
    accountId: account.id,
    purpose: 'fees',
    amountCents: 1000,
    paidOn: today,
    method: 'cash',
    reference: 'SYNTHETIC-BILLING-ROLE-PAYMENT',
  });
  await page.reload();
  await openPayment(page, payment.id);
  await expect(page.getByRole('button', { name: 'Verify payment', exact: true })).toHaveCount(0);
  await expect(
    page.locator('nav').getByRole('button', { name: 'Settings', exact: true }),
  ).toHaveCount(0);
  const status = await page.evaluate(async (id) => {
    const s = await (await fetch('/api/session')).json();
    const r = await fetch('/api/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': s.csrfToken,
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: 'payment.confirm',
        payload: { id, evidence: 'Synthetic unauthorised attempt', allocations: [] },
      }),
    });
    return r.status;
  }, payment.id);
  expect(status).toBe(403);
  expect((await state(page)).payments.find((p) => p.id === payment.id).status).toBe('pending');
});

test('saved account text is escaped and prospective enrolment links are explicit references', async ({
  page,
}) => {
  await login(page);
  const name = 'Synthetic <img src=x onerror="window.injected=true"> family';
  await newAccountForm(page, name);
  await modal(page).getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => Boolean(window.injected))).toBeFalsy();
  await expect(page.locator('main img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await modal(page)
    .getByLabel(/^Student name/)
    .fill('Synthetic reference child');
  await modal(page)
    .getByLabel(/^Intended year level/)
    .fill('Foundation');
  await modal(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await nav(page, 'Students');
  const row = page.locator('tr').filter({ hasText: 'Synthetic reference child' });
  await row.getByRole('button', { name: 'Link', exact: true }).click();
  await modal(page)
    .getByLabel(/^Application \/ enrolment reference/)
    .fill('SYNTHETIC-ENROLMENT-REF');
  await modal(page)
    .getByLabel(/^Reason/)
    .fill('Synthetic manually reviewed reference for future linkage');
  await modal(page).getByRole('button', { name: 'Save reference', exact: true }).click();
  await expect(modal(page)).not.toBeVisible();
  await expect(row).toContainText('Unverified reference');
  expect(
    (await state(page)).students.find((s) => s.name === 'Synthetic reference child')
      .enrolmentReference,
  ).toBe('SYNTHETIC-ENROLMENT-REF');
});
