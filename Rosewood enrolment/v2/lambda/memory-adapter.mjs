import crypto from "node:crypto";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class MemoryStore {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.invitations = new Map();
    this.challenges = new Map();
    this.sessions = new Map();
    this.applications = new Map();
    this.tasks = new Map();
    this.receipts = new Map();
    this.idempotency = new Map();
    this.rateLimits = new Map();
    this.outbox = [];
  }

  seedInvitation(invitation) {
    this.invitations.set(invitation.tokenHash, clone(invitation));
    if (!this.applications.has(invitation.applicationId)) {
      this.applications.set(invitation.applicationId, { id: invitation.applicationId, inviteId: invitation.inviteId, status: "draft", revision: 0, draft: null, documents: {}, signatures: [], signers: [], events: [] });
    }
  }

  async getInvitation(tokenHash) { return clone(this.invitations.get(tokenHash)); }
  async getInvitationById(inviteId) { return clone([...this.invitations.values()].find((item) => item.inviteId === inviteId)); }
  async getChallenge(id) { return clone(this.challenges.get(id)); }
  async putChallenge(challenge) { this.challenges.set(challenge.id, clone(challenge)); return clone(challenge); }
  async failChallenge(id) { const item=this.challenges.get(id); if (!item) return null; item.attempts += 1; this.challenges.set(id,item); return clone(item); }
  async consumeChallenge(id, codeHmac, nowMs) {
    const item=this.challenges.get(id);
    if (!item || item.usedAt || item.expiresAt <= nowMs || item.attempts >= item.maxAttempts || item.codeHmac !== codeHmac) return null;
    item.usedAt = new Date(nowMs).toISOString(); this.challenges.set(id,item); return clone(item);
  }
  async putSession(session) { this.sessions.set(session.tokenHash, clone(session)); return clone(session); }
  async getSession(tokenHash) { return clone(this.sessions.get(tokenHash)); }
  async revokeSession(tokenHash, at) { const item=this.sessions.get(tokenHash); if(item){item.revokedAt=at;this.sessions.set(tokenHash,item);} }
  async getApplication(id) { return clone(this.applications.get(id)); }
  async saveDraft({ applicationId, baseRevision, draft, savedAt }) {
    const item=this.applications.get(applicationId);
    if (!item || item.status !== "draft") throw Object.assign(new Error("Revision conflict."), { status: 409, code: "REVISION_CONFLICT" });
    if (Number(item.revision) !== Number(baseRevision)) throw Object.assign(new Error("Revision conflict."), { status: 409, code: "REVISION_CONFLICT", currentRevision: item.revision });
    item.revision += 1; item.draft=clone(draft); item.updatedAt=savedAt; item.events.push({type:"draft.saved",at:savedAt,revision:item.revision}); this.applications.set(applicationId,item); return clone(item);
  }
  async attachDocument(applicationId, document) { const item=this.applications.get(applicationId); item.documents[document.category]=clone(document); if(item.draft?.application)item.draft.application.documents=Object.values(item.documents);this.applications.set(applicationId,item);return clone(document); }
  async detachDocument(applicationId, category, documentId) { const item=this.applications.get(applicationId),document=item?.documents?.[category];if(!item||item.status!=="draft"||!document||document.documentId!==documentId)throw Object.assign(new Error("Document conflict."),{status:409,code:"REVISION_CONFLICT"});delete item.documents[category];if(item.draft?.application)item.draft.application.documents=Object.values(item.documents);this.applications.set(applicationId,item);return clone(document); }
  async recordEngagement(record) { const item=this.applications.get(record.applicationId);if(!item)return null;item.events.push(clone(record));this.applications.set(record.applicationId,item);return clone(record); }
  async checkRateLimit(key, limit, windowSeconds) { const now=this.now(),start=now-windowSeconds*1000,recent=(this.rateLimits.get(key)||[]).filter(time=>time>start); if(recent.length>=limit)return false;recent.push(now);this.rateLimits.set(key,recent);return true; }
  async idempotent(key, operation) { if(this.idempotency.has(key))return clone(this.idempotency.get(key));const result=await operation();this.idempotency.set(key,clone(result));return result; }
  async submitApplication({ applicationId, invitationTokenHash, expectedRevision, frozen, primarySignature, signers, signatureTasks = [], receiptTasks = [], outboxEvents = [], submittedAt, status, reference }) {
    const item=this.applications.get(applicationId),invitation=this.invitations.get(invitationTokenHash); if(!item||item.status!=="draft"||Number(item.revision)!==Number(expectedRevision)||!invitation||invitation.status!=="active"||invitation.applicationId!==applicationId)throw Object.assign(new Error("Revision conflict."),{code:"REVISION_CONFLICT"});
    item.status=status;item.frozen=clone(frozen);item.signatures=[clone(primarySignature)];item.signers=clone(signers);item.submittedAt=submittedAt;item.reference=reference;if(status==="submitted")item.completedAt=submittedAt;item.events.push({type:"signature.completed",at:submittedAt,signerId:primarySignature.signerId});invitation.status="submitted";invitation.submittedAt=submittedAt;this.invitations.set(invitationTokenHash,invitation);for(const task of signatureTasks)this.tasks.set(task.tokenHash,clone(task));for(const task of receiptTasks)this.receipts.set(task.tokenHash,clone(task));this.outbox.push(...clone(outboxEvents));this.applications.set(applicationId,item);return clone(item);
  }
  async putSignatureTask(task) { this.tasks.set(task.tokenHash,clone(task));return clone(task); }
  async getSignatureTask(tokenHash) { return clone(this.tasks.get(tokenHash)); }
  async putReceiptTasks(tasks) { for(const task of tasks)this.receipts.set(task.tokenHash,clone(task));return clone(tasks); }
  async getReceiptTask(tokenHash) { return clone(this.receipts.get(tokenHash)); }
  async updateSignatureDetails(tokenHash, details) { const task=this.tasks.get(tokenHash);if(!task) return null;const confirmedAt=new Date(this.now()).toISOString();task.signer={...task.signer,...clone(details)};task.detailsConfirmedAt=confirmedAt;this.tasks.set(tokenHash,task);const app=this.applications.get(task.applicationId);if(app)app.events.push({type:"signature.details_confirmed",at:confirmedAt,signerId:task.signerId});return clone(task); }
  async completeSignature({ tokenHash, signature, at, receiptTasks = [], outboxEvents = [] }) { const task=this.tasks.get(tokenHash);if(!task||task.status==="signed")return null;const app=this.applications.get(task.applicationId);if(!app||app.frozen.hash!==signature.revisionHash)return null;task.status="signed";task.signedAt=at;this.tasks.set(tokenHash,task);app.signers=app.signers.map(item=>item.id===task.signerId?{...item,...clone(task.signer)}:item);app.signatures.push(clone(signature));const pending=app.signers.filter(s=>s.required).some(s=>!app.signatures.some(sig=>sig.signerId===s.id));if(!pending){app.status="submitted";app.completedAt=at;}for(const receiptTask of receiptTasks)this.receipts.set(receiptTask.tokenHash,clone(receiptTask));this.outbox.push(...clone(outboxEvents));this.applications.set(app.id,app);return {task:clone(task),application:clone(app)}; }
  async enqueueOutbox(event) { this.outbox.push(clone(event)); }
  async listOutbox() { return clone(this.outbox.filter(item=>!item.sentAt&&(!item.leaseUntil||item.leaseUntil<=this.now())).slice(0,25)); }
  async claimOutbox(event, nowMs, leaseUntil) { const item=this.outbox.find(entry=>entry.id===event.id);if(!item||item.sentAt||(item.leaseUntil&&item.leaseUntil>nowMs))return false;item.leaseUntil=leaseUntil;return true; }
  async markOutboxSent(event, sentAt) { const item=this.outbox.find(entry=>entry.id===event.id);if(item){item.sentAt=sentAt;delete item.leaseUntil;} }
  async releaseOutbox(event) { const item=this.outbox.find(entry=>entry.id===event.id);if(item)delete item.leaseUntil; }
}

export class MemoryDrive {
  constructor({ uploadBaseUrl = "memory://" } = {}) { this.files=new Map(); this.sessions=new Map(); this.uploadBaseUrl=uploadBaseUrl; }
  async createUploadSession(metadata) { const id=`upload-${crypto.randomUUID()}`;this.sessions.set(id,clone(metadata));return {uploadUrl:`${this.uploadBaseUrl}${id}`,uploadId:id}; }
  completeUpload(uploadId, overrides = {}) {
    const metadata=this.sessions.get(uploadId);
    if(!metadata) throw new Error("Unknown memory upload session.");
    const file={id:overrides.id||`document-${crypto.randomUUID()}`,name:metadata.fileName,mimeType:metadata.mimeType,size:metadata.size,applicationId:metadata.applicationId,category:metadata.category,...clone(overrides)};
    this.files.set(file.id,file);
    return clone(file);
  }
  async confirmUpload({ documentId, expected }) {
    const file=this.files.get(documentId);
    if(!file) throw Object.assign(new Error("Uploaded document no longer exists."),{status:404,code:"DOCUMENT_NOT_FOUND"});
    if(file.applicationId!==expected.applicationId||file.category!==expected.category) throw Object.assign(new Error("Uploaded document metadata does not match the application."),{status:422,code:"DOCUMENT_MISMATCH"});
    return {documentId:file.id,fileName:file.name,mimeType:file.mimeType,size:file.size,category:file.category};
  }
  async storeJson({ applicationId, name, value }) { const id=`json-${crypto.randomUUID()}`;this.files.set(id,{id,name,applicationId,value:clone(value),mimeType:"application/json"});return {documentId:id}; }
  async storeSignature({ applicationId, signerId, data }) { const id=`signature-${crypto.randomUUID()}`;this.files.set(id,{id,applicationId,signerId,data,mimeType:"image/png"});return {documentId:id}; }
  async deleteFile(documentId) { this.files.delete(documentId);return {deleted:true}; }
}

export class MemoryMailer {
  constructor() { this.messages=[]; }
  async send(message) { const result={messageId:`mail-${crypto.randomUUID()}`};this.messages.push({...clone(message),...result});return result; }
}
