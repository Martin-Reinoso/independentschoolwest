import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Lambda runtime can use the customer-managed records key", async () => {
  const template = await readFile(new URL("../template.yaml", import.meta.url), "utf8");
  const runtimeRole = template.slice(
    template.indexOf("  RosewoodRole:"),
    template.indexOf("  RosewoodFunction:")
  );

  assert.match(runtimeRole, /Sid: EncryptedRecordsKeyUse/);
  for (const action of [
    "kms:Decrypt",
    "kms:DescribeKey",
    "kms:Encrypt",
    "kms:GenerateDataKey",
    "kms:ReEncryptFrom",
    "kms:ReEncryptTo"
  ]) {
    assert.match(runtimeRole, new RegExp(`- ${action}`));
  }
  assert.match(
    runtimeRole,
    /Resource: !If \[CreateRecordsKey, !GetAtt RosewoodKey\.Arn, !Ref RecordsKmsKeyArn\]/
  );
});

test("temporary document staging is private, encrypted and short lived", async () => {
  const template = await readFile(new URL("../template.yaml", import.meta.url), "utf8");
  const bucket = template.slice(
    template.indexOf("  RosewoodDocumentStagingBucket:"),
    template.indexOf("  RosewoodSecurityTopic:")
  );
  const runtimeRole = template.slice(
    template.indexOf("  RosewoodRole:"),
    template.indexOf("  RosewoodFunction:")
  );

  assert.match(bucket, /SSEAlgorithm: aws:kms/);
  assert.match(bucket, /ExpirationInDays: 1/);
  assert.match(bucket, /BlockPublicAcls: true/);
  assert.match(bucket, /RestrictPublicBuckets: true/);
  assert.match(bucket, /AllowedMethods:\n\s+- PUT/);
  assert.match(bucket, /AllowedOrigins:\n\s+- !Ref AllowedOrigins/);
  assert.match(bucket, /aws:SecureTransport: false/);
  assert.match(runtimeRole, /Sid: TemporaryDocumentStaging/);
  assert.match(runtimeRole, /s3:GetObject/);
  assert.match(runtimeRole, /s3:PutObject/);
  assert.match(runtimeRole, /s3:DeleteObject/);
});
