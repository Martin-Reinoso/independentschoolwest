import assert from "node:assert/strict";
import test from "node:test";
import { createService } from "../service.mjs";
import { DynamoStore } from "../dynamo-store.mjs";

const NOW = Date.parse("2026-08-26T08:00:00.000Z");

function event({
  name = "Taylor Morgan",
  email = "taylor@example.test",
  interest = "Ask a general question",
  message = "When will school tours begin?",
  website = "",
  startedAt = NOW - 2_000,
  requestKey = "synthetic-community-enquiry-0001"
} = {}) {
  return {
    rawPath: "/v6/community-enquiries",
    headers: { origin: "https://ffe.org.au", "idempotency-key": requestKey },
    requestContext: { http: { method: "POST", path: "/v6/community-enquiries", sourceIp: "192.0.2.75" } },
    body: JSON.stringify({ name, email, interest, message, website, startedAt })
  };
}

class EnquiryStore {
  constructor() {
    this.idempotency = new Map();
    this.enquiries = new Map();
    this.outbox = [];
    this.audit = [];
    this.rateLimitChecks = [];
    this.blockRateLimit = () => false;
  }

  async getIdempotency(key) { return structuredClone(this.idempotency.get(key) || null); }
  async checkRateLimit(key, limit, seconds) {
    this.rateLimitChecks.push({ key, limit, seconds });
    return !this.blockRateLimit(key);
  }
  async createCommunityEnquiry(enquiry, outboxEvents, auditEvents, idempotency) {
    if (this.idempotency.has(idempotency.keyHash)) return { deduplicated: true, result: this.idempotency.get(idempotency.keyHash).result };
    this.enquiries.set(enquiry.id, structuredClone(enquiry));
    this.idempotency.set(idempotency.keyHash, structuredClone(idempotency));
    this.audit.push(...auditEvents.map(item => structuredClone(item)));
    for (const item of outboxEvents) this.outbox.push({ PK: "OUTBOX", SK: `PENDING#${item.createdAt}#${item.id}`, data: structuredClone(item), completed: false, attempts: 0 });
    return { enquiry, result: idempotency.result, deduplicated: false };
  }
  async listOutbox(limit) { return this.outbox.filter(item => !item.completed).slice(0, limit); }
  async claimOutbox(item) { item.attempts += 1; return item; }
  async completeOutbox(item) { item.completed = true; }
  async releaseOutbox() {}
}

function fixture(store = new EnquiryStore()) {
  const mailer = { sent: [], async send(message) { this.sent.push(message); return { messageId: `synthetic-${this.sent.length}` }; } };
  const service = createService({
    store,
    artifacts: {},
    sheets: { async apply() { return { applied: true }; } },
    mailer,
    slack: { pendingEnabled: false, completionEnabled: false, async send() {} },
    env: {
      OTP_HMAC_SECRET: "synthetic-otp-secret",
      NETWORK_HMAC_SECRET: "synthetic-network-secret",
      ALLOWED_ORIGINS: "https://ffe.org.au",
      COMMUNITY_ENQUIRY_NOTIFICATION_EMAIL: "info@ffe.org.au",
      APPLICATION_PAGE_URL: "https://ffe.org.au/pages/rosewood-enrolment-v6.html",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html"
    },
    clock: () => NOW
  });
  return { store, mailer, service };
}

test("a valid community enquiry is stored once and notifies info@ffe.org.au", async () => {
  const { store, mailer, service } = fixture();
  const response = await service(event({ name: "Taylor <Morgan>", message: "A question with <strong>markup</strong>." }));
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.accepted, true);
  assert.equal(store.enquiries.size, 1);
  const enquiry = [...store.enquiries.values()][0];
  assert.match(enquiry.reference, /^ENQ-2026-/);
  assert.equal(enquiry.name, "Taylor <Morgan>");
  assert.equal(enquiry.email, "taylor@example.test");
  assert.equal(enquiry.interest, "Ask a general question");
  assert.equal(enquiry.message, "A question with <strong>markup</strong>.");
  assert.equal(enquiry.source, "discover_rosewood");
  assert.equal(enquiry.formVersion, "rosewood-community-enquiry-2026.1");
  assert.match(enquiry.formDefinitionHash, /^[a-f0-9]{64}$/);
  assert.equal(store.audit.length, 1);
  assert.equal(store.audit[0].workflow, "community_enquiry");
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, "info@ffe.org.au");
  assert.equal(mailer.sent[0].replyTo, "taylor@example.test");
  assert.equal(mailer.sent[0].tags.workflow, "community_enquiry");
  assert.equal(mailer.sent[0].tags.message_type, "new_enquiry_notification");
  assert.match(mailer.sent[0].text, /taylor@example\.test/);
  assert.doesNotMatch(mailer.sent[0].html, /Taylor <Morgan>|<strong>markup<\/strong>/);
  assert.match(mailer.sent[0].html, /Taylor &lt;Morgan&gt;/);
  assert.deepEqual(store.rateLimitChecks.map(({ key, limit, seconds }) => ({ key: key.split(":")[0], limit, seconds })), [
    { key: "community-enquiry-network-hour", limit: 100, seconds: 3600 },
    { key: "community-enquiry-network-day", limit: 500, seconds: 86400 },
    { key: "community-enquiry-email-hour", limit: 3, seconds: 3600 },
    { key: "community-enquiry-email-day", limit: 5, seconds: 86400 }
  ]);
});

test("an idempotent retry creates no duplicate record or notification", async () => {
  const { store, mailer, service } = fixture();
  const first = await service(event());
  const second = await service(event());

  assert.deepEqual(JSON.parse(second.body), JSON.parse(first.body));
  assert.equal(store.enquiries.size, 1);
  assert.equal(mailer.sent.length, 1);
});

test("the honeypot returns a generic success without persistence or email", async () => {
  const { store, mailer, service } = fixture();
  const response = await service(event({ website: "https://spam.invalid" }));

  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).accepted, true);
  assert.equal(store.enquiries.size, 0);
  assert.equal(mailer.sent.length, 0);
});

test("community enquiry validation rejects unknown interests and oversized messages", async () => {
  const invalidInterest = fixture();
  const interestResponse = await invalidInterest.service(event({ interest: "Unexpected option" }));
  assert.equal(interestResponse.statusCode, 422);
  assert.equal(JSON.parse(interestResponse.body).error, "ENQUIRY_INTEREST_REQUIRED");

  const invalidMessage = fixture();
  const messageResponse = await invalidMessage.service(event({ message: "x".repeat(4001) }));
  assert.equal(messageResponse.statusCode, 422);
  assert.equal(JSON.parse(messageResponse.body).error, "ENQUIRY_MESSAGE_INVALID");
  assert.equal(invalidInterest.store.enquiries.size + invalidMessage.store.enquiries.size, 0);
});

test("server-side rate limiting runs before enquiry persistence", async () => {
  const limited = fixture();
  limited.store.blockRateLimit = key => key.startsWith("community-enquiry-email-hour:");
  const response = await limited.service(event());

  assert.equal(response.statusCode, 429);
  assert.equal(JSON.parse(response.body).error, "COMMUNITY_ENQUIRY_RATE_LIMIT");
  assert.equal(limited.store.enquiries.size, 0);
  assert.equal(limited.mailer.sent.length, 0);
});

test("DynamoDB stores the enquiry, idempotency claim, email outbox and audit atomically", async () => {
  const commands = [];
  const store = new DynamoStore({
    tableName: "synthetic-records",
    auditTableName: "synthetic-audit",
    client: { async send(command) { commands.push(command.input); return {}; } },
    now: () => NOW
  });
  const enquiry = { id: "enquiry-synthetic", reference: "ENQ-2026-TEST", submittedAt: new Date(NOW).toISOString() };
  const outbox = [{ id: "out-synthetic", kind: "email", createdAt: new Date(NOW).toISOString(), payload: { to: "info@ffe.org.au" } }];
  const audit = [{ eventId: "evt-synthetic", occurredAt: new Date(NOW).toISOString(), workflow: "community_enquiry", recordId: enquiry.id }];
  const idempotency = { keyHash: "hash-synthetic", ttl: Math.floor(NOW / 1000) + 100, result: { accepted: true } };

  await store.createCommunityEnquiry(enquiry, outbox, audit, idempotency);

  assert.equal(commands.length, 1);
  const items = commands[0].TransactItems;
  assert.equal(items.length, 4);
  assert.equal(items[0].Put.Item.PK, "COMMUNITY_ENQUIRY#enquiry-synthetic");
  assert.equal(items[0].Put.Item.entity, "community_enquiry");
  assert.equal(items[1].Put.Item.PK, "IDEMPOTENCY#hash-synthetic");
  assert.equal(items[2].Put.Item.PK, "OUTBOX");
  assert.equal(items[3].Put.TableName, "synthetic-audit");
});
