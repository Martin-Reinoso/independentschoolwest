import crypto from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : "";
}

const tableName = process.env.ROSEWOOD_TABLE_NAME;
const recipientEmail = option("email").trim().toLowerCase();
const studentName = option("student").trim();
const familyLabel = option("family").trim() || "Invited family";
const baseUrl = (process.env.ENROLMENT_PAGE_URL || "https://ffe.org.au/pages/rosewood-enrolment-v2.html").trim();
if (!tableName || !recipientEmail || !studentName) {
  throw new Error("Set ROSEWOOD_TABLE_NAME and provide --email and --student. Optional: --family.");
}

const token = crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
const inviteId = `invite-${crypto.randomUUID()}`;
const applicationId = `application-${crypto.randomUUID()}`;
const now = Date.now();
const invitation = { tokenHash, inviteId, applicationId, recipientEmail, studentName, familyLabel, status: "active", createdAt: now, expiresAt: now + 30 * 86_400_000 };
const application = { id: applicationId, inviteId, status: "draft", revision: 0, draft: null, documents: {}, signatures: [], signers: [], events: [] };
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
await client.send(new TransactWriteCommand({ TransactItems: [
  { Put: { TableName: tableName, Item: { PK: `INVITE#${tokenHash}`, SK: "META", entity: "invitation", data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
  { Put: { TableName: tableName, Item: { PK: `INVITE_ID#${inviteId}`, SK: "META", entity: "invitationPointer", data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
  { Put: { TableName: tableName, Item: { PK: `APP#${applicationId}`, SK: "CURRENT", entity: "application", data: application }, ConditionExpression: "attribute_not_exists(PK)" } }
] }));
process.stdout.write(`${baseUrl}${baseUrl.includes("?") ? "&" : "?"}invite=${encodeURIComponent(token)}\n`);
