// Read-only AWS IAM simulation of the generated template. This does not assume a
// role, send email, read family records, or create infrastructure. Repeat with the
// actual deployed role and resources before enabling the synthetic runtime.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const aws = args => JSON.parse(execFileSync("aws", [...args, "--profile", "default", "--region", "ap-southeast-2", "--output", "json"], { encoding: "utf8", maxBuffer: 2_000_000 }));
assert.equal(aws(["sts", "get-caller-identity"]).Account, "274319535046");
const template = JSON.parse(readFileSync(new URL("../template.synthetic.json", import.meta.url)));
const stack = "rosewood-offer-test-20261108", prefix = "arn:aws:", ar = "ap-southeast-2:274319535046:";
const values = { "AWS::Partition": "aws", "AWS::Region": "ap-southeast-2", "AWS::AccountId": "274319535046", "AWS::StackName": stack,
  SenderEmail: "enrolment@ffe.org.au", TestEmailDestination: template.Parameters.TestEmailDestination.Default,
  RosewoodSesConfigurationSet: `${stack}-transactional`,
  SyntheticConfigSecret: `${prefix}secretsmanager:${ar}secret:${stack}-config-ABCDEF`,
  "RosewoodTable.Arn": `${prefix}dynamodb:${ar}table/${stack}-records`,
  "RosewoodAuditTable.Arn": `${prefix}dynamodb:${ar}table/${stack}-audit`,
  "RosewoodKey.Arn": `${prefix}kms:${ar}key/00000000-0000-4000-8000-000000000001`,
  "RosewoodDocumentStagingBucket.Arn": `${prefix}s3:::${stack}-274319535046-staging`,
  "RosewoodLogGroup.Arn": `${prefix}logs:${ar}log-group:/aws/lambda/${stack}-service:*` };
function resolve(value) {
  if (Array.isArray(value)) return value.map(resolve);
  if (!value || typeof value !== "object") return value;
  if (value.Ref) { assert.ok(Object.hasOwn(values, value.Ref), value.Ref); return values[value.Ref]; }
  if (value["Fn::GetAtt"]) return resolve({ Ref: value["Fn::GetAtt"].join(".") });
  if (value["Fn::Sub"]) return value["Fn::Sub"].replace(/\$\{([^}]+)\}/g, (_, key) => resolve({ Ref: key }));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item)]));
}
const policy = resolve(template.Resources.RosewoodRole.Properties.Policies[0].PolicyDocument);
const emailResources = policy.Statement.find(s => s.Sid === "SendTransactionalEmail").Resource;
const recipient = values.TestEmailDestination;
const from = { ContextKeyName: "ses:FromAddress", ContextKeyType: "string", ContextKeyValues: [values.SenderEmail] };
const ctx = recipients => [from, ...(recipients ? [{ ContextKeyName: "ses:Recipients", ContextKeyType: "stringList", ContextKeyValues: recipients }] : [])];
const cases = [
  ["approved inbox", "ses:SendEmail", emailResources, ctx([recipient]), "allowed"],
  ["other inbox", "ses:SendEmail", emailResources, ctx(["unapproved@example.test"]), "explicitDeny"],
  ["mixed To or Cc recipients", "ses:SendEmail", emailResources, ctx([recipient, "unapproved@example.test"]), "explicitDeny"],
  ["missing recipient condition", "ses:SendEmail", emailResources, ctx(null), "explicitDeny"],
  ["raw email transport", "ses:SendRawEmail", emailResources, ctx([recipient]), "explicitDeny"],
  ["test records", "dynamodb:PutItem", [values["RosewoodTable.Arn"]], [], "allowed"],
  ["transaction condition check", "dynamodb:ConditionCheckItem", [values["RosewoodTable.Arn"]], [], "allowed"],
  ["audit append", "dynamodb:PutItem", [values["RosewoodAuditTable.Arn"]], [], "allowed"],
  ["audit rewrite", "dynamodb:UpdateItem", [values["RosewoodAuditTable.Arn"]], [], "implicitDeny"],
  ["audit deletion", "dynamodb:DeleteItem", [values["RosewoodAuditTable.Arn"]], [], "implicitDeny"],
  ["outside records", "dynamodb:PutItem", [`${prefix}dynamodb:${ar}table/not-this-test`], [], "explicitDeny"],
  ["test staged file", "s3:PutObject", [values["RosewoodDocumentStagingBucket.Arn"] + "/pending/synthetic.pdf"], [], "allowed"],
  ["outside staged file", "s3:GetObject", [`${prefix}s3:::not-this-test/private/file.pdf`], [], "explicitDeny"],
  ["test secret", "secretsmanager:GetSecretValue", [values.SyntheticConfigSecret], [], "allowed"],
  ["outside secret", "secretsmanager:GetSecretValue", [`${prefix}secretsmanager:${ar}secret:not-this-test-ABCDEF`], [], "explicitDeny"],
  ["test encryption", "kms:Decrypt", [values["RosewoodKey.Arn"]], [], "allowed"],
  ["outside encryption", "kms:Decrypt", [`${prefix}kms:${ar}key/00000000-0000-4000-8000-000000000002`], [], "explicitDeny"],
  ["production metrics", "cloudwatch:PutMetricData", ["*"], [{ ContextKeyName: "cloudwatch:namespace", ContextKeyType: "string", ContextKeyValues: ["Rosewood/Enrolment"] }], "implicitDeny"]
];
const directory = mkdtempSync(path.join(tmpdir(), "rosewood-synthetic-iam-"));
try {
  for (const [name, action, resources, context, expected] of cases) {
    const file = path.join(directory, "input.json");
    writeFileSync(file, JSON.stringify({ PolicyInputList: [JSON.stringify(policy)], ActionNames: [action], ResourceArns: resources, ContextEntries: context }), { mode: 0o600 });
    const response = aws(["iam", "simulate-custom-policy", "--cli-input-json", `file://${file}`]);
    assert.equal(response.EvaluationResults.length, 1, name);
    for (const result of response.EvaluationResults) {
      assert.equal(result.EvalDecision, expected, name);
      if (resources.length > 1) {
        assert.equal(result.ResourceSpecificResults.length, resources.length, name);
        for (const resource of result.ResourceSpecificResults) assert.equal(resource.EvalResourceDecision, expected, name);
      }
    }
    console.log(`${name}: ${expected}`);
  }
  console.log(`${cases.length} IAM simulation cases passed. No AWS resources or messages created.`);
} finally { rmSync(directory, { recursive: true, force: true }); }
