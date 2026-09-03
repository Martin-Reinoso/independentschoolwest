import assert from "node:assert/strict";
import test from "node:test";
import { DynamoStore } from "../dynamo-store.mjs";
import { FAMILY_COMMUNICATION_TEMPLATE, familyCommunicationVariant, renderFamilyCommunication } from "../family-communication-templates.mjs";

const recipient = { name: "Alex Example", email: "alex+synthetic@example.com", kind: "submitting_applicant" };
const application = (studentFirstName, entryYear) => ({ applicationId: `app-${studentFirstName}`, studentFirstName, studentName: `${studentFirstName} Example`, entryYear, entryLevel: "Foundation (Prep)" });

test("family communication template has a stable reusable identity", () => {
  assert.deepEqual(FAMILY_COMMUNICATION_TEMPLATE, { id: "application_review_update", revision: "2026-09-03.1", label: "Application review update" });
});

test("2027 review update preserves the approved interview wording without a child name in the subject", () => {
  const rendered = renderFamilyCommunication({ applications: [application("Avery", "2027")], recipient });
  assert.equal(rendered.variant, "entry_2027");
  assert.equal(rendered.subject, "An update on your Rosewood College Application for Enrolment");
  assert.doesNotMatch(rendered.subject, /Avery/);
  assert.match(rendered.text, /22 to 28 September/);
  assert.match(rendered.text, /Family interviews will commence on 22 September/);
  assert.match(rendered.html, /No action is required/);
});

test("later-entry and mixed-family variants do not promise a 2027 interview for future applications", () => {
  const later = renderFamilyCommunication({ applications: [application("Bailey", "2029")], recipient });
  assert.equal(later.variant, "later_entry");
  assert.match(later.text, /will not be arranging an interview for Bailey at this stage/);
  assert.match(later.text, /families seeking entry in 2029/);

  const mixed = renderFamilyCommunication({ applications: [application("Avery", "2027"), application("Bailey", "2029")], recipient });
  assert.equal(mixed.variant, "mixed_entry");
  assert.match(mixed.text, /available times for Avery/);
  assert.match(mixed.text, /Bailey, for entry in 2029/);
});

test("family communication templates reject missing years and escape dynamic names", () => {
  assert.match(familyCommunicationVariant([application("Avery", "")]).error, /entry year/);
  const rendered = renderFamilyCommunication({ applications: [application("<Avery>", "2027")], recipient: { ...recipient, name: "<Alex>" } });
  assert.doesNotMatch(rendered.html, /Dear <Alex>/);
  assert.match(rendered.html, /Dear &lt;Alex&gt;/);
  assert.match(rendered.html, /&lt;Avery&gt;/);
});

test("family communication review and send persist one atomic family record graph", async () => {
  const writes = [];
  const client = { async send(command) { writes.push(command.input); return {}; } };
  const store = new DynamoStore({ tableName: "MainTable", auditTableName: "AuditTable", client, now: () => Date.parse("2026-09-03T01:00:00.000Z") });
  const reviewedMessage = { id: "family-message-1", invitationId: "invite-1", applicationIds: ["app-1", "app-2"], status: "reviewed", version: 1 };
  const reviewedCopy = { id: "copy-1", familyMessageId: reviewedMessage.id, status: "reviewed", contentHash: "copy-hash" };
  const reviewedIndex = { messageId: reviewedMessage.id, status: "reviewed" };
  const reviewedLinks = reviewedMessage.applicationIds.map(applicationId => ({ messageId: reviewedMessage.id, applicationId, status: "reviewed" }));
  const reviewAudit = { eventId: "audit-review", occurredAt: "2026-09-03T01:00:00.000Z" };

  await store.saveFamilyMessageReview({ message: reviewedMessage, recipientCopies: [reviewedCopy], invitationIndex: reviewedIndex, applicationLinks: reviewedLinks, auditEvents: [reviewAudit] });
  const reviewItems = writes[0].TransactItems;
  assert.deepEqual(reviewItems.map(item => item.Put.Item.PK), [
    "FAMILY_COMM#family-message-1",
    "INVITE_ID#invite-1",
    "FAMILY_COMM#family-message-1",
    "APP#app-1",
    "APP#app-2",
    "AUDIT"
  ]);
  assert.ok(reviewItems.every(item => item.Put.ConditionExpression));
  assert.equal(reviewItems.at(-1).Put.TableName, "AuditTable");

  const sentAt = "2026-09-03T01:05:00.000Z";
  const sentMessage = { ...reviewedMessage, status: "sent", version: 2, sentAt };
  const sentCopy = { ...reviewedCopy, status: "sent", deliveryStatus: "queued", sentAt };
  const sentIndex = { ...reviewedIndex, status: "sent" };
  const sentLinks = reviewedLinks.map(link => ({ ...link, status: "sent" }));
  const outboxEvents = ["outbox-1", "outbox-2"].map(id => ({ id, kind: "email", createdAt: sentAt }));
  const sendAudit = { eventId: "audit-send", occurredAt: sentAt };

  await store.sendFamilyMessage({ message: sentMessage, expectedVersion: 1, recipientCopies: [sentCopy], invitationIndex: sentIndex, applicationLinks: sentLinks, outboxEvents, auditEvents: [sendAudit] });
  const sendItems = writes[1].TransactItems;
  assert.equal(sendItems.filter(item => item.Put.Item.PK === "OUTBOX").length, 2);
  assert.equal(sendItems.filter(item => item.Put.Item.PK.startsWith("APP#")).length, 2);
  assert.equal(sendItems.filter(item => item.Put.Item.PK === "FAMILY_COMM#family-message-1").length, 2);
  assert.equal(sendItems.at(-1).Put.TableName, "AuditTable");
  assert.equal(sendItems[0].Put.ExpressionAttributeValues[":expectedVersion"], 1);
});
