import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StagedGoogleDriveStore {
  constructor({ drive, bucketName, kmsKeyId, s3 = new S3Client({}), presign = getSignedUrl }) {
    if (!bucketName || !kmsKeyId) throw new Error("Document staging requires an S3 bucket and KMS key.");
    this.storageProvider = "google_drive_via_s3";
    this.drive = drive;
    this.bucketName = bucketName;
    this.kmsKeyId = kmsKeyId;
    this.s3 = s3;
    this.presign = presign;
  }

  storeEoiSnapshot(input) {
    return this.drive.storeEoiSnapshot(input);
  }

  storeApplicationSnapshot(input) {
    return this.drive.storeApplicationSnapshot(input);
  }

  storeSignature(input) {
    return this.drive.storeSignature(input);
  }

  async createUpload({ uploadId, applicationId, category, fileName, mimeType, size, checksumSha256 }) {
    const storageKey = `pending/${applicationId}/${uploadId}`;
    const uploadHeaders = {
      "Content-Type": mimeType,
      "x-amz-checksum-sha256": checksumSha256,
      "x-amz-server-side-encryption": "aws:kms",
      "x-amz-server-side-encryption-aws-kms-key-id": this.kmsKeyId
    };
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: size,
      ChecksumSHA256: checksumSha256,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: this.kmsKeyId
    });
    return {
      uploadUrl: await this.presign(this.s3, command, { expiresIn: 15 * 60, unhoistableHeaders: new Set(["x-amz-checksum-sha256"]) }),
      uploadHeaders,
      documentId: uploadId,
      upload: {
        id: uploadId,
        applicationId,
        category,
        fileName,
        mimeType,
        size,
        checksumSha256,
        storageProvider: this.storageProvider,
        storageKey,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 15 * 60 * 1000
      }
    };
  }

  async confirmUpload(upload) {
    const driveUpload = { ...upload, uploadId: upload.id };
    const existing = await this.drive.findUploadedDocument(driveUpload);
    if (existing) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: upload.storageKey })).catch(() => {});
      return existing;
    }

    const staged = await this.s3.send(new GetObjectCommand({ Bucket: this.bucketName, Key: upload.storageKey, ChecksumMode: "ENABLED" }));
    const data = Buffer.from(await staged.Body.transformToByteArray());
    const valid = data.length === upload.size && staged.ContentType === upload.mimeType && staged.ChecksumSHA256 === upload.checksumSha256;
    if (!valid) throw Object.assign(new Error("The staged document does not match the authorised upload."), { status: 422, code: "DOCUMENT_MISMATCH" });

    const document = await this.drive.uploadDocument({ ...driveUpload, data });
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: upload.storageKey })).catch(() => {});
    return document;
  }
}
