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

test("production canary is scheduled, publishes restricted metrics and alarms through the security topic", async () => {
  const template = await readFile(new URL("../template.yaml", import.meta.url), "utf8");
  const runtimeRole = template.slice(
    template.indexOf("  RosewoodRole:"),
    template.indexOf("  RosewoodFunction:")
  );

  assert.match(template, /RosewoodSecondarySecuritySubscription:/);
  assert.match(template, /Default: frjativa@gmail\.com/);
  assert.match(template, /RosewoodCanarySchedule:/);
  assert.match(template, /ScheduleExpression: rate\(30 minutes\)/);
  assert.match(template, /"source":"rosewood\.enrolment\.canary"/);
  assert.match(runtimeRole, /Sid: PublishCanaryMetrics/);
  assert.match(runtimeRole, /cloudwatch:PutMetricData/);
  assert.match(runtimeRole, /cloudwatch:namespace: Rosewood\/Enrolment/);

  for (const metric of [
    "PublicFormAvailability",
    "BackendHealthAvailability",
    "EoiAddressAvailability"
  ]) {
    assert.match(template, new RegExp(`MetricName: ${metric}`));
  }
  assert.equal((template.match(/TreatMissingData: breaching/g) || []).length, 3);
  assert.equal((template.match(/DatapointsToAlarm: 2/g) || []).length, 3);
  assert.equal((template.match(/OKActions:/g) || []).length, 3);
});

test("Slack status delivery is secret-backed, routed and part of the durable outbox", async () => {
  const [template, index, service, build] = await Promise.all([
    readFile(new URL("../template.yaml", import.meta.url), "utf8"),
    readFile(new URL("../index.mjs", import.meta.url), "utf8"),
    readFile(new URL("../service.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-deployment.mjs", import.meta.url), "utf8")
  ]);

  assert.match(index, /config\.SLACK_PENDING_WEBHOOK_URL \|\| config\.SLACK_WEBHOOK_URL/);
  assert.match(index, /config\.SLACK_COMPLETION_WEBHOOK_URL/);
  assert.match(index, /new SlackNotifier/);
  assert.match(template, /STAFF_PORTAL_URL: https:\/\/ffe\.org\.au\/pages\/rosewood-enrolment-admin-v6\.html/);
  assert.doesNotMatch(template, /hooks\.slack\.com/);
  assert.match(service, /type === "signature_pending"/);
  assert.match(service, /app\.status === "pending_signatures" && slack\.pendingEnabled/);
  assert.match(service, /app\.status === "submitted" && slack\.completionEnabled/);
  assert.match(service, /studentName:/);
  assert.match(service, /signedBy:/);
  assert.match(service, /awaitingSignatures:/);
  assert.match(service, /item\.data\.kind === "slack"/);
  assert.match(build, /"slack-notifier\.mjs"/);
});

test("SES delivery feedback is configured, encrypted and correlated through the Lambda", async () => {
  const [template, index, service] = await Promise.all([
    readFile(new URL("../template.yaml", import.meta.url), "utf8"),
    readFile(new URL("../index.mjs", import.meta.url), "utf8"),
    readFile(new URL("../service.mjs", import.meta.url), "utf8")
  ]);

  assert.match(template, /RosewoodSesConfigurationSet:/);
  assert.match(template, /RosewoodSesEventDestination:/);
  assert.match(template, /RosewoodSesEventsTopic:/);
  assert.match(template, /RosewoodSesEventsKey:/);
  assert.match(template, /KmsMasterKeyId: !GetAtt RosewoodSesEventsKey\.Arn/);
  assert.match(template, /Sid: AllowSesEncryptedEventPublishing/);
  for (const eventType of ["send", "delivery", "deliveryDelay", "bounce", "complaint", "reject", "renderingFailure"]) {
    assert.match(template, new RegExp(`- ${eventType}`));
  }
  assert.match(template, /Principal:\n\s+Service: ses\.amazonaws\.com/);
  assert.match(template, /Principal: sns\.amazonaws\.com/);
  assert.match(template, /SES_CONFIGURATION_SET_MANAGED: !Ref RosewoodSesConfigurationSet/);
  const runtimeRole = template.slice(
    template.indexOf("  RosewoodRole:"),
    template.indexOf("  RosewoodFunction:")
  );
  assert.match(runtimeRole, /Sid: SendTransactionalEmail/);
  assert.match(
    runtimeRole,
    /configuration-set\/\$\{RosewoodSesConfigurationSet\}/
  );
  assert.match(index, /config\.SES_CONFIGURATION_SET_MANAGED \|\| config\.SES_CONFIGURATION_SET/);
  assert.match(service, /recordSignatureDelivery/);
  assert.match(service, /recordSesEvent/);
  assert.doesNotMatch(service, /recipient_email:.*processSesFeedback/);
});
