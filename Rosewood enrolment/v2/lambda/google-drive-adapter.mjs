import crypto from "node:crypto";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function required(name, value) {
  if (!value) throw new Error(`Missing required Google Drive setting: ${name}`);
  return value;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
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
  constructor({ serviceAccountEmail, privateKey, folderId, fetchImpl = fetch, now = () => Date.now() }) {
    this.serviceAccountEmail = required("serviceAccountEmail", serviceAccountEmail);
    this.privateKey = required("privateKey", privateKey).replace(/\\n/g, "\n");
    this.folderId = required("folderId", folderId);
    this.fetch = fetchImpl;
    this.now = now;
    this.token = null;
  }

  async accessToken() {
    if (this.token?.expiresAt > this.now() + 60_000) return this.token.value;
    const issuedAt = Math.floor(this.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64Url(JSON.stringify({
      iss: this.serviceAccountEmail,
      scope: DRIVE_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600
    }));
    const signingInput = `${header}.${claims}`;
    const signature = crypto.createSign("RSA-SHA256").update(signingInput).end().sign(this.privateKey);
    const assertion = `${signingInput}.${base64Url(signature)}`;
    const response = await this.fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
    });
    if (!response.ok) throw new Error(`Google OAuth failed with ${response.status}.`);
    const payload = await response.json();
    this.token = { value: payload.access_token, expiresAt: this.now() + Number(payload.expires_in || 3600) * 1000 };
    return this.token.value;
  }

  async driveRequest(url, options = {}) {
    const response = await this.fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${await this.accessToken()}`, ...(options.headers || {}) }
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Google Drive request failed with ${response.status}: ${detail.slice(0, 300)}`);
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

  storeJson({ applicationId, name, value }) {
    return this.createFile({ name, mimeType: "application/json", data: JSON.stringify(value, null, 2), applicationId, kind: "application_snapshot" });
  }

  storeSignature({ applicationId, signerId, data }) {
    return this.createFile({ name: `${applicationId}-${signerId}-signature.png`, mimeType: "image/png", data, applicationId, kind: "signature" });
  }
}
