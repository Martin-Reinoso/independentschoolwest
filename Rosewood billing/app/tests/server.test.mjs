import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import http from 'node:http';
import { mkdtemp, writeFile, mkdir, rm, realpath, stat, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createAuth } from '../src/auth.mjs';
import { createBillingServer } from '../src/server.mjs';
import { APP_ROOT, loadConfig, prepareRuntime } from '../src/config.mjs';

const PASSWORD = 'only-synthetic-http-test-password';
function rawGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () =>
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString(),
        }),
      );
    });
    req.on('error', reject);
  });
}
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rosewood-http-test-'));
  const publicDir = path.join(dir, 'public');
  await mkdir(publicDir);
  await writeFile(path.join(publicDir, 'index.html'), '<!doctype html><title>Staff portal</title>');
  await writeFile(path.join(publicDir, 'app.js'), '"use strict";');
  await writeFile(path.join(dir, 'billing.sqlite'), 'private database sentinel');
  const db = new DatabaseSync(':memory:');
  const auth = createAuth({ db });
  await auth.addUser({
    name: 'Synthetic Admin',
    email: 'admin@example.test',
    role: 'admin',
    password: PASSWORD,
  });
  await auth.addUser({
    name: 'Synthetic Viewer',
    email: 'viewer@example.test',
    role: 'viewer',
    password: PASSWORD,
  });
  const calls = [];
  const state = { accounts: [{ id: 'test-account' }], invoices: [], settings: { demoMode: true } };
  const service = {
    getState(actor) {
      calls.push(['state', actor.id]);
      return state;
    },
    execute(actor, command, key) {
      calls.push(['execute', actor, command, key]);
      return { id: 'changed-entity' };
    },
    getDocument(actor, kind, id) {
      calls.push(['document', actor.id, kind, id]);
      return { kind, document: { id } };
    },
    recordExport(actor, kind, metadata) {
      calls.push(['export', actor.id, kind, metadata]);
      return { id: 'export-123' };
    },
  };
  const config = {
    origin: 'http://127.0.0.1:1',
    expectedHost: '127.0.0.1:1',
    cookieName: 'rosewood_billing_local',
    secureCookies: false,
    trustProxy: false,
    maxBodyBytes: 4096,
    publicDir,
  };
  const server = createBillingServer({
    service,
    auth,
    config,
    renderDocument: async (payload) => Buffer.from(`%PDF-1.4\n${payload.kind} synthetic document`),
    buildReceivablesCsv: () => ({ csv: 'Account,Amount\r\nTest,10.00\r\n', metadata: { rows: 1 } }),
    buildXeroCsv: () => ({
      csv: 'ContactName,InvoiceNumber\r\nTest,RWC-001\r\n',
      metadata: { rows: 1 },
    }),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  config.origin = `http://127.0.0.1:${server.address().port}`;
  config.expectedHost = new URL(config.origin).host;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
    await rm(dir, { recursive: true, force: true });
  });
  async function request(route, { headers = {}, ...options } = {}) {
    return fetch(`${config.origin}${route}`, { ...options, headers });
  }
  async function signIn(role = 'admin') {
    const response = await request('/api/login', {
      method: 'POST',
      headers: { Origin: config.origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${role}@example.test`, password: PASSWORD }),
    });
    assert.equal(response.status, 200);
    return {
      ...(await response.json()),
      cookie: response.headers.get('set-cookie').split(';')[0],
      setCookie: response.headers.get('set-cookie'),
    };
  }
  return { db, auth, config, service, calls, request, signIn, server, dir };
}

test('public health/static expose no private data and protected reads require a session', async (t) => {
  const { request } = await fixture(t);
  assert.deepEqual(await (await request('/api/health')).json(), { status: 'ok' });
  const page = await request('/');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await request('/api/state')).status, 401);
  for (const route of [
    '/billing.sqlite',
    '/../billing.sqlite',
    '/%2e%2e/billing.sqlite',
    '/src/auth.mjs',
    '/api/documents/invoice/known-id.pdf',
  ]) {
    const response = await request(route);
    assert.ok([401, 404].includes(response.status));
    assert.equal((await response.text()).includes('private database sentinel'), false);
  }
});

test('login enforces JSON and exact Origin/Host before accepting credentials', async (t) => {
  const { request, config, db } = await fixture(t);
  const body = JSON.stringify({ email: 'admin@example.test', password: PASSWORD });
  for (const origin of [undefined, 'https://hostile.example', `${config.origin}/`]) {
    const response = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
      body,
    });
    assert.equal(response.status, 403);
  }
  assert.equal(
    (
      await request('/api/login', {
        method: 'POST',
        headers: { Origin: config.origin, 'Content-Type': 'text/plain' },
        body,
      })
    ).status,
    415,
  );
  assert.equal(
    (await rawGet(`${config.origin}/api/health`, { Host: 'hostile.example' })).status,
    421,
  );
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get().count, 0);
});

test('session cookie, protected state, mutation idempotency header and logout form one working flow', async (t) => {
  const { request, signIn, config, calls } = await fixture(t);
  const session = await signIn();
  assert.match(session.setCookie, /HttpOnly/);
  assert.match(session.setCookie, /SameSite=Strict/);
  assert.equal(session.setCookie.includes('Domain='), false);
  const headers = {
    Cookie: session.cookie,
    Origin: config.origin,
    'X-CSRF-Token': session.csrfToken,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'http-test-operation-001',
  };
  const restored = await request('/api/session', { headers });
  assert.equal((await restored.json()).user.email, 'admin@example.test');
  assert.equal((await request('/api/state', { headers })).status, 200);
  const result = await request('/api/commands', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'account.create', payload: { name: 'Synthetic Account' } }),
  });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { result: { id: 'changed-entity' } });
  assert.equal(calls.find((call) => call[0] === 'execute')[3], 'http-test-operation-001');
  assert.equal((await request('/api/logout', { method: 'POST', headers })).status, 200);
  assert.equal((await request('/api/state', { headers })).status, 401);
});

test('missing CSRF, wrong origin, viewer mutation and missing idempotency fail without service writes', async (t) => {
  const { request, signIn, config, calls } = await fixture(t);
  const admin = await signIn();
  const viewer = await signIn('viewer');
  const base = {
    Cookie: admin.cookie,
    Origin: config.origin,
    'X-CSRF-Token': admin.csrfToken,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'rejected-operation-001',
  };
  const body = JSON.stringify({ type: 'account.create', payload: {} });
  for (const [changes, status] of [
    [{ 'X-CSRF-Token': '' }, 403],
    [{ Origin: 'https://hostile.example' }, 403],
    [{ Cookie: viewer.cookie, 'X-CSRF-Token': viewer.csrfToken }, 403],
    [{ 'Idempotency-Key': '' }, 400],
  ]) {
    assert.equal(
      (await request('/api/commands', { method: 'POST', headers: { ...base, ...changes }, body }))
        .status,
      status,
    );
  }
  assert.equal(
    calls.some((call) => call[0] === 'execute'),
    false,
  );
});

test('protected document and export downloads are no-store, role controlled and audited', async (t) => {
  const { request, signIn, calls } = await fixture(t);
  const viewer = await signIn('viewer');
  const admin = await signIn();
  const document = await request('/api/documents/receipt/receipt-1.pdf', {
    headers: { Cookie: viewer.cookie },
  });
  assert.equal(document.status, 200);
  assert.equal(document.headers.get('content-type'), 'application/pdf');
  assert.equal(document.headers.get('cache-control'), 'no-store');
  assert.match(await document.text(), /^%PDF/);
  assert.equal(
    (await request('/api/exports/xero.csv', { headers: { Cookie: viewer.cookie } })).status,
    403,
  );
  const exported = await request('/api/exports/xero.csv', { headers: { Cookie: admin.cookie } });
  assert.equal(exported.status, 200);
  assert.equal(exported.headers.get('x-export-id'), 'export-123');
  assert.equal(calls.filter((call) => call[0] === 'document').length, 1);
  assert.equal(calls.filter((call) => call[0] === 'export').length, 1);
});

test('malformed, oversized fixed/chunked requests are bounded and return actionable errors', async (t) => {
  const { request, signIn, config, calls } = await fixture(t);
  const session = await signIn();
  const headers = {
    Cookie: session.cookie,
    Origin: config.origin,
    'X-CSRF-Token': session.csrfToken,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'invalid-operation-001',
  };
  assert.equal(
    (await request('/api/commands', { method: 'POST', headers, body: '{invalid' })).status,
    400,
  );
  assert.equal(
    (await request('/api/commands', { method: 'POST', headers, body: 'x'.repeat(5000) })).status,
    413,
  );
  const chunked = await new Promise((resolve, reject) => {
    const req = http.request(
      `${config.origin}/api/commands`,
      { method: 'POST', headers },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }),
        );
      },
    );
    req.on('error', reject);
    req.write('x'.repeat(3000));
    req.write('x'.repeat(3000));
    req.end();
  });
  assert.equal(chunked.status, 413);
  assert.match(chunked.body, /BODY_TOO_LARGE/);
  assert.equal(
    calls.some((call) => call[0] === 'execute'),
    false,
  );
});

test('internal failures are redacted, disabled sessions denied, duplicate cookies rejected', async (t) => {
  const { request, signIn, service, auth } = await fixture(t);
  const session = await signIn();
  service.getState = () => {
    throw new Error('SECRET-DATABASE-CONNECTION-DETAIL');
  };
  const response = await request('/api/state', { headers: { Cookie: session.cookie } });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes('SECRET-DATABASE'), false);
  assert.equal(
    (await request('/api/session', { headers: { Cookie: `${session.cookie}; ${session.cookie}` } }))
      .status,
    401,
  );
  auth.disableUser('admin@example.test');
  assert.equal(
    (await request('/api/session', { headers: { Cookie: session.cookie } })).status,
    401,
  );
});

test('configuration fails closed for remote HTTP and unacknowledged HTTPS', () => {
  assert.throws(() => loadConfig({}), /BILLING_DATA_DIR/);
  const env = {
    BILLING_DATA_DIR: path.join(os.tmpdir(), 'rosewood-config-runtime'),
    BILLING_ORIGIN: 'http://billing.example.test',
  };
  assert.throws(() => loadConfig(env), /HTTPS/);
  assert.throws(
    () => loadConfig({ ...env, BILLING_ORIGIN: 'https://billing.example.test' }),
    /gateway/,
  );
  assert.throws(
    () =>
      loadConfig({
        ...env,
        BILLING_ORIGIN: 'https://billing.example.test',
        BILLING_ACCESS_GATEWAY: 'acknowledged',
        BILLING_TRUST_PROXY: 'loopback',
        BILLING_HOST: '0.0.0.0',
      }),
    /loopback bind/,
  );
  const secure = loadConfig({
    ...env,
    BILLING_ORIGIN: 'https://billing.example.test',
    BILLING_ACCESS_GATEWAY: 'acknowledged',
    BILLING_TRUST_PROXY: 'loopback',
  });
  assert.equal(secure.secureCookies, true);
  assert.equal(secure.cookieName, '__Host-rosewood_billing');
  assert.throws(
    () => loadConfig({ BILLING_DEMO: '1', BILLING_DATA_DIR: '/tmp/OneDrive-School/data' }),
    /cloud-sync/,
  );
});

test('HTTPS origin only accepts the explicitly trusted loopback proxy protocol', async (t) => {
  const { config } = await fixture(t);
  const localUrl = `${config.origin}/api/health`;
  config.origin = 'https://billing.example.test';
  config.expectedHost = 'billing.example.test';
  config.secureCookies = true;
  config.trustProxy = false;
  const headers = { Host: 'billing.example.test', 'X-Forwarded-Proto': 'https' };
  assert.equal((await rawGet(localUrl, headers)).status, 403);
  config.trustProxy = true;
  assert.equal((await rawGet(localUrl, { ...headers, 'X-Forwarded-Proto': 'http' })).status, 403);
  const accepted = await rawGet(localUrl, headers);
  assert.equal(accepted.status, 200);
  assert.match(accepted.headers['strict-transport-security'], /max-age=/);
});

test('canonical private runtime supports OS parent symlinks but refuses cloud and database symlinks', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rosewood-config-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const dataDir = path.join(dir, 'data');
  const config = await prepareRuntime(loadConfig({ BILLING_DEMO: '1', BILLING_DATA_DIR: dataDir }));
  assert.equal(config.dataDir, await realpath(dataDir));
  assert.equal((await stat(dataDir)).mode & 0o077, 0);
  const other = path.join(dir, 'other-file');
  await writeFile(other, 'not-a-database');
  await symlink(other, config.databasePath);
  await assert.rejects(prepareRuntime(config), /symbolic link/);
  const cloud = path.join(dir, 'OneDrive-School');
  await mkdir(cloud);
  const alias = path.join(dir, 'innocent-alias');
  await symlink(cloud, alias);
  await assert.rejects(
    prepareRuntime(loadConfig({ BILLING_DEMO: '1', BILLING_DATA_DIR: alias })),
    /cloud-sync/,
  );
});

test('operator creates staff through private stdin without exposing the password and can disable access', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rosewood-staff-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  async function command(args, input = '') {
    const child = spawn(process.execPath, [path.join(APP_ROOT, 'scripts/staff.mjs'), ...args], {
      env: {
        ...process.env,
        BILLING_DEMO: '1',
        BILLING_DATA_DIR: dir,
        BILLING_ORIGIN: 'http://127.0.0.1:4318',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.stdin.end(input);
    const [code] = await once(child, 'close');
    assert.equal(output.includes(PASSWORD), false);
    return { code, output };
  }
  const created = await command(
    [
      'add',
      '--name',
      'Test Operator',
      '--email',
      'operator@example.test',
      '--role',
      'finance',
      '--password-stdin',
    ],
    `${PASSWORD}\n`,
  );
  assert.equal(created.code, 0, created.output);
  assert.match(created.output, /Created operator@example.test/);
  const disabled = await command(['disable', '--email', 'operator@example.test']);
  assert.equal(disabled.code, 0, disabled.output);
  assert.match((await command(['list'])).output, /disabled/);
});
