#!/usr/bin/env python3
"""Derive the isolated acceptance test stack. Requires PyYAML==6.0.3.

Run from any directory; output is next to template.yaml so `cloudformation package`
resolves lambda-dist identically. This script does not call AWS or read secrets.
"""
import json
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]


class Loader(yaml.SafeLoader):
    pass


def intrinsic(loader, tag, node):
    value = (loader.construct_scalar(node) if isinstance(node, yaml.ScalarNode)
             else loader.construct_sequence(node) if isinstance(node, yaml.SequenceNode)
             else loader.construct_mapping(node))
    if tag == "GetAtt" and isinstance(value, str):
        value = value.split(".", 1)
    return {tag if tag == "Ref" else "Fn::" + tag: value}


Loader.add_multi_constructor("!", intrinsic)


def own_resources(value):
    if isinstance(value, list):
        return [own_resources(item) for item in value]
    if isinstance(value, dict):
        if "Fn::If" in value:
            condition, yes, _ = value["Fn::If"]
            assert condition in {"CreateRecordsKey", "CreateAuditTable", "CreateBackupVault"}
            return own_resources(yes)
        return {key: own_resources(item) for key, item in value.items() if key != "Condition" or not isinstance(item, str)}
    return value


def ref(name):
    return {"Ref": name}


def sub(value):
    return {"Fn::Sub": value}


def att(name, attribute="Arn"):
    return {"Fn::GetAtt": [name, attribute]}


def build():
    template = own_resources(yaml.load((ROOT / "template.yaml").read_text(), Loader=Loader))
    template["Description"] = "Rosewood synthetic acceptance tests; separate resources; delivery disabled until configured"
    template.pop("Conditions")
    params = template["Parameters"]
    for key in ["ConfigSecretArn", "RecordsKmsKeyArn", "ExistingAuditTableName", "ExistingBackupVaultName", "SecurityNotificationEmail", "SecondarySecurityNotificationEmail", "PublicApiBaseUrl", "StaffEmails", "StaffRoles", "AllowedOrigins", "PublicSiteBaseUrl", "ReplyToEmail"]:
        del params[key]
    params["SenderEmail"]["AllowedValues"] = ["enrolment@ffe.org.au"]
    for key in [key for key in params if key.startswith("Google")]:
        params[key].update(Default="unconfigured", AllowedPattern="^[A-Za-z0-9_-]{10,}$")
    params.update({
        "SyntheticReady": {"Type": "String", "Default": "false", "AllowedValues": ["false", "true"]},
        "SyntheticGoogleClientId": {"Type": "String", "Default": ""},
        "TestEmailDestination": {"Type": "String", "Default": "frjativa@gmail.com", "AllowedValues": ["frjativa@gmail.com"]},
        "EmailDeliveryMode": {"Type": "String", "Default": "disabled", "AllowedValues": ["disabled", "test"]},
        "OutboxScheduleState": {"Type": "String", "Default": "DISABLED", "AllowedValues": ["DISABLED", "ENABLED"]}
    })
    template["Conditions"] = {"EmailTestMode": {"Fn::Equals": [ref("EmailDeliveryMode"), "test"]}}
    resources = template["Resources"]
    removed = [key for key in resources if "Backup" in key or "Security" in key or "Canary" in key]
    for key in removed:
        del resources[key]
    # No security-email subscriptions or production canary. Test alarms are observed
    # directly; the only SNS subscription is isolated SES feedback to this Lambda.
    namespace = sub("Rosewood/Synthetic/${AWS::StackName}")
    for resource in resources.values():
        props = resource.get("Properties", {})
        if resource["Type"] == "AWS::CloudWatch::Alarm":
            props.pop("AlarmActions", None)
            props.pop("OKActions", None)
            if props.get("Namespace") == "Rosewood/Enrolment":
                props["Namespace"] = namespace
        if resource["Type"] == "AWS::Logs::MetricFilter":
            for metric in props["MetricTransformations"]:
                metric["MetricNamespace"] = namespace
    resources["RosewoodTable"]["Properties"]["TableName"] = sub("${AWS::StackName}-records")
    resources["RosewoodAuditTable"]["Properties"]["TableName"] = sub("${AWS::StackName}-audit")
    bucket = resources["RosewoodDocumentStagingBucket"]["Properties"]
    bucket["BucketName"] = sub("${AWS::StackName}-${AWS::AccountId}-staging")
    bucket["CorsConfiguration"]["CorsRules"][0]["AllowedOrigins"] = ["http://127.0.0.1:8767"]
    resources["SyntheticConfigSecret"] = {
        "Type": "AWS::SecretsManager::Secret", "DeletionPolicy": "Retain", "UpdateReplacePolicy": "Retain",
        "Properties": {"Name": sub("${AWS::StackName}-config"), "KmsKeyId": att("RosewoodKey"),
                       "SecretString": '{"PROVISIONING_STATUS":"AWAITING_TEST_GOOGLE_IDENTITY"}'}}
    statements = resources["RosewoodRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]
    statements[:] = [s for s in statements if s.get("Sid") != "PublishCanaryMetrics"]
    for statement in statements:
        if statement["Action"] == "secretsmanager:GetSecretValue":
            statement["Resource"] = ref("SyntheticConfigSecret")
        if statement.get("Sid") == "SendTransactionalEmail":
            statement["Condition"].update({
                "ForAllValues:StringEquals": {"ses:Recipients": [ref("TestEmailDestination")]},
                "Null": {"ses:Recipients": "false"}})
    statements.extend([
        {"Sid": "DenyOtherEmailRecipients", "Effect": "Deny", "Action": "ses:*", "Resource": "*",
         "Condition": {"ForAnyValue:StringNotEquals": {"ses:Recipients": [ref("TestEmailDestination")]}}},
        {"Sid": "DenyUnboundedEmail", "Effect": "Deny", "Action": "ses:*", "Resource": "*",
         "Condition": {"Null": {"ses:Recipients": "true"}}},
        {"Sid": "DenyOtherEmailTransports", "Effect": "Deny", "Action": ["ses:SendRawEmail", "ses:SendBulkEmail", "ses:SendBulkTemplatedEmail", "ses:SendTemplatedEmail"], "Resource": "*"}
    ])
    for name, action, allowed in [
        ("Database", "dynamodb:*", [att("RosewoodTable"), att("RosewoodAuditTable")]),
        ("Storage", "s3:*", [att("RosewoodDocumentStagingBucket"), sub("${RosewoodDocumentStagingBucket.Arn}/pending/*")]),
        ("Secrets", "secretsmanager:*", [ref("SyntheticConfigSecret")]),
        ("Encryption", "kms:*", [att("RosewoodKey")])
    ]:
        statements.append({"Sid": "DenyOutsideTest" + name, "Effect": "Deny", "Action": action, "NotResource": allowed})
    function = resources["RosewoodFunction"]["Properties"]
    function["ReservedConcurrentExecutions"] = 2
    env = function["Environment"]["Variables"]
    env.update({
        "SYNTHETIC_STACK_NAME": ref("AWS::StackName"), "SYNTHETIC_READY": ref("SyntheticReady"),
        "SYNTHETIC_GOOGLE_CLIENT_ID": ref("SyntheticGoogleClientId"),
        "ROSEWOOD_CONFIG_SECRET_ARN": ref("SyntheticConfigSecret"),
        "EMAIL_DELIVERY_MODE": ref("EmailDeliveryMode"),
        "EMAIL_TEST_DESTINATION": {"Fn::If": ["EmailTestMode", ref("TestEmailDestination"), ""]},
        "EMAIL_TEST_IDENTITIES": {"Fn::If": ["EmailTestMode", "alex@rosewood-offer.test,taylor@rosewood-offer.test,staff@rosewood-offer.test", ""]},
        "REPLY_TO_EMAIL": ref("TestEmailDestination"), "COMMUNITY_ENQUIRY_NOTIFICATION_EMAIL": "staff@rosewood-offer.test",
        "STAFF_EMAILS": "staff@rosewood-offer.test", "STAFF_ROLES": "staff@rosewood-offer.test=admin",
        "ALLOWED_ORIGINS": "http://127.0.0.1:8767", "PUBLIC_SITE_BASE_URL": "http://127.0.0.1:8767",
        # Avoid a circular dependency on the Function URL; this is canary-only and
        # the production canary is explicitly unavailable in the synthetic runtime.
        "PUBLIC_API_BASE_URL": "",
        "SLACK_PENDING_WEBHOOK_URL": "", "SLACK_COMPLETION_WEBHOOK_URL": "", "SLACK_WEBHOOK_URL": ""
    })
    for key, filename in {
        "APPLICATION_PAGE_URL": "rosewood-enrolment-v6.html", "APPLICATION_SIGNING_PAGE_URL": "rosewood-application-sign-v6.html",
        "MEETING_BOOKING_PAGE_URL": "rosewood-enrolment-meeting-v1.html", "STAFF_PORTAL_URL": "rosewood-enrolment-admin-v6.html",
        "ENROLMENT_OFFER_PAGE_URL": "rosewood-enrolment-offer-v1.html"
    }.items():
        env[key] = "http://127.0.0.1:8767/pages/" + filename
    resources["RosewoodOutboxSchedule"]["Properties"]["State"] = ref("OutboxScheduleState")
    outputs = template["Outputs"]
    for key in ["BackupVaultName", "BackupRoleArn", "SecurityTopicArn", "CanaryScheduleName"]:
        del outputs[key]
    outputs.update(ConfigSecretArn={"Value": ref("SyntheticConfigSecret")}, RuntimeRoleArn={"Value": att("RosewoodRole")})
    # Fail on a future production template change that leaves a removed reference.
    encoded = json.dumps(template)
    for key in removed:
        assert f'"Ref": "{key}"' not in encoded and f'"{key}",' not in encoded and "${" + key not in encoded, key
    return template


if __name__ == "__main__":
    output = ROOT / "template.synthetic.json"
    output.write_text(json.dumps(build(), indent=2) + "\n")
    print(f"Generated {output.name}; no AWS changes made.")
