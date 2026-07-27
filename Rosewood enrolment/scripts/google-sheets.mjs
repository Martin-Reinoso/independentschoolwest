import crypto from "node:crypto";
import fs from "node:fs";

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function credentials() {
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (filePath) {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      email: parsed.client_email,
      privateKey: String(parsed.private_key || "").replace(/\\n/g, "\n")
    };
  }
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    privateKey: String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
  };
}

export function requireSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
  if (!spreadsheetId) throw new Error("Set GOOGLE_SHEETS_SPREADSHEET_ID.");
  return spreadsheetId;
}

export async function accessToken() {
  const { email, privateKey } = credentials();
  if (!email || !privateKey) {
    throw new Error("Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.");
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: issuedAt + 3600,
    iat: issuedAt
  }));
  const signingInput = `${header}.${claims}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).end().sign(privateKey);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${base64Url(signature)}`
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Google authentication failed.");
  }
  return payload.access_token;
}

export async function sheetsRequest(path, options = {}) {
  const spreadsheetId = requireSpreadsheetId();
  const token = await accessToken();
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Google Sheets request failed.");
  return payload;
}

export function columnName(number) {
  let value = number;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

export async function appendRow(sheetName, values) {
  const range = encodeURIComponent(`${sheetName}!A:${columnName(values.length)}`);
  return sheetsRequest(`/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ majorDimension: "ROWS", values: [values] })
  });
}
