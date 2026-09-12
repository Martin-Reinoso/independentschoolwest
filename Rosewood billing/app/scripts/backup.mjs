import { DatabaseSync, backup } from 'node:sqlite';
import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
function privatePath(path) {
  if (!isAbsolute(path))
    throw new Error('Use an absolute private path outside the repository and cloud-sync folders.');
  let target = resolve(path);
  const prohibited = (value) =>
    value === REPO ||
    value.startsWith(REPO + '/') ||
    /(?:OneDrive|CloudStorage|Dropbox|Mobile Documents|Google Drive)/i.test(value);
  if (prohibited(target))
    throw new Error('Database and backup files must be outside repository/cloud-sync folders.');
  if (existsSync(target) && lstatSync(target).isSymbolicLink())
    throw new Error('Symbolic links are not accepted for database or backup paths.');
  let ancestor = dirname(target);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  target = resolve(realpathSync(ancestor), relative(ancestor, target));
  if (prohibited(target))
    throw new Error('Database and backup files must be outside repository/cloud-sync folders.');
  return target;
}
export function inspectBackup(path) {
  const database = new DatabaseSync(privatePath(path), { readOnly: true });
  try {
    const integrity = database.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok')
      throw new Error('Backup integrity check failed.');
    if (database.prepare('PRAGMA foreign_key_check').all().length)
      throw new Error('Backup relationships failed validation.');
    const rowCounts = {},
      digest = createHash('sha256');
    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all();
    for (const { name } of tables) {
      const sqlName = '"' + name.replaceAll('"', '""') + '"';
      const rows = database
        .prepare(`SELECT * FROM ${sqlName}`)
        .all()
        .map((row) => JSON.stringify(row))
        .sort();
      rowCounts[name] = rows.length;
      digest.update(name + '\n' + rows.join('\n') + '\n');
    }
    return { schemaVersion: 1, integrity: 'ok', rowCounts, contentSha256: digest.digest('hex') };
  } finally {
    database.close();
  }
}

export async function createBackup({ sourcePath, targetPath }) {
  const source = privatePath(sourcePath),
    target = privatePath(targetPath);
  if (source === target || existsSync(target) || existsSync(target + '.manifest.json'))
    throw new Error('Backup destination already exists; choose a new filename.');
  if (!existsSync(source)) throw new Error('Source database does not exist.');
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const parent = statSync(dirname(target));
  if (
    (parent.mode & 0o077) !== 0 ||
    (typeof process.getuid === 'function' && parent.uid !== process.getuid())
  )
    throw new Error(
      'Choose a private backup directory owned by this account with permissions 0700.',
    );
  closeSync(openSync(target, 'wx', 0o600));
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    await backup(db, target);
  } finally {
    db.close();
  }
  chmodSync(target, 0o600);
  const result = {
    ...inspectBackup(target),
    createdAt: new Date().toISOString(),
    fileSha256: createHash('sha256').update(readFileSync(target)).digest('hex'),
  };
  writeFileSync(target + '.manifest.json', JSON.stringify(result, null, 2) + '\n', {
    mode: 0o600,
    flag: 'wx',
  });
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === '--verify') {
      const target = process.argv[3];
      const expected = JSON.parse(readFileSync(privatePath(target) + '.manifest.json', 'utf8'));
      const actual = inspectBackup(target);
      const fileSha256 = createHash('sha256').update(readFileSync(target)).digest('hex');
      if (actual.contentSha256 !== expected.contentSha256 || fileSha256 !== expected.fileSha256)
        throw new Error('Backup differs from its manifest.');
      console.log('Backup integrity, relationships and manifest verified.');
    } else {
      const dataDir = process.env.BILLING_DATA_DIR;
      if (!dataDir)
        throw new Error('Set BILLING_DATA_DIR to the existing private runtime directory.');
      const target =
        process.argv[2] ||
        join(dataDir, 'backups', `billing-${new Date().toISOString().replaceAll(':', '-')}.sqlite`);
      await createBackup({ sourcePath: join(dataDir, 'billing.sqlite'), targetPath: target });
      console.log(`Verified private backup: ${target}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
