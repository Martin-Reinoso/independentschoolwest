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
  assert.deepEqual(headerWrite.body.values[0].slice(legacyHeaders.length), ["storage_provider", "storage_key", "storage_version_id"]);
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
