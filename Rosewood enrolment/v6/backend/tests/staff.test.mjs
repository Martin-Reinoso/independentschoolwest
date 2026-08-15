import assert from "node:assert/strict";
import test from "node:test";
import { currentFormDefinition, getFormDefinition } from "../form-definitions.mjs";
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
    this.formDefinitions = new Map();
    this.revisions = new Map();
  }
  async checkRateLimit() { return true; }
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

function staffService({ store = new StaffStore(), staffRoles = "info@ffe.org.au=admin", clockFn = clock, config = {} } = {}) {
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

test("an active V14 draft adopts V15 wording without transforming its family answers", async () => {
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

  assert.equal(upgraded.formVersion, "rosewood-application-2026.15");
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
