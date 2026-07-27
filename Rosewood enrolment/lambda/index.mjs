import crypto from "node:crypto";

const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "";
const DOCUMENT_BUCKET = process.env.DOCUMENT_BUCKET || "";
const AWS_REGION_NAME = process.env.AWS_REGION || "ap-southeast-2";
const IP_HASH_SALT = process.env.IP_HASH_SALT || "";
const DISPLAY_TIME_ZONE = process.env.DISPLAY_TIME_ZONE || "Australia/Melbourne";
const EXPECTED_LEGAL_VERSION = process.env.LEGAL_VERSION || "interim-2026-07-27";
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "https://ffe.org.au,http://localhost:8000,http://127.0.0.1:8000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const INVITATION_HEADERS = [
  "invite_id",
  "token_hash",
  "family_label",
  "recipient_email",
  "student_name",
  "status",
  "created_at",
  "expires_at",
  "first_opened_at",
  "last_activity_at",
  "submitted_at",
  "submission_id"
];

const APPLICATION_HEADERS = [
  "submission_id",
  "invite_id",
  "submitted_at",
  "status",
  "student_first_name",
  "student_last_name",
  "student_date_of_birth",
  "entry_year",
  "entry_year_level",
  "parent_a_name",
  "parent_a_email",
  "parent_a_mobile",
  "parent_b_name",
  "parent_b_email",
  "referral_source",
  "decision_factors",
  "legal_version",
  "signature_a_name",
  "signature_a_date",
  "signature_b_name",
  "signature_b_date",
  "network_fingerprint",
  "user_agent",
  "documents_json",
  "application_json"
];

const ENGAGEMENT_HEADERS = [
  "event_id",
  "invite_id",
  "session_id",
  "event_name",
  "section",
  "occurred_at",
  "elapsed_seconds",
  "viewport",
  "metadata_json"
];

const EVENT_NAMES = new Set([
  "page_view",
  "form_started",
  "step_viewed",
  "step_completed",
  "validation_error",
  "document_uploaded",
  "submission_started",
  "submission_completed",
  "submission_failed"
]);

const DOCUMENT_CATEGORIES = new Set([
  "birth_certificate",
  "immunisation_history",
  "proof_of_address",
  "passport_or_visa",
  "medical_or_support_plan",
  "court_or_parenting_orders",
  "baptism_certificate"
]);

const CONTENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const REQUIRED_APPLICATION_FIELDS = [
  "student_first_name",
  "student_last_name",
  "student_date_of_birth",
  "entry_year",
  "entry_year_level",
  "parent_a_first_name",
  "parent_a_last_name",
  "parent_a_email",
  "parent_a_mobile",
  "emergency_first_name",
  "emergency_last_name",
  "emergency_mobile",
  "information_declaration",
  "privacy_acknowledgement",
  "signature_a_name",
  "signature_a_date"
];

let googleTokenCache = null;

function requiredEnv(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
}

function resolveOrigin(headers = {}) {
  const origin = headers.origin || headers.Origin || "";
  if (!origin) return ALLOWED_ORIGINS.values().next().value || "https://ffe.org.au";
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function response(statusCode, payload, origin) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload)
  };
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function safeText(value, maxLength = 5000) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, maxLength);
}

function sanitizeFileName(fileName) {
  const clean = safeText(fileName, 180)
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return clean || "document";
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function fingerprintIp(event) {
  if (!IP_HASH_SALT) return "";
  const ip = event.requestContext?.http?.sourceIp || event.requestContext?.identity?.sourceIp || "";
  return ip ? hmac(IP_HASH_SALT, ip, "hex") : "";
}

function parseBody(event) {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "{}";
  if (Buffer.byteLength(rawBody, "utf8") > 900_000) {
    throw new Error("Request is too large.");
  }
  const body = JSON.parse(rawBody);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object.");
  }
  return body;
}

function compareHeaders(actual, expected, sheetName) {
  const normalized = actual.map((value) => String(value || "").trim());
  if (normalized.length !== expected.length || normalized.some((value, index) => value !== expected[index])) {
    throw new Error(`${sheetName} headers do not match the documented schema.`);
  }
}

async function getGoogleAccessToken() {
  requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", GOOGLE_SERVICE_ACCOUNT_EMAIL);
  requiredEnv("GOOGLE_PRIVATE_KEY", GOOGLE_PRIVATE_KEY);

  if (googleTokenCache && googleTokenCache.expiresAt > Date.now() + 60_000) {
    return googleTokenCache.accessToken;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: issuedAt + 3600,
    iat: issuedAt
  }));
  const signingInput = `${header}.${claims}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).end().sign(GOOGLE_PRIVATE_KEY);
  const assertion = `${signingInput}.${base64Url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Could not authenticate with Google Sheets.");
  }
  googleTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000
  };
  return googleTokenCache.accessToken;
}

async function sheetsRequest(path, options = {}) {
  requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID", GOOGLE_SHEETS_SPREADSHEET_ID);
  const token = await getGoogleAccessToken();
  const request = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_SPREADSHEET_ID}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    }
  );
  const payload = await request.json().catch(() => ({}));
  if (!request.ok) {
    throw new Error(payload?.error?.message || "Google Sheets request failed.");
  }
  return payload;
}

async function readSheet(sheetName, range = "A:ZZ") {
  const encodedRange = encodeURIComponent(`${sheetName}!${range}`);
  const payload = await sheetsRequest(`/values/${encodedRange}`);
  return payload.values || [];
}

async function appendRows(sheetName, headers, rows) {
  const existing = await readSheet(sheetName, `A1:${columnName(headers.length)}1`);
  compareHeaders(existing[0] || [], headers, sheetName);
  const encodedRange = encodeURIComponent(`${sheetName}!A:${columnName(headers.length)}`);
  return sheetsRequest(`/values/${encodedRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ majorDimension: "ROWS", values: rows })
  });
}

async function replaceRow(sheetName, rowNumber, headers, values) {
  const encodedRange = encodeURIComponent(`${sheetName}!A${rowNumber}:${columnName(headers.length)}${rowNumber}`);
  return sheetsRequest(`/values/${encodedRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ majorDimension: "ROWS", values: [values] })
  });
}

function columnName(number) {
  let value = number;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
}

function invitationToRow(record) {
  return INVITATION_HEADERS.map((header) => record[header] ?? "");
}

async function findInvitation(inviteToken) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(safeText(inviteToken, 128))) {
    throw new Error("Invitation link is invalid.");
  }
  const rows = await readSheet("Invitations", `A1:${columnName(INVITATION_HEADERS.length)}`);
  compareHeaders(rows[0] || [], INVITATION_HEADERS, "Invitations");
  const tokenHash = hashToken(inviteToken);
  const rowIndex = rows.slice(1).findIndex((row) => row[1] === tokenHash);
  if (rowIndex < 0) throw new Error("Invitation link is invalid.");
  const rowNumber = rowIndex + 2;
  const record = rowToObject(INVITATION_HEADERS, rows[rowNumber - 1]);
  if (record.status === "revoked") throw new Error("This invitation is no longer active.");
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error("This invitation has expired. Please ask the enrolment team for a new link.");
  }
  return { record, rowNumber };
}

async function updateInvitation(record, rowNumber, updates) {
  const next = { ...record, ...updates };
  await replaceRow("Invitations", rowNumber, INVITATION_HEADERS, invitationToRow(next));
  return next;
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const allowed = new Set(["elapsedSeconds", "viewport", "field", "category", "size", "submissionId", "message"]);
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!allowed.has(key)) continue;
    clean[key] = typeof value === "number" ? value : safeText(value, 160);
  }
  return clean;
}

function sanitizeApplication(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Application data is missing.");
  }
  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) continue;
    if (Array.isArray(value)) {
      clean[key] = value.slice(0, 50).map((item) => safeText(item, 500));
    } else {
      clean[key] = safeText(value, 5000);
    }
  }
  for (const field of REQUIRED_APPLICATION_FIELDS) {
    if (!clean[field] || (Array.isArray(clean[field]) && !clean[field].length)) {
      throw new Error(`Required application field is missing: ${field}`);
    }
  }
  return clean;
}

function sanitizeDocuments(input, inviteId) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 20).map((document) => {
    const category = safeText(document?.category, 80);
    const storageKey = safeText(document?.storageKey, 500);
    if (!DOCUMENT_CATEGORIES.has(category) || !storageKey.startsWith(`applications/${inviteId}/`)) {
      throw new Error("A document reference is invalid.");
    }
    return {
      category,
      categoryLabel: safeText(document.categoryLabel, 120),
      fileName: sanitizeFileName(document.fileName),
      contentType: safeText(document.contentType, 80),
      size: Number(document.size) || 0,
      storageKey
    };
  });
}

function validateApplicationSubmission(application, documents, legalVersion) {
  if (safeText(legalVersion, 120) !== EXPECTED_LEGAL_VERSION) {
    throw new Error("The enrolment acknowledgement has changed. Refresh the page and review it again.");
  }
  if (application.information_declaration !== "Agreed" || application.privacy_acknowledgement !== "Agreed") {
    throw new Error("The required declarations must be accepted.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.parent_a_email)) {
    throw new Error("Parent / guardian email is invalid.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(application.student_date_of_birth)
    || !/^\d{4}-\d{2}-\d{2}$/.test(application.signature_a_date)) {
    throw new Error("Application dates are invalid.");
  }
  if (!["2027", "2028", "2029"].includes(application.entry_year)) {
    throw new Error("Entry year is invalid.");
  }
  if (!["Prep", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"].includes(application.entry_year_level)) {
    throw new Error("Entry year level is invalid.");
  }

  const categories = new Set(documents.map((document) => document.category));
  const missing = ["birth_certificate", "immunisation_history", "proof_of_address"]
    .filter((category) => !categories.has(category));
  if (application.student_residency_status
    && application.student_residency_status !== "Australian citizen"
    && !categories.has("passport_or_visa")) {
    missing.push("passport_or_visa");
  }
  if (application.court_orders === "Yes" && !categories.has("court_or_parenting_orders")) {
    missing.push("court_or_parenting_orders");
  }
  if (missing.length && !application.final_comments) {
    throw new Error(`Required documents are missing: ${missing.join(", ")}`);
  }
}

function applicationRow(submissionId, inviteId, application, documents, legalVersion, event) {
  const parentAName = `${safeText(application.parent_a_first_name, 80)} ${safeText(application.parent_a_last_name, 80)}`.trim();
  const parentBName = `${safeText(application.parent_b_first_name, 80)} ${safeText(application.parent_b_last_name, 80)}`.trim();
  const decisionFactors = Array.isArray(application.decision_factors)
    ? application.decision_factors.join(" | ")
    : safeText(application.decision_factors, 500);
  const userAgent = safeText(event.headers?.["user-agent"] || event.headers?.["User-Agent"], 500);
  const values = {
    submission_id: submissionId,
    invite_id: inviteId,
    submitted_at: nowIso(),
    status: "submitted",
    student_first_name: application.student_first_name,
    student_last_name: application.student_last_name,
    student_date_of_birth: application.student_date_of_birth,
    entry_year: application.entry_year,
    entry_year_level: application.entry_year_level,
    parent_a_name: parentAName,
    parent_a_email: application.parent_a_email,
    parent_a_mobile: application.parent_a_mobile,
    parent_b_name: parentBName,
    parent_b_email: application.parent_b_email || "",
    referral_source: application.referral_source || "",
    decision_factors: decisionFactors,
    legal_version: safeText(legalVersion, 120),
    signature_a_name: application.signature_a_name,
    signature_a_date: application.signature_a_date,
    signature_b_name: application.signature_b_name || "",
    signature_b_date: application.signature_b_date || "",
    network_fingerprint: fingerprintIp(event),
    user_agent: userAgent,
    documents_json: JSON.stringify(documents),
    application_json: JSON.stringify(application)
  };
  return APPLICATION_HEADERS.map((header) => values[header] ?? "");
}

function awsTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function presignS3Put({ key, contentType, expiresSeconds = 300 }) {
  requiredEnv("DOCUMENT_BUCKET", DOCUMENT_BUCKET);
  requiredEnv("AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID);
  requiredEnv("AWS_SECRET_ACCESS_KEY", process.env.AWS_SECRET_ACCESS_KEY);
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN || "";
  const service = "s3";
  const host = `${DOCUMENT_BUCKET}.s3.${AWS_REGION_NAME}.amazonaws.com`;
  const timestamp = awsTimestamp();
  const dateStamp = timestamp.slice(0, 8);
  const credentialScope = `${dateStamp}/${AWS_REGION_NAME}/${service}/aws4_request`;
  const canonicalUri = `/${key.split("/").map(encodeRfc3986).join("/")}`;
  const signedHeaders = "content-type;host;x-amz-server-side-encryption";
  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${credentialScope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders
  };
  if (sessionToken) query["X-Amz-Security-Token"] = sessionToken;
  const canonicalQuery = Object.entries(query)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .join("&");
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    "x-amz-server-side-encryption:AES256",
    ""
  ].join("\n");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");
  const dateKey = hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = crypto.createHmac("sha256", dateKey).update(AWS_REGION_NAME).digest();
  const serviceKey = crypto.createHmac("sha256", regionKey).update(service).digest();
  const signingKey = crypto.createHmac("sha256", serviceKey).update("aws4_request").digest();
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function handleValidate(invitation) {
  const timestamp = nowIso();
  const record = await updateInvitation(invitation.record, invitation.rowNumber, {
    first_opened_at: invitation.record.first_opened_at || timestamp,
    last_activity_at: timestamp,
    status: invitation.record.status === "invited" ? "opened" : invitation.record.status
  });
  return {
    inviteId: record.invite_id,
    familyLabel: record.family_label,
    studentName: record.student_name,
    status: record.status,
    submissionId: record.submission_id || ""
  };
}

async function handleEngagement(body, invitation) {
  const eventName = safeText(body.eventName, 80);
  if (!EVENT_NAMES.has(eventName)) throw new Error("Engagement event is invalid.");
  const metadata = sanitizeMetadata(body.metadata);
  await appendRows("Engagement", ENGAGEMENT_HEADERS, [[
    crypto.randomUUID(),
    invitation.record.invite_id,
    safeText(body.sessionId, 80),
    eventName,
    safeText(body.section, 120),
    nowIso(),
    Number(metadata.elapsedSeconds) || 0,
    safeText(metadata.viewport, 40),
    JSON.stringify(metadata)
  ]]);
  await updateInvitation(invitation.record, invitation.rowNumber, {
    first_opened_at: invitation.record.first_opened_at || nowIso(),
    last_activity_at: nowIso(),
    status: eventName === "form_started" && invitation.record.status !== "submitted"
      ? "started"
      : invitation.record.status
  });
  return { ok: true };
}

async function handlePresign(body, invitation) {
  if (invitation.record.status === "submitted") {
    throw new Error("This application has already been submitted.");
  }
  const category = safeText(body.category, 80);
  const contentType = safeText(body.contentType, 80).toLowerCase();
  const fileName = sanitizeFileName(body.fileName);
  const size = Number(body.size);
  if (!DOCUMENT_CATEGORIES.has(category)) throw new Error("Document category is invalid.");
  if (!CONTENT_TYPES.has(contentType)) throw new Error("Document type must be PDF, JPG or PNG.");
  if (!Number.isInteger(size) || size < 1 || size > 10 * 1024 * 1024) {
    throw new Error("Document must be no larger than 10 MB.");
  }
  const key = `applications/${invitation.record.invite_id}/${crypto.randomUUID()}-${category}-${fileName}`;
  return {
    key,
    uploadUrl: presignS3Put({ key, contentType }),
    expiresIn: 300
  };
}

async function handleSubmit(body, invitation, event) {
  if (invitation.record.status === "submitted") {
    return { submissionId: invitation.record.submission_id, alreadySubmitted: true };
  }
  const application = sanitizeApplication(body.application);
  const documents = sanitizeDocuments(body.documents, invitation.record.invite_id);
  validateApplicationSubmission(application, documents, body.legalVersion);
  const submissionId = `RW-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  await appendRows("Applications", APPLICATION_HEADERS, [
    applicationRow(
      submissionId,
      invitation.record.invite_id,
      application,
      documents,
      body.legalVersion,
      event
    )
  ]);
  await updateInvitation(invitation.record, invitation.rowNumber, {
    status: "submitted",
    submitted_at: nowIso(),
    last_activity_at: nowIso(),
    submission_id: submissionId
  });
  return { submissionId };
}

export async function handler(event) {
  const origin = resolveOrigin(event.headers);
  const method = event.requestContext?.http?.method || event.httpMethod || "GET";
  const path = event.rawPath || event.path || "/";
  if (!origin) return response(403, { error: "Origin not allowed." }, "https://ffe.org.au");
  if (method === "OPTIONS") return response(204, {}, origin);
  if (method === "GET" && path === "/") {
    return response(200, { service: "rosewood-enrolment", status: "ok" }, origin);
  }
  if (method !== "POST") return response(404, { error: "Not found." }, origin);

  try {
    const body = parseBody(event);
    const invitation = await findInvitation(body.inviteToken);
    let result;
    if (path === "/invitation/validate") {
      result = await handleValidate(invitation);
    } else if (path === "/engagement") {
      result = await handleEngagement(body, invitation);
    } else if (path === "/documents/presign") {
      result = await handlePresign(body, invitation);
    } else if (path === "/applications/submit") {
      result = await handleSubmit(body, invitation, event);
    } else {
      return response(404, { error: "Not found." }, origin);
    }
    return response(200, result, origin);
  } catch (error) {
    console.error("Rosewood enrolment request failed", {
      path,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    const message = error instanceof SyntaxError
      ? "Request body is not valid JSON."
      : error instanceof Error
        ? error.message
        : "Unexpected server error.";
    return response(400, { error: message }, origin);
  }
}
