import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createAuth, hashPassword } from '../src/auth.mjs';

const PASSWORD = 'synthetic-test-password-only-42';
function fixture(t, limits = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  let millis = Date.now();
  const auth = createAuth({ db, clock: () => new Date(millis), limits });
  t.after(() => db.close());
  return {
    db,
    auth,
    advance: (ms) => {
      millis += ms;
    },
  };
}
const userInput = (role = 'admin') => ({
  name: 'Synthetic Staff',
  email: `${role}@example.test`,
  role,
  password: PASSWORD,
});
const loginInput = (role = 'admin') => ({
  email: `${role}@example.test`,
  password: PASSWORD,
  network: '127.0.0.1',
});

test('passwords use independently salted explicit scrypt parameters and enforce the policy', async () => {
  const a = await hashPassword(PASSWORD);
  const b = await hashPassword(PASSWORD);
  assert.match(a, /^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.equal(a.includes(PASSWORD), false);
  await assert.rejects(hashPassword('short'), { code: 'PASSWORD_POLICY' });
  await assert.rejects(hashPassword('x'.repeat(129)), { code: 'PASSWORD_POLICY' });
});

test('named accounts normalise identities and constrain roles and duplicates', async (t) => {
  const { auth } = fixture(t);
  const user = await auth.addUser({ ...userInput(), email: ' ADMIN@Example.Test ' });
  assert.equal(user.email, 'admin@example.test');
  await assert.rejects(auth.addUser(userInput()), { code: 'STAFF_EXISTS' });
  await assert.rejects(auth.addUser({ ...userInput(), role: 'superuser' }), {
    code: 'INVALID_STAFF',
  });
  assert.equal(Object.hasOwn(auth.listUsers()[0], 'password_hash'), false);
});

test('opaque sessions are hashed, separate per login, and revoked together when staff is disabled', async (t) => {
  const { auth, db } = fixture(t);
  await auth.addUser(userInput());
  const a = await auth.login(loginInput());
  const b = await auth.login(loginInput());
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.csrfToken, b.csrfToken);
  assert.equal(auth.authenticate(a.token).user.role, 'admin');
  assert.equal(auth.authenticate(a.token).csrfToken, a.csrfToken);
  const rows = db.prepare('SELECT token_hash FROM auth_sessions').all();
  assert.equal(
    rows.some((row) => row.token_hash === a.token || row.token_hash === b.token),
    false,
  );
  auth.disableUser('ADMIN@example.test', 'test operator');
  assert.throws(() => auth.authenticate(a.token), { code: 'AUTH_REQUIRED' });
  assert.throws(() => auth.authenticate(b.token), { code: 'AUTH_REQUIRED' });
  await assert.rejects(auth.login(loginInput()), { code: 'LOGIN_FAILED' });
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get().count, 0);
});

test('session idle and absolute expiry are enforced even with activity', async (t) => {
  const { auth, advance } = fixture(t, { idleMs: 400, absoluteMs: 1000 });
  await auth.addUser(userInput());
  const first = await auth.login(loginInput());
  advance(400);
  assert.throws(() => auth.authenticate(first.token), { code: 'AUTH_REQUIRED' });
  const second = await auth.login(loginInput());
  for (let i = 0; i < 3; i++) {
    advance(300);
    auth.authenticate(second.token);
  }
  advance(100);
  assert.throws(() => auth.authenticate(second.token), { code: 'AUTH_REQUIRED' });
});

test('unknown identity and wrong password return the same public failure', async (t) => {
  const { auth } = fixture(t);
  await auth.addUser(userInput());
  const attempts = [
    auth.login({ ...loginInput(), password: 'incorrect-password-123' }),
    auth.login({ ...loginInput(), email: 'unknown@example.test' }),
  ];
  const results = await Promise.allSettled(attempts);
  assert.deepEqual(
    results.map((result) => [result.reason.status, result.reason.code, result.reason.message]),
    Array(2).fill([401, 'LOGIN_FAILED', 'Email or password was not accepted.']),
  );
});

test('identity and network throttles persist when the auth layer is reconstructed', async (t) => {
  const { auth, db, advance } = fixture(t, {
    identityAttempts: 2,
    networkAttempts: 4,
    windowMs: 1000,
  });
  await assert.rejects(auth.login({ ...loginInput(), password: 'incorrect' }), {
    code: 'LOGIN_FAILED',
  });
  await assert.rejects(auth.login({ ...loginInput(), password: 'incorrect' }), {
    code: 'LOGIN_FAILED',
  });
  const reopened = createAuth({
    db,
    limits: { identityAttempts: 2, networkAttempts: 4, windowMs: 1000 },
  });
  await assert.rejects(
    reopened.login(loginInput()),
    (error) => error.code === 'LOGIN_THROTTLED' && error.retryAfter >= 1,
  );
  await assert.rejects(auth.login({ ...loginInput(), email: 'another@example.test' }), {
    code: 'LOGIN_FAILED',
  });
  await assert.rejects(auth.login({ ...loginInput(), email: 'third@example.test' }), {
    code: 'LOGIN_FAILED',
  });
  await assert.rejects(auth.login({ ...loginInput(), email: 'fourth@example.test' }), {
    code: 'LOGIN_THROTTLED',
  });
  advance(1001);
  await assert.rejects(auth.login(loginInput()), { code: 'LOGIN_FAILED' });
});

test('expensive password work has a concurrency cap and disabling during login prevents access', async (t) => {
  const { auth, db } = fixture(t, { maxConcurrent: 1 });
  await auth.addUser(userInput());
  const running = auth.login(loginInput());
  await assert.rejects(auth.login(loginInput()), { code: 'LOGIN_BUSY' });
  auth.disableUser('admin@example.test');
  await assert.rejects(running, { code: 'LOGIN_FAILED' });
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get().count, 0);
});

test('logout revokes one session and authentication history is append-only', async (t) => {
  const { auth, db } = fixture(t);
  await auth.addUser(userInput());
  const login = await auth.login(loginInput());
  auth.logout(login.token);
  assert.throws(() => auth.authenticate(login.token), { code: 'AUTH_REQUIRED' });
  assert.throws(() => db.exec("UPDATE auth_events SET outcome='changed'"), /append-only/);
  assert.throws(() => db.exec('DELETE FROM auth_events'), /append-only/);
});
