import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { openDatabase } from '../src/database.mjs';
import { createAuth } from '../src/auth.mjs';
import { createBillingService } from '../src/service.mjs';
import { createCommunications } from '../src/communications.mjs';
import { createBillingServer } from '../src/server.mjs';
import { seedDemo } from '../src/seed.mjs';
import { loadMailConfig } from '../src/mail.mjs';

const PASSWORD = 'synthetic-revoked-upload-password';

async function fixture(t) {
  const db = openDatabase(':memory:');
  const service = createBillingService({ db, demoMode: true });
  seedDemo(service);
  const auth = createAuth({ db });
  const admin = await auth.addUser({
    name: 'Synthetic Admin',
    email: 'admin@example.test',
    role: 'admin',
    password: PASSWORD,
  });
  const finance = await auth.addUser({
    name: 'Synthetic Finance',
    email: 'finance@example.test',
    role: 'finance',
    password: PASSWORD,
  });
  const communications = createCommunications({ db, service });
  let sawAuthentication;
  const instrumentedAuth = {
    ...auth,
    authenticate(token) {
      const result = auth.authenticate(token);
      sawAuthentication?.();
      return result;
    },
  };
  const config = {
    origin: 'http://127.0.0.1:1',
    expectedHost: '127.0.0.1:1',
    demoMode: true,
    cookieName: 'review_cookie',
  };
  const server = createBillingServer({
    service,
    auth: instrumentedAuth,
    communications,
    config,
    mailConfig: loadMailConfig({ env: {}, demoMode: true }),
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
  const session = await auth.login({
    email: finance.email,
    password: PASSWORD,
    network: '127.0.0.1',
  });
  async function interruptedUpload(route, command, changeAccess) {
    const body = JSON.stringify(command);
    let entered;
    const bodyPending = new Promise((resolve) => {
      entered = resolve;
    });
    sawAuthentication = () => {
      sawAuthentication = undefined;
      entered();
    };
    let request;
    const response = new Promise((resolve, reject) => {
      request = http.request(
        `${config.origin}${route}`,
        {
          method: 'POST',
          headers: {
            Origin: config.origin,
            Cookie: `${config.cookieName}=${session.token}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': session.csrfToken,
            'Idempotency-Key': 'revoked-upload-review',
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }),
          );
        },
      );
      request.once('error', reject);
    });
    request.write(body.slice(0, 1));
    await bodyPending;
    // The real HTTP request has authenticated and is now awaiting its remaining JSON.
    changeAccess();
    request.end(body.slice(1));
    return response;
  }
  return { auth, admin, finance, service, communications, interruptedUpload };
}

test('disabled finance access cannot approve an email after a partially uploaded request completes', async (t) => {
  const f = await fixture(t);
  const state = f.service.getState(f.admin);
  const invoice = state.invoices.find((row) => row.status === 'issued');
  const account = state.accounts.find((row) => row.id === invoice.accountId);
  f.service.execute(
    f.admin,
    {
      type: 'account.update',
      payload: { ...account, expectedRevision: account.revision, contactAllowed: true },
    },
    'synthetic-contact-permission',
  );
  const draft = f.communications.execute(
    f.admin,
    {
      type: 'communication.create',
      payload: { kind: 'invoice', documentId: invoice.id },
    },
    'prepare-disabled-review',
  );
  const result = await f.interruptedUpload(
    '/api/communications/commands',
    {
      type: 'communication.approve',
      payload: { id: draft.id, expectedRevision: draft.revision },
    },
    () => f.auth.disableUser(f.finance.email),
  );
  assert.equal(result.status, 401, JSON.stringify(result.body));
  assert.equal(
    f.communications.getState(f.admin).messages.find((row) => row.id === draft.id).status,
    'draft',
  );
});

test('demoted finance access cannot finish a billing mutation under its captured previous role', async (t) => {
  const f = await fixture(t);
  const count = f.service.getState(f.admin).accounts.length;
  const result = await f.interruptedUpload(
    '/api/commands',
    {
      type: 'account.create',
      payload: {
        name: 'Must not be created',
        email: 'revoked-request@example.test',
        contactAllowed: false,
      },
    },
    () => f.auth.updateUser({ email: f.finance.email, role: 'viewer' }),
  );
  assert.equal(result.status, 401, JSON.stringify(result.body));
  assert.equal(f.service.getState(f.admin).accounts.length, count);
});
