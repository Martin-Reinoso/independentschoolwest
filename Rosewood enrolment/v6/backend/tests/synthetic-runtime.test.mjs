import assert from "node:assert/strict";
import test from "node:test";
import { mergeServiceConfig } from "../email-delivery-policy.mjs";
import { handler } from "../index.mjs";

const stack = "rosewood-offer-test-20261108";
const runtime = {
  SYNTHETIC_STACK_NAME: stack, SYNTHETIC_READY: "true", AWS_REGION: "ap-southeast-2", AWS_LAMBDA_FUNCTION_NAME: `${stack}-service`,
  SYNTHETIC_GOOGLE_CLIENT_ID: "synthetic-client", ROSEWOOD_TABLE_NAME: `${stack}-records`, ROSEWOOD_AUDIT_TABLE_NAME: `${stack}-audit`,
  DOCUMENT_STAGING_BUCKET: `${stack}-274319535046-staging`,
  ROSEWOOD_CONFIG_SECRET_ARN: `arn:aws:secretsmanager:ap-southeast-2:274319535046:secret:${stack}-config-ABCDEF`,
  RECORDS_KMS_KEY_ARN: "arn:aws:kms:ap-southeast-2:274319535046:key/synthetic", SES_CONFIGURATION_SET_MANAGED: `${stack}-transactional`,
  EMAIL_DELIVERY_MODE: "test", EMAIL_TEST_IDENTITIES: "alex@rosewood-offer.test,staff@rosewood-offer.test", EMAIL_TEST_DESTINATION: "approved@example.com",
  GOOGLE_EOI_FOLDER_ID: "synthetic-eoi-folder", GOOGLE_APPLICATION_FOLDER_ID: "synthetic-app-folder", GOOGLE_EOI_SPREADSHEET_ID: "synthetic-eoi-sheet",
  GOOGLE_APPLICATION_SPREADSHEET_ID: "synthetic-app-sheet", GOOGLE_OPERATIONS_SPREADSHEET_ID: "synthetic-ops-sheet",
  ALLOWED_ORIGINS: "http://127.0.0.1:8767", PUBLIC_SITE_BASE_URL: "http://127.0.0.1:8767",
  STAFF_EMAILS: "staff@rosewood-offer.test", STAFF_ROLES: "staff@rosewood-offer.test=admin"
};
for (const key of ["APPLICATION_PAGE_URL", "APPLICATION_SIGNING_PAGE_URL", "MEETING_BOOKING_PAGE_URL", "STAFF_PORTAL_URL", "ENROLMENT_OFFER_PAGE_URL"]) runtime[key] = "http://127.0.0.1:8767/pages/synthetic.html";
const secret = { GOOGLE_AUTH_MODE: "user_oauth", GOOGLE_OAUTH_CLIENT_ID: "synthetic-client", GOOGLE_OAUTH_CLIENT_SECRET: "synthetic", GOOGLE_OAUTH_REFRESH_TOKEN: "synthetic", OTP_HMAC_SECRET: "synthetic", NETWORK_HMAC_SECRET: "synthetic" };

test("synthetic config rejects production resources, broad credentials and notification destinations", () => {
  assert.equal(mergeServiceConfig(runtime, secret).GOOGLE_OAUTH_CLIENT_ID, "synthetic-client");
  for (const patch of [
    { SYNTHETIC_READY: "false" }, { SYNTHETIC_STACK_NAME: "rosewood-enrolment-v6-production" }, { AWS_REGION: "us-east-1" },
    { AWS_LAMBDA_FUNCTION_NAME: "production-service" }, { ROSEWOOD_TABLE_NAME: "production-records" }, { ROSEWOOD_AUDIT_TABLE_NAME: "production-audit" },
    { DOCUMENT_STAGING_BUCKET: "production-staging" }, { ROSEWOOD_CONFIG_SECRET_ARN: "production-secret" }, { RECORDS_KMS_KEY_ARN: "production-key" },
    { SES_CONFIGURATION_SET_MANAGED: "production-transactional" }, { EMAIL_DELIVERY_MODE: "production" }, { SYNTHETIC_GOOGLE_CLIENT_ID: "production-client" },
    { GOOGLE_EOI_FOLDER_ID: "unconfigured" }, { GOOGLE_APPLICATION_FOLDER_ID: runtime.GOOGLE_EOI_FOLDER_ID },
    { SLACK_WEBHOOK_URL: "https://example.invalid/secret" }, { PUBLIC_SITE_BASE_URL: "https://ffe.org.au" },
    { ENROLMENT_OFFER_PAGE_URL: "https://ffe.org.au/pages/rosewood-enrolment-offer-v1.html" }, { STAFF_EMAILS: "family@example.com" }
  ]) assert.throws(() => mergeServiceConfig({ ...runtime, ...patch }, secret));
});

test("a copied secret cannot overwrite runtime resources or smuggle a Slack destination", () => {
  for (const key of ["SYNTHETIC_STACK_NAME", "SYNTHETIC_READY", "ROSEWOOD_TABLE_NAME", "GOOGLE_APPLICATION_FOLDER_ID", "STAFF_EMAILS", "SLACK_PENDING_WEBHOOK_URL", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"]) {
    assert.throws(() => mergeServiceConfig(runtime, { ...secret, [key]: "production-value" }));
  }
  assert.throws(() => mergeServiceConfig(runtime, secret, { ROSEWOOD_TABLE_NAME: "production-records" }));
  assert.throws(() => mergeServiceConfig({}, { SYNTHETIC_STACK_NAME: stack }));
});

test("unready synthetic handlers and production canary events return before loading secrets or records", async () => {
  const before = { stack: process.env.SYNTHETIC_STACK_NAME, ready: process.env.SYNTHETIC_READY };
  try {
    process.env.SYNTHETIC_STACK_NAME = stack;
    process.env.SYNTHETIC_READY = "false";
    assert.equal((await handler({ rawPath: "/v6/health" }, {})).statusCode, 503);
    process.env.SYNTHETIC_READY = "true";
    assert.equal((await handler({ source: "rosewood.enrolment.canary" }, {})).statusCode, 503);
  } finally {
    for (const [key, value] of [["SYNTHETIC_STACK_NAME", before.stack], ["SYNTHETIC_READY", before.ready]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
