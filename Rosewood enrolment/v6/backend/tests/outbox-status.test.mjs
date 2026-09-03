import assert from "node:assert/strict";
import test from "node:test";
import { DynamoStore } from "../dynamo-store.mjs";

test("email outbox status inspection projects only operational correlation fields", async () => {
  const commands = [];
  const client = {
    async send(command) {
      commands.push(command.input);
      const partition = command.input.ExpressionAttributeValues[":pk"];
      if (partition === "OUTBOX") return {
        Items: [
          { data: { kind: "email", createdAt: "2026-09-03T00:00:00.000Z", payload: { tags: { workflow: "application_link_request", message_type: "application_link_requested", record_id: "request-queued" } } } },
          { data: { kind: "sheet", createdAt: "2026-09-03T00:00:00.000Z", payload: { tags: { record_id: "sheet-record" } } } }
        ]
      };
      return { Items: [{ data: { kind: "email", createdAt: "2026-09-03T00:00:00.000Z", failure: { failedAt: "2026-09-03T00:05:00.000Z" }, payload: { tags: { workflow: "application_link_request", message_type: "application_link_requested", record_id: "request-failed" } } } }] };
    }
  };
  const store = new DynamoStore({ tableName: "synthetic-records", client });

  const states = await store.listEmailOutboxStates();

  assert.deepEqual(states, [
    { state: "queued", occurredAt: "2026-09-03T00:00:00.000Z", workflow: "application_link_request", messageType: "application_link_requested", recordId: "request-queued" },
    { state: "send_failed", occurredAt: "2026-09-03T00:05:00.000Z", workflow: "application_link_request", messageType: "application_link_requested", recordId: "request-failed" }
  ]);
  assert.deepEqual(commands.map(command => command.ExpressionAttributeValues[":pk"]), ["OUTBOX", "OUTBOX_FAILED"]);
  for (const command of commands) {
    assert.match(command.ProjectionExpression, /#data\.#payload\.#tags\.#recordId/);
    assert.doesNotMatch(command.ProjectionExpression, /recipient|subject|body|#to/);
    assert.equal(command.ConsistentRead, true);
  }
});
