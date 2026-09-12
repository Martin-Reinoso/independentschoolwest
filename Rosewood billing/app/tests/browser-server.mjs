import { rmSync } from 'node:fs';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { createAuth } from '../src/auth.mjs';
import { seedDemo } from '../src/seed.mjs';
import { prepareRuntime, loadConfig } from '../src/config.mjs';
import { createBillingServer } from '../src/server.mjs';
import { renderDocument } from '../src/documents.mjs';
import { buildReceivablesCsv, buildXeroCsv } from '../src/exports.mjs';

if (!process.env.BILLING_BROWSER_DATA_DIR || !process.env.BILLING_BROWSER_PASSWORD)
  throw new Error('Run through the browser test configuration.');
const config = await prepareRuntime(
  loadConfig({
    BILLING_DEMO: '1',
    BILLING_DATA_DIR: process.env.BILLING_BROWSER_DATA_DIR,
    BILLING_PORT: '4329',
  }),
);
const db = openDatabase(config.databasePath);
const service = createBillingService({ db, demoMode: true });
seedDemo(service);
const auth = createAuth({ db });
for (const role of ['admin', 'viewer', 'billing', 'finance'])
  await auth.addUser(
    {
      name: `Synthetic ${role}`,
      email: `${role}@example.test`,
      role,
      password: process.env.BILLING_BROWSER_PASSWORD,
    },
    'synthetic browser setup',
  );
const server = createBillingServer({
  service,
  auth,
  config,
  renderDocument,
  buildReceivablesCsv,
  buildXeroCsv,
});
server.listen(config.port, config.host);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    server.close(() => {
      db.close();
      rmSync(config.dataDir, { recursive: true, force: true });
    });
  });
