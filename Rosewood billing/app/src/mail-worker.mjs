import { createMailTransport, classifyMailFailure } from './mail.mjs';

const workerActor = {
  id: 'billing-mail-worker',
  name: 'Billing email worker',
  email: 'worker@example.test',
  role: 'admin',
};

/** One bounded polling cycle. Network work is outside SQLite transactions. */
export async function processOutbox({
  communications,
  config,
  renderDocument,
  transportFactory = createMailTransport,
  limit = 10,
  dryRun = false,
}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw new Error('Email worker limit must be from 1 to 50.');
  const summary = {
    prepared: 0,
    recovered: 0,
    accepted: 0,
    failed: 0,
    uncertain: 0,
    blocked: 0,
    remaining: 0,
    deliveryEnabled: Boolean(config.enabled && !config.demoMode && !dryRun),
  };
  if (dryRun) {
    summary.remaining = communications.getState(workerActor).summary.queuedCount;
    return summary;
  }
  const preparation = communications.prepareAutomatic();
  summary.prepared =
    preparation.createdCount ?? preparation.preparedCount ?? preparation.count ?? 0;
  summary.recovered = communications.recoverExpired().recoveredCount;
  if (!summary.deliveryEnabled) {
    summary.remaining = communications.getState(workerActor).summary.queuedCount;
    return summary;
  }
  const transport = await transportFactory(config);
  try {
    for (let i = 0; i < limit; i++) {
      const claim = communications.claimNext();
      if (!claim) break;
      const identity = {
        id: claim.message.id,
        attemptId: claim.attemptId,
        leaseToken: claim.leaseToken,
      };
      let outcome;
      let providerCallStarted = false;
      try {
        const pdf = await renderDocument(claim.payload.document);
        if (!communications.validateClaim(identity)) {
          summary.blocked++;
          continue;
        }
        providerCallStarted = true;
        const receipt = await transport.send(claim.payload, pdf, { attemptId: claim.attemptId });
        outcome = {
          outcome: 'accepted',
          providerId: receipt.providerId,
          attachmentSha256: receipt.attachmentSha256,
        };
      } catch (error) {
        outcome = classifyMailFailure(error);
        if (!providerCallStarted)
          outcome = {
            outcome: 'failed',
            errorCode: outcome.errorCode === 'Error' ? 'PDF_RENDER_FAILED' : outcome.errorCode,
          };
      }
      // Deliberately outside the send catch: if the provider accepted and this
      // database write fails, leave the durable lease for uncertain-state recovery.
      communications.finishAttempt({ ...identity, ...outcome });
      summary[outcome.outcome]++;
    }
  } finally {
    transport.close?.();
  }
  summary.remaining = communications.getState(workerActor).summary.queuedCount;
  return summary;
}
