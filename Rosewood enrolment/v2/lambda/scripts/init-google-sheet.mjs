import { GoogleSheetsTracker } from "../google-sheets-tracker.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function createEngagementSheetRequest(sheetName) {
  return {
    requests: [{
      addSheet: {
        properties: {
          title: sheetName,
          gridProperties: { frozenRowCount: 1 }
        }
      }
    }]
  };
}

export async function main() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
  const sheetName = process.env.GOOGLE_SHEETS_V2_ENGAGEMENT_TAB || "V2 Engagement";
  if (!spreadsheetId) throw new Error("Set GOOGLE_SHEETS_SPREADSHEET_ID and one complete supported Google credential set.");
  const tracker = new GoogleSheetsTracker({
    authMode: process.env.GOOGLE_AUTH_MODE,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    oauthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    spreadsheetId,
    sheetName
  });
  const accessToken = await tracker.accessToken();
  const auth = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`, { headers: auth });
  if (!metadataResponse.ok) throw new Error(`Could not read spreadsheet metadata (${metadataResponse.status}).`);
  const metadata = await metadataResponse.json();
  if (!(metadata.sheets || []).some((sheet) => sheet.properties?.title === sheetName)) {
    const createResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify(createEngagementSheetRequest(sheetName))
    });
    if (!createResponse.ok) throw new Error(`Could not create the V2 engagement tab (${createResponse.status}).`);
  }
  const range = encodeURIComponent(`'${sheetName.replaceAll("'", "''")}'!A1:I1`);
  const headers = ["occurred_at", "event_name", "application_id", "invite_id", "stage", "elapsed_seconds", "viewport", "schema_version", "event_id"];
  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=RAW`, { method: "PUT", headers: auth, body: JSON.stringify({ values: [headers] }) });
  if (!writeResponse.ok) throw new Error(`Could not initialise V2 engagement headers (${writeResponse.status}).`);
  process.stdout.write(`Initialised ${sheetName} with ${headers.length} privacy-minimised columns.\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
