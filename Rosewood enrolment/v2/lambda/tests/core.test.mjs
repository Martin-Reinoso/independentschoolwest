import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createService } from "../core.mjs";
import { MemoryDrive, MemoryMailer, MemoryStore } from "../memory-adapter.mjs";

const origin = "http://localhost:8000";
const schemaVersion = "rosewood-v2-2026-08-02";
const invitationToken = "test-invitation-token-with-enough-entropy";
const invitedEmail = "guardian@example.test";

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function pngDataUrl() {
  const bytes = Buffer.alloc(220, 1);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function application(overrides = {}) {
  return {
    readiness_acknowledgement: "Yes",
    student_first_name: "Ava",
    student_last_name: "Example",
    student_date_of_birth: "2021-03-04",
    entry_year: "2027",
    entry_year_level: "Prep",
    current_school: "Example Early Learning",
    current_year_level: "Kindergarten",
    student_address: "1 Example Street",
    student_suburb: "Melton",
    student_postcode: "3337",
    country_of_birth: "Australia",
    residency_status: "Australian citizen",
    home_language: "English",
    family_connection: "New to Rosewood",
    guardian_a_first_name: "Morgan",
    guardian_a_last_name: "Example",
    guardian_a_relationship: "Parent",
    guardian_a_email: invitedEmail,
    guardian_a_mobile: "0400000000",
    guardian_a_contact_role: "Primary contact",
    guardian_a_legal_responsibility: "Yes",
    care_arrangement: "Lives with both parents / guardians",
    court_orders: "No",
    emergency_first_name: "Taylor",
    emergency_last_name: "Example",
    emergency_relationship: "Aunt",
    emergency_mobile: "0411000000",
    guardian_completeness: "Yes",
    additional_needs: "No",
    medical_needs: "No",
    immunisation_status: "Current",
    previous_school_permission: "Yes",
    previous_school_name: "Example Early Learning",
    student_name_permission: "Yes",
    media_permissions: ["Internal school use"],
    community_updates: "No",
    fee_responsibility: "Joint responsibility",
    referral_source: "Invited by Rosewood",
    decision_factors: ["Faith and character", "Academic excellence"],
    information_declaration: "Yes",
    privacy_acknowledgement: "Yes",
    authority_declaration: "Yes",
    review_ready: "Yes",
    required_documents_pending: "No",
    documents: [],
    ...overrides
  };
}

function createFixture({ now = 1_800_000_000_000 } = {}) {
  let current = now;
  const clock = () => current;
  const store = new MemoryStore({ now: clock });
  const drive = new MemoryDrive();
  const mailer = new MemoryMailer();
  const tracker = { records: [], async record(record) { this.records.push(structuredClone(record)); } };
  store.seedInvitation({
    tokenHash: hash(invitationToken),
    inviteId: "invite-test",
    applicationId: "application-test",
    recipientEmail: invitedEmail,
    familyLabel: "Example family",
    studentName: "Ava Example",
    status: "active",
    expiresAt: now + 86_400_000
  });
  const service = createService({ store, drive, mailer, tracker, clock, env: {
    ALLOWED_ORIGINS: origin,
    OTP_HMAC_SECRET: "otp-test-secret",
    IP_HASH_SALT: "ip-test-secret",
    OTP_FROM_EMAIL: "sender@example.test",
    REPLY_TO_EMAIL: "reply@example.test",
    SCHEMA_VERSION: schemaVersion,
    TEST_MODE: "true",
    SIGNING_PAGE_URL: `${origin}/pages/rosewood-sign-v2.html`
  } });
  return { store, drive, mailer, tracker, service, advance(ms) { current += ms; } };
}

async function request(fixture, method, path, { body, token, idempotencyKey = `operation-${crypto.randomUUID()}`, sourceIp = "203.0.113.10" } = {}) {
  const response = await fixture.service({
    rawPath: path,
    headers: {
      origin,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: { http: { method, path, sourceIp } }
  });
  return { status: response.statusCode, headers: response.headers, body: JSON.parse(response.body || "{}") };
}

async function accessSession(fixture) {
  const issued = await request(fixture, "POST", "/v2/access/request-otp", { body: { invitationToken, email: invitedEmail } });
  assert.equal(issued.status, 200);
  assert.match(issued.body.testCode, /^\d{6}$/);
  const verified = await request(fixture, "POST", "/v2/access/verify-otp", { body: { invitationToken, challengeId: issued.body.challengeId, code: issued.body.testCode } });
  assert.equal(verified.status, 200);
  return verified.body.sessionToken;
}

async function saveCompleteDraft(fixture, token, data = application()) {
  const saved = await request(fixture, "PUT", "/v2/draft", { token, body: { schemaVersion, policyVersion: "draft-2026-08-02", baseRevision: 0, clientRevision: 1, currentStage: 7, application: data } });
  assert.equal(saved.status, 200);
  for (const category of ["birth_certificate", "immunisation", "proof_of_address"]) {
    await fixture.store.attachDocument("application-test", { documentId: `doc-${category}`, fileName: `${category}.pdf`, mimeType: "application/pdf", size: 1000, category });
  }
  return saved.body.revision;
}

test("health and CORS responses are non-cacheable", async () => {
  const fixture = createFixture();
  const response = await request(fixture, "GET", "/v2/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.version, schemaVersion);
  assert.equal(response.headers["Cache-Control"], "no-store, max-age=0");
  assert.equal(response.headers["Access-Control-Allow-Origin"], origin);
});

test("OTP request is generic and valid codes are single use", async () => {
  const fixture = createFixture();
  const invalid = await request(fixture, "POST", "/v2/access/request-otp", { body: { invitationToken, email: "wrong@example.test" } });
  assert.equal(invalid.status, 200);
  assert.equal(invalid.body.maskedEmail, "the invited mailbox");
  assert.equal(invalid.body.testCode, undefined);

  const issued = await request(fixture, "POST", "/v2/access/request-otp", { body: { invitationToken, email: invitedEmail }, sourceIp: "203.0.113.11" });
  assert.equal(fixture.mailer.messages.length, 1);
  const wrong = await request(fixture, "POST", "/v2/access/verify-otp", { body: { invitationToken, challengeId: issued.body.challengeId, code: "000000" } });
  assert.equal(wrong.status, 401);
  const valid = await request(fixture, "POST", "/v2/access/verify-otp", { body: { invitationToken, challengeId: issued.body.challengeId, code: issued.body.testCode } });
  assert.equal(valid.status, 200);
  const reused = await request(fixture, "POST", "/v2/access/verify-otp", { body: { invitationToken, challengeId: issued.body.challengeId, code: issued.body.testCode } });
  assert.equal(reused.status, 401);
});

test("replaying one OTP request operation returns one challenge and sends one email", async () => {
  const fixture = createFixture();
  const idempotencyKey = "request-otp-replay-operation";
  const first = await request(fixture, "POST", "/v2/access/request-otp", { idempotencyKey, body: { invitationToken, email: invitedEmail } });
  const replay = await request(fixture, "POST", "/v2/access/request-otp", { idempotencyKey, body: { invitationToken, email: invitedEmail } });
  assert.deepEqual(replay.body, first.body);
  assert.equal(fixture.mailer.messages.length, 1);
});

test("expired OTP and expired sessions are rejected", async () => {
  const fixture = createFixture();
  const issued = await request(fixture, "POST", "/v2/access/request-otp", { body: { invitationToken, email: invitedEmail } });
  fixture.advance(10 * 60_000 + 1);
  const expired = await request(fixture, "POST", "/v2/access/verify-otp", { body: { invitationToken, challengeId: issued.body.challengeId, code: issued.body.testCode } });
  assert.equal(expired.status, 401);

  const fixture2 = createFixture();
  const token = await accessSession(fixture2);
  fixture2.advance(30 * 60_000 + 1);
  const context = await request(fixture2, "GET", "/v2/session", { token });
  assert.equal(context.status, 401);
});

test("draft revisions are conditional and idempotent", async () => {
  const fixture = createFixture();
  const token = await accessSession(fixture);
  const operation = "draft-operation-unique";
  const payload = { schemaVersion, policyVersion: "draft-2026-08-02", baseRevision: 0, clientRevision: 1, currentStage: 1, application: application() };
  const first = await request(fixture, "PUT", "/v2/draft", { token, idempotencyKey: operation, body: payload });
  const repeated = await request(fixture, "PUT", "/v2/draft", { token, idempotencyKey: operation, body: payload });
  assert.deepEqual(repeated.body, first.body);
  assert.equal((await fixture.store.getApplication("application-test")).revision, 1);
  const stale = await request(fixture, "PUT", "/v2/draft", { token, body: payload });
  assert.equal(stale.status, 409);
});

test("engagement accepts bounded non-sensitive events", async () => {
  const fixture = createFixture();
  const token = await accessSession(fixture);
  const accepted = await request(fixture, "POST", "/v2/engagement", { token, body: { eventName: "stage_viewed", stage: 2, elapsedSeconds: 8, viewport: "1280x800", ignoredSensitiveValue: "not stored" } });
  assert.equal(accepted.status, 200);
  assert.equal(fixture.tracker.records.length, 1);
  assert.equal(fixture.tracker.records[0].ignoredSensitiveValue, undefined);
  const rejected = await request(fixture, "POST", "/v2/engagement", { token, body: { eventName: "typed_medical_answer", stage: 3 } });
  assert.equal(rejected.status, 422);
});

test("document sessions enforce category, type, size and ownership", async () => {
  const fixture = createFixture();
  const token = await accessSession(fixture);
  const invalid = await request(fixture, "POST", "/v2/documents/session", { token, body: { category: "malware", fileName: "bad.exe", mimeType: "application/x-msdownload", size: 12 } });
  assert.equal(invalid.status, 422);
  const session = await request(fixture, "POST", "/v2/documents/session", { token, body: { category: "birth_certificate", fileName: "birth.pdf", mimeType: "application/pdf", size: 1000 } });
  const uploadId = session.body.uploadId;
  const file = fixture.drive.completeUpload(uploadId);
  const confirmed = await request(fixture, "POST", "/v2/documents/confirm", { token, body: { category: "birth_certificate", documentId: file.id } });
  assert.equal(confirmed.status, 200);
  const wrongOwner = fixture.drive.completeUpload((await fixture.drive.createUploadSession({ applicationId: "other", category: "immunisation", fileName: "x.pdf", mimeType: "application/pdf", size: 100 })).uploadId);
  const rejected = await request(fixture, "POST", "/v2/documents/confirm", { token, body: { category: "immunisation", documentId: wrongOwner.id } });
  assert.equal(rejected.status, 422);
});

test("submission rejects forged documents, negative acknowledgements and fake PNG data", async () => {
  const fixture = createFixture();
  const token = await accessSession(fixture);
  const revision = await saveCompleteDraft(fixture, token, application({ privacy_acknowledgement: "No" }));
  const rejectedDeclaration = await request(fixture, "POST", "/v2/applications/submit", { token, body: { expectedRevision: revision, declarations: { information: "Yes", privacy: "Yes", authority: "Yes", audit: "Yes", intent: "Yes" }, signerName: "Morgan Example", signatureDataUrl: pngDataUrl() } });
  assert.equal(rejectedDeclaration.status, 422);

  const fixture2 = createFixture();
  const token2 = await accessSession(fixture2);
  const saved = await request(fixture2, "PUT", "/v2/draft", { token: token2, body: { schemaVersion, policyVersion: "draft-2026-08-02", baseRevision: 0, application: application({ documents: [
    { category: "birth_certificate" }, { category: "immunisation" }, { category: "proof_of_address" }
  ] }) } });
  const forged = await request(fixture2, "POST", "/v2/applications/submit", { token: token2, body: { expectedRevision: saved.body.revision, declarations: { information: "Yes", privacy: "Yes", authority: "Yes", audit: "Yes", intent: "Yes" }, signerName: "Morgan Example", signatureDataUrl: pngDataUrl() } });
  assert.equal(forged.status, 422);

  const fixture3 = createFixture();
  const token3 = await accessSession(fixture3);
  const revision3 = await saveCompleteDraft(fixture3, token3);
  const fakePng = `data:image/png;base64,${Buffer.alloc(200, 1).toString("base64")}`;
  const rejectedImage = await request(fixture3, "POST", "/v2/applications/submit", { token: token3, body: { expectedRevision: revision3, declarations: { information: "Yes", privacy: "Yes", authority: "Yes", audit: "Yes", intent: "Yes" }, signerName: "Morgan Example", signatureDataUrl: fakePng } });
  assert.equal(rejectedImage.status, 422);
});

test("single-guardian application completes atomically and returns a receipt", async () => {
  const fixture = createFixture();
  const token = await accessSession(fixture);
  const revision = await saveCompleteDraft(fixture, token);
  const submitted = await request(fixture, "POST", "/v2/applications/submit", { token, body: { expectedRevision: revision, declarations: { information: "Yes", privacy: "Yes", authority: "Yes", audit: "Yes", intent: "Yes" }, signerName: "Morgan Example", signatureDataUrl: pngDataUrl() } });
  assert.equal(submitted.status, 200);
  assert.equal(submitted.body.status, "submitted");
  assert.match(submitted.body.reference, /^RW-/);
  const app = await fixture.store.getApplication("application-test");
  assert.equal(app.status, "submitted");
  assert.equal(app.signatures.length, 1);
  const receipt = await request(fixture, "GET", "/v2/receipt", { token });
  assert.equal(receipt.status, 200);
  assert.equal(receipt.body.signers[0].status, "signed");
});

test("additional guardian independently verifies, reviews and signs the frozen revision", async () => {
  const fixture = createFixture();
  const token = await accessSession(fixture);
  const revision = await saveCompleteDraft(fixture, token, application({
    guardian_b_first_name: "Jordan",
    guardian_b_last_name: "Example",
    guardian_b_email: "second@example.test",
    guardian_b_mobile: "0422000000",
    guardian_b_relationship: "Parent",
    guardian_b_required_signer: "Yes",
    guardian_b_contact_permission: "Yes"
  }));
  const submitted = await request(fixture, "POST", "/v2/applications/submit", { token, body: { expectedRevision: revision, declarations: { information: "Yes", privacy: "Yes", authority: "Yes", audit: "Yes", intent: "Yes" }, signerName: "Morgan Example", signatureDataUrl: pngDataUrl() } });
  assert.equal(submitted.body.status, "pending_signatures");
  const invitation = fixture.mailer.messages.find((message) => message.subject.includes("signature is required"));
  assert.ok(invitation);
  const taskToken = new URL(invitation.html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&")).searchParams.get("task");
  const otp = await request(fixture, "POST", "/v2/signatures/request-otp", { body: { taskToken, email: "second@example.test" }, sourceIp: "203.0.113.20" });
  assert.match(otp.body.testCode, /^\d{6}$/);
  const verified = await request(fixture, "POST", "/v2/signatures/verify-otp", { body: { taskToken, challengeId: otp.body.challengeId, code: otp.body.testCode } });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.context.revision, revision);
  const signToken = verified.body.sessionToken;
  const changedEmail = await request(fixture, "PATCH", "/v2/signatures/details", { token: signToken, body: { firstName: "Jordan", lastName: "Example", email: "attacker@example.test", mobile: "0422000000" } });
  assert.equal(changedEmail.status, 422);
  const details = await request(fixture, "PATCH", "/v2/signatures/details", { token: signToken, body: { firstName: "Jordan", lastName: "Example", email: "second@example.test", mobile: "0422000000" } });
  assert.equal(details.status, 200);
  const signatureOperation = "remote-signature-retry-operation";
  const signed = await request(fixture, "POST", "/v2/signatures/submit", { token: signToken, idempotencyKey: signatureOperation, body: { revision, signerName: "Jordan Example", auditDeclaration: true, intentDeclaration: true, signatureDataUrl: pngDataUrl() } });
  assert.equal(signed.body.status, "submitted");
  const replay = await request(fixture, "POST", "/v2/signatures/submit", { token: signToken, idempotencyKey: signatureOperation, body: { revision, signerName: "Jordan Example", auditDeclaration: true, intentDeclaration: true, signatureDataUrl: pngDataUrl() } });
  assert.deepEqual(replay.body, signed.body);
  const duplicate = await request(fixture, "POST", "/v2/signatures/submit", { token: signToken, body: { revision, signerName: "Jordan Example", auditDeclaration: true, intentDeclaration: true, signatureDataUrl: pngDataUrl() } });
  assert.equal(duplicate.status, 409);
  const app = await fixture.store.getApplication("application-test");
  assert.equal(app.signatures.length, 2);
  assert.ok(app.completedAt);
});

test("rate limits OTP requests by network, invitation and mailbox", async () => {
  const fixture = createFixture();
  for (let index = 0; index < 5; index += 1) {
    const response = await request(fixture, "POST", "/v2/access/request-otp", { body: { invitationToken, email: invitedEmail } });
    assert.equal(response.status, 200);
  }
  const blocked = await request(fixture, "POST", "/v2/access/request-otp", { body: { invitationToken, email: invitedEmail } });
  assert.equal(blocked.status, 429);
});
