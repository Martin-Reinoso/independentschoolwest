import assert from "node:assert/strict";
import test from "node:test";
import { GetObjectTaggingCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { S3ArtifactStore } from "../s3-store.mjs";

const checksum = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function storeWithScan(scanStatus) {
  const client = {
    async send(command) {
      if (command instanceof HeadObjectCommand) return { ContentLength: 10, ContentType: "application/pdf", ChecksumSHA256: checksum, VersionId: "version-1", LastModified: new Date("2026-08-05T12:00:00Z"), Metadata: { application: "app-test", category: "birth_certificate", upload: "upload-test" } };
      if (command instanceof GetObjectTaggingCommand) return { TagSet: scanStatus ? [{ Key: "GuardDutyMalwareScanStatus", Value: scanStatus }] : [] };
      throw new Error("Unexpected command");
    }
  };
  return new S3ArtifactStore({ bucketName: "synthetic-bucket", client, presign: async () => "https://example.invalid/signed" });
}

const upload = { id: "upload-test", applicationId: "app-test", category: "birth_certificate", fileName: "synthetic.pdf", mimeType: "application/pdf", size: 10, checksumSha256: checksum, storageKey: "quarantine/application/app-test/birth_certificate/upload-test-synthetic.pdf" };

test("document confirmation waits until GuardDuty has a result", async () => {
  await assert.rejects(() => storeWithScan("").confirmUpload(upload), error => error.code === "DOCUMENT_SCAN_PENDING" && error.status === 425);
});

test("document confirmation rejects a detected threat", async () => {
  await assert.rejects(() => storeWithScan("THREATS_FOUND").confirmUpload(upload), error => error.code === "DOCUMENT_THREAT_FOUND" && error.status === 422);
});

test("document confirmation returns only a clean versioned S3 record", async () => {
  const document = await storeWithScan("NO_THREATS_FOUND").confirmUpload(upload);
  assert.equal(document.storageProvider, "s3");
  assert.equal(document.storageVersionId, "version-1");
  assert.equal(document.malwareScanStatus, "no_threats_found");
});
