import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

function conditional(error) {
  return error?.name === "ConditionalCheckFailedException" || error?.name === "TransactionCanceledException";
}

function conflict(message = "The record changed while this operation was being completed.") {
  return Object.assign(new Error(message), { status: 409, code: "REVISION_CONFLICT" });
}

export function applicationRevisionKey(revision, kind = "saved") {
  const sequence = String(Math.max(0, Number(revision) || 0)).padStart(8, "0");
  const event = String(kind || "saved").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 40);
  return `REV#${sequence}#${event}`;
}

export class DynamoStore {
  constructor({ tableName, auditTableName, client, now = () => Date.now() }) {
    if (!tableName) throw new Error("DynamoDB tableName is required.");
    this.tableName = tableName;
    this.auditTableName = auditTableName || tableName;
    this.client = client || DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
    this.now = now;
  }

  key(PK, SK = "META") { return { PK, SK }; }

  async get(PK, SK = "META") {
    return (await this.client.send(new GetCommand({ TableName: this.tableName, Key: this.key(PK, SK), ConsistentRead: true }))).Item?.data || null;
  }

  getEoi(id) { return this.get(`EOI#${id}`); }
  getInvitation(tokenHash) { return this.get(`INVITE#${tokenHash}`); }
  getInvitationById(id) { return this.get(`INVITE_ID#${id}`); }
  getApplication(id) { return this.get(`APP#${id}`, "CURRENT"); }
  getApplicationRevision(id, revisionKey) { return this.get(`APP#${id}`, revisionKey); }
  getFormDefinition(workflow, formVersion) { return this.get(`FORM#${workflow}#${formVersion}`); }
  getChallenge(id) { return this.get(`CHALLENGE#${id}`); }
  getSession(tokenHash) { return this.get(`SESSION#${tokenHash}`); }
  getSignatureTask(tokenHash) { return this.get(`SIGN_TASK#${tokenHash}`); }
  getIdempotency(keyHash) { return this.get(`IDEMPOTENCY#${keyHash}`); }
  getUpload(id) { return this.get(`UPLOAD#${id}`); }

  auditActions(events = []) {
    return events.map(event => ({ Put: {
      TableName: this.auditTableName,
      Item: { PK: "AUDIT", SK: `${event.occurredAt}#${event.eventId}`, entity: "audit", data: event },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
    } }));
  }

  async recordAudit(event) {
    await this.client.send(new PutCommand({
      TableName: this.auditTableName,
      Item: { PK: "AUDIT", SK: `${event.occurredAt}#${event.eventId}`, entity: "audit", data: event },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
    }));
    return event;
  }

  async listAudit(limit = 100) {
    const maximum = Math.max(1, Math.min(5000, Number(limit) || 100));
    const items = [];
    let ExclusiveStartKey;
    do {
      const response = await this.client.send(new QueryCommand({
        TableName: this.auditTableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": "AUDIT" },
        ScanIndexForward: false,
        Limit: Math.min(500, maximum - items.length),
        ExclusiveStartKey,
        ConsistentRead: true
      }));
      items.push(...(response.Items || []));
      ExclusiveStartKey = response.LastEvaluatedKey;
    } while (ExclusiveStartKey && items.length < maximum);
    return items.slice(0, maximum).map(item => item.data);
  }

  outboxActions(events) {
    return events.map(event => ({ Put: { TableName: this.tableName, Item: { ...this.key("OUTBOX", `PENDING#${event.createdAt}#${event.id}`), entity: "outbox", ttl: Math.floor((this.now() + 30 * 86400_000) / 1000), data: event }, ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" } }));
  }

  revisionAction(applicationId, revisionRecord) {
    return { Put: {
      TableName: this.tableName,
      Item: {
        ...this.key(`APP#${applicationId}`, applicationRevisionKey(revisionRecord.revision, revisionRecord.kind)),
        entity: "application_revision",
        data: revisionRecord
      },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
    } };
  }

  async ensureFormDefinition(definition) {
    const PK = `FORM#${definition.workflow}#${definition.formVersion}`;
    const existing = await this.get(PK);
    if (existing) {
      if (existing.definitionHash !== definition.definitionHash) throw conflict("The stored form definition does not match this release.");
      return existing;
    }
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: { ...this.key(PK), entity: "form_definition", data: definition },
        ConditionExpression: "attribute_not_exists(PK)"
      }));
      return definition;
    } catch (error) {
      if (!conditional(error)) throw error;
      const raced = await this.get(PK);
      if (raced?.definitionHash === definition.definitionHash) return raced;
      throw conflict("The stored form definition does not match this release.");
    }
  }

  async createEoi(eoi, outboxEvents, auditEvents = []) {
    await this.client.send(new TransactWriteCommand({ TransactItems: [{ Put: { TableName: this.tableName, Item: { ...this.key(`EOI#${eoi.id}`), entity: "eoi", data: eoi }, ConditionExpression: "attribute_not_exists(PK)" } }, ...this.outboxActions(outboxEvents), ...this.auditActions(auditEvents)] }));
    return eoi;
  }

  async createInvitation({ invitation, tokenHash, application, revisionRecord, outboxEvents, auditEvents = [] }) {
    await this.client.send(new TransactWriteCommand({ TransactItems: [
      { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE#${tokenHash}`), entity: "invitation", ttl: Math.floor(invitation.expiresAt / 1000) + 86400, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
      { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE_ID#${invitation.id}`), entity: "invitation_index", ttl: Math.floor(invitation.expiresAt / 1000) + 86400, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
      { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${application.id}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "attribute_not_exists(PK)" } },
      this.revisionAction(application.id, revisionRecord),
      ...this.outboxActions(outboxEvents),
      ...this.auditActions(auditEvents)
    ] }));
    return { invitation, application };
  }

  async rotateInvitation({ invitation, previousTokenHash, tokenHash, outboxEvents, auditEvents = [] }) {
    const ttl = Math.floor(invitation.expiresAt / 1000) + 86400;
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Delete: { TableName: this.tableName, Key: this.key(`INVITE#${previousTokenHash}`), ConditionExpression: "attribute_exists(PK)" } },
        { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE#${tokenHash}`), entity: "invitation", ttl, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
        { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE_ID#${invitation.id}`), entity: "invitation_index", ttl, data: invitation }, ConditionExpression: "#data.#tokenHash = :previous", ExpressionAttributeNames: { "#data": "data", "#tokenHash": "tokenHash" }, ExpressionAttributeValues: { ":previous": previousTokenHash } } },
        ...this.outboxActions(outboxEvents),
        ...this.auditActions(auditEvents)
      ] }));
      return invitation;
    } catch (error) { if (conditional(error)) throw conflict("This invitation changed before it could be resent. Refresh the portal and try again."); throw error; }
  }

  async addApplicationToInvitation({ invitation, expectedFamilyRevision, application, revisionRecord, outboxEvents, auditEvents = [] }) {
    const ttl = Math.floor(invitation.expiresAt / 1000) + 86400;
    const revisionCondition = expectedFamilyRevision === 0
      ? "attribute_not_exists(#data.#familyRevision) OR #data.#familyRevision = :familyRevision"
      : "#data.#familyRevision = :familyRevision";
    const invitationCondition = {
      ConditionExpression: `#data.#tokenHash = :tokenHash AND (${revisionCondition})`,
      ExpressionAttributeNames: { "#data": "data", "#tokenHash": "tokenHash", "#familyRevision": "familyRevision" },
      ExpressionAttributeValues: { ":tokenHash": invitation.tokenHash, ":familyRevision": expectedFamilyRevision }
    };
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${application.id}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "attribute_not_exists(PK)" } },
        this.revisionAction(application.id, revisionRecord),
        { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE#${invitation.tokenHash}`), entity: "invitation", ttl, data: invitation }, ...invitationCondition } },
        { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE_ID#${invitation.id}`), entity: "invitation_index", ttl, data: invitation }, ...invitationCondition } },
        ...this.outboxActions(outboxEvents),
        ...this.auditActions(auditEvents)
      ] }));
      return { invitation, application };
    } catch (error) { if (conditional(error)) throw conflict("The family invitation changed before the child application could be added. Refresh and try again."); throw error; }
  }

  async putChallenge(challenge) {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: { ...this.key(`CHALLENGE#${challenge.id}`), entity: "challenge", ttl: challenge.ttl, data: challenge }, ConditionExpression: "attribute_not_exists(PK)" }));
  }

  async consumeChallenge(id, codeHmac, nowMs) {
    try {
      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`CHALLENGE#${id}`),
        UpdateExpression: "SET #data.#usedAt = :usedAt",
        ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(#data.#usedAt) AND #data.#expiresAt > :now AND #data.#attempts < #data.#maxAttempts AND #data.#codeHmac = :code",
        ExpressionAttributeNames: { "#data": "data", "#usedAt": "usedAt", "#expiresAt": "expiresAt", "#attempts": "attempts", "#maxAttempts": "maxAttempts", "#codeHmac": "codeHmac" },
        ExpressionAttributeValues: { ":usedAt": new Date(nowMs).toISOString(), ":now": nowMs, ":code": codeHmac }, ReturnValues: "ALL_NEW"
      }));
      return result.Attributes?.data || null;
    } catch (error) { if (conditional(error)) return null; throw error; }
  }

  async failChallenge(id) {
    try {
      await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: this.key(`CHALLENGE#${id}`), UpdateExpression: "SET #data.#attempts = if_not_exists(#data.#attempts, :zero) + :one", ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(#data.#usedAt) AND #data.#attempts < #data.#maxAttempts", ExpressionAttributeNames: { "#data": "data", "#attempts": "attempts", "#usedAt": "usedAt", "#maxAttempts": "maxAttempts" }, ExpressionAttributeValues: { ":zero": 0, ":one": 1 } }));
    } catch (error) { if (!conditional(error)) throw error; }
  }

  async putSession(session) {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: { ...this.key(`SESSION#${session.tokenHash}`), entity: "session", ttl: session.ttl, data: session } }));
  }

  async touchSession(tokenHash, { expiresAt, absoluteExpiresAt, lastActivityAt, now, ttl }) {
    try {
      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`SESSION#${tokenHash}`),
        UpdateExpression: "SET #data.#expiresAt = :expiresAt, #data.#absoluteExpiresAt = :absoluteExpiresAt, #data.#lastActivityAt = :lastActivityAt, #ttl = :ttl",
        ConditionExpression: "attribute_exists(PK) AND #data.#expiresAt > :now",
        ExpressionAttributeNames: { "#data": "data", "#expiresAt": "expiresAt", "#absoluteExpiresAt": "absoluteExpiresAt", "#lastActivityAt": "lastActivityAt", "#ttl": "ttl" },
        ExpressionAttributeValues: { ":expiresAt": expiresAt, ":absoluteExpiresAt": absoluteExpiresAt, ":lastActivityAt": lastActivityAt, ":ttl": ttl, ":now": now },
        ReturnValues: "ALL_NEW"
      }));
      return result.Attributes?.data || null;
    } catch (error) { if (conditional(error)) return null; throw error; }
  }

  async deleteSession(tokenHash) {
    await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: this.key(`SESSION#${tokenHash}`) }));
  }

  async putUpload(upload) {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: { ...this.key(`UPLOAD#${upload.id}`), entity: "upload", ttl: Math.floor((upload.expiresAt + 86400_000) / 1000), data: upload },
      ConditionExpression: "attribute_not_exists(PK)"
    }));
  }

  async deleteUpload(id) {
    await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: this.key(`UPLOAD#${id}`) }));
  }

  async saveDraft({ applicationId, expectedRevision, values, screen, stage, percentComplete, guardianCount, emergencyCount, savedAt, formVersion, formDefinitionHash, schemaVersion, revisionRecord, outboxEvents, auditEvents = [] }) {
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Update: {
          TableName: this.tableName,
          Key: this.key(`APP#${applicationId}`, "CURRENT"),
          UpdateExpression: "SET #data.#revision = #data.#revision + :one, #data.#values = :values, #data.#screen = :screen, #data.#currentStage = :stage, #data.#percentComplete = :percentComplete, #data.#guardianCount = :guardianCount, #data.#emergencyCount = :emergencyCount, #data.#updatedAt = :savedAt, #data.#status = :status, #data.#formVersion = :formVersion, #data.#formDefinitionHash = :formDefinitionHash, #data.#schemaVersion = :schemaVersion",
          ConditionExpression: "#data.#revision = :expected AND (#data.#status = :invited OR #data.#status = :inProgress)",
          ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#values": "values", "#screen": "screen", "#currentStage": "currentStage", "#percentComplete": "percentComplete", "#guardianCount": "guardianCount", "#emergencyCount": "emergencyCount", "#updatedAt": "updatedAt", "#status": "status", "#formVersion": "formVersion", "#formDefinitionHash": "formDefinitionHash", "#schemaVersion": "schemaVersion" },
          ExpressionAttributeValues: { ":one": 1, ":values": values, ":screen": screen, ":stage": stage, ":percentComplete": percentComplete, ":guardianCount": guardianCount, ":emergencyCount": emergencyCount, ":savedAt": savedAt, ":status": "in_progress", ":formVersion": formVersion, ":formDefinitionHash": formDefinitionHash, ":schemaVersion": schemaVersion, ":expected": Number(expectedRevision), ":invited": "invited", ":inProgress": "in_progress" }
        } },
        this.revisionAction(applicationId, revisionRecord),
        ...this.outboxActions(outboxEvents),
        ...this.auditActions(auditEvents)
      ] }));
      return this.getApplication(applicationId);
    } catch (error) { if (conditional(error)) throw conflict(); throw error; }
  }

  async upgradeApplicationDefinition({ application, expectedRevision, expectedFormVersion, revisionRecord, outboxEvents = [], auditEvents = [] }) {
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Put: {
          TableName: this.tableName,
          Item: { ...this.key(`APP#${application.id}`, "CURRENT"), entity: "application", data: application },
          ConditionExpression: "#data.#revision = :revision AND #data.#formVersion = :formVersion AND (#data.#status = :invited OR #data.#status = :inProgress)",
          ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#formVersion": "formVersion", "#status": "status" },
          ExpressionAttributeValues: { ":revision": Number(expectedRevision), ":formVersion": expectedFormVersion, ":invited": "invited", ":inProgress": "in_progress" }
        } },
        this.revisionAction(application.id, revisionRecord),
        ...this.outboxActions(outboxEvents),
        ...this.auditActions(auditEvents)
      ] }));
      return application;
    } catch (error) { if (conditional(error)) throw conflict("The application changed while its form definition was being updated. Reload and try again."); throw error; }
  }

  async attachDocument({ applicationId, document, uploadId, outboxEvents = [], auditEvents = [] }) {
    const app = await this.getApplication(applicationId);
    if (!app || !["invited", "in_progress"].includes(app.status)) throw conflict("The application is no longer editable.");
    const documents = { ...(app.documents || {}), [document.category]: [...(app.documents?.[document.category] || []), document] };
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Update: { TableName: this.tableName, Key: this.key(`APP#${applicationId}`, "CURRENT"), UpdateExpression: "SET #data.#documents = :documents, #data.#updatedAt = :now", ConditionExpression: "#data.#revision = :revision AND (#data.#status = :invited OR #data.#status = :inProgress)", ExpressionAttributeNames: { "#data": "data", "#documents": "documents", "#updatedAt": "updatedAt", "#revision": "revision", "#status": "status" }, ExpressionAttributeValues: { ":documents": documents, ":now": new Date(this.now()).toISOString(), ":revision": app.revision, ":invited": "invited", ":inProgress": "in_progress" } } },
        { Delete: { TableName: this.tableName, Key: this.key(`UPLOAD#${uploadId}`), ConditionExpression: "attribute_exists(PK)" } },
        ...this.outboxActions(outboxEvents),
        ...this.auditActions(auditEvents)
      ] }));
      return document;
    } catch (error) { if (conditional(error)) throw conflict(); throw error; }
  }

  async submitApplication({ applicationId, expectedRevision, application, revisionRecord, signatureTasks, outboxEvents, auditEvents = [] }) {
    const actions = [
      { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${applicationId}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "#data.#revision = :revision AND (#data.#status = :invited OR #data.#status = :inProgress)", ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#status": "status" }, ExpressionAttributeValues: { ":revision": Number(expectedRevision), ":invited": "invited", ":inProgress": "in_progress" } } },
      this.revisionAction(applicationId, revisionRecord)
    ];
    for (const task of signatureTasks) actions.push({ Put: { TableName: this.tableName, Item: { ...this.key(`SIGN_TASK#${task.tokenHash}`), entity: "signature_task", ttl: task.ttl, data: task }, ConditionExpression: "attribute_not_exists(PK)" } });
    actions.push(...this.outboxActions(outboxEvents), ...this.auditActions(auditEvents));
    try { await this.client.send(new TransactWriteCommand({ TransactItems: actions })); return application; }
    catch (error) { if (conditional(error)) throw conflict(); throw error; }
  }

  async completeSignature({ applicationId, taskTokenHash, guardianIndex, application, outboxEvents, auditEvents = [] }) {
    const actions = [
      { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${applicationId}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "#data.#revision = :revision AND (#data.#status = :pending) AND (attribute_not_exists(#data.#signerControls) OR #data.#signerControls[" + Number(guardianIndex) + "].#taskTokenHash = :taskTokenHash)", ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#status": "status", "#signerControls": "signerControls", "#taskTokenHash": "taskTokenHash" }, ExpressionAttributeValues: { ":revision": application.revision, ":pending": "pending_signatures", ":taskTokenHash": taskTokenHash } } },
      { Update: { TableName: this.tableName, Key: this.key(`SIGN_TASK#${taskTokenHash}`), UpdateExpression: "SET #data.#status = :signed, #data.#signedAt = :signedAt", ConditionExpression: "#data.#status = :invited", ExpressionAttributeNames: { "#data": "data", "#status": "status", "#signedAt": "signedAt" }, ExpressionAttributeValues: { ":signed": "signed", ":signedAt": application.updatedAt, ":invited": "invited" } } },
      ...this.outboxActions(outboxEvents),
      ...this.auditActions(auditEvents)
    ];
    try { await this.client.send(new TransactWriteCommand({ TransactItems: actions })); return application; }
    catch (error) { if (conditional(error)) throw conflict("This signature request has already been completed or the application changed."); throw error; }
  }

  async recordSignatureProgress({ applicationId, guardianIndex, taskTokenHash, requestStatus, at, messageId = "" }) {
    const index = Number(guardianIndex);
    const eventField = requestStatus === "sent" ? "requestSentAt" : requestStatus === "opened" ? "openedAt" : "emailVerifiedAt";
    const taskFields = `SET #data.#requestStatus = :requestStatus, #data.#eventField = if_not_exists(#data.#eventField, :at)${requestStatus === "sent" ? ", #data.#requestSent = :yes, #data.#messageId = :messageId, #data.#deliveryStatus = :deliveryStatus, #data.#deliveryAt = if_not_exists(#data.#deliveryAt, :at)" : ""}`;
    const controlFields = `SET #data.#signerControls[${index}].#requestStatus = :requestStatus, #data.#signerControls[${index}].#eventField = if_not_exists(#data.#signerControls[${index}].#eventField, :at), #data.#updatedAt = :at${requestStatus === "sent" ? `, #data.#signerControls[${index}].#requestSent = :yes, #data.#signerControls[${index}].#deliveryStatus = :deliveryStatus, #data.#signerControls[${index}].#deliveryAt = if_not_exists(#data.#signerControls[${index}].#deliveryAt, :at)` : ""}`;
    const controlNames = { "#data": "data", "#signerControls": "signerControls", "#taskTokenHash": "taskTokenHash", "#requestStatus": "requestStatus", "#eventField": eventField, "#updatedAt": "updatedAt", "#status": "status", ...(requestStatus === "sent" ? { "#requestSent": "requestSent", "#deliveryStatus": "deliveryStatus", "#deliveryAt": "deliveryAt" } : {}) };
    const controlValues = { ":requestStatus": requestStatus, ":at": at, ":taskTokenHash": taskTokenHash, ":pending": "pending_signatures", ...(requestStatus === "sent" ? { ":yes": true, ":deliveryStatus": "accepted_by_ses" } : {}) };
    const taskNames = { "#data": "data", "#requestStatus": "requestStatus", "#eventField": eventField, "#status": "status", ...(requestStatus === "sent" ? { "#requestSent": "requestSent", "#messageId": "messageId", "#deliveryStatus": "deliveryStatus", "#deliveryAt": "deliveryAt" } : {}) };
    const taskValues = { ":requestStatus": requestStatus, ":at": at, ":invited": "invited", ...(requestStatus === "sent" ? { ":yes": true, ":messageId": messageId, ":deliveryStatus": "accepted_by_ses" } : {}) };
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Update: { TableName: this.tableName, Key: this.key(`APP#${applicationId}`, "CURRENT"), UpdateExpression: controlFields, ConditionExpression: `#data.#status = :pending AND #data.#signerControls[${index}].#taskTokenHash = :taskTokenHash`, ExpressionAttributeNames: controlNames, ExpressionAttributeValues: controlValues } },
        { Update: { TableName: this.tableName, Key: this.key(`SIGN_TASK#${taskTokenHash}`), UpdateExpression: taskFields, ConditionExpression: "#data.#status = :invited", ExpressionAttributeNames: taskNames, ExpressionAttributeValues: taskValues } }
      ] }));
      return true;
    } catch (error) { if (conditional(error)) return false; throw error; }
  }

  async replaceSignatureRequest({ applicationId, expectedControlRevision, previousTaskTokenHash, application, nextTask, idempotency, outboxEvents = [], auditEvents = [] }) {
    const actions = [
      { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${applicationId}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "#data.#signatureControlRevision = :expected AND (#data.#status = :pending OR #data.#status = :staffReview)", ExpressionAttributeNames: { "#data": "data", "#signatureControlRevision": "signatureControlRevision", "#status": "status" }, ExpressionAttributeValues: { ":expected": Number(expectedControlRevision), ":pending": "pending_signatures", ":staffReview": "staff_review_required" } } }
    ];
    if (previousTaskTokenHash) actions.push({ Update: { TableName: this.tableName, Key: this.key(`SIGN_TASK#${previousTaskTokenHash}`), UpdateExpression: "SET #data.#status = :revoked, #data.#revokedAt = :revokedAt, #data.#revocationReason = :reason", ConditionExpression: "#data.#status = :invited", ExpressionAttributeNames: { "#data": "data", "#status": "status", "#revokedAt": "revokedAt", "#revocationReason": "revocationReason" }, ExpressionAttributeValues: { ":revoked": "revoked", ":revokedAt": application.updatedAt, ":reason": idempotency?.operation || "signature_request_replaced", ":invited": "invited" } } });
    if (nextTask) actions.push({ Put: { TableName: this.tableName, Item: { ...this.key(`SIGN_TASK#${nextTask.tokenHash}`), entity: "signature_task", ttl: nextTask.ttl, data: nextTask }, ConditionExpression: "attribute_not_exists(PK)" } });
    if (idempotency) actions.push({ Put: { TableName: this.tableName, Item: { ...this.key(`IDEMPOTENCY#${idempotency.keyHash}`), entity: "idempotency", ttl: idempotency.ttl, data: idempotency }, ConditionExpression: "attribute_not_exists(PK)" } });
    actions.push(...this.outboxActions(outboxEvents), ...this.auditActions(auditEvents));
    try { await this.client.send(new TransactWriteCommand({ TransactItems: actions })); return application; }
    catch (error) { if (conditional(error)) throw conflict("The signature request changed before this operation completed. Refresh the status and try again."); throw error; }
  }

  async revokeSigningArtifacts(taskTokenHash, at, reason) {
    let challenges = 0;
    let sessions = 0;
    let ExclusiveStartKey;
    do {
      const response = await this.client.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "(#entity = :challenge AND #data.#subjectHash = :taskHash) OR (#entity = :session AND #data.#taskTokenHash = :taskHash)",
        ExpressionAttributeNames: { "#entity": "entity", "#data": "data", "#subjectHash": "subjectHash", "#taskTokenHash": "taskTokenHash" },
        ExpressionAttributeValues: { ":challenge": "challenge", ":session": "session", ":taskHash": taskTokenHash },
        ExclusiveStartKey
      }));
      for (const item of response.Items || []) {
        if (item.entity === "challenge") challenges += 1;
        if (item.entity === "session") sessions += 1;
        await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: this.key(item.PK, item.SK), UpdateExpression: "SET #data.#revokedAt = :at, #data.#revocationReason = :reason, #data.#expiresAt = :zero", ExpressionAttributeNames: { "#data": "data", "#revokedAt": "revokedAt", "#revocationReason": "revocationReason", "#expiresAt": "expiresAt" }, ExpressionAttributeValues: { ":at": at, ":reason": reason, ":zero": 0 } }));
      }
      ExclusiveStartKey = response.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return { challenges, sessions };
  }

  async listSignatureTasksForApplication(applicationId) {
    const items = [];
    let ExclusiveStartKey;
    do {
      const response = await this.client.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "#entity = :entity AND #data.#applicationId = :applicationId",
        ExpressionAttributeNames: { "#entity": "entity", "#data": "data", "#applicationId": "applicationId" },
        ExpressionAttributeValues: { ":entity": "signature_task", ":applicationId": applicationId },
        ExclusiveStartKey,
        ConsistentRead: true
      }));
      items.push(...(response.Items || []).map(item => item.data));
      ExclusiveStartKey = response.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  async addSignatureTasks({ applicationId, revisionHash, expectedControlRevision = 0, application, signatureTasks, outboxEvents, auditEvents = [] }) {
    const actions = [{ Put: {
      TableName: this.tableName,
      Item: { ...this.key(`APP#${applicationId}`, "CURRENT"), entity: "application", data: application },
      ConditionExpression: "#data.#status = :pending AND #data.#revisionHash = :revisionHash AND (attribute_not_exists(#data.#signatureControlRevision) OR #data.#signatureControlRevision = :controlRevision)",
      ExpressionAttributeNames: { "#data": "data", "#status": "status", "#revisionHash": "revisionHash", "#signatureControlRevision": "signatureControlRevision" },
      ExpressionAttributeValues: { ":pending": "pending_signatures", ":revisionHash": revisionHash, ":controlRevision": Number(expectedControlRevision) }
    } }];
    for (const task of signatureTasks) actions.push({ Put: { TableName: this.tableName, Item: { ...this.key(`SIGN_TASK#${task.tokenHash}`), entity: "signature_task", ttl: task.ttl, data: task }, ConditionExpression: "attribute_not_exists(PK)" } });
    actions.push(...this.outboxActions(outboxEvents), ...this.auditActions(auditEvents));
    try { await this.client.send(new TransactWriteCommand({ TransactItems: actions })); }
    catch (error) { if (conditional(error)) throw conflict("The signature state changed before the missing request could be queued."); throw error; }
  }

  async checkRateLimit(key, limit, windowSeconds) {
    const bucket = Math.floor(this.now() / (windowSeconds * 1000));
    try {
      await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: this.key(`RATE#${key}#${bucket}`), UpdateExpression: "SET #ttl = :ttl ADD #count :one", ConditionExpression: "attribute_not_exists(#count) OR #count < :limit", ExpressionAttributeNames: { "#ttl": "ttl", "#count": "count" }, ExpressionAttributeValues: { ":ttl": Math.floor(this.now() / 1000) + windowSeconds * 2, ":one": 1, ":limit": limit } }));
      return true;
    } catch (error) { if (conditional(error)) return false; throw error; }
  }

  async enqueue(event) {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: { ...this.key("OUTBOX", `PENDING#${event.createdAt}#${event.id}`), entity: "outbox", ttl: Math.floor((this.now() + 30 * 86400_000) / 1000), data: event }, ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" }));
  }

  async listOutbox(limit = 25) {
    const response = await this.client.send(new QueryCommand({ TableName: this.tableName, KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)", ExpressionAttributeValues: { ":pk": "OUTBOX", ":prefix": "PENDING#" }, Limit: limit, ConsistentRead: true }));
    return response.Items || [];
  }

  async claimOutbox(item, nowMs) {
    try {
      const response = await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: this.key(item.PK, item.SK), UpdateExpression: "SET #leaseUntil = :lease, #attempts = if_not_exists(#attempts, :zero) + :one", ConditionExpression: "attribute_exists(PK) AND (attribute_not_exists(#leaseUntil) OR #leaseUntil < :now)", ExpressionAttributeNames: { "#leaseUntil": "leaseUntil", "#attempts": "attempts" }, ExpressionAttributeValues: { ":lease": nowMs + 60_000, ":now": nowMs, ":zero": 0, ":one": 1 }, ReturnValues: "ALL_NEW" }));
      return response.Attributes;
    } catch (error) { if (conditional(error)) return null; throw error; }
  }

  async completeOutbox(item, result) {
    await this.client.send(new TransactWriteCommand({ TransactItems: [
      { Delete: { TableName: this.tableName, Key: this.key(item.PK, item.SK), ConditionExpression: "attribute_exists(PK)" } },
      { Put: { TableName: this.tableName, Item: { ...this.key("OUTBOX_SENT", `SENT#${new Date(this.now()).toISOString()}#${item.data.id}`), entity: "outbox_receipt", ttl: Math.floor((this.now() + 30 * 86400_000) / 1000), data: { ...item.data, result, completedAt: new Date(this.now()).toISOString() } } } }
    ] }));
  }

  async releaseOutbox(item) {
    await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: this.key(item.PK, item.SK), UpdateExpression: "REMOVE #leaseUntil", ExpressionAttributeNames: { "#leaseUntil": "leaseUntil" } }));
  }

  async scanEntities(entities) {
    const values = Object.fromEntries(entities.map((entity, index) => [`:entity${index}`, entity]));
    const names = { "#entity": "entity" };
    const items = [];
    let ExclusiveStartKey;
    do {
      const response = await this.client.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: `#entity IN (${Object.keys(values).join(", ")})`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ExclusiveStartKey,
        ConsistentRead: true
      }));
      items.push(...(response.Items || []));
      ExclusiveStartKey = response.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  async listOperationalRecords() {
    return this.scanEntities(["eoi", "application", "invitation_index", "outbox_receipt"]);
  }

  async listApplicationRevisions(applicationId, limit = 100) {
    const maximum = Math.max(1, Math.min(500, Number(limit) || 100));
    const response = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `APP#${applicationId}`, ":prefix": "REV#" },
      ScanIndexForward: false,
      Limit: maximum,
      ConsistentRead: true
    }));
    return (response.Items || []).map(item => ({ revisionKey: item.SK, ...item.data }));
  }

  async backfillApplicationVersion({ application, formVersion, formDefinitionHash, schemaVersion, revisionRecord }) {
    const next = { ...application, formVersion, formDefinitionHash, schemaVersion };
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Put: {
          TableName: this.tableName,
          Item: { ...this.key(`APP#${application.id}`, "CURRENT"), entity: "application", data: next },
          ConditionExpression: "#data.#revision = :revision AND attribute_not_exists(#data.#formVersion)",
          ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#formVersion": "formVersion" },
          ExpressionAttributeValues: { ":revision": Number(application.revision || 0) }
        } },
        this.revisionAction(application.id, revisionRecord)
      ] }));
      return next;
    } catch (error) { if (conditional(error)) throw conflict("This application was already versioned or changed during migration."); throw error; }
  }

  async backfillEoiVersion({ eoi, formVersion, formDefinitionHash, schemaVersion }) {
    const next = { ...eoi, formVersion, formDefinitionHash, schemaVersion };
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: { ...this.key(`EOI#${eoi.id}`), entity: "eoi", data: next },
        ConditionExpression: "attribute_not_exists(#data.#formVersion)",
        ExpressionAttributeNames: { "#data": "data", "#formVersion": "formVersion" }
      }));
      return next;
    } catch (error) { if (conditional(error)) throw conflict("This expression of interest was already versioned during migration."); throw error; }
  }

  async findApplicationBySourceEoi(sourceEoiId) {
    const applications = await this.scanEntities(["application"]);
    return applications.map(item => item.data).find(application => application.sourceEoiId === sourceEoiId) || null;
  }
}
