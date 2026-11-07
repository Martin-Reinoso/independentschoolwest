import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const template = JSON.parse(readFileSync(new URL("../template.synthetic.json", import.meta.url)));
const resources = template.Resources;
const statements = resources.RosewoodRole.Properties.Policies[0].PolicyDocument.Statement;

test("synthetic stack starts unavailable, never imports retained production resources, and has no outgoing notification subscriptions", () => {
  assert.equal(template.Parameters.SyntheticReady.Default, "false");
  assert.equal(template.Parameters.EmailDeliveryMode.Default, "disabled");
  assert.equal(template.Parameters.OutboxScheduleState.Default, "DISABLED");
  assert.equal(template.Parameters.EnrolmentOffersEnabled.Default, "false");
  for (const key of ["ConfigSecretArn", "ExistingAuditTableName", "ExistingBackupVaultName", "RecordsKmsKeyArn", "StaffEmails"]) assert.equal(template.Parameters[key], undefined);
  assert.equal(Object.keys(resources).some(key => /Canary|Security|Backup/.test(key)), false);
  assert.equal(JSON.stringify(template).includes("Rosewood/Enrolment"), false);
  for (const resource of Object.values(resources)) {
    if (resource.Type === "AWS::SNS::Subscription") assert.equal(resource.Properties.Protocol, "lambda");
    if (resource.Type === "AWS::CloudWatch::Alarm") assert.equal(resource.Properties.AlarmActions, undefined);
  }
});

test("AWS independently restricts recipients, credentials, storage, database and encryption", () => {
  const send = statements.find(s => s.Sid === "SendTransactionalEmail");
  assert.deepEqual(send.Condition["ForAllValues:StringEquals"], { "ses:Recipients": [{ Ref: "TestEmailDestination" }] });
  assert.equal(send.Condition.Null["ses:Recipients"], "false");
  assert.deepEqual(template.Parameters.TestEmailDestination.AllowedValues, [template.Parameters.TestEmailDestination.Default]);
  assert.equal(statements.find(s => s.Sid === "DenyOtherEmailRecipients").Effect, "Deny");
  assert.equal(statements.find(s => s.Sid === "DenyUnboundedEmail").Effect, "Deny");
  for (const category of ["Database", "Storage", "Secrets", "Encryption"]) {
    const deny = statements.find(s => s.Sid === `DenyOutsideTest${category}`);
    assert.equal(deny.Effect, "Deny");
    assert.ok(deny.NotResource.length);
  }
  assert.deepEqual(statements.find(s => s.Action === "secretsmanager:GetSecretValue").Resource, { Ref: "SyntheticConfigSecret" });
  assert.equal(statements.some(s => s.Action === "cloudwatch:PutMetricData"), false);
  const audit = statements.find(s => s.Sid === "AppendOnlyAudit");
  assert.deepEqual(audit.Action, ["dynamodb:PutItem", "dynamodb:Query"]);
  assert.equal(JSON.stringify(statements).includes("dynamodb:TransactWriteItems"), false, "transaction permissions use their underlying item actions");
});

test("Lambda environment encryption stays within the key allowed by the isolation policy", () => {
  const environmentKey = resources.RosewoodFunction.Properties.KmsKeyArn;
  assert.deepEqual(environmentKey, { "Fn::GetAtt": ["RosewoodKey", "Arn"] });
  assert.deepEqual(statements.find(s => s.Sid === "DenyOutsideTestEncryption").NotResource, [environmentKey]);
  const allowed = statements.find(s => s.Sid === "EncryptedRecordsKeyUse");
  assert.deepEqual(allowed.Resource, environmentKey);
  assert.ok(allowed.Action.includes("kms:Decrypt"));
});
