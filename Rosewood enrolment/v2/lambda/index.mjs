import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { createService } from "./core.mjs";
import { DynamoStore } from "./dynamo-store.mjs";
import { GoogleDriveAdapter } from "./google-drive-adapter.mjs";
import { GoogleSheetsTracker } from "./google-sheets-tracker.mjs";
import { SesMailer } from "./ses-mailer.mjs";

let servicePromise;

async function secretConfig() {
  if (!process.env.ROSEWOOD_CONFIG_SECRET_ARN) return {};
  const client = new SecretsManagerClient({});
  const response = await client.send(new GetSecretValueCommand({ SecretId: process.env.ROSEWOOD_CONFIG_SECRET_ARN }));
  const raw = response.SecretString || Buffer.from(response.SecretBinary || "", "base64").toString("utf8");
  const parsed = JSON.parse(raw || "{}");
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Rosewood configuration secret must contain a JSON object.");
  return parsed;
}

async function buildService() {
  const secret = await secretConfig();
  const config = { ...process.env, ...secret };
  const store = new DynamoStore({ tableName: config.ROSEWOOD_TABLE_NAME });
  const drive = new GoogleDriveAdapter({
    serviceAccountEmail: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: config.GOOGLE_PRIVATE_KEY,
    folderId: config.GOOGLE_DRIVE_FOLDER_ID
  });
  const tracker = config.GOOGLE_SHEETS_SPREADSHEET_ID ? new GoogleSheetsTracker({
    serviceAccountEmail: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: config.GOOGLE_PRIVATE_KEY,
    spreadsheetId: config.GOOGLE_SHEETS_SPREADSHEET_ID,
    sheetName: config.GOOGLE_SHEETS_V2_ENGAGEMENT_TAB || "V2 Engagement"
  }) : { record: async () => {} };
  return createService({ store, drive, tracker, mailer: new SesMailer(), env: config });
}

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  servicePromise ||= buildService();
  const service = await servicePromise;
  return service(event);
}
