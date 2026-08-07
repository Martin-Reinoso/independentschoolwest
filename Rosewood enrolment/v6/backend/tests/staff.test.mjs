import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationInvitation, createService, resendApplicationInvitation } from "../service.mjs";

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
    this.records = [];
    this.audit = [];
    this.invitations = new Map();
    this.invitationIds = new Map();
    this.applications = new Map();
  }
  async checkRateLimit() { return true; }
  async putChallenge(challenge) { this.challenges.set(challenge.id, challenge); }
  async getChallenge(id) { return this.challenges.get(id) || null; }
  async consumeChallenge(id) { return this.challenges.get(id) || null; }
  async failChallenge() {}
  async putSession(session) { this.sessions.set(session.tokenHash, session); }
  async getSession(tokenHash) { return this.sessions.get(tokenHash) || null; }
  async enqueue() {}
  async recordAudit(event) { this.audit.push(event); }
  async listOutbox() { return []; }
  async listOperationalRecords() { return this.records; }
  async findApplicationBySourceEoi(sourceEoiId) { return this.records.find(item => item.entity === "application" && item.data.sourceEoiId === sourceEoiId)?.data || null; }
  async getEoi() { return null; }
  async createInvitation(value) {
    this.created = value;
    this.invitations.set(value.tokenHash, value.invitation);
    this.invitationIds.set(value.invitation.id, value.invitation);
    this.applications.set(value.application.id, value.application);
  }
  async getInvitation(tokenHash) { return this.invitations.get(tokenHash) || null; }
  async getInvitationById(id) { return this.invitationIds.get(id) || null; }
  async getApplication(id) { return this.applications.get(id) || null; }
  async saveDraft({ applicationId, expectedRevision, values, screen, stage, percentComplete, guardianCount, emergencyCount, savedAt }) {
    const current = this.applications.get(applicationId);
    assert.equal(current.revision, expectedRevision);
    const next = { ...current, values, screen, currentStage: stage, percentComplete, guardianCount, emergencyCount, updatedAt: savedAt, status: "in_progress", revision: expectedRevision + 1 };
    this.applications.set(applicationId, next);
    return next;
  }
  async addApplicationToInvitation({ invitation, expectedFamilyRevision, application }) {
    assert.equal(Number(this.invitationIds.get(invitation.id)?.familyRevision || 0), expectedFamilyRevision);
    this.invitationIds.set(invitation.id, invitation);
    this.invitations.set(invitation.tokenHash, invitation);
    this.applications.set(application.id, application);
  }
}

function staffService({ store = new StaffStore(), staffRoles = "info@ffe.org.au=admin" } = {}) {
  const sent = [];
  const service = createService({
    store,
    drive: {},
    sheets: { async apply() {} },
    mailer: { async send(message) { sent.push(message); return { messageId: "ses-1" }; } },
    env: {
      ALLOWED_ORIGINS: "https://ffe.org.au",
      STAFF_EMAILS: "info@ffe.org.au",
      STAFF_ROLES: staffRoles,
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
  const store = new StaffStore();
  store.records = [
    { entity: "eoi", data: { id: "eoi-1", reference: "EOI-1", submittedAt: "2026-08-01", status: "submitted", values: { eoi_first: "Alex", eoi_last: "Example", eoi_email: "family@example.com", eoi_student_first: "Avery", eoi_student_last: "Example", eoi_dob: "2020-01-01" } } },
    { entity: "application", data: { id: "app-1", invitationId: "invite-1", sourceEoiId: "eoi-1", status: "in_progress", recipientEmail: "family@example.com", values: { student_first: "Avery", student_last: "Example", student_dob: "2020-01-01" }, createdAt: "2026-08-02", updatedAt: "2026-08-03", currentStage: "student", percentComplete: 22 } },
    { entity: "invitation_index", data: { id: "invite-1", applicationId: "app-1", lastSentAt: "2026-08-02", sendCount: 1 } }
  ];
  const { service } = staffService({ store });
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

test("viewer staff can see summaries but cannot create invitations", async () => {
  const { service } = staffService({ staffRoles: "info@ffe.org.au=viewer" });
  const sessionToken = await staffSession(service);
  const dashboard = await service(event("/v6/staff/dashboard", "GET", null, sessionToken));
  assert.equal(dashboard.statusCode, 200);
  assert.equal(JSON.parse(dashboard.body).staff.role, "viewer");
  const invitation = await service(event("/v6/staff/invitations", "POST", { recipientEmail: "family@example.com" }, sessionToken));
  assert.equal(invitation.statusCode, 403);
});

test("staff portal creates a parent-only direct invitation without returning its private link", async () => {
  const { service, store } = staffService();
  const sessionToken = await staffSession(service);
  const response = await service(event("/v6/staff/invitations", "POST", { recipientEmail: "family@example.com", firstName: "Alex" }, sessionToken));
  assert.equal(response.statusCode, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.recipientEmail, "family@example.com");
  assert.equal("invitationUrl" in result, false);
  assert.equal(store.created.application.sourceEoiId, "");
  assert.equal(store.created.application.values.student_first, undefined);
  assert.ok(store.created.invitation.tokenHash);
});

test("verified family can create separate child applications but cannot select an unrelated record", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const invitationToken = new URL(created.invitationUrl).searchParams.get("invite");
  const requested = JSON.parse((await service(event("/v6/application/access/request-code", "POST", { invitationToken, email: "family@example.com" }))).body);
  const verifiedResponse = await service(event("/v6/application/access/verify-code", "POST", { invitationToken, challengeId: requested.challengeId, code: "123456" }));
  assert.equal(verifiedResponse.statusCode, 200);
  const verified = JSON.parse(verifiedResponse.body);
  assert.equal(verified.family.applications.length, 1);
  assert.equal(verified.family.applications[0].studentName, "");

  const firstResponse = await service(event("/v6/application/records", "POST", { studentFirstName: "Avery", studentLastName: "Example" }, verified.familySessionToken));
  assert.equal(firstResponse.statusCode, 200);
  const first = JSON.parse(firstResponse.body);
  assert.equal(first.context.studentName, "Avery Example");
  assert.equal(first.family.applications.length, 1);

  const secondResponse = await service(event("/v6/application/records", "POST", { studentFirstName: "Jordan", studentLastName: "Example" }, verified.familySessionToken));
  assert.equal(secondResponse.statusCode, 200);
  const second = JSON.parse(secondResponse.body);
  assert.notEqual(second.context.applicationId, first.context.applicationId);
  assert.equal(second.family.applications.length, 2);
  assert.equal(store.invitationIds.get(created.invitationId).familyRevision, 1);

  const selected = await service(event("/v6/application/records/select", "POST", { applicationId: first.context.applicationId }, verified.familySessionToken));
  assert.equal(selected.statusCode, 200);
  assert.equal(JSON.parse(selected.body).context.studentName, "Avery Example");

  store.applications.set(first.context.applicationId, { ...store.applications.get(first.context.applicationId), status: "submitted" });
  const completed = await service(event("/v6/application/records/select", "POST", { applicationId: first.context.applicationId }, verified.familySessionToken));
  assert.equal(completed.statusCode, 409);
  assert.equal(JSON.parse(completed.body).error, "APPLICATION_NOT_EDITABLE");

  store.applications.set("app-unrelated", { id: "app-unrelated", invitationId: "another-invitation", values: {}, status: "invited" });
  const denied = await service(event("/v6/application/records/select", "POST", { applicationId: "app-unrelated" }, verified.familySessionToken));
  assert.equal(denied.statusCode, 403);
  assert.equal(JSON.parse(denied.body).error, "APPLICATION_ACCESS_DENIED");
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
