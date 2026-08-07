import { GoogleAccessTokenProvider } from "./google-auth.mjs";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const headers = {
  eoi: {
    "EOIs": ["eoi_id", "submitted_at", "status", "primary_contact_id", "student_id", "language", "salutation", "primary_contact_first_name", "primary_contact_last_name", "relationship", "email", "mobile_phone", "contact_address", "suburb", "state", "postcode", "country", "student_first_name", "student_last_name", "date_of_birth", "gender", "religion", "entry_year", "entry_year_level", "current_school", "current_year_level", "additional_needs", "need_categories", "family_connection", "other_children", "discovery_source", "additional_information", "snapshot_file_id", "network_fingerprint", "schema_version", "reference"],
    "EOI Audit": ["event_id", "occurred_at", "eoi_id", "event_type", "actor_type", "actor_id", "details_json", "schema_version"]
  },
  application: {
    "Applications": ["application_id", "invitation_id", "source_eoi_id", "status", "reference", "recipient_email", "student_id", "student_first_name", "student_last_name", "created_at", "updated_at", "submitted_at", "completed_at", "revision", "required_signature_count", "completed_signature_count", "snapshot_file_id", "schema_version"],
    "Student": ["application_id", "student_id", "first_name", "middle_name", "last_name", "preferred_name", "date_of_birth", "gender", "religion", "religion_other", "current_year_level", "entry_year", "entry_year_level", "current_school", "current_school_other", "share_address_with_guardians", "care_arrangement", "care_arrangement_other", "shared_parenting_schedule", "address", "suburb", "state", "postcode", "country", "future_siblings", "future_sibling_count", "country_of_residence", "country_of_birth", "nationality", "ethnicity", "arrival_or_return_date", "residency_status", "australian_citizen", "residency_evidence", "visa_subclass", "visa_expiry", "previous_visa_subclass", "indigenous_status", "main_language", "other_languages", "additional_needs", "need_categories", "need_other", "health_professionals", "health_professional_other", "reports_attached", "ndis_support", "court_or_parenting_orders", "other_relevant_information", "parish", "sacraments_json", "medical_conditions", "other_medical_condition", "condition_details", "allergy_details", "anaphylaxis_risk", "anaphylaxis_device", "immunisation_status", "humanitarian_health_check", "doctor_name", "doctor_practice_address", "doctor_phone", "medicare_number", "medicare_expiry", "private_health_insurance", "ambulance_cover", "health_care_card", "schema_version"],
    "Guardians": ["application_id", "guardian_id", "position", "share_with_other_contacts", "salutation", "first_name", "last_name", "email", "mobile_phone", "home_phone", "work_phone", "relationship", "contact_type", "marital_status", "religion", "sms_messaging", "health_care_card", "health_care_card_number", "health_care_card_expiry", "residential_address", "suburb", "state", "postcode", "country", "postal_same_as_residential", "postal_address", "postal_suburb", "postal_state", "postal_postcode", "postal_country", "occupational_group", "occupation", "employer", "school_level_education", "university_further_education", "country_of_birth", "nationality", "ethnicity", "languages", "residency_status", "visa_subclass", "visa_expiry", "indigenous_status", "contact_permission", "signature_required", "signature_status", "schema_version"],
    "Emergency Contacts": ["application_id", "emergency_contact_id", "position", "first_name", "last_name", "relationship", "mobile_phone", "home_phone", "work_phone", "email", "schema_version"],
    "Documents": ["application_id", "document_id", "category", "original_file_name", "mime_type", "size_bytes", "drive_file_id", "uploaded_at", "sha256", "malware_scan_status", "schema_version", "storage_provider", "storage_key", "storage_version_id"],
    "Conditions": ["application_id", "previous_school_permission", "previous_school_name", "previous_school_address", "previous_school_interstate", "fee_option", "fee_account_recipient", "guardian_a_name", "guardian_a_percentage", "guardian_b_name", "guardian_b_percentage", "fee_responsibility_date", "discovery_source", "influence_factors", "schema_version"],
    "Signatures": ["application_id", "signature_id", "guardian_id", "signer_name", "signer_email", "signature_status", "signed_at", "revision", "revision_hash", "signature_file_id", "network_fingerprint", "ip_recording_acknowledged", "application_terms_acknowledged", "one_signature_explanation", "additional_information", "schema_version"],
    "Application Audit": ["event_id", "occurred_at", "application_id", "invitation_id", "event_type", "stage", "actor_type", "actor_id", "details_json", "schema_version"]
  },
  operations: {
    "Contacts": ["contact_id", "email", "first_name", "last_name", "mobile_phone", "source", "created_at", "updated_at", "schema_version"],
    "Students": ["student_id", "first_name", "last_name", "date_of_birth", "source", "created_at", "updated_at", "schema_version"],
    "Application Invitations": ["invitation_id", "application_id", "recipient_contact_id", "recipient_email", "student_id", "source_eoi_id", "status", "created_at", "expires_at", "first_sent_at", "last_sent_at", "send_count", "opened_at", "verified_at", "submitted_at", "schema_version", "application_ids_json"],
    "Workflow Links": ["link_id", "source_workflow", "source_record_id", "target_workflow", "target_record_id", "linked_by", "linked_at", "prefill_fields_json", "schema_version"],
    "Progress": ["application_id", "current_stage", "status", "revision", "last_saved_at", "last_activity_at", "percent_complete", "schema_version"],
    "Email Events": ["email_event_id", "occurred_at", "message_type", "workflow", "record_id", "recipient_email", "ses_message_id", "delivery_status", "bounce_type", "complaint_type", "details_json", "schema_version"],
    "Audit": ["event_id", "occurred_at", "workflow", "record_id", "event_type", "actor_type", "actor_id", "details_json", "schema_version"]
  }
};

function columnName(index) {
  let result = "";
  let value = index + 1;
  while (value > 0) { value -= 1; result = String.fromCharCode(65 + (value % 26)) + result; value = Math.floor(value / 26); }
  return result;
}

function quoteSheet(name) {
  return `'${name.replaceAll("'", "''")}'`;
}

function cell(value) {
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  return value ?? "";
}

export class GoogleSheetsStore {
  constructor({ auth, eoiSpreadsheetId, applicationSpreadsheetId, operationsSpreadsheetId, fetchImpl = fetch }) {
    this.tokenProvider = new GoogleAccessTokenProvider({ ...auth, scope: SHEETS_SCOPE, fetchImpl });
    this.ids = { eoi: eoiSpreadsheetId, application: applicationSpreadsheetId, operations: operationsSpreadsheetId };
    this.fetch = fetchImpl;
    this.readyHeaders = new Set();
  }

  async request(url, options = {}) {
    const response = await this.fetch(url, { ...options, headers: { Authorization: `Bearer ${await this.tokenProvider.accessToken()}`, "Content-Type": "application/json", ...(options.headers || {}) } });
    if (!response.ok) throw new Error(`Google Sheets request failed with ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return response;
  }

  row(workbook, sheet, record) {
    return headers[workbook][sheet].map(key => cell(record[key]));
  }

  async ensureHeaders(workbook, sheet) {
    const key = `${workbook}:${sheet}`;
    if (this.readyHeaders.has(key)) return;
    const spreadsheetId = this.ids[workbook];
    const expected = headers[workbook]?.[sheet];
    if (!spreadsheetId || !expected) throw new Error("Unknown Google Sheets workbook or tab.");
    const rangeName = `${quoteSheet(sheet)}!A1:${columnName(expected.length - 1)}1`;
    const response = await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeName)}?majorDimension=ROWS`);
    const current = (await response.json()).values?.[0] || [];
    if (expected.some((value, index) => current[index] !== value) || current.length !== expected.length) {
      await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeName)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ range: rangeName, majorDimension: "ROWS", values: [expected] }) });
    }
    this.readyHeaders.add(key);
  }

  async append(workbook, sheet, record) {
    await this.ensureHeaders(workbook, sheet);
    const spreadsheetId = this.ids[workbook];
    const width = headers[workbook][sheet].length;
    const range = encodeURIComponent(`${quoteSheet(sheet)}!A:${columnName(width - 1)}`);
    await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: JSON.stringify({ values: [this.row(workbook, sheet, record)] }) });
  }

  async upsert(workbook, sheet, record, matchKeys) {
    await this.ensureHeaders(workbook, sheet);
    const spreadsheetId = this.ids[workbook];
    const sheetHeaders = headers[workbook][sheet];
    const width = sheetHeaders.length;
    const rangeName = `${quoteSheet(sheet)}!A:${columnName(width - 1)}`;
    const response = await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeName)}?majorDimension=ROWS`);
    const values = (await response.json()).values || [];
    const indexes = matchKeys.map(key => sheetHeaders.indexOf(key));
    const target = indexes.map(index => String(cell(record[sheetHeaders[index]])));
    const rowIndex = values.slice(1).findIndex(row => indexes.every((index, position) => String(row[index] ?? "") === target[position]));
    const row = this.row(workbook, sheet, record);
    if (rowIndex < 0) return this.append(workbook, sheet, record);
    const writeRange = `${quoteSheet(sheet)}!A${rowIndex + 2}:${columnName(width - 1)}${rowIndex + 2}`;
    await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ range: writeRange, majorDimension: "ROWS", values: [row] }) });
  }

  async list(workbook, sheet, { limit = 500 } = {}) {
    const sheetHeaders = headers[workbook]?.[sheet];
    const spreadsheetId = this.ids[workbook];
    if (!sheetHeaders || !spreadsheetId) throw new Error("Unknown Google Sheets workbook or tab.");
    await this.ensureHeaders(workbook, sheet);
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 500));
    const rangeName = `${quoteSheet(sheet)}!A1:${columnName(sheetHeaders.length - 1)}${safeLimit + 1}`;
    const response = await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeName)}?majorDimension=ROWS`);
    const values = (await response.json()).values || [];
    return values.slice(1).map(row => Object.fromEntries(sheetHeaders.map((key, index) => [key, row[index] ?? ""])));
  }

  async replace(workbook, sheet, records) {
    const spreadsheetId = this.ids[workbook];
    const sheetHeaders = headers[workbook]?.[sheet];
    if (!sheetHeaders || !spreadsheetId) throw new Error("Unknown Google Sheets workbook or tab.");
    await this.ensureHeaders(workbook, sheet);
    const lastColumn = columnName(sheetHeaders.length - 1);
    const clearRange = `${quoteSheet(sheet)}!A2:${lastColumn}`;
    await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`, { method: "POST", body: "{}" });
    if (!records.length) return { replaced: 0 };
    const writeRange = `${quoteSheet(sheet)}!A2:${lastColumn}${records.length + 1}`;
    await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ range: writeRange, majorDimension: "ROWS", values: records.map(record => this.row(workbook, sheet, record)) }) });
    return { replaced: records.length };
  }

  async apply(operation) {
    if (operation.mode === "append") return this.append(operation.workbook, operation.sheet, operation.record);
    return this.upsert(operation.workbook, operation.sheet, operation.record, operation.matchKeys);
  }
}

export function sheetOperation(workbook, sheet, record, matchKeys = []) {
  return { kind: "sheet", mode: matchKeys.length ? "upsert" : "append", workbook, sheet, record, matchKeys };
}
