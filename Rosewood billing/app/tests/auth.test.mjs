import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  await auth.addUser(userInput('viewer'));
  const a = await auth.login(loginInput('viewer'));
  const b = await auth.login(loginInput('viewer'));
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.csrfToken, b.csrfToken);
  assert.equal(auth.authenticate(a.token).user.role, 'viewer');
  assert.equal(auth.authenticate(a.token).csrfToken, a.csrfToken);
  const rows = db.prepare('SELECT token_hash FROM auth_sessions').all();
  assert.equal(
    rows.some((row) => row.token_hash === a.token || row.token_hash === b.token),
    false,
  );
  auth.disableUser('VIEWER@example.test', 'test operator');
  assert.throws(() => auth.authenticate(a.token), { code: 'AUTH_REQUIRED' });
  assert.throws(() => auth.authenticate(b.token), { code: 'AUTH_REQUIRED' });
  await assert.rejects(auth.login(loginInput('viewer')), { code: 'LOGIN_FAILED' });
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
  await auth.addUser(userInput('viewer'));
  const running = auth.login(loginInput('viewer'));
  await assert.rejects(auth.login(loginInput('viewer')), { code: 'LOGIN_BUSY' });
  auth.disableUser('viewer@example.test');
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

const NEW_PASSWORD = 'another-synthetic-password-for-tests-73';
const updateCommand = (user, changes = {}) => ({
  type: 'staff.update',
  payload: {
    id: user.id,
    expectedRevision: user.revision,
    name: user.name,
    role: user.role,
    active: user.active,
    ...changes,
  },
});
const resetCommand = (user, password = NEW_PASSWORD) => ({
  type: 'staff.resetPassword',
  payload: { id: user.id, expectedRevision: user.revision, password },
});

test('legacy authentication schema receives an additive staff revision migration', async (t) => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`CREATE TABLE auth_users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`);
  const hash = await hashPassword(PASSWORD);
  db.prepare('INSERT INTO auth_users VALUES(?,?,?,?,?,?,?)').run(
    'legacy-admin',
    'Legacy Staff',
    'admin@example.test',
    'admin',
    hash,
    1,
    123,
  );
  const auth = createAuth({ db });
  assert.equal(auth.listUsers()[0].revision, 1);
  assert.equal(auth.listUsers()[0].createdAt, 123);
  assert.equal((await auth.login(loginInput())).user.id, 'legacy-admin');
  assert.equal(createAuth({ db }).listUsers()[0].revision, 1);
});

test('staff lists and commands use database permissions and expose only safe fields', async (t) => {
  const { auth } = fixture(t);
  const admin = await auth.addUser(userInput());
  const viewer = await auth.addUser(userInput('viewer'));
  assert.deepEqual(Object.keys(auth.listStaff(admin)[0]).sort(), [
    'active',
    'createdAt',
    'email',
    'id',
    'name',
    'revision',
    'role',
  ]);
  assert.equal(typeof auth.listStaff(admin)[0].active, 'boolean');
  assert.throws(() => auth.listStaff({ ...viewer, role: 'admin' }), { code: 'FORBIDDEN' });
  await assert.rejects(
    auth.manageStaff({ ...viewer, role: 'admin' }, updateCommand(admin), 'viewer-forged-role'),
    { code: 'FORBIDDEN' },
  );
  auth.disableUser(viewer.email);
  assert.throws(() => auth.listStaff({ ...viewer, role: 'admin' }), { code: 'AUTH_REQUIRED' });
  await assert.rejects(
    auth.manageStaff(
      admin,
      { type: 'staff.update', payload: { ...updateCommand(viewer).payload, password: PASSWORD } },
      'unexpected-field',
    ),
    { code: 'INVALID_STAFF_COMMAND' },
  );
});

test('staff creation retries survive reconstruction and bind credentials without storing plaintext', async (t) => {
  const { auth, db } = fixture(t);
  const admin = await auth.addUser(userInput());
  const command = { type: 'staff.create', payload: userInput('billing') };
  const first = await auth.manageStaff(admin, command, 'create-billing-1');
  assert.equal(first.replayed, false);
  assert.equal(first.staff.revision, 1);
  const reconstructed = createAuth({ db });
  const repeated = await reconstructed.manageStaff(admin, command, 'create-billing-1');
  assert.deepEqual(repeated, { staff: first.staff, replayed: true });
  await assert.rejects(
    auth.manageStaff(
      admin,
      { ...command, payload: { ...command.payload, password: NEW_PASSWORD } },
      'create-billing-1',
    ),
    { code: 'IDEMPOTENCY_CONFLICT' },
  );
  await assert.rejects(
    auth.manageStaff(
      admin,
      { ...command, payload: { ...command.payload, role: 'finance' } },
      'create-billing-1',
    ),
    { code: 'IDEMPOTENCY_CONFLICT' },
  );
  assert.equal(auth.listUsers().length, 2);
  const persisted = JSON.stringify({
    users: db.prepare('SELECT * FROM auth_users').all(),
    commands: db.prepare('SELECT * FROM auth_commands').all(),
    events: db.prepare('SELECT * FROM auth_events').all(),
  });
  assert.equal(persisted.includes(PASSWORD), false);
  assert.equal(persisted.includes(NEW_PASSWORD), false);
  assert.match(
    db.prepare('SELECT secret_hash FROM auth_commands').get().secret_hash,
    /^scrypt\$32768\$8\$3\$/,
  );
  assert.throws(() => db.exec("UPDATE auth_commands SET result_json='{}'"), /append-only/);
  assert.throws(() => db.exec('DELETE FROM auth_commands'), /append-only/);
});

test('simultaneous identical create requests produce one user and one command record', async (t) => {
  const { auth, db } = fixture(t);
  const admin = await auth.addUser(userInput());
  const command = { type: 'staff.create', payload: userInput('finance') };
  const results = await Promise.all([
    auth.manageStaff(admin, command, 'parallel-create-1'),
    auth.manageStaff(admin, command, 'parallel-create-1'),
  ]);
  assert.equal(results[0].staff.id, results[1].staff.id);
  assert.deepEqual(results.map((result) => result.replayed).sort(), [false, true]);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_commands').get().count, 1);
  assert.equal(auth.listUsers().length, 2);
});

test('staff updates reject stale writes, preserve the final administrator, and revoke changed access', async (t) => {
  const { auth } = fixture(t);
  const admin = await auth.addUser(userInput());
  const session = await auth.login(loginInput());
  await assert.rejects(
    auth.manageStaff(admin, updateCommand(admin, { active: false }), 'disable-last-admin'),
    { code: 'LAST_ADMIN' },
  );
  await assert.rejects(
    auth.manageStaff(admin, updateCommand(admin, { role: 'viewer' }), 'demote-last-admin'),
    { code: 'LAST_ADMIN' },
  );
  assert.throws(() => auth.disableUser(admin.email), { code: 'LAST_ADMIN' });
  assert.throws(() => auth.updateUser({ email: admin.email, role: 'finance' }), {
    code: 'LAST_ADMIN',
  });
  const other = await auth.addUser({ ...userInput(), email: 'second-admin@example.test' });
  const changed = await auth.manageStaff(
    other,
    updateCommand(admin, { role: 'finance' }),
    'demote-first-admin',
  );
  assert.equal(changed.staff.revision, 2);
  assert.throws(() => auth.authenticate(session.token), { code: 'AUTH_REQUIRED' });
  await assert.rejects(
    auth.manageStaff(other, updateCommand(admin, { name: 'Stale name' }), 'stale-staff-update'),
    { code: 'STALE_REVISION' },
  );
  assert.equal(auth.listStaff(other).find((user) => user.id === admin.id).name, admin.name);
  await assert.rejects(
    auth.manageStaff(other, updateCommand(other, { active: false }), 'disable-final-admin'),
    { code: 'LAST_ADMIN' },
  );
});

test('name-only changes retain sessions while disable and enable are audited revisions', async (t) => {
  const { auth, db } = fixture(t);
  const admin = await auth.addUser(userInput());
  const viewer = await auth.addUser(userInput('viewer'));
  const login = await auth.login(loginInput('viewer'));
  const named = await auth.manageStaff(
    admin,
    updateCommand(viewer, { name: 'Updated Viewer' }),
    'rename-staff-viewer',
  );
  assert.equal(auth.authenticate(login.token).user.name, 'Updated Viewer');
  const disabled = await auth.manageStaff(
    admin,
    updateCommand(named.staff, { active: false }),
    'disable-staff-viewer',
  );
  assert.equal(disabled.staff.active, false);
  assert.throws(() => auth.authenticate(login.token), { code: 'AUTH_REQUIRED' });
  const enabled = auth.updateUser({
    email: viewer.email,
    active: true,
    expectedRevision: disabled.staff.revision,
  });
  assert.equal(enabled.active, true);
  assert.equal(enabled.revision, 4);
  assert.equal((await auth.login(loginInput('viewer'))).user.revision, 4);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM auth_events WHERE action='staff.update'").get().count,
    3,
  );
});

test('administrator password reset revokes every session, is retryable, and preserves disabled status', async (t) => {
  const { auth } = fixture(t);
  const admin = await auth.addUser(userInput());
  const viewer = await auth.addUser(userInput('viewer'));
  const a = await auth.login(loginInput('viewer'));
  const b = await auth.login(loginInput('viewer'));
  const command = resetCommand(viewer);
  const reset = await auth.manageStaff(admin, command, 'reset-staff-viewer');
  assert.equal(reset.staff.revision, 2);
  assert.throws(() => auth.authenticate(a.token), { code: 'AUTH_REQUIRED' });
  assert.throws(() => auth.authenticate(b.token), { code: 'AUTH_REQUIRED' });
  await assert.rejects(auth.login(loginInput('viewer')), { code: 'LOGIN_FAILED' });
  assert.equal(
    (await auth.login({ ...loginInput('viewer'), password: NEW_PASSWORD })).user.id,
    viewer.id,
  );
  assert.equal((await auth.manageStaff(admin, command, 'reset-staff-viewer')).replayed, true);
  auth.disableUser(viewer.email);
  const disabledReset = await auth.resetPassword({ email: viewer.email, password: PASSWORD });
  assert.equal(disabledReset.active, false);
  await assert.rejects(auth.login(loginInput('viewer')), { code: 'LOGIN_FAILED' });
});

test('a viewer may change their own password only with their current password', async (t) => {
  const { auth } = fixture(t);
  const viewer = await auth.addUser(userInput('viewer'));
  const login = await auth.login(loginInput('viewer'));
  const change = {
    type: 'staff.changePassword',
    payload: { currentPassword: PASSWORD, password: NEW_PASSWORD },
  };
  await assert.rejects(
    auth.manageStaff(
      viewer,
      { ...change, payload: { ...change.payload, currentPassword: 'incorrect' } },
      'self-wrong-password',
    ),
    { code: 'CURRENT_PASSWORD_FAILED' },
  );
  assert.equal(auth.authenticate(login.token).user.revision, 1);
  const changed = await auth.manageStaff(viewer, change, 'self-change-password');
  assert.equal(changed.staff.revision, 2);
  assert.throws(() => auth.authenticate(login.token), { code: 'AUTH_REQUIRED' });
  const fresh = await auth.login({ ...loginInput('viewer'), password: NEW_PASSWORD });
  assert.equal((await auth.manageStaff(fresh.user, change, 'self-change-password')).replayed, true);
  await assert.rejects(auth.login(loginInput('viewer')), { code: 'LOGIN_FAILED' });
});

test('current-password guessing is persistently throttled', async (t) => {
  const { auth, db } = fixture(t, { identityAttempts: 2 });
  const viewer = await auth.addUser(userInput('viewer'));
  const command = {
    type: 'staff.changePassword',
    payload: { currentPassword: 'incorrect', password: NEW_PASSWORD },
  };
  await assert.rejects(auth.manageStaff(viewer, command, 'current-attempt-1'), {
    code: 'CURRENT_PASSWORD_FAILED',
  });
  await assert.rejects(auth.manageStaff(viewer, command, 'current-attempt-2'), {
    code: 'CURRENT_PASSWORD_FAILED',
  });
  const reopened = createAuth({ db, limits: { identityAttempts: 2 } });
  await assert.rejects(reopened.manageStaff(viewer, command, 'current-attempt-3'), {
    code: 'PASSWORD_THROTTLED',
  });
  assert.equal(auth.listUsers()[0].revision, 1);
});

test('demotion or disable during password work prevents a formerly authorised admin committing', async (t) => {
  const { auth, db } = fixture(t);
  const admin = await auth.addUser(userInput());
  await auth.addUser({ ...userInput(), email: 'backup-admin@example.test' });
  const creating = auth.manageStaff(
    admin,
    { type: 'staff.create', payload: userInput('billing') },
    'pending-create-demote',
  );
  auth.updateUser({ email: admin.email, role: 'viewer' });
  await assert.rejects(creating, { code: 'AUTH_REQUIRED' });
  assert.equal(
    auth.listUsers().some((user) => user.email === 'billing@example.test'),
    false,
  );
  const restored = auth.updateUser({ email: admin.email, role: 'admin' });
  const resetting = auth.manageStaff(restored, resetCommand(restored), 'pending-reset-disable');
  auth.disableUser(admin.email);
  await assert.rejects(resetting, { code: 'AUTH_REQUIRED' });
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_commands').get().count, 0);
});

test('password reset rechecks target revisions after hashing and shares the login concurrency budget', async (t) => {
  const { auth } = fixture(t, { maxConcurrent: 1 });
  const admin = await auth.addUser(userInput());
  const viewer = await auth.addUser(userInput('viewer'));
  const resetting = auth.manageStaff(admin, resetCommand(viewer), 'pending-target-reset');
  await assert.rejects(auth.login(loginInput()), { code: 'LOGIN_BUSY' });
  await assert.rejects(auth.addUser(userInput('finance')), { code: 'AUTH_BUSY' });
  auth.updateUser({ email: viewer.email, name: 'Renamed while hashing' });
  await assert.rejects(resetting, { code: 'STALE_REVISION' });
  assert.equal((await auth.login(loginInput('viewer'))).user.name, 'Renamed while hashing');
});

test('login cannot issue a session for credentials or access changed during verification', async (t) => {
  const { auth, db } = fixture(t);
  const admin = await auth.addUser(userInput());
  const replacement = await hashPassword(NEW_PASSWORD);
  const loggingIn = auth.login(loginInput());
  db.prepare('UPDATE auth_users SET password_hash=?,revision=revision+1 WHERE id=?').run(
    replacement,
    admin.id,
  );
  await assert.rejects(loggingIn, { code: 'LOGIN_FAILED' });
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get().count, 0);
  assert.equal((await auth.login({ ...loginInput(), password: NEW_PASSWORD })).user.revision, 2);
});

test('operator CLI privately creates and recovers staff without exposing passwords or removing the final admin', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rosewood-staff-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const script = fileURLToPath(new URL('../scripts/staff.mjs', import.meta.url));
  const env = {
    ...process.env,
    BILLING_DATA_DIR: dir,
    BILLING_DEMO: '0',
    BILLING_HOST: '127.0.0.1',
    BILLING_PORT: '4318',
    BILLING_ORIGIN: 'http://127.0.0.1:4318',
  };
  async function cli(args, password) {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script, ...args], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk;
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
      });
      child.once('error', reject);
      child.once('close', (code) => resolve({ code, output }));
      child.stdin.end(password === undefined ? '' : `${password}\n`);
    });
    assert.equal(result.output.includes(PASSWORD), false);
    assert.equal(result.output.includes(NEW_PASSWORD), false);
    return result;
  }
  for (const role of ['admin', 'viewer']) {
    const created = await cli(
      [
        'add',
        '--name',
        `Synthetic ${role}`,
        '--email',
        `${role}@example.test`,
        '--role',
        role,
        '--password-stdin',
      ],
      PASSWORD,
    );
    assert.equal(created.code, 0, created.output);
  }
  assert.equal(
    (await cli(['reset', '--email', 'viewer@example.test', '--password-stdin'], NEW_PASSWORD)).code,
    0,
  );
  assert.equal((await cli(['disable', '--email', 'viewer@example.test'])).code, 0);
  assert.equal((await cli(['enable', '--email', 'viewer@example.test'])).code, 0);
  assert.equal(
    (
      await cli([
        'update',
        '--email',
        'viewer@example.test',
        '--name',
        'Recovered Staff',
        '--role',
        'finance',
      ])
    ).code,
    0,
  );
  const listed = await cli(['list']);
  assert.equal(listed.code, 0);
  assert.match(listed.output, /viewer@example\.test\tRecovered Staff\tfinance\tactive\trevision 5/);
  const prevented = await cli(['disable', '--email', 'admin@example.test']);
  assert.equal(prevented.code, 1);
  assert.match(prevented.output, /Keep at least one active administrator/);
  const db = new DatabaseSync(path.join(dir, 'billing.sqlite'));
  try {
    const auth = createAuth({ db });
    await assert.rejects(auth.login(loginInput('viewer')), { code: 'LOGIN_FAILED' });
    assert.equal(
      (await auth.login({ ...loginInput('viewer'), password: NEW_PASSWORD })).user.role,
      'finance',
    );
  } finally {
    db.close();
  }
});
