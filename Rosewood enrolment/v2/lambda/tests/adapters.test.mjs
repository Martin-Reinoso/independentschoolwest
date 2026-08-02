import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { GoogleDriveAdapter } from "../google-drive-adapter.mjs";
import { GoogleSheetsTracker } from "../google-sheets-tracker.mjs";
import { SesMailer } from "../ses-mailer.mjs";
import { accessOtpEmail, signatureInvitationEmail } from "../email-templates.mjs";

function signingKey() {
  return crypto.generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } }).privateKey;
}

test("Drive upload sessions pin parent, ownership, MIME type and size", async () => {
  const calls = [];
  const responses = [
    new Response(JSON.stringify({ access_token: "google-token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } }),
    new Response("", { status: 200, headers: { location: "https://upload.example/session" } }),
    new Response(JSON.stringify({ id: "drive-file", name: "app-birth-file.pdf", mimeType: "application/pdf", size: "1234", parents: ["folder-1"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate", rosewoodExpectedMime: "application/pdf", rosewoodExpectedSize: "1234" }, trashed: false }), { status: 200, headers: { "Content-Type": "application/json" } })
  ];
  const adapter = new GoogleDriveAdapter({ serviceAccountEmail: "service@example.test", privateKey: signingKey(), folderId: "folder-1", fetchImpl: async (url, options) => { calls.push({ url: String(url), options }); return responses.shift(); } });
  const session = await adapter.createUploadSession({ applicationId: "app-1", category: "birth_certificate", fileName: "Birth Certificate.pdf", mimeType: "application/pdf", size: 1234 });
  assert.equal(session.uploadUrl, "https://upload.example/session");
  const metadata = JSON.parse(calls[1].options.body);
  assert.deepEqual(metadata.parents, ["folder-1"]);
  assert.equal(metadata.appProperties.rosewoodApplicationId, "app-1");
  assert.equal(calls[1].options.headers["X-Upload-Content-Length"], "1234");
  const confirmed = await adapter.confirmUpload({ documentId: "drive-file", expected: { applicationId: "app-1", category: "birth_certificate" } });
  assert.equal(confirmed.size, 1234);
  assert.equal(confirmed.category, "birth_certificate");
});

test("Drive rejects a file moved outside the restricted folder", async () => {
  const responses = [
    new Response(JSON.stringify({ access_token: "google-token", expires_in: 3600 }), { status: 200 }),
    new Response(JSON.stringify({ id: "drive-file", name: "file.pdf", mimeType: "application/pdf", size: "100", parents: ["wrong-folder"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate", rosewoodExpectedMime: "application/pdf", rosewoodExpectedSize: "100" }, trashed: false }), { status: 200 })
  ];
  const adapter = new GoogleDriveAdapter({ serviceAccountEmail: "service@example.test", privateKey: signingKey(), folderId: "folder-1", fetchImpl: async () => responses.shift() });
  await assert.rejects(() => adapter.confirmUpload({ documentId: "drive-file", expected: { applicationId: "app-1", category: "birth_certificate" } }), (error) => error.code === "DOCUMENT_MISMATCH" && error.status === 422);
});

test("Sheets tracker writes only the documented operational columns", async () => {
  const calls = [];
  const responses = [new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 }), new Response(JSON.stringify({ updates: { updatedRows: 1 } }), { status: 200 })];
  const tracker = new GoogleSheetsTracker({ serviceAccountEmail: "service@example.test", privateKey: signingKey(), spreadsheetId: "sheet-1", fetchImpl: async (url, options) => { calls.push({ url: String(url), options }); return responses.shift(); } });
  await tracker.record({ occurredAt: "2026-08-02T00:00:00.000Z", eventName: "stage_viewed", applicationId: "app-1", inviteId: "invite-1", stage: 2, elapsedSeconds: 9, viewport: "390x844", schemaVersion: "v2", id: "event-1", medicalAnswer: "must not be written" });
  const row = JSON.parse(calls[1].options.body).values[0];
  assert.equal(row.length, 9);
  assert.equal(row.includes("must not be written"), false);
  assert.match(calls[1].url, /values/);
});

test("SES mailer sends branded HTML and text without mailbox credentials", async () => {
  const sent = [];
  const mailer = new SesMailer({ client: { async send(command) { sent.push(command.input); return { MessageId: "message-1" }; } } });
  const template = accessOtpEmail({ code: "123456" });
  const result = await mailer.send({ from: "sender@example.test", replyTo: "help@example.test", to: "guardian@example.test", ...template });
  assert.equal(result.messageId, "message-1");
  assert.deepEqual(sent[0].Destination.ToAddresses, ["guardian@example.test"]);
  assert.match(sent[0].Content.Simple.Body.Html.Data, /Rosewood College/);
  assert.match(sent[0].Content.Simple.Body.Text.Data, /123456/);
  assert.equal(JSON.stringify(sent[0]).includes("password"), false);
});

test("email templates escape names and private task URLs", () => {
  const template = signatureInvitationEmail({ guardianName: '<script>alert("x")</script>', studentName: "Ava & Co", taskUrl: "https://example.test/sign?task=a&next=b" });
  assert.equal(template.html.includes("<script>alert"), false);
  assert.match(template.html, /&lt;script&gt;/);
  assert.match(template.html, /task=a&amp;next=b/);
});
