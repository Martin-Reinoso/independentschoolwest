#!/usr/bin/env node
import { buildService, loadSecret } from "../index.mjs";
import { DynamoStore } from "../dynamo-store.mjs";
import { recordFormReference } from "../form-definitions.mjs";
import { additionalGuardianSignatureRecipients, queueMissingGuardianSignatureInvitations } from "../service.mjs";

function option(name) {
  const exact = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return exact ? exact.slice(name.length + 3) : "";
}

const applicationId = option("application-id");
const apply = process.argv.includes("--apply");
if (!applicationId) {
  console.error("Provide --application-id=APPLICATION_ID. The command is a dry run unless --apply is also supplied.");
  process.exit(2);
}

const config = { ...process.env, ...await loadSecret() };
const store = new DynamoStore({ tableName: config.ROSEWOOD_TABLE_NAME, auditTableName: config.ROSEWOOD_AUDIT_TABLE_NAME });
const application = await store.getApplication(applicationId);
if (!application) throw new Error("Application not found.");

const existingTasks = await store.listSignatureTasksForApplication(application.id);
const existingGuardianIds = new Set(existingTasks.map(task => task.guardianId));
const signedGuardianIds = new Set((application.signatures || []).map(signature => signature.guardianId));
const missing = additionalGuardianSignatureRecipients(application.values || {}, application.guardianCount || 1, recordFormReference(application, "application").formVersion)
  .filter(recipient => {
    const guardianId = application.guardianIds?.[recipient.index];
    const control = application.signerControls?.find(item => Number(item.guardianIndex) === Number(recipient.index));
    return guardianId && control?.contactPermission !== false && !existingGuardianIds.has(guardianId) && !signedGuardianIds.has(guardianId);
  });

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", status: application.status, requiredSignatures: Number(application.requiredSignatureCount || 0), completedSignatures: (application.signatures || []).length, missingSignatureRequests: missing.length }));
if (!apply) {
  console.log("Dry run only. Re-run with --apply after confirming the application and recovery reason.");
  process.exit(0);
}

const result = await queueMissingGuardianSignatureInvitations({
  store,
  applicationId: application.id,
  signingPageUrl: config.APPLICATION_SIGNING_PAGE_URL,
  actorId: option("actor") || "staff-cli"
});
const service = await buildService({ store, config });
const dispatch = await service.dispatchOutbox(50);
console.log(JSON.stringify({ ...result, outboxCompleted: dispatch.completed }));
