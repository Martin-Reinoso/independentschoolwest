import crypto from "node:crypto";

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const sheetName = process.env.GOOGLE_SHEETS_V2_ENGAGEMENT_TAB || "V2 Engagement";
if (!email || !privateKey || !spreadsheetId) throw new Error("Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_SHEETS_SPREADSHEET_ID.");

const issuedAt = Math.floor(Date.now() / 1000);
const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const claims = base64Url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: issuedAt, exp: issuedAt + 3600 }));
const signingInput = `${header}.${claims}`;
const signature = crypto.createSign("RSA-SHA256").update(signingInput).end().sign(privateKey);
const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${base64Url(signature)}` }) });
if (!tokenResponse.ok) throw new Error(`Google OAuth failed with ${tokenResponse.status}.`);
const accessToken = (await tokenResponse.json()).access_token;
const auth = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`, { headers: auth });
if (!metadataResponse.ok) throw new Error(`Could not read spreadsheet metadata (${metadataResponse.status}).`);
const metadata = await metadataResponse.json();
if (!(metadata.sheets || []).some((sheet) => sheet.properties?.title === sheetName)) {
  const createResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, { method: "POST", headers: auth, body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName, frozenRowCount: 1 } } }] }) });
  if (!createResponse.ok) throw new Error(`Could not create the V2 engagement tab (${createResponse.status}).`);
}
const range = encodeURIComponent(`'${sheetName.replaceAll("'", "''")}'!A1:I1`);
const headers = ["occurred_at", "event_name", "application_id", "invite_id", "stage", "elapsed_seconds", "viewport", "schema_version", "event_id"];
const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=RAW`, { method: "PUT", headers: auth, body: JSON.stringify({ values: [headers] }) });
if (!writeResponse.ok) throw new Error(`Could not initialise V2 engagement headers (${writeResponse.status}).`);
process.stdout.write(`Initialised ${sheetName} with ${headers.length} privacy-minimised columns.\n`);
