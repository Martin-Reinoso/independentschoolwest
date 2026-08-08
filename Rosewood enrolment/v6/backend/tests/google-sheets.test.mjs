import assert from "node:assert/strict";
import test from "node:test";
import { GoogleSheetsStore } from "../google-sheets.mjs";

const auth = {
  authMode: "user_oauth",
  oauthClientId: "client",
  oauthClientSecret: "secret",
  oauthRefreshToken: "refresh"
};

test("document projection extends legacy headers without shifting existing columns", async () => {
  const writes = [];
  const legacyHeaders = ["application_id", "document_id", "category", "original_file_name", "mime_type", "size_bytes", "drive_file_id", "uploaded_at", "sha256", "malware_scan_status", "schema_version"];
  const fetchImpl = async (url, options = {}) => {
    const value = String(url);
    if (value.includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if ((options.method || "GET") === "GET") {
      return new Response(JSON.stringify({ values: [legacyHeaders] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    writes.push({ url: value, method: options.method, body: JSON.parse(options.body) });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleSheetsStore({ auth, eoiSpreadsheetId: "eoi", applicationSpreadsheetId: "application", operationsSpreadsheetId: "operations", fetchImpl });
  await store.append("application", "Documents", { application_id: "app-1", document_id: "drive-1", category: "birth_certificate", original_file_name: "synthetic.pdf", mime_type: "application/pdf", size_bytes: 100, drive_file_id: "drive-1", uploaded_at: "2026-08-06", sha256: "md5", malware_scan_status: "not_scanned", schema_version: "v6", storage_provider: "google_drive", storage_key: "drive-1" });
  const headerWrite = writes.find(write => write.method === "PUT");
  const appendWrite = writes.find(write => write.method === "POST");
  assert.deepEqual(headerWrite.body.values[0].slice(0, legacyHeaders.length), legacyHeaders);
  assert.deepEqual(headerWrite.body.values[0].slice(legacyHeaders.length), ["storage_provider", "storage_key", "storage_version_id", "form_version", "form_definition_hash"]);
  assert.equal(appendWrite.body.values[0][6], "drive-1");
  assert.equal(appendWrite.body.values[0][7], "2026-08-06");
  assert.equal(appendWrite.body.values[0][11], "google_drive");
});

test("family application IDs extend invitation projections without shifting legacy columns", async () => {
  const writes = [];
  const legacyHeaders = ["invitation_id", "application_id", "recipient_contact_id", "recipient_email", "student_id", "source_eoi_id", "status", "created_at", "expires_at", "first_sent_at", "last_sent_at", "send_count", "opened_at", "verified_at", "submitted_at", "schema_version"];
  const fetchImpl = async (url, options = {}) => {
    const value = String(url);
    if (value.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if ((options.method || "GET") === "GET") return new Response(JSON.stringify({ values: [legacyHeaders] }), { status: 200, headers: { "Content-Type": "application/json" } });
    writes.push({ method: options.method, body: JSON.parse(options.body) });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleSheetsStore({ auth, eoiSpreadsheetId: "eoi", applicationSpreadsheetId: "application", operationsSpreadsheetId: "operations", fetchImpl });
  await store.append("operations", "Application Invitations", { invitation_id: "invite-1", application_id: "app-1", recipient_contact_id: "contact-1", recipient_email: "family@example.com", student_id: "student-1", status: "active", schema_version: "v6", application_ids_json: ["app-1", "app-2"] });
  const headerWrite = writes.find(write => write.method === "PUT");
  const appendWrite = writes.find(write => write.method === "POST");
  assert.deepEqual(headerWrite.body.values[0].slice(0, legacyHeaders.length), legacyHeaders);
  assert.equal(headerWrite.body.values[0][legacyHeaders.length], "application_ids_json");
  assert.equal(appendWrite.body.values[0][1], "app-1");
  assert.equal(appendWrite.body.values[0][16], '["app-1","app-2"]');
});

test("V7 student projection appends new education and medical fields without shifting legacy columns", async () => {
  const writes = [];
  const legacyHeaders = ["application_id", "student_id", "first_name", "middle_name", "last_name", "preferred_name"];
  const fetchImpl = async (url, options = {}) => {
    const value = String(url);
    if (value.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if ((options.method || "GET") === "GET") return new Response(JSON.stringify({ values: [legacyHeaders] }), { status: 200, headers: { "Content-Type": "application/json" } });
    writes.push({ method: options.method, body: JSON.parse(options.body) });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleSheetsStore({ auth, eoiSpreadsheetId: "eoi", applicationSpreadsheetId: "application", operationsSpreadsheetId: "operations", fetchImpl });
  await store.append("application", "Student", { application_id: "app-1", student_id: "student-1", first_name: "Synthetic", schema_version: "v7", form_version: "2026.7", form_definition_hash: "synthetic", previous_school_attended: "Yes", previous_school_name: "Synthetic School", previous_school_year_level: "Foundation", medicare_reference_number: "1" });
  const headerWrite = writes.find(write => write.method === "PUT");
  const appendWrite = writes.find(write => write.method === "POST");
  assert.deepEqual(headerWrite.body.values[0].slice(0, legacyHeaders.length), legacyHeaders);
  assert.ok(headerWrite.body.values[0].includes("previous_school_attended"));
  assert.ok(headerWrite.body.values[0].includes("medicare_reference_number"));
  assert.ok(headerWrite.body.values[0].indexOf("previous_school_attended") > headerWrite.body.values[0].indexOf("form_definition_hash"));
  assert.equal(appendWrite.body.values[0][0], "app-1");
  assert.equal(appendWrite.body.values[0][2], "Synthetic");
});

test("V8 conditions projection appends survey answers without shifting legacy columns", async () => {
  const writes = [];
  const legacyHeaders = ["application_id", "previous_school_permission", "previous_school_name", "previous_school_address", "previous_school_interstate", "fee_option", "fee_account_recipient", "guardian_a_name", "guardian_a_percentage", "guardian_b_name", "guardian_b_percentage", "fee_responsibility_date", "discovery_source", "influence_factors", "schema_version", "form_version", "form_definition_hash", "previous_school_attended", "previous_school_year_level", "student_commitments_accepted", "parent_carer_commitments_accepted", "parent_carer_agreement_acknowledged"];
  const fetchImpl = async (url, options = {}) => {
    const value = String(url);
    if (value.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if ((options.method || "GET") === "GET") return new Response(JSON.stringify({ values: [legacyHeaders] }), { status: 200, headers: { "Content-Type": "application/json" } });
    writes.push({ method: options.method, body: JSON.parse(options.body) });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleSheetsStore({ auth, eoiSpreadsheetId: "eoi", applicationSpreadsheetId: "application", operationsSpreadsheetId: "operations", fetchImpl });
  await store.append("application", "Conditions", { application_id: "app-1", form_version: "rosewood-application-2026.8", special_aptitudes: "Mathematics", mentoring_value: "A trusted adult relationship", intended_years: "6" });
  const headerWrite = writes.find(write => write.method === "PUT");
  const appendWrite = writes.find(write => write.method === "POST");
  assert.deepEqual(headerWrite.body.values[0].slice(0, legacyHeaders.length), legacyHeaders);
  assert.deepEqual(headerWrite.body.values[0].slice(legacyHeaders.length), ["special_aptitudes", "preferred_subjects", "subjects_needing_help", "hobbies_cultural_pursuits", "sport_participation", "extracurricular_activities", "local_library", "school_attractions", "desired_personal_qualities", "mentoring_value", "intended_years"]);
  assert.equal(appendWrite.body.values[0][22], "Mathematics");
  assert.equal(appendWrite.body.values[0][31], "A trusted adult relationship");
  assert.equal(appendWrite.body.values[0][32], "6");
});
