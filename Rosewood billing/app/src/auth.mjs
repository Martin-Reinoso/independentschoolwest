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
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role });
const passwordValid = (password) =>
  typeof password === 'string' &&
  [...password].length >= 15 &&
  [...password].length <= 128 &&
  Buffer.byteLength(password) <= 512;

export async function hashPassword(password) {
  if (!passwordValid(password))
    throw new AuthError(400, 'PASSWORD_POLICY', 'Use a password of 15 to 128 characters.');
  const salt = randomBytes(16);
  const result = await derive(password, salt, 32, HASH_OPTIONS);
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
      created_at INTEGER NOT NULL
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
    CREATE TRIGGER IF NOT EXISTS auth_events_no_update BEFORE UPDATE ON auth_events
      BEGIN SELECT RAISE(ABORT, 'Authentication history is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS auth_events_no_delete BEFORE DELETE ON auth_events
      BEGIN SELECT RAISE(ABORT, 'Authentication history is append-only'); END;
  `);
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
    email = canonicalEmail(email);
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !STAFF_ROLES.includes(role)
    ) {
      throw new AuthError(400, 'INVALID_STAFF', 'Supply a staff name, email and valid role.');
    }
    const passwordHash = await hashPassword(password);
    return atomic(() => {
      if (db.prepare('SELECT id FROM auth_users WHERE email=?').get(email))
        throw new AuthError(409, 'STAFF_EXISTS', 'A staff account with that email already exists.');
      const user = { id: randomUUID(), name: name.trim(), email, role };
      db.prepare(
        'INSERT INTO auth_users(id,name,email,role,password_hash,created_at) VALUES(?,?,?,?,?,?)',
      ).run(user.id, user.name, user.email, user.role, passwordHash, now());
      event('staff.create', operator, user.id, 'success');
      return user;
    });
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
    if (inFlight >= options.maxConcurrent)
      throw new AuthError(429, 'LOGIN_BUSY', 'Login is busy. Please try again shortly.', 2);
    inFlight += 1;
    try {
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
        if (!db.prepare('SELECT active FROM auth_users WHERE id=?').get(user.id)?.active) {
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
        return { user: publicUser(user), csrfToken, token, expiresAt: at + options.absoluteMs };
      });
    } finally {
      inFlight -= 1;
    }
  }

  function authenticate(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new AuthError(401, 'AUTH_REQUIRED', 'Please sign in.');
    const hash = digest(token);
    const session = db
      .prepare(
        `SELECT s.*, u.id,u.name,u.email,u.role,u.active FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=?`,
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
    return { user: publicUser(session), csrfToken: session.csrf, expiresAt: session.expires_at };
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
      const user = db.prepare('SELECT * FROM auth_users WHERE email=?').get(canonicalEmail(email));
      if (!user) throw new AuthError(404, 'STAFF_NOT_FOUND', 'Staff account was not found.');
      db.prepare('UPDATE auth_users SET active=0 WHERE id=?').run(user.id);
      db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(user.id);
      event('staff.disable', operator, user.id, 'success');
      return publicUser(user);
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
    listUsers() {
      return db
        .prepare(
          'SELECT id,name,email,role,active,created_at AS createdAt FROM auth_users ORDER BY email',
        )
        .all();
    },
    auditDenied(actorId, action) {
      event('access.denied', actorId || 'anonymous', null, String(action).slice(0, 100));
    },
  };
}
