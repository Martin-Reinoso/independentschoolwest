import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBackup, inspectBackup } from '../scripts/backup.mjs';

test('online backup includes WAL data, preserves relationships and survives independent reopening', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'rosewood-billing-backup-'));
  const source = join(folder, 'source.sqlite'),
    target = join(folder, 'saved.sqlite');
  const db = new DatabaseSync(source);
  try {
    db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE accounts(id TEXT PRIMARY KEY); CREATE TABLE money(id TEXT PRIMARY KEY, accountId TEXT REFERENCES accounts(id), cents INTEGER NOT NULL);',
    );
    db.prepare('INSERT INTO accounts VALUES(?)').run('synthetic');
    db.prepare('INSERT INTO money VALUES(?,?,?)').run('receipt-1', 'synthetic', 12345);
    const manifest = await createBackup({ sourcePath: source, targetPath: target });
    assert.equal(manifest.rowCounts.money, 1);
    assert.equal(manifest.integrity, 'ok');
    assert.equal(inspectBackup(source).contentSha256, manifest.contentSha256);
    assert.equal(statSync(target).mode & 0o777, 0o600);
    db.prepare('INSERT INTO money VALUES(?,?,?)').run('receipt-2', 'synthetic', 500);
    assert.equal(inspectBackup(target).rowCounts.money, 1);
    assert.equal(inspectBackup(source).rowCounts.money, 2);
    await assert.rejects(
      createBackup({ sourcePath: source, targetPath: target }),
      /already exists/,
    );
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
test('backup rejects cloud-sync destinations and relative paths', async () => {
  await assert.rejects(
    createBackup({ sourcePath: '/tmp/missing.sqlite', targetPath: '/tmp/OneDrive/test.sqlite' }),
    /cloud-sync/,
  );
  await assert.rejects(
    createBackup({ sourcePath: 'private.sqlite', targetPath: '/tmp/backup.sqlite' }),
    /absolute/,
  );
});
test('backup refuses a shared destination without changing its directory permissions', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'rosewood-billing-backup-permissions-'));
  const dbPath = join(folder, 'source.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE test(id INTEGER)');
  db.close();
  const before = statSync('/tmp').mode;
  try {
    await assert.rejects(
      createBackup({
        sourcePath: dbPath,
        targetPath: `/tmp/rosewood-backup-test-${process.pid}.sqlite`,
      }),
      /private backup directory/,
    );
    assert.equal(statSync('/tmp').mode, before);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
