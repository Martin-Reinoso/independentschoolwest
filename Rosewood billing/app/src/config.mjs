import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { mkdir, realpath, stat, chmod } from 'node:fs/promises';

export const APP_ROOT = fileURLToPath(new URL('../', import.meta.url));
const REPOSITORY_ROOT = path.resolve(APP_ROOT, '../..');
export const isLoopback = (value) =>
  ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'].includes(value);
const within = (base, target) => target === base || target.startsWith(`${base}${path.sep}`);

function assertPrivatePath(target) {
  if (
    within(REPOSITORY_ROOT, target) ||
    /(?:^|[/\\])(?:CloudStorage|[^/\\]*OneDrive[^/\\]*|Dropbox|Google Drive|GoogleDrive|Mobile Documents|iCloud Drive)(?:[/\\]|$)/i.test(
      target,
    )
  ) {
    throw new Error('Billing storage must be outside the repository and cloud-sync folders.');
  }
}

export function loadConfig(env = process.env) {
  const demoMode = env.BILLING_DEMO === '1';
  const port = Number(env.BILLING_PORT || 4318);
  const host = env.BILLING_HOST || '127.0.0.1';
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535)
    throw new Error('BILLING_PORT must be a port from 1 to 65535.');
  if (!isLoopback(host))
    throw new Error('This release requires a loopback bind behind any HTTPS access gateway.');
  if (!demoMode && !env.BILLING_DATA_DIR)
    throw new Error('Set BILLING_DATA_DIR to a private absolute runtime directory.');
  if (!demoMode && !env.BILLING_ORIGIN)
    throw new Error('Set BILLING_ORIGIN to the exact staff portal origin.');
  const dataDir =
    env.BILLING_DATA_DIR || path.join(os.homedir(), '.local', 'share', 'rosewood-billing', 'demo');
  if (!path.isAbsolute(dataDir)) throw new Error('BILLING_DATA_DIR must be absolute.');
  assertPrivatePath(path.resolve(dataDir));
  let url;
  try {
    url = new URL(env.BILLING_ORIGIN || `http://${host === '::1' ? '[::1]' : host}:${port}`);
  } catch {
    throw new Error('BILLING_ORIGIN must be a valid http or https origin.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (env.BILLING_ORIGIN && env.BILLING_ORIGIN !== url.origin)
  )
    throw new Error(
      'BILLING_ORIGIN must contain only an exact origin, without a path or trailing slash.',
    );
  const secureCookies = url.protocol === 'https:';
  if (demoMode && (secureCookies || !isLoopback(url.hostname.replaceAll(/\[|\]/g, ''))))
    throw new Error('The sample demo is available only on local loopback HTTP.');
  if (!secureCookies && !isLoopback(url.hostname.replaceAll(/\[|\]/g, '')))
    throw new Error('Remote staff access requires HTTPS.');
  const trustProxy = env.BILLING_TRUST_PROXY === 'loopback';
  if (secureCookies && (env.BILLING_ACCESS_GATEWAY !== 'acknowledged' || !trustProxy))
    throw new Error(
      'HTTPS hosting requires an acknowledged school MFA/private access gateway and BILLING_TRUST_PROXY=loopback.',
    );
  return {
    demoMode,
    port,
    host,
    dataDir: path.resolve(dataDir),
    databasePath: path.join(path.resolve(dataDir), 'billing.sqlite'),
    origin: url.origin,
    expectedHost: url.host,
    secureCookies,
    trustProxy,
    cookieName: secureCookies ? '__Host-rosewood_billing' : 'rosewood_billing_local',
    maxBodyBytes: 64 * 1024,
    publicDir: path.join(APP_ROOT, 'public'),
    assetsDir: path.join(APP_ROOT, 'assets'),
  };
}

export async function prepareRuntime(config) {
  process.umask(0o077);
  await mkdir(config.dataDir, { recursive: true, mode: 0o700 });
  const resolved = await realpath(config.dataDir);
  assertPrivatePath(resolved);
  const info = await stat(resolved);
  if (
    !info.isDirectory() ||
    (typeof process.getuid === 'function' && info.uid !== process.getuid())
  )
    throw new Error('Billing storage must be a directory owned by this operating-system account.');
  await chmod(resolved, 0o700);
  const databasePath = path.join(resolved, 'billing.sqlite');
  try {
    const dbRealpath = await realpath(databasePath);
    if (dbRealpath !== databasePath)
      throw new Error('The billing database must not be a symbolic link.');
    await chmod(databasePath, 0o600);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { ...config, dataDir: resolved, databasePath };
}
