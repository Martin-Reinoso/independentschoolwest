import assert from "node:assert/strict";
import test from "node:test";
import { createService } from "../service.mjs";

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
