import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function conflict(message = "The record changed while this operation was being completed.") {
  return Object.assign(new Error(message), { status: 409, code: "REVISION_CONFLICT" });
}

function isConditional(error) {
  return error?.name === "ConditionalCheckFailedException" || error?.name === "TransactionCanceledException";
}

export class DynamoStore {
  constructor({ tableName, client, now = () => Date.now() }) {
    if (!tableName) throw new Error("DynamoDB tableName is required.");
    this.tableName = tableName;
    this.client = client || DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true }
    });
    this.now = now;
  }

  key(pk, sk = "META") { return { PK: pk, SK: sk }; }
  get(pk, sk = "META") { return this.client.send(new GetCommand({ TableName: this.tableName, Key: this.key(pk, sk), ConsistentRead: true })); }

  async getInvitation(tokenHash) { return clone((await this.get(`INVITE#${tokenHash}`)).Item?.data); }
  async getInvitationById(inviteId) { return clone((await this.get(`INVITE_ID#${inviteId}`)).Item?.data); }
  async getChallenge(id) { return clone((await this.get(`CHALLENGE#${id}`)).Item?.data); }
  async getSession(tokenHash) { return clone((await this.get(`SESSION#${tokenHash}`)).Item?.data); }
  async getApplication(id) { return clone((await this.get(`APP#${id}`, "CURRENT")).Item?.data); }
  async getSignatureTask(tokenHash) { return clone((await this.get(`TASK#${tokenHash}`)).Item?.data); }

  async putChallenge(challenge) {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: { ...this.key(`CHALLENGE#${challenge.id}`), entity: "challenge", ttl: challenge.ttl, data: clone(challenge) },
      ConditionExpression: "attribute_not_exists(PK)"
    }));
    return clone(challenge);
  }

  async failChallenge(id) {
    try {
      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`CHALLENGE#${id}`),
        UpdateExpression: "SET #data.#attempts = if_not_exists(#data.#attempts, :zero) + :one",
        ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(#data.#usedAt) AND #data.#attempts < #data.#maxAttempts",
        ExpressionAttributeNames: { "#data": "data", "#attempts": "attempts", "#usedAt": "usedAt", "#maxAttempts": "maxAttempts" },
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
        ReturnValues: "ALL_NEW"
      }));
      return clone(result.Attributes?.data);
    } catch (error) {
      if (isConditional(error)) return null;
      throw error;
    }
  }

  async consumeChallenge(id, codeHmac, nowMs) {
    try {
      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`CHALLENGE#${id}`),
        UpdateExpression: "SET #data.#usedAt = :usedAt",
        ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(#data.#usedAt) AND #data.#expiresAt > :now AND #data.#attempts < #data.#maxAttempts AND #data.#codeHmac = :code",
        ExpressionAttributeNames: { "#data": "data", "#usedAt": "usedAt", "#expiresAt": "expiresAt", "#attempts": "attempts", "#maxAttempts": "maxAttempts", "#codeHmac": "codeHmac" },
        ExpressionAttributeValues: { ":usedAt": new Date(nowMs).toISOString(), ":now": nowMs, ":code": codeHmac },
        ReturnValues: "ALL_NEW"
      }));
      return clone(result.Attributes?.data);
    } catch (error) {
      if (isConditional(error)) return null;
      throw error;
    }
  }

  async putSession(session) {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: { ...this.key(`SESSION#${session.tokenHash}`), entity: "session", ttl: session.ttl, data: clone(session) } }));
    return clone(session);
  }

  async revokeSession(tokenHash, at) {
    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: this.key(`SESSION#${tokenHash}`),
      UpdateExpression: "SET #data.#revokedAt = :at",
      ExpressionAttributeNames: { "#data": "data", "#revokedAt": "revokedAt" },
      ExpressionAttributeValues: { ":at": at }
    }));
  }

  async saveDraft({ applicationId, baseRevision, draft, savedAt }) {
    try {
      const result = await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`APP#${applicationId}`, "CURRENT"),
        UpdateExpression: "SET #data.#revision = #data.#revision + :one, #data.#draft = :draft, #data.#updatedAt = :savedAt, #data.#events = list_append(if_not_exists(#data.#events, :empty), :event)",
        ConditionExpression: "#data.#status = :draftStatus AND #data.#revision = :baseRevision",
        ExpressionAttributeNames: { "#data": "data", "#revision": "revision", "#draft": "draft", "#updatedAt": "updatedAt", "#events": "events", "#status": "status" },
        ExpressionAttributeValues: { ":one": 1, ":draft": clone(draft), ":savedAt": savedAt, ":empty": [], ":event": [{ type: "draft.saved", at: savedAt, revision: Number(baseRevision) + 1 }], ":draftStatus": "draft", ":baseRevision": Number(baseRevision) },
        ReturnValues: "ALL_NEW"
      }));
      return clone(result.Attributes.data);
    } catch (error) {
      if (isConditional(error)) throw conflict();
      throw error;
    }
  }

  async attachDocument(applicationId, document) {
    const app = await this.getApplication(applicationId);
    if (!app || app.status !== "draft") throw conflict("The application is no longer editable.");
    const documents = { ...(app.documents || {}), [document.category]: clone(document) };
    try {
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`APP#${applicationId}`, "CURRENT"),
        UpdateExpression: "SET #data.#documents = :documents",
        ConditionExpression: "#data.#status = :draftStatus AND #data.#revision = :revision",
        ExpressionAttributeNames: { "#data": "data", "#documents": "documents", "#status": "status", "#revision": "revision" },
        ExpressionAttributeValues: { ":documents": documents, ":draftStatus": "draft", ":revision": app.revision }
      }));
      return clone(document);
    } catch (error) {
      if (isConditional(error)) throw conflict();
      throw error;
    }
  }

  async recordEngagement(record) {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: { ...this.key(`APP#${record.applicationId}`, `EVENT#${record.occurredAt}#${record.id}`), entity: "engagement", data: clone(record) },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
    }));
    return clone(record);
  }

  async checkRateLimit(key, limit, windowSeconds) {
    const bucket = Math.floor(this.now() / (windowSeconds * 1000));
    const ttl = Math.floor(this.now() / 1000) + windowSeconds * 2;
    try {
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(`RATE#${key}#${bucket}`),
        UpdateExpression: "SET #ttl = :ttl ADD #count :one",
        ConditionExpression: "attribute_not_exists(#count) OR #count < :limit",
        ExpressionAttributeNames: { "#ttl": "ttl", "#count": "count" },
        ExpressionAttributeValues: { ":ttl": ttl, ":one": 1, ":limit": limit }
      }));
      return true;
    } catch (error) {
      if (isConditional(error)) return false;
      throw error;
    }
  }

  async idempotent(key, operation) {
    const pk = `IDEMPOTENCY#${key}`;
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: { ...this.key(pk), entity: "idempotency", status: "PENDING", createdAt: this.now(), ttl: Math.floor(this.now() / 1000) + 86_400 },
        ConditionExpression: "attribute_not_exists(PK)"
      }));
    } catch (error) {
      if (!isConditional(error)) throw error;
      const existing = (await this.get(pk)).Item;
      if (existing?.status === "COMPLETED") return clone(existing.result);
      throw Object.assign(new Error("This operation is already being processed. Retry shortly."), { status: 409, code: "OPERATION_IN_PROGRESS" });
    }
    try {
      const result = await operation();
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(pk),
        UpdateExpression: "SET #status = :completed, #result = :result, #completedAt = :now",
        ConditionExpression: "#status = :pending",
        ExpressionAttributeNames: { "#status": "status", "#result": "result", "#completedAt": "completedAt" },
        ExpressionAttributeValues: { ":completed": "COMPLETED", ":pending": "PENDING", ":result": clone(result), ":now": this.now() }
      }));
      return result;
    } catch (error) {
      await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: this.key(pk), ConditionExpression: "#status = :pending", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":pending": "PENDING" } })).catch(() => {});
      throw error;
    }
  }

  async submitApplication({ applicationId, expectedRevision, frozen, primarySignature, signers, signatureTasks = [], submittedAt, status, reference }) {
    const app = await this.getApplication(applicationId);
    if (!app || app.status !== "draft" || Number(app.revision) !== Number(expectedRevision)) throw conflict();
    const next = {
      ...app,
      status,
      frozen: clone(frozen),
      signatures: [clone(primarySignature)],
      signers: clone(signers),
      submittedAt,
      reference,
      events: [...(app.events || []), { type: "signature.completed", at: submittedAt, signerId: primarySignature.signerId }]
    };
    const actions = [{
      Put: {
        TableName: this.tableName,
        Item: { ...this.key(`APP#${applicationId}`, "CURRENT"), entity: "application", data: next },
        ConditionExpression: "#data.#status = :draftStatus AND #data.#revision = :revision",
        ExpressionAttributeNames: { "#data": "data", "#status": "status", "#revision": "revision" },
        ExpressionAttributeValues: { ":draftStatus": "draft", ":revision": Number(expectedRevision) }
      }
    }];
    for (const task of signatureTasks) {
      actions.push({ Put: { TableName: this.tableName, Item: { ...this.key(`TASK#${task.tokenHash}`), entity: "signatureTask", ttl: task.ttl, data: clone(task) }, ConditionExpression: "attribute_not_exists(PK)" } });
    }
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: actions }));
      return clone(next);
    } catch (error) {
      if (isConditional(error)) throw conflict();
      throw error;
    }
  }

  async putSignatureTask(task) {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: { ...this.key(`TASK#${task.tokenHash}`), entity: "signatureTask", ttl: task.ttl, data: clone(task) }, ConditionExpression: "attribute_not_exists(PK)" }));
    return clone(task);
  }

  async updateSignatureDetails(tokenHash, details) {
    const task = await this.getSignatureTask(tokenHash);
    if (!task || task.status !== "invited") throw conflict("This signing task is no longer editable.");
    const next = { ...task, signer: { ...task.signer, ...clone(details) }, detailsConfirmedAt: new Date(this.now()).toISOString() };
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: { ...this.key(`TASK#${tokenHash}`), entity: "signatureTask", ttl: task.ttl, data: next },
        ConditionExpression: "#data.#status = :invited AND #data.#revisionHash = :hash",
        ExpressionAttributeNames: { "#data": "data", "#status": "status", "#revisionHash": "revisionHash" },
        ExpressionAttributeValues: { ":invited": "invited", ":hash": task.revisionHash }
      }));
      return clone(next);
    } catch (error) {
      if (isConditional(error)) throw conflict();
      throw error;
    }
  }

  async completeSignature({ tokenHash, signature, at }) {
    const task = await this.getSignatureTask(tokenHash);
    if (!task || task.status !== "invited") return null;
    const app = await this.getApplication(task.applicationId);
    if (!app || app.frozen?.hash !== signature.revisionHash) return null;
    const signatures = [...(app.signatures || []), clone(signature)];
    const pending = app.signers.filter((signer) => signer.required).some((signer) => !signatures.some((item) => item.signerId === signer.id));
    const nextTask = { ...task, status: "signed", signedAt: at };
    const nextApp = { ...app, signatures, status: pending ? "pending_signatures" : "submitted", ...(pending ? {} : { completedAt: at }) };
    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: [
        { Put: { TableName: this.tableName, Item: { ...this.key(`TASK#${tokenHash}`), entity: "signatureTask", ttl: task.ttl, data: nextTask }, ConditionExpression: "#data.#status = :invited AND #data.#revisionHash = :hash", ExpressionAttributeNames: { "#data": "data", "#status": "status", "#revisionHash": "revisionHash" }, ExpressionAttributeValues: { ":invited": "invited", ":hash": task.revisionHash } } },
        { Put: { TableName: this.tableName, Item: { ...this.key(`APP#${app.id}`, "CURRENT"), entity: "application", data: nextApp }, ConditionExpression: "#data.#status = :pending AND size(#data.#signatures) = :signatureCount", ExpressionAttributeNames: { "#data": "data", "#status": "status", "#signatures": "signatures" }, ExpressionAttributeValues: { ":pending": "pending_signatures", ":signatureCount": app.signatures.length } } }
      ] }));
      return { task: clone(nextTask), application: clone(nextApp) };
    } catch (error) {
      if (isConditional(error)) return null;
      throw error;
    }
  }

  async enqueueOutbox(event) {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: { ...this.key("OUTBOX", `${event.createdAt}#${event.id}`), entity: "outbox", data: clone(event) }, ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" }));
  }

  async listOutbox() {
    const pending = [];
    let exclusiveStartKey;
    do {
      const result = await this.client.send(new QueryCommand({ TableName: this.tableName, KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": "OUTBOX" }, ConsistentRead: true, Limit: 25, ExclusiveStartKey: exclusiveStartKey }));
      for (const item of result.Items || []) {
        if (!item.data.sentAt && (!item.data.leaseUntil || item.data.leaseUntil <= this.now())) pending.push({ ...clone(item.data), storageKey: { PK: item.PK, SK: item.SK } });
        if (pending.length >= 25) return pending;
      }
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);
    return pending;
  }

  async claimOutbox(event, nowMs, leaseUntil) {
    try {
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: event.storageKey,
        UpdateExpression: "SET #data.#leaseUntil = :leaseUntil",
        ConditionExpression: "attribute_not_exists(#data.#sentAt) AND (attribute_not_exists(#data.#leaseUntil) OR #data.#leaseUntil <= :now)",
        ExpressionAttributeNames: { "#data": "data", "#sentAt": "sentAt", "#leaseUntil": "leaseUntil" },
        ExpressionAttributeValues: { ":leaseUntil": leaseUntil, ":now": nowMs }
      }));
      return true;
    } catch (error) {
      if (isConditional(error)) return false;
      throw error;
    }
  }

  async markOutboxSent(event, sentAt) {
    await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: event.storageKey, UpdateExpression: "SET #data.#sentAt = :sentAt REMOVE #data.#leaseUntil", ExpressionAttributeNames: { "#data": "data", "#sentAt": "sentAt", "#leaseUntil": "leaseUntil" }, ExpressionAttributeValues: { ":sentAt": sentAt } }));
  }

  async releaseOutbox(event) {
    await this.client.send(new UpdateCommand({ TableName: this.tableName, Key: event.storageKey, UpdateExpression: "REMOVE #data.#leaseUntil", ExpressionAttributeNames: { "#data": "data", "#leaseUntil": "leaseUntil" } }));
  }
}
