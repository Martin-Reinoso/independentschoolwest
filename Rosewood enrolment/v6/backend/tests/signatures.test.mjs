import assert from "node:assert/strict";
import test from "node:test";
import { additionalGuardianSignatureRecipients, createService, queueMissingGuardianSignatureInvitations } from "../service.mjs";

function request(body) {
  return {
    rawPath: "/v6/application/signatures/submit",
    requestContext: { http: { method: "POST", sourceIp: "192.0.2.1" } },
    headers: { origin: "https://ffe.org.au", authorization: "Bearer synthetic-session" },
    body: JSON.stringify(body)
  };
}

test("guardian signing requires server-side review acknowledgement", async () => {
  const handler = createService({
    store: {
      getSession: async () => ({
        scope: "application_signature",
        applicationId: "app-synthetic",
        expiresAt: Date.now() + 60_000
      })
    },
    drive: {},
    sheets: {},
    mailer: {},
    env: {
      ALLOWED_ORIGINS: "https://ffe.org.au",
      OTP_HMAC_SECRET: "synthetic-otp-secret",
      NETWORK_HMAC_SECRET: "synthetic-network-secret",
      APPLICATION_SIGNING_PAGE_URL: "https://ffe.org.au/pages/rosewood-application-sign-v6.html"
    }
  });

  const response = await handler(request({
    ipAcknowledged: true,
    termsAcknowledged: true,
    signatureDataUrl: "data:image/png;base64,invalid"
  }));
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 422);
  assert.equal(payload.error, "REVIEW_REQUIRED");
});

test("general contact preference does not suppress a required signature request", () => {
  const recipients = additionalGuardianSignatureRecipients({
    app_guardian_1_first: "Taylor",
    app_guardian_1_email: " TAYLOR@EXAMPLE.TEST ",
    app_guardian_1_permission: "No, do not contact them"
  }, 2);

  assert.deepEqual(recipients, [{ index: 1, email: "taylor@example.test", firstName: "Taylor" }]);
});

test("missing guardian signature requests can be recovered without rewriting the application", async () => {
  let queued;
  const application = {
    id: "app-synthetic",
    invitationId: "invite-synthetic",
    status: "pending_signatures",
    revision: 8,
    revisionHash: "revision-hash",
    guardianCount: 2,
    guardianIds: ["guardian-primary", "guardian-additional"],
    signatures: [{ guardianId: "guardian-primary" }],
    values: {
      student_first: "Avery",
      student_last: "Example",
      app_guardian_1_first: "Taylor",
      app_guardian_1_email: "taylor@example.test",
      app_guardian_1_permission: "No, do not contact them"
    }
  };
  const store = {
    getApplication: async () => application,
    listSignatureTasksForApplication: async () => [],
    addSignatureTasks: async input => { queued = input; }
  };

  const result = await queueMissingGuardianSignatureInvitations({
    store,
    applicationId: application.id,
    signingPageUrl: "https://ffe.org.au/pages/rosewood-application-sign-v6.html",
    actorId: "synthetic-operator",
    clock: () => Date.parse("2026-08-08T00:00:00.000Z")
  });

  assert.equal(result.queuedSignatureRequests, 1);
  assert.equal(queued.signatureTasks.length, 1);
  assert.equal(queued.signatureTasks[0].guardianId, "guardian-additional");
  assert.equal(queued.outboxEvents.filter(event => event.kind === "email").length, 1);
  assert.equal(queued.auditEvents[0].type, "application.signature_invitations_recovered");
  assert.equal(application.values.app_guardian_1_permission, "No, do not contact them");
});
