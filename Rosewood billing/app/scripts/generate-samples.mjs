import { mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { seedDemo } from '../src/seed.mjs';
import { renderDocument } from '../src/documents.mjs';

const output = resolve(process.argv[2] || join(tmpdir(), 'rosewood-billing-document-qa'));
mkdirSync(output, { recursive: true, mode: 0o700 });
const db = openDatabase(':memory:');
try {
  const service = createBillingService({ db, demoMode: true });
  seedDemo(service);
  const actor = {
    id: 'synthetic-document-review',
    name: 'Synthetic document reviewer',
    role: 'admin',
    email: 'reviewer@example.test',
  };
  let state = service.getState(actor);
  if (!state.credits.length) {
    const invoice = state.invoices.find((i) => i.status === 'issued' && i.balanceCents >= 1000);
    if (invoice)
      service.execute(
        actor,
        {
          type: 'credit.create',
          payload: {
            invoiceId: invoice.id,
            lines: [{ invoiceLineId: invoice.lines[0].id, amountCents: 1000 }],
            reason: 'Synthetic document layout review',
          },
        },
        'synthetic-layout-credit',
      );
    state = service.getState(actor);
  }
  const invoice = state.invoices.find((i) => i.status === 'issued');
  const samples = [
    ['invoice', invoice?.id],
    ['receipt', state.receipts[0]?.id],
    ['credit', state.credits[0]?.id],
    ['statement', invoice?.accountId],
  ];
  for (const [kind, id] of samples) {
    if (!id) throw new Error(`Synthetic ${kind} fixture missing.`);
    const buffer = await renderDocument(service.getDocument(actor, kind, id));
    writeFileSync(join(output, `rosewood-sample-${kind}.pdf`), buffer, { mode: 0o600 });
  }
  console.log(`Created four synthetic review PDFs in ${realpathSync(output)}`);
} finally {
  db.close();
}
