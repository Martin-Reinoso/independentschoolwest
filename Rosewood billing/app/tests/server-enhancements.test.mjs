import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase } from '../src/database.mjs';
import { createAuth } from '../src/auth.mjs';
import { createBillingService } from '../src/service.mjs';
import { createCommunications } from '../src/communications.mjs';
import { createBillingServer } from '../src/server.mjs';
import { seedDemo } from '../src/seed.mjs';
import { renderDocument } from '../src/documents.mjs';
import { loadMailConfig } from '../src/mail.mjs';
import { APP_ROOT } from '../src/config.mjs';
import { join } from 'node:path';

const password = 'synthetic-integration-password-only';
async function fixture(t) {
  const db = openDatabase(':memory:');
  const service = createBillingService({ db, demoMode: true });
  seedDemo(service);
  const setupActor = {
    id: 'synthetic-fixture',
    name: 'Synthetic setup',
    email: 'setup@example.test',
    role: 'admin',
  };
  for (const account of service.getState(setupActor).accounts)
    service.execute(
      setupActor,
      {
        type: 'account.update',
        payload: { ...account, expectedRevision: account.revision, contactAllowed: true },
      },
      `synthetic-contact-${account.id}`,
    );
  const auth = createAuth({ db });
  for (const role of ['admin', 'billing', 'viewer'])
    await auth.addUser({
      name: `Synthetic ${role}`,
      email: `${role}@example.test`,
      role,
      password,
    });
  const communications = createCommunications({ db, service });
  const config = {
    origin: 'http://127.0.0.1:1',
    expectedHost: '127.0.0.1:1',
    demoMode: true,
    cookieName: 'rwc_test',
    publicDir: join(APP_ROOT, 'public'),
  };
  const server = createBillingServer({
    service,
    auth,
    communications,
    config,
    mailConfig: loadMailConfig({ env: {}, demoMode: true }),
    renderDocument,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  config.origin = `http://127.0.0.1:${server.address().port}`;
  config.expectedHost = new URL(config.origin).host;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  async function login(role = 'admin') {
    const response = await fetch(`${config.origin}/api/login`, {
      method: 'POST',
      headers: { Origin: config.origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${role}@example.test`, password }),
    });
    assert.equal(response.status, 200);
    const session = await response.json();
    const headers = {
      Cookie: response.headers.get('set-cookie').split(';')[0],
      Origin: config.origin,
      'Content-Type': 'application/json',
      'X-CSRF-Token': session.csrfToken,
    };
    let key = 0;
    return {
      ...session,
      headers,
      get(route) {
        return fetch(`${config.origin}${route}`, { headers });
      },
      post(route, type, payload) {
        return fetch(`${config.origin}${route}`, {
          method: 'POST',
          headers: { ...headers, 'Idempotency-Key': `enhancements-${role}-${++key}` },
          body: JSON.stringify({ type, payload }),
        });
      },
    };
  }
  return { db, service, auth, communications, config, login };
}

test('communications and frozen attachment are protected, while viewers cannot queue or manage staff', async (t) => {
  const f = await fixture(t),
    admin = await f.login(),
    viewer = await f.login('viewer');
  assert.equal((await fetch(`${f.config.origin}/api/communications`)).status, 401);
  const snapshot = await (await admin.get('/api/communications')).json();
  assert.equal(snapshot.transport.enabled, false);
  assert.equal(snapshot.transport.demoMode, true);
  assert.equal((await viewer.get('/api/staff')).status, 403);
  assert.equal(
    (await viewer.post('/api/communications/commands', 'communication.prepare', {})).status,
    403,
  );
  assert.equal(
    (
      await viewer.post('/api/staff/commands', 'staff.create', {
        name: 'No access',
        email: 'none@example.test',
        role: 'admin',
        password,
      })
    ).status,
    403,
  );
  const invoice = f.service.getState(admin.user).invoices.find((i) => i.status === 'issued');
  const response = await admin.post('/api/communications/commands', 'communication.create', {
    kind: 'invoice',
    documentId: invoice.id,
  });
  assert.equal(response.status, 200, await response.clone().text());
  const message = f.communications
    .getState(admin.user)
    .messages.find((m) => m.documentId === invoice.id);
  const document = await viewer.get(`/api/communications/${message.id}/document.pdf`);
  assert.equal(document.status, 200);
  assert.equal(document.headers.get('content-type'), 'application/pdf');
  assert.equal(document.headers.get('cache-control'), 'no-store');
  assert.match(
    Buffer.from(await document.arrayBuffer())
      .subarray(0, 5)
      .toString(),
    /%PDF-/,
  );
});

test('approved automation settings prepare a draft after issuing without sending or altering invoice success', async (t) => {
  const f = await fixture(t),
    admin = await f.login(),
    billing = await f.login('billing');
  const settings = f.communications.getState(admin.user).settings;
  f.communications.execute(
    admin.user,
    {
      type: 'communication.settings',
      payload: {
        expectedRevision: settings.revision,
        automaticInvoices: true,
        automaticReceipts: false,
        remindersEnabled: false,
        reminderOffsets: [-7, 0, 7, 14],
        mode: 'review',
        startDate: f.service.getState(admin.user).today,
      },
    },
    'integration-automation',
  );
  const state = f.service.getState(admin.user);
  const made = await billing.post('/api/commands', 'invoice.create', {
    accountId: state.accounts[0].id,
    issueDate: state.today,
    dueDate: state.today,
    year: 2027,
    term: 'Synthetic email test',
    description: 'Synthetic email invoice',
    lines: [
      {
        description: 'Synthetic tuition',
        quantity: 1,
        unitCents: 10000,
        discountCents: 0,
        taxCode: 'GST_FREE',
        category: 'tuition',
        accountCode: '200',
      },
    ],
  });
  assert.equal(made.status, 200, await made.clone().text());
  const invoice = (await made.json()).result;
  const issued = await billing.post('/api/commands', 'invoice.issue', {
    id: invoice.id,
    expectedRevision: invoice.revision,
  });
  assert.equal(issued.status, 200, await issued.clone().text());
  const messages = f.communications
    .getState(admin.user)
    .messages.filter((m) => m.documentId === invoice.id);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].status, 'draft');
  assert.equal(
    f.service.getState(admin.user).invoices.find((i) => i.id === invoice.id).status,
    'issued',
  );
});

test('staff reset revokes the old session and session CSRF remains mandatory on new routes', async (t) => {
  const f = await fixture(t),
    admin = await f.login(),
    viewer = await f.login('viewer');
  const staff = (await (await admin.get('/api/staff')).json()).staff;
  assert.ok(staff.every((u) => !Object.hasOwn(u, 'password_hash')));
  const target = staff.find((u) => u.email === 'viewer@example.test');
  const rejected = await fetch(`${f.config.origin}/api/staff/commands`, {
    method: 'POST',
    headers: { ...admin.headers, 'X-CSRF-Token': '', 'Idempotency-Key': 'forged-reset-key' },
    body: JSON.stringify({
      type: 'staff.resetPassword',
      payload: {
        id: target.id,
        expectedRevision: target.revision,
        password: 'new-synthetic-password-only',
      },
    }),
  });
  assert.equal(rejected.status, 403);
  const reset = await admin.post('/api/staff/commands', 'staff.resetPassword', {
    id: target.id,
    expectedRevision: target.revision,
    password: 'new-synthetic-password-only',
  });
  assert.equal(reset.status, 200, await reset.clone().text());
  assert.equal((await viewer.get('/api/session')).status, 401);
});
