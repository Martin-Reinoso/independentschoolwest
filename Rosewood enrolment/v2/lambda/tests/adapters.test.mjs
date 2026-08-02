import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { GoogleDriveAdapter } from "../google-drive-adapter.mjs";
import { GoogleSheetsTracker } from "../google-sheets-tracker.mjs";
import { SesMailer } from "../ses-mailer.mjs";
import { DynamoStore } from "../dynamo-store.mjs";
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
  const oauthAssertion = new URLSearchParams(calls[0].options.body).get("assertion");
  const oauthClaims = JSON.parse(Buffer.from(oauthAssertion.split(".")[1], "base64url").toString("utf8"));
  assert.equal(oauthClaims.scope, "https://www.googleapis.com/auth/drive");
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

test("Drive deployment probe creates and deletes a real file", async () => {
  const calls = [];
  const responses = [
    new Response(JSON.stringify({ access_token: "google-token", expires_in: 3600 }), { status: 200 }),
    new Response(JSON.stringify({ id: "probe-file" }), { status: 200 }),
    new Response(null, { status: 204 })
  ];
  const adapter = new GoogleDriveAdapter({ serviceAccountEmail: "service@example.test", privateKey: signingKey(), folderId: "folder-1", fetchImpl: async (url, options) => { calls.push({ url: String(url), options }); return responses.shift(); } });
  const probe = await adapter.createFile({ name: "probe.txt", mimeType: "text/plain", data: "probe", applicationId: "preflight", kind: "deployment_preflight" });
  await adapter.deleteFile(probe.documentId);
  assert.match(calls[1].url, /uploadType=multipart/);
  assert.match(calls[2].url, /files\/probe-file/);
  assert.equal(calls[2].options.method, "DELETE");
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

test("Dynamo submission transaction includes state, tasks, receipts and outbox", async () => {
  const calls = [];
  const app = { id: "app-1", status: "draft", revision: 3, signatures: [], signers: [], events: [] };
  const client = { async send(command) {
    calls.push(command.input);
    if (command.input.Key?.PK === "APP#app-1") return { Item: { data: app } };
    return {};
  } };
  const store = new DynamoStore({ tableName: "table", client });
  await store.submitApplication({
    applicationId: "app-1",
    expectedRevision: 3,
    frozen: { hash: "revision-hash" },
    primarySignature: { signerId: "signer-a" },
    signers: [{ id: "signer-a", required: true }],
    signatureTasks: [{ tokenHash: "signature-hash", ttl: 100 }],
    receiptTasks: [{ tokenHash: "receipt-hash", ttl: 200 }],
    outboxEvents: [{ id: "email-1", createdAt: "2026-08-02T00:00:00.000Z", to: "guardian@example.test" }],
    submittedAt: "2026-08-02T00:00:00.000Z",
    status: "submitted",
    reference: "RW-2026-TEST"
  });
  const transaction = calls.find((input) => input.TransactItems);
  const keys = transaction.TransactItems.map((item) => item.Put.Item).map((item) => `${item.PK}|${item.SK}`);
  assert.deepEqual(keys, [
    "APP#app-1|CURRENT",
    "TASK#signature-hash|META",
    "RECEIPT#receipt-hash|META",
    "OUTBOX|2026-08-02T00:00:00.000Z#email-1"
  ]);
  assert.equal(transaction.TransactItems[0].Put.Item.data.completedAt, "2026-08-02T00:00:00.000Z");
});

test("Dynamo final-signature transaction updates confirmed signer details with receipt delivery", async () => {
  const calls = [];
  const task = { applicationId: "app-1", signerId: "signer-b", status: "invited", revisionHash: "revision-hash", ttl: 100, signer: { id: "signer-b", firstName: "Jordan", lastName: "Confirmed", email: "second@example.test", mobile: "0422000000" } };
  const app = { id: "app-1", status: "pending_signatures", frozen: { hash: "revision-hash" }, signatures: [{ signerId: "signer-a" }], signers: [{ id: "signer-a", required: true }, { id: "signer-b", required: true, lastName: "Old" }] };
  const client = { async send(command) {
    calls.push(command.input);
    if (command.input.Key?.PK === "TASK#task-hash") return { Item: { data: task } };
    if (command.input.Key?.PK === "APP#app-1") return { Item: { data: app } };
    return {};
  } };
  const store = new DynamoStore({ tableName: "table", client });
  const result = await store.completeSignature({
    tokenHash: "task-hash",
    signature: { signerId: "signer-b", revisionHash: "revision-hash" },
    at: "2026-08-02T01:00:00.000Z",
    receiptTasks: [{ tokenHash: "receipt-hash", ttl: 200 }],
    outboxEvents: [{ id: "email-1", createdAt: "2026-08-02T01:00:00.000Z", to: "second@example.test" }]
  });
  assert.equal(result.application.status, "submitted");
  assert.equal(result.application.signers[1].lastName, "Confirmed");
  const transaction = calls.find((input) => input.TransactItems);
  assert.equal(transaction.TransactItems.length, 4);
  assert.equal(transaction.TransactItems[2].Put.Item.PK, "RECEIPT#receipt-hash");
  assert.equal(transaction.TransactItems[3].Put.Item.PK, "OUTBOX");
});

test("critical Dynamo commit and idempotency result survive a post-commit interruption", async () => {
  const markerKey = "IDEMPOTENCY#critical-operation";
  let marker;
  let deletes = 0;
  const app = { id: "app-atomic", status: "draft", revision: 1, signatures: [], signers: [], events: [] };
  const conditional = () => Object.assign(new Error("conditional"), { name: "ConditionalCheckFailedException" });
  const client = { async send(command) {
    const input = command.input;
    if (input.Item?.entity === "idempotency") {
      if (marker) throw conditional();
      marker = structuredClone(input.Item);
      return {};
    }
    if (input.Key?.PK === markerKey && input.ConsistentRead) return { Item: structuredClone(marker) };
    if (input.Key?.PK === "APP#app-atomic") return { Item: { data: structuredClone(app) } };
    if (input.TransactItems) {
      const completion = input.TransactItems.find((item) => item.Update?.Key?.PK === markerKey)?.Update;
      assert.ok(completion, "Application transaction must include idempotency completion");
      marker.status = "COMPLETED";
      marker.result = structuredClone(completion.ExpressionAttributeValues[":result"]);
      marker.completedAt = completion.ExpressionAttributeValues[":now"];
      return {};
    }
    if (input.Key?.PK === markerKey && input.ConditionExpression?.includes("#createdAt")) {
      deletes += 1;
      return {};
    }
    return {};
  } };
  const store = new DynamoStore({ tableName: "table", client, now: () => 1_000_000 });
  const expected = { status: "submitted", reference: "RW-ATOMIC" };
  await assert.rejects(() => store.idempotent("critical-operation", async (idempotency) => {
    await store.submitApplication({
      applicationId: "app-atomic",
      expectedRevision: 1,
      frozen: { hash: "hash" },
      primarySignature: { signerId: "signer-a" },
      signers: [{ id: "signer-a", required: true }],
      submittedAt: "2026-08-02T00:00:00.000Z",
      status: "submitted",
      reference: "RW-ATOMIC",
      idempotency,
      idempotencyResult: expected
    });
    throw new Error("Synthetic interruption after transaction");
  }), /Synthetic interruption/);
  assert.equal(marker.status, "COMPLETED");
  assert.equal(deletes, 0);

  let replayedOperation = false;
  const replay = await store.idempotent("critical-operation", async () => { replayedOperation = true; });
  assert.deepEqual(replay, expected);
  assert.equal(replayedOperation, false);
});

test("Dynamo idempotency reclaims only stale in-progress operations", async () => {
  let now = 2_000_000;
  let marker = { PK: "IDEMPOTENCY#stale-operation", SK: "META", entity: "idempotency", status: "PENDING", createdAt: now - 61_000 };
  const conditional = () => Object.assign(new Error("conditional"), { name: "ConditionalCheckFailedException" });
  const client = { async send(command) {
    const input = command.input;
    if (input.Item?.entity === "idempotency") throw conditional();
    if (input.Key?.PK === marker.PK && input.ConsistentRead) return { Item: structuredClone(marker) };
    if (input.Key?.PK === marker.PK && input.UpdateExpression?.includes("#createdAt = :claimAt")) {
      assert.equal(input.ExpressionAttributeValues[":previousClaim"], marker.createdAt);
      marker.createdAt = input.ExpressionAttributeValues[":claimAt"];
      return {};
    }
    if (input.Key?.PK === marker.PK && input.UpdateExpression?.includes("#status = :completed")) {
      marker.status = "COMPLETED";
      marker.result = structuredClone(input.ExpressionAttributeValues[":result"]);
      return {};
    }
    return {};
  } };
  const store = new DynamoStore({ tableName: "table", client, now: () => now });
  const recovered = await store.idempotent("stale-operation", async () => ({ recovered: true }));
  assert.deepEqual(recovered, { recovered: true });
  assert.equal(marker.status, "COMPLETED");

  marker = { PK: "IDEMPOTENCY#stale-operation", SK: "META", entity: "idempotency", status: "PENDING", createdAt: now };
  await assert.rejects(() => store.idempotent("stale-operation", async () => ({ shouldNotRun: true })), (error) => error.code === "OPERATION_IN_PROGRESS");
});

test("a reclaimed Dynamo operation cannot be overwritten or deleted by its expired worker", async () => {
  let now = 3_000_000;
  let marker;
  let releaseExpiredWorker;
  const expiredWorkerGate = new Promise((resolve) => { releaseExpiredWorker = resolve; });
  const conditional = () => Object.assign(new Error("conditional"), { name: "ConditionalCheckFailedException" });
  const client = { async send(command) {
    const input = command.input;
    if (input.Item?.entity === "idempotency") {
      if (marker) throw conditional();
      marker = structuredClone(input.Item);
      return {};
    }
    if (input.Key?.PK === marker.PK && input.ConsistentRead) return { Item: structuredClone(marker) };
    if (input.Key?.PK === marker.PK && input.UpdateExpression?.includes("#createdAt = :claimAt")) {
      if (marker.status !== "PENDING" || marker.createdAt !== input.ExpressionAttributeValues[":previousClaim"]) throw conditional();
      marker.createdAt = input.ExpressionAttributeValues[":claimAt"];
      return {};
    }
    if (input.Key?.PK === marker.PK && input.UpdateExpression?.includes("#status = :completed")) {
      if (marker.status !== "PENDING" || marker.createdAt !== input.ExpressionAttributeValues[":claimAt"]) throw conditional();
      marker.status = "COMPLETED";
      marker.result = structuredClone(input.ExpressionAttributeValues[":result"]);
      return {};
    }
    if (input.Key?.PK === marker.PK && input.ConditionExpression?.includes("#createdAt")) {
      if (marker.status !== "PENDING" || marker.createdAt !== input.ExpressionAttributeValues[":claimAt"]) throw conditional();
      marker = undefined;
      return {};
    }
    return {};
  } };
  const store = new DynamoStore({ tableName: "table", client, now: () => now });
  const expiredWorker = store.idempotent("race-operation", async () => {
    await expiredWorkerGate;
    return { worker: "expired" };
  });

  now += 61_000;
  const replacementResult = await store.idempotent("race-operation", async () => ({ worker: "replacement" }));
  assert.deepEqual(replacementResult, { worker: "replacement" });
  releaseExpiredWorker();
  await assert.rejects(expiredWorker, (error) => error.name === "ConditionalCheckFailedException");
  assert.equal(marker.status, "COMPLETED");
  assert.deepEqual(marker.result, { worker: "replacement" });
});

test("deployment preflight fails closed before making cloud calls", () => {
  const lambdaDirectory = fileURLToPath(new URL("..", import.meta.url));
  const result = spawnSync(process.execPath, ["scripts/deployment-preflight.mjs"], {
    cwd: lambdaDirectory,
    env: { PATH: process.env.PATH || "" },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Missing required environment variable: EXPECTED_AWS_ACCOUNT_ID/);
});

test("invitation utility fails closed without explicit synthetic controls", () => {
  const lambdaDirectory = fileURLToPath(new URL("..", import.meta.url));
  const result = spawnSync(process.execPath, ["scripts/create-invitation.mjs"], {
    cwd: lambdaDirectory,
    env: { PATH: process.env.PATH || "" },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Synthetic invitations require/);
});

test("deployment template includes URL-only public invocation and scheduled outbox retry", () => {
  const template = readFileSync(new URL("../../template.yaml", import.meta.url), "utf8");
  assert.match(template, /Code: lambda-dist\//);
  assert.match(template, /DeletionProtectionEnabled: true/);
  assert.match(template, /Resource: !Sub "\$\{ConfigSecretArn\}\*"/);
  assert.doesNotMatch(template, /^\s+Cors:/m);
  assert.match(template, /RECEIPT_PAGE_URL: https:\/\/ffe\.org\.au\/pages\/rosewood-receipt-v2\.html/);
  assert.match(template, /Action: lambda:InvokeFunctionUrl/);
  assert.match(template, /Action: lambda:InvokeFunction\n\s+Principal: "\*"\n\s+InvokedViaFunctionUrl: true/);
  assert.match(template, /RosewoodOutboxSchedule:/);
  assert.match(template, /ScheduleExpression: rate\(1 minute\)/);
  assert.match(template, /Principal: events\.amazonaws\.com/);
});
