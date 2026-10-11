import assert from "node:assert/strict";
import test from "node:test";
import { DynamoStore } from "../dynamo-store.mjs";
import { activeInvitationAccess, invitationExpiryIso, invitationTtlAttributes } from "../invitation-access.mjs";
const now = Date.parse("2026-10-11T00:00:00Z");
const durable = { id: "invite-synthetic", applicationId: "app-synthetic", applicationIds: ["app-synthetic"], familyRevision: 0, status: "active", tokenHash: "synthetic-hash", expiryPolicy: "none", expiresAt: null };
const legacy = { ...durable, expiryPolicy: "fixed", expiresAt: now + 86400_000 };

function fixture() {
  const commands = [];
  const store = new DynamoStore({ tableName: "synthetic-main", auditTableName: "synthetic-audit", now: () => now, client: { async send(command) { commands.push(command.input); return {}; } } });
  return { store, commands };
}

test("explicit non-expiry omits TTL and date while malformed/expired legacy access fails closed", () => {
  assert.equal(activeInvitationAccess(durable, now + 3650 * 86400_000), true);
  assert.deepEqual(invitationTtlAttributes(durable), {});
  assert.equal(invitationExpiryIso(durable), "");
  assert.equal(invitationTtlAttributes(legacy).ttl, Math.floor(legacy.expiresAt / 1000) + 86400);
  assert.equal(activeInvitationAccess({ ...legacy, expiresAt: now }, now), false);
  assert.equal(activeInvitationAccess({ ...durable, expiryPolicy: undefined }, now), false);
  assert.throws(() => invitationTtlAttributes({ ...durable, expiryPolicy: undefined }));
});

test("all invitation writes omit automatic deletion, including sibling creation and public reissue", async () => {
  const { store, commands } = fixture();
  const application = { id: "app-synthetic", revision: 0, invitationId: durable.id, status: "invited" };
  const common = { invitation: durable, tokenHash: durable.tokenHash, previousTokenHash: "previous-synthetic", application, revisionRecord: { revision: 0 }, expectedFamilyRevision: 0, expectedApplication: application, outboxEvents: [] };
  await store.createInvitation(common);
  await store.rotateInvitation(common);
  await store.renewInvitationAccess(common);
  await store.addApplicationToInvitation(common);
  await store.reissueInvitationForApplicationRequest({ ...common, applicationRequest: { id: "synthetic-request" }, requestEmailIndex: { emailHash: "synthetic-email-hash", invitationId: durable.id }, idempotency: { keyHash: "synthetic-key", ttl: 123, result: { accepted: true } } });
  for (const command of commands) {
    const invitations = command.TransactItems.map(item => item.Put?.Item).filter(item => ["invitation", "invitation_index"].includes(item?.entity));
    assert.equal(invitations.length, 2);
    for (const item of invitations) { assert.equal("ttl" in item, false); assert.equal(item.data.expiresAt, null); }
  }
  const sibling = commands[3].TransactItems.filter(item => item.Put?.Item?.entity === "invitation")[0];
  assert.match(sibling.Put.ConditionExpression, /#expiryPolicy = :expiryPolicy/);
  assert.equal(sibling.Put.ExpressionAttributeValues[":expiryPolicy"], "none");
});

test("migration atomically removes both TTLs and records an audit without touching applications or sending email", async () => {
  const { store, commands } = fixture();
  assert.deepEqual(await store.removeInvitationExpiry({ invitation: legacy, actorId: "synthetic-operator" }), { changed: true });
  const actions = commands[0].TransactItems;
  assert.equal(actions.length, 3);
  assert.deepEqual(actions.slice(0, 2).map(item => item.Update.Key.PK), [`INVITE#${legacy.tokenHash}`, `INVITE_ID#${legacy.id}`]);
  for (const { Update: update } of actions.slice(0, 2)) {
    assert.match(update.UpdateExpression, /REMOVE #ttl/);
    assert.match(update.ConditionExpression, /#data = :expected/);
    assert.match(update.ConditionExpression, /#expiresAt > :now/);
    assert.deepEqual(update.ExpressionAttributeValues[":expected"], legacy);
  }
  assert.equal(actions[2].Put.TableName, "synthetic-audit");
  assert.equal(actions[2].Put.Item.data.details.previousExpiresAt, legacy.expiresAt);
  assert.deepEqual(await store.removeInvitationExpiry({ invitation: durable, actorId: "synthetic-operator" }), { changed: false });
  assert.equal(commands.length, 1);
  await assert.rejects(() => store.removeInvitationExpiry({ invitation: { ...legacy, expiresAt: now - 1 }, actorId: "synthetic-operator" }));
  await assert.rejects(() => store.removeInvitationExpiry({ invitation: { ...legacy, status: "revoked" }, actorId: "synthetic-operator" }));
  await assert.rejects(() => store.removeInvitationExpiry({ invitation: legacy, actorId: "synthetic-operator", outboxEvents: [{ kind: "email" }] }));
});

test("migration surfaces concurrent rotation/deletion as a conflict and never retries an old token", async () => {
  const { store } = fixture();
  let attempts = 0;
  store.client.send = async () => { attempts++; throw Object.assign(new Error("synthetic conflict"), { name: "TransactionCanceledException" }); };
  await assert.rejects(() => store.removeInvitationExpiry({ invitation: legacy, actorId: "synthetic-operator" }), error => error.code === "REVISION_CONFLICT");
  assert.equal(attempts, 1);
});
