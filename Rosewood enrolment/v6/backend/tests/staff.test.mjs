import assert from "node:assert/strict";
import test from "node:test";
import { currentFormDefinition, getFormDefinition } from "../form-definitions.mjs";
import { createApplicationInvitation, createService, renewApplicationInvitationAccess, resendApplicationInvitation, staffApplicationAttention, staffPlanningSummary } from "../service.mjs";

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
    this.formDefinitions = new Map();
    this.revisions = new Map();
    this.renewals = [];
    this.rateLimitChecks = [];
    this.caseReviews = new Map();
    this.caseMessages = new Map();
    this.meetingSeries = new Map();
    this.meetingSlots = new Map();
    this.meetingInvitations = new Map();
    this.meetingInvitationTokens = new Map();
    this.meetingInvitationScopes = new Map();
    this.meetingBookings = new Map();
    this.outboxEvents = [];
    this.emailOutboxStates = [];
  }
  async checkRateLimit(key, limit, seconds) {
    this.rateLimitChecks.push({ key, limit, seconds });
    return true;
  }
  async putChallenge(challenge) { this.challenges.set(challenge.id, challenge); }
  async getChallenge(id) { return this.challenges.get(id) || null; }
  async consumeChallenge(id) { return this.challenges.get(id) || null; }
  async failChallenge() {}
  async putSession(session) { this.sessions.set(session.tokenHash, session); }
  async getSession(tokenHash) { return this.sessions.get(tokenHash) || null; }
  async touchSession(tokenHash, { expiresAt, absoluteExpiresAt, lastActivityAt, now, ttl }) {
    const current = this.sessions.get(tokenHash);
    if (!current || current.expiresAt <= now) return null;
    const next = { ...current, expiresAt, absoluteExpiresAt, lastActivityAt, ttl };
    this.sessions.set(tokenHash, next);
    return next;
  }
  async deleteSession(tokenHash) { this.sessions.delete(tokenHash); }
  async enqueue() {}
  async recordAudit(event) { this.audit.push(event); }
  async listOutbox() { return []; }
  async listOperationalRecords() { return this.records; }
  async listEmailOutboxStates() { return this.emailOutboxStates; }
  async findApplicationBySourceEoi(sourceEoiId) { return this.records.find(item => item.entity === "application" && item.data.sourceEoiId === sourceEoiId)?.data || null; }
  async getEoi() { return null; }
  async ensureFormDefinition(definition) {
    const key = `${definition.workflow}:${definition.formVersion}`;
    const existing = this.formDefinitions.get(key);
    if (existing) assert.equal(existing.definitionHash, definition.definitionHash);
    else this.formDefinitions.set(key, definition);
    return definition;
  }
  addRevision(applicationId, revisionRecord) {
    if (!revisionRecord) return;
    const key = `REV#${String(revisionRecord.revision).padStart(8, "0")}#${String(revisionRecord.kind).toUpperCase()}`;
    const records = this.revisions.get(applicationId) || [];
    records.push({ revisionKey: key, ...structuredClone(revisionRecord) });
    this.revisions.set(applicationId, records);
  }
  async listApplicationRevisions(applicationId, limit = 100) { return (this.revisions.get(applicationId) || []).slice(-limit).reverse(); }
  async getApplicationRevision(applicationId, revisionKey) { return (this.revisions.get(applicationId) || []).find(record => record.revisionKey === revisionKey) || null; }
  async createInvitation(value) {
    this.created = value;
    this.invitations.set(value.tokenHash, value.invitation);
    this.invitationIds.set(value.invitation.id, value.invitation);
    this.applications.set(value.application.id, value.application);
    this.addRevision(value.application.id, value.revisionRecord);
  }
  async getInvitation(tokenHash) { return this.invitations.get(tokenHash) || null; }
  async getInvitationById(id) { return this.invitationIds.get(id) || null; }
  async getApplication(id) { return this.applications.get(id) || null; }
  async getCaseReview(applicationId) { return this.caseReviews.get(applicationId) || null; }
  async listCaseMessages(applicationId) { return [...this.caseMessages.values()].filter(message => message.applicationId === applicationId); }
  async getCaseMessage(applicationId, messageId) { const message = this.caseMessages.get(messageId); return message?.applicationId === applicationId ? message : null; }
  async saveCaseReview({ applicationId, review, expectedVersion, auditEvents = [] }) { assert.equal(Number(this.caseReviews.get(applicationId)?.version || 0), Number(expectedVersion)); this.caseReviews.set(applicationId, structuredClone(review)); this.audit.push(...auditEvents); return review; }
  async saveCaseMessage({ message, expectedStatus = "", outboxEvents = [], auditEvents = [] }) { const current = this.caseMessages.get(message.id); if (expectedStatus) assert.equal(current?.status, expectedStatus); else assert.equal(current, undefined); this.caseMessages.set(message.id, structuredClone(message)); this.outboxEvents.push(...outboxEvents); this.audit.push(...auditEvents); return message; }
  async recordCaseMessageDelivery({ messageId, deliveryStatus, at, messageIdFromProvider }) { const current = this.caseMessages.get(messageId); this.caseMessages.set(messageId, { ...current, deliveryStatus, deliveryAt: at, providerMessageId: messageIdFromProvider }); }
  async listMeetingSeries() { return [...this.meetingSeries.values()]; }
  async getMeetingSeries(id) { return this.meetingSeries.get(id) || null; }
  async createMeetingSeries(series, auditEvents = []) { this.meetingSeries.set(series.id, structuredClone(series)); this.audit.push(...auditEvents); return series; }
  async createMeetingSlot(slot, auditEvents = []) { const slots = this.meetingSlots.get(slot.seriesId) || []; slots.push(structuredClone(slot)); this.meetingSlots.set(slot.seriesId, slots); this.audit.push(...auditEvents); return slot; }
  async createMeetingSlots(slots, auditEvents = []) { for (const slot of slots) await this.createMeetingSlot(slot); this.audit.push(...auditEvents); return slots; }
  async listMeetingSlots(seriesId) { return structuredClone(this.meetingSlots.get(seriesId) || []); }
  async createMeetingInvitation({ invitation, tokenHash, outboxEvents = [], auditEvents = [] }) { const scoped = invitation.scopeKey ? this.meetingInvitationScopes.get(invitation.scopeKey) : null; if (scoped && scoped.expiresAt >= clock()) throw Object.assign(new Error("This family already has an active invitation for this meeting schedule."), { status: 409, code: "REVISION_CONFLICT" }); const stored = { ...invitation, tokenHash }; this.meetingInvitations.set(invitation.id, structuredClone(stored)); this.meetingInvitationTokens.set(tokenHash, structuredClone(stored)); if (invitation.scopeKey) this.meetingInvitationScopes.set(invitation.scopeKey, { invitationId: invitation.id, expiresAt: invitation.expiresAt }); this.outboxEvents.push(...outboxEvents); this.audit.push(...auditEvents); return invitation; }
  async getMeetingInvitation(tokenHash) { return this.meetingInvitationTokens.get(tokenHash) || null; }
  async getMeetingInvitationById(id) { return this.meetingInvitations.get(id) || null; }
  async listMeetingInvitations() { return structuredClone([...this.meetingInvitations.values()]); }
  async getMeetingBooking(seriesId, bookingId) { return structuredClone(this.meetingBookings.get(`${seriesId}:${bookingId}`) || null); }
  async bookMeetingSlot({ seriesId, slot, invitation, booking, outboxEvents = [], auditEvents = [] }) { const slots = this.meetingSlots.get(seriesId); const index = slots.findIndex(item => item.id === slot.id); assert.equal(slots[index].status, "available"); slots[index] = { ...slots[index], status: "booked", bookingId: booking.id }; this.meetingBookings.set(`${seriesId}:${booking.id}`, structuredClone(booking)); const booked = { ...invitation, status: "booked", bookingId: booking.id, expiresAt: Math.max(invitation.expiresAt, booking.manageUntil) }; this.meetingInvitations.set(invitation.id, booked); this.meetingInvitationTokens.set(invitation.tokenHash, booked); if (invitation.scopeKey) this.meetingInvitationScopes.set(invitation.scopeKey, { invitationId: invitation.id, expiresAt: booked.expiresAt }); this.outboxEvents.push(...outboxEvents); this.audit.push(...auditEvents); return booking; }
  async changeMeetingSlot({ seriesId, previousSlot, slot, invitation, booking, outboxEvents = [], auditEvents = [] }) { const slots = this.meetingSlots.get(seriesId); const previousIndex = slots.findIndex(item => item.id === previousSlot.id); const nextIndex = slots.findIndex(item => item.id === slot.id); assert.equal(slots[previousIndex].status, "booked"); assert.equal(slots[previousIndex].bookingId, booking.id); assert.equal(slots[nextIndex].status, "available"); slots[previousIndex] = { ...slots[previousIndex], status: "available", bookingId: undefined }; slots[nextIndex] = { ...slots[nextIndex], status: "booked", bookingId: booking.id }; this.meetingBookings.set(`${seriesId}:${booking.id}`, structuredClone(booking)); const booked = { ...invitation, status: "booked", bookingId: booking.id, expiresAt: Math.max(invitation.expiresAt, booking.manageUntil) }; this.meetingInvitations.set(invitation.id, booked); this.meetingInvitationTokens.set(invitation.tokenHash, booked); if (invitation.scopeKey) this.meetingInvitationScopes.set(invitation.scopeKey, { invitationId: invitation.id, expiresAt: booked.expiresAt }); this.outboxEvents.push(...outboxEvents); this.audit.push(...auditEvents); return booking; }
  async listApplicationsByInvitationId(invitationId) { return [...this.applications.values()].filter(application => application.invitationId === invitationId); }
  async renewInvitationAccess(value) {
    this.renewals.push(structuredClone(value));
    if (value.previousInvitation?.tokenHash) this.invitations.delete(value.previousInvitation.tokenHash);
    this.invitations.set(value.tokenHash, structuredClone(value.invitation));
    this.invitationIds.set(value.invitation.id, structuredClone(value.invitation));
  }
  async upgradeApplicationDefinition({ application, expectedRevision, expectedFormVersion, revisionRecord, auditEvents = [] }) {
    const current = this.applications.get(application.id);
    assert.equal(current.revision, expectedRevision);
    assert.equal(current.formVersion, expectedFormVersion);
    this.applications.set(application.id, structuredClone(application));
    this.addRevision(application.id, revisionRecord);
    this.audit.push(...auditEvents.map(event => structuredClone(event)));
    return structuredClone(application);
  }
  async saveDraft({ applicationId, expectedRevision, values, screen, stage, percentComplete, guardianCount, emergencyCount, savedAt, formVersion, formDefinitionHash, schemaVersion, revisionRecord }) {
    const current = this.applications.get(applicationId);
    assert.equal(current.revision, expectedRevision);
    const next = { ...current, values, screen, currentStage: stage, percentComplete, guardianCount, emergencyCount, updatedAt: savedAt, status: "in_progress", revision: expectedRevision + 1, formVersion, formDefinitionHash, schemaVersion };
    this.applications.set(applicationId, next);
    this.addRevision(applicationId, revisionRecord);
    return next;
  }
  async addApplicationToInvitation({ invitation, expectedFamilyRevision, application, revisionRecord }) {
    assert.equal(Number(this.invitationIds.get(invitation.id)?.familyRevision || 0), expectedFamilyRevision);
    this.invitationIds.set(invitation.id, invitation);
    this.invitations.set(invitation.tokenHash, invitation);
    this.applications.set(application.id, application);
    this.addRevision(application.id, revisionRecord);
  }
}

function staffService({ store = new StaffStore(), staffRoles = "info@ffe.org.au=admin", clockFn = clock, config = {}, drive = {}, artifacts = drive } = {}) {
  const sent = [];
  const service = createService({
    store,
    drive,
    artifacts,
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
      GOOGLE_OPERATIONS_SPREADSHEET_ID: "operations-sheet",
      ...config
    },
    clock: clockFn
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
    { entity: "application_request", data: { id: "request-1", requestedAt: "2026-08-02", parentGuardianName: "Alex Example", recipientEmail: "family@example.com", emailHash: "restricted-email-hash", networkFingerprint: "restricted-network-fingerprint", status: "invitation_queued", outcome: "created", invitationId: "invite-1", applicationId: "app-1" } },
    { entity: "application", data: { id: "app-1", invitationId: "invite-1", sourceEoiId: "eoi-1", status: "in_progress", recipientEmail: "family@example.com", values: { app_guardian_0_first: "Alex", app_guardian_0_last: "Example", student_first: "Avery", student_last: "Example", student_dob: "2020-01-01", entry_year: "2027", entry_level: "Foundation (Prep)" }, createdAt: "2026-08-02", updatedAt: "2026-08-03", currentStage: "student", percentComplete: 22 } },
    { entity: "invitation_index", data: { id: "invite-1", applicationId: "app-1", lastSentAt: "2026-08-02", sendCount: 1 } }
  ];
  const { service } = staffService({ store });
  const sessionToken = await staffSession(service);
  const response = await service(event("/v6/staff/dashboard", "GET", null, sessionToken));
  assert.equal(response.statusCode, 200);
  const dashboard = JSON.parse(response.body);
  assert.equal(dashboard.stats.inProgress, 1);
  assert.equal(dashboard.stats.applicationLinkRequests, 1);
  assert.equal(dashboard.applicationRequests[0].parentGuardianName, "Alex Example");
  assert.equal(dashboard.applicationRequests[0].requestStatus, "requested");
  assert.equal(dashboard.applicationRequests[0].emailDeliveryStatus, "unavailable");
  assert.equal(dashboard.eois[0].linkedApplicationId, "app-1");
  assert.equal(dashboard.applications[0].percentComplete, 22);
  assert.equal(dashboard.applications[0].entryYear, "2027");
  assert.equal(dashboard.applications[0].entryLevel, "Foundation (Prep)");
  assert.equal(dashboard.applications[0].parentGuardianName, "Alex Example");
  assert.equal(dashboard.applications[0].recordCategory, "family");
  assert.equal(dashboard.applications[0].planningStage, "in_progress");
  assert.equal(dashboard.planningSummary.unit, "student_application");
  assert.deepEqual(dashboard.planningSummary.stages.map(stage => [stage.id, stage.count]), [["not_started", 0], ["in_progress", 1], ["awaiting_signatures", 0], ["staff_review", 0], ["complete", 0]]);
  assert.equal("recipientEmail" in dashboard.planningSummary, false);
  assert.doesNotMatch(JSON.stringify(dashboard.planningSummary), /family@example\.com|2020-01-01/);
  assert.equal("dateOfBirth" in dashboard.eois[0], false);
  assert.doesNotMatch(response.body, /2020-01-01/);
  assert.doesNotMatch(response.body, /restricted-email-hash|restricted-network-fingerprint/);
});

test("staff application-link requests distinguish request history from current email delivery evidence", async () => {
  const store = new StaffStore();
  const request = (id, outcome = "created") => ({
    entity: "application_request",
    data: { id, requestedAt: "2026-08-05T10:00:00.000Z", parentGuardianName: "Synthetic Parent", recipientEmail: "parent@example.test", status: "invitation_queued", outcome, invitationId: `invite-${id}`, applicationId: `app-${id}` }
  });
  store.records = [
    request("request-unavailable"),
    request("request-queued"),
    request("request-sent", "reissued"),
    request("request-delivered"),
    request("request-delayed"),
    request("request-bounced"),
    request("request-failed"),
    { entity: "outbox_receipt", data: { kind: "email", createdAt: "2026-08-05T10:01:00.000Z", completedAt: "2026-08-05T10:02:00.000Z", payload: { to: "parent@example.test", tags: { workflow: "application_link_request", message_type: "application_link_requested", record_id: "request-sent" } }, result: { messageId: "ses-provider-id-not-for-dashboard" } } },
    { entity: "ses_event", data: { messageType: "application_link_requested", recordId: "request-delivered", deliveryStatus: "accepted_by_ses", occurredAt: "2026-08-05T10:02:00.000Z", messageId: "ses-delivered-private" } },
    { entity: "ses_event", data: { messageType: "application_link_requested", recordId: "request-delivered", deliveryStatus: "delivered", occurredAt: "2026-08-05T10:03:00.000Z", messageId: "ses-delivered-private" } },
    { entity: "ses_event", data: { messageType: "application_link_requested", recordId: "request-delayed", deliveryStatus: "delayed", occurredAt: "2026-08-05T10:03:00.000Z" } },
    { entity: "ses_event", data: { messageType: "application_link_requested", recordId: "request-bounced", deliveryStatus: "bounced", occurredAt: "2026-08-05T10:03:00.000Z" } }
  ];
  store.emailOutboxStates = [
    { state: "queued", occurredAt: "2026-08-05T10:01:00.000Z", messageType: "application_link_requested", recordId: "request-queued" },
    { state: "send_failed", occurredAt: "2026-08-05T10:04:00.000Z", messageType: "application_link_requested", recordId: "request-failed" },
    { state: "queued", occurredAt: "2026-08-05T10:04:00.000Z", messageType: "staff_otp", recordId: "request-unavailable" }
  ];
  const { service } = staffService({ store });
  const sessionToken = await staffSession(service);
  const response = await service(event("/v6/staff/dashboard", "GET", null, sessionToken));
  assert.equal(response.statusCode, 200);
  const requests = Object.fromEntries(JSON.parse(response.body).applicationRequests.map(item => [item.requestId, item]));

  assert.equal(requests["request-unavailable"].emailDeliveryStatus, "unavailable");
  assert.equal(requests["request-queued"].emailDeliveryStatus, "queued");
  assert.equal(requests["request-sent"].emailDeliveryStatus, "accepted_by_ses");
  assert.equal(requests["request-sent"].requestStatus, "requested_again");
  assert.equal(requests["request-delivered"].emailDeliveryStatus, "delivered");
  assert.equal(requests["request-delivered"].emailDeliveryAt, "2026-08-05T10:03:00.000Z");
  assert.equal(requests["request-delayed"].emailDeliveryStatus, "delayed");
  assert.equal(requests["request-bounced"].emailDeliveryStatus, "bounced");
  assert.equal(requests["request-failed"].emailDeliveryStatus, "send_failed");
  assert.doesNotMatch(response.body, /ses-provider-id-not-for-dashboard|ses-delivered-private/);
});

test("staff planning identity falls back to invitation or request contact before child details start", async () => {
  const store = new StaffStore();
  store.records = [
    { entity: "application_request", data: { id: "request-identity", parentGuardianName: "Alex Request", recipientEmail: "family@example.test", applicationId: "app-identity" } },
    { entity: "application", data: { id: "app-identity", invitationId: "invite-identity", status: "invited", recipientEmail: "family@example.test", values: {}, createdAt: "2026-08-02", updatedAt: "2026-08-02" } },
    { entity: "invitation_index", data: { id: "invite-identity", applicationId: "app-identity", firstName: "Alex", lastName: "Invitation", status: "active", expiresAt: clock() + 86400_000 } }
  ];
  const { service } = staffService({ store });
  const sessionToken = await staffSession(service);
  const dashboard = JSON.parse((await service(event("/v6/staff/dashboard", "GET", null, sessionToken))).body);
  assert.equal(dashboard.applications[0].parentGuardianName, "Alex Invitation");
  assert.equal(dashboard.applications[0].studentName, "");
  assert.equal(dashboard.applications[0].recipientEmail, "family@example.test");
  assert.equal(dashboard.applications[0].recordCategory, "test");
  assert.equal("parentGuardianName" in dashboard.planningSummary, false);
  assert.doesNotMatch(JSON.stringify(dashboard.planningSummary), /family@example\.test|Alex Invitation/);
});

test("staff planning classifies synthetic identities and test email markers without changing stored applications", async () => {
  const store = new StaffStore();
  store.records = [
    { entity: "application", data: { id: "app-synthetic-name", invitationId: "invite-synthetic-name", status: "in_progress", recipientEmail: "operator@ffe.org.au", values: { student_first: "Synthetic", student_last: "Address V69" }, createdAt: "2026-08-03", updatedAt: "2026-08-04" } },
    { entity: "application", data: { id: "app-test-email", invitationId: "invite-test-email", status: "invited", recipientEmail: "operator+canary@ffe.org.au", values: {}, createdAt: "2026-08-02", updatedAt: "2026-08-02" } },
    { entity: "application", data: { id: "app-family", invitationId: "invite-family", status: "invited", recipientEmail: "family@ffe.org.au", values: {}, createdAt: "2026-08-01", updatedAt: "2026-08-01" } },
    { entity: "invitation_index", data: { id: "invite-synthetic-name", applicationId: "app-synthetic-name", firstName: "QA", lastName: "Operator" } },
    { entity: "invitation_index", data: { id: "invite-test-email", applicationId: "app-test-email", firstName: "Monitoring", lastName: "Account" } },
    { entity: "invitation_index", data: { id: "invite-family", applicationId: "app-family", firstName: "Family", lastName: "Applicant" } }
  ];
  const { service } = staffService({ store });
  const sessionToken = await staffSession(service);
  const dashboard = JSON.parse((await service(event("/v6/staff/dashboard", "GET", null, sessionToken))).body);
  assert.deepEqual(Object.fromEntries(dashboard.applications.map(application => [application.applicationId, application.recordCategory])), {
    "app-synthetic-name": "test",
    "app-test-email": "test",
    "app-family": "family"
  });
  assert.equal("recordCategory" in store.records.find(record => record.data.id === "app-synthetic-name").data, false);
});

test("staff planning summary uses application stages and privacy-conscious cohort counts", () => {
  const applications = [
    { applicationId: "app-1", studentName: "Avery Example", reference: "APP-1", status: "invited", planningStage: "not_started", entryYear: "", entryLevel: "", updatedAt: "2026-08-05T10:00:00.000Z", attention: [] },
    { applicationId: "app-2", studentName: "Jordan Example", reference: "APP-2", status: "in_progress", planningStage: "in_progress", entryYear: "2027", entryLevel: "Foundation (Prep)", updatedAt: "2026-08-04T10:00:00.000Z", attention: [] },
    { applicationId: "app-3", studentName: "Morgan Example", reference: "APP-3", status: "pending_signatures", planningStage: "awaiting_signatures", entryYear: "2027", entryLevel: "Foundation (Prep)", updatedAt: "2026-08-03T10:00:00.000Z", attention: [{ id: "signature_outstanding", severity: "warning", label: "Signature still outstanding", detail: "3 days since submission." }] },
    { applicationId: "app-4", studentName: "Casey Example", reference: "APP-4", status: "staff_review_required", planningStage: "staff_review", entryYear: "2028", entryLevel: "Year 1", updatedAt: "2026-08-02T10:00:00.000Z", attention: [{ id: "staff_review_required", severity: "critical", label: "Staff review required", detail: "Staff follow-up." }] },
    { applicationId: "app-5", studentName: "Riley Example", reference: "APP-5", status: "submitted", planningStage: "complete", entryYear: "2027", entryLevel: "Year 1", updatedAt: "2026-08-01T10:00:00.000Z", attention: [] }
  ];
  const summary = staffPlanningSummary(applications, "2026-08-05T12:00:00.000Z");
  assert.equal(summary.totalApplications, 5);
  assert.deepEqual(summary.stages.map(stage => [stage.id, stage.count]), [["not_started", 1], ["in_progress", 1], ["awaiting_signatures", 1], ["staff_review", 1], ["complete", 1]]);
  assert.deepEqual(summary.entryMix, [
    { entryYear: "2027", entryLevel: "Foundation (Prep)", count: 2 },
    { entryYear: "2027", entryLevel: "Year 1", count: 1 },
    { entryYear: "2028", entryLevel: "Year 1", count: 1 },
    { entryYear: "", entryLevel: "", count: 1 }
  ]);
  assert.equal(summary.attention.total, 2);
  assert.equal(summary.attention.items[0].applicationId, "app-4");
  assert.equal("recipientEmail" in summary.attention.items[0], false);
});

test("staff attention flags actionable access, activity, signature, delivery and review conditions", () => {
  const inactive = staffApplicationAttention({ status: "in_progress", updatedAt: "2026-07-20T12:00:00.000Z", values: { entry_year: "2027", entry_level: "Year 1" } }, { invitationAccessStatus: "expired", invitationDeliveryStatus: "bounced", now: clock() });
  assert.deepEqual(inactive.map(reason => reason.id), ["email_delivery_failed", "application_access_unavailable", "application_inactive"]);

  const pending = staffApplicationAttention({ status: "pending_signatures", submittedAt: "2026-08-01T12:00:00.000Z", values: { entry_year: "2027" }, signerControls: [{ contactPermission: true, signatureRequired: true, signatureStatus: "pending", deliveryStatus: "delayed" }] }, { now: clock() });
  assert.deepEqual(pending.map(reason => reason.id), ["email_delivery_delayed", "signature_outstanding", "entry_details_missing"]);

  const review = staffApplicationAttention({ status: "staff_review_required", requiresStaffReview: true, updatedAt: "2026-08-05T10:00:00.000Z", values: { entry_year: "2027", entry_level: "Foundation (Prep)" } }, { now: clock() });
  assert.deepEqual(review.map(reason => reason.id), ["staff_review_required"]);

  const complete = staffApplicationAttention({ status: "submitted", updatedAt: "2026-08-05T10:00:00.000Z", values: { entry_year: "2027", entry_level: "Foundation (Prep)" } }, { now: clock() });
  assert.deepEqual(complete, []);

  const completeWithHistoricalBounce = staffApplicationAttention({ status: "submitted", updatedAt: "2026-08-05T10:00:00.000Z", values: { entry_year: "2027", entry_level: "Foundation (Prep)" }, signerControls: [{ contactPermission: true, signatureRequired: true, signatureStatus: "complete", deliveryStatus: "bounced" }] }, { invitationDeliveryStatus: "bounced", now: clock() });
  assert.deepEqual(completeWithHistoricalBounce, []);

  const suppressedWithHistoricalBounce = staffApplicationAttention({ status: "staff_review_required", requiresStaffReview: true, updatedAt: "2026-08-05T10:00:00.000Z", values: { entry_year: "2027", entry_level: "Foundation (Prep)" }, signerControls: [{ contactPermission: false, signatureRequired: true, signatureStatus: "pending", deliveryStatus: "bounced" }] }, { now: clock() });
  assert.deepEqual(suppressedWithHistoricalBounce.map(reason => reason.id), ["staff_review_required"]);
});

test("staff dashboard correlates the latest invitation feedback without exposing delivery identifiers", async () => {
  const store = new StaffStore();
  store.records = [
    { entity: "application", data: { id: "app-delivery", invitationId: "invite-delivery", status: "invited", recipientEmail: "private@example.test", values: {}, createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" } },
    { entity: "invitation_index", data: { id: "invite-delivery", applicationId: "app-delivery", status: "active", expiresAt: clock() + 86400_000, lastSentAt: "2026-08-05T10:00:00.000Z" } },
    { entity: "ses_event", data: { eventId: "restricted-event", messageId: "restricted-message", messageType: "invitation", recordId: "app-delivery", occurredAt: "2026-08-05T10:01:00.000Z", deliveryStatus: "delivered" } },
    { entity: "ses_event", data: { eventId: "restricted-event-latest", messageId: "restricted-message-latest", messageType: "invitation", recordId: "app-delivery", occurredAt: "2026-08-05T10:02:00.000Z", deliveryStatus: "bounced" } }
  ];
  const { service } = staffService({ store });
  const sessionToken = await staffSession(service);
  const dashboard = JSON.parse((await service(event("/v6/staff/dashboard", "GET", null, sessionToken))).body);
  assert.equal(dashboard.applications[0].invitationDeliveryStatus, "bounced");
  assert.equal(dashboard.applications[0].attention[0].id, "email_delivery_failed");
  assert.doesNotMatch(JSON.stringify(dashboard.planningSummary), /private@example\.test|restricted-event|restricted-message/);
});

test("viewer staff can see summaries but cannot create invitations", async () => {
  const { service } = staffService({ staffRoles: "info@ffe.org.au=viewer" });
  const sessionToken = await staffSession(service);
  const dashboard = await service(event("/v6/staff/dashboard", "GET", null, sessionToken));
  assert.equal(dashboard.statusCode, 200);
  assert.equal(JSON.parse(dashboard.body).staff.role, "viewer");
  const invitation = await service(event("/v6/staff/invitations", "POST", { recipientEmail: "family@example.com" }, sessionToken));
  assert.equal(invitation.statusCode, 403);
  const communication = await service(event("/v6/staff/applications/communications/context", "POST", { applicationId: "synthetic" }, sessionToken));
  assert.equal(communication.statusCode, 403);
  const meetingSeries = await service(event("/v6/staff/meetings/series", "POST", { title: "Synthetic", hostName: "Principal", location: "Rosewood" }, sessionToken));
  assert.equal(meetingSeries.statusCode, 403);
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
  const definition = currentFormDefinition("application");
  assert.equal(store.created.application.formVersion, definition.formVersion);
  assert.equal(store.created.application.formDefinitionHash, definition.definitionHash);
  assert.equal((await store.listApplicationRevisions(store.created.application.id))[0].kind, "created");
});

test("a restricted Google Places browser key is available to the public EOI and verified Application only", async () => {
  const browserKey = "synthetic-restricted-google-browser-key";
  const { service, store } = staffService({ config: { GOOGLE_MAPS_BROWSER_API_KEY: browserKey } });
  const eoiConfigResponse = await service(event("/v6/eoi/config"));
  assert.equal(eoiConfigResponse.statusCode, 200);
  assert.deepEqual(JSON.parse(eoiConfigResponse.body).addressAutocomplete, { enabled: true, provider: "google_places", apiKey: browserKey, region: "AU" });
  assert.match(eoiConfigResponse.headers["Cache-Control"], /no-store/);
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const invitationToken = new URL(created.invitationUrl).searchParams.get("invite");
  const requestedResponse = await service(event("/v6/application/access/request-code", "POST", { invitationToken, email: "family@example.com" }));
  assert.equal(requestedResponse.statusCode, 200);
  assert.doesNotMatch(requestedResponse.body, new RegExp(browserKey));
  const applicationOtpChecks = store.rateLimitChecks.filter(({ key }) => key.startsWith("otp-"));
  assert.deepEqual(applicationOtpChecks.map(({ key, limit, seconds }) => ({ key: key.split(":")[0], limit, seconds })), [
    { key: "otp-cooldown", limit: 1, seconds: 30 },
    { key: "otp-invite", limit: 5, seconds: 1800 },
    { key: "otp-email", limit: 5, seconds: 1800 },
    { key: "otp-network", limit: 100, seconds: 1800 }
  ]);

  const requested = JSON.parse(requestedResponse.body);
  const verifiedResponse = await service(event("/v6/application/access/verify-code", "POST", { invitationToken, challengeId: requested.challengeId, code: "123456" }));
  assert.equal(verifiedResponse.statusCode, 200);
  const verified = JSON.parse(verifiedResponse.body);
  assert.deepEqual(verified.context.addressAutocomplete, { enabled: true, provider: "google_places", apiKey: browserKey, region: "AU" });
  assert.doesNotMatch(JSON.stringify(verified.family), new RegExp(browserKey));
});

test("draft saves preserve fields omitted by a newer client and create immutable history", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const invitationToken = new URL(created.invitationUrl).searchParams.get("invite");
  const requested = JSON.parse((await service(event("/v6/application/access/request-code", "POST", { invitationToken, email: "family@example.com" }))).body);
  const verified = JSON.parse((await service(event("/v6/application/access/verify-code", "POST", { invitationToken, challengeId: requested.challengeId, code: "123456" }))).body);
  const started = JSON.parse((await service(event("/v6/application/records", "POST", { studentFirstName: "Avery", studentLastName: "Example" }, verified.familySessionToken))).body);
  const app = store.applications.get(started.context.applicationId);
  app.values.legacy_removed_question = "Preserve this historical answer";

  const savedResponse = await service(event("/v6/application/draft", "PUT", {
    expectedRevision: app.revision,
    values: { student_first: "Avery-Rose" },
    screen: 3,
    stage: "student",
    guardianCount: 2,
    emergencyCount: 2,
    percentComplete: 20,
    saveMode: "autosave",
    formVersion: app.formVersion,
    formDefinitionHash: app.formDefinitionHash
  }, started.sessionToken));
  assert.equal(savedResponse.statusCode, 200);
  const saved = store.applications.get(app.id);
  assert.equal(saved.values.student_first, "Avery-Rose");
  assert.equal(saved.values.student_last, "Example");
  assert.equal(saved.values.legacy_removed_question, "Preserve this historical answer");
  const revisions = await store.listApplicationRevisions(app.id);
  assert.equal(revisions[0].kind, "draft_autosaved");
  assert.equal(revisions[0].values.legacy_removed_question, "Preserve this historical answer");
});

test("a mismatched browser form contract cannot overwrite a version-pinned draft", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const invitationToken = new URL(created.invitationUrl).searchParams.get("invite");
  const requested = JSON.parse((await service(event("/v6/application/access/request-code", "POST", { invitationToken, email: "family@example.com" }))).body);
  const verified = JSON.parse((await service(event("/v6/application/access/verify-code", "POST", { invitationToken, challengeId: requested.challengeId, code: "123456" }))).body);
  const started = JSON.parse((await service(event("/v6/application/records", "POST", { studentFirstName: "Avery", studentLastName: "Example" }, verified.familySessionToken))).body);
  const response = await service(event("/v6/application/draft", "PUT", { expectedRevision: started.context.revision, values: { student_first: "Changed" }, screen: 3, stage: "student", guardianCount: 2, emergencyCount: 2, formVersion: "rosewood-application-future" }, started.sessionToken));
  assert.equal(response.statusCode, 409);
  assert.equal(JSON.parse(response.body).error, "FORM_VERSION_MISMATCH");
  assert.equal(store.applications.get(started.context.applicationId).values.student_first, "Avery");
});

test("staff can retrieve an audited historical answer snapshot", async () => {
  const { service, store } = staffService();
  const sessionToken = await staffSession(service);
  const definition = currentFormDefinition("application");
  const app = { id: "app-history", invitationId: "invite-history", recipientEmail: "family@example.com", status: "in_progress", revision: 1, values: { student_first: "Current" }, createdAt: "2026-08-05T10:00:00.000Z", updatedAt: "2026-08-05T11:00:00.000Z", formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
  store.applications.set(app.id, app);
  store.addRevision(app.id, { applicationId: app.id, revision: 0, kind: "created", status: "invited", stage: "gateway", savedAt: app.createdAt, values: { student_first: "Earlier" }, formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion });
  const detail = JSON.parse((await service(event("/v6/staff/applications/detail", "POST", { applicationId: app.id }, sessionToken))).body).application;
  assert.equal(detail.revisions.length, 1);
  assert.equal("values" in detail.revisions[0], false);
  const response = await service(event("/v6/staff/applications/revision", "POST", { applicationId: app.id, revisionKey: detail.revisions[0].revisionKey }, sessionToken));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).revision.values.student_first, "Earlier");
  assert.ok(store.audit.some(audit => audit.type === "staff.application_revision_viewed"));
});

test("authorised staff can create an audited short-lived preview only for a document in the application", async () => {
  const source = Buffer.from("%PDF-synthetic");
  let readInput;
  let previewInput;
  const drive = { async readApplicationDocument(input) { readInput = input; return { fileName: "synthetic.pdf", mimeType: "application/pdf", size: source.length, data: source }; } };
  const artifacts = { async createStaffPreview(input) { previewInput = input; return { previewUrl: "https://private.example/preview", downloadUrl: "https://private.example/download", expiresAt: "2026-09-01T00:05:00.000Z" }; } };
  const { service, store } = staffService({ staffRoles: "info@ffe.org.au=viewer", drive, artifacts });
  const sessionToken = await staffSession(service);
  store.applications.set("app-preview", { id: "app-preview", invitationId: "invite-preview", recipientEmail: "family@example.com", status: "in_progress", revision: 1, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", documents: { birth_certificate: [{ id: "drive-doc-1", category: "birth_certificate", fileName: "synthetic.pdf", mimeType: "application/pdf", size: source.length }] } });

  const response = await service(event("/v6/staff/applications/documents/preview", "POST", { applicationId: "app-preview", documentId: "drive-doc-1" }, sessionToken));
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.previewUrl, "https://private.example/preview");
  assert.equal(body.downloadUrl, "https://private.example/download");
  assert.equal("documentId" in body, false);
  assert.equal("storageKey" in body, false);
  assert.equal(readInput.applicationId, "app-preview");
  assert.equal(readInput.documentId, "drive-doc-1");
  assert.deepEqual(previewInput.data, source);
  assert.ok(store.audit.some(audit => audit.type === "staff.document_previewed" && audit.actorId === "info@ffe.org.au"));

  const missing = await service(event("/v6/staff/applications/documents/preview", "POST", { applicationId: "app-preview", documentId: "drive-doc-2" }, sessionToken));
  assert.equal(missing.statusCode, 404);
  assert.equal(JSON.parse(missing.body).error, "DOCUMENT_NOT_FOUND");

  const unauthenticated = await service(event("/v6/staff/applications/documents/preview", "POST", { applicationId: "app-preview", documentId: "drive-doc-1" }));
  assert.equal(unauthenticated.statusCode, 401);
  assert.equal(JSON.parse(unauthenticated.body).error, "SESSION_REQUIRED");
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

  const savedResponse = await service(event("/v6/application/draft", "PUT", { expectedRevision: first.context.revision, values: first.context.values, screen: 4, stage: "parent_guardian", guardianCount: 2, emergencyCount: 2, percentComplete: 40, saveMode: "autosave" }, first.sessionToken));
  assert.equal(savedResponse.statusCode, 200);
  assert.equal(JSON.parse(savedResponse.body).screen, 4);

  const secondResponse = await service(event("/v6/application/records", "POST", { studentFirstName: "Jordan", studentLastName: "Example" }, verified.familySessionToken));
  assert.equal(secondResponse.statusCode, 200);
  const second = JSON.parse(secondResponse.body);
  assert.notEqual(second.context.applicationId, first.context.applicationId);
  assert.equal(second.family.applications.length, 2);
  assert.equal(store.invitationIds.get(created.invitationId).familyRevision, 1);

  const selected = await service(event("/v6/application/records/select", "POST", { applicationId: first.context.applicationId }, verified.familySessionToken));
  assert.equal(selected.statusCode, 200);
  assert.equal(JSON.parse(selected.body).context.studentName, "Avery Example");
  assert.equal(JSON.parse(selected.body).context.screen, 4);

  store.applications.set(first.context.applicationId, { ...store.applications.get(first.context.applicationId), status: "submitted" });
  const completed = await service(event("/v6/application/records/select", "POST", { applicationId: first.context.applicationId }, verified.familySessionToken));
  assert.equal(completed.statusCode, 409);
  assert.equal(JSON.parse(completed.body).error, "APPLICATION_NOT_EDITABLE");

  store.applications.set("app-unrelated", { id: "app-unrelated", invitationId: "another-invitation", values: {}, status: "invited" });
  const denied = await service(event("/v6/application/records/select", "POST", { applicationId: "app-unrelated" }, verified.familySessionToken));
  assert.equal(denied.statusCode, 403);
  assert.equal(JSON.parse(denied.body).error, "APPLICATION_ACCESS_DENIED");
});

test("family sessions slide after activity, expire after inactivity and can be revoked", async () => {
  let now = clock();
  const clockFn = () => now;
  const { service, store } = staffService({ clockFn });
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock: clockFn });
  const invitationToken = new URL(created.invitationUrl).searchParams.get("invite");
  const requested = JSON.parse((await service(event("/v6/application/access/request-code", "POST", { invitationToken, email: "family@example.com" }))).body);
  const verified = JSON.parse((await service(event("/v6/application/access/verify-code", "POST", { invitationToken, challengeId: requested.challengeId, code: "123456" }))).body);
  assert.equal(verified.idleTimeoutSeconds, 5400);
  assert.equal(verified.absoluteTimeoutSeconds, 28800);

  const familySession = [...store.sessions.values()].find(session => session.scope === "application_family");
  assert.equal(familySession.expiresAt, now + 90 * 60_000);
  now += 60_000;
  const active = await service(event("/v6/application/records", "POST", { studentFirstName: "Avery", studentLastName: "Example" }, verified.familySessionToken));
  assert.equal(active.statusCode, 200);
  assert.equal([...store.sessions.values()].find(session => session.scope === "application_family").expiresAt, now + 90 * 60_000);

  const applicationToken = JSON.parse(active.body).sessionToken;
  const logout = await service(event("/v6/session/logout", "POST", {}, applicationToken));
  assert.equal(logout.statusCode, 200);
  assert.equal([...store.sessions.values()].some(session => session.scope === "application" && session.applicationId === created.applicationId), false);

  now += 91 * 60_000;
  const expired = await service(event("/v6/application/records", "POST", { studentFirstName: "Jordan", studentLastName: "Example" }, verified.familySessionToken));
  assert.equal(expired.statusCode, 401);
  assert.equal(JSON.parse(expired.body).error, "SESSION_EXPIRED");
});

test("an active older draft is upgraded once with every saved answer preserved", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const legacy = getFormDefinition("application", "rosewood-application-2026.6");
  const original = store.applications.get(created.applicationId);
  store.applications.set(original.id, {
    ...original,
    formVersion: legacy.formVersion,
    formDefinitionHash: legacy.definitionHash,
    schemaVersion: legacy.schemaVersion,
    values: { ...original.values, student_first: "Avery", legacy_removed_question: "Preserve this answer", reports_attached: "No", medicare_expiry: "2029-07-31", future_sibling_count: "7+" }
  });
  const invitationToken = new URL(created.invitationUrl).searchParams.get("invite");
  const requested = JSON.parse((await service(event("/v6/application/access/request-code", "POST", { invitationToken, email: "family@example.com" }))).body);
  const verified = JSON.parse((await service(event("/v6/application/access/verify-code", "POST", { invitationToken, challengeId: requested.challengeId, code: "123456" }))).body);
  const upgraded = store.applications.get(created.applicationId);
  assert.equal(upgraded.formVersion, currentFormDefinition("application").formVersion);
  assert.equal(upgraded.values.student_first, "Avery");
  assert.equal(upgraded.values.legacy_removed_question, "Preserve this answer");
  assert.equal(upgraded.values.reports_attached, "N/A");
  assert.equal(upgraded.values.medicare_expiry, "2029-07");
  assert.equal(upgraded.values.future_sibling_count, "7");
  assert.equal(verified.context.formVersion, currentFormDefinition("application").formVersion);
  assert.equal((await store.listApplicationRevisions(created.applicationId))[0].kind, "form_definition_upgraded");
  assert.ok(store.audit.some(eventRecord => eventRecord.type === "application.form_definition_upgraded"));
});

test("an active V14 draft adopts the current contract without transforming its family answers", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const v14 = getFormDefinition("application", "rosewood-application-2026.14");
  const original = store.applications.get(created.applicationId);
  const values = { ...original.values, future_siblings: "Yes", future_sibling_count: "2", saved_marker: "Preserve this answer" };
  store.applications.set(original.id, { ...original, formVersion: v14.formVersion, formDefinitionHash: v14.definitionHash, schemaVersion: v14.schemaVersion, values });
  const invitationToken = new URL(created.invitationUrl).searchParams.get("invite");
  const requested = JSON.parse((await service(event("/v6/application/access/request-code", "POST", { invitationToken, email: "family@example.com" }))).body);
  await service(event("/v6/application/access/verify-code", "POST", { invitationToken, challengeId: requested.challengeId, code: "123456" }));
  const upgraded = store.applications.get(created.applicationId);

  assert.equal(upgraded.formVersion, "rosewood-application-2026.27");
  assert.deepEqual(upgraded.values, values);
  assert.deepEqual(store.audit.find(eventRecord => eventRecord.type === "application.form_definition_upgraded").details.normalizedFields, []);
});

test("remembered staff sessions slide for two hours after each authorised activity", async () => {
  let now = clock();
  const { service, store } = staffService({ clockFn: () => now });
  const requested = JSON.parse((await service(event("/v6/staff/access/request-code", "POST", { email: "info@ffe.org.au" }))).body);
  const verified = JSON.parse((await service(event("/v6/staff/access/verify-code", "POST", { email: "info@ffe.org.au", challengeId: requested.challengeId, code: "123456", rememberMe: true }))).body);
  assert.equal(verified.rememberMe, true);
  const session = [...store.sessions.values()].find(item => item.scope === "staff");
  assert.equal(session.expiresAt, now + 2 * 60 * 60_000);
  now += 90 * 60_000;
  const dashboard = await service(event("/v6/staff/dashboard", "GET", null, verified.sessionToken));
  assert.equal(dashboard.statusCode, 200);
  assert.equal([...store.sessions.values()].find(item => item.scope === "staff").expiresAt, now + 2 * 60 * 60_000);
  now += 2 * 60 * 60_000 + 1;
  const expired = await service(event("/v6/staff/dashboard", "GET", null, verified.sessionToken));
  assert.equal(expired.statusCode, 401);
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

test("staff dashboard separates active resend from missing invitation access renewal", async () => {
  const store = new StaffStore();
  store.records = [
    { entity: "application", data: { id: "app-active", invitationId: "invite-active", status: "in_progress", revision: 2, recipientEmail: "active@example.com", values: {}, createdAt: "2026-08-01T00:00:00.000Z" } },
    { entity: "application", data: { id: "app-missing", invitationId: "invite-missing", status: "in_progress", revision: 3, recipientEmail: "missing@example.com", values: {}, createdAt: "2026-08-01T00:00:00.000Z" } },
    { entity: "application", data: { id: "app-submitted", invitationId: "invite-submitted", status: "submitted", revision: 4, recipientEmail: "submitted@example.com", values: {}, createdAt: "2026-08-01T00:00:00.000Z" } },
    { entity: "invitation_index", data: { id: "invite-active", applicationId: "app-active", applicationIds: ["app-active"], tokenHash: "active-token", status: "active", expiresAt: clock() + 60_000, lastSentAt: "2026-08-05T11:00:00.000Z", sendCount: 1 } }
  ];
  const { service } = staffService({ store });
  const sessionToken = await staffSession(service);
  const response = await service(event("/v6/staff/dashboard", "GET", null, sessionToken));
  const records = new Map(JSON.parse(response.body).applications.map(record => [record.applicationId, record]));

  assert.equal(records.get("app-active").invitationAccessStatus, "active");
  assert.equal(records.get("app-active").canResend, true);
  assert.equal(records.get("app-active").canRenewAccess, false);
  assert.equal(records.get("app-missing").invitationAccessStatus, "missing");
  assert.equal(records.get("app-missing").canResend, false);
  assert.equal(records.get("app-missing").canRenewAccess, true);
  assert.equal(records.get("app-submitted").canResend, false);
  assert.equal(records.get("app-submitted").canRenewAccess, false);
});

test("renewing missing invitation access preserves the application and is idempotent", async () => {
  const store = new StaffStore();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const originalApplication = structuredClone(store.applications.get(created.applicationId));
  const oldTokenHash = store.invitationIds.get(created.invitationId).tokenHash;
  store.invitationIds.delete(created.invitationId);
  store.invitations.delete(oldTokenHash);

  const operationId = "renew-access-operation-0001";
  const renewed = await renewApplicationInvitationAccess({ store, applicationId: created.applicationId, invitationId: created.invitationId, operationId, createdBy: "info@ffe.org.au", applicationUrl: "https://ffe.org.au/form", clock });
  const replacement = store.invitationIds.get(created.invitationId);

  assert.equal(renewed.applicationId, created.applicationId);
  assert.equal(renewed.invitationId, created.invitationId);
  assert.equal(renewed.deduplicated, false);
  assert.deepEqual(store.applications.get(created.applicationId), originalApplication);
  assert.equal(store.renewals.length, 1);
  assert.equal(store.renewals[0].expectedApplication.revision, originalApplication.revision);
  assert.equal(store.renewals[0].outboxEvents.filter(item => item.kind === "email").length, 1);
  assert.equal(store.renewals[0].auditEvents[0].type, "application.invitation_access_renewed");
  assert.equal(replacement.id, created.invitationId);
  assert.notEqual(replacement.tokenHash, oldTokenHash);

  const duplicate = await renewApplicationInvitationAccess({ store, applicationId: created.applicationId, invitationId: created.invitationId, operationId, createdBy: "info@ffe.org.au", applicationUrl: "https://ffe.org.au/form", clock });
  assert.equal(duplicate.deduplicated, true);
  assert.equal(store.renewals.length, 1);
  assert.equal(store.invitationIds.get(created.invitationId).tokenHash, replacement.tokenHash);
});

test("renewal refuses to replace an invitation that is still active", async () => {
  const store = new StaffStore();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  await assert.rejects(
    renewApplicationInvitationAccess({ store, applicationId: created.applicationId, invitationId: created.invitationId, operationId: "renew-access-operation-0002", createdBy: "info@ffe.org.au", applicationUrl: "https://ffe.org.au/form", clock }),
    error => error.code === "INVITATION_ACCESS_ACTIVE" && error.status === 409
  );
  assert.equal(store.renewals.length, 0);
});

test("renewing an expired invitation revokes its retained token and preserves family applications", async () => {
  let now = clock();
  const store = new StaffStore();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock: () => now });
  const expiredInvitation = store.invitationIds.get(created.invitationId);
  const secondApplication = { ...structuredClone(store.applications.get(created.applicationId)), id: "app-second-child", studentId: "student-second", revision: 5, values: { app_guardian_0_first: "Alex", app_guardian_0_email: "family@example.com", student_first: "Second" } };
  store.applications.set(secondApplication.id, secondApplication);
  expiredInvitation.applicationIds = [created.applicationId, secondApplication.id];
  store.invitationIds.set(created.invitationId, expiredInvitation);
  store.invitations.set(expiredInvitation.tokenHash, expiredInvitation);
  now = expiredInvitation.expiresAt + 1;

  await renewApplicationInvitationAccess({ store, applicationId: created.applicationId, invitationId: created.invitationId, operationId: "renew-expired-operation-0001", createdBy: "info@ffe.org.au", applicationUrl: "https://ffe.org.au/form", clock: () => now });
  const replacement = store.invitationIds.get(created.invitationId);

  assert.equal(store.invitations.has(expiredInvitation.tokenHash), false);
  assert.deepEqual(new Set(replacement.applicationIds), new Set([created.applicationId, secondApplication.id]));
  assert.equal(store.applications.get(secondApplication.id).revision, 5);
  assert.equal(store.applications.size, 2);
});

test("renewal resolves an ambiguous committed retry as the same idempotent operation", async () => {
  const store = new StaffStore();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const oldTokenHash = store.invitationIds.get(created.invitationId).tokenHash;
  store.invitationIds.delete(created.invitationId);
  store.invitations.delete(oldTokenHash);
  const commit = store.renewInvitationAccess.bind(store);
  store.renewInvitationAccess = async value => {
    await commit(value);
    throw Object.assign(new Error("Synthetic ambiguous transaction response"), { status: 409, code: "REVISION_CONFLICT" });
  };

  const result = await renewApplicationInvitationAccess({ store, applicationId: created.applicationId, invitationId: created.invitationId, operationId: "renew-ambiguous-operation-0001", createdBy: "info@ffe.org.au", applicationUrl: "https://ffe.org.au/form", clock });
  assert.equal(result.deduplicated, true);
  assert.equal(store.renewals.length, 1);
  assert.equal(store.applications.size, 1);
});

test("staff renewal endpoint recovers one existing application without creating another", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const oldTokenHash = store.invitationIds.get(created.invitationId).tokenHash;
  store.invitationIds.delete(created.invitationId);
  store.invitations.delete(oldTokenHash);
  const applicationCount = store.applications.size;
  const sessionToken = await staffSession(service);
  const body = { applicationId: created.applicationId, invitationId: created.invitationId, operationId: "staff-renew-operation-0001" };

  const response = await service(event("/v6/staff/invitations/renew-access", "POST", body, sessionToken));
  assert.equal(response.statusCode, 200);
  assert.match(JSON.parse(response.body).message, /saved progress was preserved/);
  assert.equal(store.applications.size, applicationCount);
  assert.equal(store.renewals.length, 1);

  const duplicate = await service(event("/v6/staff/invitations/renew-access", "POST", body, sessionToken));
  assert.equal(duplicate.statusCode, 200);
  assert.equal(store.applications.size, applicationCount);
  assert.equal(store.renewals.length, 1);
});

test("staff review and reviewed correspondence remain separate from the submitted application", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const original = structuredClone(store.applications.get(created.applicationId));
  const sessionToken = await staffSession(service);

  const reviewed = await service(event("/v6/staff/applications/review", "POST", { applicationId: created.applicationId, expectedVersion: 0, status: "in_progress", checklist: { identity_reviewed: true }, note: "Synthetic review note" }, sessionToken));
  assert.equal(reviewed.statusCode, 200);
  assert.equal(store.caseReviews.get(created.applicationId).version, 1);

  const draftResponse = await service(event("/v6/staff/applications/messages/draft", "POST", { applicationId: created.applicationId, recipientEmail: "family@example.com", purpose: "clarification", subject: "A question about your application", body: "Please clarify the synthetic test response." }, sessionToken));
  const draft = JSON.parse(draftResponse.body).message;
  assert.equal(draft.status, "draft");
  assert.equal(store.outboxEvents.length, 0);

  const sent = await service(event("/v6/staff/applications/messages/send", "POST", { applicationId: created.applicationId, messageId: draft.id, confirmation: "Send reviewed email" }, sessionToken));
  assert.equal(sent.statusCode, 200);
  assert.equal(store.caseMessages.get(draft.id).status, "sent");
  assert.equal(store.outboxEvents.filter(item => item.kind === "email").length, 1);
  assert.deepEqual(store.applications.get(created.applicationId), original);

  const detail = JSON.parse((await service(event("/v6/staff/applications/detail", "POST", { applicationId: created.applicationId }, sessionToken))).body).application;
  assert.ok(detail.review.sections.length > 5);
  assert.equal(detail.caseReview.status, "in_progress");
  assert.equal("communications" in detail, false);
  const communicationContext = JSON.parse((await service(event("/v6/staff/applications/communications/context", "POST", { applicationId: created.applicationId }, sessionToken))).body).application;
  assert.equal(communicationContext.communications.length, 1);
  assert.equal(communicationContext.recipients.length, 1);
});

test("do-not-contact blocks reviewed staff correspondence on the backend", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "primary@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const app = store.applications.get(created.applicationId);
  store.applications.set(app.id, { ...app, signerControls: [{ guardianId: "guardian-1", name: "Other Parent", currentEmail: "blocked@example.com", contactPermission: false }] });
  const sessionToken = await staffSession(service);
  const response = await service(event("/v6/staff/applications/messages/draft", "POST", { applicationId: app.id, recipientEmail: "blocked@example.com", purpose: "clarification", subject: "Synthetic", body: "This must not be stored or sent." }, sessionToken));
  assert.equal(response.statusCode, 403);
  assert.equal(store.caseMessages.size, 0);
  assert.equal(store.outboxEvents.length, 0);
});

test("principal meeting schedules use private invitations and atomically create and change one family booking", async () => {
  const { service, store } = staffService();
  const created = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  const sessionToken = await staffSession(service);
  const series = JSON.parse((await service(event("/v6/staff/meetings/series", "POST", { title: "Principal meeting", hostName: "Principal", location: "Rosewood College", durationMinutes: 30 }, sessionToken))).body).series;
  const startsAt = new Date(clock() + 86400_000).toISOString();
  const secondStartsAt = new Date(clock() + 2 * 86400_000).toISOString();
  const slotsResponse = await service(event("/v6/staff/meetings/slots/bulk", "POST", { seriesId: series.id, startsAt: [startsAt, secondStartsAt] }, sessionToken));
  assert.equal(slotsResponse.statusCode, 200);
  const [slot, secondSlot] = JSON.parse(slotsResponse.body).slots;
  const invited = await service(event("/v6/staff/applications/meeting-invitations", "POST", { applicationId: created.applicationId, seriesId: series.id, recipientEmail: "family@example.com", confirmation: "Send meeting invitation" }, sessionToken));
  assert.equal(invited.statusCode, 200);
  const invitation = [...store.meetingInvitations.values()][0];
  assert.equal(invitation.status, "pending");
  assert.equal(store.outboxEvents.filter(item => item.kind === "email").length, 1);
  const duplicateInvite = await service(event("/v6/staff/applications/meeting-invitations", "POST", { applicationId: created.applicationId, seriesId: series.id, recipientEmail: "family@example.com", confirmation: "Send meeting invitation" }, sessionToken));
  assert.equal(duplicateInvite.statusCode, 409);
  assert.equal(store.meetingInvitations.size, 1);

  const familyToken = "synthetic-meeting-session";
  store.sessions.set((await import("node:crypto")).createHash("sha256").update(familyToken).digest("hex"), { scope: "meeting_booking", meetingInvitationId: invitation.id, expiresAt: clock() + 1800000 });
  const context = JSON.parse((await service(event("/v6/meetings/context", "GET", null, familyToken))).body);
  assert.equal(context.slots.length, 2);
  const booked = await service(event("/v6/meetings/book", "POST", { slotId: slot.id }, familyToken));
  assert.equal(booked.statusCode, 200);
  const firstBooking = JSON.parse(booked.body).booking;
  assert.equal((await store.listMeetingSlots(series.id)).find(item => item.id === slot.id).status, "booked");
  assert.equal(store.applications.get(created.applicationId).status, "invited");

  const bookedContext = JSON.parse((await service(event("/v6/meetings/context", "GET", null, familyToken))).body);
  assert.equal(bookedContext.booking.id, firstBooking.id);
  assert.equal(bookedContext.slots.length, 1);
  assert.equal(bookedContext.slots[0].id, secondSlot.id);

  const changed = await service(event("/v6/meetings/book", "POST", { slotId: secondSlot.id }, familyToken));
  assert.equal(changed.statusCode, 200);
  assert.equal(JSON.parse(changed.body).changed, true);
  assert.equal(JSON.parse(changed.body).booking.id, firstBooking.id);
  const changedSlots = await store.listMeetingSlots(series.id);
  assert.equal(changedSlots.find(item => item.id === slot.id).status, "available");
  assert.equal(changedSlots.find(item => item.id === secondSlot.id).status, "booked");
  assert.equal(store.meetingBookings.size, 1);
  assert.equal((await store.getMeetingBooking(series.id, firstBooking.id)).revision, 2);
  assert.equal(store.applications.get(created.applicationId).status, "invited");
  assert.ok(store.audit.some(item => item.type === "meeting.booking_changed"));

  const staffMeetings = JSON.parse((await service(event("/v6/staff/meetings", "GET", null, sessionToken))).body);
  assert.equal(staffMeetings.series[0].invitations[0].booking.id, firstBooking.id);
  assert.equal(staffMeetings.series[0].invitations[0].booking.revision, 2);
});
