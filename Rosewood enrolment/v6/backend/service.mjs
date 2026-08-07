import crypto from "node:crypto";
import { applicationComplete, applicationInvitation, applicationOtp, applicationSubmitted, eoiAcknowledgement, signatureInvitation, signatureOtp, staffOtp } from "./email-templates.mjs";
import { currentFormDefinition, FORM_DEFINITIONS, getFormDefinition, recordFormReference } from "./form-definitions.mjs";
import { SCHEMA_VERSION, normalizeEmail, safeText, sanitizeApplication, splitApplication, truthy, validateApplicationForSubmission, validateEoi } from "./schema.mjs";
import { sheetOperation } from "./google-sheets.mjs";

const DOCUMENT_CATEGORIES = ["birth_certificate", "health_and_immunisation", "school_report", "sacramental", "residency"];
const MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const INVITATION_LIFETIME_MS = 14 * 86400_000;
const MAX_FAMILY_APPLICATIONS = 8;
const APPLICATION_SESSION_IDLE_MS = 20 * 60_000;
const APPLICATION_SESSION_ABSOLUTE_MS = 8 * 60 * 60_000;
const APPLICATION_VALIDATORS = new Map(Object.keys(FORM_DEFINITIONS.application).map(formVersion => [formVersion, { sanitize: sanitizeApplication, validate: validateApplicationForSubmission }]));
const EOI_VALIDATORS = new Map(Object.keys(FORM_DEFINITIONS.eoi).map(formVersion => [formVersion, validateEoi]));

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
function invitationDate(value) { return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Melbourne" }); }

function projectionVersion(record, workflow) {
  const reference = recordFormReference(record, workflow);
  return { schema_version: reference.schemaVersion || SCHEMA_VERSION, form_version: reference.formVersion, form_definition_hash: reference.formDefinitionHash };
}

async function ensureDefinition(store, workflow, formVersion) {
  const definition = getFormDefinition(workflow, formVersion);
  if (!definition) throw appError(409, "FORM_VERSION_UNSUPPORTED", "This form version is not available. Contact Rosewood College before continuing.");
  if (store.ensureFormDefinition) await store.ensureFormDefinition(definition);
  return definition;
}

function requireRecordDefinition(record, workflow, request = {}) {
  const reference = recordFormReference(record, workflow);
  const definition = getFormDefinition(workflow, reference.formVersion);
  if (!definition) throw appError(409, "FORM_VERSION_UNSUPPORTED", "This form version is not available. Contact Rosewood College before continuing.", { formVersion: reference.formVersion });
  if (reference.formDefinitionHash && reference.formDefinitionHash !== definition.definitionHash) throw appError(409, "FORM_DEFINITION_MISMATCH", "The saved form contract does not match this release. No information was changed.");
  if (request.formVersion && request.formVersion !== reference.formVersion) throw appError(409, "FORM_VERSION_MISMATCH", "The form changed before this save. Refresh the application and review the saved information.");
  if (request.formDefinitionHash && request.formDefinitionHash !== definition.definitionHash) throw appError(409, "FORM_DEFINITION_MISMATCH", "The form contract changed before this save. Refresh the application and review the saved information.");
  return definition;
}

function applicationValidator(definition) {
  const validator = APPLICATION_VALIDATORS.get(definition.formVersion);
  if (!validator) throw appError(409, "FORM_VALIDATOR_UNAVAILABLE", "This saved form version cannot be processed by the current service. No information was changed.");
  return validator;
}

function changedFields(previous = {}, next = {}) {
  return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter(key => JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
    .sort();
}

function applicationRevision(app, { kind, values = app.values || {}, savedAt = app.updatedAt || app.createdAt, saveMode = "", changed = [] } = {}) {
  const reference = recordFormReference(app, "application");
  return {
    applicationId: app.id,
    revision: Number(app.revision || 0),
    kind,
    status: app.status || "invited",
    screen: Number(app.screen || 0),
    stage: app.currentStage || "gateway",
    percentComplete: Number(app.percentComplete || 0),
    guardianCount: Number(app.guardianCount || 1),
    emergencyCount: Number(app.emergencyCount || 2),
    savedAt,
    saveMode,
    changedFields: changed,
    values,
    ...reference
  };
}

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

export function mapEoiRow(record) {
  const v = record.values;
  return { eoi_id: record.id, submitted_at: record.submittedAt, status: record.status, primary_contact_id: record.contactId, student_id: record.studentId, language: v.eoi_language, salutation: v.eoi_title, primary_contact_first_name: v.eoi_first, primary_contact_last_name: v.eoi_last, relationship: v.eoi_relationship, email: v.eoi_email, mobile_phone: v.eoi_mobile, contact_address: v.eoi_address, suburb: v.eoi_suburb, state: v.eoi_state, postcode: v.eoi_postcode, country: v.eoi_country, student_first_name: v.eoi_student_first, student_last_name: v.eoi_student_last, date_of_birth: v.eoi_dob, gender: v.eoi_gender, religion: v.eoi_religion, entry_year: v.eoi_year, entry_year_level: v.eoi_level, current_school: v.eoi_current_school, current_year_level: v.eoi_current_year, additional_needs: v.eoi_needs, need_categories: v.eoi_need_category, family_connection: v.eoi_family_connection, other_children: v.eoi_other_children, discovery_source: v.eoi_discovery, additional_information: v.eoi_information, snapshot_file_id: record.snapshotFileId, network_fingerprint: record.networkFingerprint, reference: record.reference, ...projectionVersion(record, "eoi") };
}

export function mapApplicationRow(app) {
  return { application_id: app.id, invitation_id: app.invitationId, source_eoi_id: app.sourceEoiId, status: app.status, reference: app.reference, recipient_email: app.recipientEmail, student_id: app.studentId, student_first_name: app.values.student_first, student_last_name: app.values.student_last, created_at: app.createdAt, updated_at: app.updatedAt, submitted_at: app.submittedAt, completed_at: app.completedAt, revision: app.revision, required_signature_count: app.requiredSignatureCount || 0, completed_signature_count: app.signatures?.length || 0, snapshot_file_id: app.snapshotFileId, ...projectionVersion(app, "application") };
}

export function studentRow(app, values) {
  const sacraments = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith("sacrament_")));
  return { application_id: app.id, student_id: app.studentId, first_name: values.student_first, middle_name: values.student_middle, last_name: values.student_last, preferred_name: values.student_preferred, date_of_birth: values.student_dob, gender: values.student_gender, religion: values.student_religion, religion_other: values.student_religion_other, current_year_level: values.current_level, entry_year: values.entry_year, entry_year_level: values.entry_level, current_school: values.current_school, current_school_other: values.current_school_other, share_address_with_guardians: values.student_address_share, care_arrangement: values.care_arrangement, care_arrangement_other: values.care_other, shared_parenting_schedule: values.shared_parenting, address: values.student_address, suburb: values.student_suburb, state: values.student_state, postcode: values.student_postcode, country: values.student_country, future_siblings: values.future_siblings, future_sibling_count: values.future_sibling_count, country_of_residence: values.residence_country, country_of_birth: values.birth_country, nationality: values.nationality, ethnicity: values.ethnicity, arrival_or_return_date: values.arrival_date, residency_status: values.residency_status, australian_citizen: values.australian_citizen, residency_evidence: values.residency_evidence, visa_subclass: values.visa_subclass, visa_expiry: values.visa_expiry, previous_visa_subclass: values.previous_visa, indigenous_status: values.indigenous_status, main_language: values.main_language, other_languages: values.other_languages, additional_needs: values.additional_needs, need_categories: values.need_categories, need_other: values.need_other, health_professionals: values.professional_categories, health_professional_other: values.professional_other, reports_attached: values.reports_attached, ndis_support: values.ndis_support, court_or_parenting_orders: values.court_orders, other_relevant_information: values.other_relevant_information, parish: values.parish, sacraments_json: sacraments, medical_conditions: values.medical_conditions, other_medical_condition: values.other_medical_condition, condition_details: values.condition_details, allergy_details: values.allergy_details, anaphylaxis_risk: values.anaphylaxis_risk, anaphylaxis_device: values.anaphylaxis_device, immunisation_status: values.immunisation, humanitarian_health_check: values.humanitarian_health, doctor_name: values.doctor_name, doctor_practice_address: values.doctor_address, doctor_phone: values.doctor_phone, medicare_number: values.medicare_number, medicare_expiry: values.medicare_expiry, private_health_insurance: values.private_insurance, ambulance_cover: values.ambulance_cover, health_care_card: values.healthcare_card, ...projectionVersion(app, "application") };
}

export function guardianRow(app, guardian, index, signatureStatus = "pending") {
  return { application_id: app.id, guardian_id: app.guardianIds[index], position: index + 1, share_with_other_contacts: guardian.share, salutation: guardian.title, first_name: guardian.first, last_name: guardian.last, email: guardian.email, mobile_phone: guardian.mobile, home_phone: guardian.home, work_phone: guardian.work, relationship: guardian.relationship, contact_type: guardian.contact_type, marital_status: guardian.marital, religion: guardian.religion, sms_messaging: guardian.sms, health_care_card: guardian.healthcare, health_care_card_number: guardian.healthcare_number, health_care_card_expiry: guardian.healthcare_expiry, residential_address: guardian.address, suburb: guardian.suburb, state: guardian.state, postcode: guardian.postcode, country: guardian.country, postal_same_as_residential: guardian.postal_same, postal_address: guardian.postal_address, postal_suburb: guardian.postal_suburb, postal_state: guardian.postal_state, postal_postcode: guardian.postal_postcode, postal_country: guardian.postal_country, occupational_group: guardian.occupation_group, occupation: guardian.occupation, employer: guardian.employer, school_level_education: guardian.school_education, university_further_education: guardian.further_education, country_of_birth: guardian.birth_country, nationality: guardian.nationality, ethnicity: guardian.ethnicity, languages: guardian.languages, residency_status: guardian.residency, visa_subclass: guardian.visa_subclass, visa_expiry: guardian.visa_expiry, indigenous_status: guardian.indigenous, contact_permission: guardian.permission || "Yes", signature_required: index < app.requiredSignatureCount ? "Yes" : "No", signature_status: signatureStatus, ...projectionVersion(app, "application") };
}

export function emergencyRow(app, contact, index) {
  return { application_id: app.id, emergency_contact_id: `${app.id}-emergency-${index + 1}`, position: index + 1, first_name: contact.first, last_name: contact.last, relationship: contact.relationship, mobile_phone: contact.mobile, home_phone: contact.home, work_phone: contact.work, email: contact.email, ...projectionVersion(app, "application") };
}

export function conditionsRow(app, values) {
  const both = values.fee_option === "Both Parents / Guardian";
  const one = values.fee_option === "One Parent / Guardian";
  return { application_id: app.id, previous_school_permission: values.previous_school_permission, previous_school_name: values.previous_school_name, previous_school_address: values.previous_school_address, previous_school_interstate: values.previous_school_interstate, fee_option: values.fee_option, fee_account_recipient: both ? values.fee_both_nominee : one ? values.fee_one_nominee : "", guardian_a_name: values.fee_guardian_a, guardian_a_percentage: values.fee_guardian_a_percent, guardian_b_name: values.fee_guardian_b, guardian_b_percentage: values.fee_guardian_b_percent, fee_responsibility_date: values.fee_both_date || values.fee_one_date || values.fee_split_date, discovery_source: values.application_discovery, influence_factors: values.application_influences, ...projectionVersion(app, "application") };
}

function createAuditEvent({ workflow, recordId, type, at, actorType = "family", actorId = "", details = {}, stage = "", invitationId = "" }) {
  return { eventId: id("evt"), occurredAt: at, workflow, recordId, type, actorType, actorId, details, stage, invitationId, schemaVersion: SCHEMA_VERSION };
}

export function auditSheetOperation(event) {
  const common = { event_id: event.eventId, occurred_at: event.occurredAt, event_type: event.type, actor_type: event.actorType, actor_id: event.actorId, details_json: json(event.details), schema_version: event.schemaVersion };
  if (event.workflow === "eoi") return sheetOperation("eoi", "EOI Audit", { ...common, eoi_id: event.recordId }, ["event_id"]);
  if (event.workflow === "application") return sheetOperation("application", "Application Audit", { ...common, application_id: event.recordId, invitation_id: event.invitationId, stage: event.stage }, ["event_id"]);
  return sheetOperation("operations", "Audit", { ...common, workflow: event.workflow, record_id: event.recordId }, ["event_id"]);
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

function invitationApplicationIds(invitation) {
  return [...new Set([...(Array.isArray(invitation?.applicationIds) ? invitation.applicationIds : []), invitation?.applicationId].filter(Boolean))];
}

export function additionalGuardianSignatureRecipients(values, guardianCount) {
  const recipients = [];
  for (let index = 1; index < Math.max(1, Math.min(6, Number(guardianCount || 1))); index += 1) {
    const email = normalizeEmail(values[`app_guardian_${index}_email`]);
    if (email) recipients.push({ index, email, firstName: safeText(values[`app_guardian_${index}_first`], 120) });
  }
  return recipients;
}

async function getInvitationApplications(store, invitation) {
  return (await Promise.all(invitationApplicationIds(invitation).map(applicationId => store.getApplication(applicationId)))).filter(Boolean);
}

export async function createApplicationInvitation({ store, recipientEmail, firstName = "", lastName = "", sourceEoiId = "", createdBy = "staff-cli", applicationUrl, clock = () => Date.now() }) {
  const now = clock();
  const definition = await ensureDefinition(store, "application", currentFormDefinition("application").formVersion);
  const email = normalizeEmail(recipientEmail);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw appError(422, "INVALID_EMAIL", "Provide a valid recipient email.");
  const eoi = sourceEoiId ? await store.getEoi(sourceEoiId) : null;
  if (sourceEoiId && !eoi) throw appError(404, "EOI_NOT_FOUND", "The requested EOI was not found. No invitation was created.");
  if (eoi && eoi.values.eoi_email !== email) throw appError(409, "EOI_EMAIL_MISMATCH", "The invitation email must match the linked EOI email unless the EOI is corrected first.");
  if (!eoi && !safeText(firstName, 120)) throw appError(422, "PARENT_NAME_REQUIRED", "Enter the parent or guardian first name.");
  const rawToken = token();
  const invitationId = id("invite");
  const applicationId = id("app");
  const contactId = eoi?.contactId || id("contact");
  const studentId = eoi?.studentId || id("student");
  const values = { ...prefillFromEoi(eoi) };
  if (!eoi) Object.assign(values, { app_guardian_0_first: firstName, app_guardian_0_last: lastName, app_guardian_0_email: email });
  const createdAt = iso(now);
  const expiresAt = now + INVITATION_LIFETIME_MS;
  const tokenHash = sha256(rawToken);
  const displayFirst = eoi?.values.eoi_first || firstName;
  const displayLast = eoi?.values.eoi_last || lastName || "";
  const formReference = { formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
  const invitation = { id: invitationId, applicationId, applicationIds: [applicationId], familyRevision: 0, contactId, studentId, recipientEmail: email, firstName: displayFirst, lastName: displayLast, sourceEoiId: sourceEoiId || "", status: "active", createdAt, expiresAt, firstSentAt: createdAt, lastSentAt: createdAt, sendCount: 1, tokenHash, ...formReference };
  const application = { id: applicationId, invitationId, sourceEoiId: sourceEoiId || "", contactId, studentId, recipientEmail: email, status: "invited", revision: 0, values, guardianCount: 2, emergencyCount: 2, documents: {}, signatures: [], guardianIds: [id("guardian"), id("guardian")], createdAt, updatedAt: createdAt, ...formReference };
  const invitationUrl = `${applicationUrl}${applicationUrl.includes("?") ? "&" : "?"}workflow=application&invite=${encodeURIComponent(rawToken)}`;
  const studentFirst = eoi?.values.eoi_student_first || "";
  const studentLast = eoi?.values.eoi_student_last || "";
  const studentName = [studentFirst, studentLast].filter(Boolean).join(" ");
  const message = applicationInvitation({ firstName: displayFirst, studentName, entryLevel: eoi?.values.eoi_level || "", entryYear: eoi?.values.eoi_year || "", invitationUrl, expiresAt: invitationDate(expiresAt), linked: Boolean(eoi) });
  const audit = createAuditEvent({ workflow: "operations", recordId: applicationId, type: eoi ? "application.invited_from_eoi" : "application.invited_directly", at: createdAt, actorType: "staff", actorId: createdBy, details: { invitationId, sourceEoiId: sourceEoiId || null } });
  const operations = [
    sheetOperation("operations", "Contacts", { contact_id: contactId, email, first_name: displayFirst, last_name: displayLast, mobile_phone: eoi?.values.eoi_mobile || "", source: eoi ? "eoi" : "direct_invitation", created_at: eoi?.submittedAt || createdAt, updated_at: createdAt, schema_version: SCHEMA_VERSION }, ["contact_id"]),
    sheetOperation("operations", "Application Invitations", { invitation_id: invitationId, application_id: applicationId, application_ids_json: [applicationId], recipient_contact_id: contactId, recipient_email: email, student_id: studentId, source_eoi_id: sourceEoiId, status: "active", created_at: createdAt, expires_at: iso(expiresAt), first_sent_at: createdAt, last_sent_at: createdAt, send_count: 1, ...projectionVersion(application, "application") }, ["invitation_id"]),
    sheetOperation("operations", "Progress", { application_id: applicationId, current_stage: "gateway", status: "invited", revision: 0, last_activity_at: createdAt, percent_complete: 0, ...projectionVersion(application, "application") }, ["application_id"]),
    sheetOperation("application", "Applications", mapApplicationRow(application), ["application_id"]),
    auditSheetOperation(audit),
    emailEvent({ messageType: "application_invitation", workflow: "application", recordId: applicationId, recipientEmail: email, at: createdAt })
  ];
  if (studentName) operations.splice(1, 0, sheetOperation("operations", "Students", { student_id: studentId, first_name: studentFirst, last_name: studentLast, date_of_birth: eoi?.values.eoi_dob || "", source: "eoi", created_at: eoi?.submittedAt || createdAt, updated_at: createdAt, schema_version: SCHEMA_VERSION }, ["student_id"]));
  if (eoi) operations.push(sheetOperation("operations", "Workflow Links", { link_id: id("link"), source_workflow: "eoi", source_record_id: sourceEoiId, target_workflow: "application", target_record_id: applicationId, linked_by: createdBy, linked_at: createdAt, prefill_fields_json: Object.keys(values), ...projectionVersion(application, "application") }, ["link_id"]));
  await store.createInvitation({ invitation, tokenHash, application, revisionRecord: applicationRevision(application, { kind: "created", values, savedAt: createdAt }), outboxEvents: [emailOutbox({ to: email, ...message, tags: { workflow: "application", message_type: "invitation" } }, now), ...operations.map(operation => sheetOutbox(operation, now))], auditEvents: [audit] });
  return { applicationId, invitationId, invitationUrl, sourceEoiId: sourceEoiId || null, recipientEmail: email };
}

export async function resendApplicationInvitation({ store, invitationId, createdBy, applicationUrl, clock = () => Date.now() }) {
  const current = await store.getInvitationById(invitationId);
  if (!current) throw appError(404, "INVITATION_NOT_FOUND", "The invitation was not found.");
  if (!current.tokenHash) throw appError(409, "INVITATION_NOT_ROTATABLE", "This earlier invitation cannot be resent safely. Create a new invitation instead.");
  if (current.status !== "active") throw appError(409, "INVITATION_NOT_ACTIVE", "Only active invitations can be resent.");
  const applications = await getInvitationApplications(store, current);
  const application = applications.find(record => record.id === current.applicationId) || applications[0];
  if (!applications.some(record => ["invited", "in_progress"].includes(record.status))) throw appError(409, "APPLICATION_NOT_EDITABLE", "This family has no editable application attached to the invitation.");
  const now = clock();
  const rawToken = token();
  const tokenHash = sha256(rawToken);
  const sentAt = iso(now);
  const expiresAt = now + INVITATION_LIFETIME_MS;
  const invitation = { ...current, tokenHash, expiresAt, lastSentAt: sentAt, sendCount: Number(current.sendCount || 0) + 1 };
  const invitationUrl = `${applicationUrl}${applicationUrl.includes("?") ? "&" : "?"}workflow=application&invite=${encodeURIComponent(rawToken)}`;
  const firstName = current.firstName || application?.values?.app_guardian_0_first || "Parent/Guardian";
  const studentName = [application.values?.student_first, application.values?.student_last].filter(Boolean).join(" ");
  const message = applicationInvitation({ firstName, studentName, entryLevel: application.values?.entry_level || "", entryYear: application.values?.entry_year || "", invitationUrl, expiresAt: invitationDate(expiresAt), linked: Boolean(application.sourceEoiId) });
  const audit = createAuditEvent({ workflow: "operations", recordId: current.applicationId, type: "application.invitation_resent", at: sentAt, actorType: "staff", actorId: createdBy, details: { invitationId: current.id, sendCount: invitation.sendCount } });
  const operations = [
    sheetOperation("operations", "Application Invitations", { invitation_id: current.id, application_id: current.applicationId, application_ids_json: invitationApplicationIds(current), recipient_contact_id: current.contactId, recipient_email: current.recipientEmail, student_id: current.studentId, source_eoi_id: current.sourceEoiId || "", status: "active", created_at: current.createdAt, expires_at: iso(expiresAt), first_sent_at: current.firstSentAt, last_sent_at: sentAt, send_count: invitation.sendCount, opened_at: current.openedAt || "", verified_at: current.verifiedAt || "", submitted_at: "", ...projectionVersion(application, "application") }, ["invitation_id"]),
    auditSheetOperation(audit),
    emailEvent({ messageType: "application_invitation_resent", workflow: "application", recordId: current.applicationId, recipientEmail: current.recipientEmail, at: sentAt })
  ];
  await store.rotateInvitation({ invitation, previousTokenHash: current.tokenHash, tokenHash, outboxEvents: [emailOutbox({ to: current.recipientEmail, ...message, tags: { workflow: "application", message_type: "invitation_resend" } }, now), ...operations.map(operation => sheetOutbox(operation, now))], auditEvents: [audit] });
  return { applicationId: current.applicationId, invitationId: current.id, recipientEmail: current.recipientEmail, sendCount: invitation.sendCount, expiresAt: iso(expiresAt) };
}

export async function queueMissingGuardianSignatureInvitations({ store, applicationId, signingPageUrl, actorId = "staff-cli", clock = () => Date.now() }) {
  const app = await store.getApplication(applicationId);
  if (!app) throw appError(404, "APPLICATION_NOT_FOUND", "The application was not found.");
  if (app.status !== "pending_signatures") throw appError(409, "APPLICATION_NOT_PENDING_SIGNATURES", "The application is not awaiting guardian signatures.");
  if (!app.revisionHash) throw appError(409, "APPLICATION_REVISION_UNAVAILABLE", "The submitted application does not have a frozen revision hash.");
  if (!store.listSignatureTasksForApplication || !store.addSignatureTasks) throw new Error("The configured store does not support signature-task recovery.");

  const existingTasks = await store.listSignatureTasksForApplication(app.id);
  const existingGuardianIds = new Set(existingTasks.map(task => task.guardianId));
  const signedGuardianIds = new Set((app.signatures || []).map(signature => signature.guardianId));
  const recipients = additionalGuardianSignatureRecipients(app.values || {}, app.guardianCount || 1)
    .filter(recipient => {
      const guardianId = app.guardianIds?.[recipient.index];
      return guardianId && !existingGuardianIds.has(guardianId) && !signedGuardianIds.has(guardianId);
    });
  if (!recipients.length) return { applicationId: app.id, status: app.status, queuedSignatureRequests: 0 };

  const now = clock();
  const createdAt = iso(now);
  const signatureTasks = [];
  const emailEvents = [];
  for (const recipient of recipients) {
    const rawTask = token();
    const guardianId = app.guardianIds[recipient.index];
    signatureTasks.push({ tokenHash: sha256(rawTask), applicationId: app.id, guardianId, guardianIndex: recipient.index, email: recipient.email, status: "invited", revision: app.revision, revisionHash: app.revisionHash, createdAt: now, expiresAt: now + 14 * 86400_000, ttl: Math.floor((now + 30 * 86400_000) / 1000) });
    const signingUrl = `${signingPageUrl}?task=${encodeURIComponent(rawTask)}`;
    emailEvents.push(emailOutbox({ to: recipient.email, ...signatureInvitation({ firstName: recipient.firstName, studentName: `${app.values.student_first} ${app.values.student_last}`, signingUrl }), tags: { workflow: "application", message_type: "signature_invitation" } }, now));
  }
  const audit = createAuditEvent({ workflow: "application", recordId: app.id, invitationId: app.invitationId, type: "application.signature_invitations_recovered", at: createdAt, actorType: "staff", actorId, stage: "guardian_signatures", details: { queuedSignatureRequests: signatureTasks.length, revision: app.revision } });
  const operations = [
    auditSheetOperation(audit),
    ...recipients.map(recipient => emailEvent({ messageType: "signature_invitation", workflow: "application", recordId: app.id, recipientEmail: recipient.email, at: createdAt }))
  ];
  await store.addSignatureTasks({ applicationId: app.id, revisionHash: app.revisionHash, signatureTasks, outboxEvents: [...emailEvents, ...operations.map(operation => sheetOutbox(operation, now))], auditEvents: [audit] });
  return { applicationId: app.id, status: app.status, queuedSignatureRequests: signatureTasks.length };
}

export function createService({ store, artifacts, drive, sheets, mailer, env, clock = () => Date.now() }) {
  artifacts ||= drive;
  const allowUnscannedGoogleDocuments = String(env.ALLOW_UNSCANNED_GOOGLE_DOCUMENTS || "false") === "true";
  const allowedOrigins = String(env.ALLOWED_ORIGINS || "https://ffe.org.au").split(",").map(value => value.trim()).filter(Boolean);
  const staffEmails = new Set(String(env.STAFF_EMAILS || "info@ffe.org.au").split(",").map(normalizeEmail).filter(Boolean));
  const staffRoles = new Map([...staffEmails].map(email => [email, "admin"]));
  for (const entry of String(env.STAFF_ROLES || "").split(",").map(value => value.trim()).filter(Boolean)) {
    const [rawEmail, rawRole] = entry.split("=");
    const email = normalizeEmail(rawEmail);
    const role = ["admin", "admissions", "viewer"].includes(rawRole) ? rawRole : "viewer";
    if (staffEmails.has(email)) staffRoles.set(email, role);
  }
  const otpSecret = env.OTP_HMAC_SECRET;
  const networkSecret = env.NETWORK_HMAC_SECRET;
  const signingPageUrl = env.APPLICATION_SIGNING_PAGE_URL;
  const applicationPageUrl = env.APPLICATION_PAGE_URL;
  if (!otpSecret || !networkSecret) throw new Error("OTP_HMAC_SECRET and NETWORK_HMAC_SECRET are required.");

  function response(statusCode, payload, origin) {
    return { statusCode, headers: { "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0], "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS", "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json; charset=utf-8", "Pragma": "no-cache", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" }, body: JSON.stringify(payload) };
  }

  function networkFingerprint(event) { return hmac(networkSecret, sourceAddress(event)); }
  function nowIso() { return iso(clock()); }

  async function enqueueSheet(operation) { await store.enqueue(sheetOutbox(operation, clock())); }
  async function enqueueEmail(payload) { await store.enqueue(emailOutbox(payload, clock())); }
  async function recordAudit(event) {
    await store.recordAudit(event);
    await enqueueSheet(auditSheetOperation(event));
  }

  async function requireSession(event, scope = "application") {
    const raw = safeText(headers(event).authorization, 1000).replace(/^Bearer\s+/i, "");
    if (!raw) throw appError(401, "SESSION_REQUIRED", "Verify your email address to continue.");
    const tokenHash = sha256(raw);
    let session = await store.getSession(tokenHash);
    const now = clock();
    if (!session || session.scope !== scope || session.expiresAt <= now) throw appError(401, "SESSION_EXPIRED", "Your secure session has expired. Verify your email address again.");
    if (["application", "application_family"].includes(scope)) {
      const absoluteExpiresAt = Number(session.absoluteExpiresAt || Number(session.createdAt) + APPLICATION_SESSION_ABSOLUTE_MS);
      const expiresAt = Math.min(now + APPLICATION_SESSION_IDLE_MS, absoluteExpiresAt);
      session = await store.touchSession(tokenHash, { expiresAt, absoluteExpiresAt, lastActivityAt: now, now, ttl: Math.floor((absoluteExpiresAt + 86400_000) / 1000) });
      if (!session) throw appError(401, "SESSION_EXPIRED", "Your secure session has expired. Verify your email address again.");
    }
    return session;
  }

  async function logoutSession(event) {
    const raw = safeText(headers(event).authorization, 1000).replace(/^Bearer\s+/i, "");
    if (raw) await store.deleteSession(sha256(raw));
    return { signedOut: true };
  }

  async function requireStaffSession(event, roles = ["admin", "admissions", "viewer"]) {
    const session = await requireSession(event, "staff");
    const email = normalizeEmail(session.email);
    const role = staffRoles.get(email);
    if (!staffEmails.has(email) || !role || !roles.includes(role)) throw appError(403, "STAFF_ACCESS_DENIED", "This account is not authorised for this staff operation.");
    return { ...session, email, role };
  }

  async function requestStaffCode(event) {
    const body = parseBody(event, 20_000);
    const email = normalizeEmail(body.email);
    const fingerprint = networkFingerprint(event);
    for (const [key, limit, seconds] of [[`staff-cooldown:${sha256(email)}`, 1, 30], [`staff-email:${sha256(email)}`, 5, 1800], [`staff-network:${fingerprint}`, 10, 1800]]) {
      if (!await store.checkRateLimit(key, limit, seconds)) throw appError(429, "OTP_RATE_LIMIT", "Please wait before requesting another access code.");
    }
    const challengeId = id("challenge");
    if (staffEmails.has(email)) {
      const verificationCode = code();
      await store.putChallenge({ id: challengeId, purpose: "staff_access", subjectHash: sha256(email), email, codeHmac: hmac(otpSecret, `${challengeId}:${verificationCode}`), attempts: 0, maxAttempts: 5, createdAt: clock(), expiresAt: clock() + 600_000, ttl: Math.floor((clock() + 86400_000) / 1000) });
      const sent = await mailer.send({ to: email, ...staffOtp({ code: verificationCode }), tags: { workflow: "staff", message_type: "staff_otp" } });
      await enqueueSheet(sheetOperation("operations", "Email Events", { email_event_id: id("mail"), occurred_at: nowIso(), message_type: "staff_otp", workflow: "staff", record_id: "staff-access", recipient_email: email, ses_message_id: sent.messageId, delivery_status: "sent_to_ses", schema_version: SCHEMA_VERSION }, ["email_event_id"]));
    }
    return { challengeId, expiresInSeconds: 600, resendAfterSeconds: 30, message: "If this email is authorised, a staff access code has been sent." };
  }

  async function verifyStaffCode(event) {
    const body = parseBody(event, 20_000);
    const email = normalizeEmail(body.email);
    const challengeId = safeText(body.challengeId, 200);
    const challenge = await store.getChallenge(challengeId);
    if (!staffEmails.has(email) || !challenge || challenge.purpose !== "staff_access" || challenge.subjectHash !== sha256(email) || challenge.email !== email) throw appError(401, "OTP_INVALID", "The code is invalid or expired. Request a new code.");
    const consumed = await store.consumeChallenge(challengeId, hmac(otpSecret, `${challengeId}:${safeText(body.code, 12)}`), clock());
    if (!consumed) { await store.failChallenge(challengeId); throw appError(401, "OTP_INVALID", "The code is invalid or expired. Request a new code."); }
    const rawSession = token();
    const role = staffRoles.get(email);
    await store.putSession({ tokenHash: sha256(rawSession), scope: "staff", email, role, createdAt: clock(), expiresAt: clock() + 2 * 60 * 60_000, ttl: Math.floor((clock() + 3 * 60 * 60_000) / 1000) });
    await recordAudit(createAuditEvent({ workflow: "operations", recordId: "staff-portal", type: "staff.session_started", at: nowIso(), actorType: "staff", actorId: email, details: { role } }));
    return { sessionToken: rawSession, expiresInSeconds: 7200, staff: { email, role } };
  }

  async function getStaffDashboard(event) {
    const session = await requireStaffSession(event);
    const records = await store.listOperationalRecords();
    const eoiRecords = records.filter(item => item.entity === "eoi").map(item => item.data);
    const applicationRecords = records.filter(item => item.entity === "application").map(item => item.data);
    const invitationRecords = records.filter(item => item.entity === "invitation_index").map(item => item.data);
    const emailReceipts = records.filter(item => item.entity === "outbox_receipt" && item.data?.kind === "email").map(item => item.data);
    const invitationByApplication = new Map(invitationRecords.flatMap(invitation => invitationApplicationIds(invitation).map(applicationId => [applicationId, invitation])));
    const applicationByEoi = new Map(applicationRecords.filter(application => application.sourceEoiId).map(application => [application.sourceEoiId, application]));
    const applications = applicationRecords.map(application => {
      const invitation = invitationByApplication.get(application.id) || {};
      return {
        applicationId: application.id,
        invitationId: application.invitationId,
        sourceEoiId: application.sourceEoiId || null,
        status: application.status || "invited",
        reference: application.reference || "",
        recipientEmail: application.recipientEmail,
        studentName: [application.values?.student_first, application.values?.student_last].filter(Boolean).join(" "),
        createdAt: application.createdAt,
        updatedAt: application.updatedAt || application.createdAt,
        submittedAt: application.submittedAt || "",
        currentStage: application.currentStage || (application.status === "submitted" ? "complete" : "gateway"),
        percentComplete: Math.max(0, Math.min(100, Number(application.percentComplete ?? (application.status === "submitted" ? 100 : 0)))),
        requiredSignatures: Number(application.requiredSignatureCount || 0),
        completedSignatures: Number(application.signatures?.length || 0),
        lastSentAt: invitation.lastSentAt || "",
        sendCount: Number(invitation.sendCount || 0),
        expiresAt: invitation.expiresAt ? iso(invitation.expiresAt) : "",
        canResend: ["invited", "in_progress"].includes(application.status || "invited")
      };
    }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const eois = eoiRecords.map(record => {
      const linked = applicationByEoi.get(record.id);
      return {
        eoiId: record.id,
        reference: record.reference,
        submittedAt: record.submittedAt,
        status: record.status,
        contactName: [record.values?.eoi_first, record.values?.eoi_last].filter(Boolean).join(" "),
        email: record.values?.eoi_email,
        studentName: [record.values?.eoi_student_first, record.values?.eoi_student_last].filter(Boolean).join(" "),
        entryYear: record.values?.eoi_year,
        entryLevel: record.values?.eoi_level,
        linkedApplicationId: linked?.id || null
      };
    }).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
    const counts = applications.reduce((result, application) => ({ ...result, [application.status]: (result[application.status] || 0) + 1 }), {});
    return {
      generatedAt: nowIso(),
      staff: { email: session.email, role: session.role },
      stats: { expressionsOfInterest: eois.length, applications: applications.length, invited: counts.invited || 0, inProgress: counts.in_progress || 0, pendingSignatures: counts.pending_signatures || 0, submitted: counts.submitted || 0 },
      eois,
      applications,
      recentEmails: emailReceipts.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))).slice(0, 30).map(receipt => ({ occurredAt: receipt.completedAt || receipt.createdAt, messageType: receipt.payload?.tags?.message_type || "transactional_email", workflow: receipt.payload?.tags?.workflow || "application", recordId: receipt.payload?.tags?.record_id || "", recipientEmail: receipt.payload?.to || "", deliveryStatus: receipt.result?.messageId ? "sent_to_ses" : "completed" })),
      reporting: { source: "dynamodb", googleSheetsRole: "replaceable_projection" }
    };
  }

  async function getStaffApplicationDetail(event) {
    const session = await requireStaffSession(event);
    const body = parseBody(event, 20_000);
    const applicationId = safeText(body.applicationId, 200);
    const app = await store.getApplication(applicationId);
    if (!app) throw appError(404, "APPLICATION_NOT_FOUND", "The application was not found.");
    const revisions = store.listApplicationRevisions ? await store.listApplicationRevisions(app.id, 100) : [];
    await recordAudit(createAuditEvent({ workflow: "application", recordId: app.id, invitationId: app.invitationId, type: "staff.application_viewed", at: nowIso(), actorType: "staff", actorId: session.email, details: { role: session.role } }));
    const formReference = recordFormReference(app, "application");
    return {
      application: {
        applicationId: app.id,
        invitationId: app.invitationId,
        sourceEoiId: app.sourceEoiId || null,
        status: app.status,
        reference: app.reference || "",
        recipientEmail: app.recipientEmail,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        submittedAt: app.submittedAt || "",
        completedAt: app.completedAt || "",
        revision: app.revision,
        guardianCount: app.guardianCount || 1,
        emergencyCount: app.emergencyCount || 2,
        requiredSignatureCount: app.requiredSignatureCount || 0,
        completedSignatureCount: app.signatures?.length || 0,
        ...formReference,
        values: app.values || {},
        documents: Object.values(app.documents || {}).flat().map(document => ({
          documentId: document.id || document.documentId,
          category: document.category,
          fileName: document.fileName,
          mimeType: document.mimeType,
          size: document.size,
          uploadedAt: document.uploadedAt,
          malwareScanStatus: document.malwareScanStatus,
          storageProvider: document.storageProvider || "legacy"
        })),
        signatures: (app.signatures || []).map(signature => ({ guardianId: signature.guardianId, signerName: signature.signerName, signerEmail: signature.signerEmail, signedAt: signature.signedAt, revision: signature.revision })),
        revisions: revisions.map(revision => ({ revisionKey: revision.revisionKey, revision: revision.revision, kind: revision.kind, status: revision.status, stage: revision.stage, savedAt: revision.savedAt, saveMode: revision.saveMode, changedFields: revision.changedFields || [], formVersion: revision.formVersion, formDefinitionHash: revision.formDefinitionHash, schemaVersion: revision.schemaVersion }))
      }
    };
  }

  async function getStaffApplicationRevision(event) {
    const session = await requireStaffSession(event);
    const body = parseBody(event, 20_000);
    const applicationId = safeText(body.applicationId, 200);
    const revisionKey = safeText(body.revisionKey, 80);
    if (!/^REV#\d{8}#[A-Z0-9_]{1,40}$/.test(revisionKey)) throw appError(422, "INVALID_REVISION", "Select a valid saved revision.");
    const app = await store.getApplication(applicationId);
    if (!app) throw appError(404, "APPLICATION_NOT_FOUND", "The application was not found.");
    const revision = await store.getApplicationRevision(applicationId, revisionKey);
    if (!revision) throw appError(404, "REVISION_NOT_FOUND", "The saved revision was not found.");
    await recordAudit(createAuditEvent({ workflow: "application", recordId: app.id, invitationId: app.invitationId, type: "staff.application_revision_viewed", at: nowIso(), actorType: "staff", actorId: session.email, details: { role: session.role, revisionKey, revision: revision.revision } }));
    return { revision: { revisionKey, revision: revision.revision, kind: revision.kind, status: revision.status, stage: revision.stage, savedAt: revision.savedAt, saveMode: revision.saveMode, changedFields: revision.changedFields || [], formVersion: revision.formVersion, formDefinitionHash: revision.formDefinitionHash, schemaVersion: revision.schemaVersion, values: revision.values || {} } };
  }

  async function createStaffInvitation(event) {
    const session = await requireStaffSession(event, ["admin", "admissions"]);
    const body = parseBody(event, 20_000);
    if (!await store.checkRateLimit(`staff-invite:${sha256(session.email)}`, 30, 3600)) throw appError(429, "STAFF_RATE_LIMIT", "The hourly invitation limit has been reached. Wait before creating another invitation.");
    const sourceEoiId = safeText(body.sourceEoiId, 200);
    if (sourceEoiId) {
      const existing = await store.findApplicationBySourceEoi(sourceEoiId);
      if (existing) throw appError(409, "EOI_ALREADY_LINKED", "This expression of interest is already linked to an application.", { applicationId: existing.id });
    }
    const result = await createApplicationInvitation({ store, recipientEmail: body.recipientEmail, firstName: safeText(body.firstName, 120), lastName: safeText(body.lastName, 120), sourceEoiId, createdBy: session.email, applicationUrl: applicationPageUrl, clock });
    await dispatchOutbox(50);
    return { applicationId: result.applicationId, invitationId: result.invitationId, sourceEoiId: result.sourceEoiId, recipientEmail: result.recipientEmail, message: "The application invitation has been sent." };
  }

  async function resendStaffInvitation(event) {
    const session = await requireStaffSession(event, ["admin", "admissions"]);
    const body = parseBody(event, 20_000);
    if (!await store.checkRateLimit(`staff-resend:${sha256(session.email)}`, 30, 3600)) throw appError(429, "STAFF_RATE_LIMIT", "The hourly resend limit has been reached. Wait before resending another invitation.");
    const result = await resendApplicationInvitation({ store, invitationId: safeText(body.invitationId, 200), createdBy: session.email, applicationUrl: applicationPageUrl, clock });
    await dispatchOutbox(50);
    return { ...result, message: "A new private invitation link has been sent. The earlier link no longer works." };
  }

  async function submitEoi(event) {
    const definition = await ensureDefinition(store, "eoi", currentFormDefinition("eoi").formVersion);
    const values = EOI_VALIDATORS.get(definition.formVersion)(parseBody(event).values);
    const now = clock();
    const submittedAt = iso(now);
    const eoiId = id("eoi");
    const contactId = id("contact");
    const studentId = id("student");
    const reference = `EOI-${new Date(now).getFullYear()}-${token(5).toUpperCase()}`;
    const record = { id: eoiId, reference, status: "submitted", contactId, studentId, values, submittedAt, networkFingerprint: networkFingerprint(event), formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
    const snapshot = await artifacts.storeEoiSnapshot({ eoiId, snapshot: record });
    record.snapshotFileId = snapshot.id;
    record.snapshotStorageProvider = snapshot.storageProvider || "legacy";
    record.snapshotStorageVersionId = snapshot.storageVersionId || "";
    const message = eoiAcknowledgement({ firstName: values.eoi_first, studentName: `${values.eoi_student_first} ${values.eoi_student_last}`, reference });
    const submittedAudit = createAuditEvent({ workflow: "eoi", recordId: eoiId, type: "eoi.submitted", at: submittedAt, actorId: contactId });
    const contactAudit = createAuditEvent({ workflow: "operations", recordId: eoiId, type: "eoi.contact_registered", at: submittedAt, actorId: contactId });
    const operations = [
      sheetOperation("eoi", "EOIs", mapEoiRow(record), ["eoi_id"]),
      auditSheetOperation(submittedAudit),
      sheetOperation("operations", "Contacts", { contact_id: contactId, email: values.eoi_email, first_name: values.eoi_first, last_name: values.eoi_last, mobile_phone: values.eoi_mobile, source: "eoi", created_at: submittedAt, updated_at: submittedAt, schema_version: SCHEMA_VERSION }, ["contact_id"]),
      sheetOperation("operations", "Students", { student_id: studentId, first_name: values.eoi_student_first, last_name: values.eoi_student_last, date_of_birth: values.eoi_dob, source: "eoi", created_at: submittedAt, updated_at: submittedAt, schema_version: SCHEMA_VERSION }, ["student_id"]),
      auditSheetOperation(contactAudit),
      emailEvent({ messageType: "eoi_acknowledgement", workflow: "eoi", recordId: eoiId, recipientEmail: values.eoi_email, at: submittedAt })
    ];
    await store.createEoi(record, [emailOutbox({ to: values.eoi_email, ...message, tags: { workflow: "eoi", message_type: "acknowledgement" } }, now), ...operations.map(operation => sheetOutbox(operation, now))], [submittedAudit, contactAudit]);
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
    const app = await store.getApplication(invitation.applicationId);
    if (!app) throw appError(404, "APPLICATION_NOT_FOUND", "The application attached to this invitation was not found.");
    const definition = requireRecordDefinition(app, "application");
    await ensureDefinition(store, "application", definition.formVersion);
    const rawFamilySession = token();
    const sessionCreatedAt = clock();
    const absoluteExpiresAt = sessionCreatedAt + APPLICATION_SESSION_ABSOLUTE_MS;
    const sessionBase = { invitationId: invitation.id, email: challenge.email, createdAt: sessionCreatedAt, lastActivityAt: sessionCreatedAt, expiresAt: sessionCreatedAt + APPLICATION_SESSION_IDLE_MS, absoluteExpiresAt, ttl: Math.floor((absoluteExpiresAt + 86400_000) / 1000) };
    await store.putSession({ ...sessionBase, tokenHash: sha256(rawFamilySession), scope: "application_family" });
    await recordAudit(createAuditEvent({ workflow: "application", recordId: app.id, invitationId: invitation.id, type: "application.email_verified", at: nowIso(), actorId: app.contactId, stage: "gateway" }));
    return { familySessionToken: rawFamilySession, expiresInSeconds: APPLICATION_SESSION_IDLE_MS / 1000, idleTimeoutSeconds: APPLICATION_SESSION_IDLE_MS / 1000, absoluteTimeoutSeconds: APPLICATION_SESSION_ABSOLUTE_MS / 1000, context: applicationContext(app), family: await familyApplicationContext(invitation) };
  }

  function applicationContext(app) {
    return { applicationId: app.id, invitationId: app.invitationId, sourceEoiId: app.sourceEoiId || null, recipientEmail: app.recipientEmail, status: app.status, revision: app.revision, screen: Number(app.screen || 0), currentStage: app.currentStage || "gateway", percentComplete: Number(app.percentComplete || 0), values: app.values || {}, guardianCount: app.guardianCount || 1, emergencyCount: app.emergencyCount || 2, documents: Object.values(app.documents || {}).flat().map(document => ({ category: document.category, documentId: document.documentId, fileName: document.fileName, size: document.size })), studentName: [app.values.student_first, app.values.student_last].filter(Boolean).join(" "), updatedAt: app.updatedAt, ...recordFormReference(app, "application") };
  }

  function familyApplicationSummary(app) {
    return { applicationId: app.id, studentName: [app.values?.student_first, app.values?.student_last].filter(Boolean).join(" "), status: app.status || "invited", sourceEoiId: app.sourceEoiId || null, updatedAt: app.updatedAt || app.createdAt, editable: ["invited", "in_progress"].includes(app.status || "invited") };
  }

  async function familyApplicationContext(invitation) {
    const applications = await getInvitationApplications(store, invitation);
    const primary = applications.find(app => app.id === invitation.applicationId) || applications[0];
    const firstName = invitation.firstName || primary?.values?.app_guardian_0_first || "";
    const lastName = invitation.lastName || primary?.values?.app_guardian_0_last || "";
    return { invitationId: invitation.id, recipientEmail: invitation.recipientEmail, parentGuardianName: [firstName, lastName].filter(Boolean).join(" "), applications: applications.map(familyApplicationSummary) };
  }

  async function requireFamilyInvitation(event) {
    const session = await requireSession(event, "application_family");
    const invitation = await store.getInvitationById(session.invitationId);
    if (!invitation || invitation.recipientEmail !== session.email) throw appError(401, "SESSION_EXPIRED", "Your secure family session is no longer valid. Verify your email address again.");
    return { session, invitation };
  }

  async function issueApplicationSession(invitation, application, email) {
    const rawSession = token();
    const createdAt = clock();
    const absoluteExpiresAt = createdAt + APPLICATION_SESSION_ABSOLUTE_MS;
    await store.putSession({ tokenHash: sha256(rawSession), scope: "application", applicationId: application.id, invitationId: invitation.id, email, createdAt, lastActivityAt: createdAt, expiresAt: createdAt + APPLICATION_SESSION_IDLE_MS, absoluteExpiresAt, ttl: Math.floor((absoluteExpiresAt + 86400_000) / 1000) });
    return rawSession;
  }

  async function selectFamilyApplication(event) {
    const { session, invitation } = await requireFamilyInvitation(event);
    const body = parseBody(event, 20_000);
    const applicationId = safeText(body.applicationId, 200);
    if (!invitationApplicationIds(invitation).includes(applicationId)) throw appError(403, "APPLICATION_ACCESS_DENIED", "This application does not belong to the verified family invitation.");
    const application = await store.getApplication(applicationId);
    if (!application || application.invitationId !== invitation.id) throw appError(404, "APPLICATION_NOT_FOUND", "The selected application was not found.");
    if (!["invited", "in_progress"].includes(application.status || "invited")) throw appError(409, "APPLICATION_NOT_EDITABLE", "This child application has already been submitted and cannot be reopened.");
    const definition = requireRecordDefinition(application, "application", body);
    await ensureDefinition(store, "application", definition.formVersion);
    const sessionToken = await issueApplicationSession(invitation, application, session.email);
    await recordAudit(createAuditEvent({ workflow: "application", recordId: application.id, invitationId: invitation.id, type: "application.selected", at: nowIso(), actorId: application.contactId, stage: "selector" }));
    return { sessionToken, expiresInSeconds: APPLICATION_SESSION_IDLE_MS / 1000, idleTimeoutSeconds: APPLICATION_SESSION_IDLE_MS / 1000, absoluteTimeoutSeconds: APPLICATION_SESSION_ABSOLUTE_MS / 1000, context: applicationContext(application) };
  }

  async function startFamilyApplication(event) {
    const { session, invitation } = await requireFamilyInvitation(event);
    const body = parseBody(event, 20_000);
    const studentFirstName = safeText(body.studentFirstName, 120);
    const studentLastName = safeText(body.studentLastName, 120);
    if (!studentFirstName || !studentLastName) throw appError(422, "STUDENT_NAME_REQUIRED", "Enter the student's first and last name.");
    const applications = await getInvitationApplications(store, invitation);
    if (applications.length >= MAX_FAMILY_APPLICATIONS && !applications.some(app => !familyApplicationSummary(app).studentName)) throw appError(422, "FAMILY_APPLICATION_LIMIT", `A family invitation can contain no more than ${MAX_FAMILY_APPLICATIONS} child applications.`);
    const blank = applications.find(app => ["invited", "in_progress"].includes(app.status) && !familyApplicationSummary(app).studentName);
    const createdAt = nowIso();
    let application;
    if (blank) {
      const definition = requireRecordDefinition(blank, "application", body);
      await ensureDefinition(store, "application", definition.formVersion);
      const values = { ...(blank.values || {}), student_first: studentFirstName, student_last: studentLastName };
      const next = { ...blank, values, status: "in_progress", revision: Number(blank.revision) + 1, currentStage: "student", percentComplete: 0, updatedAt: createdAt, formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
      const audit = createAuditEvent({ workflow: "application", recordId: blank.id, invitationId: invitation.id, type: "application.student_started", at: createdAt, actorId: blank.contactId, stage: "selector", details: { revision: next.revision } });
      const operations = [
        sheetOperation("operations", "Students", { student_id: blank.studentId, first_name: studentFirstName, last_name: studentLastName, date_of_birth: "", source: "family_entry", created_at: blank.createdAt, updated_at: createdAt, schema_version: SCHEMA_VERSION }, ["student_id"]),
        sheetOperation("operations", "Progress", { application_id: blank.id, current_stage: "student", status: "in_progress", revision: next.revision, last_saved_at: createdAt, last_activity_at: createdAt, percent_complete: 0, ...projectionVersion(next, "application") }, ["application_id"]),
        sheetOperation("application", "Applications", mapApplicationRow(next), ["application_id"]),
        auditSheetOperation(audit)
      ];
      application = await store.saveDraft({ applicationId: blank.id, expectedRevision: blank.revision, values, screen: 2, stage: "student", percentComplete: 0, guardianCount: blank.guardianCount || 2, emergencyCount: blank.emergencyCount || 2, savedAt: createdAt, formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion, revisionRecord: applicationRevision(next, { kind: "student_started", values, savedAt: createdAt, changed: changedFields(blank.values, values) }), outboxEvents: operations.map(operation => sheetOutbox(operation, clock())), auditEvents: [audit] });
    } else {
      const source = applications.find(app => app.id === invitation.applicationId) || applications[0];
      const sourceReference = recordFormReference(source || invitation, "application");
      const definition = await ensureDefinition(store, "application", sourceReference.formVersion);
      const guardianValues = Object.fromEntries(Object.entries(source?.values || {}).filter(([key]) => key.startsWith("app_guardian_0_")));
      const applicationId = id("app");
      const studentId = id("student");
      const values = { ...guardianValues, app_guardian_0_first: invitation.firstName || guardianValues.app_guardian_0_first || "", app_guardian_0_last: invitation.lastName || guardianValues.app_guardian_0_last || "", app_guardian_0_email: invitation.recipientEmail, student_first: studentFirstName, student_last: studentLastName };
      application = { id: applicationId, invitationId: invitation.id, sourceEoiId: "", contactId: invitation.contactId, studentId, recipientEmail: invitation.recipientEmail, status: "in_progress", revision: 0, values, guardianCount: 2, emergencyCount: 2, documents: {}, signatures: [], guardianIds: [id("guardian"), id("guardian")], currentStage: "student", percentComplete: 0, createdAt, updatedAt: createdAt, formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
      const expectedFamilyRevision = Number(invitation.familyRevision || 0);
      const nextInvitation = { ...invitation, applicationIds: [...invitationApplicationIds(invitation), applicationId], familyRevision: expectedFamilyRevision + 1 };
      const audit = createAuditEvent({ workflow: "application", recordId: applicationId, invitationId: invitation.id, type: "application.child_added", at: createdAt, actorId: invitation.contactId, stage: "selector", details: { familyApplicationCount: nextInvitation.applicationIds.length } });
      const operations = [
        sheetOperation("operations", "Students", { student_id: studentId, first_name: studentFirstName, last_name: studentLastName, date_of_birth: "", source: "family_entry", created_at: createdAt, updated_at: createdAt, schema_version: SCHEMA_VERSION }, ["student_id"]),
        sheetOperation("operations", "Application Invitations", { invitation_id: invitation.id, application_id: invitation.applicationId, application_ids_json: nextInvitation.applicationIds, recipient_contact_id: invitation.contactId, recipient_email: invitation.recipientEmail, student_id: invitation.studentId, source_eoi_id: invitation.sourceEoiId || "", status: invitation.status, created_at: invitation.createdAt, expires_at: iso(invitation.expiresAt), first_sent_at: invitation.firstSentAt, last_sent_at: invitation.lastSentAt, send_count: invitation.sendCount, ...projectionVersion(application, "application") }, ["invitation_id"]),
        sheetOperation("operations", "Progress", { application_id: applicationId, current_stage: "student", status: "in_progress", revision: 0, last_activity_at: createdAt, percent_complete: 0, ...projectionVersion(application, "application") }, ["application_id"]),
        sheetOperation("application", "Applications", mapApplicationRow(application), ["application_id"]),
        auditSheetOperation(audit)
      ];
      await store.addApplicationToInvitation({ invitation: nextInvitation, expectedFamilyRevision, application, revisionRecord: applicationRevision(application, { kind: "created", values, savedAt: createdAt, changed: Object.keys(values).sort() }), outboxEvents: operations.map(operation => sheetOutbox(operation, clock())), auditEvents: [audit] });
    }
    const sessionToken = await issueApplicationSession(invitation, application, session.email);
    return { sessionToken, expiresInSeconds: APPLICATION_SESSION_IDLE_MS / 1000, idleTimeoutSeconds: APPLICATION_SESSION_IDLE_MS / 1000, absoluteTimeoutSeconds: APPLICATION_SESSION_ABSOLUTE_MS / 1000, context: applicationContext(application), family: await familyApplicationContext(await store.getInvitationById(invitation.id)) };
  }

  async function getContext(event) {
    const session = await requireSession(event);
    const app = await store.getApplication(session.applicationId);
    if (!app) throw appError(404, "APPLICATION_NOT_FOUND", "The application was not found.");
    const definition = requireRecordDefinition(app, "application");
    await ensureDefinition(store, "application", definition.formVersion);
    return applicationContext(app);
  }

  async function saveDraft(event) {
    const session = await requireSession(event);
    const body = parseBody(event);
    const current = await store.getApplication(session.applicationId);
    if (!current || !["invited", "in_progress"].includes(current.status || "invited")) throw appError(409, "APPLICATION_NOT_EDITABLE", "This application is no longer editable.");
    if (Number(body.expectedRevision) !== Number(current.revision)) throw appError(409, "REVISION_CONFLICT", "The application changed before this save. Refresh and review the latest saved information.");
    const definition = requireRecordDefinition(current, "application", body);
    await ensureDefinition(store, "application", definition.formVersion);
    const incomingValues = applicationValidator(definition).sanitize(body.values);
    const values = { ...(current.values || {}), ...incomingValues };
    const guardianCount = Math.max(1, Math.min(6, Number(body.guardianCount || 1)));
    const emergencyCount = Math.max(2, Math.min(6, Number(body.emergencyCount || 2)));
    const saveMode = ["autosave", "navigation", "save_and_close", "submission"].includes(body.saveMode) ? body.saveMode : "navigation";
    const savedAt = nowIso();
    const nextRevision = Number(body.expectedRevision) + 1;
    const changed = changedFields(current.values, values);
    const audit = createAuditEvent({ workflow: "application", recordId: session.applicationId, invitationId: session.invitationId, type: saveMode === "autosave" ? "application.draft_autosaved" : "application.draft_saved", at: savedAt, actorId: session.email, stage: safeText(body.stage, 80), details: { revision: nextRevision, saveMode } });
    const operations = [
      sheetOperation("operations", "Progress", { application_id: session.applicationId, current_stage: safeText(body.stage, 80), status: "in_progress", revision: nextRevision, last_saved_at: savedAt, last_activity_at: savedAt, percent_complete: Math.max(0, Math.min(100, Number(body.percentComplete || 0))), schema_version: definition.schemaVersion, form_version: definition.formVersion, form_definition_hash: definition.definitionHash }, ["application_id"]),
      auditSheetOperation(audit)
    ];
    const revisionApp = { ...current, revision: nextRevision, values, screen: Number(body.screen || 0), currentStage: safeText(body.stage, 80), percentComplete: Math.max(0, Math.min(100, Number(body.percentComplete || 0))), guardianCount, emergencyCount, updatedAt: savedAt, status: "in_progress", formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
    const app = await store.saveDraft({ applicationId: session.applicationId, expectedRevision: body.expectedRevision, values, screen: revisionApp.screen, stage: revisionApp.currentStage, percentComplete: revisionApp.percentComplete, guardianCount, emergencyCount, savedAt, formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion, revisionRecord: applicationRevision(revisionApp, { kind: saveMode === "autosave" ? "draft_autosaved" : "draft_saved", values, savedAt, saveMode, changed }), outboxEvents: operations.map(operation => sheetOutbox(operation, clock())), auditEvents: [audit] });
    return applicationContext(app);
  }

  async function startUpload(event) {
    const session = await requireSession(event);
    const body = parseBody(event, 20_000);
    const category = safeText(body.category, 80);
    const mimeType = safeText(body.mimeType, 160).toLowerCase();
    const size = Number(body.size);
    const checksumSha256 = safeText(body.checksumSha256, 100);
    if (!DOCUMENT_CATEGORIES.includes(category) || !MIME_TYPES.has(mimeType) || !Number.isInteger(size) || size < 1 || size > MAX_FILE_BYTES || !/^[A-Za-z0-9+/]{43}=$/.test(checksumSha256)) throw appError(422, "INVALID_DOCUMENT", "This file type, document category, checksum or file size is not accepted.");
    const uploadId = id("upload");
    const result = await artifacts.createUpload({ uploadId, applicationId: session.applicationId, category, fileName: safeText(body.fileName, 220), mimeType, size, checksumSha256 });
    await store.putUpload(result.upload);
    return { uploadUrl: result.uploadUrl, uploadHeaders: result.uploadHeaders, documentId: result.documentId ?? uploadId, expiresInSeconds: 900 };
  }

  async function confirmUpload(event) {
    const session = await requireSession(event);
    const body = parseBody(event, 20_000);
    const category = safeText(body.category, 80);
    const documentId = safeText(body.documentId, 300);
    const googleDriveUpload = artifacts.storageProvider === "google_drive";
    const upload = googleDriveUpload ? null : await store.getUpload(documentId);
    if (!googleDriveUpload && (!upload || upload.applicationId !== session.applicationId || upload.category !== category || upload.expiresAt <= clock())) throw appError(422, "DOCUMENT_UPLOAD_EXPIRED", "This document upload has expired. Upload the file again.");
    const document = googleDriveUpload
      ? await artifacts.confirmUpload({ applicationId: session.applicationId, category, documentId })
      : await artifacts.confirmUpload(upload);
    document.id = document.documentId;
    const audit = createAuditEvent({ workflow: "application", recordId: session.applicationId, invitationId: session.invitationId, type: "application.document_uploaded", at: nowIso(), actorId: session.email, stage: "documents", details: { category, documentId: document.documentId, malwareScanStatus: document.malwareScanStatus } });
    await store.attachDocument({ applicationId: session.applicationId, document, uploadId: documentId, outboxEvents: [sheetOutbox(auditSheetOperation(audit), clock())], auditEvents: [audit] });
    return { document };
  }

  async function submitApplication(event) {
    const session = await requireSession(event);
    const body = parseBody(event);
    const app = await store.getApplication(session.applicationId);
    if (!app || !["invited", "in_progress"].includes(app.status)) throw appError(409, "APPLICATION_NOT_EDITABLE", "This application is no longer editable.");
    if (Number(body.expectedRevision) !== Number(app.revision)) throw appError(409, "REVISION_CONFLICT", "The application changed after review. Review the latest saved version before signing.");
    const definition = requireRecordDefinition(app, "application", body);
    await ensureDefinition(store, "application", definition.formVersion);
    const guardianCount = Math.max(1, Math.min(6, Number(app.guardianCount || 1)));
    const values = applicationValidator(definition).validate(app.values, guardianCount, app.emergencyCount || 2);
    const additionalSignatureRecipients = additionalGuardianSignatureRecipients(values, guardianCount);
    if (additionalSignatureRecipients.length !== guardianCount - 1) throw appError(422, "SIGNATURE_RECIPIENT_REQUIRED", "Each additional parent or guardian needs a valid email address before the application can be submitted.");
    if (!(app.documents?.birth_certificate || []).length) throw appError(422, "DOCUMENT_REQUIRED", "Upload the student's birth certificate before submitting.", { missing: ["birth_certificate"] });
    const unsafeDocuments = Object.values(app.documents || {}).flat().filter(document => document.malwareScanStatus !== "no_threats_found" && !(allowUnscannedGoogleDocuments && document.storageProvider === "google_drive"));
    if (unsafeDocuments.length) throw appError(422, "DOCUMENT_SCAN_REQUIRED", "Every uploaded document must pass its security check before the application can be submitted.");
    const bytes = signatureBytes(body.signatureDataUrl);
    const primaryGuardianId = app.guardianIds[0];
    const primarySignatureId = id("sig");
    const revisionHash = sha256(json({ values, documents: app.documents, revision: app.revision, formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash }));
    const snapshotPayload = { applicationId: app.id, invitationId: app.invitationId, sourceEoiId: app.sourceEoiId || null, revision: app.revision, revisionHash, values, documents: app.documents, submittedAt: nowIso(), formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
    const [snapshot, signatureFile] = await Promise.all([artifacts.storeApplicationSnapshot({ applicationId: app.id, revision: app.revision, snapshot: snapshotPayload }), artifacts.storeSignature({ applicationId: app.id, guardianId: primaryGuardianId, signatureId: primarySignatureId, data: bytes })]);
    const signedAt = nowIso();
    const primarySignature = { id: primarySignatureId, guardianId: primaryGuardianId, signerName: `${values.app_guardian_0_first} ${values.app_guardian_0_last}`.trim(), signerEmail: normalizeEmail(values.app_guardian_0_email), signedAt, revision: app.revision, revisionHash, fileId: signatureFile.id, storageProvider: signatureFile.storageProvider, storageVersionId: signatureFile.storageVersionId, networkFingerprint: networkFingerprint(event), ipAcknowledged: values.application_signature_ip, termsAcknowledged: values.application_signature_terms };
    const signatureTasks = [];
    const taskEmails = [];
    for (const recipient of additionalSignatureRecipients) {
      const index = recipient.index;
      const guardianId = app.guardianIds[index] || id("guardian");
      app.guardianIds[index] = guardianId;
      const email = recipient.email;
      const rawTask = token();
      const task = { tokenHash: sha256(rawTask), applicationId: app.id, guardianId, guardianIndex: index, email, status: "invited", revision: app.revision, revisionHash, createdAt: clock(), expiresAt: clock() + 14 * 86400_000, ttl: Math.floor((clock() + 30 * 86400_000) / 1000) };
      signatureTasks.push(task);
      const signingUrl = `${signingPageUrl}?task=${encodeURIComponent(rawTask)}`;
      taskEmails.push({ to: email, ...signatureInvitation({ firstName: recipient.firstName, studentName: `${values.student_first} ${values.student_last}`, signingUrl }), tags: { workflow: "application", message_type: "signature_invitation" } });
    }
    const requiredSignatureCount = 1 + signatureTasks.length;
    const status = requiredSignatureCount > 1 ? "pending_signatures" : "submitted";
    const reference = `APP-${new Date(clock()).getFullYear()}-${token(5).toUpperCase()}`;
    const next = { ...app, values, status, reference, requiredSignatureCount, signatures: [primarySignature], snapshotFileId: snapshot.id, snapshotStorageProvider: snapshot.storageProvider, snapshotStorageVersionId: snapshot.storageVersionId, revisionHash, submittedAt: signedAt, completedAt: status === "submitted" ? signedAt : "", updatedAt: signedAt, formVersion: definition.formVersion, formDefinitionHash: definition.definitionHash, schemaVersion: definition.schemaVersion };
    const { guardians, emergencyContacts } = splitApplication(values, app.id, guardianCount, app.emergencyCount || 2);
    const invitation = await store.getInvitationById(app.invitationId);
    const audit = createAuditEvent({ workflow: "application", recordId: app.id, invitationId: app.invitationId, type: "application.submitted", at: signedAt, actorId: session.email, stage: "signature", details: { reference, status, revision: app.revision } });
    const operations = [
      sheetOperation("application", "Applications", mapApplicationRow(next), ["application_id"]),
      sheetOperation("application", "Student", studentRow(next, values), ["application_id"]),
      ...guardians.map((guardian, index) => sheetOperation("application", "Guardians", guardianRow(next, guardian, index, index === 0 ? "signed" : "pending"), ["application_id", "guardian_id"])),
      ...emergencyContacts.map((contact, index) => sheetOperation("application", "Emergency Contacts", emergencyRow(next, contact, index), ["application_id", "emergency_contact_id"])),
      sheetOperation("application", "Conditions", conditionsRow(next, values), ["application_id"]),
      sheetOperation("application", "Signatures", { application_id: app.id, signature_id: primarySignature.id, guardian_id: primaryGuardianId, signer_name: primarySignature.signerName, signer_email: primarySignature.signerEmail, signature_status: "signed", signed_at: signedAt, revision: app.revision, revision_hash: revisionHash, signature_file_id: signatureFile.id, network_fingerprint: primarySignature.networkFingerprint, ip_recording_acknowledged: values.application_signature_ip, application_terms_acknowledged: values.application_signature_terms, one_signature_explanation: values.application_one_signature_reason, additional_information: values.application_additional_information, ...projectionVersion(next, "application") }, ["signature_id"]),
      ...Object.values(app.documents || {}).flat().map(document => sheetOperation("application", "Documents", { application_id: app.id, document_id: document.id, category: document.category, original_file_name: document.fileName, mime_type: document.mimeType, size_bytes: document.size, drive_file_id: document.storageProvider === "s3" ? "" : document.documentId, storage_provider: document.storageProvider || "legacy", storage_key: document.storageKey || "", storage_version_id: document.storageVersionId || "", uploaded_at: document.uploadedAt, sha256: document.checksum, malware_scan_status: document.malwareScanStatus, ...projectionVersion(next, "application") }, ["document_id"])),
      auditSheetOperation(audit),
      sheetOperation("operations", "Progress", { application_id: app.id, current_stage: status === "submitted" ? "complete" : "guardian_signatures", status, revision: app.revision, last_saved_at: app.updatedAt, last_activity_at: signedAt, percent_complete: status === "submitted" ? 100 : 95, ...projectionVersion(next, "application") }, ["application_id"]),
      sheetOperation("operations", "Application Invitations", { invitation_id: app.invitationId, application_id: invitation?.applicationId || app.id, application_ids_json: invitationApplicationIds(invitation || { applicationId: app.id }), recipient_contact_id: app.contactId, recipient_email: app.recipientEmail, student_id: invitation?.studentId || app.studentId, source_eoi_id: invitation?.sourceEoiId || app.sourceEoiId, status: invitation?.status || "active", created_at: invitation?.createdAt || app.createdAt, expires_at: invitation?.expiresAt ? iso(invitation.expiresAt) : "", first_sent_at: invitation?.firstSentAt || "", last_sent_at: invitation?.lastSentAt || "", send_count: invitation?.sendCount || 1, opened_at: invitation?.openedAt || "", verified_at: invitation?.verifiedAt || "", submitted_at: signedAt, ...projectionVersion(next, "application") }, ["invitation_id"]),
      emailEvent({ messageType: "application_submitted", workflow: "application", recordId: app.id, recipientEmail: app.recipientEmail, at: signedAt }),
      ...taskEmails.map(mail => emailEvent({ messageType: "signature_invitation", workflow: "application", recordId: app.id, recipientEmail: mail.to, at: signedAt }))
    ];
    const confirmation = applicationSubmitted({ firstName: values.app_guardian_0_first, studentName: `${values.student_first} ${values.student_last}`, reference, pendingSignatures: status === "pending_signatures" });
    const emailEvents = [emailOutbox({ to: app.recipientEmail, ...confirmation, tags: { workflow: "application", message_type: "submitted" } }, clock()), ...taskEmails.map(mail => emailOutbox(mail, clock()))];
    await store.submitApplication({ applicationId: app.id, expectedRevision: app.revision, application: next, revisionRecord: applicationRevision(next, { kind: "submitted", values, savedAt: signedAt, saveMode: "submission" }), signatureTasks, outboxEvents: [...emailEvents, ...operations.map(operation => sheetOutbox(operation, clock()))], auditEvents: [audit] });
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
    const signatureId = id("sig");
    const signatureFile = await artifacts.storeSignature({ applicationId: app.id, guardianId: session.guardianId, signatureId, data: bytes });
    const signedAt = nowIso();
    const signature = { id: signatureId, guardianId: session.guardianId, signerName: `${app.values[`app_guardian_${session.guardianIndex}_first`]} ${app.values[`app_guardian_${session.guardianIndex}_last`]}`.trim(), signerEmail: session.email, signedAt, revision: app.revision, revisionHash: app.revisionHash, fileId: signatureFile.id, storageProvider: signatureFile.storageProvider, storageVersionId: signatureFile.storageVersionId, networkFingerprint: networkFingerprint(event), reviewAcknowledged: true, ipAcknowledged: true, termsAcknowledged: true };
    const signatures = [...(app.signatures || []), signature];
    const status = signatures.length >= app.requiredSignatureCount ? "submitted" : "pending_signatures";
    const next = { ...app, signatures, status, completedAt: status === "submitted" ? signedAt : "", updatedAt: signedAt };
    const audit = createAuditEvent({ workflow: "application", recordId: app.id, invitationId: app.invitationId, type: "application.guardian_signed", at: signedAt, actorId: session.email, stage: "guardian_signature", details: { guardianId: session.guardianId, reviewAcknowledged: true, status } });
    const operations = [
      sheetOperation("application", "Applications", mapApplicationRow(next), ["application_id"]),
      sheetOperation("application", "Guardians", guardianRow(next, splitApplication(app.values, app.id, app.guardianCount, app.emergencyCount || 2).guardians[session.guardianIndex], session.guardianIndex, "signed"), ["application_id", "guardian_id"]),
      sheetOperation("application", "Signatures", { application_id: app.id, signature_id: signature.id, guardian_id: signature.guardianId, signer_name: signature.signerName, signer_email: signature.signerEmail, signature_status: "signed", signed_at: signedAt, revision: app.revision, revision_hash: app.revisionHash, signature_file_id: signature.fileId, network_fingerprint: signature.networkFingerprint, ip_recording_acknowledged: "Confirmed", application_terms_acknowledged: "Confirmed", ...projectionVersion(next, "application") }, ["signature_id"]),
      auditSheetOperation(audit),
      sheetOperation("operations", "Progress", { application_id: app.id, current_stage: status === "submitted" ? "complete" : "guardian_signatures", status, revision: app.revision, last_saved_at: app.updatedAt, last_activity_at: signedAt, percent_complete: status === "submitted" ? 100 : 95, ...projectionVersion(next, "application") }, ["application_id"])
    ];
    const emails = [];
    if (status === "submitted") {
      for (let index = 0; index < app.guardianCount; index += 1) {
        const to = normalizeEmail(app.values[`app_guardian_${index}_email`]);
        if (to) emails.push(emailOutbox({ to, ...applicationComplete({ firstName: app.values[`app_guardian_${index}_first`], studentName: `${app.values.student_first} ${app.values.student_last}`, reference: app.reference }), tags: { workflow: "application", message_type: "complete" } }, clock()));
      }
    }
    await store.completeSignature({ applicationId: app.id, taskTokenHash: session.taskTokenHash, application: next, outboxEvents: [...emails, ...operations.map(operation => sheetOutbox(operation, clock()))], auditEvents: [audit] });
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
    ["GET /v6/health", async () => ({ status: "ok", schemaVersion: SCHEMA_VERSION, formVersions: { eoi: currentFormDefinition("eoi").formVersion, application: currentFormDefinition("application").formVersion } })],
    ["POST /v6/session/logout", logoutSession],
    ["POST /v6/staff/access/request-code", requestStaffCode],
    ["POST /v6/staff/access/verify-code", verifyStaffCode],
    ["GET /v6/staff/dashboard", getStaffDashboard],
    ["POST /v6/staff/applications/detail", getStaffApplicationDetail],
    ["POST /v6/staff/applications/revision", getStaffApplicationRevision],
    ["POST /v6/staff/invitations", createStaffInvitation],
    ["POST /v6/staff/invitations/resend", resendStaffInvitation],
    ["POST /v6/eoi", submitEoi],
    ["POST /v6/application/access/request-code", requestApplicationCode],
    ["POST /v6/application/access/verify-code", verifyApplicationCode],
    ["POST /v6/application/records/select", selectFamilyApplication],
    ["POST /v6/application/records", startFamilyApplication],
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
