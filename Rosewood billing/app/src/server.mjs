import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAuth, AuthError } from './auth.mjs';
import { isLoopback, loadConfig, prepareRuntime } from './config.mjs';

const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);

function fail(status, code, message) {
  throw new AuthError(status, code, message);
}
function sameSecret(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function tokenFromCookie(req, name) {
  const raw = req.headers.cookie || '';
  if (typeof raw !== 'string' || raw.length > 8192) return undefined;
  const matches = raw
    .split(';')
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : undefined;
}
function cookie(config, token, maxAge) {
  return `${config.cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secureCookies ? '; Secure' : ''}`;
}
function securityHeaders(res, config) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (config.secureCookies) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}
function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}
async function jsonBody(req, maxBytes) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || ''))
    fail(415, 'JSON_REQUIRED', 'Send this request as application/json.');
  if (req.headers['content-encoding'])
    fail(415, 'ENCODING_UNSUPPORTED', 'Compressed requests are not accepted.');
  const length = req.headers['content-length'];
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes))
    fail(413, 'BODY_TOO_LARGE', 'The request is too large.');
  const chunks = [];
  let size = 0;
  await new Promise((resolve, reject) => {
    function cleanup() {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
    }
    function onData(chunk) {
      size += chunk.length;
      if (size > maxBytes) {
        cleanup();
        req.pause();
        reject(new AuthError(413, 'BODY_TOO_LARGE', 'The request is too large.'));
      } else chunks.push(chunk);
    }
    function onEnd() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new AuthError(400, 'BODY_INTERRUPTED', 'The request was interrupted.'));
    }
    function onAborted() {
      onError();
    }
    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
    req.once('aborted', onAborted);
  });
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail(400, 'INVALID_JSON', 'The request contains invalid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    fail(400, 'INVALID_REQUEST', 'The request must be a JSON object.');
  return parsed;
}

/** The real service rechecks domain permissions. Injected dependencies support HTTP tests. */
export function createBillingServer({
  service,
  auth,
  config,
  renderDocument,
  buildReceivablesCsv,
  buildXeroCsv,
  onError = () => {},
}) {
  const originUrl = new URL(config.origin);
  const server = http.createServer(async (req, res) => {
    securityHeaders(res, config);
    let actor;
    try {
      if (req.headers.host !== (config.expectedHost || originUrl.host))
        fail(421, 'WRONG_HOST', 'Use the configured staff portal address.');
      const network = req.socket.remoteAddress || 'unknown';
      if (!isLoopback(network))
        fail(
          403,
          'PRIVATE_ACCESS_REQUIRED',
          'Staff access must use the configured private gateway.',
        );
      if (
        config.secureCookies &&
        !req.socket.encrypted &&
        !(config.trustProxy && req.headers['x-forwarded-proto'] === 'https')
      )
        fail(403, 'HTTPS_REQUIRED', 'Staff access requires HTTPS.');
      if (!config.secureCookies && req.headers['x-forwarded-proto'])
        fail(403, 'UNEXPECTED_PROXY', 'Use the configured local portal address.');
      const url = new URL(req.url, config.origin);
      if (url.origin !== config.origin) fail(400, 'INVALID_TARGET', 'Invalid request target.');
      const pathname = url.pathname;
      const method = req.method;
      if (method !== 'GET' && method !== 'POST')
        fail(405, 'METHOD_NOT_ALLOWED', 'This method is not supported.');
      if (method === 'POST' && req.headers.origin !== config.origin)
        fail(403, 'ORIGIN_REJECTED', 'The request origin is not allowed.');
      if (method === 'GET' && pathname === '/api/health')
        return sendJson(res, 200, { status: 'ok' });
      if (method === 'GET' && STATIC_FILES.has(pathname)) {
        const [file, mime] = STATIC_FILES.get(pathname);
        const body = await readFile(path.join(config.publicDir, file));
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': body.length });
        return res.end(body);
      }
      if (method === 'POST' && pathname === '/api/login') {
        const body = await jsonBody(req, Math.min(config.maxBodyBytes || 65536, 4096));
        const result = await auth.login({ email: body.email, password: body.password, network });
        res.setHeader(
          'Set-Cookie',
          cookie(
            config,
            result.token,
            Math.max(1, Math.floor((result.expiresAt - Date.now()) / 1000)),
          ),
        );
        return sendJson(res, 200, { user: result.user, csrfToken: result.csrfToken });
      }
      if (!pathname.startsWith('/api/')) fail(404, 'NOT_FOUND', 'This page was not found.');
      const token = tokenFromCookie(req, config.cookieName);
      const session = auth.authenticate(token);
      actor = session.user;
      if (method === 'POST' && !sameSecret(req.headers['x-csrf-token'], session.csrfToken))
        fail(403, 'CSRF_REJECTED', 'The request could not be verified. Refresh and try again.');
      if (method === 'GET' && pathname === '/api/session')
        return sendJson(res, 200, { user: actor, csrfToken: session.csrfToken });
      if (method === 'POST' && pathname === '/api/logout') {
        auth.logout(token);
        res.setHeader('Set-Cookie', cookie(config, '', 0));
        return sendJson(res, 200, { ok: true });
      }
      if (method === 'GET' && pathname === '/api/state')
        return sendJson(res, 200, service.getState(actor));
      if (method === 'POST' && pathname === '/api/commands') {
        const key = req.headers['idempotency-key'];
        if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key))
          fail(
            400,
            'IDEMPOTENCY_REQUIRED',
            'Supply a unique Idempotency-Key of 8 to 128 safe characters.',
          );
        if (actor.role === 'viewer')
          fail(403, 'FORBIDDEN', 'Your staff role cannot change billing records.');
        const body = await jsonBody(req, config.maxBodyBytes || 65536);
        if (
          typeof body.type !== 'string' ||
          body.type.length > 80 ||
          !body.payload ||
          typeof body.payload !== 'object' ||
          Array.isArray(body.payload)
        )
          fail(400, 'INVALID_COMMAND', 'Supply a command type and payload object.');
        const result = service.execute(actor, { type: body.type, payload: body.payload }, key);
        return sendJson(res, 200, { result });
      }
      const document = pathname.match(
        /^\/api\/documents\/(invoice|receipt|credit|statement)\/([A-Za-z0-9_-]{1,100})\.pdf$/,
      );
      if (method === 'GET' && document) {
        const payload = service.getDocument(actor, document[1], document[2]);
        const bytes = await renderDocument(payload);
        if (!Buffer.isBuffer(bytes)) throw new Error('Document renderer did not produce a buffer');
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Length': bytes.length,
          'Content-Disposition': `attachment; filename="rosewood-${document[1]}-${document[2]}.pdf"`,
        });
        return res.end(bytes);
      }
      if (
        method === 'GET' &&
        ['/api/exports/receivables.csv', '/api/exports/xero.csv'].includes(pathname)
      ) {
        if (!['finance', 'admin'].includes(actor.role))
          fail(403, 'FORBIDDEN', 'Finance access is required for accounting exports.');
        const kind = pathname.endsWith('/xero.csv') ? 'xero' : 'receivables';
        const state = service.getState(actor);
        const { csv, metadata } =
          kind === 'xero' ? buildXeroCsv(state) : buildReceivablesCsv(state);
        if (typeof csv !== 'string' || !metadata || typeof metadata !== 'object')
          throw new Error('Invalid export result');
        const manifest = service.recordExport(actor, kind, metadata);
        if (manifest?.id && /^[A-Za-z0-9_-]{1,100}$/.test(manifest.id))
          res.setHeader('X-Export-Id', manifest.id);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rosewood-${kind}.csv"`,
        });
        return res.end(csv);
      }
      fail(404, 'NOT_FOUND', 'This endpoint was not found.');
    } catch (error) {
      if (res.destroyed || res.writableEnded) return;
      const expected =
        Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status < 500 &&
        typeof error.code === 'string';
      const status = expected ? error.status : 500;
      if (status === 403) {
        try {
          auth.auditDenied?.(actor?.id, expected ? error.code : 'denied');
        } catch {
          /* A denied request stays denied if logging fails. */
        }
      }
      if (status === 429 && error.retryAfter)
        res.setHeader('Retry-After', String(Math.max(1, Math.min(3600, error.retryAfter))));
      if (status === 413 || !req.complete) {
        res.setHeader('Connection', 'close');
        req.resume();
      }
      if (!expected) onError({ code: 'INTERNAL_ERROR' });
      sendJson(res, status, {
        error: expected ? error.code : 'INTERNAL_ERROR',
        message: expected
          ? error.message
          : 'The request could not be completed. Please try again or contact the billing operator.',
      });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
  return server;
}

export async function startServer(configInput = loadConfig()) {
  const config = await prepareRuntime(configInput);
  const [
    { openDatabase },
    { createBillingService },
    { renderDocument },
    { buildReceivablesCsv, buildXeroCsv },
  ] = await Promise.all([
    import('./database.mjs'),
    import('./service.mjs'),
    import('./documents.mjs'),
    import('./exports.mjs'),
  ]);
  const db = openDatabase(config.databasePath);
  try {
    const service = createBillingService({ db, demoMode: config.demoMode });
    const auth = createAuth({ db });
    const server = createBillingServer({
      service,
      auth,
      config,
      renderDocument,
      buildReceivablesCsv,
      buildXeroCsv,
      onError: () =>
        process.stderr.write('A billing request failed. Review the private service health.\n'),
    });
    server.once('close', () => db.close());
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, resolve);
    });
    return { server, config, auth, service };
  } catch (error) {
    db.close();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { server, config } = await startServer();
    process.stdout.write(`Rosewood Billing is running at ${config.origin}\n`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Could not start billing server.'}\n`,
    );
    process.exitCode = 1;
  }
}
