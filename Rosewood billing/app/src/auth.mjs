import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const HASH_OPTIONS = Object.freeze({ N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
export const STAFF_ROLES = Object.freeze(['viewer', 'billing', 'finance', 'admin']);

export class AuthError extends Error {
  constructor(status, code, message, retryAfter) {
    super(message);
    this.status = status;
    this.code = code;
    if (retryAfter) this.retryAfter = retryAfter;
  }
}

const digest = (value) => createHash('sha256').update(value).digest('hex');
const canonicalEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  active: Boolean(row.active),
  revision: row.revision,
  createdAt: row.created_at,
});
const passwordValid = (password) =>
  typeof password === 'string' &&
  [...password].length >= 15 &&
  [...password].length <= 128 &&
  Buffer.byteLength(password) <= 512;

export async function hashPassword(password) {
  if (!passwordValid(password))
    throw new AuthError(400, 'PASSWORD_POLICY', 'Use a password of 15 to 128 characters.');
  return hashSecret(password);
}

async function hashSecret(secret) {
  const salt = randomBytes(16);
  const result = await derive(secret, salt, 32, HASH_OPTIONS);
  return `scrypt$32768$8$3$${salt.toString('hex')}$${result.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const parts = typeof encoded === 'string' ? encoded.split('$') : [];
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== '32768' ||
    parts[2] !== '8' ||
    parts[3] !== '3' ||
    !/^[a-f0-9]{32}$/.test(parts[4]) ||
    !/^[a-f0-9]{64}$/.test(parts[5])
  )
    return false;
  const result = await derive(password, Buffer.from(parts[4], 'hex'), 32, HASH_OPTIONS);
  return timingSafeEqual(result, Buffer.from(parts[5], 'hex'));
}

/** Independent named staff identities; callers own and close the SQLite connection. */
export function createAuth({ db, clock = () => new Date(), limits = {} }) {
  const options = {
    identityAttempts: 5,
    networkAttempts: 30,
    windowMs: 15 * 60_000,
    maxConcurrent: 3,
    absoluteMs: 8 * 60 * 60_000,
    idleMs: 30 * 60_000,
    maxBuckets: 10_000,
    ...limits,
  };
  for (const [key, value] of Object.entries(options)) {
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`Invalid authentication limit: ${key}`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      role TEXT NOT NULL CHECK(role IN ('viewer','billing','finance','admin')),
      password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
      created_at INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1)
    );
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_users(id),
      csrf TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
    CREATE TABLE IF NOT EXISTS auth_login_buckets (
      bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_events (
      id TEXT PRIMARY KEY, action TEXT NOT NULL, actor TEXT NOT NULL,
      subject_id TEXT, outcome TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_commands (
      actor_id TEXT NOT NULL REFERENCES auth_users(id), command_key TEXT NOT NULL,
      command_type TEXT NOT NULL, fingerprint TEXT NOT NULL, secret_hash TEXT,
      result_json TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY(actor_id, command_key)
    );
    CREATE TRIGGER IF NOT EXISTS auth_commands_no_update BEFORE UPDATE ON auth_commands
      BEGIN SELECT RAISE(ABORT, 'Staff command history is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS auth_commands_no_delete BEFORE DELETE ON auth_commands
      BEGIN SELECT RAISE(ABORT, 'Staff command history is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS auth_events_no_update BEFORE UPDATE ON auth_events
      BEGIN SELECT RAISE(ABORT, 'Authentication history is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS auth_events_no_delete BEFORE DELETE ON auth_events
      BEGIN SELECT RAISE(ABORT, 'Authentication history is append-only'); END;
  `);
  // Additive migration preserves existing users, sessions, and audit records.
  db.exec('BEGIN IMMEDIATE');
  try {
    if (
      !db
        .prepare('PRAGMA table_info(auth_users)')
        .all()
        .some((column) => column.name === 'revision')
    )
      db.exec(
        'ALTER TABLE auth_users ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1)',
      );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  let inFlight = 0;
  const dummyHash = `scrypt$32768$8$3$${randomBytes(16).toString('hex')}$${randomBytes(32).toString('hex')}`;
  const now = () => clock().getTime();
  function atomic(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  function event(action, actor, subjectId, outcome) {
    db.prepare('INSERT INTO auth_events VALUES(?,?,?,?,?,?)').run(
      randomUUID(),
      action,
      String(actor).slice(0, 200),
      subjectId ?? null,
      outcome,
      now(),
    );
  }
  async function passwordWork(fn, loginWork = false) {
    if (inFlight >= options.maxConcurrent)
      throw new AuthError(
        429,
        loginWork ? 'LOGIN_BUSY' : 'AUTH_BUSY',
        'Password verification is busy. Please try again shortly.',
        2,
      );
    inFlight += 1;
    try {
      return await fn();
    } finally {
      inFlight -= 1;
    }
  }
  const userById = (id) => db.prepare('SELECT * FROM auth_users WHERE id=?').get(id);
  function findUser(email) {
    const user = db.prepare('SELECT * FROM auth_users WHERE email=?').get(canonicalEmail(email));
    if (!user) throw new AuthError(404, 'STAFF_NOT_FOUND', 'Staff account was not found.');
    return user;
  }
  function validateNameRole(name, role) {
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 120 ||
      /[\x00-\x1f\x7f]/.test(name) ||
      !STAFF_ROLES.includes(role)
    )
      throw new AuthError(400, 'INVALID_STAFF', 'Supply a staff name and valid role.');
  }
  function validateNewUser({ name, email, role }) {
    validateNameRole(name, role);
    email = canonicalEmail(email);
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      /[\x00-\x1f\x7f]/.test(email)
    )
      throw new AuthError(400, 'INVALID_STAFF', 'Supply a valid staff email.');
    return { name: name.trim(), email, role };
  }
  function requireActor(actor, admin, revision) {
    const current = typeof actor?.id === 'string' ? userById(actor.id) : null;
    if (!current?.active || (revision !== undefined && current.revision !== revision))
      throw new AuthError(401, 'AUTH_REQUIRED', 'Your staff access changed. Please sign in again.');
    if (admin && current.role !== 'admin')
      throw new AuthError(403, 'FORBIDDEN', 'Administrator access is required.');
    return current;
  }
  function requireRevision(user, revision) {
    if (!user) throw new AuthError(404, 'STAFF_NOT_FOUND', 'Staff account was not found.');
    if (!Number.isSafeInteger(revision) || revision < 1)
      throw new AuthError(400, 'INVALID_REVISION', 'Supply the current staff revision.');
    if (user.revision !== revision)
      throw new AuthError(
        409,
        'STALE_REVISION',
        'This staff account changed. Refresh and review it.',
      );
  }
  function preserveAdministrator(user, role, active) {
    if (
      user.active &&
      user.role === 'admin' &&
      (!active || role !== 'admin') &&
      db.prepare("SELECT COUNT(*) AS count FROM auth_users WHERE active=1 AND role='admin'").get()
        .count <= 1
    )
      throw new AuthError(
        409,
        'LAST_ADMIN',
        'Keep at least one active administrator. Create or enable another administrator first.',
      );
  }
  function revokeSessions(id) {
    db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(id);
  }
  function insertUser(input, passwordHash, operator) {
    if (db.prepare('SELECT id FROM auth_users WHERE email=?').get(input.email))
      throw new AuthError(409, 'STAFF_EXISTS', 'A staff account with that email already exists.');
    const id = randomUUID();
    db.prepare(
      'INSERT INTO auth_users(id,name,email,role,password_hash,created_at) VALUES(?,?,?,?,?,?)',
    ).run(id, input.name, input.email, input.role, passwordHash, now());
    event('staff.create', operator, id, 'success');
    return publicUser(userById(id));
  }
  function applyUpdate(user, input, operator, action = 'staff.update') {
    requireRevision(user, input.expectedRevision);
    validateNameRole(input.name, input.role);
    if (typeof input.active !== 'boolean')
      throw new AuthError(400, 'INVALID_STAFF', 'Staff active status must be true or false.');
    preserveAdministrator(user, input.role, input.active);
    db.prepare('UPDATE auth_users SET name=?,role=?,active=?,revision=revision+1 WHERE id=?').run(
      input.name.trim(),
      input.role,
      Number(input.active),
      user.id,
    );
    // Every role change revokes sessions, including promotions; new access needs a fresh login.
    if (!input.active || input.role !== user.role) revokeSessions(user.id);
    event(action, operator, user.id, 'success');
    return publicUser(userById(user.id));
  }
  function applyPassword(user, revision, passwordHash, operator, action) {
    requireRevision(user, revision);
    db.prepare('UPDATE auth_users SET password_hash=?,revision=revision+1 WHERE id=?').run(
      passwordHash,
      user.id,
    );
    revokeSessions(user.id);
    event(action, operator, user.id, 'success');
    return publicUser(userById(user.id));
  }
  function rejectLogin() {
    throw new AuthError(401, 'LOGIN_FAILED', 'Email or password was not accepted.');
  }
  function throttle(email, network) {
    const at = now();
    return atomic(() => {
      db.prepare('DELETE FROM auth_login_buckets WHERE window_start <= ?').run(
        at - options.windowMs,
      );
      const buckets = [
        [`identity:${digest(email)}`, options.identityAttempts],
        [`network:${digest(network)}`, options.networkAttempts],
      ];
      let retry = 0;
      for (const [bucket, max] of buckets) {
        const found = db.prepare('SELECT * FROM auth_login_buckets WHERE bucket=?').get(bucket);
        if (found && found.attempts >= max)
          retry = Math.max(retry, Math.ceil((found.window_start + options.windowMs - at) / 1000));
      }
      if (
        retry ||
        db.prepare('SELECT COUNT(*) AS count FROM auth_login_buckets').get().count + 2 >
          options.maxBuckets
      ) {
        return Math.max(retry, 60);
      }
      for (const [bucket] of buckets) {
        db.prepare(
          `INSERT INTO auth_login_buckets VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1`,
        ).run(bucket, at);
      }
      return 0;
    });
  }

  async function addUser({ name, email, role, password }, operator = 'local operator') {
    const input = validateNewUser({ name, email, role });
    const passwordHash = await passwordWork(() => hashPassword(password));
    return atomic(() => insertUser(input, passwordHash, operator));
  }

  async function login({ email, password, network = 'unknown' }) {
    email = canonicalEmail(email).slice(0, 254);
    network = typeof network === 'string' ? network.slice(0, 100) : 'unknown';
    const retry = throttle(email, network);
    if (retry)
      throw new AuthError(
        429,
        'LOGIN_THROTTLED',
        'Too many login attempts. Please try again later.',
        retry,
      );
    return passwordWork(async () => {
      const user = db.prepare('SELECT * FROM auth_users WHERE email=?').get(email);
      // Unknown and disabled identities use the same expensive verification path.
      const safePassword =
        typeof password === 'string' && Buffer.byteLength(password) <= 512 ? password : '';
      const accepted = await verifyPassword(
        safePassword,
        user?.active ? user.password_hash : dummyHash,
      );
      if (!accepted || !user?.active || !passwordValid(password)) {
        event('login', 'anonymous', user?.id, 'failure');
        return rejectLogin();
      }
      return atomic(() => {
        // A disable performed while scrypt was running must prevent session creation.
        const current = userById(user.id);
        if (
          !current?.active ||
          current.revision !== user.revision ||
          current.password_hash !== user.password_hash
        ) {
          event('login', 'anonymous', user.id, 'disabled');
          return { disabled: true };
        }
        const at = now();
        db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ? OR last_seen <= ?').run(
          at,
          at - options.idleMs,
        );
        db.prepare('DELETE FROM auth_login_buckets WHERE bucket=?').run(
          `identity:${digest(email)}`,
        );
        const token = randomBytes(32).toString('base64url');
        const csrfToken = randomBytes(32).toString('base64url');
        db.prepare('INSERT INTO auth_sessions VALUES(?,?,?,?,?,?)').run(
          digest(token),
          user.id,
          csrfToken,
          at,
          at + options.absoluteMs,
          at,
        );
        event('login', user.id, user.id, 'success');
        return { user: publicUser(current), csrfToken, token, expiresAt: at + options.absoluteMs };
      });
    }, true);
  }

  function authenticate(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new AuthError(401, 'AUTH_REQUIRED', 'Please sign in.');
    const hash = digest(token);
    const session = db
      .prepare(
        `SELECT s.*, u.id,u.name,u.email,u.role,u.active,u.revision,u.created_at AS user_created_at FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=?`,
      )
      .get(hash);
    const at = now();
    if (
      !session ||
      !session.active ||
      session.expires_at <= at ||
      session.last_seen + options.idleMs <= at
    ) {
      if (session) db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(hash);
      throw new AuthError(401, 'AUTH_REQUIRED', 'Please sign in.');
    }
    db.prepare('UPDATE auth_sessions SET last_seen=? WHERE token_hash=?').run(at, hash);
    return {
      user: publicUser({ ...session, created_at: session.user_created_at }),
      csrfToken: session.csrf,
      expiresAt: session.expires_at,
    };
  }

  function logout(token) {
    if (typeof token !== 'string') return;
    atomic(() => {
      const hash = digest(token);
      const session = db.prepare('SELECT user_id FROM auth_sessions WHERE token_hash=?').get(hash);
      db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(hash);
      if (session) event('logout', session.user_id, session.user_id, 'success');
    });
  }

  function disableUser(email, operator = 'local operator') {
    return atomic(() => {
      const user = findUser(email);
      return applyUpdate(
        user,
        { name: user.name, role: user.role, active: false, expectedRevision: user.revision },
        operator,
        'staff.disable',
      );
    });
  }

  function updateUser(
    { email, name, role, active, expectedRevision },
    operator = 'local operator',
  ) {
    return atomic(() => {
      const user = findUser(email);
      return applyUpdate(
        user,
        {
          name: name ?? user.name,
          role: role ?? user.role,
          active: active ?? Boolean(user.active),
          expectedRevision: expectedRevision ?? user.revision,
        },
        operator,
      );
    });
  }

  async function resetPassword({ email, password, expectedRevision }, operator = 'local operator') {
    const user = findUser(email);
    const revision = expectedRevision ?? user.revision;
    requireRevision(user, revision);
    const passwordHash = await passwordWork(() => hashPassword(password));
    return atomic(() =>
      applyPassword(userById(user.id), revision, passwordHash, operator, 'staff.resetPassword'),
    );
  }

  function listUsers() {
    return db.prepare('SELECT * FROM auth_users ORDER BY email').all().map(publicUser);
  }

  function listStaff(actor) {
    requireActor(actor, true);
    return listUsers();
  }

  function validateCommand(command, key) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key))
      throw new AuthError(
        400,
        'INVALID_IDEMPOTENCY_KEY',
        'Supply a unique command key of 8 to 128 safe characters.',
      );
    const fields = {
      'staff.create': ['name', 'email', 'role', 'password'],
      'staff.update': ['id', 'expectedRevision', 'name', 'role', 'active'],
      'staff.resetPassword': ['id', 'expectedRevision', 'password'],
      'staff.changePassword': ['currentPassword', 'password'],
    };
    const { type, payload } = command ?? {};
    if (
      !Object.hasOwn(fields, type) ||
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      Object.keys(payload).length !== fields[type].length ||
      Object.keys(payload).some((field) => !fields[type].includes(field))
    )
      throw new AuthError(
        400,
        'INVALID_STAFF_COMMAND',
        'Supply a supported staff command with its required fields.',
      );
    // Only explicitly selected fields may enter the command ledger or password work.
    const input = Object.fromEntries(fields[type].map((field) => [field, payload[field]]));
    if (type === 'staff.create') Object.assign(input, validateNewUser(input));
    if (type === 'staff.update') {
      validateNameRole(input.name, input.role);
      input.name = input.name.trim();
      if (typeof input.active !== 'boolean')
        throw new AuthError(400, 'INVALID_STAFF', 'Staff active status must be true or false.');
    }
    if (
      Object.hasOwn(input, 'id') &&
      (typeof input.id !== 'string' || !input.id || input.id.length > 100)
    )
      throw new AuthError(400, 'INVALID_STAFF', 'Supply a staff account identifier.');
    if (
      Object.hasOwn(input, 'expectedRevision') &&
      (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1)
    )
      throw new AuthError(400, 'INVALID_REVISION', 'Supply the current staff revision.');
    if (Object.hasOwn(input, 'password') && !passwordValid(input.password))
      throw new AuthError(400, 'PASSWORD_POLICY', 'Use a password of 15 to 128 characters.');
    if (
      type === 'staff.changePassword' &&
      (typeof input.currentPassword !== 'string' || Buffer.byteLength(input.currentPassword) > 512)
    )
      throw new AuthError(400, 'INVALID_STAFF_COMMAND', 'Supply your current password.');
    return { type, input };
  }

  async function manageStaff(actor, command, key) {
    const { type, input } = validateCommand(command, key);
    const adminOnly = type !== 'staff.changePassword';
    const initiatingActor = requireActor(actor, adminOnly);
    const actorIdentity = { id: initiatingActor.id };
    const actorRevision = initiatingActor.revision;
    const nonSecretInput = Object.fromEntries(
      Object.entries(input).filter(([field]) => !['password', 'currentPassword'].includes(field)),
    );
    const fingerprint = digest(JSON.stringify([type, nonSecretInput]));
    const secret = Object.hasOwn(input, 'password')
      ? JSON.stringify([input.password, input.currentPassword ?? null])
      : null;
    const recordedCommand = () =>
      db
        .prepare('SELECT * FROM auth_commands WHERE actor_id=? AND command_key=?')
        .get(initiatingActor.id, key);
    function checkFingerprint(record) {
      if (
        record.command_type !== type ||
        record.fingerprint !== fingerprint ||
        Boolean(record.secret_hash) !== Boolean(secret)
      )
        throw new AuthError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This command key was already used for different staff details.',
        );
    }
    async function replay(record, insidePasswordWork = false) {
      checkFingerprint(record);
      if (secret) {
        const verify = () => verifyPassword(secret, record.secret_hash);
        const same = insidePasswordWork ? await verify() : await passwordWork(verify);
        if (!same)
          throw new AuthError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'This command key was already used for different staff details.',
          );
      }
      return atomic(() => {
        requireActor(actorIdentity, adminOnly, actorRevision);
        return { staff: JSON.parse(record.result_json), replayed: true };
      });
    }
    const existing = recordedCommand();
    if (existing) return replay(existing);
    const targetId = type === 'staff.changePassword' ? initiatingActor.id : input.id;
    const initialTarget = targetId ? userById(targetId) : null;
    const targetRevision =
      type === 'staff.changePassword' ? initiatingActor.revision : input.expectedRevision;
    if (type !== 'staff.create') requireRevision(initialTarget, targetRevision);
    function commit(passwordHash, requestSecretHash) {
      return atomic(() => {
        // No await occurs inside the transaction: the authorisation and write are one unit.
        requireActor(actorIdentity, adminOnly, actorRevision);
        const recorded = recordedCommand();
        if (recorded) return { recorded };
        let staff;
        if (type === 'staff.create') staff = insertUser(input, passwordHash, initiatingActor.id);
        else if (type === 'staff.update')
          staff = applyUpdate(userById(targetId), input, initiatingActor.id);
        else
          staff = applyPassword(
            userById(targetId),
            targetRevision,
            passwordHash,
            initiatingActor.id,
            type,
          );
        db.prepare('INSERT INTO auth_commands VALUES(?,?,?,?,?,?,?)').run(
          initiatingActor.id,
          key,
          type,
          fingerprint,
          requestSecretHash,
          JSON.stringify(staff),
          now(),
        );
        return { staff, replayed: false };
      });
    }
    if (!secret) {
      const result = commit(null, null);
      return result.recorded ? replay(result.recorded) : result;
    }
    return passwordWork(async () => {
      if (type === 'staff.changePassword') {
        // Reuse the persistent identity bucket so password guessing cannot bypass login limits.
        const retry = throttle(
          `change-password:${initiatingActor.id}`,
          `change-password:${initiatingActor.id}`,
        );
        if (retry)
          throw new AuthError(
            429,
            'PASSWORD_THROTTLED',
            'Too many password attempts. Please try again later.',
            retry,
          );
        if (!(await verifyPassword(input.currentPassword, initialTarget.password_hash))) {
          event('staff.changePassword', initiatingActor.id, initiatingActor.id, 'failure');
          throw new AuthError(
            401,
            'CURRENT_PASSWORD_FAILED',
            'Your current password was not accepted.',
          );
        }
      }
      const passwordHash = await hashPassword(input.password);
      // A salted, deliberately expensive verifier binds secret fields to retries without
      // keeping plaintext credentials or a fast offline password-guessing digest.
      const requestSecretHash = await hashSecret(secret);
      const result = commit(passwordHash, requestSecretHash);
      return result.recorded ? replay(result.recorded, true) : result;
    });
  }

  return {
    addUser,
    async login(input) {
      const result = await login(input);
      if (result.disabled) rejectLogin();
      return result;
    },
    authenticate,
    logout,
    disableUser,
    updateUser,
    resetPassword,
    listUsers,
    listStaff,
    manageStaff,
    auditDenied(actorId, action) {
      event('access.denied', actorId || 'anonymous', null, String(action).slice(0, 100));
    },
  };
}
