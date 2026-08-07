import assert from "node:assert/strict";
import test from "node:test";
import { StagedGoogleDriveStore } from "../staged-google-drive.mjs";

function uploadRecord(overrides = {}) {
  return {
    id: "upload-1",
    uploadId: "upload-1",
    applicationId: "app-1",
    category: "birth_certificate",
    fileName: "synthetic.pdf",
    mimeType: "application/pdf",
    size: 5,
    checksumSha256: "checksum",
    storageKey: "pending/app-1/upload-1",
    ...overrides
  };
}

test("staged uploads are presigned with encryption and checksum headers", async () => {
  let commandInput;
  const store = new StagedGoogleDriveStore({
    drive: {},
    bucketName: "private-bucket",
    kmsKeyId: "kms-key",
    s3: {},
    presign: async (_client, command, options) => {
      commandInput = command.input;
      assert.ok(options.unhoistableHeaders.has("x-amz-checksum-sha256"));
      return "https://private-bucket.s3.ap-southeast-2.amazonaws.com/presigned";
    }
  });
  const result = await store.createUpload(uploadRecord());
  assert.equal(result.documentId, "upload-1");
  assert.equal(result.upload.storageProvider, "google_drive_via_s3");
  assert.equal(result.uploadHeaders["x-amz-checksum-sha256"], "checksum");
  assert.equal(commandInput.ChecksumSHA256, "checksum");
  assert.equal(commandInput.ServerSideEncryption, "aws:kms");
  assert.equal(commandInput.SSEKMSKeyId, "kms-key");
  assert.equal(commandInput.Key, "pending/app-1/upload-1");
});

test("staged documents are verified, moved to Drive and removed from staging", async () => {
  const commands = [];
  const data = Buffer.from("hello");
  const drive = {
    findUploadedDocument: async () => null,
    uploadDocument: async input => {
      assert.deepEqual(input.data, data);
      return { documentId: "drive-1", storageProvider: "google_drive" };
    }
  };
  const s3 = {
    send: async command => {
      commands.push(command.constructor.name);
      if (command.constructor.name === "GetObjectCommand") return {
        Body: { transformToByteArray: async () => data },
        ContentType: "application/pdf",
        ChecksumSHA256: "checksum"
      };
      return {};
    }
  };
  const store = new StagedGoogleDriveStore({ drive, bucketName: "private-bucket", kmsKeyId: "kms-key", s3 });
  const result = await store.confirmUpload(uploadRecord());
  assert.equal(result.documentId, "drive-1");
  assert.deepEqual(commands, ["GetObjectCommand", "DeleteObjectCommand"]);
});

test("staged confirmation rejects altered file metadata before Drive", async () => {
  let uploaded = false;
  const drive = {
    findUploadedDocument: async () => null,
    uploadDocument: async () => { uploaded = true; }
  };
  const s3 = {
    send: async () => ({
      Body: { transformToByteArray: async () => Buffer.from("wrong") },
      ContentType: "image/png",
      ChecksumSHA256: "different"
    })
  };
  const store = new StagedGoogleDriveStore({ drive, bucketName: "private-bucket", kmsKeyId: "kms-key", s3 });
  await assert.rejects(() => store.confirmUpload(uploadRecord()), error => error.code === "DOCUMENT_MISMATCH");
  assert.equal(uploaded, false);
});
