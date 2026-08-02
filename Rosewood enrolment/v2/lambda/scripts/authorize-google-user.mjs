import crypto from "node:crypto";
import http from "node:http";
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GetSecretValueCommand, PutSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { GoogleDriveAdapter } from "../google-drive-adapter.mjs";
import { GoogleSheetsTracker } from "../google-sheets-tracker.mjs";

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets"
];

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function codeChallenge(verifier) {
  return base64Url(crypto.createHash("sha256").update(verifier).digest());
}

export function createAuthorizationUrl({ clientId, redirectUri, state, verifier }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: codeChallenge(verifier),
    code_challenge_method: "S256"
  });
  return url.toString();
}

export function mergeOAuthSecret(existing, credentials) {
  return {
    ...existing,
    GOOGLE_AUTH_MODE: "user_oauth",
    GOOGLE_OAUTH_CLIENT_ID: credentials.clientId,
    GOOGLE_OAUTH_CLIENT_SECRET: credentials.clientSecret,
    GOOGLE_OAUTH_REFRESH_TOKEN: credentials.refreshToken,
    GOOGLE_OAUTH_EXPECTED_EMAIL: credentials.expectedEmail
  };
}

function readInstalledClient(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  const client = parsed.installed;
  if (!client?.client_id || !client?.client_secret) {
    throw new Error("The OAuth client file must contain an installed/desktop application credential.");
  }
  return { clientId: client.client_id, clientSecret: client.client_secret };
}

async function jsonRequest(url, options, failureMessage) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${failureMessage} (${response.status}).`);
  return response.json();
}

function callbackPage(message) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><title>Rosewood Google authorisation</title><style>body{max-width:42rem;margin:10vh auto;padding:2rem;font:18px/1.5 sans-serif;color:#172521;background:#fbf7ef}h1{font-size:2rem}</style><body><h1>Rosewood Google authorisation</h1><p>${message}</p><p>You may close this tab and return to Codex.</p><script>history.replaceState(null,"","/complete")</script></body></html>`;
}

async function waitForAuthorization({ clientId, clientSecret, urlFile }) {
  const state = crypto.randomBytes(32).toString("base64url");
  const verifier = crypto.randomBytes(64).toString("base64url");
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/callback") {
      response.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      response.end("Not found");
      return;
    }
    if (requestUrl.searchParams.get("state") !== state) {
      response.writeHead(400, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(callbackPage("The security state did not match. Nothing was changed."));
      rejectCode(new Error("Google OAuth state validation failed."));
      return;
    }
    const code = requestUrl.searchParams.get("code");
    if (!code) {
      response.writeHead(400, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(callbackPage("Google did not return an authorisation code. Nothing was changed."));
      rejectCode(new Error("Google OAuth authorisation was not completed."));
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(callbackPage("The company account has been verified. Codex is checking the restricted storage now."));
    resolveCode(code);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const redirectUri = `http://127.0.0.1:${address.port}/callback`;
  writeFileSync(urlFile, createAuthorizationUrl({ clientId, redirectUri, state, verifier }), { mode: 0o600 });
  chmodSync(urlFile, 0o600);
  process.stdout.write("Google authorisation is ready in the protected URL file. Waiting up to ten minutes for the company account.\n");

  let timeout;
  try {
    const code = await Promise.race([
      codePromise,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Google OAuth authorisation timed out.")), 10 * 60_000); })
    ]);
    const token = await jsonRequest("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    }, "Google did not exchange the authorisation code");
    if (!token.refresh_token) throw new Error("Google returned no refresh token. Revoke the prior test grant and authorise again with consent.");
    return token;
  } finally {
    clearTimeout(timeout);
    rmSync(urlFile, { force: true });
    await new Promise((resolve) => server.close(resolve));
  }
}

async function verifyGoogleIdentity(accessToken, expectedEmail) {
  const profile = await jsonRequest("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  }, "Google could not verify the authorised account");
  if (!profile.email_verified || String(profile.email || "").toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error("The authorised Google mailbox does not match GOOGLE_OAUTH_EXPECTED_EMAIL.");
  }
}

async function verifyStorage({ credentials, folderId, spreadsheetId }) {
  const drive = new GoogleDriveAdapter({ authMode: "user_oauth", oauthClientId: credentials.clientId, oauthClientSecret: credentials.clientSecret, oauthRefreshToken: credentials.refreshToken, folderId });
  const folderResponse = await drive.driveRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed,capabilities(canAddChildren)`);
  const folder = await folderResponse.json();
  if (folder.trashed || folder.mimeType !== "application/vnd.google-apps.folder" || !folder.capabilities?.canAddChildren) {
    throw new Error("The authorised organisation account cannot use the configured restricted Drive folder.");
  }
  let probe;
  try {
    probe = await drive.createFile({ name: `rosewood-v2-oauth-probe-${Date.now()}.txt`, mimeType: "text/plain", data: "Rosewood V2 synthetic OAuth probe. Safe to delete.", applicationId: "oauth-bootstrap", kind: "oauth_probe" });
    await drive.deleteFile(probe.documentId);
  } catch (error) {
    if (probe?.documentId) await drive.deleteFile(probe.documentId).catch(() => {});
    throw error;
  }

  const tracker = new GoogleSheetsTracker({ authMode: "user_oauth", oauthClientId: credentials.clientId, oauthClientSecret: credentials.clientSecret, oauthRefreshToken: credentials.refreshToken, spreadsheetId });
  const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId`, { headers: { Authorization: `Bearer ${await tracker.accessToken()}` } });
  if (!sheetResponse.ok) throw new Error(`The authorised organisation account cannot read the configured private Sheet (${sheetResponse.status}).`);
}

export async function main() {
  if (!process.argv.includes("--apply")) throw new Error("Refusing to change Secrets Manager without --apply.");
  const expectedAccountId = required("EXPECTED_AWS_ACCOUNT_ID");
  const secretArn = required("ROSEWOOD_CONFIG_SECRET_ARN");
  const expectedEmail = required("GOOGLE_OAUTH_EXPECTED_EMAIL");
  const folderId = required("GOOGLE_DRIVE_FOLDER_ID");
  const spreadsheetId = required("GOOGLE_SHEETS_SPREADSHEET_ID");
  const clientFile = required("GOOGLE_OAUTH_CLIENT_CONFIG");
  const urlFile = required("ROSEWOOD_OAUTH_URL_FILE");
  const identity = await new STSClient({}).send(new GetCallerIdentityCommand({}));
  if (identity.Account !== expectedAccountId) throw new Error("AWS account mismatch; refusing to update the Rosewood configuration secret.");

  const client = readInstalledClient(clientFile);
  const token = await waitForAuthorization({ ...client, urlFile });
  await verifyGoogleIdentity(token.access_token, expectedEmail);
  const credentials = { ...client, refreshToken: token.refresh_token, expectedEmail };
  await verifyStorage({ credentials, folderId, spreadsheetId });

  const secrets = new SecretsManagerClient({});
  const current = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const currentText = current.SecretString || Buffer.from(current.SecretBinary || "", "base64").toString("utf8");
  const updated = mergeOAuthSecret(JSON.parse(currentText || "{}"), credentials);
  await secrets.send(new PutSecretValueCommand({ SecretId: secretArn, SecretString: JSON.stringify(updated) }));
  process.stdout.write(JSON.stringify({ awsAccountVerified: true, googleMailboxVerified: true, restrictedDriveWritable: true, privateSheetReadable: true, secretUpdated: true, googleAuthMode: "user_oauth" }, null, 2));
  process.stdout.write("\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
