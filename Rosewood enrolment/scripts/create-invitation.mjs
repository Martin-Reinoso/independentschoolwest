import crypto from "node:crypto";
import { appendRow } from "./google-sheets.mjs";

function argument(name) {
  const prefix = `--${name}=`;
  const item = process.argv.find((value) => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : "";
}

const familyLabel = argument("family");
const recipientEmail = argument("email");
const studentName = argument("student");
const expiresDays = Number(argument("expires-days") || 30);
const enrolmentPageUrl = process.env.ROSEWOOD_ENROLMENT_PAGE_URL
  || "https://ffe.org.au/pages/rosewood-enrolment-2027-7c91a4.html";

if (!familyLabel) {
  throw new Error("Use --family=\"Family name\". Optional: --email=, --student=, --expires-days=.");
}
if (!Number.isFinite(expiresDays) || expiresDays < 1 || expiresDays > 180) {
  throw new Error("--expires-days must be between 1 and 180.");
}

const token = crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
const inviteId = `RWI-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
const createdAt = new Date();
const expiresAt = new Date(createdAt.getTime() + expiresDays * 86_400_000);

await appendRow("Invitations", [
  inviteId,
  tokenHash,
  familyLabel.trim(),
  recipientEmail.trim(),
  studentName.trim(),
  "invited",
  createdAt.toISOString(),
  expiresAt.toISOString(),
  "",
  "",
  "",
  ""
]);

const url = new URL(enrolmentPageUrl);
url.searchParams.set("invite", token);

console.log(`Invitation created for ${familyLabel.trim()}`);
console.log(`Invite ID: ${inviteId}`);
console.log(`Expires: ${expiresAt.toISOString()}`);
console.log(`Private family link: ${url.toString()}`);
console.log("The plaintext token is shown only here. Share the link privately and do not place it in the workbook.");
