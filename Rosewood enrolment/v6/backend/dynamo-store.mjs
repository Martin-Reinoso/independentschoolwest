import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

function conditional(error) {
  return error?.name === "ConditionalCheckFailedException" || error?.name === "TransactionCanceledException";
}

function conflict(message = "The record changed while this operation was being completed.") {
  return Object.assign(new Error(message), { status: 409, code: "REVISION_CONFLICT" });
}

export class DynamoStore {
  constructor({ tableName, client, now = () => Date.now() }) {
    if (!tableName) throw new Error("DynamoDB tableName is required.");
    this.tableName = tableName;
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
  getChallenge(id) { return this.get(`CHALLENGE#${id}`); }
  getSession(tokenHash) { return this.get(`SESSION#${tokenHash}`); }
  getSignatureTask(tokenHash) { return this.get(`SIGN_TASK#${tokenHash}`); }

  outboxActions(events) {
    return events.map(event => ({ Put: { TableName: this.tableName, Item: { ...this.key("OUTBOX", `PENDING#${event.createdAt}#${event.id}`), entity: "outbox", ttl: Math.floor((this.now() + 30 * 86400_000) / 1000), data: event }, ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" } }));
  }

  async createEoi(eoi, outboxEvents) {
    await this.client.send(new TransactWriteCommand({ TransactItems: [{ Put: { TableName: this.tableName, Item: { ...this.key(`EOI#${eoi.id}`), entity: "eoi", data: eoi }, ConditionExpression: "attribute_not_exists(PK)" } }, ...this.outboxActions(outboxEvents)] }));
    return eoi;
  }

  async createInvitation({ invitation, tokenHash, application, outboxEvents }) {
    await this.client.send(new TransactWriteCommand({ TransactItems: [
      { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE#${tokenHash}`), entity: "invitation", ttl: Math.floor(invitation.expiresAt / 1000) + 86400, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
      { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE_ID#${invitation.id}`), entity: "invitation_index", ttl: Math.floor(invitation.expiresAt / 1000) + 86400, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
      { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${application.id}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "attribute_not_exists(PK)" } },
      ...this.outboxActions(outboxEvents)
    ] }));
    return { invitation, application };
  }

  async rotateInvitation({ invitation, previousTokenHash, tokenHash, outboxEvents }) {
    const ttl = Math.floor(invitation.expiresAt / 1000) + 86400;
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Delete: { TableName: this.tableName, Key: this.key(`INVITE#${previousTokenHash}`), ConditionExpression: "attribute_exists(PK)" } },
        { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE#${tokenHash}`), entity: "invitation", ttl, data: invitation }, ConditionExpression: "attribute_not_exists(PK)" } },
        { Put: { TableName: this.tableName, Item: { ...this.key(`INVITE_ID#${invitation.id}`), entity: "invitation_index", ttl, data: invitation }, ConditionExpression: "#data.#tokenHash = :previous", ExpressionAttributeNames: { "#data": "data", "#tokenHash": "tokenHash" }, ExpressionAttributeValues: { ":previous": previousTokenHash } } },
        ...this.outboxActions(outboxEvents)
      ] }));
      return invitation;
    } catch (error) { if (conditional(error)) throw conflict("This invitation changed before it could be resent. Refresh the portal and try again."); throw error; }
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

  async saveDraft({ applicationId, expectedRevision, values, screen, guardianCount, emergencyCount, savedAt, outboxEvents }) {
    try {
      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`APP#${applicationId}`, "CURRENT"),
        UpdateExpression: "SET #data.#revision = #data.#revision + :one, #data.#values = :values, #data.#screen = :screen, #data.#guardianCount = :guardianCount, #data.#emergencyCount = :emergencyCount, #data.#updatedAt = :savedAt, #data.#status = :status",
        ConditionExpression: "#data.#revision = :expected AND (#data.#status = :invited OR #data.#status = :inProgress)",
        ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#values": "values", "#screen": "screen", "#guardianCount": "guardianCount", "#emergencyCount": "emergencyCount", "#updatedAt": "updatedAt", "#status": "status" },
        ExpressionAttributeValues: { ":one": 1, ":values": values, ":screen": screen, ":guardianCount": guardianCount, ":emergencyCount": emergencyCount, ":savedAt": savedAt, ":status": "in_progress", ":expected": Number(expectedRevision), ":invited": "invited", ":inProgress": "in_progress" }, ReturnValues: "ALL_NEW"
      }));
      for (const event of outboxEvents) await this.enqueue(event);
      return result.Attributes.data;
    } catch (error) { if (conditional(error)) throw conflict(); throw error; }
  }

  async attachDocument(applicationId, document) {
    const app = await this.getApplication(applicationId);
    if (!app || !["invited", "in_progress"].includes(app.status)) throw conflict("The application is no longer editable.");
    const documents = { ...(app.documents || {}), [document.category]: [...(app.documents?.[document.category] || []), document] };
    try {
      await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: this.key(`APP#${applicationId}`, "CURRENT"), UpdateExpression: "SET #data.#documents = :documents, #data.#updatedAt = :now", ConditionExpression: "#data.#revision = :revision AND (#data.#status = :invited OR #data.#status = :inProgress)", ExpressionAttributeNames: { "#data": "data", "#documents": "documents", "#updatedAt": "updatedAt", "#revision": "revision", "#status": "status" }, ExpressionAttributeValues: { ":documents": documents, ":now": new Date(this.now()).toISOString(), ":revision": app.revision, ":invited": "invited", ":inProgress": "in_progress" } }));
      return document;
    } catch (error) { if (conditional(error)) throw conflict(); throw error; }
  }

  async submitApplication({ applicationId, expectedRevision, application, signatureTasks, outboxEvents }) {
    const actions = [{ Put: { TableName: this.tableName, Item: { ...this.key(`APP#${applicationId}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "#data.#revision = :revision AND (#data.#status = :invited OR #data.#status = :inProgress)", ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#status": "status" }, ExpressionAttributeValues: { ":revision": Number(expectedRevision), ":invited": "invited", ":inProgress": "in_progress" } } }];
    for (const task of signatureTasks) actions.push({ Put: { TableName: this.tableName, Item: { ...this.key(`SIGN_TASK#${task.tokenHash}`), entity: "signature_task", ttl: task.ttl, data: task }, ConditionExpression: "attribute_not_exists(PK)" } });
    actions.push(...this.outboxActions(outboxEvents));
    try { await this.client.send(new TransactWriteCommand({ TransactItems: actions })); return application; }
    catch (error) { if (conditional(error)) throw conflict(); throw error; }
  }

  async completeSignature({ applicationId, taskTokenHash, application, outboxEvents }) {
    const actions = [
      { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${applicationId}`, "CURRENT"), entity: "application", data: application }, ConditionExpression: "#data.#revision = :revision AND (#data.#status = :pending)", ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#status": "status" }, ExpressionAttributeValues: { ":revision": application.revision, ":pending": "pending_signatures" } } },
      { Update: { TableName: this.tableName, Key: this.key(`SIGN_TASK#${taskTokenHash}`), UpdateExpression: "SET #data.#status = :signed, #data.#signedAt = :signedAt", ConditionExpression: "#data.#status = :invited", ExpressionAttributeNames: { "#data": "data", "#status": "status", "#signedAt": "signedAt" }, ExpressionAttributeValues: { ":signed": "signed", ":signedAt": application.updatedAt, ":invited": "invited" } } },
      ...this.outboxActions(outboxEvents)
    ];
    try { await this.client.send(new TransactWriteCommand({ TransactItems: actions })); return application; }
    catch (error) { if (conditional(error)) throw conflict("This signature request has already been completed or the application changed."); throw error; }
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
}
