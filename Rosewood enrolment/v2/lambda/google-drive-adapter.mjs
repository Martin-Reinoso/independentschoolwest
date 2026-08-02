import crypto from "node:crypto";
import { GoogleAccessTokenProvider } from "./google-auth.mjs";

// drive.file cannot discover a restricted folder shared manually with a service
// account. The account's Drive ACL remains the effective resource boundary.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function required(name, value) {
  if (!value) throw new Error(`Missing required Google Drive setting: ${name}`);
  return value;
}

function safeName(value) {
  return String(value || "document")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 160) || "document";
}

export class GoogleDriveAdapter {
  constructor({ authMode, serviceAccountEmail, privateKey, oauthClientId, oauthClientSecret, oauthRefreshToken, tokenProvider, folderId, fetchImpl = fetch, now = () => Date.now() }) {
    this.folderId = required("folderId", folderId);
    this.fetch = fetchImpl;
    this.tokenProvider = tokenProvider || new GoogleAccessTokenProvider({ authMode, serviceAccountEmail, privateKey, oauthClientId, oauthClientSecret, oauthRefreshToken, scope: DRIVE_SCOPE, fetchImpl, now });
    this.authMode = this.tokenProvider.mode;
  }

  async accessToken() {
    return this.tokenProvider.accessToken();
  }

  async driveRequest(url, options = {}) {
    const response = await this.fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${await this.accessToken()}`, ...(options.headers || {}) }
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw Object.assign(new Error(`Google Drive request failed with ${response.status}: ${detail.slice(0, 300)}`), { status: response.status });
    }
    return response;
  }

  async createUploadSession({ applicationId, category, fileName, mimeType, size }) {
    const metadata = {
      name: `${applicationId}-${category}-${safeName(fileName)}`,
      parents: [this.folderId],
      appProperties: {
        rosewoodApplicationId: applicationId,
        rosewoodCategory: category,
        rosewoodExpectedMime: mimeType,
        rosewoodExpectedSize: String(size)
      }
    };
    const response = await this.driveRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(size)
      },
      body: JSON.stringify(metadata)
    });
    const uploadUrl = response.headers.get("location");
    if (!uploadUrl) throw new Error("Google Drive did not return a resumable upload URL.");
    return { uploadUrl };
  }

  async confirmUpload({ documentId, expected }) {
    const fields = "id,name,mimeType,size,parents,appProperties,trashed";
    const response = await this.driveRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`);
    const file = await response.json();
    const properties = file.appProperties || {};
    const size = Number(file.size);
    const valid = !file.trashed
      && file.parents?.includes(this.folderId)
      && properties.rosewoodApplicationId === expected.applicationId
      && properties.rosewoodCategory === expected.category
      && properties.rosewoodExpectedMime === file.mimeType
      && Number(properties.rosewoodExpectedSize) === size;
    if (!valid) throw Object.assign(new Error("Uploaded document metadata does not match its authorised session."), { status: 422, code: "DOCUMENT_MISMATCH" });
    return { documentId: file.id, fileName: file.name, mimeType: file.mimeType, size, category: properties.rosewoodCategory };
  }

  async createFile({ name, mimeType, data, applicationId, kind }) {
    const boundary = `rosewood-${crypto.randomUUID()}`;
    const metadata = {
      name: safeName(name),
      parents: [this.folderId],
      appProperties: { rosewoodApplicationId: applicationId, rosewoodArtifactKind: kind }
    };
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      Buffer.isBuffer(data) ? data : Buffer.from(data),
      Buffer.from(`\r\n--${boundary}--`)
    ]);
    const response = await this.driveRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body
    });
    const file = await response.json();
    return { documentId: file.id };
  }

  async deleteFile(documentId) {
    try {
      await this.driveRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}?supportsAllDrives=true`, { method: "DELETE" });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    return { deleted: true };
  }

  storeJson({ applicationId, name, value }) {
    return this.createFile({ name, mimeType: "application/json", data: JSON.stringify(value, null, 2), applicationId, kind: "application_snapshot" });
  }

  storeSignature({ applicationId, signerId, data }) {
    return this.createFile({ name: `${applicationId}-${signerId}-signature.png`, mimeType: "image/png", data, applicationId, kind: "signature" });
  }
}
