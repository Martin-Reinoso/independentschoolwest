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
