import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DynamoStore } from "./dynamo-store.mjs";
import { GoogleDriveStore } from "./google-drive.mjs";
import { StagedGoogleDriveStore } from "./staged-google-drive.mjs";
import { GoogleSheetsStore } from "./google-sheets.mjs";
import { SesMailer } from "./ses-mailer.mjs";
import { createService } from "./service.mjs";
import { runProductionCanary } from "./production-canary.mjs";

let servicePromise;

export async function loadSecret(secretArn = process.env.ROSEWOOD_CONFIG_SECRET_ARN) {
  if (!secretArn) return {};
  const response = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: secretArn }));
  const raw = response.SecretString || Buffer.from(response.SecretBinary || "", "base64").toString("utf8");
  const parsed = JSON.parse(raw || "{}");
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Rosewood configuration secret must contain a JSON object.");
  return parsed;
}

export async function buildService(overrides = {}) {
  const config = { ...process.env, ...await loadSecret(overrides.secretArn), ...(overrides.config || {}) };
  const auth = {
    authMode: config.GOOGLE_AUTH_MODE,
    serviceAccountEmail: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: config.GOOGLE_PRIVATE_KEY,
    oauthClientId: config.GOOGLE_OAUTH_CLIENT_ID,
    oauthClientSecret: config.GOOGLE_OAUTH_CLIENT_SECRET,
    oauthRefreshToken: config.GOOGLE_OAUTH_REFRESH_TOKEN
  };
  const store = overrides.store || new DynamoStore({ tableName: config.ROSEWOOD_TABLE_NAME, auditTableName: config.ROSEWOOD_AUDIT_TABLE_NAME });
  const drive = overrides.drive || new GoogleDriveStore({ auth, eoiFolderId: config.GOOGLE_EOI_FOLDER_ID, applicationFolderId: config.GOOGLE_APPLICATION_FOLDER_ID });
  const artifacts = overrides.artifacts || (config.DOCUMENT_STAGING_BUCKET
    ? new StagedGoogleDriveStore({ drive, bucketName: config.DOCUMENT_STAGING_BUCKET, kmsKeyId: config.RECORDS_KMS_KEY_ARN })
    : drive);
  const sheets = overrides.sheets || new GoogleSheetsStore({ auth, eoiSpreadsheetId: config.GOOGLE_EOI_SPREADSHEET_ID, applicationSpreadsheetId: config.GOOGLE_APPLICATION_SPREADSHEET_ID, operationsSpreadsheetId: config.GOOGLE_OPERATIONS_SPREADSHEET_ID });
  const mailer = overrides.mailer || new SesMailer({ from: config.SENDER_EMAIL, fromName: config.SENDER_NAME, replyTo: config.REPLY_TO_EMAIL, configurationSetName: config.SES_CONFIGURATION_SET });
  return createService({ store, artifacts, drive, sheets, mailer, env: config });
}

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  if (event?.source === "rosewood.enrolment.canary") return runProductionCanary();
  servicePromise ||= buildService();
  return (await servicePromise)(event);
}
