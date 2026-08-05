import crypto from "node:crypto";
import { applicationComplete, applicationInvitation, applicationOtp, applicationSubmitted, eoiAcknowledgement, signatureInvitation, signatureOtp } from "./email-templates.mjs";
import { SCHEMA_VERSION, normalizeEmail, safeText, sanitizeApplication, splitApplication, truthy, validateApplicationForSubmission, validateEoi } from "./schema.mjs";
import { sheetOperation } from "./google-sheets.mjs";

const DOCUMENT_CATEGORIES = ["birth_certificate", "health_and_immunisation", "school_report", "sacramental", "residency"];
const MIME_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.oasis.opendocument.text", "image/png", "image/jpeg", "image/gif", "image/bmp", "image/heic", "image/heif"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function appError(status, code, message, details) {
  return Object.assign(new Error(message), { status, code, details });
}

function sha256(value) { return crypto.createHash("sha256").update(String(value), "utf8").digest("hex"); }
function hmac(secret, value) { return crypto.createHmac("sha256", secret).update(String(value), "utf8").digest("hex"); }
function token(bytes = 32) { return crypto.randomBytes(bytes).toString("base64url"); }
function code() { return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0"); }
function id(prefix) { return `${prefix}-${token(10)}`; }
function iso(now) { return new Date(now).toISOString(); }
function json(value) { return JSON.stringify(value ?? {}); }

function parseBody(event, maxBytes = 1_500_000) {
  const raw = event?.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event?.body || "{}";
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw appError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
    return parsed;
  } catch { throw appError(400, "INVALID_JSON", "The request body is not valid JSON."); }
}

function headers(event) { return Object.fromEntries(Object.entries(event?.headers || {}).map(([key, value]) => [key.toLowerCase(), value])); }
function path(event) { return event?.rawPath || event?.requestContext?.http?.path || event?.path || "/"; }
function method(event) { return String(event?.requestContext?.http?.method || event?.httpMethod || "GET").toUpperCase(); }
function sourceAddress(event) { return safeText(headers(event)["cloudfront-viewer-address"] || headers(event)["x-forwarded-for"]?.split(",")[0] || event?.requestContext?.http?.sourceIp || "unknown", 100); }

function signatureBytes(dataUrl) {
  const value = safeText(dataUrl, 900_000);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)) throw appError(422, "INVALID_SIGNATURE", "Provide a valid signature drawing.");
  const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  if (bytes.length < 100 || bytes.length > 500_000 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw appError(422, "INVALID_SIGNATURE", "The signature drawing is empty, invalid or too large.");
  return bytes;
}

function mapEoiRow(record) {
  const v = record.values;
  return { eoi_id: record.id, submitted_at: record.submittedAt, status: record.status, primary_contact_id: record.contactId, student_id: record.studentId, language: v.eoi_language, salutation: v.eoi_title, primary_contact_first_name: v.eoi_first, primary_contact_last_name: v.eoi_last, relationship: v.eoi_relationship, email: v.eoi_email, mobile_phone: v.eoi_mobile, contact_address: v.eoi_address, suburb: v.eoi_suburb, state: v.eoi_state, postcode: v.eoi_postcode, country: v.eoi_country, student_first_name: v.eoi_student_first, student_last_name: v.eoi_student_last, date_of_birth: v.eoi_dob, gender: v.eoi_gender, religion: v.eoi_religion, entry_year: v.eoi_year, entry_year_level: v.eoi_level, current_school: v.eoi_current_school, current_year_level: v.eoi_current_year, additional_needs: v.eoi_needs, need_categories: v.eoi_need_category, family_connection: v.eoi_family_connection, other_children: v.eoi_other_children, discovery_source: v.eoi_discovery, additional_information: v.eoi_information, snapshot_file_id: record.snapshotFileId, network_fingerprint: record.networkFingerprint, schema_version: SCHEMA_VERSION, reference: record.reference };
}

function mapApplicationRow(app) {
  return { application_id: app.id, invitation_id: app.invitationId, source_eoi_id: app.sourceEoiId, status: app.status, reference: app.reference, recipient_email: app.recipientEmail, student_id: app.studentId, student_first_name: app.values.student_first, student_last_name: app.values.student_last, created_at: app.createdAt, updated_at: app.updatedAt, submitted_at: app.submittedAt, completed_at: app.completedAt, revision: app.revision, required_signature_count: app.requiredSignatureCount || 0, completed_signature_count: app.signatures?.length || 0, snapshot_file_id: app.snapshotFileId, schema_version: SCHEMA_VERSION };
}

function studentRow(app, values) {
  const sacraments = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith("sacrament_")));
  return { application_id: app.id, student_id: app.studentId, first_name: values.student_first, middle_name: values.student_middle, last_name: values.student_last, preferred_name: values.student_preferred, date_of_birth: values.student_dob, gender: values.student_gender, religion: values.student_religion, religion_other: values.student_religion_other, current_year_level: values.current_level, entry_year: values.entry_year, entry_year_level: values.entry_level, current_school: values.current_school, current_school_other: values.current_school_other, share_address_with_guardians: values.student_address_share, care_arrangement: values.care_arrangement, care_arrangement_other: values.care_other, shared_parenting_schedule: values.shared_parenting, address: values.student_address, suburb: values.student_suburb, state: values.student_state, postcode: values.student_postcode, country: values.student_country, future_siblings: values.future_siblings, future_sibling_count: values.future_sibling_count, country_of_residence: values.residence_country, country_of_birth: values.birth_country, nationality: values.nationality, ethnicity: values.ethnicity, arrival_or_return_date: values.arrival_date, residency_status: values.residency_status, australian_citizen: values.australian_citizen, residency_evidence: values.residency_evidence, visa_subclass: values.visa_subclass, visa_expiry: values.visa_expiry, previous_visa_subclass: values.previous_visa, indigenous_status: values.indigenous_status, main_language: values.main_language, other_languages: values.other_languages, additional_needs: values.additional_needs, need_categories: values.need_categories, need_other: values.need_other, health_professionals: values.professional_categories, health_professional_other: values.professional_other, reports_attached: values.reports_attached, ndis_support: values.ndis_support, court_or_parenting_orders: values.court_orders, other_relevant_information: values.other_relevant_information, parish: values.parish, sacraments_json: sacraments, medical_conditions: values.medical_conditions, other_medical_condition: values.other_medical_condition, condition_details: values.condition_details, allergy_details: values.allergy_details, anaphylaxis_risk: values.anaphylaxis_risk, anaphylaxis_device: values.anaphylaxis_device, immunisation_status: values.immunisation, humanitarian_health_check: values.humanitarian_health, doctor_name: values.doctor_name, doctor_practice_address: values.doctor_address, doctor_phone: values.doctor_phone, medicare_number: values.medicare_number, medicare_expiry: values.medicare_expiry, private_health_insurance: values.private_insurance, ambulance_cover: values.ambulance_cover, health_care_card: values.healthcare_card, schema_version: SCHEMA_VERSION };
}

function guardianRow(app, guardian, index, signatureStatus = "pending") {
  return { application_id: app.id, guardian_id: app.guardianIds[index], position: index + 1, share_with_other_contacts: guardian.share, salutation: guardian.title, first_name: guardian.first, last_name: guardian.last, email: guardian.email, mobile_phone: guardian.mobile, home_phone: guardian.home, work_phone: guardian.work, relationship: guardian.relationship, contact_type: guardian.contact_type, marital_status: guardian.marital, religion: guardian.religion, sms_messaging: guardian.sms, health_care_card: guardian.healthcare, health_care_card_number: guardian.healthcare_number, health_care_card_expiry: guardian.healthcare_expiry, residential_address: guardian.address, suburb: guardian.suburb, state: guardian.state, postcode: guardian.postcode, country: guardian.country, postal_same_as_residential: guardian.postal_same, postal_address: guardian.postal_address, postal_suburb: guardian.postal_suburb, postal_state: guardian.postal_state, postal_postcode: guardian.postal_postcode, postal_country: guardian.postal_country, occupational_group: guardian.occupation_group, occupation: guardian.occupation, employer: guardian.employer, school_level_education: guardian.school_education, university_further_education: guardian.further_education, country_of_birth: guardian.birth_country, nationality: guardian.nationality, ethnicity: guardian.ethnicity, languages: guardian.languages, residency_status: guardian.residency, visa_subclass: guardian.visa_subclass, visa_expiry: guardian.visa_expiry, indigenous_status: guardian.indigenous, contact_permission: guardian.permission || "Yes", signature_required: index < app.requiredSignatureCount ? "Yes" : "No", signature_status: signatureStatus, schema_version: SCHEMA_VERSION };
}

function emergencyRow(app, contact, index) {
  return { application_id: app.id, emergency_contact_id: `${app.id}-emergency-${index + 1}`, position: index + 1, first_name: contact.first, last_name: contact.last, relationship: contact.relationship, mobile_phone: contact.mobile, home_phone: contact.home, work_phone: contact.work, email: contact.email, schema_version: SCHEMA_VERSION };
}

function conditionsRow(app, values) {
  const both = values.fee_option === "Both Parents / Guardian";
  const one = values.fee_option === "One Parent / Guardian";
  return { application_id: app.id, previous_school_permission: values.previous_school_permission, previous_school_name: values.previous_school_name, previous_school_address: values.previous_school_address, previous_school_interstate: values.previous_school_interstate, fee_option: values.fee_option, fee_account_recipient: both ? values.fee_both_nominee : one ? values.fee_one_nominee : "", guardian_a_name: values.fee_guardian_a, guardian_a_percentage: values.fee_guardian_a_percent, guardian_b_name: values.fee_guardian_b, guardian_b_percentage: values.fee_guardian_b_percent, fee_responsibility_date: values.fee_both_date || values.fee_one_date || values.fee_split_date, discovery_source: values.application_discovery, influence_factors: values.application_influences, schema_version: SCHEMA_VERSION };
}

function auditEvent({ workflow, recordId, type, at, actorType = "family", actorId = "", details = {}, stage = "", invitationId = "" }) {
  const eventId = id("evt");
  const common = { event_id: eventId, occurred_at: at, event_type: type, actor_type: actorType, actor_id: actorId, details_json: json(details), schema_version: SCHEMA_VERSION };
  if (workflow === "eoi") return sheetOperation("eoi", "EOI Audit", { ...common, eoi_id: recordId }, ["event_id"]);
  if (workflow === "application") return sheetOperation("application", "Application Audit", { ...common, application_id: recordId, invitation_id: invitationId, stage }, ["event_id"]);
  return sheetOperation("operations", "Audit", { ...common, workflow, record_id: recordId }, ["event_id"]);
}

function outbox(kind, payload, now) { return { id: id("out"), kind, payload, createdAt: iso(now) }; }
function emailOutbox(payload, now) { return outbox("email", payload, now); }
function sheetOutbox(operation, now) { return outbox("sheet", operation, now); }

function emailEvent({ messageType, workflow, recordId, recipientEmail, at }) {
  return sheetOperation("operations", "Email Events", { email_event_id: id("mail"), occurred_at: at, message_type: messageType, workflow, record_id: recordId, recipient_email: recipientEmail, delivery_status: "queued", schema_version: SCHEMA_VERSION }, ["email_event_id"]);
}

function prefillFromEoi(eoi) {
  if (!eoi) return {};
  const v = eoi.values;
  return {
    student_first: v.eoi_student_first, student_last: v.eoi_student_last, student_dob: v.eoi_dob, student_gender: v.eoi_gender,
    student_religion: v.eoi_religion, entry_year: v.eoi_year, entry_level: v.eoi_level, current_school: v.eoi_current_school,
    current_level: v.eoi_current_year, additional_needs: v.eoi_needs, need_categories: v.eoi_need_category,
    app_guardian_0_title: v.eoi_title, app_guardian_0_first: v.eoi_first, app_guardian_0_last: v.eoi_last,
    app_guardian_0_email: v.eoi_email, app_guardian_0_mobile: v.eoi_mobile, app_guardian_0_relationship: v.eoi_relationship,
    app_guardian_0_address: v.eoi_address, app_guardian_0_suburb: v.eoi_suburb, app_guardian_0_state: v.eoi_state,
    app_guardian_0_postcode: v.eoi_postcode, app_guardian_0_country: v.eoi_country
  };
}

export async function createApplicationInvitation({ store, recipientEmail, firstName = "", lastName = "", studentFirstName = "", studentLastName = "", sourceEoiId = "", createdBy = "staff-cli", applicationUrl, clock = () => Date.now() }) {
  const now = clock();
  const email = normalizeEmail(recipientEmail);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw appError(422, "INVALID_EMAIL", "Provide a valid recipient email.");
  const eoi = sourceEoiId ? await store.getEoi(sourceEoiId) : null;
  if (sourceEoiId && !eoi) throw appError(404, "EOI_NOT_FOUND", "The requested EOI was not found. No invitation was created.");
  if (eoi && eoi.values.eoi_email !== email) throw appError(409, "EOI_EMAIL_MISMATCH", "The invitation email must match the linked EOI email unless the EOI is corrected first.");
  const rawToken = token();
  const invitationId = id("invite");
  const applicationId = id("app");
  const contactId = eoi?.contactId || id("contact");
  const studentId = eoi?.studentId || id("student");
  const values = { ...prefillFromEoi(eoi) };
  if (!eoi) Object.assign(values, { app_guardian_0_first: firstName, app_guardian_0_last: lastName, app_guardian_0_email: email, student_first: studentFirstName, student_last: studentLastName });
  const createdAt = iso(now);
  const expiresAt = now + 30 * 86400_000;
  const invitation = { id: invitationId, applicationId, contactId, studentId, recipientEmail: email, sourceEoiId: sourceEoiId || "", status: "active", createdAt, expiresAt, firstSentAt: createdAt, lastSentAt: createdAt, sendCount: 1 };
  const application = { id: applicationId, invitationId, sourceEoiId: sourceEoiId || "", contactId, studentId, recipientEmail: email, status: "invited", revision: 0, values, guardianCount: 2, emergencyCount: 2, documents: {}, signatures: [], guardianIds: [id("guardian"), id("guardian")], createdAt, updatedAt: createdAt, schemaVersion: SCHEMA_VERSION };
  const invitationUrl = `${applicationUrl}${applicationUrl.includes("?") ? "&" : "?"}workflow=application&invite=${encodeURIComponent(rawToken)}`;
  const displayFirst = eoi?.values.eoi_first || firstName || "Parent/Guardian";
  const displayLast = eoi?.values.eoi_last || lastName || "";
  const studentFirst = eoi?.values.eoi_student_first || studentFirstName || "";
  const studentLast = eoi?.values.eoi_student_last || studentLastName || "";
  const studentName = [studentFirst, studentLast].filter(Boolean).join(" ");
  const message = applicationInvitation({ firstName: displayFirst, studentName, invitationUrl, expiresAt: new Date(expiresAt).toLocaleDateString("en-AU"), linked: Boolean(eoi) });
  const operations = [
    sheetOperation("operations", "Contacts", { contact_id: contactId, email, first_name: displayFirst, last_name: displayLast, mobile_phone: eoi?.values.eoi_mobile || "", source: eoi ? "eoi" : "direct_invitation", created_at: eoi?.submittedAt || createdAt, updated_at: createdAt, schema_version: SCHEMA_VERSION }, ["contact_id"]),
    sheetOperation("operations", "Students", { student_id: studentId, first_name: studentFirst, last_name: studentLast, date_of_birth: eoi?.values.eoi_dob || "", source: eoi ? "eoi" : "direct_invitation", created_at: eoi?.submittedAt || createdAt, updated_at: createdAt, schema_version: SCHEMA_VERSION }, ["student_id"]),
    sheetOperation("operations", "Application Invitations", { invitation_id: invitationId, application_id: applicationId, recipient_contact_id: contactId, recipient_email: email, student_id: studentId, source_eoi_id: sourceEoiId, status: "active", created_at: createdAt, expires_at: iso(expiresAt), first_sent_at: createdAt, last_sent_at: createdAt, send_count: 1, schema_version: SCHEMA_VERSION }, ["invitation_id"]),
    sheetOperation("operations", "Progress", { application_id: applicationId, current_stage: "gateway", status: "invited", revision: 0, last_activity_at: createdAt, percent_complete: 0, schema_version: SCHEMA_VERSION }, ["application_id"]),
    sheetOperation("application", "Applications", mapApplicationRow(application), ["application_id"]),
    auditEvent({ workflow: "operations", recordId: applicationId, type: eoi ? "application.invited_from_eoi" : "application.invited_directly", at: createdAt, actorType: "staff", actorId: createdBy, details: { invitationId, sourceEoiId: sourceEoiId || null } }),
    emailEvent({ messageType: "application_invitation", workflow: "application", recordId: applicationId, recipientEmail: email, at: createdAt })
  ];
  if (eoi) operations.push(sheetOperation("operations", "Workflow Links", { link_id: id("link"), source_workflow: "eoi", source_record_id: sourceEoiId, target_workflow: "application", target_record_id: applicationId, linked_by: createdBy, linked_at: createdAt, prefill_fields_json: Object.keys(values), schema_version: SCHEMA_VERSION }, ["link_id"]));
  await store.createInvitation({ invitation, tokenHash: sha256(rawToken), application, outboxEvents: [emailOutbox({ to: email, ...message, tags: { workflow: "application", message_type: "invitation" } }, now), ...operations.map(operation => sheetOutbox(operation, now))] });
  return { applicationId, invitationId, invitationUrl, sourceEoiId: sourceEoiId || null, recipientEmail: email };
}

export function createService({ store, drive, sheets, mailer, env, clock = () => Date.now() }) {
  const allowedOrigins = String(env.ALLOWED_ORIGINS || "https://ffe.org.au").split(",").map(value => value.trim()).filter(Boolean);
  const otpSecret = env.OTP_HMAC_SECRET;
  const networkSecret = env.NETWORK_HMAC_SECRET;
  const signingPageUrl = env.APPLICATION_SIGNING_PAGE_URL;
  if (!otpSecret || !networkSecret) throw new Error("OTP_HMAC_SECRET and NETWORK_HMAC_SECRET are required.");

  function response(statusCode, payload, origin) {
    return { statusCode, headers: { "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0], "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS", "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json; charset=utf-8", "Pragma": "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" }, body: JSON.stringify(payload) };
  }

  function networkFingerprint(event) { return hmac(networkSecret, sourceAddress(event)); }
  function nowIso() { return iso(clock()); }

  async function enqueueSheet(operation) { await store.enqueue(sheetOutbox(operation, clock())); }
  async function enqueueEmail(payload) { await store.enqueue(emailOutbox(payload, clock())); }

  async function requireSession(event, scope = "application") {
    const raw = safeText(headers(event).authorization, 1000).replace(/^Bearer\s+/i, "");
    if (!raw) throw appError(401, "SESSION_REQUIRED", "Verify your email address to continue.");
    const session = await store.getSession(sha256(raw));
    if (!session || session.scope !== scope || session.expiresAt <= clock()) throw appError(401, "SESSION_EXPIRED", "Your secure session has expired. Verify your email address again.");
    return session;
  }

  async function submitEoi(event) {
    const values = validateEoi(parseBody(event).values);
    const now = clock();
    const submittedAt = iso(now);
    const eoiId = id("eoi");
    const contactId = id("contact");
    const studentId = id("student");
    const reference = `EOI-${new Date(now).getFullYear()}-${token(5).toUpperCase()}`;
    const record = { id: eoiId, reference, status: "submitted", contactId, studentId, values, submittedAt, networkFingerprint: networkFingerprint(event), schemaVersion: SCHEMA_VERSION };
    const snapshot = await drive.storeEoiSnapshot({ eoiId, snapshot: record });
    record.snapshotFileId = snapshot.id;
    const message = eoiAcknowledgement({ firstName: values.eoi_first, studentName: `${values.eoi_student_first} ${values.eoi_student_last}`, reference });
    const operations = [
      sheetOperation("eoi", "EOIs", mapEoiRow(record), ["eoi_id"]),
      auditEvent({ workflow: "eoi", recordId: eoiId, type: "eoi.submitted", at: submittedAt, actorId: contactId }),
      sheetOperation("operations", "Contacts", { contact_id: contactId, email: values.eoi_email, first_name: values.eoi_first, last_name: values.eoi_last, mobile_phone: values.eoi_mobile, source: "eoi", created_at: submittedAt, updated_at: submittedAt, schema_version: SCHEMA_VERSION }, ["contact_id"]),
      sheetOperation("operations", "Students", { student_id: studentId, first_name: values.eoi_student_first, last_name: values.eoi_student_last, date_of_birth: values.eoi_dob, source: "eoi", created_at: submittedAt, updated_at: submittedAt, schema_version: SCHEMA_VERSION }, ["student_id"]),
      auditEvent({ workflow: "operations", recordId: eoiId, type: "eoi.contact_registered", at: submittedAt, actorId: contactId }),
      emailEvent({ messageType: "eoi_acknowledgement", workflow: "eoi", recordId: eoiId, recipientEmail: values.eoi_email, at: submittedAt })
    ];
    await store.createEoi(record, [emailOutbox({ to: values.eoi_email, ...message, tags: { workflow: "eoi", message_type: "acknowledgement" } }, now), ...operations.map(operation => sheetOutbox(operation, now))]);
    await dispatchOutbox(20);
    return { eoiId, reference, status: "submitted" };
  }

  async function requestApplicationCode(event) {
    const body = parseBody(event, 20_000);
    const rawInvite = safeText(body.invitationToken, 1000);
    const email = normalizeEmail(body.email);
    const inviteHash = sha256(rawInvite);
    const invitation = await store.getInvitation(inviteHash);
    const fingerprint = networkFingerprint(event);
    for (const [key, limit, seconds] of [[`otp-cooldown:${inviteHash}:${sha256(email)}`, 1, 30], [`otp-invite:${inviteHash}`, 5, 1800], [`otp-email:${sha256(email)}`, 5, 1800], [`otp-network:${fingerprint}`, 10, 1800]]) {
      if (!await store.checkRateLimit(key, limit, seconds)) throw appError(429, "OTP_RATE_LIMIT", "Please wait before requesting another verification code.");
    }
    const valid = invitation && invitation.status === "active" && invitation.expiresAt > clock() && invitation.recipientEmail === email;
    const challengeId = id("challenge");
    if (valid) {
      const verificationCode = code();
      const challenge = { id: challengeId, purpose: "application_access", subjectHash: inviteHash, email, applicationId: invitation.applicationId, invitationId: invitation.id, codeHmac: hmac(otpSecret, `${challengeId}:${verificationCode}`), attempts: 0, maxAttempts: 5, createdAt: clock(), expiresAt: clock() + 600_000, ttl: Math.floor((clock() + 86400_000) / 1000) };
      await store.putChallenge(challenge);
      const sent = await mailer.send({ to: email, ...applicationOtp({ code: verificationCode }), tags: { workflow: "application", message_type: "otp" } });
      await enqueueSheet(sheetOperation("operations", "Email Events", { email_event_id: id("mail"), occurred_at: nowIso(), message_type: "application_otp", workflow: "application", record_id: invitation.applicationId, recipient_email: email, ses_message_id: sent.messageId, delivery_status: "sent_to_ses", schema_version: SCHEMA_VERSION }, ["email_event_id"]));
    }
    return { challengeId, expiresInSeconds: 600, resendAfterSeconds: 30, message: "If the invitation and email address match, a verification code has been sent." };
  }

  async function verifyApplicationCode(event) {
    const body = parseBody(event, 20_000);
    const rawInvite = safeText(body.invitationToken, 1000);
    const inviteHash = sha256(rawInvite);
    const challengeId = safeText(body.challengeId, 200);
    const challenge = await store.getChallenge(challengeId);
    const invitation = await store.getInvitation(inviteHash);
    if (!challenge || challenge.subjectHash !== inviteHash || challenge.purpose !== "application_access" || !invitation || invitation.status !== "active" || invitation.expiresAt <= clock()) throw appError(401, "OTP_INVALID", "The code is invalid or expired. Request a new code.");
    const consumed = await store.consumeChallenge(challengeId, hmac(otpSecret, `${challengeId}:${safeText(body.code, 12)}`), clock());
    if (!consumed) { await store.failChallenge(challengeId); throw appError(401, "OTP_INVALID", "The code is invalid or expired. Request a new code."); }
    const rawSession = token();
    await store.putSession({ tokenHash: sha256(rawSession), scope: "application", applicationId: invitation.applicationId, invitationId: invitation.id, email: challenge.email, createdAt: clock(), expiresAt: clock() + 30 * 60_000, ttl: Math.floor((clock() + 86400_000) / 1000) });
    const app = await store.getApplication(invitation.applicationId);
    await enqueueSheet(auditEvent({ workflow: "application", recordId: app.id, invitationId: invitation.id, type: "application.email_verified", at: nowIso(), actorId: app.contactId, stage: "gateway" }));
    return { sessionToken: rawSession, expiresInSeconds: 1800, context: applicationContext(app) };
  }

  function applicationContext(app) {
    return { applicationId: app.id, invitationId: app.invitationId, sourceEoiId: app.sourceEoiId || null, recipientEmail: app.recipientEmail, status: app.status, revision: app.revision, values: app.values || {}, guardianCount: app.guardianCount || 1, emergencyCount: app.emergencyCount || 2, documents: Object.values(app.documents || {}).flat().map(document => ({ category: document.category, documentId: document.documentId, fileName: document.fileName, size: document.size })), studentName: [app.values.student_first, app.values.student_last].filter(Boolean).join(" "), updatedAt: app.updatedAt };
  }

  async function getContext(event) {
    const session = await requireSession(event);
    const app = await store.getApplication(session.applicationId);
    if (!app) throw appError(404, "APPLICATION_NOT_FOUND", "The application was not found.");
    return applicationContext(app);
  }

  async function saveDraft(event) {
    const session = await requireSession(event);
    const body = parseBody(event);
    const values = sanitizeApplication(body.values);
    const guardianCount = Math.max(1, Math.min(6, Number(body.guardianCount || 1)));
    const emergencyCount = Math.max(2, Math.min(6, Number(body.emergencyCount || 2)));
    const savedAt = nowIso();
    const nextRevision = Number(body.expectedRevision) + 1;
    const operations = [
      sheetOperation("operations", "Progress", { application_id: session.applicationId, current_stage: safeText(body.stage, 80), status: "in_progress", revision: nextRevision, last_saved_at: savedAt, last_activity_at: savedAt, percent_complete: Math.max(0, Math.min(100, Number(body.percentComplete || 0))), schema_version: SCHEMA_VERSION }, ["application_id"]),
      auditEvent({ workflow: "application", recordId: session.applicationId, invitationId: session.invitationId, type: "application.draft_saved", at: savedAt, actorId: session.email, stage: safeText(body.stage, 80), details: { revision: nextRevision } })
    ];
    const app = await store.saveDraft({ applicationId: session.applicationId, expectedRevision: body.expectedRevision, values, screen: Number(body.screen || 0), guardianCount, emergencyCount, savedAt, outboxEvents: operations.map(operation => sheetOutbox(operation, clock())) });
    return applicationContext(app);
  }

  async function startUpload(event) {
    const session = await requireSession(event);
    const body = parseBody(event, 20_000);
    const category = safeText(body.category, 80);
    const mimeType = safeText(body.mimeType, 160).toLowerCase();
    const size = Number(body.size);
    if (!DOCUMENT_CATEGORIES.includes(category) || !MIME_TYPES.has(mimeType) || !Number.isInteger(size) || size < 1 || size > MAX_FILE_BYTES) throw appError(422, "INVALID_DOCUMENT", "This file type, document category or file size is not accepted.");
    return drive.createUploadSession({ applicationId: session.applicationId, category, fileName: safeText(body.fileName, 220), mimeType, size });
  }

  async function confirmUpload(event) {
    const session = await requireSession(event);
    const body = parseBody(event, 20_000);
    const category = safeText(body.category, 80);
    const document = await drive.confirmUpload({ applicationId: session.applicationId, category, documentId: safeText(body.documentId, 300) });
    document.id = id("doc");
    document.malwareScanStatus = "not_scanned";
    await store.attachDocument(session.applicationId, document);
    await enqueueSheet(auditEvent({ workflow: "application", recordId: session.applicationId, invitationId: session.invitationId, type: "application.document_uploaded", at: nowIso(), actorId: session.email, stage: "documents", details: { category, documentId: document.documentId } }));
    return { document };
  }

  async function submitApplication(event) {
    const session = await requireSession(event);
    const body = parseBody(event);
    const app = await store.getApplication(session.applicationId);
    if (!app || !["invited", "in_progress"].includes(app.status)) throw appError(409, "APPLICATION_NOT_EDITABLE", "This application is no longer editable.");
    if (Number(body.expectedRevision) !== Number(app.revision)) throw appError(409, "REVISION_CONFLICT", "The application changed after review. Review the latest saved version before signing.");
    const guardianCount = Math.max(1, Math.min(6, Number(app.guardianCount || 1)));
    const values = validateApplicationForSubmission(app.values, guardianCount, app.emergencyCount || 2);
    if (!(app.documents?.birth_certificate || []).length) throw appError(422, "DOCUMENT_REQUIRED", "Upload the student's birth certificate before submitting.", { missing: ["birth_certificate"] });
    const bytes = signatureBytes(body.signatureDataUrl);
    const primaryGuardianId = app.guardianIds[0];
    const revisionHash = sha256(json({ values, documents: app.documents, revision: app.revision }));
    const snapshotPayload = { applicationId: app.id, invitationId: app.invitationId, sourceEoiId: app.sourceEoiId || null, revision: app.revision, revisionHash, values, documents: app.documents, submittedAt: nowIso(), schemaVersion: SCHEMA_VERSION };
    const [snapshot, signatureFile] = await Promise.all([drive.storeApplicationSnapshot({ applicationId: app.id, revision: app.revision, snapshot: snapshotPayload }), drive.storeSignature({ applicationId: app.id, guardianId: primaryGuardianId, data: bytes })]);
    const signedAt = nowIso();
    const primarySignature = { id: id("sig"), guardianId: primaryGuardianId, signerName: `${values.app_guardian_0_first} ${values.app_guardian_0_last}`.trim(), signerEmail: normalizeEmail(values.app_guardian_0_email), signedAt, revision: app.revision, revisionHash, fileId: signatureFile.id, networkFingerprint: networkFingerprint(event), ipAcknowledged: values.application_signature_ip, termsAcknowledged: values.application_signature_terms };
    const signatureTasks = [];
    const taskEmails = [];
    for (let index = 1; index < guardianCount; index += 1) {
      const guardianId = app.guardianIds[index] || id("guardian");
      app.guardianIds[index] = guardianId;
      const email = normalizeEmail(values[`app_guardian_${index}_email`]);
      if (!email || values[`app_guardian_${index}_permission`] === "No, do not contact them") continue;
      const rawTask = token();
      const task = { tokenHash: sha256(rawTask), applicationId: app.id, guardianId, guardianIndex: index, email, status: "invited", revision: app.revision, revisionHash, createdAt: clock(), expiresAt: clock() + 14 * 86400_000, ttl: Math.floor((clock() + 30 * 86400_000) / 1000) };
      signatureTasks.push(task);
      const signingUrl = `${signingPageUrl}?task=${encodeURIComponent(rawTask)}`;
      taskEmails.push({ to: email, ...signatureInvitation({ firstName: values[`app_guardian_${index}_first`], studentName: `${values.student_first} ${values.student_last}`, signingUrl }), tags: { workflow: "application", message_type: "signature_invitation" } });
    }
    const requiredSignatureCount = guardianCount;
    const status = requiredSignatureCount > 1 ? "pending_signatures" : "submitted";
    const reference = `APP-${new Date(clock()).getFullYear()}-${token(5).toUpperCase()}`;
    const next = { ...app, values, status, reference, requiredSignatureCount, signatures: [primarySignature], snapshotFileId: snapshot.id, revisionHash, submittedAt: signedAt, completedAt: status === "submitted" ? signedAt : "", updatedAt: signedAt };
    const { guardians, emergencyContacts } = splitApplication(values, app.id, guardianCount, app.emergencyCount || 2);
    const invitation = await store.getInvitationById(app.invitationId);
    const operations = [
      sheetOperation("application", "Applications", mapApplicationRow(next), ["application_id"]),
      sheetOperation("application", "Student", studentRow(next, values), ["application_id"]),
      ...guardians.map((guardian, index) => sheetOperation("application", "Guardians", guardianRow(next, guardian, index, index === 0 ? "signed" : "pending"), ["application_id", "guardian_id"])),
      ...emergencyContacts.map((contact, index) => sheetOperation("application", "Emergency Contacts", emergencyRow(next, contact, index), ["application_id", "emergency_contact_id"])),
      sheetOperation("application", "Conditions", conditionsRow(next, values), ["application_id"]),
      sheetOperation("application", "Signatures", { application_id: app.id, signature_id: primarySignature.id, guardian_id: primaryGuardianId, signer_name: primarySignature.signerName, signer_email: primarySignature.signerEmail, signature_status: "signed", signed_at: signedAt, revision: app.revision, revision_hash: revisionHash, signature_file_id: signatureFile.id, network_fingerprint: primarySignature.networkFingerprint, ip_recording_acknowledged: values.application_signature_ip, application_terms_acknowledged: values.application_signature_terms, one_signature_explanation: values.application_one_signature_reason, additional_information: values.application_additional_information, schema_version: SCHEMA_VERSION }, ["signature_id"]),
      ...Object.values(app.documents || {}).flat().map(document => sheetOperation("application", "Documents", { application_id: app.id, document_id: document.id, category: document.category, original_file_name: document.fileName, mime_type: document.mimeType, size_bytes: document.size, drive_file_id: document.documentId, uploaded_at: document.uploadedAt, sha256: document.checksum, malware_scan_status: document.malwareScanStatus, schema_version: SCHEMA_VERSION }, ["document_id"])),
      auditEvent({ workflow: "application", recordId: app.id, invitationId: app.invitationId, type: "application.submitted", at: signedAt, actorId: session.email, stage: "signature", details: { reference, status, revision: app.revision } }),
      sheetOperation("operations", "Progress", { application_id: app.id, current_stage: status === "submitted" ? "complete" : "guardian_signatures", status, revision: app.revision, last_saved_at: app.updatedAt, last_activity_at: signedAt, percent_complete: status === "submitted" ? 100 : 95, schema_version: SCHEMA_VERSION }, ["application_id"]),
      sheetOperation("operations", "Application Invitations", { invitation_id: app.invitationId, application_id: app.id, recipient_contact_id: app.contactId, recipient_email: app.recipientEmail, student_id: app.studentId, source_eoi_id: app.sourceEoiId, status, created_at: app.createdAt, expires_at: invitation?.expiresAt ? iso(invitation.expiresAt) : "", first_sent_at: invitation?.firstSentAt || "", last_sent_at: invitation?.lastSentAt || "", send_count: invitation?.sendCount || 1, opened_at: invitation?.openedAt || "", verified_at: invitation?.verifiedAt || "", submitted_at: signedAt, schema_version: SCHEMA_VERSION }, ["invitation_id"]),
      emailEvent({ messageType: "application_submitted", workflow: "application", recordId: app.id, recipientEmail: app.recipientEmail, at: signedAt }),
      ...taskEmails.map(mail => emailEvent({ messageType: "signature_invitation", workflow: "application", recordId: app.id, recipientEmail: mail.to, at: signedAt }))
    ];
    const confirmation = applicationSubmitted({ firstName: values.app_guardian_0_first, studentName: `${values.student_first} ${values.student_last}`, reference, pendingSignatures: status === "pending_signatures" });
    const emailEvents = [emailOutbox({ to: app.recipientEmail, ...confirmation, tags: { workflow: "application", message_type: "submitted" } }, clock()), ...taskEmails.map(mail => emailOutbox(mail, clock()))];
    await store.submitApplication({ applicationId: app.id, expectedRevision: app.revision, application: next, signatureTasks, outboxEvents: [...emailEvents, ...operations.map(operation => sheetOutbox(operation, clock()))] });
    await dispatchOutbox(50);
    return { applicationId: app.id, reference, status };
  }

  async function requestSignatureCode(event) {
    const body = parseBody(event, 20_000);
    const rawTask = safeText(body.taskToken, 1000);
    const taskHash = sha256(rawTask);
    const email = normalizeEmail(body.email);
    const task = await store.getSignatureTask(taskHash);
    for (const [key, limit, seconds] of [[`sign-cooldown:${taskHash}:${sha256(email)}`, 1, 30], [`sign-task:${taskHash}`, 5, 1800], [`sign-email:${sha256(email)}`, 5, 1800]]) if (!await store.checkRateLimit(key, limit, seconds)) throw appError(429, "OTP_RATE_LIMIT", "Please wait before requesting another verification code.");
    const valid = task && task.status === "invited" && task.expiresAt > clock() && task.email === email;
    const challengeId = id("challenge");
    if (valid) {
      const verificationCode = code();
      await store.putChallenge({ id: challengeId, purpose: "application_signature", subjectHash: taskHash, email, applicationId: task.applicationId, guardianId: task.guardianId, codeHmac: hmac(otpSecret, `${challengeId}:${verificationCode}`), attempts: 0, maxAttempts: 5, createdAt: clock(), expiresAt: clock() + 600_000, ttl: Math.floor((clock() + 86400_000) / 1000) });
      await mailer.send({ to: email, ...signatureOtp({ code: verificationCode }), tags: { workflow: "application", message_type: "signature_otp" } });
    }
    return { challengeId, expiresInSeconds: 600, resendAfterSeconds: 30, message: "If the signing request and email address match, a verification code has been sent." };
  }

  async function verifySignatureCode(event) {
    const body = parseBody(event, 20_000);
    const taskHash = sha256(safeText(body.taskToken, 1000));
    const challengeId = safeText(body.challengeId, 200);
    const challenge = await store.getChallenge(challengeId);
    const task = await store.getSignatureTask(taskHash);
    if (!challenge || challenge.purpose !== "application_signature" || challenge.subjectHash !== taskHash || !task || task.status !== "invited" || task.expiresAt <= clock()) throw appError(401, "OTP_INVALID", "The code is invalid or expired. Request a new code.");
    const consumed = await store.consumeChallenge(challengeId, hmac(otpSecret, `${challengeId}:${safeText(body.code, 12)}`), clock());
    if (!consumed) { await store.failChallenge(challengeId); throw appError(401, "OTP_INVALID", "The code is invalid or expired. Request a new code."); }
    const rawSession = token();
    await store.putSession({ tokenHash: sha256(rawSession), scope: "application_signature", applicationId: task.applicationId, taskTokenHash: taskHash, guardianId: task.guardianId, guardianIndex: task.guardianIndex, email: task.email, createdAt: clock(), expiresAt: clock() + 30 * 60_000, ttl: Math.floor((clock() + 86400_000) / 1000) });
    return { sessionToken: rawSession, expiresInSeconds: 1800, context: await signatureContext(task) };
  }

  async function signatureContext(task) {
    const app = await store.getApplication(task.applicationId);
    const index = task.guardianIndex;
    return { applicationId: app.id, reference: app.reference, revision: app.revision, studentName: `${app.values.student_first} ${app.values.student_last}`, signerName: `${app.values[`app_guardian_${index}_first`]} ${app.values[`app_guardian_${index}_last`]}`.trim(), signerEmail: task.email, declarations: { ip: "I acknowledge that my network address will be recorded securely for administrative, security and legal compliance purposes.", terms: "I have reviewed the Application for Enrolment and declare that I have read, understood and consented to the matters it contains." }, review: { student: studentRow(app, app.values), conditions: conditionsRow(app, app.values) } };
  }

  async function submitSignature(event) {
    const session = await requireSession(event, "application_signature");
    const body = parseBody(event);
    if (!truthy(body.reviewAcknowledged)) throw appError(422, "REVIEW_REQUIRED", "Confirm that you reviewed the submitted application before signing.");
    if (!truthy(body.ipAcknowledged) || !truthy(body.termsAcknowledged)) throw appError(422, "DECLARATION_REQUIRED", "Acknowledge both declarations before signing.");
    const app = await store.getApplication(session.applicationId);
    const task = await store.getSignatureTask(session.taskTokenHash);
    if (!app || app.status !== "pending_signatures" || !task || task.status !== "invited" || task.revisionHash !== app.revisionHash) throw appError(409, "SIGNATURE_TASK_UNAVAILABLE", "This signing request is no longer available.");
    const bytes = signatureBytes(body.signatureDataUrl);
    const signatureFile = await drive.storeSignature({ applicationId: app.id, guardianId: session.guardianId, data: bytes });
    const signedAt = nowIso();
    const signature = { id: id("sig"), guardianId: session.guardianId, signerName: `${app.values[`app_guardian_${session.guardianIndex}_first`]} ${app.values[`app_guardian_${session.guardianIndex}_last`]}`.trim(), signerEmail: session.email, signedAt, revision: app.revision, revisionHash: app.revisionHash, fileId: signatureFile.id, networkFingerprint: networkFingerprint(event), reviewAcknowledged: true, ipAcknowledged: true, termsAcknowledged: true };
    const signatures = [...(app.signatures || []), signature];
    const status = signatures.length >= app.requiredSignatureCount ? "submitted" : "pending_signatures";
    const next = { ...app, signatures, status, completedAt: status === "submitted" ? signedAt : "", updatedAt: signedAt };
    const operations = [
      sheetOperation("application", "Applications", mapApplicationRow(next), ["application_id"]),
      sheetOperation("application", "Guardians", guardianRow(next, splitApplication(app.values, app.id, app.guardianCount, app.emergencyCount || 2).guardians[session.guardianIndex], session.guardianIndex, "signed"), ["application_id", "guardian_id"]),
      sheetOperation("application", "Signatures", { application_id: app.id, signature_id: signature.id, guardian_id: signature.guardianId, signer_name: signature.signerName, signer_email: signature.signerEmail, signature_status: "signed", signed_at: signedAt, revision: app.revision, revision_hash: app.revisionHash, signature_file_id: signature.fileId, network_fingerprint: signature.networkFingerprint, ip_recording_acknowledged: "Confirmed", application_terms_acknowledged: "Confirmed", schema_version: SCHEMA_VERSION }, ["signature_id"]),
      auditEvent({ workflow: "application", recordId: app.id, invitationId: app.invitationId, type: "application.guardian_signed", at: signedAt, actorId: session.email, stage: "guardian_signature", details: { guardianId: session.guardianId, reviewAcknowledged: true, status } }),
      sheetOperation("operations", "Progress", { application_id: app.id, current_stage: status === "submitted" ? "complete" : "guardian_signatures", status, revision: app.revision, last_saved_at: app.updatedAt, last_activity_at: signedAt, percent_complete: status === "submitted" ? 100 : 95, schema_version: SCHEMA_VERSION }, ["application_id"])
    ];
    const emails = [];
    if (status === "submitted") {
      for (let index = 0; index < app.guardianCount; index += 1) {
        const to = normalizeEmail(app.values[`app_guardian_${index}_email`]);
        if (to) emails.push(emailOutbox({ to, ...applicationComplete({ firstName: app.values[`app_guardian_${index}_first`], studentName: `${app.values.student_first} ${app.values.student_last}`, reference: app.reference }), tags: { workflow: "application", message_type: "complete" } }, clock()));
      }
    }
    await store.completeSignature({ applicationId: app.id, taskTokenHash: session.taskTokenHash, application: next, outboxEvents: [...emails, ...operations.map(operation => sheetOutbox(operation, clock()))] });
    await dispatchOutbox(50);
    return { applicationId: app.id, reference: app.reference, status };
  }

  async function dispatchOutbox(limit = 25) {
    const items = await store.listOutbox(limit);
    let completed = 0;
    for (const item of items) {
      const claimed = await store.claimOutbox(item, clock());
      if (!claimed) continue;
      try {
        const result = item.data.kind === "email" ? await mailer.send(item.data.payload) : await sheets.apply(item.data.payload);
        await store.completeOutbox(item, result || { completed: true });
        completed += 1;
      } catch (error) {
        await store.releaseOutbox(item).catch(() => {});
        console.error("Rosewood outbox delivery failed", { id: item.data.id, kind: item.data.kind, message: error.message });
      }
    }
    return { examined: items.length, completed };
  }

  const routes = new Map([
    ["GET /v6/health", async () => ({ status: "ok", schemaVersion: SCHEMA_VERSION })],
    ["POST /v6/eoi", submitEoi],
    ["POST /v6/application/access/request-code", requestApplicationCode],
    ["POST /v6/application/access/verify-code", verifyApplicationCode],
    ["GET /v6/application/context", getContext],
    ["PUT /v6/application/draft", saveDraft],
    ["POST /v6/application/documents/start", startUpload],
    ["POST /v6/application/documents/confirm", confirmUpload],
    ["POST /v6/application/submit", submitApplication],
    ["POST /v6/application/signatures/request-code", requestSignatureCode],
    ["POST /v6/application/signatures/verify-code", verifySignatureCode],
    ["POST /v6/application/signatures/submit", submitSignature]
  ]);

  async function handler(event) {
    const origin = headers(event).origin || allowedOrigins[0];
    if (event?.source === "aws.events") return dispatchOutbox(50);
    if (method(event) === "OPTIONS") return response(204, {}, origin);
    try {
      if (!allowedOrigins.includes(origin)) throw appError(403, "ORIGIN_NOT_ALLOWED", "This request origin is not permitted.");
      const route = routes.get(`${method(event)} ${path(event)}`);
      if (!route) throw appError(404, "NOT_FOUND", "The requested endpoint does not exist.");
      return response(200, await route(event), origin);
    } catch (error) {
      console.error("Rosewood request failed", { path: path(event), code: error.code, message: error.message });
      return response(error.status || 500, { error: error.code || "INTERNAL_ERROR", message: error.status ? error.message : "The service could not complete this request.", ...(error.details ? { details: error.details } : {}) }, origin);
    }
  }

  handler.dispatchOutbox = dispatchOutbox;
  return handler;
}
