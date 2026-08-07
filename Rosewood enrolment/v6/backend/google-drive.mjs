import crypto from "node:crypto";
import { GoogleAccessTokenProvider } from "./google-auth.mjs";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function safeName(value) {
  return String(value || "document").normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 160) || "document";
}

export class GoogleDriveStore {
  constructor({ auth, eoiFolderId, applicationFolderId, fetchImpl = fetch }) {
    this.storageProvider = "google_drive";
    this.tokenProvider = new GoogleAccessTokenProvider({ ...auth, scope: DRIVE_SCOPE, fetchImpl });
    this.eoiFolderId = eoiFolderId;
    this.applicationFolderId = applicationFolderId;
    this.fetch = fetchImpl;
  }

  async request(url, options = {}) {
    const response = await this.fetch(url, { ...options, headers: { Authorization: `Bearer ${await this.tokenProvider.accessToken()}`, ...(options.headers || {}) } });
    if (!response.ok) throw Object.assign(new Error(`Google Drive request failed with ${response.status}: ${(await response.text()).slice(0, 300)}`), { status: response.status });
    return response;
  }

  async createFile({ folderId, name, mimeType, data, properties = {} }) {
    const boundary = `rosewood-${crypto.randomUUID()}`;
    const metadata = { name: safeName(name), parents: [folderId], appProperties: properties };
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      Buffer.isBuffer(data) ? data : Buffer.from(data),
      Buffer.from(`\r\n--${boundary}--`)
    ]);
    const response = await this.request("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body });
    return response.json();
  }

  storeEoiSnapshot({ eoiId, snapshot }) {
    return this.createFile({ folderId: this.eoiFolderId, name: `${eoiId}.json`, mimeType: "application/json", data: JSON.stringify(snapshot, null, 2), properties: { rosewoodWorkflow: "eoi", rosewoodEoiId: eoiId } });
  }

  storeApplicationSnapshot({ applicationId, revision, snapshot }) {
    return this.createFile({ folderId: this.applicationFolderId, name: `${applicationId}-revision-${revision}.json`, mimeType: "application/json", data: JSON.stringify(snapshot, null, 2), properties: { rosewoodWorkflow: "application", rosewoodApplicationId: applicationId, rosewoodRevision: String(revision) } });
  }

  storeSignature({ applicationId, guardianId, data }) {
    return this.createFile({ folderId: this.applicationFolderId, name: `${applicationId}-${guardianId}-signature.png`, mimeType: "image/png", data, properties: { rosewoodWorkflow: "application", rosewoodApplicationId: applicationId, rosewoodGuardianId: guardianId, rosewoodArtifact: "signature" } });
  }

  async createUploadSession({ uploadId = "", applicationId, category, fileName, mimeType, size }) {
    const metadata = { name: `${applicationId}-${category}-${safeName(fileName)}`, parents: [this.applicationFolderId], appProperties: { rosewoodWorkflow: "application", rosewoodApplicationId: applicationId, rosewoodCategory: category, rosewoodUploadId: uploadId, rosewoodExpectedMime: mimeType, rosewoodExpectedSize: String(size) } };
    const response = await this.request("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8", "X-Upload-Content-Type": mimeType, "X-Upload-Content-Length": String(size) }, body: JSON.stringify(metadata) });
    const uploadUrl = response.headers.get("location");
    if (!uploadUrl) throw new Error("Google Drive did not return a resumable upload URL.");
    return { uploadUrl };
  }

  async createUpload({ uploadId, applicationId, category, fileName, mimeType, size, checksumSha256 }) {
    const { uploadUrl } = await this.createUploadSession({ uploadId, applicationId, category, fileName, mimeType, size });
    return {
      uploadUrl,
      uploadHeaders: { "Content-Type": mimeType },
      documentId: "",
      upload: {
        id: uploadId,
        applicationId,
        category,
        fileName,
        mimeType,
        size,
        checksumSha256,
        storageProvider: this.storageProvider,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 15 * 60 * 1000
      }
    };
  }

  async confirmUpload({ applicationId, category, documentId }) {
    const fields = "id,name,mimeType,size,parents,appProperties,trashed,md5Checksum,createdTime";
    const response = await this.request(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(documentId)}?fields=${encodeURIComponent(fields)}`);
    const file = await response.json();
    const properties = file.appProperties || {};
    const valid = !file.trashed && file.parents?.includes(this.applicationFolderId) && properties.rosewoodApplicationId === applicationId && properties.rosewoodCategory === category && properties.rosewoodExpectedMime === file.mimeType && Number(properties.rosewoodExpectedSize) === Number(file.size);
    if (!valid) throw Object.assign(new Error("Uploaded document metadata does not match its authorised upload."), { status: 422, code: "DOCUMENT_MISMATCH" });
    return { documentId: file.id, fileName: file.name, mimeType: file.mimeType, size: Number(file.size), category, checksum: file.md5Checksum || "", malwareScanStatus: "not_scanned", storageProvider: this.storageProvider, storageKey: file.id, uploadedAt: file.createdTime || new Date().toISOString() };
  }

  async findUploadedDocument({ applicationId, category, uploadId }) {
    const escapedUploadId = String(uploadId).replaceAll("'", "\\'");
    const query = `trashed = false and appProperties has { key='rosewoodUploadId' and value='${escapedUploadId}' }`;
    const response = await this.request(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent("files(id)")}&pageSize=2`);
    const files = (await response.json()).files || [];
    if (files.length !== 1) return null;
    return this.confirmUpload({ applicationId, category, documentId: files[0].id });
  }

  async uploadDocument({ uploadId, applicationId, category, fileName, mimeType, size, data }) {
    const existing = await this.findUploadedDocument({ applicationId, category, uploadId });
    if (existing) return existing;
    const { uploadUrl } = await this.createUploadSession({ uploadId, applicationId, category, fileName, mimeType, size });
    const response = await this.request(uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: data });
    const created = await response.json();
    if (!created.id) throw new Error("Google Drive did not return the uploaded document identifier.");
    return this.confirmUpload({ applicationId, category, documentId: created.id });
  }
}
