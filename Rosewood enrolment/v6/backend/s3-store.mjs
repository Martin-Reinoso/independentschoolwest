import {
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const CLEAN_SCAN = "NO_THREATS_FOUND";
const FAILED_SCANS = new Set(["THREATS_FOUND", "UNSUPPORTED", "ACCESS_DENIED", "FAILED"]);

function safeName(value) {
  return String(value || "document")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 160) || "document";
}

function attachmentName(value) {
  return safeName(value).replaceAll('"', "");
}

function objectError(status, code, message, details) {
  return Object.assign(new Error(message), { status, code, details });
}

export class S3ArtifactStore {
  constructor({ bucketName, client, now = () => Date.now(), uploadExpiresSeconds = 900, presign = getSignedUrl }) {
    if (!bucketName) throw new Error("S3 artifact bucket name is required.");
    this.bucketName = bucketName;
    this.client = client || new S3Client({});
    this.now = now;
    this.uploadExpiresSeconds = uploadExpiresSeconds;
    this.presign = presign;
  }

  async putArtifact({ key, mimeType, data, metadata = {} }) {
    const result = await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: Buffer.isBuffer(data) ? data : Buffer.from(data),
      ContentType: mimeType,
      Metadata: metadata
    }));
    return { id: key, storageProvider: "s3", storageKey: key, storageVersionId: result.VersionId || "" };
  }

  storeEoiSnapshot({ eoiId, snapshot }) {
    return this.putArtifact({
      key: `records/eoi/${eoiId}/submitted.json`,
      mimeType: "application/json",
      data: JSON.stringify(snapshot, null, 2),
      metadata: { workflow: "eoi", record: eoiId, artifact: "snapshot" }
    });
  }

  storeApplicationSnapshot({ applicationId, revision, snapshot }) {
    return this.putArtifact({
      key: `records/application/${applicationId}/revision-${revision}.json`,
      mimeType: "application/json",
      data: JSON.stringify(snapshot, null, 2),
      metadata: { workflow: "application", record: applicationId, revision: String(revision), artifact: "snapshot" }
    });
  }

  storeSignature({ applicationId, guardianId, signatureId, data }) {
    return this.putArtifact({
      key: `records/application/${applicationId}/signatures/${signatureId}-${guardianId}.png`,
      mimeType: "image/png",
      data,
      metadata: { workflow: "application", record: applicationId, guardian: guardianId, artifact: "signature" }
    });
  }

  async createUpload({ uploadId, applicationId, category, fileName, mimeType, size, checksumSha256 }) {
    const key = `quarantine/application/${applicationId}/${category}/${uploadId}-${safeName(fileName)}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
      ChecksumSHA256: checksumSha256,
      Metadata: {
        workflow: "application",
        application: applicationId,
        category,
        upload: uploadId
      }
    });
    const uploadUrl = await this.presign(this.client, command, { expiresIn: this.uploadExpiresSeconds });
    return {
      uploadUrl,
      uploadHeaders: { "Content-Type": mimeType, "x-amz-checksum-sha256": checksumSha256 },
      upload: {
        id: uploadId,
        applicationId,
        category,
        fileName,
        mimeType,
        size,
        checksumSha256,
        storageKey: key,
        createdAt: new Date(this.now()).toISOString(),
        expiresAt: this.now() + this.uploadExpiresSeconds * 1000
      }
    };
  }

  async confirmUpload(upload) {
    let head;
    try {
      head = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: upload.storageKey,
        ChecksumMode: "ENABLED"
      }));
    } catch (error) {
      if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
        throw objectError(422, "DOCUMENT_NOT_FOUND", "The authorised document upload was not found. Upload the file again.");
      }
      throw error;
    }
    const metadata = head.Metadata || {};
    const valid = Number(head.ContentLength) === Number(upload.size)
      && head.ContentType === upload.mimeType
      && metadata.application === upload.applicationId
      && metadata.category === upload.category
      && metadata.upload === upload.id
      && head.ChecksumSHA256 === upload.checksumSha256;
    if (!valid) throw objectError(422, "DOCUMENT_MISMATCH", "The uploaded document does not match its authorised metadata or checksum.");

    const tags = await this.client.send(new GetObjectTaggingCommand({
      Bucket: this.bucketName,
      Key: upload.storageKey,
      VersionId: head.VersionId
    }));
    const scanStatus = tags.TagSet?.find(tag => tag.Key === "GuardDutyMalwareScanStatus")?.Value || "PENDING";
    if (scanStatus === "PENDING") {
      throw objectError(425, "DOCUMENT_SCAN_PENDING", "The document is still being checked for security. Please wait.", { retryAfterSeconds: 3 });
    }
    if (FAILED_SCANS.has(scanStatus)) {
      const threat = scanStatus === "THREATS_FOUND";
      throw objectError(422, threat ? "DOCUMENT_THREAT_FOUND" : "DOCUMENT_SCAN_FAILED", threat
        ? "This document could not be accepted because a security threat was detected."
        : "This document could not be verified by the security scanner. Please upload a different file or contact the College.");
    }
    if (scanStatus !== CLEAN_SCAN) throw objectError(422, "DOCUMENT_SCAN_FAILED", "The document security result was not recognised.");

    return {
      documentId: upload.id,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.size,
      category: upload.category,
      checksum: upload.checksumSha256,
      malwareScanStatus: "no_threats_found",
      storageProvider: "s3",
      storageKey: upload.storageKey,
      storageVersionId: head.VersionId || "",
      uploadedAt: head.LastModified?.toISOString() || new Date(this.now()).toISOString()
    };
  }

  async createDownloadUrl(document, expiresIn = 300) {
    if (document.storageProvider !== "s3" || document.malwareScanStatus !== "no_threats_found") {
      throw objectError(409, "DOCUMENT_NOT_AVAILABLE", "This document is not available through the secure portal.");
    }
    const tags = await this.client.send(new GetObjectTaggingCommand({
      Bucket: this.bucketName,
      Key: document.storageKey,
      VersionId: document.storageVersionId || undefined
    }));
    const scanStatus = tags.TagSet?.find(tag => tag.Key === "GuardDutyMalwareScanStatus")?.Value;
    if (scanStatus !== CLEAN_SCAN) throw objectError(409, "DOCUMENT_NOT_AVAILABLE", "This document no longer has a clean security status.");
    const url = await this.presign(this.client, new GetObjectCommand({
      Bucket: this.bucketName,
      Key: document.storageKey,
      VersionId: document.storageVersionId || undefined,
      ResponseContentDisposition: `attachment; filename="${attachmentName(document.fileName)}"`,
      ResponseContentType: document.mimeType
    }), { expiresIn });
    return { url, expiresInSeconds: expiresIn };
  }
}
