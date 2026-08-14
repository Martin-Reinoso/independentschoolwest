import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { currentFormDefinition } from "../form-definitions.mjs";
import { APPLICATION_V7_REQUIRED_FIELDS } from "../schema.mjs";
import { createService } from "../service.mjs";

const NOW = Date.parse("2026-08-08T06:00:00.000Z");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");

function request(path, method = "GET", body, sessionToken = "", extraHeaders = {}) {
  return {
    rawPath: path,
    requestContext: { http: { method, path, sourceIp: "192.0.2.44" } },
    headers: { origin: "https://ffe.org.au", ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}), ...extraHeaders },
    ...(body ? { body: JSON.stringify(body) } : {})
  };
}

function application({ contactPermission = true } = {}) {
  const definition = currentFormDefinition("application");
  const taskToken = "synthetic-original-signing-token-with-adequate-entropy";
  const taskTokenHash = hash(taskToken);
  const app = {
    id: "app-contact-workflow",
    invitationId: "invite-contact-workflow",
    contactId: "contact-applicant",
    recipientEmail: "applicant@example.test",
    studentId: "student-synthetic",
    reference: "APP-SYNTHETIC-CONTACT",
    status: contactPermission ? "pending_signatures" : "staff_review_required",
    revision: 7,
    revisionHash: "frozen-revision-synthetic",
    guardianCount: 2,
    emergencyCount: 2,
    guardianIds: ["guardian-applicant", "guardian-additional"],
    requiredSignatureCount: 2,
    signatureControlRevision: 1,
    requiresStaffReview: !contactPermission,
    oneSignatureExplanation: contactPermission ? "" : "The applicant asked Rosewood College to review the consent arrangements.",
    createdAt: "2026-08-08T04:00:00.000Z",
    updatedAt: "2026-08-08T05:00:00.000Z",
    submittedAt: "2026-08-08T05:00:00.000Z",
    completedAt: "",
    formVersion: definition.formVersion,
    formDefinitionHash: definition.definitionHash,
    schemaVersion: definition.schemaVersion,
    values: {
      student_first: "Avery",
      student_last: "Example",
      app_guardian_0_first: "Alex",
      app_guardian_0_last: "Applicant",
      app_guardian_0_email: "applicant@example.test",
      app_guardian_1_first: "Taylor",
      app_guardian_1_last: "Guardian",
      app_guardian_1_email: "old-guardian@example.test",
      app_guardian_1_permission: contactPermission ? "Yes, the school may contact this person" : "No, do not contact this person",
      previous_school_permission: "Confirmed",
      fee_option: "Both Parents / Guardian",
      application_one_signature_reason: contactPermission ? "" : "The applicant asked Rosewood College to review the consent arrangements."
    },
    documents: {},
    signatures: [{ id: "signature-primary", guardianId: "guardian-applicant", signerName: "Alex Applicant", signerEmail: "applicant@example.test", signedAt: "2026-08-08T05:00:00.000Z", revision: 7, revisionHash: "frozen-revision-synthetic" }],
    signerControls: [
      { guardianId: "guardian-applicant", guardianIndex: 0, name: "Alex Applicant", currentEmail: "applicant@example.test", previousEmails: [], contactPermission: true, contactPermissionValue: "Yes, the school may contact this person", signatureRequired: true, signatureStatus: "complete", requestGenerated: false, requestSent: false, requestStatus: "complete", requestGeneration: 0, completedAt: "2026-08-08T05:00:00.000Z", signedDocumentRevision: "frozen-revision-synthetic" },
      { guardianId: "guardian-additional", guardianIndex: 1, name: "Taylor Guardian", currentEmail: "old-guardian@example.test", previousEmails: [], contactPermission, contactPermissionValue: contactPermission ? "Yes, the school may contact this person" : "No, do not contact this person", signatureRequired: true, signatureStatus: contactPermission ? "pending" : "suppressed", requestGenerated: contactPermission, requestSent: contactPermission, requestStatus: contactPermission ? "sent" : "suppressed", requestGeneration: contactPermission ? 1 : 0, taskTokenHash: contactPermission ? taskTokenHash : "", requestCreatedAt: contactPermission ? "2026-08-08T05:00:00.000Z" : "", requestSentAt: contactPermission ? "2026-08-08T05:00:02.000Z" : "" }
    ]
  };
  const task = contactPermission ? { tokenHash: taskTokenHash, applicationId: app.id, guardianId: "guardian-additional", guardianIndex: 1, email: "old-guardian@example.test", status: "invited", requestStatus: "sent", requestGenerated: true, requestSent: true, generation: 1, revision: 7, revisionHash: app.revisionHash, createdAt: NOW - 60_000, expiresAt: NOW + 86400_000, ttl: Math.floor((NOW + 86400_000) / 1000) } : null;
  return { app, task, taskToken };
}

class WorkflowStore {
  constructor(app, task = null) {
    this.applications = new Map([[app.id, structuredClone(app)]]);
    this.tasks = new Map(task ? [[task.tokenHash, structuredClone(task)]] : []);
    this.sessions = new Map();
    this.challenges = new Map();
    this.idempotency = new Map();
    this.outbox = [];
    this.audit = [];
    this.receipts = [];
    this.rateLimitBlocked = new Set();
  }
  async getApplication(id) { return structuredClone(this.applications.get(id) || null); }
  async getInvitationById(id) { const app = [...this.applications.values()].find(item => item.invitationId === id); return app ? { id, applicationId: app.id, applicationIds: [app.id], contactId: app.contactId, recipientEmail: app.recipientEmail } : null; }
  async getSignatureTask(tokenHash) { return structuredClone(this.tasks.get(tokenHash) || null); }
  async listSignatureTasksForApplication(applicationId) { return [...this.tasks.values()].filter(task => task.applicationId === applicationId).map(task => structuredClone(task)); }
  async getSession(tokenHash) { return structuredClone(this.sessions.get(tokenHash) || null); }
  async putSession(session) { this.sessions.set(session.tokenHash, structuredClone(session)); }
  async touchSession(tokenHash, update) {
    const current = this.sessions.get(tokenHash);
    if (!current || current.expiresAt <= update.now) return null;
    const next = { ...current, ...update };
    this.sessions.set(tokenHash, next);
    return structuredClone(next);
  }
  async deleteSession(tokenHash) { this.sessions.delete(tokenHash); }
  async putChallenge(challenge) { this.challenges.set(challenge.id, structuredClone(challenge)); }
  async getChallenge(id) { return structuredClone(this.challenges.get(id) || null); }
  async consumeChallenge(id) { return this.challenges.has(id); }
  async failChallenge() {}
  async checkRateLimit(key) { return !this.rateLimitBlocked.has(key); }
  async getIdempotency(keyHash) { return structuredClone(this.idempotency.get(keyHash) || null); }
  async ensureFormDefinition(definition) { return definition; }
  async listApplicationRevisions() { return []; }
  async listOperationalRecords() { return [...this.applications.values()].map(data => ({ entity: "application", data: structuredClone(data) })); }
  async recordAudit(event) { this.audit.push(structuredClone(event)); }
  async enqueue(event) { this.addOutbox(event); }
  addOutbox(event) { this.outbox.push({ PK: "OUTBOX", SK: `PENDING#${event.createdAt}#${event.id}`, data: structuredClone(event), completed: false }); }
  async listOutbox(limit = 25) { return this.outbox.filter(item => !item.completed).slice(0, limit); }
  async claimOutbox(item) { return item.completed ? null : item; }
  async completeOutbox(item, result) { item.completed = true; this.receipts.push({ kind: item.data.kind, result: structuredClone(result) }); }
  async releaseOutbox() {}
  async recordSignatureProgress({ applicationId, guardianIndex, taskTokenHash, requestStatus, at, messageId = "" }) {
    const app = this.applications.get(applicationId);
    const task = this.tasks.get(taskTokenHash);
    const control = app?.signerControls?.[guardianIndex];
    if (!app || !task || task.status !== "invited" || control?.taskTokenHash !== taskTokenHash) return false;
    const field = requestStatus === "sent" ? "requestSentAt" : requestStatus === "opened" ? "openedAt" : "emailVerifiedAt";
    task.requestStatus = requestStatus;
    task[field] ||= at;
    control.requestStatus = requestStatus;
    control[field] ||= at;
    if (requestStatus === "sent") {
      task.requestSent = true;
      task.messageId = messageId;
      task.deliveryStatus = "accepted_by_ses";
      task.deliveryAt ||= at;
      control.requestSent = true;
      control.deliveryStatus = "accepted_by_ses";
      control.deliveryAt ||= at;
    }
    app.updatedAt = at;
    return true;
  }
  async replaceSignatureRequest({ applicationId, expectedControlRevision, previousTaskTokenHash, application, nextTask, idempotency, outboxEvents, auditEvents }) {
    const current = this.applications.get(applicationId);
    if (Number(current.signatureControlRevision) !== Number(expectedControlRevision) || this.idempotency.has(idempotency.keyHash)) throw Object.assign(new Error("conflict"), { status: 409 });
    if (previousTaskTokenHash) {
      const previousTask = this.tasks.get(previousTaskTokenHash);
      if (!previousTask || previousTask.status !== "invited") throw Object.assign(new Error("conflict"), { status: 409 });
      previousTask.status = "revoked";
      previousTask.revokedAt = application.updatedAt;
    }
    this.applications.set(applicationId, structuredClone(application));
    if (nextTask) this.tasks.set(nextTask.tokenHash, structuredClone(nextTask));
    this.idempotency.set(idempotency.keyHash, structuredClone(idempotency));
    outboxEvents.forEach(event => this.addOutbox(event));
    this.audit.push(...auditEvents.map(event => structuredClone(event)));
  }
  async revokeSigningArtifacts(taskTokenHash, at, reason) {
    let challenges = 0;
    let sessions = 0;
    for (const challenge of this.challenges.values()) if (challenge.subjectHash === taskTokenHash) { challenge.expiresAt = 0; challenge.revokedAt = at; challenge.revocationReason = reason; challenges += 1; }
    for (const session of this.sessions.values()) if (session.taskTokenHash === taskTokenHash) { session.expiresAt = 0; session.revokedAt = at; session.revocationReason = reason; sessions += 1; }
    return { challenges, sessions };
  }
  async completeSignature({ applicationId, taskTokenHash, application, outboxEvents, auditEvents }) {
    const task = this.tasks.get(taskTokenHash);
    const current = this.applications.get(applicationId);
    const control = current.signerControls.find(item => item.taskTokenHash === taskTokenHash);
    if (!task || task.status !== "invited" || !control || current.status !== "pending_signatures") throw Object.assign(new Error("conflict"), { status: 409 });
    task.status = "signed";
    task.signedAt = application.updatedAt;
    this.applications.set(applicationId, structuredClone(application));
    outboxEvents.forEach(event => this.addOutbox(event));
    this.audit.push(...auditEvents.map(event => structuredClone(event)));
  }
  async submitApplication({ applicationId, expectedRevision, application, signatureTasks, outboxEvents, auditEvents }) {
    const current = this.applications.get(applicationId);
    if (!current || current.revision !== expectedRevision || !["invited", "in_progress"].includes(current.status)) throw Object.assign(new Error("conflict"), { status: 409 });
    this.applications.set(applicationId, structuredClone(application));
    signatureTasks.forEach(task => this.tasks.set(task.tokenHash, structuredClone(task)));
    outboxEvents.forEach(event => this.addOutbox(event));
    this.audit.push(...auditEvents.map(event => structuredClone(event)));
  }
}

function fixture(options) {
  const record = application(options);
  const store = new WorkflowStore(record.app, record.task);
  const sent = [];
  const sheets = [];
  const slackMessages = [];
  const service = createService({
    store,
    artifacts: {
      async storeApplicationSnapshot() { return { id: "snapshot-file-synthetic", storageProvider: "google_drive", storageVersionId: "snapshot-version-synthetic" }; },
      async storeSignature() { return { id: "signature-file-synthetic", storageProvider: "google_drive", storageVersionId: "version-synthetic" }; }
    },
    sheets: { async apply(operation) { sheets.push(structuredClone(operation)); return { applied: true }; } },
    mailer: { async send(message) { sent.push(structuredClone(message)); return { messageId: `ses-${sent.length}` }; } },
    slack: { enabled: true, pendingEnabled: true, completionEnabled: true, async send(message) { slackMessages.push(structuredClone(message)); return { delivered: true }; } },
    env: {
      ALLOWED_ORIGINS: "https://ffe.org.au",
      STAFF_EMAILS: "info@ffe.org.au",
      STAFF_ROLES: "info@ffe.org.au=admin",
      OTP_HMAC_SECRET: "synthetic-otp-secret",
      NETWORK_HMAC_SECRET: "synthetic-network-secret",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html",
      GOOGLE_APPLICATION_SPREADSHEET_ID: "application-sheet",
      GOOGLE_OPERATIONS_SPREADSHEET_ID: "operations-sheet"
    },
    clock: () => NOW
  });
  return { ...record, store, sent, sheets, slackMessages, service };
}

function seedSession(store, rawToken, session) {
  store.sessions.set(hash(rawToken), { createdAt: NOW - 60_000, expiresAt: NOW + 3600_000, absoluteExpiresAt: NOW + 7200_000, ttl: Math.floor((NOW + 86400_000) / 1000), ...session });
}

function signingTokenFrom(message) {
  const match = message.html.match(/[?&]task=([^"&<]+)/);
  assert.ok(match, "signature email contains a private task token");
  return decodeURIComponent(match[1]);
}

function validSubmissionValues(permission) {
  const values = Object.fromEntries(APPLICATION_V7_REQUIRED_FIELDS.map(field => [field, "Synthetic"]));
  values.application_signature_ip = ["Confirmed"];
  values.application_signature_terms = ["Confirmed"];
  values.application_signature_date = "1999-01-01";
  values.application_student_agreement = ["Confirmed"];
  values.application_parent_agreement = ["Confirmed"];
  values.application_agreement_acknowledgement = ["Confirmed"];
  values.application_additional_signature_later = ["Confirmed"];
  values.application_one_signature_reason = permission === "No, do not contact this person" ? "The applicant asked Rosewood College to review consent arrangements." : "";
  values.previous_school_attended = "No";
  values.interrupted_schooling = "No";
  values.formal_assessment = "No";
  values.healthcare_card = "No";
  values.medicare_expiry = "2030-06";
  for (let index = 0; index < 2; index += 1) {
    const prefix = `app_guardian_${index}_`;
    for (const suffix of ["first", "last", "mobile", "relationship", "contact_type", "sms", "healthcare", "address", "suburb", "state", "postcode", "country", "occupation_group", "occupation", "school_education", "further_education", "birth_country", "nationality", "languages", "residency", "indigenous", "marital", "religion"]) values[`${prefix}${suffix}`] = "Synthetic";
    values[`${prefix}first`] = index ? "Taylor" : "Alex";
    values[`${prefix}last`] = index ? "Guardian" : "Applicant";
  }
  values.app_guardian_0_email = "applicant@example.test";
  values.app_guardian_1_email = "guardian@example.test";
  values.app_guardian_1_permission = permission;
  for (let index = 0; index < 2; index += 1) for (const suffix of ["first", "last", "relationship", "mobile"]) values[`emergency_${index}_${suffix}`] = "Synthetic";
  return values;
}

test("signature delivery is created only by submission and is suppressed for do-not-contact", async () => {
  for (const permission of ["Yes, the school may contact this person", "No, do not contact this person"]) {
    const setup = fixture({ contactPermission: true });
    const { app, store, sent, slackMessages, service } = setup;
    const draft = {
      ...app,
      status: "in_progress",
      reference: "",
      values: validSubmissionValues(permission),
      documents: { birth_certificate: [{ id: "birth-synthetic", documentId: "birth-synthetic", category: "birth_certificate", fileName: "synthetic-birth.pdf", mimeType: "application/pdf", size: 1024, checksum: "synthetic", malwareScanStatus: "no_threats_found", storageProvider: "google_drive", uploadedAt: "2026-08-08T04:30:00.000Z" }] },
      signatures: [],
      signerControls: undefined,
      signatureControlRevision: undefined,
      requiredSignatureCount: 0,
      requiresStaffReview: false,
      revisionHash: ""
    };
    store.applications.set(app.id, draft);
    store.tasks.clear();
    const applicationSession = `submission-session-${permission.slice(0, 3)}`;
    seedSession(store, applicationSession, { scope: "application", applicationId: app.id, invitationId: app.invitationId, contactId: app.contactId, email: app.recipientEmail });
    assert.equal(sent.length, 0);
    const signatureBytes = Buffer.alloc(120);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(signatureBytes);
    const response = await service(request("/v6/application/submit", "POST", { expectedRevision: draft.revision, formVersion: draft.formVersion, formDefinitionHash: draft.formDefinitionHash, signatureDataUrl: `data:image/png;base64,${signatureBytes.toString("base64")}` }, applicationSession));
    assert.equal(response.statusCode, 200);
    const submitted = store.applications.get(app.id);
    assert.equal(submitted.values.application_signature_date, "2026-08-08", "the backend replaces any browser-supplied signing date");
    const guardianMessages = sent.filter(message => message.to === "guardian@example.test" && message.tags?.message_type === "signature_invitation");
    if (permission.startsWith("Yes")) {
      assert.equal(submitted.status, "pending_signatures");
      assert.equal(guardianMessages.length, 1);
      assert.equal(submitted.signerControls[1].signatureStatus, "pending");
      assert.equal(slackMessages.length, 1);
      assert.deepEqual(slackMessages[0], {
        type: "signature_pending",
        reference: submitted.reference,
        studentName: "Synthetic Synthetic",
        signedBy: ["Alex Applicant"],
        submittedAt: submitted.submittedAt,
        awaitingSignatures: ["Taylor Guardian"]
      });
    } else {
      assert.equal(submitted.status, "staff_review_required");
      assert.equal(submitted.requiresStaffReview, true);
      assert.equal(guardianMessages.length, 0);
      assert.equal(submitted.signerControls[1].signatureStatus, "suppressed");
      assert.equal(submitted.oneSignatureExplanation, "The applicant asked Rosewood College to review consent arrangements.");
      assert.equal(slackMessages.length, 0, "staff review does not notify Slack");
    }
    assert.equal(store.applications.size, 1);
  }
});

test("a one-guardian application queues one completion notification", async () => {
  const { app, store, slackMessages, service } = fixture({ contactPermission: true });
  const values = validSubmissionValues("Yes, the school may contact this person");
  values.application_one_signature_reason = "Only one parent or guardian is included in this synthetic application.";
  const draft = {
    ...app,
    status: "in_progress",
    reference: "",
    guardianCount: 1,
    guardianIds: [app.guardianIds[0]],
    values,
    documents: { birth_certificate: [{ id: "birth-synthetic", documentId: "birth-synthetic", category: "birth_certificate", fileName: "synthetic-birth.pdf", mimeType: "application/pdf", size: 1024, checksum: "synthetic", malwareScanStatus: "no_threats_found", storageProvider: "google_drive", uploadedAt: "2026-08-08T04:30:00.000Z" }] },
    signatures: [],
    signerControls: undefined,
    signatureControlRevision: undefined,
    requiredSignatureCount: 0,
    requiresStaffReview: false,
    revisionHash: ""
  };
  store.applications.set(app.id, draft);
  store.tasks.clear();
  const applicationSession = "single-guardian-submission-session";
  seedSession(store, applicationSession, { scope: "application", applicationId: app.id, invitationId: app.invitationId, contactId: app.contactId, email: app.recipientEmail });
  const signatureBytes = Buffer.alloc(120);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(signatureBytes);
  const response = await service(request("/v6/application/submit", "POST", { expectedRevision: draft.revision, formVersion: draft.formVersion, formDefinitionHash: draft.formDefinitionHash, signatureDataUrl: `data:image/png;base64,${signatureBytes.toString("base64")}` }, applicationSession));
  assert.equal(response.statusCode, 200);
  assert.equal(store.applications.get(app.id).status, "submitted");
  assert.equal(slackMessages.length, 1);
  assert.equal(slackMessages[0].reference, store.applications.get(app.id).reference);
  assert.equal(slackMessages[0].completedAt, store.applications.get(app.id).completedAt);
  assert.equal(slackMessages[0].type, "application_complete");
  assert.equal(slackMessages[0].studentName, "Synthetic Synthetic");
  assert.deepEqual(slackMessages[0].signedBy, ["Alex Applicant"]);
  assert.deepEqual(Object.keys(slackMessages[0]).sort(), ["completedAt", "reference", "signedBy", "studentName", "type"]);
});

test("an intermediate guardian signature reports who signed and who remains", async () => {
  const { app, store, slackMessages, service } = fixture({ contactPermission: true });
  const thirdTaskToken = "synthetic-third-signing-token-with-adequate-entropy";
  const thirdTaskHash = hash(thirdTaskToken);
  const expanded = structuredClone(app);
  expanded.guardianCount = 3;
  expanded.guardianIds.push("guardian-third");
  Object.assign(expanded.values, {
    app_guardian_2_first: "Morgan",
    app_guardian_2_last: "Guardian",
    app_guardian_2_email: "third-guardian@example.test",
    app_guardian_2_permission: "Yes, the school may contact this person"
  });
  expanded.signerControls.push({
    guardianId: "guardian-third",
    guardianIndex: 2,
    name: "Morgan Guardian",
    currentEmail: "third-guardian@example.test",
    previousEmails: [],
    contactPermission: true,
    contactPermissionValue: "Yes, the school may contact this person",
    signatureRequired: true,
    signatureStatus: "pending",
    requestGenerated: true,
    requestSent: true,
    requestStatus: "sent",
    requestGeneration: 1,
    taskTokenHash: thirdTaskHash
  });
  expanded.requiredSignatureCount = 3;
  store.applications.set(app.id, expanded);
  store.tasks.set(thirdTaskHash, { tokenHash: thirdTaskHash, applicationId: app.id, guardianId: "guardian-third", guardianIndex: 2, email: "third-guardian@example.test", status: "invited", requestStatus: "sent", generation: 1, revision: app.revision, revisionHash: app.revisionHash, createdAt: NOW - 60_000, expiresAt: NOW + 86400_000, ttl: Math.floor((NOW + 86400_000) / 1000) });
  const signingSession = "intermediate-signature-session";
  seedSession(store, signingSession, { scope: "application_signature", applicationId: app.id, taskTokenHash: hash("synthetic-original-signing-token-with-adequate-entropy"), taskGeneration: 1, guardianId: "guardian-additional", guardianIndex: 1, email: "old-guardian@example.test" });
  const signatureBytes = Buffer.alloc(120);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(signatureBytes);
  const response = await service(request("/v6/application/signatures/submit", "POST", { reviewAcknowledged: true, ipAcknowledged: true, termsAcknowledged: true, signatureDataUrl: `data:image/png;base64,${signatureBytes.toString("base64")}` }, signingSession));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).status, "pending_signatures");
  assert.equal(store.applications.get(app.id).status, "pending_signatures");
  assert.equal(slackMessages.length, 1);
  assert.equal(slackMessages[0].type, "signature_pending");
  assert.deepEqual(slackMessages[0].signedBy, ["Alex Applicant", "Taylor Guardian"]);
  assert.deepEqual(slackMessages[0].awaitingSignatures, ["Morgan Guardian"]);
});

test("do-not-contact is enforced in family actions and an audited staff change is reversible", async () => {
  const { app, store, sent, service } = fixture({ contactPermission: false });
  const statusToken = "synthetic-family-status-token";
  seedSession(store, statusToken, { scope: "application_status", applicationId: app.id, invitationId: app.invitationId, applicantContactId: app.contactId, email: app.recipientEmail });

  const statusResponse = await service(request("/v6/application/status", "GET", null, statusToken));
  const status = JSON.parse(statusResponse.body);
  assert.equal(status.signers[1].contactPermission, "Do not contact");
  assert.equal(status.signers[1].requestStatus, "Signature request suppressed");
  assert.equal(status.signers[1].canCorrectEmail, false);
  assert.equal(status.signers[1].canResend, false);

  const resend = await service(request("/v6/application/status/signatures/resend", "POST", { guardianId: "guardian-additional" }, statusToken, { "idempotency-key": "prohibited-resend" }));
  assert.equal(resend.statusCode, 409);
  const correction = await service(request("/v6/application/status/signatures/correction/request-code", "POST", { guardianId: "guardian-additional" }, statusToken));
  assert.equal(correction.statusCode, 409);
  assert.equal(sent.length, 0);

  const staffToken = "synthetic-staff-session-token";
  seedSession(store, staffToken, { scope: "staff", email: "info@ffe.org.au", role: "admin" });
  const enable = await service(request("/v6/staff/applications/contact-permission", "POST", { applicationId: app.id, guardianId: "guardian-additional", permission: "Yes, the school may contact this person", confirmation: "I confirm this authorised contact-permission change" }, staffToken, { "idempotency-key": "authorise-contact" }));
  assert.equal(enable.statusCode, 200);
  assert.equal(sent.filter(message => message.tags?.message_type === "signature_invitation_resent").length, 1);
  assert.equal(store.applications.size, 1);

  const disable = await service(request("/v6/staff/applications/contact-permission", "POST", { applicationId: app.id, guardianId: "guardian-additional", permission: "No, do not contact this person", confirmation: "I confirm this authorised contact-permission change" }, staffToken, { "idempotency-key": "suppress-contact" }));
  assert.equal(disable.statusCode, 200);
  const after = store.applications.get(app.id);
  assert.equal(after.signerControls[1].contactPermission, false);
  assert.equal(after.signerControls[1].signatureStatus, "suppressed");
  assert.equal(after.requiresStaffReview, true);
  assert.equal(after.status, "staff_review_required");
  assert.ok(store.audit.some(event => event.type === "application.staff_contact_permission_disabled"));

  const sentBeforeReplay = sent.length;
  const replay = await service(request("/v6/staff/applications/contact-permission", "POST", { applicationId: app.id, guardianId: "guardian-additional", permission: "No, do not contact this person", confirmation: "I confirm this authorised contact-permission change" }, staffToken, { "idempotency-key": "suppress-contact" }));
  assert.equal(replay.statusCode, 200);
  assert.equal(sent.length, sentBeforeReplay);
});

test("a verified applicant can correct a pending signer email without reopening or duplicating the application", async () => {
  const { app, store, sent, slackMessages, service, taskToken } = fixture({ contactPermission: true });
  const statusToken = "synthetic-family-status-token";
  seedSession(store, statusToken, { scope: "application_status", applicationId: app.id, invitationId: app.invitationId, applicantContactId: app.contactId, email: app.recipientEmail });

  await service(request("/v6/application/signatures/opened", "POST", { taskToken }));
  const oldOtpRequest = JSON.parse((await service(request("/v6/application/signatures/request-code", "POST", { taskToken, email: "old-guardian@example.test" }))).body);
  const oldVerification = JSON.parse((await service(request("/v6/application/signatures/verify-code", "POST", { taskToken, challengeId: oldOtpRequest.challengeId, code: "123456" }))).body);
  const oldSigningSessionHash = hash(oldVerification.sessionToken);
  assert.equal(store.applications.get(app.id).signerControls[1].requestStatus, "verified");

  const correctionRequest = JSON.parse((await service(request("/v6/application/status/signatures/correction/request-code", "POST", { guardianId: "guardian-additional" }, statusToken))).body);
  assert.equal(sent.at(-1).to, "applicant@example.test");
  const correctionVerification = JSON.parse((await service(request("/v6/application/status/signatures/correction/verify-code", "POST", { guardianId: "guardian-additional", challengeId: correctionRequest.challengeId, code: "123456" }, statusToken))).body);
  const correctionBody = { email: "corrected-guardian@example.test", emailConfirmation: "corrected-guardian@example.test", confirmed: true };
  const correctionHeaders = { "idempotency-key": "correct-email-once" };
  const correctionResponse = await service(request("/v6/application/status/signatures/correction/confirm", "POST", correctionBody, correctionVerification.correctionSessionToken, correctionHeaders));
  assert.equal(correctionResponse.statusCode, 200);

  const corrected = store.applications.get(app.id);
  assert.equal(store.applications.size, 1);
  assert.equal(corrected.id, app.id);
  assert.equal(corrected.revision, app.revision);
  assert.equal(corrected.status, "pending_signatures");
  assert.equal(corrected.signatures[0].id, "signature-primary");
  assert.equal(corrected.signerControls[1].currentEmail, "corrected-guardian@example.test");
  assert.equal(corrected.signerControls[1].previousEmails[0].email, "old-guardian@example.test");
  assert.equal(store.tasks.get(hash(taskToken)).status, "revoked");
  assert.equal(store.sessions.get(oldSigningSessionHash).expiresAt, 0);
  assert.ok(store.audit.some(event => event.type === "application.signature_security_artifacts_revoked"));

  const correctedInvitation = sent.find(message => message.to === "corrected-guardian@example.test" && message.tags?.message_type === "signature_email_corrected");
  assert.ok(correctedInvitation);
  const correctedTaskToken = signingTokenFrom(correctedInvitation);
  assert.equal(store.tasks.get(hash(correctedTaskToken)).status, "invited");

  const sentBeforeDuplicate = sent.length;
  const duplicate = await service(request("/v6/application/status/signatures/correction/confirm", "POST", correctionBody, correctionVerification.correctionSessionToken, correctionHeaders));
  assert.equal(duplicate.statusCode, 200);
  assert.equal(sent.length, sentBeforeDuplicate);

  const resendHeaders = { "idempotency-key": "resend-corrected-request" };
  const resendResponse = await service(request("/v6/application/status/signatures/resend", "POST", { guardianId: "guardian-additional" }, statusToken, resendHeaders));
  assert.equal(resendResponse.statusCode, 200);
  const sentAfterResend = sent.length;
  const duplicateResend = await service(request("/v6/application/status/signatures/resend", "POST", { guardianId: "guardian-additional" }, statusToken, resendHeaders));
  assert.equal(duplicateResend.statusCode, 200);
  assert.equal(sent.length, sentAfterResend);
  const replacementInvitation = sent.findLast(message => message.to === "corrected-guardian@example.test" && message.tags?.message_type === "signature_invitation_resent");
  const replacementTaskToken = signingTokenFrom(replacementInvitation);
  const replacementTaskHash = hash(replacementTaskToken);
  assert.equal(store.tasks.get(hash(correctedTaskToken)).status, "revoked");
  assert.equal(store.tasks.get(replacementTaskHash).status, "invited");

  const oldSessionAttempt = await service(request("/v6/application/signatures/submit", "POST", { reviewAcknowledged: true, ipAcknowledged: true, termsAcknowledged: true, signatureDataUrl: "data:image/png;base64,invalid" }, oldVerification.sessionToken));
  assert.equal(oldSessionAttempt.statusCode, 401);
  const beforeOldLink = sent.length;
  await service(request("/v6/application/signatures/request-code", "POST", { taskToken, email: "old-guardian@example.test" }));
  assert.equal(sent.length, beforeOldLink);

  await service(request("/v6/application/signatures/opened", "POST", { taskToken: replacementTaskToken }));
  const newOtpRequest = JSON.parse((await service(request("/v6/application/signatures/request-code", "POST", { taskToken: replacementTaskToken, email: "corrected-guardian@example.test" }))).body);
  const newVerification = JSON.parse((await service(request("/v6/application/signatures/verify-code", "POST", { taskToken: replacementTaskToken, challengeId: newOtpRequest.challengeId, code: "123456" }))).body);
  const signatureBytes = Buffer.alloc(120);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(signatureBytes);
  const signed = await service(request("/v6/application/signatures/submit", "POST", { reviewAcknowledged: true, ipAcknowledged: true, termsAcknowledged: true, signatureDataUrl: `data:image/png;base64,${signatureBytes.toString("base64")}` }, newVerification.sessionToken));
  assert.equal(signed.statusCode, 200);
  assert.equal(JSON.parse(signed.body).status, "submitted");
  assert.equal(store.applications.get(app.id).signerControls[1].signatureStatus, "complete");
  assert.equal(store.applications.get(app.id).signatures[0].id, "signature-primary");
  assert.equal(store.applications.get(app.id).signatures[1].signerEmail, "corrected-guardian@example.test");
  assert.equal(slackMessages.length, 1);
  assert.equal(slackMessages[0].type, "application_complete");
  assert.equal(slackMessages[0].studentName, "Avery Example");
  assert.deepEqual(slackMessages[0].signedBy, ["Alex Applicant", "Taylor Guardian"]);
  assert.deepEqual(Object.keys(slackMessages[0]).sort(), ["completedAt", "reference", "signedBy", "studentName", "type"]);

  const finalStatus = JSON.parse((await service(request("/v6/application/status", "GET", null, statusToken))).body);
  assert.equal(finalStatus.signers[1].signatureStatus, "Complete");
  assert.equal(finalStatus.signers[1].canCorrectEmail, false);
  assert.equal(finalStatus.signers[1].canResend, false);
  const correctionAfterSigning = await service(request("/v6/application/status/signatures/correction/request-code", "POST", { guardianId: "guardian-additional" }, statusToken));
  assert.equal(correctionAfterSigning.statusCode, 409);
});

test("server-side OTP and resend limits block repeated pending-signer actions", async () => {
  const { app, store, sent, service } = fixture({ contactPermission: true });
  const statusToken = "synthetic-rate-limited-status-token";
  seedSession(store, statusToken, { scope: "application_status", applicationId: app.id, invitationId: app.invitationId, applicantContactId: app.contactId, email: app.recipientEmail });
  store.rateLimitBlocked.add(`correction-otp-cooldown:${app.id}:guardian-additional`);
  const correction = await service(request("/v6/application/status/signatures/correction/request-code", "POST", { guardianId: "guardian-additional" }, statusToken));
  assert.equal(correction.statusCode, 429);
  assert.equal(sent.length, 0);
  store.rateLimitBlocked.clear();
  store.rateLimitBlocked.add(`signature-resend-cooldown:${app.id}:guardian-additional`);
  const resend = await service(request("/v6/application/status/signatures/resend", "POST", { guardianId: "guardian-additional" }, statusToken, { "idempotency-key": "rate-limited-resend" }));
  assert.equal(resend.statusCode, 429);
  assert.equal(sent.length, 0);
});

test("DynamoDB conditions bind signing and correction to the current task generation", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../dynamo-store.mjs", import.meta.url), "utf8"));
  assert.match(source, /#signerControls\[" \+ Number\(guardianIndex\) \+ "\]\.\#taskTokenHash = :taskTokenHash/);
  assert.match(source, /#signatureControlRevision = :expected/);
  assert.match(source, /ConditionExpression: "#data\.\#status = :invited"/);
  assert.match(source, /attribute_not_exists\(PK\)/);
});
