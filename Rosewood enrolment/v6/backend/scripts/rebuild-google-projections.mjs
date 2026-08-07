import { DynamoStore } from "../dynamo-store.mjs";
import { recordFormReference } from "../form-definitions.mjs";
import { GoogleSheetsStore } from "../google-sheets.mjs";
import { loadSecret } from "../index.mjs";
import { SCHEMA_VERSION, splitApplication } from "../schema.mjs";
import { auditSheetOperation, conditionsRow, emergencyRow, guardianRow, mapApplicationRow, mapEoiRow, studentRow } from "../service.mjs";

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=REBUILD_GOOGLE_PROJECTIONS");
if (apply && !confirmed) throw new Error("Applying requires --confirm=REBUILD_GOOGLE_PROJECTIONS.");

const config = { ...process.env, ...await loadSecret() };
for (const key of ["ROSEWOOD_TABLE_NAME", "ROSEWOOD_AUDIT_TABLE_NAME"]) {
  if (!config[key]) throw new Error(`${key} is required.`);
}

const store = new DynamoStore({ tableName: config.ROSEWOOD_TABLE_NAME, auditTableName: config.ROSEWOOD_AUDIT_TABLE_NAME });
const rows = new Map();
const add = (workbook, sheet, record) => {
  const key = `${workbook}:${sheet}`;
  const records = rows.get(key) || [];
  records.push(record);
  rows.set(key, records);
};
const formColumns = (record, workflow) => {
  const reference = recordFormReference(record, workflow);
  return { schema_version: reference.schemaVersion || SCHEMA_VERSION, form_version: reference.formVersion, form_definition_hash: reference.formDefinitionHash };
};

const records = await store.listOperationalRecords();
const eois = records.filter(item => item.entity === "eoi").map(item => item.data);
const applications = records.filter(item => item.entity === "application").map(item => item.data);
const invitations = records.filter(item => item.entity === "invitation_index").map(item => item.data);
const emailReceipts = records.filter(item => item.entity === "outbox_receipt" && item.data?.kind === "email").map(item => item.data);
const audits = await store.listAudit(5000);

for (const eoi of eois) {
  add("eoi", "EOIs", mapEoiRow(eoi));
  add("operations", "Contacts", { contact_id: eoi.contactId, email: eoi.values?.eoi_email, first_name: eoi.values?.eoi_first, last_name: eoi.values?.eoi_last, mobile_phone: eoi.values?.eoi_mobile, source: "eoi", created_at: eoi.submittedAt, updated_at: eoi.submittedAt, schema_version: SCHEMA_VERSION });
  add("operations", "Students", { student_id: eoi.studentId, first_name: eoi.values?.eoi_student_first, last_name: eoi.values?.eoi_student_last, date_of_birth: eoi.values?.eoi_dob, source: "eoi", created_at: eoi.submittedAt, updated_at: eoi.submittedAt, schema_version: SCHEMA_VERSION });
}

for (const app of applications) {
  add("application", "Applications", mapApplicationRow(app));
  add("application", "Student", studentRow(app, app.values || {}));
  const { guardians, emergencyContacts } = splitApplication(app.values || {}, app.id, app.guardianCount || 1, app.emergencyCount || 2);
  guardians.forEach((guardian, index) => add("application", "Guardians", guardianRow(app, guardian, index, app.signatures?.some(signature => signature.guardianId === app.guardianIds?.[index]) ? "signed" : "pending")));
  emergencyContacts.forEach((contact, index) => add("application", "Emergency Contacts", emergencyRow(app, contact, index)));
  add("application", "Conditions", conditionsRow(app, app.values || {}));
  for (const document of Object.values(app.documents || {}).flat()) {
    add("application", "Documents", { application_id: app.id, document_id: document.id || document.documentId, category: document.category, original_file_name: document.fileName, mime_type: document.mimeType, size_bytes: document.size, drive_file_id: document.storageProvider === "s3" ? "" : document.documentId, storage_provider: document.storageProvider || "legacy", storage_key: document.storageKey || "", storage_version_id: document.storageVersionId || "", uploaded_at: document.uploadedAt, sha256: document.checksum, malware_scan_status: document.malwareScanStatus, ...formColumns(app, "application") });
  }
  for (const signature of app.signatures || []) {
    add("application", "Signatures", { application_id: app.id, signature_id: signature.id, guardian_id: signature.guardianId, signer_name: signature.signerName, signer_email: signature.signerEmail, signature_status: "signed", signed_at: signature.signedAt, revision: signature.revision, revision_hash: signature.revisionHash, signature_file_id: signature.fileId, network_fingerprint: signature.networkFingerprint, ip_recording_acknowledged: signature.ipAcknowledged, application_terms_acknowledged: signature.termsAcknowledged, ...formColumns(app, "application") });
  }
  add("operations", "Progress", { application_id: app.id, current_stage: app.currentStage || (app.status === "submitted" ? "complete" : "gateway"), status: app.status, revision: app.revision, last_saved_at: app.updatedAt, last_activity_at: app.updatedAt, percent_complete: app.percentComplete ?? (app.status === "submitted" ? 100 : 0), ...formColumns(app, "application") });
  add("operations", "Contacts", { contact_id: app.contactId, email: app.recipientEmail, first_name: app.values?.app_guardian_0_first, last_name: app.values?.app_guardian_0_last, mobile_phone: app.values?.app_guardian_0_mobile, source: "application", created_at: app.createdAt, updated_at: app.updatedAt, schema_version: SCHEMA_VERSION });
  add("operations", "Students", { student_id: app.studentId, first_name: app.values?.student_first, last_name: app.values?.student_last, date_of_birth: app.values?.student_dob, source: "application", created_at: app.createdAt, updated_at: app.updatedAt, schema_version: SCHEMA_VERSION });
  if (app.sourceEoiId) add("operations", "Workflow Links", { link_id: `eoi-${app.sourceEoiId}-application-${app.id}`, source_workflow: "eoi", source_record_id: app.sourceEoiId, target_workflow: "application", target_record_id: app.id, linked_by: "staff", linked_at: app.createdAt, prefill_fields_json: {}, ...formColumns(app, "application") });
}

for (const invitation of invitations) {
  add("operations", "Application Invitations", { invitation_id: invitation.id, application_id: invitation.applicationId, recipient_contact_id: invitation.contactId, recipient_email: invitation.recipientEmail, student_id: invitation.studentId, source_eoi_id: invitation.sourceEoiId || "", status: invitation.status, created_at: invitation.createdAt, expires_at: invitation.expiresAt ? new Date(invitation.expiresAt).toISOString() : "", first_sent_at: invitation.firstSentAt, last_sent_at: invitation.lastSentAt, send_count: invitation.sendCount, opened_at: invitation.openedAt || "", verified_at: invitation.verifiedAt || "", submitted_at: invitation.submittedAt || "", ...formColumns(invitation, "application") });
}

for (const receipt of emailReceipts) {
  add("operations", "Email Events", { email_event_id: receipt.id, occurred_at: receipt.completedAt || receipt.createdAt, message_type: receipt.payload?.tags?.message_type || "transactional_email", workflow: receipt.payload?.tags?.workflow || "application", record_id: receipt.payload?.tags?.record_id || "", recipient_email: receipt.payload?.to || "", ses_message_id: receipt.result?.messageId || "", delivery_status: receipt.result?.messageId ? "sent_to_ses" : "completed", schema_version: SCHEMA_VERSION });
}

for (const audit of audits) {
  const operation = auditSheetOperation(audit);
  add(operation.workbook, operation.sheet, operation.record);
}

const sheets = [
  ["eoi", "EOIs"], ["eoi", "EOI Audit"],
  ["application", "Applications"], ["application", "Student"], ["application", "Guardians"], ["application", "Emergency Contacts"], ["application", "Documents"], ["application", "Conditions"], ["application", "Signatures"], ["application", "Application Audit"],
  ["operations", "Contacts"], ["operations", "Students"], ["operations", "Application Invitations"], ["operations", "Workflow Links"], ["operations", "Progress"], ["operations", "Email Events"], ["operations", "Audit"]
];

const matchKeys = {
  "eoi:EOIs": ["eoi_id"], "eoi:EOI Audit": ["event_id"],
  "application:Applications": ["application_id"], "application:Student": ["application_id"], "application:Guardians": ["application_id", "guardian_id"], "application:Emergency Contacts": ["application_id", "emergency_contact_id"], "application:Documents": ["document_id"], "application:Conditions": ["application_id"], "application:Signatures": ["signature_id"], "application:Application Audit": ["event_id"],
  "operations:Contacts": ["contact_id"], "operations:Students": ["student_id"], "operations:Application Invitations": ["invitation_id"], "operations:Workflow Links": ["link_id"], "operations:Progress": ["application_id"], "operations:Email Events": ["email_event_id"], "operations:Audit": ["event_id"]
};
for (const [workbook, sheet] of sheets) {
  const key = `${workbook}:${sheet}`;
  const fields = matchKeys[key];
  const unique = new Map((rows.get(key) || []).map(record => [fields.map(field => String(record[field] ?? "")).join("\u0000"), record]));
  rows.set(key, [...unique.values()]);
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", counts: Object.fromEntries(sheets.map(([workbook, sheet]) => [`${workbook}:${sheet}`, (rows.get(`${workbook}:${sheet}`) || []).length])) }, null, 2));
if (!apply) process.exit(0);

const auth = { authMode: config.GOOGLE_AUTH_MODE, serviceAccountEmail: config.GOOGLE_SERVICE_ACCOUNT_EMAIL, privateKey: config.GOOGLE_PRIVATE_KEY, oauthClientId: config.GOOGLE_OAUTH_CLIENT_ID, oauthClientSecret: config.GOOGLE_OAUTH_CLIENT_SECRET, oauthRefreshToken: config.GOOGLE_OAUTH_REFRESH_TOKEN };
const projection = new GoogleSheetsStore({ auth, eoiSpreadsheetId: config.GOOGLE_EOI_SPREADSHEET_ID, applicationSpreadsheetId: config.GOOGLE_APPLICATION_SPREADSHEET_ID, operationsSpreadsheetId: config.GOOGLE_OPERATIONS_SPREADSHEET_ID });
for (const [workbook, sheet] of sheets) await projection.replace(workbook, sheet, rows.get(`${workbook}:${sheet}`) || []);
console.log("Google reporting projections rebuilt from authoritative AWS records.");
