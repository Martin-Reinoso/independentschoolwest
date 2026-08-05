import assert from "node:assert/strict";
import test from "node:test";
import { createService, resendApplicationInvitation } from "../service.mjs";

const clock = () => Date.parse("2026-08-05T12:00:00.000Z");

function event(route, method = "GET", body, sessionToken) {
  return {
    rawPath: route,
    headers: { origin: "https://ffe.org.au", ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}) },
    requestContext: { http: { method, path: route, sourceIp: "192.0.2.1" } },
    ...(body ? { body: JSON.stringify(body) } : {})
  };
}

class StaffStore {
  constructor() {
    this.challenges = new Map();
    this.sessions = new Map();
    this.created = null;
  }
  async checkRateLimit() { return true; }
  async putChallenge(challenge) { this.challenges.set(challenge.id, challenge); }
  async getChallenge(id) { return this.challenges.get(id) || null; }
  async consumeChallenge(id) { return this.challenges.get(id) || null; }
  async failChallenge() {}
  async putSession(session) { this.sessions.set(session.tokenHash, session); }
  async getSession(tokenHash) { return this.sessions.get(tokenHash) || null; }
  async enqueue() {}
  async listOutbox() { return []; }
  async getEoi() { return null; }
  async createInvitation(value) { this.created = value; }
}

function staffService({ store = new StaffStore(), sheetRows = {} } = {}) {
  const sent = [];
  const service = createService({
    store,
    drive: {},
    sheets: { async list(workbook, sheet) { return sheetRows[`${workbook}:${sheet}`] || []; }, async apply() {} },
    mailer: { async send(message) { sent.push(message); return { messageId: "ses-1" }; } },
    env: {
      ALLOWED_ORIGINS: "https://ffe.org.au",
      STAFF_EMAILS: "info@ffe.org.au",
      OTP_HMAC_SECRET: "test-otp-secret",
      NETWORK_HMAC_SECRET: "test-network-secret",
      APPLICATION_PAGE_URL: "https://ffe.org.au/pages/rosewood-enrolment-v6.html",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html",
      GOOGLE_EOI_SPREADSHEET_ID: "eoi-sheet",
      GOOGLE_APPLICATION_SPREADSHEET_ID: "application-sheet",
      GOOGLE_OPERATIONS_SPREADSHEET_ID: "operations-sheet"
    },
    clock
  });
  return { service, store, sent };
}

async function staffSession(service) {
  const requested = JSON.parse((await service(event("/v6/staff/access/request-code", "POST", { email: "info@ffe.org.au" }))).body);
  const verified = await service(event("/v6/staff/access/verify-code", "POST", { email: "info@ffe.org.au", challengeId: requested.challengeId, code: "123456" }));
  assert.equal(verified.statusCode, 200);
  return JSON.parse(verified.body).sessionToken;
}

test("staff access sends a code only to an allowlisted mailbox", async () => {
  const { service, store, sent } = staffService();
  const allowed = await service(event("/v6/staff/access/request-code", "POST", { email: "info@ffe.org.au" }));
  assert.equal(allowed.statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "info@ffe.org.au");
  assert.equal(store.challenges.size, 1);

  const denied = await service(event("/v6/staff/access/request-code", "POST", { email: "unknown@example.com" }));
  assert.equal(denied.statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(store.challenges.size, 1);
  assert.match(JSON.parse(denied.body).message, /If this email is authorised/);
});

test("staff dashboard exposes operational summaries but not sensitive columns", async () => {
  const { service } = staffService({ sheetRows: {
    "eoi:EOIs": [{ eoi_id: "eoi-1", reference: "EOI-1", submitted_at: "2026-08-01", status: "submitted", primary_contact_first_name: "Alex", primary_contact_last_name: "Example", email: "family@example.com", student_first_name: "Avery", student_last_name: "Example", date_of_birth: "2020-01-01" }],
    "application:Applications": [{ application_id: "app-1", invitation_id: "invite-1", source_eoi_id: "eoi-1", status: "in_progress", recipient_email: "family@example.com", student_first_name: "Avery", student_last_name: "Example", created_at: "2026-08-02", updated_at: "2026-08-03" }],
    "operations:Progress": [{ application_id: "app-1", status: "in_progress", current_stage: "student", percent_complete: "22", last_activity_at: "2026-08-03" }],
    "operations:Application Invitations": [{ application_id: "app-1", last_sent_at: "2026-08-02", send_count: "1" }],
    "operations:Email Events": []
  } });
  const sessionToken = await staffSession(service);
  const response = await service(event("/v6/staff/dashboard", "GET", null, sessionToken));
  assert.equal(response.statusCode, 200);
  const dashboard = JSON.parse(response.body);
  assert.equal(dashboard.stats.inProgress, 1);
  assert.equal(dashboard.eois[0].linkedApplicationId, "app-1");
  assert.equal(dashboard.applications[0].percentComplete, 22);
  assert.equal("dateOfBirth" in dashboard.eois[0], false);
  assert.doesNotMatch(response.body, /2020-01-01/);
});

test("staff portal creates a direct invitation without returning its private link", async () => {
  const { service, store } = staffService();
  const sessionToken = await staffSession(service);
  const response = await service(event("/v6/staff/invitations", "POST", { recipientEmail: "family@example.com", firstName: "Alex", studentFirstName: "Avery" }, sessionToken));
  assert.equal(response.statusCode, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.recipientEmail, "family@example.com");
  assert.equal("invitationUrl" in result, false);
  assert.equal(store.created.application.sourceEoiId, "");
  assert.ok(store.created.invitation.tokenHash);
});

test("resending rotates the invitation token and invalidates the previous hash", async () => {
  const current = { id: "invite-1", applicationId: "app-1", contactId: "contact-1", studentId: "student-1", recipientEmail: "family@example.com", sourceEoiId: "", status: "active", createdAt: "2026-08-01T00:00:00.000Z", expiresAt: clock() + 1000, firstSentAt: "2026-08-01T00:00:00.000Z", lastSentAt: "2026-08-01T00:00:00.000Z", sendCount: 1, tokenHash: "old-token-hash" };
  const store = {
    rotated: null,
    async getInvitationById() { return current; },
    async getApplication() { return { id: "app-1", status: "in_progress", sourceEoiId: "", values: { app_guardian_0_first: "Alex", student_first: "Avery" } }; },
    async rotateInvitation(value) { this.rotated = value; }
  };
  const result = await resendApplicationInvitation({ store, invitationId: "invite-1", createdBy: "info@ffe.org.au", applicationUrl: "https://ffe.org.au/form", clock });
  assert.equal(result.sendCount, 2);
  assert.equal(store.rotated.previousTokenHash, "old-token-hash");
  assert.notEqual(store.rotated.tokenHash, "old-token-hash");
  assert.equal(store.rotated.invitation.tokenHash, store.rotated.tokenHash);
  assert.equal(store.rotated.outboxEvents[0].kind, "email");
});
