import assert from "node:assert/strict";
import test from "node:test";
import { applicationCompletionMessage, SlackNotifier } from "../slack-notifier.mjs";

test("completion notification contains only safe operational information", () => {
  const message = applicationCompletionMessage({
    reference: "APP-2026-SYNTHETIC",
    completedAt: "2026-08-09T03:15:00.000Z",
    staffPortalUrl: "https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html"
  });
  const serialized = JSON.stringify(message);
  assert.match(serialized, /APP-2026-SYNTHETIC/);
  assert.match(serialized, /Open staff portal/);
  assert.match(serialized, /rosewood-enrolment-admin-v6\.html/);
  for (const sensitive of ["studentName", "email", "medical", "guardian", "applicationId"]) {
    assert.doesNotMatch(serialized, new RegExp(sensitive, "i"));
  }
});

test("disabled notifier performs no network request", async () => {
  const notifier = new SlackNotifier();
  assert.equal(notifier.enabled, false);
  assert.deepEqual(await notifier.send({ reference: "APP-2026-SYNTHETIC", completedAt: "2026-08-09T03:15:00.000Z" }), { skipped: true, reason: "not_configured" });
});

test("notifier posts the safe message and rejects failed deliveries", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200 };
    };
    const notifier = new SlackNotifier({
      webhookUrl: "https://hooks.slack.com/services/T000/B000/synthetic",
      staffPortalUrl: "https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html"
    });
    assert.deepEqual(await notifier.send({ reference: "APP-2026-SYNTHETIC", completedAt: "2026-08-09T03:15:00.000Z" }), { delivered: true });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].options.method, "POST");
    assert.match(requests[0].options.body, /APP-2026-SYNTHETIC/);

    globalThis.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(() => notifier.send({ reference: "APP-2026-SYNTHETIC", completedAt: "2026-08-09T03:15:00.000Z" }), /status 503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
