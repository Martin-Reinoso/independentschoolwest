import assert from "node:assert/strict";
import test from "node:test";
import { createService, normalizeSesFeedback } from "../service.mjs";

const NOW = Date.parse("2026-08-13T04:00:00.000Z");

function validEoi() {
  return {
    eoi_first: "Alex",
    eoi_last: "Example",
    eoi_relationship: "Mother",
    eoi_email: "alex@example.test",
    eoi_mobile: "0400000000",
    eoi_address: "1 Example Street",
    eoi_suburb: "Melbourne",
    eoi_postcode: "3000",
    eoi_country: "Australia",
    eoi_student_first: "Avery",
    eoi_student_last: "Example",
    eoi_dob: "2020-01-02",
    eoi_gender: "Female",
    eoi_religion: "No Religion",
    eoi_year: "2027",
    eoi_level: "Foundation",
    eoi_needs: "No",
    eoi_family_connection: "New Family",
    eoi_other_children: "No",
    eoi_discovery: "School Website"
  };
}

function request(values = validEoi(), headers = {}) {
  return {
    rawPath: "/v6/eoi",
    requestContext: { http: { method: "POST", path: "/v6/eoi", sourceIp: "192.0.2.55" } },
    headers: { origin: "https://ffe.org.au", ...headers },
    body: JSON.stringify({ values })
  };
}

class EoiStore {
  constructor() {
    this.eois = new Map();
    this.idempotency = new Map();
    this.outbox = [];
    this.rateLimitKeys = [];
    this.blockRateLimit = key => false;
    this.failCreate = false;
  }

  async ensureFormDefinition(definition) { return definition; }
  async getIdempotency(key) { return structuredClone(this.idempotency.get(key) || null); }
  async checkRateLimit(key) {
    this.rateLimitKeys.push(key);
    return !this.blockRateLimit(key);
  }
  async createEoi(eoi, events, _audits, idempotency) {
    if (this.failCreate) throw new Error("synthetic transaction failure");
    const existing = this.idempotency.get(idempotency.keyHash);
    if (existing) return { deduplicated: true, result: structuredClone(existing.result) };
    this.eois.set(eoi.id, structuredClone(eoi));
    this.idempotency.set(idempotency.keyHash, structuredClone(idempotency));
    for (const event of events) this.outbox.push({ PK: "OUTBOX", SK: `PENDING#${event.createdAt}#${event.id}`, data: structuredClone(event), completed: false, attempts: 0 });
    return { deduplicated: false, result: structuredClone(idempotency.result) };
  }
  async listOutbox(limit) { return this.outbox.filter(item => !item.completed).slice(0, limit); }
  async claimOutbox(item) { item.attempts += 1; return item; }
  async completeOutbox(item) { item.completed = true; }
  async releaseOutbox() {}
}

function dependencies(store, overrides = {}) {
  const artifacts = {
    snapshots: [],
    deleted: [],
    async storeEoiSnapshot({ eoiId }) {
      const artifact = { id: `drive-${eoiId}`, storageProvider: "google_drive" };
      this.snapshots.push(artifact);
      return artifact;
    },
    async deleteArtifact(artifact) { this.deleted.push(artifact.id); }
  };
  const mailer = { sent: [], async send(message) { this.sent.push(message); return { messageId: "synthetic-message" }; } };
  const sheets = { async apply() { return { applied: true }; } };
  const service = createService({
    store,
    artifacts,
    sheets,
    mailer: overrides.mailer || mailer,
    slack: { pendingEnabled: false, completionEnabled: false, async send() {} },
    env: {
      OTP_HMAC_SECRET: "synthetic-otp-secret",
      NETWORK_HMAC_SECRET: "synthetic-network-secret",
      ALLOWED_ORIGINS: "https://ffe.org.au",
      APPLICATION_PAGE_URL: "https://ffe.org.au/pages/rosewood-enrolment-v6.html",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html"
    },
    clock: () => NOW
  });
  return { service, artifacts, mailer };
}

test("EOI retries with the same idempotency key return one record and one snapshot", async () => {
  const store = new EoiStore();
  const { service, artifacts, mailer } = dependencies(store);
  const event = request(validEoi(), { "idempotency-key": "synthetic-eoi-request-0001" });

  const first = JSON.parse((await service(event)).body);
  const second = JSON.parse((await service(event)).body);

  assert.equal(first.eoiId, second.eoiId);
  assert.equal(store.eois.size, 1);
  assert.equal(artifacts.snapshots.length, 1);
  assert.equal(mailer.sent.length, 1);
  assert.ok(store.rateLimitKeys.some(key => key.startsWith("eoi-network-hour:")));
  assert.ok(store.rateLimitKeys.some(key => key.startsWith("eoi-email-day:")));
});

test("legacy EOI clients are deduplicated by payload, day and network", async () => {
  const store = new EoiStore();
  const { service, artifacts } = dependencies(store);

  const first = JSON.parse((await service(request())).body);
  const second = JSON.parse((await service(request())).body);

  assert.equal(first.eoiId, second.eoiId);
  assert.equal(store.eois.size, 1);
  assert.equal(artifacts.snapshots.length, 1);
});

test("EOI rate limits run before creating external artifacts", async () => {
  const store = new EoiStore();
  store.blockRateLimit = key => key.startsWith("eoi-email-hour:");
  const { service, artifacts } = dependencies(store);

  const response = await service(request(validEoi(), { "idempotency-key": "synthetic-eoi-request-0002" }));

  assert.equal(response.statusCode, 429);
  assert.equal(JSON.parse(response.body).error, "EOI_RATE_LIMIT");
  assert.equal(artifacts.snapshots.length, 0);
});

test("EOI transaction failures remove the newly-created Drive snapshot", async () => {
  const store = new EoiStore();
  store.failCreate = true;
  const { service, artifacts } = dependencies(store);

  const response = await service(request(validEoi(), { "idempotency-key": "synthetic-eoi-request-0003" }));

  assert.equal(response.statusCode, 500);
  assert.equal(artifacts.snapshots.length, 1);
  assert.deepEqual(artifacts.deleted, [artifacts.snapshots[0].id]);
});

test("outbox events move to terminal failure after the bounded retry count", async () => {
  const store = new EoiStore();
  const item = { PK: "OUTBOX", SK: "PENDING#synthetic", attempts: 7, completed: false, data: { id: "out-synthetic", kind: "email", createdAt: new Date(NOW).toISOString(), payload: { to: "family@example.test" } } };
  store.outbox.push(item);
  store.failures = [];
  store.failOutbox = async (failedItem, failure) => { failedItem.completed = true; store.failures.push({ failedItem, failure }); };
  const mailer = { async send() { throw Object.assign(new Error("synthetic provider failure"), { code: "SYNTHETIC_FAILURE" }); } };
  const { service } = dependencies(store, { mailer });

  const result = await service.dispatchOutbox(10);

  assert.equal(result.failed, 1);
  assert.equal(store.failures.length, 1);
  assert.equal(store.failures[0].failure.attempts, 8);
  assert.equal(store.failures[0].failure.errorCode, "SYNTHETIC_FAILURE");
});

test("SES feedback normalizes delivery and failure events without recipient addresses", () => {
  for (const [eventType, expected] of [
    ["Send", "accepted_by_ses"],
    ["Delivery", "delivered"],
    ["DeliveryDelay", "delayed"],
    ["Bounce", "bounced"],
    ["Complaint", "complained"],
    ["Reject", "rejected"],
    ["RenderingFailure", "rendering_failed"]
  ]) {
    const feedback = normalizeSesFeedback({
      eventType,
      mail: {
        messageId: "ses-message-123",
        timestamp: "2026-08-13T04:05:00.000Z",
        destination: ["guardian@example.test"],
        tags: { workflow: ["application"], message_type: ["signature_invitation"], record_id: ["app-synthetic"] }
      }
    });
    assert.equal(feedback.deliveryStatus, expected);
    assert.equal(feedback.recordId, "app-synthetic");
    assert.doesNotMatch(JSON.stringify(feedback), /guardian@example\.test/);
  }
});

test("SES feedback is idempotent and updates the correlated pending signer", async () => {
  const store = new EoiStore();
  store.emailMessages = new Map([["ses-message-123", { tracking: { kind: "signature_request", applicationId: "app-synthetic", guardianId: "guardian-2", guardianIndex: 1, taskTokenHash: "task-hash-123" } }]]);
  store.sesEvents = new Map();
  store.signatureDeliveries = [];
  store.getEmailMessage = async messageId => structuredClone(store.emailMessages.get(messageId) || null);
  store.recordSignatureDelivery = async details => {
    const key = `${details.taskTokenHash}:${details.eventType}:${details.at}`;
    if (store.signatureDeliveries.some(item => item.key === key)) return false;
    store.signatureDeliveries.push({ key, ...structuredClone(details) });
    return true;
  };
  store.recordSesEvent = async ({ eventId, feedback, auditEvent, outboxEvents }) => {
    if (store.sesEvents.has(eventId)) return false;
    store.sesEvents.set(eventId, { feedback: structuredClone(feedback), auditEvent: structuredClone(auditEvent) });
    for (const event of outboxEvents) store.outbox.push({ PK: "OUTBOX", SK: `PENDING#${event.createdAt}#${event.id}`, data: structuredClone(event), completed: false, attempts: 0 });
    return true;
  };
  const applied = [];
  const service = createService({
    store,
    artifacts: {},
    sheets: { async apply(operation) { applied.push(structuredClone(operation)); return { applied: true }; } },
    mailer: { async send() { throw new Error("No email should be sent while processing feedback."); } },
    slack: { pendingEnabled: false, completionEnabled: false, async send() {} },
    env: { OTP_HMAC_SECRET: "synthetic-otp-secret", NETWORK_HMAC_SECRET: "synthetic-network-secret", ALLOWED_ORIGINS: "https://ffe.org.au" },
    clock: () => NOW
  });
  const message = {
    eventType: "Delivery",
    mail: {
      messageId: "ses-message-123",
      timestamp: "2026-08-13T04:05:00.000Z",
      destination: ["guardian@example.test"],
      tags: { workflow: ["application"], message_type: ["signature_invitation"], record_id: ["app-synthetic"] }
    },
    delivery: { timestamp: "2026-08-13T04:05:04.000Z" }
  };
  const event = { Records: [{ EventSource: "aws:sns", Sns: { Message: JSON.stringify(message) } }] };

  const first = await service(event);
  const second = await service(event);

  assert.deepEqual(first, { received: 1, recorded: 1, signatureUpdates: 1 });
  assert.deepEqual(second, { received: 1, recorded: 0, signatureUpdates: 0 });
  assert.equal(store.sesEvents.size, 1);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].record.delivery_status, "delivered");
  assert.equal(applied[0].record.record_id, "app-synthetic");
  assert.doesNotMatch(JSON.stringify([...store.sesEvents.values(), ...applied]), /guardian@example\.test/);
});

test("signature feedback retries when SES wins the outbox-correlation race", async () => {
  const store = new EoiStore();
  store.getEmailMessage = async () => null;
  store.recordSesEvent = async () => { throw new Error("Feedback must not be recorded before correlation."); };
  const service = createService({
    store,
    artifacts: {},
    sheets: { async apply() {} },
    mailer: { async send() {} },
    slack: { pendingEnabled: false, completionEnabled: false, async send() {} },
    env: { OTP_HMAC_SECRET: "synthetic-otp-secret", NETWORK_HMAC_SECRET: "synthetic-network-secret", ALLOWED_ORIGINS: "https://ffe.org.au" },
    clock: () => NOW
  });
  const event = { Records: [{ EventSource: "aws:sns", Sns: { Message: JSON.stringify({
    eventType: "Send",
    mail: {
      messageId: "ses-racing-message",
      timestamp: "2026-08-13T04:05:00.000Z",
      tags: { workflow: ["application"], message_type: ["signature_invitation"], record_id: ["app-synthetic"] }
    }
  }) } }] };

  await assert.rejects(() => service(event), /correlation is not available yet/);
});
