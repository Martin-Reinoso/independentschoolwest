import assert from "node:assert/strict";
import test from "node:test";
import { runProductionCanary } from "../production-canary.mjs";

const SITE = "https://ffe.org.au";
const API = "https://synthetic.lambda-url.ap-southeast-2.on.aws";

const publicBodies = new Map([
  ["/pages/rosewood-application-link-request-review.html", "Rosewood College Design review rosewood-application-link-request-review.js"],
  ["/pages/rosewood-application-link-request-review.js", "application-link-form preventDefault successEmail"],
  ["/", "Connect with Rosewood College pages/discover-rosewood-forms.js application-link-form community-contact-form"],
  ["/discover-rosewood.html", "url=/ Continue to Rosewood College https://ffe.org.au/"],
  ["/pages/discover-rosewood-forms.js", "/v6/application-link-requests /v6/community-enquiries idempotency-key"],
  ["/pages/rosewood-enrolment-v6.html", "Rosewood College rosewood-enrolment-v6.css rosewood-enrolment-v6.js"],
  ["/pages/rosewood-enrolment-v6.js", "eoi-address-search /v6/eoi/config google_places"],
  ["/pages/rosewood-enrolment-v6.css", ".address-lookup .address-lookup-widget"],
  ["/pages/rosewood-application-sign-v6.html", "Rosewood College rosewood-application-sign-v6.js"],
  ["/pages/rosewood-application-sign-v6.js", "signatures/request-code signatures/submit"],
  ["/pages/rosewood-enrolment-admin-v6.html", "Rosewood College Admissions overview rosewood-enrolment-admin-v6.js"],
  ["/pages/rosewood-enrolment-admin-v6.js", "staff/access/request-code staff/dashboard planningSummary renderAttentionQueue staff/invitations/renew-access staff/applications/messages/send"]
  ,["/pages/rosewood-enrolment-meeting-v1.html", "Rosewood College rosewood-enrolment-meeting-v1.js"]
  ,["/pages/rosewood-enrolment-meeting-v1.js", "/v6/meetings/request-code /v6/meetings/book"]
]);

function response(body, { status = 200, headers = {} } = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": typeof body === "string" ? "text/plain" : "application/json", ...headers }
  });
}

function healthyFetch({ breakPublicAsset = false, omitAddressKey = false } = {}) {
  return async (input, options = {}) => {
    const url = new URL(input);
    if (url.origin === SITE) {
      const body = publicBodies.get(url.pathname);
      if (!body) return response("missing", { status: 404 });
      if (breakPublicAsset && url.pathname.endsWith("rosewood-enrolment-v6.js")) return response("incomplete release");
      return response(body);
    }
    if (url.origin === API && url.pathname === "/v6/health") {
      return response({
        status: "ok",
        formVersions: {
          eoi: "rosewood-eoi-2026.22",
          application: "rosewood-application-2026.23",
          applicationLinkRequest: "rosewood-application-link-request-2026.1",
          communityEnquiry: "rosewood-community-enquiry-2026.1"
        },
        features: { communityEnquiries: true }
      });
    }
    if (url.origin === API && ["/v6/application/context", "/v6/application/status", "/v6/staff/dashboard"].includes(url.pathname)) {
      assert.equal(options.headers.origin, SITE);
      return response({ error: "SESSION_REQUIRED", message: "Verify your email address to continue." }, { status: 401 });
    }
    if (url.origin === API && url.pathname === "/v6/eoi/config") {
      assert.equal(options.headers.origin, SITE);
      return response({
        addressAutocomplete: {
          enabled: true,
          provider: "google_places",
          region: "AU",
          apiKey: omitAddressKey ? "" : "synthetic-browser-key-with-safe-length"
        }
      }, {
        headers: {
          "access-control-allow-origin": SITE,
          "cache-control": "no-store, max-age=0"
        }
      });
    }
    return response("missing", { status: 404 });
  };
}

function capturingMetricsClient() {
  const commands = [];
  return {
    commands,
    async send(command) {
      commands.push(command.input);
      return {};
    }
  };
}

function operationalStore(items = []) {
  return { async inspectOutbox() { return items; } };
}

test("production canary checks public assets, backend versions and EOI address configuration without writes", async () => {
  const metricsClient = capturingMetricsClient();
  const result = await runProductionCanary({
    env: { PUBLIC_SITE_BASE_URL: SITE, PUBLIC_API_BASE_URL: API },
    fetchImpl: healthyFetch(),
    metricsClient,
    operationalStore: operationalStore(),
    now: new Date("2026-08-09T00:00:00.000Z")
  });

  assert.equal(result.checks.length, 5);
  assert.ok(result.checks.every(check => check.available));
  assert.equal(metricsClient.commands.length, 1);
  assert.deepEqual(
    metricsClient.commands[0].MetricData.map(metric => [metric.MetricName, metric.Value]),
    [
      ["PublicFormAvailability", 1],
      ["BackendHealthAvailability", 1],
      ["EoiAddressAvailability", 1],
      ["ApplicationWorkflowAvailability", 1],
      ["OperationalPipelineAvailability", 1]
    ]
  );
});

test("production canary publishes independent zero metrics when public or address checks fail", async () => {
  const metricsClient = capturingMetricsClient();
  const result = await runProductionCanary({
    env: { PUBLIC_SITE_BASE_URL: SITE, PUBLIC_API_BASE_URL: API },
    fetchImpl: healthyFetch({ breakPublicAsset: true, omitAddressKey: true }),
    metricsClient,
    operationalStore: operationalStore()
  });

  assert.deepEqual(
    result.checks.map(check => [check.name, check.available]),
    [
      ["PublicFormAvailability", false],
      ["BackendHealthAvailability", true],
      ["EoiAddressAvailability", false],
      ["ApplicationWorkflowAvailability", true],
      ["OperationalPipelineAvailability", true]
    ]
  );
  assert.deepEqual(metricsClient.commands[0].MetricData.map(metric => metric.Value), [0, 1, 0, 1, 1]);
  assert.ok(result.checks.filter(check => !check.available).every(check => check.reason && !check.reason.includes("synthetic-browser-key")));
});

test("production canary requires HTTPS monitoring targets", async () => {
  await assert.rejects(
    runProductionCanary({
      env: { PUBLIC_SITE_BASE_URL: "http://ffe.org.au", PUBLIC_API_BASE_URL: API },
      fetchImpl: healthyFetch(),
      metricsClient: capturingMetricsClient(),
      operationalStore: operationalStore()
    }),
    /must use HTTPS/
  );
});

test("production canary detects a stale delivery queue without logging queued payloads", async () => {
  const metricsClient = capturingMetricsClient();
  const result = await runProductionCanary({
    env: { PUBLIC_SITE_BASE_URL: SITE, PUBLIC_API_BASE_URL: API },
    fetchImpl: healthyFetch(),
    metricsClient,
    operationalStore: operationalStore([{
      data: {
        createdAt: "2026-08-08T23:30:00.000Z",
        payload: { to: "private@example.test", medical: "must never be logged" }
      }
    }]),
    now: new Date("2026-08-09T00:00:00.000Z")
  });

  const pipeline = result.checks.find(check => check.name === "OperationalPipelineAvailability");
  assert.equal(pipeline.available, false);
  assert.match(pipeline.reason, /more than 15 minutes/);
  assert.doesNotMatch(JSON.stringify(result), /private@example\.test|medical/);
  assert.equal(metricsClient.commands[0].MetricData.find(metric => metric.MetricName === "OperationalPipelineAvailability").Value, 0);
});

test("production canary detects a protected workflow route that does not fail closed", async () => {
  const metricsClient = capturingMetricsClient();
  const healthy = healthyFetch();
  const fetchImpl = async (input, options) => {
    const url = new URL(input);
    if (url.pathname === "/v6/application/status") return response({ status: "unexpectedly_public" });
    return healthy(input, options);
  };
  const result = await runProductionCanary({
    env: { PUBLIC_SITE_BASE_URL: SITE, PUBLIC_API_BASE_URL: API },
    fetchImpl,
    metricsClient,
    operationalStore: operationalStore()
  });

  assert.equal(result.checks.find(check => check.name === "ApplicationWorkflowAvailability").available, false);
});
