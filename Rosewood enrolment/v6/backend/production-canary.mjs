import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { DynamoStore } from "./dynamo-store.mjs";
import { currentFormDefinition } from "./form-definitions.mjs";
import { APPLICATION_REQUEST_CONTRACT } from "./application-request-contract.mjs";
import { COMMUNITY_ENQUIRY_CONTRACT } from "./community-enquiry-contract.mjs";
import { OFFER_CONTRACT } from "./offer-contract.mjs";
import { validatePolicyDownload, validatePolicyFigure } from "./offer-policy-assets.mjs";

const METRIC_NAMESPACE = "Rosewood/Enrolment";
const REQUEST_TIMEOUT_MS = 10_000;
const OUTBOX_STALE_AFTER_MS = 15 * 60_000;

const PUBLIC_ASSETS = [
  {
    path: "/",
    markers: ["Connect with Rosewood College", "pages/discover-rosewood-forms.js", "application-link-form", "community-contact-form"]
  },
  {
    path: "/pages/rosewood-application-link-request-review.html",
    markers: ["Rosewood College", "Design review", "rosewood-application-link-request-review.js"]
  },
  {
    path: "/pages/rosewood-application-link-request-review.js",
    markers: ["application-link-form", "preventDefault", "successEmail"]
  },
  {
    path: "/discover-rosewood.html",
    markers: ["url=/", "Continue to Rosewood College", "https://ffe.org.au/"]
  },
  {
    path: "/pages/discover-rosewood-forms.js",
    markers: ["/v6/application-link-requests", "/v6/community-enquiries", "idempotency-key"]
  },
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
    markers: ["Rosewood College", "Admissions overview", "rosewood-enrolment-admin-v6.js"]
  },
  {
    path: "/pages/rosewood-enrolment-admin-v6.js",
    markers: ["staff/access/request-code", "staff/dashboard", "planningSummary", "renderAttentionQueue", "emailDeliveryPresentation", "staff/invitations/renew-access", "staff/applications/communications/context", "staff/applications/messages/send", "staff/family-messages/preview", "staff/family-messages/send", "staff/meetings/slots/bulk", "staff/applications/documents/preview", "staff/cohort-planning", "staff/prospects/application-link"]
  },
  {
    path: "/pages/rosewood-enrolment-meeting-v1.html",
    markers: ["Rosewood College", "rosewood-enrolment-meeting-v1.js"]
  },
  {
    path: "/pages/rosewood-enrolment-meeting-v1.js",
    markers: ["/v6/meetings/request-code", "/v6/meetings/book", "Update meeting time"]
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

async function fetchExpectedSessionRequired(fetchImpl, url, siteBaseUrl) {
  const response = await fetchImpl(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      origin: siteBaseUrl,
      "user-agent": "Rosewood-Enrolment-Production-Canary/1.0"
    }
  });
  if (response.status !== 401) throw new Error(`Protected workflow route returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload?.error !== "SESSION_REQUIRED") throw new Error("Protected workflow route did not fail closed.");
}

async function checkPublicAssets({ fetchImpl, siteBaseUrl, offersEnabled }) {
  const offerAssets = offersEnabled ? [
    {path:'/pages/rosewood-enrolment-offer-v1.html',markers:['Sign and submit','rosewood-enrolment-offer-v1.js']},
    {path:'/pages/rosewood-enrolment-offer-v1.js',markers:['/v6/offers/sign','/v6/offers/verify-code']},
    {path:'/pages/rosewood-enrolment-offers-admin-v1.html',markers:['Send reviewed family offer']},
    {path:'/pages/rosewood-enrolment-offers-admin-v1.js',markers:['/v6/staff/offers/preview','letterPdfBase64','childOpenedAt']},
    {path:'/pages/rosewood-enrolment-offer-terms-v1.js',markers:['ROSEWOOD_OFFER_REVIEW_CONTRACT','Terms and Conditions of Enrolment','rosewood-provisional-enrolment-agreement-2026.3-review']},
    {path:'/pages/rosewood-enrolment-offer-v1.css',markers:['.child-card']},
    {path:'/pages/rosewood-enrolment-acceptance-v1.css',markers:['.acceptance-portal','.fine-print']},
    {path:'/pages/rosewood-enrolment-offer-policy-reader.js',markers:['ROSEWOOD_OFFER_POLICY_READER','Return to offer acceptance']}
  ] : [];
  await Promise.all([...PUBLIC_ASSETS,...offerAssets].map(async asset => {
    const response = await fetchResponse(fetchImpl, `${siteBaseUrl}${asset.path}`);
    const body = await response.text();
    for (const marker of asset.markers) {
      if (!body.includes(marker)) throw new Error(`${asset.path.split("?")[0]} is missing an expected release marker.`);
    }
  }));
  if (offersEnabled) await checkOfferPolicyAssets({ fetchImpl, siteBaseUrl });
}

async function readPinnedAsset(response, expectedBytes) {
  const reader = response.body?.getReader();
  if (!reader || !Number.isSafeInteger(expectedBytes) || expectedBytes < 1 || expectedBytes > 20_000_000) {
    throw new Error("A frozen policy asset has invalid size metadata or no response body.");
  }
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > expectedBytes) throw new Error("A frozen policy asset exceeds its pinned size.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  if (length !== expectedBytes) throw new Error("A frozen policy asset does not match its pinned size.");
  return Buffer.concat(chunks, length);
}

async function checkOfferPolicyAssets({ fetchImpl, siteBaseUrl }) {
  const assets = OFFER_CONTRACT.policies.flatMap(policy => [
    ...["pdf", "docx"].map(format => ({ file: policy.sourceDownloads?.[format], validate: bytes => validatePolicyDownload(policy, format, bytes) })),
    ...(policy.sourceFigures || []).map(figure => ({ file: figure, validate: bytes => validatePolicyFigure(figure, bytes) }))
  ]);
  // Only pinned public snapshots are read. No family document or storage ID is used.
  for (const { file } of assets) {
    if (!file || !/^Files\/Policies\/offer-snapshots\/[a-z0-9-]+-[a-f0-9]{64}\.(pdf|docx|png)$/.test(file.assetPath)) {
      throw new Error("A frozen policy asset is missing its local publication path.");
    }
  }
  await Promise.all(assets.map(async ({ file, validate }) => {
    const response = await fetchResponse(fetchImpl, `${siteBaseUrl}/${file.assetPath}`);
    validate(await readPinnedAsset(response, file.bytes));
  }));
}

async function checkBackendHealth({ fetchImpl, apiBaseUrl, offersEnabled }) {
  const response = await fetchResponse(fetchImpl, `${apiBaseUrl}/v6/health`);
  const payload = await response.json();
  const expectedEoi = currentFormDefinition("eoi").formVersion;
  const expectedApplication = currentFormDefinition("application").formVersion;
  const expectedApplicationRequest = APPLICATION_REQUEST_CONTRACT.formVersion;
  const expectedCommunityEnquiry = COMMUNITY_ENQUIRY_CONTRACT.formVersion;
  if (payload?.status !== "ok") throw new Error("The health endpoint did not report ok.");
  if (payload?.formVersions?.eoi !== expectedEoi || payload?.formVersions?.application !== expectedApplication || payload?.formVersions?.applicationLinkRequest !== expectedApplicationRequest || payload?.formVersions?.communityEnquiry !== expectedCommunityEnquiry) {
    throw new Error("The backend form versions do not match the deployed canary release.");
  }
  if (payload?.features?.communityEnquiries !== true) throw new Error("The community enquiry workflow is not enabled in the deployed backend.");
  if (payload?.features?.cohortPlanning !== true) throw new Error("The staff cohort-planning workflow is not enabled in the deployed backend.");
  if (payload?.features?.familyCommunications !== true) throw new Error("The reviewed family-communication workflow is not enabled in the deployed backend.");
  if (offersEnabled && payload?.features?.conditionalOffers !== true) throw new Error('Conditional offer acceptance is not enabled in the backend.');
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

async function checkApplicationWorkflow({ fetchImpl, apiBaseUrl, siteBaseUrl, offersEnabled }) {
  await Promise.all([
    "/v6/application/context",
    "/v6/application/status",
    "/v6/staff/dashboard",
    ...(offersEnabled ? ['/v6/offers/context','/v6/staff/offers'] : [])
  ].map(path => fetchExpectedSessionRequired(fetchImpl, `${apiBaseUrl}${path}`, siteBaseUrl)));
}

async function checkOperationalPipeline({ operationalStore, now }) {
  const pending = await operationalStore.inspectOutbox(25);
  if (!Array.isArray(pending)) throw new Error("The delivery queue could not be inspected.");
  if (!pending.length) return;

  const createdTimes = pending.map(item => Date.parse(item?.data?.createdAt || ""));
  if (createdTimes.some(value => !Number.isFinite(value))) throw new Error("The delivery queue contains an invalid timestamp.");
  const oldestAgeMs = now.getTime() - Math.min(...createdTimes);
  if (oldestAgeMs > OUTBOX_STALE_AFTER_MS) {
    throw new Error("The email, Sheets or Slack delivery queue has been pending for more than 15 minutes.");
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
  operationalStore,
  now = new Date()
} = {}) {
  const siteBaseUrl = baseUrl(env.PUBLIC_SITE_BASE_URL || "https://ffe.org.au", "PUBLIC_SITE_BASE_URL");
  const apiBaseUrl = baseUrl(env.PUBLIC_API_BASE_URL, "PUBLIC_API_BASE_URL");
  const pipelineStore = operationalStore || new DynamoStore({ tableName: env.ROSEWOOD_TABLE_NAME });
  const offersEnabled = env.ENROLMENT_OFFERS_ENABLED === 'true';
  const checks = await Promise.all([
    observedCheck("PublicFormAvailability", () => checkPublicAssets({ fetchImpl, siteBaseUrl, offersEnabled })),
    observedCheck("BackendHealthAvailability", () => checkBackendHealth({ fetchImpl, apiBaseUrl, offersEnabled })),
    observedCheck("EoiAddressAvailability", () => checkEoiAddressConfiguration({ fetchImpl, apiBaseUrl, siteBaseUrl })),
    observedCheck("ApplicationWorkflowAvailability", () => checkApplicationWorkflow({ fetchImpl, apiBaseUrl, siteBaseUrl, offersEnabled })),
    observedCheck("OperationalPipelineAvailability", () => checkOperationalPipeline({ operationalStore: pipelineStore, now }))
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
