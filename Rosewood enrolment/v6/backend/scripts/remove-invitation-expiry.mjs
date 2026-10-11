#!/usr/bin/env node
// No emails, application writes, token rotation or resurrection of expired access.
import crypto from "node:crypto";
import { DynamoStore } from "../dynamo-store.mjs";
import { activeInvitationAccess, invitationHasNoExpiry } from "../invitation-access.mjs";
import { recordFormReference } from "../form-definitions.mjs";
import { sheetOperation } from "../google-sheets.mjs";

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || "";
const apply = process.argv.includes("--apply");
const tableName = option("table");
const auditTableName = option("audit-table");
const actorId = option("actor");
if (!tableName || !auditTableName || (apply && (!actorId || option("confirm") !== "REMOVE_VALID_INVITATION_EXPIRY"))) {
  throw new Error("Provide --table and --audit-table. Apply also requires --actor and --confirm=REMOVE_VALID_INVITATION_EXPIRY after verifying both backups.");
}
const store = new DynamoStore({ tableName, auditTableName });
const records = await store.scanEntities(["invitation_index"]);
const counts = { mode: apply ? "apply" : "dry-run", validToMigrate: 0, alreadyPermanent: 0, expiredOrInactive: 0, changed: 0, conflicts: 0 };
for (const { data: invitation } of records) {
  if (invitationHasNoExpiry(invitation)) { counts.alreadyPermanent++; continue; }
  if (!activeInvitationAccess(invitation, Date.now()) || typeof invitation.expiresAt !== "number") { counts.expiredOrInactive++; continue; }
  counts.validToMigrate++;
  if (!apply) continue;
  const reference = recordFormReference(invitation, "application");
  const row = { invitation_id: invitation.id, application_id: invitation.applicationId, application_ids_json: invitation.applicationIds || [invitation.applicationId], recipient_contact_id: invitation.contactId, recipient_email: invitation.recipientEmail, student_id: invitation.studentId, source_eoi_id: invitation.sourceEoiId || "", invitation_source: invitation.invitationSource || "", status: invitation.status, created_at: invitation.createdAt, expires_at: "", first_sent_at: invitation.firstSentAt, last_sent_at: invitation.lastSentAt, send_count: invitation.sendCount, opened_at: invitation.openedAt || "", verified_at: invitation.verifiedAt || "", submitted_at: invitation.submittedAt || "", form_version: reference.formVersion, form_definition_hash: reference.formDefinitionHash, schema_version: reference.schemaVersion };
  const event = { id: `out-${crypto.randomUUID()}`, kind: "sheet", createdAt: new Date().toISOString(), payload: sheetOperation("operations", "Application Invitations", row, ["invitation_id"]) };
  try {
    const result = await store.removeInvitationExpiry({ invitation, actorId, outboxEvents: [event] });
    if (result.changed) counts.changed++;
  } catch (error) {
    if (error.code !== "REVISION_CONFLICT") throw error;
    counts.conflicts++;
  }
}
console.log(JSON.stringify(counts));
if (counts.conflicts) process.exitCode = 1;
