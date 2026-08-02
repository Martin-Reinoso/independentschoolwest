import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetAccountCommand, GetEmailIdentityCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { GoogleDriveAdapter } from "../google-drive-adapter.mjs";
import { GoogleSheetsTracker } from "../google-sheets-tracker.mjs";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertSecret(config, name) {
  if (!String(config[name] || "").trim()) throw new Error(`The configuration secret is missing ${name}.`);
}

const expectedAccountId = required("EXPECTED_AWS_ACCOUNT_ID");
const secretArn = required("ROSEWOOD_CONFIG_SECRET_ARN");
const sender = required("OTP_FROM_EMAIL");
const driveFolderId = required("GOOGLE_DRIVE_FOLDER_ID");
const spreadsheetId = required("GOOGLE_SHEETS_SPREADSHEET_ID");
if (process.env.ALLOW_DRAFT_POLICY_TEST !== "true") {
  throw new Error("Set ALLOW_DRAFT_POLICY_TEST=true only for an approved synthetic test deployment.");
}

const identity = await new STSClient({}).send(new GetCallerIdentityCommand({}));
if (identity.Account !== expectedAccountId) {
  throw new Error(`AWS account mismatch. Expected the explicitly approved account ending ${expectedAccountId.slice(-4)}.`);
}

const secretResult = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: secretArn }));
const secretText = secretResult.SecretString || Buffer.from(secretResult.SecretBinary || "", "base64").toString("utf8");
const config = JSON.parse(secretText || "{}");
for (const name of ["OTP_HMAC_SECRET", "IP_HASH_SALT"]) assertSecret(config, name);
if (config.OTP_HMAC_SECRET.length < 32 || config.IP_HASH_SALT.length < 32) throw new Error("OTP and network-fingerprint secrets must each contain at least 32 characters.");

const ses = new SESv2Client({});
const [sesAccount, sesIdentity] = await Promise.all([
  ses.send(new GetAccountCommand({})),
  ses.send(new GetEmailIdentityCommand({ EmailIdentity: sender }))
]);
if (!sesAccount.SendingEnabled) throw new Error("SES account sending is disabled.");
if (!sesIdentity.VerifiedForSendingStatus) throw new Error("The configured SES sender is not verified for sending.");

const googleCredentials = {
  authMode: config.GOOGLE_AUTH_MODE,
  serviceAccountEmail: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: config.GOOGLE_PRIVATE_KEY,
  oauthClientId: config.GOOGLE_OAUTH_CLIENT_ID,
  oauthClientSecret: config.GOOGLE_OAUTH_CLIENT_SECRET,
  oauthRefreshToken: config.GOOGLE_OAUTH_REFRESH_TOKEN
};
const drive = new GoogleDriveAdapter({ ...googleCredentials, folderId: driveFolderId });
if (drive.authMode === "user_oauth") {
  assertSecret(config, "GOOGLE_OAUTH_EXPECTED_EMAIL");
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${await drive.accessToken()}` } });
  if (!profileResponse.ok) throw new Error(`Google could not verify the selected organisation mailbox (${profileResponse.status}).`);
  const profile = await profileResponse.json();
  if (!profile.email_verified || String(profile.email || "").toLowerCase() !== String(config.GOOGLE_OAUTH_EXPECTED_EMAIL).toLowerCase()) {
    throw new Error("The selected Google OAuth credential does not belong to the approved organisation mailbox.");
  }
}
const folderResponse = await drive.driveRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFolderId)}?supportsAllDrives=true&fields=id,mimeType,trashed,capabilities(canAddChildren)`);
const folder = await folderResponse.json();
if (folder.trashed || folder.mimeType !== "application/vnd.google-apps.folder" || !folder.capabilities?.canAddChildren) {
  throw new Error("The selected Google runtime identity cannot add files to the configured restricted Drive folder.");
}
let driveProbe;
try {
  driveProbe = await drive.createFile({
    name: `rosewood-v2-deployment-preflight-${Date.now()}.txt`,
    mimeType: "text/plain",
    data: "Rosewood V2 synthetic deployment preflight. Safe to delete.",
    applicationId: "deployment-preflight",
    kind: "deployment_preflight"
  });
  await drive.deleteFile(driveProbe.documentId);
} catch (error) {
  if (driveProbe?.documentId) await drive.deleteFile(driveProbe.documentId).catch(() => {});
  throw new Error("The configured Drive folder passed its ACL check but failed an actual create/delete probe. Use a non-University Shared Drive with service-account mode or a quota-bearing organisation user in user_oauth mode.", { cause: error });
}

const tracker = new GoogleSheetsTracker({ ...googleCredentials, spreadsheetId });
const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,sheets.properties.title`, { headers: { Authorization: `Bearer ${await tracker.accessToken()}` } });
if (!sheetResponse.ok) throw new Error(`The selected Google runtime identity cannot read the configured private Sheet (${sheetResponse.status}).`);

process.stdout.write(JSON.stringify({
  awsAccountVerified: true,
  sesSendingEnabled: true,
  sesSenderVerified: true,
  googleSecretComplete: true,
  googleAuthMode: drive.authMode,
  googleUserMailboxVerified: drive.authMode === "user_oauth",
  restrictedDriveWritable: true,
  privateSheetReadable: true,
  sesProductionAccessEnabled: Boolean(sesAccount.ProductionAccessEnabled)
}, null, 2));
process.stdout.write("\n");
