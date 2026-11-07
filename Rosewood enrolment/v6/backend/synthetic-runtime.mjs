// Additional fail-closed checks for the dedicated test stack. AWS IAM and the
// separate Google app grant remain independent enforcement boundaries.
const SECRET_KEYS = new Set([
  "GOOGLE_AUTH_MODE", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REFRESH_TOKEN", "OTP_HMAC_SECRET", "NETWORK_HMAC_SECRET",
  "OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64", "OFFER_PRINCIPAL_SIGNATURE_SHA256"
]);
const GOOGLE_IDS = ["GOOGLE_EOI_FOLDER_ID", "GOOGLE_APPLICATION_FOLDER_ID",
  "GOOGLE_EOI_SPREADSHEET_ID", "GOOGLE_APPLICATION_SPREADSHEET_ID", "GOOGLE_OPERATIONS_SPREADSHEET_ID"];

function fail() { throw Object.assign(new Error("Synthetic runtime isolation is incomplete or invalid."), { code: "SYNTHETIC_ISOLATION_INVALID" }); }

export function validateSyntheticSecret(runtime, secret, overrides = {}) {
  if (Object.keys(secret).some(key => key.startsWith("SYNTHETIC_"))) fail();
  if (!runtime.SYNTHETIC_STACK_NAME) return;
  if (Object.keys(secret).some(key => !SECRET_KEYS.has(key))) fail();
  if (Object.entries(overrides).some(([key, value]) => runtime[key] !== value)) fail();
}

export function validateSyntheticRuntime(config) {
  if (!config.SYNTHETIC_STACK_NAME) return;
  const stack = config.SYNTHETIC_STACK_NAME;
  if (!/^rosewood-offer-test-\d{8}$/.test(stack) || config.SYNTHETIC_READY !== "true") fail();
  if (config.AWS_REGION !== "ap-southeast-2" || config.AWS_LAMBDA_FUNCTION_NAME !== `${stack}-service`) fail();
  const arn = `arn:aws:`;
  const accountRegion = `ap-southeast-2:274319535046:`;
  if (config.ROSEWOOD_TABLE_NAME !== `${stack}-records` || config.ROSEWOOD_AUDIT_TABLE_NAME !== `${stack}-audit`) fail();
  if (config.DOCUMENT_STAGING_BUCKET !== `${stack}-274319535046-staging`) fail();
  if (!config.ROSEWOOD_CONFIG_SECRET_ARN?.startsWith(`${arn}secretsmanager:${accountRegion}secret:${stack}-config-`)) fail();
  if (!config.RECORDS_KMS_KEY_ARN?.startsWith(`${arn}kms:${accountRegion}key/`)) fail();
  if (config.SES_CONFIGURATION_SET_MANAGED !== `${stack}-transactional`) fail();
  if (!["disabled", "test"].includes(config.EMAIL_DELIVERY_MODE)) fail();
  if (config.GOOGLE_AUTH_MODE !== "user_oauth" || !config.SYNTHETIC_GOOGLE_CLIENT_ID || config.GOOGLE_OAUTH_CLIENT_ID !== config.SYNTHETIC_GOOGLE_CLIENT_ID) fail();
  if (GOOGLE_IDS.some(key => !/^[A-Za-z0-9_-]{10,}$/.test(config[key] || "") || config[key] === "unconfigured") || new Set(GOOGLE_IDS.map(key => config[key])).size !== GOOGLE_IDS.length) fail();
  if (Object.entries(config).some(([key, value]) => key.startsWith("SLACK_") && value)) fail();
  if (config.ALLOWED_ORIGINS !== "http://127.0.0.1:8767" || config.PUBLIC_SITE_BASE_URL !== "http://127.0.0.1:8767") fail();
  for (const key of ["APPLICATION_PAGE_URL", "APPLICATION_SIGNING_PAGE_URL", "MEETING_BOOKING_PAGE_URL", "STAFF_PORTAL_URL", "ENROLMENT_OFFER_PAGE_URL"]) {
    if (!config[key]?.startsWith("http://127.0.0.1:8767/pages/")) fail();
  }
  if (config.STAFF_EMAILS !== "staff@rosewood-offer.test" || config.STAFF_ROLES !== "staff@rosewood-offer.test=admin") fail();
}
