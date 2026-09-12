import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';

// Full Chromium includes the built-in PDF viewer; the headless shell does not.
test.use({ channel: 'chromium' });

const dialog = (page) => page.locator('#workspace-dialog');
const pdfDialog = (page) => page.locator('#pdf-preview-dialog');
async function login(
  page,
  role = 'admin',
  password = process.env.BILLING_BROWSER_PASSWORD,
  email = `${role}@example.test`,
) {
  await page.goto('/');
  await page.getByLabel(/^Email address/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: /^Sign in/ }).click();
  await expect(page.getByRole('heading', { name: 'Billing overview' })).toBeVisible();
}
async function navigate(page, name) {
  await page.locator('nav').getByRole('button', { name, exact: true }).click();
}
async function read(page, path = '/api/state') {
  return page.evaluate(async (path) => (await fetch(path)).json(), path);
}
async function command(page, type, payload, path = '/api/commands') {
  return page.evaluate(
    async ({ type, payload, path }) => {
      const session = await (await fetch('/api/session')).json();
      const response = await fetch(path, {
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
    { type, payload, path },
  );
}
async function fixture(page, name) {
  const snapshot = await read(page),
    account = await command(page, 'account.create', {
      name: `Synthetic ${name} account`,
      billingName: `Synthetic ${name} payer`,
      email: `${name}@example.test`,
      address: '1 Synthetic Lane, Sample VIC 3000',
      contactAllowed: true,
      xeroContactName: `Synthetic ${name} contact`,
    });
  const draft = await command(page, 'invoice.create', {
    accountId: account.id,
    issueDate: snapshot.today,
    dueDate: snapshot.today,
    year: Number(snapshot.today.slice(0, 4)),
    term: 'Synthetic enhanced term',
    description: `Synthetic ${name} fees`,
    lines: [
      {
        description: `Synthetic ${name} tuition`,
        quantity: 1,
        unitCents: 15000,
        discountCents: 0,
        taxCode: 'NO_GST',
        category: 'tuition',
        accountCode: '200',
      },
    ],
  });
  const invoice = await command(page, 'invoice.issue', {
    id: draft.id,
    expectedRevision: draft.revision,
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Billing overview' })).toBeVisible();
  return { account, invoice, today: snapshot.today };
}
async function createEmail(page, invoice) {
  await navigate(page, 'Documents');
  await page
    .locator(`[data-action="communication-create"][data-id="invoice:${invoice.id}"]`)
    .click();
  await dialog(page).getByRole('button', { name: 'Create email draft', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.getByRole('heading', { name: /invoice RWC-INV/ })).toBeVisible();
  return (await read(page, '/api/communications')).messages.find(
    (m) => m.documentId === invoice.id && m.kind === 'invoice',
  );
}
async function axe(page, context) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      context,
      id: v.id,
      nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}

test('document centre filters real records, previews authenticated PDF and releases its Blob', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1060 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__revoked = [];
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      window.__revoked.push(url);
      revoke(url);
    };
  });
  await login(page);
  await navigate(page, 'Documents');
  await page.getByRole('combobox', { name: 'All document types' }).selectOption('receipt');
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await expect(page.locator('tbody tr').first()).toContainText('Receipt');
  await page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: 'Preview PDF', exact: true })
    .click();
  await expect(pdfDialog(page)).toBeVisible();
  await expect(pdfDialog(page).locator('iframe')).toHaveAttribute('src', /^blob:/);
  await expect(pdfDialog(page).locator('iframe')).toHaveAttribute('title', /RWC-RCT/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: test.info().outputPath('pdf-preview.png'), fullPage: true });
  const url = await pdfDialog(page).locator('iframe').getAttribute('src');
  const download = page.waitForEvent('download');
  await pdfDialog(page).getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await pdfDialog(page).getByRole('button', { name: 'Close PDF preview', exact: true }).click();
  await expect(pdfDialog(page)).not.toBeVisible();
  expect(await page.evaluate((url) => window.__revoked.includes(url), url)).toBeTruthy();
  await page.getByRole('combobox', { name: 'All document types' }).selectOption('statement');
  await page.getByRole('searchbox').fill('No such synthetic account');
  await expect(page.getByRole('heading', { name: 'No matching documents' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('email draft preserves its attachment and queues after explicit review with delivery disabled', async ({
  page,
}) => {
  await login(page);
  const { invoice } = await fixture(page, 'email-review');
  let message = await createEmail(page, invoice);
  expect(message.status).toBe('draft');
  expect((await read(page, '/api/communications')).transport.enabled).toBe(false);
  await expect(
    page.getByText('Email delivery is disabled', { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await dialog(page)
    .getByLabel(/^Subject/)
    .fill('Synthetic reviewed invoice email');
  await dialog(page)
    .getByLabel(/^Email body/)
    .fill('Synthetic sample only. Please review the attached invoice.');
  await dialog(page).getByRole('button', { name: 'Preview attachment', exact: true }).click();
  await expect(pdfDialog(page).locator('iframe')).toHaveAttribute('src', /^blob:/);
  await page.keyboard.press('Escape');
  await expect(pdfDialog(page)).not.toBeVisible();
  await expect(dialog(page).getByLabel(/^Subject/)).toHaveValue('Synthetic reviewed invoice email');
  await dialog(page).getByRole('button', { name: 'Save email draft', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.getByRole('button', { name: 'Approve and queue', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Approve and queue', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  message = (await read(page, '/api/communications')).messages.find((m) => m.id === message.id);
  expect(message.status).toBe('queued');
  expect(message.subject).toBe('Synthetic reviewed invoice email');
  expect(message.providerId).toBe('');
  expect(message.acceptedAt).toBeNull();
  await expect(page.getByText('Queued', { exact: true })).toBeVisible();
  const events = (await read(page, '/api/communications')).events.filter(
    (e) => e.messageId === message.id,
  );
  expect(events.some((e) => e.action === 'communication.attachment_preview')).toBeTruthy();
  expect(events.some((e) => e.action === 'communication.approve')).toBeTruthy();
});

test('account hold blocks approval and refreshed review succeeds only after the hold is released', async ({
  page,
}) => {
  await login(page);
  const { account, invoice } = await fixture(page, 'email-hold');
  const message = await createEmail(page, invoice);
  await navigate(page, 'Communications');
  await page.getByRole('button', { name: 'Contact hold', exact: true }).click();
  await dialog(page)
    .getByLabel(/^Billing account/)
    .selectOption(account.id);
  await dialog(page)
    .getByLabel(/^Reason for hold/)
    .fill('Synthetic family billing query under review');
  await dialog(page).getByRole('button', { name: 'Save contact hold', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.locator(`[data-action="communication-open"][data-id="${message.id}"]`).first().click();
  await page.getByRole('button', { name: 'Approve and queue', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Approve and queue', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  expect(
    (await read(page, '/api/communications')).messages.find((m) => m.id === message.id).status,
  ).toBe('blocked');
  await expect(
    page
      .getByText('All outbound communication is paused for this account.', { exact: false })
      .first(),
  ).toBeVisible();
  await navigate(page, 'Communications');
  await page.locator(`[data-action="communication-hold"][data-id="${account.id}"]`).click();
  await dialog(page).getByLabel('Pause billing emails for this account').uncheck();
  await dialog(page)
    .getByLabel(/^Reason for hold/)
    .fill('Synthetic query resolved');
  await dialog(page).getByRole('button', { name: 'Save contact hold', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.locator(`[data-action="communication-open"][data-id="${message.id}"]`).first().click();
  await page.getByRole('button', { name: 'Refresh document', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Refresh document', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  expect(
    (await read(page, '/api/communications')).messages.find((m) => m.id === message.id).status,
  ).toBe('draft');
  await page.getByRole('button', { name: 'Cancel message', exact: true }).click();
  await dialog(page)
    .getByLabel(/^Reason/)
    .fill('Synthetic cancellation after review');
  await dialog(page).getByRole('button', { name: 'Cancel message', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  expect(
    (await read(page, '/api/communications')).messages.find((m) => m.id === message.id).status,
  ).toBe('cancelled');
});

test('reminder preparation uses saved rules and repeated preparation does not create duplicate messages', async ({
  page,
}) => {
  await login(page);
  const { invoice, today } = await fixture(page, 'reminder-rules');
  await navigate(page, 'Communications');
  await page.getByRole('button', { name: 'Edit rules', exact: true }).click();
  await dialog(page).getByLabel('Prepare email drafts for newly issued invoices').check();
  await dialog(page).getByLabel('Prepare invoice reminders around the due date').check();
  await dialog(page)
    .getByLabel(/^Reminder days/)
    .fill('0, 7, 14');
  await dialog(page)
    .getByLabel(/^Process documents from/)
    .fill(today);
  await dialog(page).getByLabel('Preparation mode', { exact: true }).selectOption('review');
  await dialog(page).getByRole('button', { name: 'Save preparation rules', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  for (let n = 0; n < 2; n++) {
    await page.getByRole('button', { name: 'Prepare automation', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Prepare messages', exact: true }).click();
    await expect(dialog(page)).not.toBeVisible();
  }
  const result = await read(page, '/api/communications'),
    messages = result.messages.filter((m) => m.documentId === invoice.id);
  expect(messages.filter((m) => m.kind === 'invoice')).toHaveLength(1);
  expect(messages.filter((m) => m.kind === 'reminder')).toHaveLength(1);
  expect(messages.every((m) => m.status === 'draft')).toBeTruthy();
  expect(result.transport.enabled).toBe(false);
});

test('staff creation, role edit, reset and self password change revoke sessions without retaining passwords', async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);
  const firstPassword = randomBytes(24).toString('base64url'),
    resetPassword = randomBytes(24).toString('base64url'),
    lastPassword = randomBytes(24).toString('base64url');
  await page.addInitScript(
    (passwords) => {
      window.__passwordMapLeak = false;
      const original = Map.prototype.set;
      Map.prototype.set = function (key, value) {
        if (typeof key === 'string' && passwords.some((p) => key.includes(p)))
          window.__passwordMapLeak = true;
        return original.call(this, key, value);
      };
    },
    [firstPassword, resetPassword, lastPassword],
  );
  await login(page);
  await navigate(page, 'Staff access');
  await page.getByRole('button', { name: 'Add staff member', exact: true }).click();
  await dialog(page)
    .getByLabel(/^Staff name/)
    .fill('Synthetic enhanced staff');
  await dialog(page)
    .getByLabel(/^Staff email/)
    .fill('enhanced-staff@example.test');
  await dialog(page).getByLabel('Access role', { exact: true }).selectOption('billing');
  await dialog(page)
    .getByLabel(/^Initial password/)
    .fill(firstPassword);
  await dialog(page).getByRole('button', { name: 'Create staff login', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  let staff = (await read(page, '/api/staff')).staff.find(
    (s) => s.email === 'enhanced-staff@example.test',
  );
  expect(staff.role).toBe('billing');
  const row = page.locator('tr').filter({ hasText: 'enhanced-staff@example.test' });
  await row.getByRole('button', { name: 'Edit access', exact: true }).click();
  await dialog(page).getByLabel('Access role', { exact: true }).selectOption('finance');
  await dialog(page).getByRole('button', { name: 'Save staff access', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  const context = await browser.newContext(),
    staffPage = await context.newPage();
  await login(staffPage, 'finance', firstPassword, 'enhanced-staff@example.test');
  await row.getByRole('button', { name: 'Reset password', exact: true }).click();
  await dialog(page)
    .getByLabel(/^New password/)
    .fill(resetPassword);
  await dialog(page)
    .getByLabel(/^Confirm new password/)
    .fill(resetPassword);
  await dialog(page).getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  expect(await staffPage.evaluate(async () => (await fetch('/api/session')).status)).toBe(401);
  await login(staffPage, 'finance', resetPassword, 'enhanced-staff@example.test');
  await staffPage.getByRole('button', { name: 'Change password', exact: true }).click();
  await dialog(staffPage)
    .getByLabel(/^Current password/)
    .fill('incorrect-synthetic-password');
  await dialog(staffPage)
    .getByLabel(/^New password/)
    .fill(lastPassword);
  await dialog(staffPage)
    .getByLabel(/^Confirm new password/)
    .fill(lastPassword);
  await dialog(staffPage).getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(dialog(staffPage).locator('#dialog-error')).toBeVisible();
  expect(await staffPage.evaluate(async () => (await fetch('/api/session')).status)).toBe(200);
  await dialog(staffPage)
    .getByLabel(/^Current password/)
    .fill(resetPassword);
  const passwordResponse = staffPage.waitForResponse(
    (r) =>
      r.url().endsWith('/api/staff/commands') &&
      r.request().postDataJSON()?.type === 'staff.changePassword',
  );
  await dialog(staffPage).getByRole('button', { name: 'Change password', exact: true }).click();
  expect((await passwordResponse).ok()).toBeTruthy();
  await expect(staffPage.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  await login(staffPage, 'finance', lastPassword, 'enhanced-staff@example.test');
  expect(await page.evaluate(() => window.__passwordMapLeak)).toBe(false);
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll('#workspace-dialog input[type=password]')].every(
        (i) => i.value === '',
      ),
    ),
  ).toBeTruthy();
  await context.close();
});

test('new workspaces and forms remain accessible on desktop and mobile and viewer cannot approve or manage staff', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const name of ['Documents', 'Communications', 'Staff access']) {
      if (size.width < 850)
        await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await navigate(page, name);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      await axe(page, `${size.width} ${name}`);
      await page.screenshot({
        path: test
          .info()
          .outputPath(`${size.width}-${name.toLowerCase().replaceAll(' ', '-')}.png`),
        fullPage: true,
      });
    }
    await page.getByRole('button', { name: 'Add staff member', exact: true }).click();
    await axe(page, `${size.width} staff form`);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await login(page, 'viewer');
  await navigate(page, 'Communications');
  await expect(page.getByRole('button', { name: 'Prepare automation', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.locator('nav').getByRole('button', { name: 'Staff access', exact: true }),
  ).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json();
    const request = await fetch('/api/communications/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.csrfToken,
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({ type: 'communication.prepare', payload: {} }),
    });
    return { write: request.status, staff: (await fetch('/api/staff')).status };
  });
  expect(result).toEqual({ write: 403, staff: 403 });
});

test('verified provider recovery separates a resend draft from uncertainty resolution and a later retry', async ({
  page,
}) => {
  await login(page, 'finance');
  let snapshot = await read(page, '/api/communications');
  const accepted = snapshot.messages.find(
      (m) =>
        m.to === 'synthetic-outbox-accepted@example.test' &&
        m.kind === 'invoice' &&
        !m.parentMessageId,
    ),
    uncertain = snapshot.messages.find(
      (m) =>
        m.to === 'synthetic-outbox-uncertain@example.test' &&
        m.kind === 'invoice' &&
        !m.parentMessageId,
    );
  expect(accepted.status).toBe('accepted');
  expect(uncertain.status).toBe('uncertain');
  await navigate(page, 'Communications');
  await page
    .locator(`[data-action="communication-open"][data-id="${accepted.id}"]`)
    .first()
    .click();
  await page.getByRole('button', { name: 'Prepare resend', exact: true }).click();
  await dialog(page)
    .getByLabel(/^Reason for another copy/)
    .fill('Synthetic request for another copy after provider acceptance');
  await dialog(page).getByRole('button', { name: 'Create resend draft', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  snapshot = await read(page, '/api/communications');
  const clone = snapshot.messages.find((m) => m.parentMessageId === accepted.id);
  expect(clone.status).toBe('draft');
  expect(snapshot.messages.find((m) => m.id === accepted.id).status).toBe('accepted');
  await expect(page.getByRole('button', { name: 'Approve and queue', exact: true })).toBeVisible();
  await navigate(page, 'Communications');
  await page
    .locator(`[data-action="communication-open"][data-id="${uncertain.id}"]`)
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Retry failed message', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Resolve provider outcome', exact: true }).click();
  await expect(dialog(page)).toContainText('Inspect the external provider');
  await dialog(page)
    .getByLabel(/^Verified provider outcome/)
    .selectOption('not_sent');
  await dialog(page)
    .getByLabel(/^Reason for resolving/)
    .fill('Synthetic test outcome independently established as not accepted');
  await dialog(page)
    .getByLabel(/^External provider log evidence/)
    .fill(
      'SYNTHETIC ONLY: fixture provider log TEST-NOT-ACCEPTED confirms the attempt was never accepted. No provider network call occurred.',
    );
  await axe(page, 'verified provider outcome form');
  await dialog(page).getByRole('button', { name: 'Record verified outcome', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  snapshot = await read(page, '/api/communications');
  const resolved = snapshot.messages.find((m) => m.id === uncertain.id);
  expect(resolved.status).toBe('failed');
  expect(resolved.resolution.outcome).toBe('not_sent');
  expect(resolved.resolution.evidence).toContain('TEST-NOT-ACCEPTED');
  await page.getByRole('button', { name: 'Retry failed message', exact: true }).click();
  await dialog(page)
    .getByLabel(/^Reason/)
    .fill('Synthetic separate approval to retry after verified non-acceptance');
  await dialog(page).getByRole('button', { name: 'Retry failed message', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  snapshot = await read(page, '/api/communications');
  expect(snapshot.messages.find((m) => m.id === uncertain.id).status).toBe('queued');
  expect(snapshot.transport.enabled).toBe(false);
});
