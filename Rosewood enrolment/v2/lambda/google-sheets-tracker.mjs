import crypto from "node:crypto";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

export class GoogleSheetsTracker {
  constructor({ serviceAccountEmail, privateKey, spreadsheetId, sheetName = "V2 Engagement", fetchImpl = fetch, now = () => Date.now() }) {
    if (!serviceAccountEmail || !privateKey || !spreadsheetId) throw new Error("Google Sheets tracker settings are incomplete.");
    this.email = serviceAccountEmail;
    this.privateKey = privateKey.replace(/\\n/g, "\n");
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName;
    this.fetch = fetchImpl;
    this.now = now;
    this.token = null;
  }

  async accessToken() {
    if (this.token?.expiresAt > this.now() + 60_000) return this.token.value;
    const issuedAt = Math.floor(this.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64Url(JSON.stringify({ iss: this.email, scope: SHEETS_SCOPE, aud: "https://oauth2.googleapis.com/token", iat: issuedAt, exp: issuedAt + 3600 }));
    const signingInput = `${header}.${claims}`;
    const signature = crypto.createSign("RSA-SHA256").update(signingInput).end().sign(this.privateKey);
    const response = await this.fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${base64Url(signature)}` })
    });
    if (!response.ok) throw new Error(`Google Sheets OAuth failed with ${response.status}.`);
    const payload = await response.json();
    this.token = { value: payload.access_token, expiresAt: this.now() + Number(payload.expires_in || 3600) * 1000 };
    return this.token.value;
  }

  async record(event) {
    const range = encodeURIComponent(`'${this.sheetName.replaceAll("'", "''")}'!A:I`);
    const response = await this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.spreadsheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await this.accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[event.occurredAt, event.eventName, event.applicationId, event.inviteId, event.stage, event.elapsedSeconds, event.viewport, event.schemaVersion, event.id]] })
    });
    if (!response.ok) throw new Error(`Google Sheets append failed with ${response.status}.`);
    return { recorded: true };
  }
}
