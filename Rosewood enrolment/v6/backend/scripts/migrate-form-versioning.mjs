#!/usr/bin/env node
import { currentFormDefinition } from "../form-definitions.mjs";
import { DynamoStore } from "../dynamo-store.mjs";

function option(name) {
  const exact = process.argv.find(argument => argument.startsWith(`--${name}=`));
  return exact ? exact.slice(name.length + 3) : "";
}

const apply = process.argv.includes("--apply");
const tableName = option("table") || process.env.DYNAMODB_TABLE;
const auditTableName = option("audit-table") || process.env.AUDIT_TABLE || tableName;

if (!tableName) {
  console.error("Provide --table=TABLE_NAME or DYNAMODB_TABLE.");
  process.exit(2);
}

const store = new DynamoStore({ tableName, auditTableName });
const applicationDefinition = currentFormDefinition("application");
const eoiDefinition = currentFormDefinition("eoi");

const items = await store.scanEntities(["application", "eoi"]);
const applications = items.filter(item => item.entity === "application").map(item => item.data).filter(record => !record.formVersion);
const eois = items.filter(item => item.entity === "eoi").map(item => item.data).filter(record => !record.formVersion);

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", applicationsToVersion: applications.length, eoisToVersion: eois.length }));

if (!apply) {
  console.log("Dry run only. Re-run with --apply after creating and verifying a pre-migration backup.");
  process.exit(0);
}

await Promise.all([
  store.ensureFormDefinition(applicationDefinition),
  store.ensureFormDefinition(eoiDefinition)
]);

let applicationCount = 0;
let eoiCount = 0;
for (const application of applications) {
  const savedAt = application.updatedAt || application.createdAt || new Date().toISOString();
  const revisionRecord = {
    applicationId: application.id,
    revision: Number(application.revision || 0),
    kind: "migrated",
    status: application.status || "invited",
    screen: Number(application.screen || 0),
    stage: application.currentStage || "gateway",
    percentComplete: Number(application.percentComplete || 0),
    guardianCount: Number(application.guardianCount || 1),
    emergencyCount: Number(application.emergencyCount || 2),
    savedAt,
    saveMode: "migration_baseline",
    changedFields: [],
    values: application.values || {},
    formVersion: applicationDefinition.formVersion,
    formDefinitionHash: applicationDefinition.definitionHash,
    schemaVersion: applicationDefinition.schemaVersion
  };
  await store.backfillApplicationVersion({ application, formVersion: applicationDefinition.formVersion, formDefinitionHash: applicationDefinition.definitionHash, schemaVersion: applicationDefinition.schemaVersion, revisionRecord });
  applicationCount += 1;
}

for (const eoi of eois) {
  await store.backfillEoiVersion({ eoi, formVersion: eoiDefinition.formVersion, formDefinitionHash: eoiDefinition.definitionHash, schemaVersion: eoiDefinition.schemaVersion });
  eoiCount += 1;
}

console.log(JSON.stringify({ migratedApplications: applicationCount, migratedEois: eoiCount, status: "complete" }));
