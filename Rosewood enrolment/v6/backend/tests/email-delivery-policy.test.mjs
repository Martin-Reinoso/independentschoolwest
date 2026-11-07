import assert from "node:assert/strict";
import test from "node:test";
import { createEmailDeliveryPolicy, guardEmailOutboxStore, guardEmailSender, mergeServiceConfig } from "../email-delivery-policy.mjs";
import { SesMailer } from "../ses-mailer.mjs";
import { createService } from "../service.mjs";

const config = { EMAIL_DELIVERY_MODE: "test", EMAIL_TEST_IDENTITIES: "alex@example.test,taylor@example.test,staff@example.test", EMAIL_TEST_DESTINATION: "approved@example.com" };
const message = { to: "alex@example.test", subject: "Your provisional offer", text: "Synthetic offer", html: "<p>Synthetic offer</p>" };

test("test configuration fails closed for missing, malformed or real logical identities", () => {
  for (const patch of [
    { EMAIL_DELIVERY_MODE: "" }, { EMAIL_DELIVERY_MODE: "TEST" },
    { EMAIL_TEST_IDENTITIES: "" }, { EMAIL_TEST_IDENTITIES: "," },
    { EMAIL_TEST_IDENTITIES: "alex@example.test," },
    { EMAIL_TEST_IDENTITIES: "family@example.com" },
    { EMAIL_TEST_IDENTITIES: "alex@example.test\nBcc:family@example.com" },
    { EMAIL_TEST_DESTINATION: "" }, { EMAIL_TEST_DESTINATION: "a@example.com,b@example.com" },
    { EMAIL_TEST_DESTINATION: "a@example.test" }, { EMAIL_TEST_DESTINATION: "a@example.com\n" },
    { EMAIL_DELIVERY_MODE: "production" }
  ]) assert.throws(() => createEmailDeliveryPolicy({ ...config, ...patch }));
});

test("a stale queued real recipient or expanded destination is rejected before SES", async () => {
  let calls = 0;
  const mailer = new SesMailer({ deliveryPolicy: createEmailDeliveryPolicy(config), client: { async send() { calls++; } } });
  for (const patch of [
    { to: "family@example.com" }, { to: "approved@example.com" }, { to: "unknown@example.test" },
    { to: ["alex@example.test"] }, { to: "alex@example.test,taylor@example.test" },
    { to: "alex@example.test\r\nBcc:family@example.com" },
    { cc: "family@example.com" }, { bcc: [] }, { Destination: { ToAddresses: ["family@example.com"] } }
  ]) await assert.rejects(mailer.send({ ...message, ...patch }));
  assert.equal(calls, 0);
});

test("separate synthetic identities deliver only to the approved inbox, visibly marked", async () => {
  const sent = [];
  const mailer = new SesMailer({ from: "enrolment@ffe.org.au", replyTo: "enrolment@ffe.org.au", deliveryPolicy: createEmailDeliveryPolicy(config), client: { async send(command) { sent.push(command.input); return { MessageId: "test" }; } } });
  for (const to of ["alex@example.test", "taylor@example.test"]) {
    const payload = { ...message, to };
    await mailer.send(payload);
    assert.equal(payload.to, to, "transport must not mutate signer identity");
  }
  for (const input of sent) {
    assert.deepEqual(input.Destination, { ToAddresses: ["approved@example.com"] });
    assert.deepEqual(input.ReplyToAddresses, ["approved@example.com"]);
    assert.match(input.Content.Simple.Subject.Data, /^\[ROSEWOOD TEST\]/);
    assert.match(input.Content.Simple.Body.Text.Data, /fictional records only/);
    assert.match(input.Content.Simple.Body.Html.Data, /fictional records only/);
  }
  assert.match(sent[0].Content.Simple.Body.Text.Data, /alex@example.test/);
  assert.match(sent[1].Content.Simple.Body.Text.Data, /taylor@example.test/);
});

test("every supported queue shape is rejected before any atomic store write", () => {
  const writes = [];
  const store = guardEmailOutboxStore({ write(...args) { writes.push(args); } }, createEmailDeliveryPolicy(config));
  const blocked = { kind: "email", payload: { ...message, to: "family@example.com" } };
  for (const args of [[blocked], [[blocked]], [{ outboxEvents: [blocked] }], [{ id: "synthetic" }, [blocked]]]) {
    assert.throws(() => store.write(...args));
  }
  assert.equal(writes.length, 0);
  store.write({ outboxEvents: [{ kind: "email", payload: message }, { kind: "sheet", payload: {} }] });
  assert.equal(writes.length, 1);
});

test("service dispatch rechecks old queue entries even with an injected transport", async () => {
  let sends = 0, failed = 0;
  const item = { data: { id: "synthetic", kind: "email", payload: { ...message, to: "family@example.com" } } };
  const service = createService({ env: { ...config, OTP_HMAC_SECRET: "test", NETWORK_HMAC_SECRET: "test" },
    store: { listOutbox: async () => [item], claimOutbox: async () => ({ attempts: 8 }), failOutbox: async () => { failed++; } },
    drive: {}, sheets: {}, mailer: { async send() { sends++; } }
  });
  const result = await service.dispatchOutbox();
  assert.equal(sends, 0);
  assert.equal(failed, 1);
  assert.equal(result.failed, 1);
});

test("direct OTP sends obey the same policy and disabled mode blocks all sends", async () => {
  let calls = 0;
  for (const policy of [createEmailDeliveryPolicy(config), createEmailDeliveryPolicy({ EMAIL_DELIVERY_MODE: "disabled" })]) {
    const guarded = guardEmailSender({ async send() { calls++; } }, policy);
    await assert.rejects(guarded.send({ ...message, to: "family@example.com" }));
  }
  assert.equal(calls, 0);
});

test("configuration secrets and runtime overrides cannot disable the transport guard", () => {
  assert.throws(() => mergeServiceConfig(config, { EMAIL_DELIVERY_MODE: "production" }));
  assert.throws(() => mergeServiceConfig(config, {}, { EMAIL_DELIVERY_MODE: "production" }));
  assert.throws(() => mergeServiceConfig(config, {}, { EMAIL_TEST_DESTINATION: "unapproved@example.com" }));
  assert.deepEqual(mergeServiceConfig(config, { OTP_HMAC_SECRET: "synthetic" }).EMAIL_TEST_DESTINATION, config.EMAIL_TEST_DESTINATION);
});

test("normal production messages retain their destination, content and Reply-To", () => {
  const payload = { ...message, to: "family@example.com", replyTo: "enrolment@ffe.org.au" };
  assert.strictEqual(createEmailDeliveryPolicy().prepare(payload), payload);
});
