import { rmSync } from 'node:fs';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { createAuth } from '../src/auth.mjs';
import { seedDemo } from '../src/seed.mjs';
import { prepareRuntime, loadConfig } from '../src/config.mjs';
import { createBillingServer } from '../src/server.mjs';
import { renderDocument } from '../src/documents.mjs';
import { buildReceivablesCsv, buildXeroCsv } from '../src/exports.mjs';
import { createCommunications } from '../src/communications.mjs';

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
const communications = createCommunications({ db, service });
// These fixtures exist only in this disposable browser harness. They exercise
// provider-outcome recovery through real domain records without any network send.
const fixtureActor = {
  id: 'synthetic-outbox-fixtures',
  name: 'Synthetic outbox fixture setup',
  role: 'admin',
};
const fixtureToday = service.getState(fixtureActor).today;
for (const outcome of ['accepted', 'uncertain']) {
  const prefix = `synthetic-outbox-${outcome}`;
  const execute = (type, payload) =>
    service.execute(fixtureActor, { type, payload }, `${prefix}-${type}`);
  const account = execute('account.create', {
    name: `Synthetic ${outcome} outbox fixture`,
    billingName: `Synthetic ${outcome} fixture payer`,
    email: `${prefix}@example.test`,
    address: 'Synthetic test fixture address, VIC 3000',
    contactAllowed: true,
    xeroContactName: `Synthetic ${outcome} outbox contact`,
  });
  const draft = execute('invoice.create', {
    accountId: account.id,
    issueDate: fixtureToday,
    dueDate: fixtureToday,
    year: Number(fixtureToday.slice(0, 4)),
    term: 'OUTBOX-TEST',
    description: `Synthetic ${outcome} outbox fixture invoice`,
    lines: [
      {
        description: 'Synthetic test-only fee',
        quantity: 1,
        unitCents: 100,
        discountCents: 0,
        taxCode: 'NO_GST',
        category: 'tuition',
        accountCode: '200',
      },
    ],
  });
  const invoice = execute('invoice.issue', { id: draft.id, expectedRevision: draft.revision });
  const message = communications.execute(
    fixtureActor,
    { type: 'communication.create', payload: { kind: 'invoice', documentId: invoice.id } },
    `${prefix}-create`,
  );
  communications.execute(
    fixtureActor,
    {
      type: 'communication.approve',
      payload: { id: message.id, expectedRevision: message.revision },
    },
    `${prefix}-approve`,
  );
  const claim = communications.claimNext();
  if (
    claim?.message.id !== message.id ||
    !communications.validateClaim({
      id: message.id,
      attemptId: claim.attemptId,
      leaseToken: claim.leaseToken,
    })
  )
    throw new Error('Synthetic outbox fixture could not be prepared.');
  communications.finishAttempt({
    id: message.id,
    attemptId: claim.attemptId,
    leaseToken: claim.leaseToken,
    outcome,
    providerId: outcome === 'accepted' ? 'SYNTHETIC-NO-NETWORK-PROVIDER-ID' : '',
    errorCode: outcome === 'uncertain' ? 'SYNTHETIC_PROVIDER_TIMEOUT' : '',
  });
}
const auth = createAuth({ db, limits: { identityAttempts: 100, networkAttempts: 300 } });
// This disposable harness signs the same synthetic roles in repeatedly. Production
// limits remain covered by auth tests and use the defaults in startServer.
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
  communications,
});
server.listen(config.port, config.host);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    server.close(() => {
      db.close();
      rmSync(config.dataDir, { recursive: true, force: true });
    });
  });
