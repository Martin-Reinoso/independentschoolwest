import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createApplicationInvitation, createService } from "../service.mjs";

const NOW = Date.parse("2026-08-26T02:00:00.000Z");

function event({ name = "Taylor Morgan", email = "taylor@example.test", requestKey = "synthetic-request-key-0001", website = "", startedAt = NOW - 2_000 } = {}) {
  return {
    rawPath: "/v6/application-link-requests",
    headers: { origin: "https://ffe.org.au", "idempotency-key": requestKey },
    requestContext: { http: { method: "POST", path: "/v6/application-link-requests", sourceIp: "192.0.2.44" } },
    body: JSON.stringify({ parentGuardianName: name, email, website, startedAt })
  };
}

class RequestStore {
  constructor() {
    this.idempotency = new Map();
    this.requests = new Map();
    this.requestIndexes = new Map();
    this.invitations = new Map();
    this.invitationIds = new Map();
    this.applications = new Map();
    this.outbox = [];
    this.rateLimitKeys = [];
    this.rateLimitChecks = [];
    this.blockRateLimit = () => false;
  }

  async ensureFormDefinition(definition) { return definition; }
  async checkRateLimit(key, limit, seconds) {
    this.rateLimitKeys.push(key);
    this.rateLimitChecks.push({ key, limit, seconds });
    return !this.blockRateLimit(key);
  }
  async getIdempotency(key) { return structuredClone(this.idempotency.get(key) || null); }
  async getApplicationRequestByEmailHash(hash) { return structuredClone(this.requestIndexes.get(hash) || null); }
  async getInvitationById(id) { return structuredClone(this.invitationIds.get(id) || null); }
  async getApplication(id) { return structuredClone(this.applications.get(id) || null); }
  async listApplicationsByInvitationId(invitationId) { return [...this.applications.values()].filter(application => application.invitationId === invitationId).map(application => structuredClone(application)); }
  async findInvitationByRecipientEmail(email) { return [...this.invitationIds.values()].find(invitation => invitation.recipientEmail === email) || null; }
  async createInvitation(value) {
    if (value.idempotency && this.idempotency.has(value.idempotency.keyHash)) return { deduplicated: true, result: this.idempotency.get(value.idempotency.keyHash).result };
    this.invitations.set(value.tokenHash, structuredClone(value.invitation));
    this.invitationIds.set(value.invitation.id, structuredClone(value.invitation));
    this.applications.set(value.application.id, structuredClone(value.application));
    if (value.applicationRequest) this.requests.set(value.applicationRequest.id, structuredClone(value.applicationRequest));
    if (value.requestEmailIndex) this.requestIndexes.set(value.requestEmailIndex.emailHash, structuredClone(value.requestEmailIndex));
    if (value.idempotency) this.idempotency.set(value.idempotency.keyHash, structuredClone(value.idempotency));
    this.queue(value.outboxEvents);
    return { deduplicated: false, result: value.idempotency?.result };
  }
  async reissueInvitationForApplicationRequest(value) {
    if (this.idempotency.has(value.idempotency.keyHash)) return { deduplicated: true, result: this.idempotency.get(value.idempotency.keyHash).result };
    if (value.previousTokenHash) this.invitations.delete(value.previousTokenHash);
    this.invitations.set(value.tokenHash, structuredClone(value.invitation));
    this.invitationIds.set(value.invitation.id, structuredClone(value.invitation));
    this.requests.set(value.applicationRequest.id, structuredClone(value.applicationRequest));
    this.requestIndexes.set(value.requestEmailIndex.emailHash, structuredClone(value.requestEmailIndex));
    this.idempotency.set(value.idempotency.keyHash, structuredClone(value.idempotency));
    this.queue(value.outboxEvents);
    return { deduplicated: false, result: value.idempotency.result };
  }
  queue(events = []) {
    for (const item of events) this.outbox.push({ PK: "OUTBOX", SK: `PENDING#${item.createdAt}#${item.id}`, data: structuredClone(item), completed: false, attempts: 0 });
  }
  async listOutbox(limit) { return this.outbox.filter(item => !item.completed).slice(0, limit); }
  async claimOutbox(item) { item.attempts += 1; return item; }
  async completeOutbox(item) { item.completed = true; }
  async releaseOutbox() {}
}

function fixture(store = new RequestStore()) {
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
      APPLICATION_PAGE_URL: "https://ffe.org.au/pages/rosewood-enrolment-v6.html",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html"
    },
    clock: () => NOW
  });
  return { store, mailer, service };
}

test("a public request creates one direct family invitation without creating or linking an EOI", async () => {
  const { store, mailer, service } = fixture();
  const response = await service(event());
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.accepted, true);
  assert.equal(store.requests.size, 1);
  assert.equal(store.applications.size, 1);
  assert.equal(store.invitationIds.size, 1);
  const application = [...store.applications.values()][0];
  assert.equal(application.sourceEoiId, "");
  assert.equal(application.invitationSource, "public_application_request");
  assert.equal(application.values.app_guardian_0_first, "Taylor");
  assert.equal(application.values.app_guardian_0_last, "Morgan");
  assert.equal(application.values.student_first, undefined);
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].tags.workflow, "application_link_request");
  assert.match(mailer.sent[0].text, /recently requested an Application for Enrolment link/);
  assert.doesNotMatch(mailer.sent[0].text, /expressed interest/);
  assert.deepEqual(store.rateLimitChecks.map(({ key, limit, seconds }) => ({ key: key.split(":")[0], limit, seconds })), [
    { key: "application-request-network-hour", limit: 100, seconds: 3600 },
    { key: "application-request-network-day", limit: 500, seconds: 86400 },
    { key: "application-request-email-hour", limit: 3, seconds: 3600 },
    { key: "application-request-email-day", limit: 5, seconds: 86400 }
  ]);
});

test("an idempotent retry returns the same generic result and sends only one email", async () => {
  const { store, mailer, service } = fixture();
  const first = await service(event());
  const second = await service(event());

  assert.deepEqual(JSON.parse(second.body), JSON.parse(first.body));
  assert.equal(store.requests.size, 1);
  assert.equal(store.applications.size, 1);
  assert.equal(mailer.sent.length, 1);
});

test("a later request rotates the private link on the same family invitation", async () => {
  const { store, mailer, service } = fixture();
  await service(event());
  const originalInvitation = structuredClone([...store.invitationIds.values()][0]);
  const originalApplication = [...store.applications.values()][0];

  await service(event({ requestKey: "synthetic-request-key-0002" }));
  const currentInvitation = [...store.invitationIds.values()][0];

  assert.equal(store.applications.size, 1);
  assert.equal(currentInvitation.id, originalInvitation.id);
  assert.equal(currentInvitation.applicationId, originalApplication.id);
  assert.notEqual(currentInvitation.tokenHash, originalInvitation.tokenHash);
  assert.equal(currentInvitation.sendCount, 2);
  assert.equal(store.requests.size, 2);
  assert.equal(mailer.sent.length, 2);
});

test("a request recovers the same application after its expiring invitation index is gone", async () => {
  const { store, mailer, service } = fixture();
  await service(event());
  const originalInvitation = structuredClone([...store.invitationIds.values()][0]);
  const originalApplicationId = [...store.applications.keys()][0];
  store.invitationIds.delete(originalInvitation.id);
  store.invitations.delete(originalInvitation.tokenHash);

  await service(event({ requestKey: "synthetic-request-key-recovery" }));
  const recoveredInvitation = [...store.invitationIds.values()][0];

  assert.equal(store.applications.size, 1);
  assert.equal([...store.applications.keys()][0], originalApplicationId);
  assert.equal(recoveredInvitation.id, originalInvitation.id);
  assert.equal(recoveredInvitation.applicationId, originalApplicationId);
  assert.equal(recoveredInvitation.status, "active");
  assert.equal(store.requests.size, 2);
  assert.equal(mailer.sent.length, 2);
});

test("an existing staff invitation is adopted instead of duplicating the application", async () => {
  const store = new RequestStore();
  await createApplicationInvitation({ store, recipientEmail: "taylor@example.test", firstName: "Taylor", applicationUrl: "https://ffe.org.au/pages/rosewood-enrolment-v6.html", clock: () => NOW });
  const staffEmailEvent = store.outbox.find(item => item.data.kind === "email");
  assert.equal(staffEmailEvent.data.payload.tags.workflow, "application");
  const existingApplicationId = [...store.applications.keys()][0];
  store.outbox.length = 0;
  const { service } = fixture(store);

  await service(event({ requestKey: "synthetic-request-key-0003" }));

  assert.equal(store.applications.size, 1);
  assert.equal([...store.applications.keys()][0], existingApplicationId);
  assert.equal(store.requests.size, 1);
});

test("bot traps and server rate limits prevent invitation creation", async () => {
  const trapped = fixture();
  const trappedResponse = await trapped.service(event({ website: "https://spam.invalid" }));
  assert.equal(JSON.parse(trappedResponse.body).accepted, true);
  assert.equal(trapped.store.applications.size, 0);

  const limited = fixture();
  limited.store.blockRateLimit = key => key.startsWith("application-request-email-hour:");
  const limitedResponse = await limited.service(event({ requestKey: crypto.randomUUID() }));
  assert.equal(limitedResponse.statusCode, 429);
  assert.equal(JSON.parse(limitedResponse.body).error, "APPLICATION_REQUEST_RATE_LIMIT");
  assert.equal(limited.store.applications.size, 0);
});
