import { setTimeout as delay } from 'node:timers/promises';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { createCommunications } from '../src/communications.mjs';
import { loadConfig, prepareRuntime } from '../src/config.mjs';
import { loadMailConfig } from '../src/mail.mjs';
import { processOutbox } from '../src/mail-worker.mjs';
import { renderDocument } from '../src/documents.mjs';

let db;
try {
  const flags = new Set(process.argv.slice(2));
  if ([...flags].some((flag) => !['--dry-run', '--watch'].includes(flag)))
    throw new Error('Use --dry-run or --watch.');
  const runtime = await prepareRuntime(loadConfig());
  const config = loadMailConfig({ demoMode: runtime.demoMode });
  db = openDatabase(runtime.databasePath);
  const service = createBillingService({ db, demoMode: runtime.demoMode });
  const communications = createCommunications({ db, service });
  const abort = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => abort.abort());
  do {
    const result = await processOutbox({
      communications,
      config,
      renderDocument,
      dryRun: flags.has('--dry-run'),
    });
    // Operational counts only. Never log addresses, bodies, documents or credentials.
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!flags.has('--watch') || abort.signal.aborted) break;
    try {
      await delay(60_000, undefined, { signal: abort.signal });
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    }
  } while (!abort.signal.aborted);
} catch {
  process.stderr.write(
    'Email worker stopped. Review the private configuration and outbox status before restarting.\n',
  );
  process.exitCode = 1;
} finally {
  db?.close();
}
