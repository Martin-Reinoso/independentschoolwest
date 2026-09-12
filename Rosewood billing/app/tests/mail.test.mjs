import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadMailConfig,
  mailStatus,
  renderEmailHtml,
  createMailTransport,
  classifyMailFailure,
} from '../src/mail.mjs';
import { processOutbox } from '../src/mail-worker.mjs';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../src/database.mjs';
import { createBillingService } from '../src/service.mjs';
import { createCommunications } from '../src/communications.mjs';
import { renderDocument } from '../src/documents.mjs';

const live = () =>
  loadMailConfig({
    env: {
      BILLING_MAIL_TRANSPORT: 'ses',
      BILLING_MAIL_DELIVERY_ENABLED: '1',
      BILLING_MAIL_REGION: 'ap-southeast-2',
      BILLING_MAIL_FROM_ADDRESS: 'sender@example.test',
    },
  });
const payload = () => ({
  to: 'synthetic-payer@example.test',
  subject: 'Synthetic invoice',
  body: 'Dear Synthetic Payer,\n\nThe PDF is attached. <img src=x onerror=alert(1)>',
  document: { kind: 'invoice', settings: { demoMode: false } },
});
const pdf = Buffer.from('%PDF-1.4\nSynthetic fixture');
class Send {
  constructor(input) {
    this.input = input;
  }
}

test('external delivery defaults off and sample mode cannot enable it even with all sending flags', async () => {
  assert.equal(loadMailConfig({ env: {} }).enabled, false);
  const config = loadMailConfig({
    env: { BILLING_MAIL_TRANSPORT: 'ses', BILLING_MAIL_DELIVERY_ENABLED: '1' },
    demoMode: true,
  });
  assert.equal(config.enabled, false);
  await assert.rejects(createMailTransport(config), (error) => error.code === 'MAIL_DISABLED');
  assert.equal(Object.hasOwn(mailStatus(live()), 'profile'), false);
  for (const env of [
    { BILLING_MAIL_TRANSPORT: 'smtp' },
    { BILLING_MAIL_TRANSPORT: 'ses', BILLING_MAIL_DELIVERY_ENABLED: '1' },
    {
      BILLING_MAIL_TRANSPORT: 'ses',
      BILLING_MAIL_DELIVERY_ENABLED: '1',
      BILLING_MAIL_REGION: 'ap-southeast-2',
      BILLING_MAIL_FROM_ADDRESS: 'a@example.test\r\nBcc:x@example.test',
    },
  ])
    assert.throws(
      () => loadMailConfig({ env }),
      (error) => error.code === 'MAIL_CONFIG_INVALID',
    );
});

test('SES request contains one private recipient, UTF-8 alternatives and the exact PDF attachment', async () => {
  const calls = [];
  const transport = await createMailTransport(live(), {
    client: {
      send: async (...args) => {
        calls.push(args);
        return { MessageId: 'synthetic-provider-id' };
      },
    },
    Command: Send,
  });
  const result = await transport.send(payload(), pdf, { attemptId: 'synthetic-attempt' });
  assert.equal(result.providerId, 'synthetic-provider-id');
  assert.match(result.attachmentSha256, /^[a-f0-9]{64}$/);
  const input = calls[0][0].input;
  assert.deepEqual(input.Destination, { ToAddresses: ['synthetic-payer@example.test'] });
  assert.deepEqual(input.ReplyToAddresses, ['sender@example.test']);
  assert.equal(input.Content.Simple.Attachments[0].RawContent, pdf);
  assert.equal(input.Content.Simple.Attachments[0].ContentType, 'application/pdf');
  assert.match(input.Content.Simple.Body.Html.Data, /&lt;img/);
  assert.doesNotMatch(input.Content.Simple.Body.Html.Data, /<img/);
  assert.equal(input.Content.Simple.Body.Text.Data, payload().body);
  assert.ok(calls[0][1].abortSignal instanceof AbortSignal);
});

test('header injection, sample documents and invalid attachments are refused before the provider call', async () => {
  let calls = 0;
  const transport = await createMailTransport(live(), {
    client: {
      send: async () => {
        calls++;
        return { MessageId: 'impossible' };
      },
    },
    Command: Send,
  });
  for (const mutate of [
    (p) => (p.to += '\nBcc:other@example.test'),
    (p) => (p.subject += '\nBcc:other@example.test'),
    (p) => (p.document.settings.demoMode = true),
  ]) {
    const p = payload();
    mutate(p);
    await assert.rejects(transport.send(p, pdf), (e) => e.status === 400);
  }
  await assert.rejects(
    transport.send(payload(), Buffer.from('not a PDF')),
    (e) => e.code === 'MAIL_ATTACHMENT_INVALID',
  );
  assert.equal(calls, 0);
  assert.ok(
    renderEmailHtml({ body: 'Safe', senderName: '<script>bad</script>' }).includes(
      '&lt;script&gt;',
    ),
  );
});

test('provider acceptance is distinct from delivery and uncertain results are never classified as safe retries', async () => {
  assert.equal(classifyMailFailure({ name: 'TimeoutError' }).outcome, 'uncertain');
  assert.equal(
    classifyMailFailure({ name: 'ServiceUnavailableException', $metadata: { httpStatusCode: 503 } })
      .outcome,
    'uncertain',
  );
  assert.equal(
    classifyMailFailure({ name: 'TooManyRequestsException', $metadata: { httpStatusCode: 429 } })
      .outcome,
    'failed',
  );
  const transport = await createMailTransport(live(), {
    client: { send: async () => ({}) },
    Command: Send,
  });
  await assert.rejects(
    transport.send(payload(), pdf),
    (error) => error.code === 'MAIL_RESULT_UNCERTAIN',
  );
});

function outboxFixture({ validate = true, persistThrows = false } = {}) {
  const calls = [];
  let consumed = false;
  const communications = {
    prepareAutomatic() {
      calls.push('prepare');
      return { createdCount: 1 };
    },
    recoverExpired() {
      calls.push('recover');
      return { recoveredCount: 0 };
    },
    claimNext() {
      calls.push('claim');
      if (consumed) return null;
      consumed = true;
      return {
        message: { id: 'm1' },
        attemptId: 'attempt1',
        leaseToken: 'secret-lease',
        payload: payload(),
      };
    },
    validateClaim() {
      calls.push('validate');
      return validate;
    },
    finishAttempt(value) {
      calls.push(value);
      if (persistThrows) throw new Error('synthetic persistence error');
    },
    getState() {
      return {
        messages: consumed ? [] : [{ status: 'queued' }],
        summary: { queuedCount: consumed ? 0 : 1 },
      };
    },
  };
  return { communications, calls };
}

test('dry run and disabled transport never claim or send messages', async () => {
  for (const dryRun of [true, false]) {
    const { communications, calls } = outboxFixture();
    const summary = await processOutbox({
      communications,
      config: { enabled: false, demoMode: true },
      dryRun,
      renderDocument: async () => {
        throw new Error('must not render');
      },
      transportFactory: async () => {
        throw new Error('must not connect');
      },
    });
    assert.equal(summary.accepted, 0);
    assert.equal(summary.remaining, 1);
    assert.ok(!calls.includes('claim'));
    if (dryRun) assert.deepEqual(calls, []);
  }
});

test('worker rechecks a claimed message after rendering and skips a newly held account', async () => {
  const { communications, calls } = outboxFixture({ validate: false });
  let sent = 0;
  const result = await processOutbox({
    communications,
    config: live(),
    renderDocument: async () => pdf,
    transportFactory: async () => ({
      send: async () => {
        sent++;
      },
      close() {},
    }),
  });
  assert.equal(sent, 0);
  assert.equal(result.blocked, 1);
  assert.ok(calls.includes('validate'));
});

test('worker persists provider acceptance once and retains uncertainty if acceptance cannot be saved', async () => {
  for (const persistThrows of [false, true]) {
    const { communications, calls } = outboxFixture({ persistThrows });
    const operation = processOutbox({
      communications,
      config: live(),
      renderDocument: async () => pdf,
      transportFactory: async () => ({
        send: async () => ({ providerId: 'synthetic-accepted' }),
        close() {},
      }),
    });
    if (persistThrows) await assert.rejects(operation, /persistence/);
    else assert.equal((await operation).accepted, 1);
    const finishes = calls.filter((c) => typeof c === 'object');
    assert.equal(finishes.length, 1);
    assert.equal(finishes[0].outcome, 'accepted');
  }
});

test('rendering failures are safe failures while timeout after sending stays uncertain', async () => {
  for (const stage of ['render', 'send']) {
    const { communications, calls } = outboxFixture();
    await processOutbox({
      communications,
      config: live(),
      renderDocument: async () => {
        if (stage === 'render') throw new Error('synthetic render failure');
        return pdf;
      },
      transportFactory: async () => ({
        send: async () => {
          throw Object.assign(new Error('synthetic timeout'), { name: 'TimeoutError' });
        },
        close() {},
      }),
    });
    assert.equal(
      calls.find((c) => typeof c === 'object').outcome,
      stage === 'render' ? 'failed' : 'uncertain',
    );
  }
});

test('real ledger, outbox, PDF renderer and SES adapter accept exactly one synthetic attachment through an injected provider', async (t) => {
  const db = openDatabase(':memory:');
  t.after(() => db.close());
  const actor = { id: 'integration-admin', name: 'Synthetic Administrator', role: 'admin' };
  const clock = () => new Date('2026-09-12T04:00:00Z');
  const service = createBillingService({ db, clock, demoMode: false });
  const communications = createCommunications({ db, service, clock });
  const ledger = (type, payload) => service.execute(actor, { type, payload }, randomUUID());
  const command = (type, payload) =>
    communications.execute(actor, { type: `communication.${type}`, payload }, randomUUID());
  const settings = service.getState(actor).settings;
  ledger('settings.update', {
    ...settings,
    expectedRevision: settings.revision,
    legalName: 'Synthetic Test School',
    address: '1 Test Street',
    email: 'school@example.test',
    paymentInstructions: 'Synthetic bank instructions',
    taxPolicyApproved: true,
  });
  const account = ledger('account.create', {
    name: 'Synthetic Delivery Test',
    billingName: 'Synthetic Payer',
    email: 'payer@example.test',
    address: '1 Test Street',
    contactAllowed: true,
  });
  const draft = ledger('invoice.create', {
    accountId: account.id,
    issueDate: '2026-09-12',
    dueDate: '2026-09-19',
    year: 2027,
    term: 'Term 1',
    description: 'Synthetic fee',
    lines: [
      {
        description: 'Synthetic tuition',
        quantity: 1,
        unitCents: 10000,
        discountCents: 0,
        taxCode: 'GST_FREE',
        category: 'tuition',
        accountCode: '200',
      },
    ],
  });
  const invoice = ledger('invoice.issue', { id: draft.id, expectedRevision: draft.revision });
  const message = command('create', { kind: 'invoice', documentId: invoice.id });
  command('approve', { id: message.id, expectedRevision: message.revision });
  const calls = [];
  const transportFactory = (config) =>
    createMailTransport(config, {
      Command: Send,
      client: {
        send: async (request) => {
          calls.push(request.input);
          return { MessageId: 'synthetic-only-no-network' };
        },
      },
    });
  const first = await processOutbox({
    communications,
    config: live(),
    renderDocument,
    transportFactory,
  });
  const second = await processOutbox({
    communications,
    config: live(),
    renderDocument,
    transportFactory,
  });
  assert.equal(first.accepted, 1);
  assert.equal(second.accepted, 0);
  assert.equal(calls.length, 1);
  assert.match(
    calls[0].Content.Simple.Attachments[0].RawContent.subarray(0, 5).toString(),
    /^%PDF-/,
  );
  assert.ok(calls[0].Content.Simple.Attachments[0].RawContent.length > 5000);
  const stored = communications.getState(actor).messages[0];
  assert.equal(stored.status, 'accepted');
  assert.equal(stored.providerId, 'synthetic-only-no-network');
  assert.match(stored.sentAttachmentSha256, /^[a-f0-9]{64}$/);
});
