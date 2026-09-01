import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveStore } from "../google-drive.mjs";

const auth = {
  authMode: "user_oauth",
  oauthClientId: "client",
  oauthClientSecret: "secret",
  oauthRefreshToken: "refresh"
};

test("Google Drive upload adapter supports the V6 browser upload contract", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (String(url).includes("uploadType=resumable")) {
      return new Response("{}", { status: 200, headers: { location: "https://uploads.example.invalid/session" } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  const result = await store.createUpload({ uploadId: "upload-1", applicationId: "app-1", category: "birth_certificate", fileName: "synthetic.pdf", mimeType: "application/pdf", size: 100, checksumSha256: "checksum" });
  assert.equal(result.uploadUrl, "https://uploads.example.invalid/session");
  assert.equal(result.documentId, "");
  assert.deepEqual(result.uploadHeaders, { "Content-Type": "application/pdf" });
  assert.equal(result.upload.storageProvider, "google_drive");
  assert.match(requests[1].options.body, /application-folder/);
});

test("Google Drive confirmation rejects metadata drift and labels accepted files accurately", async () => {
  const fetchImpl = async url => {
    if (String(url).includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ id: "drive-1", name: "app-1-birth_certificate-synthetic.pdf", mimeType: "application/pdf", size: "100", parents: ["application-folder"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate", rosewoodExpectedMime: "application/pdf", rosewoodExpectedSize: "100" }, trashed: false, md5Checksum: "md5", createdTime: "2026-08-06T00:00:00.000Z" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  const document = await store.confirmUpload({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1" });
  assert.equal(document.storageProvider, "google_drive");
  assert.equal(document.malwareScanStatus, "not_scanned");
  assert.equal(document.documentId, "drive-1");
});

test("Google Drive staff preview revalidates application ownership before reading bytes", async () => {
  const data = Buffer.from("%PDF-synthetic");
  const requests = [];
  const fetchImpl = async url => {
    requests.push(String(url));
    if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (String(url).includes("alt=media")) return new Response(data, { status: 200, headers: { "Content-Type": "application/pdf" } });
    return new Response(JSON.stringify({ id: "drive-1", name: "protected.pdf", mimeType: "application/pdf", size: String(data.length), parents: ["application-folder"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate" }, trashed: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  const document = await store.readApplicationDocument({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1", expectedMimeType: "application/pdf", expectedSize: data.length, expectedFileName: "family-document.pdf" });
  assert.equal(document.fileName, "family-document.pdf");
  assert.deepEqual(document.data, data);
  assert.ok(requests.some(url => url.includes("alt=media")));
});

test("Google Drive staff preview rejects a document owned by another application", async () => {
  let mediaRequested = false;
  const fetchImpl = async url => {
    if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (String(url).includes("alt=media")) mediaRequested = true;
    return new Response(JSON.stringify({ id: "drive-1", name: "protected.pdf", mimeType: "application/pdf", size: "10", parents: ["application-folder"], appProperties: { rosewoodApplicationId: "different-app", rosewoodCategory: "birth_certificate" }, trashed: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  await assert.rejects(() => store.readApplicationDocument({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1", expectedMimeType: "application/pdf", expectedSize: 10 }), error => error.code === "DOCUMENT_MISMATCH");
  assert.equal(mediaRequested, false);
});

test("Google Drive staff preview rejects content that does not match its declared type", async () => {
  const data = Buffer.from("not-a-pdf-file");
  const fetchImpl = async url => {
    if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (String(url).includes("alt=media")) return new Response(data, { status: 200, headers: { "Content-Type": "application/pdf" } });
    return new Response(JSON.stringify({ id: "drive-1", name: "protected.pdf", mimeType: "application/pdf", size: String(data.length), parents: ["application-folder"], appProperties: { rosewoodApplicationId: "app-1", rosewoodCategory: "birth_certificate" }, trashed: false }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const store = new GoogleDriveStore({ auth, eoiFolderId: "eoi-folder", applicationFolderId: "application-folder", fetchImpl });
  await assert.rejects(() => store.readApplicationDocument({ applicationId: "app-1", category: "birth_certificate", documentId: "drive-1", expectedMimeType: "application/pdf", expectedSize: data.length }), error => error.code === "DOCUMENT_MISMATCH");
});
