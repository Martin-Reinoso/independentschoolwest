import { randomBytes } from 'node:crypto';
import { chmod, lstat, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createAuth } from '../src/auth.mjs';
import { loadConfig, prepareRuntime } from '../src/config.mjs';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { seedDemo } from '../src/seed.mjs';
import { startServer } from '../src/server.mjs';

let db;
try {
  const config = await prepareRuntime(loadConfig({ ...process.env, BILLING_DEMO: '1' }));
  db = openDatabase(config.databasePath);
  const service = createBillingService({ db, demoMode: true });
  const auth = createAuth({ db });
  const email = 'demo.admin@example.test';
  const credentialPath = path.join(config.dataDir, 'demo-credentials.txt');
  const existing = auth.listUsers().find((user) => user.email === email);
  if (!existing) {
    let password = randomBytes(24).toString('base64url');
    await writeFile(
      credentialPath,
      `Rosewood Billing — local synthetic demo only\nEmail: ${email}\nPassword: ${password}\n\nThis file is private. Do not commit or send it.\n`,
      { flag: 'wx', mode: 0o600 },
    );
    try {
      await auth.addUser(
        { name: 'Demo Administrator', email, role: 'admin', password },
        'demo setup',
      );
    } catch (error) {
      await unlink(credentialPath);
      throw error;
    }
    password = undefined;
  } else {
    if (!existing.active)
      throw new Error(
        'The demo staff account is disabled. Create a named account with the staff operator command.',
      );
    const file = await lstat(credentialPath);
    if (!file.isFile() || file.isSymbolicLink())
      throw new Error('The private demo credential file is unavailable.');
    await chmod(credentialPath, 0o600);
  }
  await seedDemo(service);
  db.close();
  db = undefined;
  const { server } = await startServer(config);
  process.stdout.write(
    `Rosewood Billing sample portal: ${config.origin}\nLogin email: ${email}\nThe random password is in this private file: ${credentialPath}\nSample records persist between runs. Press Ctrl+C to stop.\n`,
  );
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
} catch (error) {
  process.stderr.write(
    `Could not start the billing demo: ${error?.status ? error.message : 'check the local runtime configuration, private credential file and port availability.'}\n`,
  );
  process.exitCode = 1;
} finally {
  db?.close();
}
