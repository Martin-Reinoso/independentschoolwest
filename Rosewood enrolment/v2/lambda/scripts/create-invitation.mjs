import crypto from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
}

const tableName = process.env.ROSEWOOD_TABLE_NAME;
const expectedAccountId = process.env.EXPECTED_AWS_ACCOUNT_ID?.trim();
const syntheticRecipient = process.env.SYNTHETIC_RECIPIENT_EMAIL?.trim().toLowerCase();
const recipientEmail = option("email").trim().toLowerCase();
const studentName = option("student").trim();
const familyLabel = option("family").trim() || "Invited family";
const baseUrl = (process.env.ENROLMENT_PAGE_URL || "https://ffe.org.au/pages/rosewood-enrolment-v2.html").trim();
if (process.env.ALLOW_DRAFT_POLICY_TEST !== "true" || option("synthetic") !== "true") {
  throw new Error("Synthetic invitations require ALLOW_DRAFT_POLICY_TEST=true and --synthetic true.");
}
if (!tableName || !expectedAccountId || !syntheticRecipient || !recipientEmail || !studentName) {
  throw new Error("Set ROSEWOOD_TABLE_NAME, EXPECTED_AWS_ACCOUNT_ID and SYNTHETIC_RECIPIENT_EMAIL, then provide --email and --student.");
}
if (recipientEmail !== syntheticRecipient) {
  throw new Error("The invitation recipient must match SYNTHETIC_RECIPIENT_EMAIL.");
}

const identity = await new STSClient({}).send(new GetCallerIdentityCommand({}));
if (identity.Account !== expectedAccountId) throw new Error("AWS account mismatch; refusing to create an invitation.");

const token = crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
const inviteId = `invite-${crypto.randomUUID()}`;
const applicationId = `application-${crypto.randomUUID()}`;
const now = Date.now();
const expiresAt = now + 30 * 86_400_000;
const ttl = Math.floor((now + 45 * 86_400_000) / 1000);
const invitation = { tokenHash, inviteId, applicationId, recipientEmail, studentName, familyLabel, status: "active", createdAt: now, expiresAt };
const application = { id: applicationId, inviteId, status: "draft", revision: 0, draft: null, documents: {}, signatures: [], signers: [], events: [] };
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
await client.send(new TransactWriteCommand({ TransactItems: [
  { Put: { TableName: tableName, Item: { PK: `INVITE#${tokenHash}`, SK: "META", entity: "invitation", ttl, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
  { Put: { TableName: tableName, Item: { PK: `INVITE_ID#${inviteId}`, SK: "META", entity: "invitationPointer", ttl, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
  { Put: { TableName: tableName, Item: { PK: `APP#${applicationId}`, SK: "CURRENT", entity: "application", data: application }, ConditionExpression: "attribute_not_exists(PK)" } }
] }));
const invitationUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}invite=${encodeURIComponent(token)}`;
process.stdout.write(`${JSON.stringify({ invitationUrl, applicationId, inviteId, expiresAt: new Date(expiresAt).toISOString() })}\n`);
