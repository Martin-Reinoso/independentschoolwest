import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { currentFormDefinition } from "./form-definitions.mjs";

const METRIC_NAMESPACE = "Rosewood/Enrolment";
const REQUEST_TIMEOUT_MS = 10_000;

const PUBLIC_ASSETS = [
  {
    path: "/pages/rosewood-enrolment-v6.html?workflow=eoi",
    markers: ["Rosewood College", "rosewood-enrolment-v6.css", "rosewood-enrolment-v6.js"]
  },
  {
    path: "/pages/rosewood-enrolment-v6.js",
    markers: ["eoi-address-search", "/v6/eoi/config", "google_places"]
  },
  {
    path: "/pages/rosewood-enrolment-v6.css",
    markers: [".address-lookup", ".address-lookup-widget"]
  },
  {
    path: "/pages/rosewood-application-sign-v6.html",
    markers: ["Rosewood College", "rosewood-application-sign-v6.js"]
  },
  {
    path: "/pages/rosewood-application-sign-v6.js",
    markers: ["signatures/request-code", "signatures/submit"]
  },
  {
    path: "/pages/rosewood-enrolment-admin-v6.html",
    markers: ["Rosewood College", "rosewood-enrolment-admin-v6.js"]
  },
  {
    path: "/pages/rosewood-enrolment-admin-v6.js",
    markers: ["staff/access/request-code", "staff/dashboard"]
  }
];

function baseUrl(value, label) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  if (!normalized.startsWith("https://")) throw new Error(`${label} must use HTTPS.`);
  return normalized;
}

async function fetchResponse(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, {
    ...options,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "user-agent": "Rosewood-Enrolment-Production-Canary/1.0",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

async function checkPublicAssets({ fetchImpl, siteBaseUrl }) {
  await Promise.all(PUBLIC_ASSETS.map(async asset => {
    const response = await fetchResponse(fetchImpl, `${siteBaseUrl}${asset.path}`);
    const body = await response.text();
    for (const marker of asset.markers) {
      if (!body.includes(marker)) throw new Error(`${asset.path.split("?")[0]} is missing an expected release marker.`);
    }
  }));
}

async function checkBackendHealth({ fetchImpl, apiBaseUrl }) {
  const response = await fetchResponse(fetchImpl, `${apiBaseUrl}/v6/health`);
  const payload = await response.json();
  const expectedEoi = currentFormDefinition("eoi").formVersion;
  const expectedApplication = currentFormDefinition("application").formVersion;
  if (payload?.status !== "ok") throw new Error("The health endpoint did not report ok.");
  if (payload?.formVersions?.eoi !== expectedEoi || payload?.formVersions?.application !== expectedApplication) {
    throw new Error("The backend form versions do not match the deployed canary release.");
  }
}

async function checkEoiAddressConfiguration({ fetchImpl, apiBaseUrl, siteBaseUrl }) {
  const response = await fetchResponse(fetchImpl, `${apiBaseUrl}/v6/eoi/config`, {
    headers: { origin: siteBaseUrl }
  });
  if (response.headers.get("access-control-allow-origin") !== siteBaseUrl) {
    throw new Error("The EOI configuration endpoint did not allow the production origin.");
  }
  if (!/no-store/i.test(response.headers.get("cache-control") || "")) {
    throw new Error("The EOI configuration endpoint is missing its no-store control.");
  }
  const payload = await response.json();
  if (payload?.addressAutocomplete?.enabled !== true || payload?.addressAutocomplete?.provider !== "google_places") {
    throw new Error("EOI address assistance is not enabled with Google Places.");
  }
  if (payload.addressAutocomplete.region !== "AU" || String(payload.addressAutocomplete.apiKey || "").length < 20) {
    throw new Error("EOI address assistance is missing its Australian browser configuration.");
  }
}

async function observedCheck(name, check) {
  const startedAt = Date.now();
  try {
    await check();
    return { name, available: true, durationMs: Date.now() - startedAt };
  } catch (error) {
    return {
      name,
      available: false,
      durationMs: Date.now() - startedAt,
      reason: String(error?.message || "Unknown canary failure").slice(0, 240)
    };
  }
}

export async function runProductionCanary({
  env = process.env,
  fetchImpl = fetch,
  metricsClient = new CloudWatchClient({}),
  now = new Date()
} = {}) {
  const siteBaseUrl = baseUrl(env.PUBLIC_SITE_BASE_URL || "https://ffe.org.au", "PUBLIC_SITE_BASE_URL");
  const apiBaseUrl = baseUrl(env.PUBLIC_API_BASE_URL, "PUBLIC_API_BASE_URL");
  const checks = await Promise.all([
    observedCheck("PublicFormAvailability", () => checkPublicAssets({ fetchImpl, siteBaseUrl })),
    observedCheck("BackendHealthAvailability", () => checkBackendHealth({ fetchImpl, apiBaseUrl })),
    observedCheck("EoiAddressAvailability", () => checkEoiAddressConfiguration({ fetchImpl, apiBaseUrl, siteBaseUrl }))
  ]);

  await metricsClient.send(new PutMetricDataCommand({
    Namespace: METRIC_NAMESPACE,
    MetricData: checks.map(check => ({
      MetricName: check.name,
      Dimensions: [{ Name: "Environment", Value: "production" }],
      Timestamp: now,
      Unit: "Count",
      Value: check.available ? 1 : 0
    }))
  }));

  const summary = {
    event: "production_canary",
    checkedAt: now.toISOString(),
    checks
  };
  console.info(JSON.stringify(summary));
  return summary;
}
