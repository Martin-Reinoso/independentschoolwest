import crypto from "node:crypto";
import {
  accessOtpEmail,
  applicationCompleteEmail,
  individualSignatureEmail,
  receiptOtpEmail,
  signatureInvitationEmail,
  signatureOtpEmail
} from "./email-templates.mjs";

const DOCUMENT_CATEGORIES = new Set(["birth_certificate", "immunisation", "proof_of_address", "school_report", "medical_plan", "court_order", "residency", "sacramental"]);
const MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const SCHOOL_YEAR_LEVELS = new Set(["Prep", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"]);
const ENGAGEMENT_EVENTS = new Set(["application_opened", "stage_viewed", "stage_completed", "validation_error", "draft_saved", "document_uploaded"]);
const REQUIRED_YES_FIELDS = new Set(["readiness_acknowledgement", "guardian_a_legal_responsibility", "guardian_completeness", "information_declaration", "privacy_acknowledgement", "authority_declaration", "review_ready"]);
const REQUIRED_FIELDS = [
  "readiness_acknowledgement", "student_first_name", "student_last_name", "student_date_of_birth",
  "entry_year", "entry_year_level", "current_school", "current_year_level", "student_address",
  "student_suburb", "student_postcode", "country_of_birth", "residency_status", "home_language",
  "family_connection", "guardian_a_first_name", "guardian_a_last_name", "guardian_a_relationship",
  "guardian_a_email", "guardian_a_mobile", "guardian_a_contact_role", "guardian_a_legal_responsibility",
  "care_arrangement", "court_orders", "emergency_first_name", "emergency_last_name",
  "emergency_relationship", "emergency_mobile", "guardian_completeness", "additional_needs",
  "medical_needs", "immunisation_status", "previous_school_permission", "previous_school_name",
  "student_name_permission", "fee_responsibility", "referral_source", "decision_factors",
  "information_declaration", "privacy_acknowledgement", "authority_declaration", "review_ready"
];
const TEXT_LIMITS = {
  student_first_name: 80,
  student_middle_names: 100,
  student_last_name: 80,
  student_preferred_name: 80,
  student_date_of_birth: 10,
  current_school: 160,
  student_address: 180,
  student_suburb: 80,
  student_postcode: 4,
  country_of_birth: 80,
  home_language: 80,
  visa_subclass: 80,
  visa_expiry: 10,
  parish: 120,
  future_sibling_details: 800,
  guardian_a_first_name: 80,
  guardian_a_last_name: 80,
  guardian_a_email: 254,
  guardian_a_mobile: 30,
  care_arrangement_details: 1200,
  secondary_address: 180,
  secondary_suburb: 80,
  secondary_postcode: 4,
  court_order_summary: 1200,
  emergency_first_name: 80,
  emergency_last_name: 80,
  emergency_relationship: 80,
  emergency_mobile: 30,
  emergency_email: 180,
  student_strengths: 1500,
  support_details: 2200,
  medical_conditions: 1500,
  medication_details: 1500,
  doctor_practice: 160,
  doctor_phone: 30,
  previous_school_name: 160,
  previous_school_contact: 180,
  fee_arrangement_details: 700,
  pending_document_explanation: 1200,
  signature_name: 160,
  final_comments: 2000
};
const ENUM_FIELDS = Object.fromEntries(Object.entries({
  student_gender: ["Female", "Male", "Another term", "Prefer not to answer"],
  entry_year: ["2027", "2028", "2029"],
  entry_year_level: [...SCHOOL_YEAR_LEVELS],
  current_year_level: ["Not yet attending", "3-year-old kindergarten", "4-year-old kindergarten", ...SCHOOL_YEAR_LEVELS],
  residency_status: ["Australian citizen", "Permanent resident", "Temporary resident", "Other / seeking advice"],
  interpreter_required: ["No", "Yes", "Unsure"],
  religion: ["Catholic", "Other Christian tradition", "Other faith tradition", "No religion", "Prefer not to answer"],
  family_connection: ["Founding / current family", "Sibling application", "Previous expression of interest", "New family"],
  future_siblings: ["No", "Yes", "Unsure"],
  guardian_a_relationship: ["Mother", "Father", "Step-parent", "Guardian", "Kinship carer", "Foster carer", "Other carer"],
  guardian_a_contact_role: ["Primary contact", "Secondary contact"],
  care_arrangement: ["Both parents together", "Shared care across households", "Mother only", "Father only", "Guardian or kinship care", "Out-of-home / foster care", "Other"],
  court_orders: ["No", "Yes", "Unsure / seeking advice"],
  informal_carer: ["No", "Yes", "Unsure / need support"],
  emergency_may_collect: ["Yes", "No", "Discuss with family"],
  additional_needs: ["No", "Yes"],
  ndis_status: ["No", "Yes", "Application in progress", "Prefer not to answer"],
  medical_needs: ["No", "Yes"],
  anaphylaxis: ["No", "Yes"],
  immunisation_status: ["Up to date and available", "Available but not up to date", "Requested / not yet available", "Seeking advice"],
  ambulance_cover: ["Yes", "No", "Unsure"],
  student_name_permission: ["No", "First name only"],
  fee_responsibility: ["Joint", "Single account holder", "Proposed split"],
  referral_source: ["Current or founding family", "Friend or family", "Parish or church", "Kindergarten or school", "Information evening", "School website", "Social media", "Internet search", "Local community", "Other"]
}).map(([field, values]) => [field, new Set(values)]));
const ARRAY_ENUM_FIELDS = {
  support_areas: new Set(["Communication and language", "Learning and cognition", "Social and emotional", "Sensory", "Physical or mobility", "Gifted or advanced learning", "Attention or executive function", "Other"]),
  media_permissions: new Set(["Internal learning and school publications", "Public school website", "Official social media", "External media and publicity"]),
  decision_factors: new Set(["Faith and character", "Academic approach", "Parent partnership", "Mentoring", "Location", "Community"])
};
const YES_ONLY_FIELDS = new Set([
  "readiness_acknowledgement", "guardian_a_lives_with_student", "guardian_a_legal_responsibility",
  "guardian_a_required_signer", "guardian_completeness", "previous_school_permission",
  "health_professional_permission",
  "community_updates", "required_documents_pending", "information_declaration",
  "privacy_acknowledgement", "authority_declaration", "review_ready",
  "signature_record_declaration", "signature_consent_declaration"
]);
for (const letter of ["b", "c", "d"]) {
  for (const [suffix, limit] of Object.entries({ first_name: 80, last_name: 80, email: 254, mobile: 30 })) TEXT_LIMITS[`guardian_${letter}_${suffix}`] = limit;
  ENUM_FIELDS[`guardian_${letter}_relationship`] = ENUM_FIELDS.guardian_a_relationship;
  ENUM_FIELDS[`guardian_${letter}_contact_role`] = ENUM_FIELDS.guardian_a_contact_role;
  ENUM_FIELDS[`guardian_${letter}_contact_permission`] = new Set(["Yes", "Restricted"]);
  for (const suffix of ["lives_with_student", "legal_responsibility", "required_signer"]) YES_ONLY_FIELDS.add(`guardian_${letter}_${suffix}`);
}
const APPLICATION_FIELDS = new Set([
  ...Object.keys(TEXT_LIMITS),
  ...Object.keys(ENUM_FIELDS),
  ...Object.keys(ARRAY_ENUM_FIELDS),
  ...YES_ONLY_FIELDS,
  "documents"
]);

function jsonResponse(statusCode, payload, origin) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key,x-client-version",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
      "Access-Control-Allow-Credentials": "false",
      "Cache-Control": "no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Content-Type": "application/json; charset=utf-8",
      "Pragma": "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

function appError(status, code, message, details) {
  return Object.assign(new Error(message), { status, code, details });
}

function safeText(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return safeText(value, 254).toLowerCase();
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function hmac(secret, value) {
  return crypto.createHmac("sha256", secret).update(String(value), "utf8").digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function randomCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function parseBody(event, maxBytes = 2_000_000) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "{}";
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw appError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  let body;
  try { body = JSON.parse(raw); } catch { throw appError(400, "INVALID_JSON", "The request body is not valid JSON."); }
  if (!body || Array.isArray(body) || typeof body !== "object") throw appError(400, "INVALID_BODY", "The request body must be an object.");
  return body;
}

function eventHeaders(event) {
  return Object.fromEntries(Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
}

function eventPath(event) {
  return event.rawPath || event.requestContext?.http?.path || event.path || "/";
}

function eventMethod(event) {
  return (event.requestContext?.http?.method || event.httpMethod || "GET").toUpperCase();
}

function validInvitation(invitation, email, nowMs) {
  return invitation && invitation.status === "active" && invitation.expiresAt > nowMs && normalizeEmail(invitation.recipientEmail) === normalizeEmail(email);
}

function maskEmail(email) {
  const [local, domain] = normalizeEmail(email).split("@");
  if (!domain) return "your invited email";
  return `${local.slice(0, Math.min(2, local.length))}${"•".repeat(Math.max(1, Math.min(5, local.length - 2)))}@${domain}`;
}

function signingData(dataUrl) {
  const value = safeText(dataUrl, 900_000);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)) throw appError(422, "INVALID_SIGNATURE", "Provide a valid signature drawing.");
  const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  if (bytes.length < 100 || bytes.length > 500_000) throw appError(422, "INVALID_SIGNATURE", "The signature drawing is empty or too large.");
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw appError(422, "INVALID_SIGNATURE", "The signature drawing is not a valid PNG image.");
  return bytes;
}

function truthyValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? "").trim());
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validateApplicationShape(application, nowMs) {
  const invalid = [];
  for (const field of Object.keys(application)) if (!APPLICATION_FIELDS.has(field)) invalid.push(`${field}:unexpected`);
  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    const value = application[field];
    if (value === undefined || value === "") continue;
    if (typeof value !== "string" || value.length > limit) invalid.push(`${field}:invalid_text`);
  }
  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    const value = application[field];
    if (value !== undefined && value !== "" && (typeof value !== "string" || !allowed.has(value))) invalid.push(`${field}:invalid_option`);
  }
  for (const [field, allowed] of Object.entries(ARRAY_ENUM_FIELDS)) {
    if (application[field] === undefined || application[field] === "") continue;
    const values = Array.isArray(application[field]) ? application[field] : [application[field]];
    if (!values.length || new Set(values).size !== values.length || values.some((value) => typeof value !== "string" || !allowed.has(value))) invalid.push(`${field}:invalid_options`);
  }
  for (const field of YES_ONLY_FIELDS) {
    const value = application[field];
    if (value !== undefined && value !== "" && value !== "Yes") invalid.push(`${field}:invalid_acknowledgement`);
  }
  if (application.documents !== undefined && !Array.isArray(application.documents)) invalid.push("documents:invalid_list");
  if (truthyValue(application.guardian_a_email) && !/^\S+@\S+\.\S+$/.test(normalizeEmail(application.guardian_a_email))) invalid.push("guardian_a_email:invalid_email");
  if (truthyValue(application.emergency_email) && !/^\S+@\S+\.\S+$/.test(normalizeEmail(application.emergency_email))) invalid.push("emergency_email:invalid_email");
  if (truthyValue(application.student_postcode) && !/^\d{4}$/.test(application.student_postcode)) invalid.push("student_postcode:invalid_postcode");
  if (truthyValue(application.secondary_postcode) && !/^\d{4}$/.test(application.secondary_postcode)) invalid.push("secondary_postcode:invalid_postcode");
  if (truthyValue(application.student_date_of_birth) && (!validDate(application.student_date_of_birth) || new Date(`${application.student_date_of_birth}T00:00:00.000Z`).valueOf() > nowMs)) invalid.push("student_date_of_birth:invalid_date");
  if (truthyValue(application.visa_expiry) && !validDate(application.visa_expiry)) invalid.push("visa_expiry:invalid_date");
  for (const letter of ["b", "c", "d"]) {
    const prefix = `guardian_${letter}_`;
    const present = Object.keys(application).some((field) => field.startsWith(prefix) && truthyValue(application[field]));
    if (!present) continue;
    for (const suffix of ["first_name", "last_name", "email", "mobile", "relationship", "contact_role", "contact_permission"]) if (!truthyValue(application[`${prefix}${suffix}`])) invalid.push(`${prefix}${suffix}:required`);
    if (truthyValue(application[`${prefix}email`]) && !/^\S+@\S+\.\S+$/.test(normalizeEmail(application[`${prefix}email`]))) invalid.push(`${prefix}email:invalid_email`);
  }
  if (invalid.length) throw appError(422, "APPLICATION_INVALID", "The application contains information outside the current Rosewood form contract.", { invalid: [...new Set(invalid)] });
}

function requiredDocumentCategories(application) {
  const required = ["birth_certificate", "immunisation", "proof_of_address"];
  if (SCHOOL_YEAR_LEVELS.has(application.current_year_level)) required.push("school_report");
  if (["Temporary resident", "Other / seeking advice"].includes(application.residency_status)) required.push("residency");
  if (application.court_orders === "Yes") required.push("court_order");
  if (application.anaphylaxis === "Yes") required.push("medical_plan");
  return required;
}

function validateApplication(application, nowMs) {
  validateApplicationShape(application, nowMs);
  const missing = REQUIRED_FIELDS.filter((field) => !truthyValue(application[field]));
  for (const field of REQUIRED_YES_FIELDS) if (application[field] !== "Yes") missing.push(`${field}:Yes`);
  if (application.additional_needs === "Yes" && (!truthyValue(application.support_areas) || !truthyValue(application.support_details))) missing.push("support_areas/support_details");
  if (application.medical_needs === "Yes" && (!truthyValue(application.medical_conditions) || !truthyValue(application.medication_details))) missing.push("medical_conditions/medication_details");
  if (application.medical_needs === "Yes" && application.health_professional_permission !== "Yes") missing.push("health_professional_permission:Yes");
  if (["Temporary resident", "Other / seeking advice"].includes(application.residency_status) && !truthyValue(application.visa_subclass)) missing.push("visa_subclass");
  if (["Shared care across households", "Other"].includes(application.care_arrangement) && !truthyValue(application.care_arrangement_details)) missing.push("care_arrangement_details");
  if (application.care_arrangement === "Shared care across households") {
    for (const field of ["secondary_address", "secondary_suburb", "secondary_postcode"]) if (!truthyValue(application[field])) missing.push(field);
  }
  if (["Yes", "Unsure / seeking advice"].includes(application.court_orders) && !truthyValue(application.court_order_summary)) missing.push("court_order_summary");
  if (["Single account holder", "Proposed split"].includes(application.fee_responsibility) && !truthyValue(application.fee_arrangement_details)) missing.push("fee_arrangement_details");
  const decisionFactors = Array.isArray(application.decision_factors) ? application.decision_factors : [application.decision_factors].filter(Boolean);
  if (decisionFactors.length < 1 || decisionFactors.length > 3) missing.push("decision_factors (select 1-3)");
  const emergencyName = `${safeText(application.emergency_first_name, 80)} ${safeText(application.emergency_last_name, 80)}`.trim().toLowerCase();
  const emergencyPhone = safeText(application.emergency_mobile, 30).replace(/\D/g, "");
  const emergencyEmail = normalizeEmail(application.emergency_email);
  for (const letter of ["a", "b", "c", "d"]) {
    const guardianName = `${safeText(application[`guardian_${letter}_first_name`], 80)} ${safeText(application[`guardian_${letter}_last_name`], 80)}`.trim().toLowerCase();
    const guardianPhone = safeText(application[`guardian_${letter}_mobile`], 30).replace(/\D/g, "");
    const guardianEmail = normalizeEmail(application[`guardian_${letter}_email`]);
    if (guardianName && emergencyName === guardianName) missing.push("emergency_contact:must_be_independent");
    if (guardianPhone && emergencyPhone === guardianPhone) missing.push("emergency_contact:must_be_independent");
    if (emergencyEmail && guardianEmail && emergencyEmail === guardianEmail) missing.push("emergency_contact:must_be_independent");
  }
  const documents = Array.isArray(application.documents) ? application.documents : [];
  const categories = new Set(documents.map((document) => document.category));
  if (application.required_documents_pending !== "Yes") {
    for (const required of requiredDocumentCategories(application)) if (!categories.has(required)) missing.push(`document:${required}`);
  } else if (!truthyValue(application.pending_document_explanation)) missing.push("pending_document_explanation");
  if (missing.length) throw appError(422, "APPLICATION_INCOMPLETE", "The application still has required information to complete.", { missing: [...new Set(missing)] });
}

function signerRecords(application, primarySignerId) {
  const primary = {
    id: primarySignerId,
    firstName: safeText(application.guardian_a_first_name, 80),
    lastName: safeText(application.guardian_a_last_name, 80),
    email: normalizeEmail(application.guardian_a_email),
    mobile: safeText(application.guardian_a_mobile, 30),
    relationship: safeText(application.guardian_a_relationship, 80),
    required: true,
    primary: true,
    contactPermission: "Yes"
  };
  const others = [];
  for (const letter of ["b", "c", "d"]) {
    const firstName = safeText(application[`guardian_${letter}_first_name`], 80);
    if (!firstName) continue;
    const signer = {
      id: `signer-${letter}-${randomToken(8)}`,
      firstName,
      lastName: safeText(application[`guardian_${letter}_last_name`], 80),
      email: normalizeEmail(application[`guardian_${letter}_email`]),
      mobile: safeText(application[`guardian_${letter}_mobile`], 30),
      relationship: safeText(application[`guardian_${letter}_relationship`], 80),
      required: application[`guardian_${letter}_required_signer`] === "Yes",
      primary: false,
      contactPermission: safeText(application[`guardian_${letter}_contact_permission`], 30)
    };
    if (!signer.lastName || !signer.email || !signer.mobile || !signer.relationship) {
      throw appError(422, "GUARDIAN_INCOMPLETE", "Complete every added guardian before submitting.");
    }
    others.push(signer);
  }
  const invalid = others.filter((signer) => signer.required && (!signer.email || signer.contactPermission !== "Yes"));
  if (invalid.length) throw appError(409, "SIGNER_REVIEW_REQUIRED", "A required guardian cannot be contacted automatically. Contact the enrolment team before submitting.");
  return [primary, ...others];
}

function reviewGroups(application, primarySignature = {}) {
  const display = (value) => Array.isArray(value) ? value.join(", ") : safeText(value, 5000) || "Not provided";
  const items = (entries) => entries.map(([label, value]) => ({ label, value: display(value) }));
  const secondaryAddress = [
    safeText(application.secondary_address, 180),
    [safeText(application.secondary_suburb, 80), safeText(application.secondary_postcode, 4)].filter(Boolean).join(" ")
  ].filter(Boolean).join(", ") || "Not applicable";
  const guardians = [
    ["Guardian 1", `${display(application.guardian_a_first_name)} ${display(application.guardian_a_last_name)} · ${display(application.guardian_a_relationship)} · ${display(application.guardian_a_contact_role)} · required signer`],
    ["Guardian 1 email", application.guardian_a_email],
    ["Guardian 1 mobile", application.guardian_a_mobile],
    ["Guardian 1 lives with student", application.guardian_a_lives_with_student],
    ["Guardian 1 legal responsibility", application.guardian_a_legal_responsibility]
  ];
  for (const [index, letter] of ["b", "c", "d"].entries()) {
    if (!truthyValue(application[`guardian_${letter}_first_name`])) continue;
    const required = application[`guardian_${letter}_required_signer`] === "Yes" ? "required signer" : "not a required signer";
    const label = `Guardian ${index + 2}`;
    guardians.push(
      [label, `${display(application[`guardian_${letter}_first_name`])} ${display(application[`guardian_${letter}_last_name`])} · ${display(application[`guardian_${letter}_relationship`])} · ${display(application[`guardian_${letter}_contact_role`])} · ${required}`],
      [`${label} email`, application[`guardian_${letter}_email`]],
      [`${label} mobile`, application[`guardian_${letter}_mobile`]],
      [`${label} lives with student`, application[`guardian_${letter}_lives_with_student`]],
      [`${label} legal responsibility`, application[`guardian_${letter}_legal_responsibility`]],
      [`${label} contact permission`, application[`guardian_${letter}_contact_permission`]]
    );
  }
  return [
    { title: "Student", items: items([["Legal first name", application.student_first_name], ["Middle names", application.student_middle_names], ["Legal family name", application.student_last_name], ["Preferred name", application.student_preferred_name], ["Date of birth", application.student_date_of_birth], ["Gender", application.student_gender], ["Proposed entry", `${display(application.entry_year_level)} in ${display(application.entry_year)}`], ["Current setting", application.current_school], ["Current level", application.current_year_level], ["Residential address", `${display(application.student_address)}, ${display(application.student_suburb)} ${display(application.student_postcode)}`], ["Country of birth", application.country_of_birth], ["Residency", application.residency_status], ["Visa status", application.visa_subclass], ["Visa expiry", application.visa_expiry], ["Home language", application.home_language], ["Interpreter", application.interpreter_required], ["Faith tradition", application.religion], ["Parish or community", application.parish], ["Rosewood connection", application.family_connection], ["Future siblings", application.future_siblings], ["Future sibling details", application.future_sibling_details]]) },
    { title: "Family and authority", items: items([...guardians, ["Care arrangement", application.care_arrangement], ["Care arrangement details", application.care_arrangement_details], ["Other household address", secondaryAddress], ["Court or parenting orders", application.court_orders], ["Order summary", application.court_order_summary], ["Informal carer", application.informal_carer], ["Emergency contact", `${display(application.emergency_first_name)} ${display(application.emergency_last_name)} · ${display(application.emergency_relationship)} · ${display(application.emergency_mobile)}`], ["Emergency email", application.emergency_email], ["Emergency collection", application.emergency_may_collect], ["All guardians included", application.guardian_completeness]]) },
    { title: "Learning, wellbeing and health", items: items([["Strengths", application.student_strengths], ["Current support", application.additional_needs], ["Support areas", application.support_areas], ["Support details", application.support_details], ["NDIS", application.ndis_status], ["Medical or allergy information", application.medical_needs], ["Conditions or allergies", application.medical_conditions], ["Medication and instructions", application.medication_details], ["Health professional contact permission", application.health_professional_permission], ["Anaphylaxis", application.anaphylaxis], ["Immunisation statement", application.immunisation_status], ["Doctor or practice", application.doctor_practice], ["Practice phone", application.doctor_phone], ["Ambulance cover", application.ambulance_cover]]) },
    { title: "Permissions and responsibilities", items: items([["Previous setting permission", application.previous_school_permission], ["Previous setting", application.previous_school_name], ["Previous setting contact", application.previous_school_contact], ["Media permissions", application.media_permissions], ["Name permission", application.student_name_permission], ["Community updates", application.community_updates], ["Fee responsibility", application.fee_responsibility], ["Fee arrangement details", application.fee_arrangement_details], ["Referral source", application.referral_source], ["Decision factors", application.decision_factors]]) },
    { title: "Documents", items: items([["Uploaded files", (application.documents || []).map((document) => `${document.category.replaceAll("_", " ")}: ${document.fileName}`)], ["Required evidence pending", application.required_documents_pending], ["Pending explanation", application.pending_document_explanation]]) },
    { title: "Primary declaration and signature", items: items([["Information complete and accurate", primarySignature.declarations?.information], ["Privacy notice acknowledged", primarySignature.declarations?.privacy], ["Authority declared", primarySignature.declarations?.authority], ["Signature audit acknowledged", primarySignature.declarations?.audit], ["Intent to sign and submit", primarySignature.declarations?.intent], ["Primary signer name", primarySignature.signerName], ["Signed at", primarySignature.completedAt], ["Final comments", application.final_comments]]) }
  ];
}

export function createService({ store, drive, mailer, tracker = { record: async () => {} }, env = {}, clock = () => Date.now() }) {
  const testMode = env.TEST_MODE === "true";
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS || "http://localhost:8000,http://127.0.0.1:8000").split(",").map((value) => value.trim()).filter(Boolean));
  const otpSecret = env.OTP_HMAC_SECRET || "local-development-secret-change-me";
  const ipSecret = env.IP_HASH_SALT || "local-development-ip-secret";
  const fromEmail = env.OTP_FROM_EMAIL || "test@example.invalid";
  const replyToEmail = env.REPLY_TO_EMAIL || fromEmail;
  const policyVersion = env.POLICY_VERSION || "";
  const signingPageUrl = env.SIGNING_PAGE_URL || "http://localhost:8000/pages/rosewood-sign-v2.html";
  const receiptPageUrl = env.RECEIPT_PAGE_URL || "http://localhost:8000/pages/rosewood-receipt-v2.html";
  if(!testMode){
    if(String(env.OTP_HMAC_SECRET||"").length<32||String(env.IP_HASH_SALT||"").length<32)throw new Error("Rosewood production secrets are missing or too short.");
    if(!env.SCHEMA_VERSION||!policyVersion)throw new Error("Rosewood production schema and policy versions are required.");
    if(!/^\S+@\S+\.\S+$/.test(fromEmail)||!/^\S+@\S+\.\S+$/.test(replyToEmail))throw new Error("Rosewood production email configuration is invalid.");
    if(!allowedOrigins.size)throw new Error("Rosewood production origins are required.");
    for(const origin of allowedOrigins)if(new URL(origin).protocol!=="https:")throw new Error("Rosewood production origins must use HTTPS.");
    for(const pageUrl of [signingPageUrl,receiptPageUrl])if(new URL(pageUrl).protocol!=="https:")throw new Error("Rosewood production task pages must use HTTPS.");
  }

  function nowIso() { return new Date(clock()).toISOString(); }
  function sourceFingerprint(event) { const ip=event.requestContext?.http?.sourceIp||event.requestContext?.identity?.sourceIp||"unknown";return hmac(ipSecret,ip); }
  function resolveOrigin(event) { const origin=eventHeaders(event).origin||[...allowedOrigins][0]||"http://localhost:8000";if(!allowedOrigins.has(origin))throw appError(403,"ORIGIN_NOT_ALLOWED","This site is not allowed to use the Rosewood service.");return origin; }
  function bearer(event) { const value=eventHeaders(event).authorization||"";const match=value.match(/^Bearer\s+(.+)$/i);return match?.[1]||""; }
  async function requireSession(event, scope) { const raw=bearer(event);if(!raw)throw appError(401,"SESSION_REQUIRED","Your secure session has expired. Verify your email again.");const session=await store.getSession(sha256(raw));if(!session||session.revokedAt||session.expiresAt<=clock()||session.scope!==scope)throw appError(401,"SESSION_EXPIRED","Your secure session has expired. Verify your email again.");return {session,raw}; }
  function requireIdempotency(event) { const key=safeText(eventHeaders(event)["idempotency-key"],160);if(!key||key.length<12)throw appError(400,"IDEMPOTENCY_REQUIRED","A valid operation identifier is required.");return key; }
  async function limited(keys, limit, seconds) { for(const key of keys){if(!await store.checkRateLimit(key,limit,seconds))throw appError(429,"RATE_LIMITED","Too many requests. Wait before trying again.");} }
  async function send(to, template) { return mailer.send({from:fromEmail,replyTo:replyToEmail,to,subject:template.subject,text:template.text,html:template.html}); }
  function outboxEvent(type, to, message) { return {id:`out-${randomToken(10)}`,type,to,message,createdAt:nowIso()}; }
  async function dispatchOutbox() { const pending=await store.listOutbox();let sent=0;for(const item of pending){const claimed=await store.claimOutbox(item,clock(),clock()+60_000);if(!claimed)continue;try{await send(item.to,item.message);await store.markOutboxSent(item,nowIso());sent+=1;}catch{await store.releaseOutbox(item).catch(()=>{});break;}}return {examined:pending.length,sent}; }

  function receiptArtifacts(application) {
    const studentName=`${application.frozen.application.student_first_name} ${application.frozen.application.student_last_name}`;
    const receiptTasks=[];
    const outboxEvents=[];
    for(const signer of application.signers.filter(item=>item.required)){
      const rawToken=randomToken();
      receiptTasks.push({
        tokenHash:sha256(rawToken),
        applicationId:application.id,
        signerId:signer.id,
        email:signer.email,
        status:"active",
        createdAt:clock(),
        expiresAt:clock()+30*24*60*60_000,
        ttl:Math.floor((clock()+45*24*60*60_000)/1000)
      });
      const receiptUrl=`${receiptPageUrl}${receiptPageUrl.includes("?")?"&":"?"}receipt=${encodeURIComponent(rawToken)}`;
      outboxEvents.push(outboxEvent("application.completed",signer.email,applicationCompleteEmail({guardianName:signer.firstName,studentName,reference:application.reference,receiptUrl})));
    }
    return {receiptTasks,outboxEvents};
  }

  async function requestAccessOtp(event) {
    const key=requireIdempotency(event);
    return store.idempotent(key,async()=>{const body=parseBody(event,20_000),token=safeText(body.invitationToken,500),email=normalizeEmail(body.email),tokenHash=sha256(token),invitation=await store.getInvitation(tokenHash),fingerprint=sourceFingerprint(event);
      await limited([`otp-cooldown:${tokenHash}:${sha256(email)}`],1,60);
      await limited([`otp-ip:${fingerprint}`,`otp-invite:${tokenHash}`,`otp-email:${sha256(email)}`],5,900);
      const valid=validInvitation(invitation,email,clock());
      const challengeId=randomToken(24), code=randomCode();
      if(valid){const challenge={id:challengeId,purpose:"application_access",subjectHash:tokenHash,email,applicationId:invitation.applicationId,codeHmac:hmac(otpSecret,`${challengeId}:${code}`),attempts:0,maxAttempts:5,createdAt:clock(),expiresAt:clock()+10*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putChallenge(challenge);await send(email,accessOtpEmail({code})).catch(()=>{});}
      const payload={challengeId,maskedEmail:valid?maskEmail(email):"the invited mailbox",expiresInSeconds:600,resendAfterSeconds:60};
      if(testMode&&valid)payload.testCode=code;
      return payload;});
  }

  async function verifyAccessOtp(event) {
    const key=requireIdempotency(event);
    return store.idempotent(key,async()=>{const body=parseBody(event,20_000),token=safeText(body.invitationToken,500),challengeId=safeText(body.challengeId,200),code=safeText(body.code,12),tokenHash=sha256(token),challenge=await store.getChallenge(challengeId);
      if(!challenge||challenge.subjectHash!==tokenHash||challenge.purpose!=="application_access")throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");
      const consumed=await store.consumeChallenge(challengeId,hmac(otpSecret,`${challengeId}:${code}`),clock());
      if(!consumed){await store.failChallenge(challengeId);throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");}
      const invitation=await store.getInvitation(tokenHash);if(!validInvitation(invitation,challenge.email,clock()))throw appError(401,"INVITATION_INVALID","This invitation is no longer available.");
      const raw=randomToken(),session={tokenHash:sha256(raw),scope:"application",applicationId:invitation.applicationId,inviteId:invitation.inviteId,invitationTokenHash:tokenHash,email:challenge.email,createdAt:clock(),expiresAt:clock()+30*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putSession(session);
      return {sessionToken:raw,expiresInSeconds:1800,context:await applicationContext(session,invitation)};});
  }

  async function applicationContext(session, suppliedInvitation) { const invitation=suppliedInvitation||await store.getInvitationById(session.inviteId);const app=await store.getApplication(session.applicationId),draft=app?.draft?{...app.draft,application:{...app.draft.application,documents:Object.values(app.documents||{})},savedAt:app.updatedAt||null}:null;return {inviteId:session.inviteId,familyLabel:invitation?.familyLabel||"Invited family",studentName:invitation?.studentName||app?.draft?.application?.student_first_name||"",recipientEmail:session.email,status:app?.status||"draft",revision:app?.revision||0,draft}; }

  async function getSessionContext(event) { const {session}=await requireSession(event,"application"),context=await applicationContext(session);if(context.status!=="draft")throw appError(410,"APPLICATION_SUBMITTED","This application has already been submitted. Use the private receipt or signature link sent by Rosewood.");return context; }

  async function saveDraft(event) { const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event);if(body.schemaVersion!==env.SCHEMA_VERSION)throw appError(409,"SCHEMA_MISMATCH","This application version is no longer current. Reload before continuing.");if(body.policyVersion!==policyVersion)throw appError(409,"POLICY_VERSION_MISMATCH","The policy version changed. Reload and review the current documents before continuing.");const baseRevision=Number(body.baseRevision),clientRevision=Number(body.clientRevision||0),currentStage=Number(body.currentStage||0);if(!Number.isInteger(baseRevision)||baseRevision<0||!Number.isInteger(clientRevision)||clientRevision<0||!Number.isInteger(currentStage)||currentStage<0||currentStage>7)throw appError(422,"INVALID_DRAFT_METADATA","The draft revision or stage is invalid.");const supplied=body.application;if(!supplied||typeof supplied!=="object"||Array.isArray(supplied))throw appError(422,"INVALID_APPLICATION","Application data is missing.");const current=await store.getApplication(session.applicationId),application={...supplied,documents:Object.values(current?.documents||{})};validateApplicationShape(application,clock());const result=await store.idempotent(key,()=>store.saveDraft({applicationId:session.applicationId,baseRevision,draft:{schemaVersion:env.SCHEMA_VERSION,policyVersion,clientRevision,currentStage,application},savedAt:nowIso()}));return {revision:result.revision,savedAt:result.updatedAt}; }

  async function recordEngagement(event) {
    const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event,20_000),eventName=safeText(body.eventName,80),stage=Number(body.stage),elapsedSeconds=Math.max(0,Math.min(86_400,Number(body.elapsedSeconds||0)));
    if(!ENGAGEMENT_EVENTS.has(eventName)||!Number.isInteger(stage)||stage<0||stage>7)throw appError(422,"INVALID_ENGAGEMENT_EVENT","The engagement event is not valid.");
    const record={id:`evt-${randomToken(10)}`,applicationId:session.applicationId,inviteId:session.inviteId,eventName,stage,elapsedSeconds,viewport:safeText(body.viewport,40),occurredAt:nowIso(),schemaVersion:env.SCHEMA_VERSION};
    return store.idempotent(key,async()=>{await store.recordEngagement(record);try{await tracker.record(record);}catch{}return {recorded:true};});
  }

  async function createDocumentSession(event) { const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event,30_000),app=await store.getApplication(session.applicationId),category=safeText(body.category,80),fileName=safeText(body.fileName,180),mimeType=safeText(body.mimeType,100),size=Number(body.size);if(app?.status!=="draft")throw appError(409,"APPLICATION_SUBMITTED","Documents cannot be changed after submission.");if(!DOCUMENT_CATEGORIES.has(category)||!fileName||!MIME_TYPES.has(mimeType)||!Number.isFinite(size)||size<1||size>MAX_FILE_BYTES)throw appError(422,"INVALID_DOCUMENT","Use a PDF, JPG or PNG file no larger than 8 MB.");return store.idempotent(key,()=>drive.createUploadSession({applicationId:session.applicationId,category,fileName,mimeType,size})); }

  async function confirmDocument(event) { const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event,20_000),app=await store.getApplication(session.applicationId),category=safeText(body.category,80),documentId=safeText(body.documentId,300);if(app?.status!=="draft")throw appError(409,"APPLICATION_SUBMITTED","Documents cannot be changed after submission.");if(!DOCUMENT_CATEGORIES.has(category)||!documentId)throw appError(422,"INVALID_DOCUMENT","The uploaded document reference is invalid.");return store.idempotent(key,async()=>{const document=await drive.confirmUpload({documentId,expected:{applicationId:session.applicationId,category}});if(!DOCUMENT_CATEGORIES.has(document.category)||document.category!==category||!MIME_TYPES.has(document.mimeType)||document.size>MAX_FILE_BYTES)throw appError(422,"DOCUMENT_MISMATCH","The uploaded document did not match the secure upload request.");await store.attachDocument(session.applicationId,document);return {document};}); }

  async function removeDocument(event) { const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event,20_000),category=safeText(body.category,80),documentId=safeText(body.documentId,300);if(!DOCUMENT_CATEGORIES.has(category)||!documentId)throw appError(422,"INVALID_DOCUMENT","The document reference is invalid.");return store.idempotent(key,async()=>{const app=await store.getApplication(session.applicationId);if(app?.status!=="draft")throw appError(409,"APPLICATION_SUBMITTED","Documents cannot be changed after submission.");const attached=app.documents?.[category];if(attached&&attached.documentId!==documentId)throw appError(409,"DOCUMENT_CHANGED","The attached document changed. Reload before removing it.");let exists=true;try{await drive.confirmUpload({documentId,expected:{applicationId:session.applicationId,category}});}catch(error){if(error.status===404)exists=false;else throw error;}if(attached)await store.detachDocument(session.applicationId,category,documentId);if(exists)await drive.deleteFile(documentId);return {removed:true,category};}); }

  async function submitApplication(event) {
    const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event);
    return store.idempotent(key,async(idempotency)=>{const app=await store.getApplication(session.applicationId);if(app?.status!=="draft")throw appError(409,"APPLICATION_SUBMITTED","This application has already been submitted.");if(!app?.draft?.application)throw appError(422,"DRAFT_REQUIRED","Save the application before signing.");if(Number(body.expectedRevision)!==Number(app.revision))throw appError(409,"REVISION_CONFLICT","The application changed after review. Review the latest revision before signing.");
      const application={...app.draft.application,documents:Object.values(app.documents||{})};validateApplication(application,clock());const declarations=body.declarations||{};for(const name of ["information","privacy","authority","audit","intent"])if(declarations[name]!=="Yes")throw appError(422,"DECLARATION_REQUIRED","Every submission declaration must be accepted.");if(typeof body.signerName!=="string"||!body.signerName.trim()||body.signerName.length>160)throw appError(422,"SIGNER_NAME_REQUIRED","Type the signer's full legal name using no more than 160 characters.");const signerName=body.signerName.trim(),signatureBytes=signingData(body.signatureDataUrl),primarySignerId=`signer-a-${randomToken(8)}`,signers=signerRecords(application,primarySignerId),frozenPayload={schemaVersion:app.draft.schemaVersion,policyVersion:app.draft.policyVersion,revision:app.revision,application},frozenHash=sha256(stableStringify(frozenPayload));
      const snapshot=await drive.storeJson({applicationId:app.id,name:`${app.id}-revision-${app.revision}.json`,value:frozenPayload}),signatureArtifact=await drive.storeSignature({applicationId:app.id,signerId:primarySignerId,data:signatureBytes});const primarySignature={id:`sig-${randomToken(10)}`,signerId:primarySignerId,signerName,revision:app.revision,revisionHash:frozenHash,artifactId:signatureArtifact.documentId,declarations,completedAt:nowIso(),networkFingerprint:sourceFingerprint(event)};const tasks=[];for(const signer of signers.filter(item=>item.required&&!item.primary)){const rawTask=randomToken(),task={tokenHash:sha256(rawTask),applicationId:app.id,signerId:signer.id,signer,status:"invited",revision:app.revision,revisionHash:frozenHash,createdAt:clock(),expiresAt:clock()+14*24*60*60_000,ttl:Math.floor((clock()+30*24*60*60_000)/1000)};tasks.push({rawTask,task});}
      const status=tasks.length?"pending_signatures":"submitted",reference=`RW-${new Date(clock()).getUTCFullYear()}-${randomToken(6).toUpperCase()}`,submittedAt=nowIso(),frozen={...frozenPayload,hash:frozenHash,snapshotId:snapshot.documentId},studentName=`${application.student_first_name} ${application.student_last_name}`,outboxEvents=[outboxEvent("signature.completed",signers[0].email,individualSignatureEmail({guardianName:signers[0].firstName,studentName}))];
      for(const {rawTask,task} of tasks){const taskUrl=`${signingPageUrl}${signingPageUrl.includes("?")?"&":"?"}task=${encodeURIComponent(rawTask)}`;outboxEvents.push(outboxEvent("signature.invited",task.signer.email,signatureInvitationEmail({guardianName:task.signer.firstName,studentName,taskUrl})));}
      let receiptTasks=[];
      if(status==="submitted"){
        const complete=receiptArtifacts({...app,status,reference,submittedAt,completedAt:submittedAt,frozen,signers,signatures:[primarySignature]});
        receiptTasks=complete.receiptTasks;
        outboxEvents.push(...complete.outboxEvents);
      }
      const operationResult={status,reference,requiredSignatures:signers.filter(item=>item.required).length,completedSignatures:1};
      if(!session.invitationTokenHash)throw appError(401,"SESSION_REVERIFY_REQUIRED","Verify the invitation mailbox again before submitting.");
      await store.submitApplication({applicationId:app.id,invitationTokenHash:session.invitationTokenHash,expectedRevision:app.revision,frozen,primarySignature,signers,signatureTasks:tasks.map(({task})=>task),receiptTasks,outboxEvents,submittedAt,status,reference,idempotency,idempotencyResult:operationResult});
      await dispatchOutbox();return operationResult;});
  }

  async function requestSignatureOtp(event) { const key=requireIdempotency(event);return store.idempotent(key,async()=>{const body=parseBody(event,20_000),rawTask=safeText(body.taskToken,500),email=normalizeEmail(body.email),taskHash=sha256(rawTask),task=await store.getSignatureTask(taskHash),fingerprint=sourceFingerprint(event);await limited([`sign-otp-cooldown:${taskHash}:${sha256(email)}`],1,60);await limited([`sign-otp-ip:${fingerprint}`,`sign-otp-task:${taskHash}`,`sign-otp-email:${sha256(email)}`],5,900);const valid=task&&task.status==="invited"&&task.expiresAt>clock()&&normalizeEmail(task.signer.email)===email;const challengeId=randomToken(24),code=randomCode();if(valid){const challenge={id:challengeId,purpose:"signature",subjectHash:taskHash,email,applicationId:task.applicationId,signerId:task.signerId,codeHmac:hmac(otpSecret,`${challengeId}:${code}`),attempts:0,maxAttempts:5,createdAt:clock(),expiresAt:clock()+10*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putChallenge(challenge);const app=await store.getApplication(task.applicationId);await send(email,signatureOtpEmail({code,studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`})).catch(()=>{});}const result={challengeId,maskedEmail:valid?maskEmail(email):"the invited mailbox",expiresInSeconds:600,resendAfterSeconds:60};if(testMode&&valid)result.testCode=code;return result;}); }

  async function verifySignatureOtp(event) { const key=requireIdempotency(event);return store.idempotent(key,async()=>{const body=parseBody(event,20_000),rawTask=safeText(body.taskToken,500),taskHash=sha256(rawTask),challengeId=safeText(body.challengeId,200),code=safeText(body.code,12),challenge=await store.getChallenge(challengeId),task=await store.getSignatureTask(taskHash);if(!challenge||challenge.subjectHash!==taskHash||challenge.purpose!=="signature"||!task||task.status!=="invited"||task.expiresAt<=clock())throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");const consumed=await store.consumeChallenge(challengeId,hmac(otpSecret,`${challengeId}:${code}`),clock());if(!consumed){await store.failChallenge(challengeId);throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");}const raw=randomToken(),session={tokenHash:sha256(raw),scope:"signature",applicationId:task.applicationId,taskTokenHash:taskHash,signerId:task.signerId,email:task.signer.email,createdAt:clock(),expiresAt:clock()+30*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putSession(session);return {sessionToken:raw,expiresInSeconds:1800,context:await signatureContext(session)};}); }

  async function signatureContext(session) { const task=await store.getSignatureTask(session.taskTokenHash),app=await store.getApplication(session.applicationId);if(!task||task.expiresAt<=clock())throw appError(410,"TASK_EXPIRED","This signature task has expired. Contact Rosewood for a new request.");if(!app?.frozen||task.revisionHash!==app.frozen.hash)throw appError(409,"REVISION_UNAVAILABLE","The application revision is no longer available for signing.");const primarySignature=(app.signatures||[]).find((signature)=>app.signers?.find((signer)=>signer.id===signature.signerId)?.primary)||{};return {studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`,revision:task.revision,revisionHash:task.revisionHash,policyVersion:app.frozen.policyVersion,signer:task.signer,reviewGroups:reviewGroups(app.frozen.application,primarySignature),status:task.status}; }
  async function getSignatureContext(event) { const {session}=await requireSession(event,"signature");return signatureContext(session); }
  async function updateSignatureDetails(event) { const {session}=await requireSession(event,"signature"),key=requireIdempotency(event),body=parseBody(event,30_000),limits={firstName:80,lastName:80,email:254,mobile:30};if(body.detailsConfirmed!==true)throw appError(422,"DETAILS_CONFIRMATION_REQUIRED","Confirm that the signer details are correct before continuing.");for(const [field,limit] of Object.entries(limits))if(typeof body[field]!=="string"||!body[field].trim()||body[field].length>limit)throw appError(422,"DETAILS_INCOMPLETE","Confirm all required signer details within the displayed limits.");if(!/^\S+@\S+\.\S+$/.test(normalizeEmail(body.email)))throw appError(422,"DETAILS_INCOMPLETE","Enter a valid signer email address.");if(normalizeEmail(body.email)!==normalizeEmail(session.email))throw appError(422,"EMAIL_LOCKED","The verified email cannot be changed in this task. Contact Rosewood for help.");return store.idempotent(key,async()=>{await store.updateSignatureDetails(session.taskTokenHash,{firstName:body.firstName.trim(),lastName:body.lastName.trim(),email:normalizeEmail(body.email),mobile:body.mobile.trim()});return signatureContext(session);}); }

  async function submitSignature(event) {
    const {session}=await requireSession(event,"signature"),key=requireIdempotency(event);
    return store.idempotent(key,async(idempotency)=>{
      const body=parseBody(event),task=await store.getSignatureTask(session.taskTokenHash),app=await store.getApplication(session.applicationId);
      if(!task||task.status!=="invited"||task.expiresAt<=clock()||!app?.frozen)throw appError(409,"TASK_UNAVAILABLE","This signature task is no longer available.");
      if(Number(body.revision)!==Number(task.revision)||task.revisionHash!==app.frozen.hash)throw appError(409,"REVISION_CONFLICT","The application revision changed. Do not sign until Rosewood issues a new task.");
      if(body.auditDeclaration!==true||body.intentDeclaration!==true)throw appError(422,"DECLARATION_REQUIRED","Accept both declarations before signing.");
      if(typeof body.signerName!=="string"||!body.signerName.trim()||body.signerName.length>160)throw appError(422,"SIGNER_NAME_REQUIRED","Type your full legal name using no more than 160 characters.");
      if(body.comments!==undefined&&(typeof body.comments!=="string"||body.comments.length>1500))throw appError(422,"COMMENTS_INVALID","Comments must use no more than 1500 characters.");
      const signerName=body.signerName.trim(),bytes=signingData(body.signatureDataUrl),artifact=await drive.storeSignature({applicationId:app.id,signerId:task.signerId,data:bytes}),completedAt=nowIso(),signature={id:`sig-${randomToken(10)}`,signerId:task.signerId,signerName,revision:task.revision,revisionHash:task.revisionHash,artifactId:artifact.documentId,declarations:{audit:true,intent:true},comments:(body.comments||"").trim(),completedAt,networkFingerprint:sourceFingerprint(event)},signers=app.signers.map(item=>item.id===task.signerId?{...item,...task.signer}:item),signatures=[...(app.signatures||[]),signature],willComplete=signers.filter(item=>item.required).every(item=>signatures.some(record=>record.signerId===item.id)),studentName=`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`,outboxEvents=[outboxEvent("signature.completed",task.signer.email,individualSignatureEmail({guardianName:task.signer.firstName,studentName}))];
      let receiptTasks=[];
      if(willComplete){const complete=receiptArtifacts({...app,status:"submitted",completedAt,signers,signatures});receiptTasks=complete.receiptTasks;outboxEvents.push(...complete.outboxEvents);}
      const operationResult={status:willComplete?"submitted":"pending_signatures",reference:app.reference};
      const completed=await store.completeSignature({tokenHash:session.taskTokenHash,signature,at:completedAt,receiptTasks,outboxEvents,idempotency,idempotencyResult:operationResult});
      if(!completed)throw appError(409,"SIGNATURE_ALREADY_COMPLETE","This signature has already been recorded.");
      await dispatchOutbox();
      return operationResult;
    });
  }

  async function requestReceiptOtp(event) {
    const key=requireIdempotency(event);
    return store.idempotent(key,async()=>{
      const body=parseBody(event,20_000),rawReceipt=safeText(body.receiptToken,500),email=normalizeEmail(body.email),receiptHash=sha256(rawReceipt),task=await store.getReceiptTask(receiptHash),fingerprint=sourceFingerprint(event);
      await limited([`receipt-otp-cooldown:${receiptHash}:${sha256(email)}`],1,60);
      await limited([`receipt-otp-ip:${fingerprint}`,`receipt-otp-task:${receiptHash}`,`receipt-otp-email:${sha256(email)}`],5,900);
      const candidate=task&&task.status==="active"&&task.expiresAt>clock()&&normalizeEmail(task.email)===email;
      const app=candidate?await store.getApplication(task.applicationId):null;
      const valid=Boolean(candidate&&app?.status==="submitted");
      const challengeId=randomToken(24),code=randomCode();
      if(valid){const challenge={id:challengeId,purpose:"receipt",subjectHash:receiptHash,email,applicationId:task.applicationId,signerId:task.signerId,codeHmac:hmac(otpSecret,`${challengeId}:${code}`),attempts:0,maxAttempts:5,createdAt:clock(),expiresAt:clock()+10*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putChallenge(challenge);await send(email,receiptOtpEmail({code,studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`})).catch(()=>{});}
      const result={challengeId,maskedEmail:valid?maskEmail(email):"the invited mailbox",expiresInSeconds:600,resendAfterSeconds:60};
      if(testMode&&valid)result.testCode=code;
      return result;
    });
  }

  async function verifyReceiptOtp(event) { const key=requireIdempotency(event);return store.idempotent(key,async()=>{const body=parseBody(event,20_000),rawReceipt=safeText(body.receiptToken,500),receiptHash=sha256(rawReceipt),challengeId=safeText(body.challengeId,200),code=safeText(body.code,12),challenge=await store.getChallenge(challengeId),task=await store.getReceiptTask(receiptHash);if(!challenge||challenge.subjectHash!==receiptHash||challenge.purpose!=="receipt"||!task||task.status!=="active"||task.expiresAt<=clock())throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");const consumed=await store.consumeChallenge(challengeId,hmac(otpSecret,`${challengeId}:${code}`),clock());if(!consumed){await store.failChallenge(challengeId);throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");}const raw=randomToken(),session={tokenHash:sha256(raw),scope:"receipt",applicationId:task.applicationId,receiptTokenHash:receiptHash,signerId:task.signerId,email:task.email,createdAt:clock(),expiresAt:clock()+30*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putSession(session);return {sessionToken:raw,expiresInSeconds:1800,receipt:await receiptContext(session)};}); }

  async function receiptContext(session) {
    const task=await store.getReceiptTask(session.receiptTokenHash),app=await store.getApplication(session.applicationId);
    if(!task||task.status!=="active"||task.expiresAt<=clock()||!app||app.status!=="submitted")throw appError(404,"RECEIPT_UNAVAILABLE","This receipt is no longer available through this link.");
    const recipient=app.signers.find(item=>item.id===task.signerId);
    return {reference:app.reference,status:app.status,submittedAt:app.submittedAt,completedAt:app.completedAt||app.submittedAt,revision:app.frozen.revision,policyVersion:app.frozen.policyVersion,studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`,recipientName:recipient?.firstName||"Guardian",signers:app.signers.filter(item=>item.required).map(signer=>{const signature=app.signatures.find(item=>item.signerId===signer.id);return {name:`${signer.firstName} ${signer.lastName}`,relationship:signer.relationship,status:signature?"signed":"pending",signedAt:signature?.completedAt||null};})};
  }
  async function getReceiptContext(event) { const {session}=await requireSession(event,"receipt");return receiptContext(session); }

  const routes = new Map([
    ["POST /v2/access/request-otp", requestAccessOtp],
    ["POST /v2/access/verify-otp", verifyAccessOtp],
    ["GET /v2/session", getSessionContext],
    ["PUT /v2/draft", saveDraft],
    ["POST /v2/engagement", recordEngagement],
    ["POST /v2/documents/session", createDocumentSession],
    ["POST /v2/documents/confirm", confirmDocument],
    ["POST /v2/documents/remove", removeDocument],
    ["POST /v2/applications/submit", submitApplication],
    ["POST /v2/signatures/request-otp", requestSignatureOtp],
    ["POST /v2/signatures/verify-otp", verifySignatureOtp],
    ["GET /v2/signatures/context", getSignatureContext],
    ["PATCH /v2/signatures/details", updateSignatureDetails],
    ["POST /v2/signatures/submit", submitSignature],
    ["POST /v2/receipts/request-otp", requestReceiptOtp],
    ["POST /v2/receipts/verify-otp", verifyReceiptOtp],
    ["GET /v2/receipts/context", getReceiptContext]
  ]);

  async function handler(event) {
    let origin;
    try {
      origin = resolveOrigin(event);
      if (eventMethod(event) === "OPTIONS") return jsonResponse(204, {}, origin);
      if (eventMethod(event) === "GET" && eventPath(event) === "/v2/health") return jsonResponse(200, {status:"ok",version:schemaVersionForResponse(env)}, origin);
      const route=routes.get(`${eventMethod(event)} ${eventPath(event)}`);if(!route)throw appError(404,"NOT_FOUND","The requested Rosewood service route does not exist.");
      const payload=await route(event);return jsonResponse(200,payload,origin);
    } catch (error) {
      const status=Number(error.status||500),code=error.code||"INTERNAL_ERROR";
      const message=status>=500?"The Rosewood service could not complete the request. Try again or contact the enrolment team.":error.message;
      return jsonResponse(status,{code,message,...(error.details?{details:error.details}:{})},origin||[...allowedOrigins][0]||"http://localhost:8000");
    }
  }
  handler.dispatchOutbox=dispatchOutbox;
  return handler;
}

function schemaVersionForResponse(env) {
  return env.SCHEMA_VERSION || "rosewood-v2-unknown";
}
