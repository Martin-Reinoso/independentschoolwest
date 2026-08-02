import { GoogleAccessTokenProvider } from "./google-auth.mjs";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export class GoogleSheetsTracker {
  constructor({ authMode, serviceAccountEmail, privateKey, oauthClientId, oauthClientSecret, oauthRefreshToken, tokenProvider, spreadsheetId, sheetName = "V2 Engagement", fetchImpl = fetch, now = () => Date.now() }) {
    if (!spreadsheetId) throw new Error("Google Sheets tracker settings are incomplete.");
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName;
    this.fetch = fetchImpl;
    this.tokenProvider = tokenProvider || new GoogleAccessTokenProvider({ authMode, serviceAccountEmail, privateKey, oauthClientId, oauthClientSecret, oauthRefreshToken, scope: SHEETS_SCOPE, fetchImpl, now });
    this.authMode = this.tokenProvider.mode;
  }

  async accessToken() {
    return this.tokenProvider.accessToken();
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
