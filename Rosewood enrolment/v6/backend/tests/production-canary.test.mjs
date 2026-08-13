import assert from "node:assert/strict";
import test from "node:test";
import { runProductionCanary } from "../production-canary.mjs";

const SITE = "https://ffe.org.au";
const API = "https://synthetic.lambda-url.ap-southeast-2.on.aws";

const publicBodies = new Map([
  ["/pages/rosewood-enrolment-v6.html", "Rosewood College rosewood-enrolment-v6.css rosewood-enrolment-v6.js"],
  ["/pages/rosewood-enrolment-v6.js", "eoi-address-search /v6/eoi/config google_places"],
  ["/pages/rosewood-enrolment-v6.css", ".address-lookup .address-lookup-widget"],
  ["/pages/rosewood-application-sign-v6.html", "Rosewood College rosewood-application-sign-v6.js"],
  ["/pages/rosewood-application-sign-v6.js", "signatures/request-code signatures/submit"],
  ["/pages/rosewood-enrolment-admin-v6.html", "Rosewood College rosewood-enrolment-admin-v6.js"],
  ["/pages/rosewood-enrolment-admin-v6.js", "staff/access/request-code staff/dashboard"]
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
          eoi: "rosewood-eoi-2026.12",
          application: "rosewood-application-2026.12"
        }
      });
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

test("production canary checks public assets, backend versions and EOI address configuration without writes", async () => {
  const metricsClient = capturingMetricsClient();
  const result = await runProductionCanary({
    env: { PUBLIC_SITE_BASE_URL: SITE, PUBLIC_API_BASE_URL: API },
    fetchImpl: healthyFetch(),
    metricsClient,
    now: new Date("2026-08-09T00:00:00.000Z")
  });

  assert.equal(result.checks.length, 3);
  assert.ok(result.checks.every(check => check.available));
  assert.equal(metricsClient.commands.length, 1);
  assert.deepEqual(
    metricsClient.commands[0].MetricData.map(metric => [metric.MetricName, metric.Value]),
    [
      ["PublicFormAvailability", 1],
      ["BackendHealthAvailability", 1],
      ["EoiAddressAvailability", 1]
    ]
  );
});

test("production canary publishes independent zero metrics when public or address checks fail", async () => {
  const metricsClient = capturingMetricsClient();
  const result = await runProductionCanary({
    env: { PUBLIC_SITE_BASE_URL: SITE, PUBLIC_API_BASE_URL: API },
    fetchImpl: healthyFetch({ breakPublicAsset: true, omitAddressKey: true }),
    metricsClient
  });

  assert.deepEqual(
    result.checks.map(check => [check.name, check.available]),
    [
      ["PublicFormAvailability", false],
      ["BackendHealthAvailability", true],
      ["EoiAddressAvailability", false]
    ]
  );
  assert.deepEqual(metricsClient.commands[0].MetricData.map(metric => metric.Value), [0, 1, 0]);
  assert.ok(result.checks.filter(check => !check.available).every(check => check.reason && !check.reason.includes("synthetic-browser-key")));
});

test("production canary requires HTTPS monitoring targets", async () => {
  await assert.rejects(
    runProductionCanary({
      env: { PUBLIC_SITE_BASE_URL: "http://ffe.org.au", PUBLIC_API_BASE_URL: API },
      fetchImpl: healthyFetch(),
      metricsClient: capturingMetricsClient()
    }),
    /must use HTTPS/
  );
});
