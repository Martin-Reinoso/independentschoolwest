import crypto from "node:crypto";
import {
  accessOtpEmail,
  applicationCompleteEmail,
  individualSignatureEmail,
  receiptOtpEmail,
  signatureInvitationEmail,
  signatureOtpEmail
} from "./email-templates.mjs";

const DOCUMENT_CATEGORIES = new Set(["birth_certificate", "immunisation", "proof_of_address", "school_report", "medical_plan", "court_order", "residency", "sacramental"]);
const MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ENGAGEMENT_EVENTS = new Set(["application_opened", "stage_viewed", "stage_completed", "validation_error", "draft_saved", "document_uploaded"]);
const REQUIRED_YES_FIELDS = new Set(["readiness_acknowledgement", "guardian_a_legal_responsibility", "guardian_completeness", "information_declaration", "privacy_acknowledgement", "authority_declaration", "review_ready"]);
const REQUIRED_FIELDS = [
  "readiness_acknowledgement", "student_first_name", "student_last_name", "student_date_of_birth",
  "entry_year", "entry_year_level", "current_school", "current_year_level", "student_address",
  "student_suburb", "student_postcode", "country_of_birth", "residency_status", "home_language",
  "family_connection", "guardian_a_first_name", "guardian_a_last_name", "guardian_a_relationship",
  "guardian_a_email", "guardian_a_mobile", "guardian_a_contact_role", "guardian_a_legal_responsibility",
  "care_arrangement", "court_orders", "emergency_first_name", "emergency_last_name",
  "emergency_relationship", "emergency_mobile", "guardian_completeness", "additional_needs",
  "medical_needs", "immunisation_status", "previous_school_permission", "previous_school_name",
  "student_name_permission", "fee_responsibility", "referral_source", "decision_factors",
  "information_declaration", "privacy_acknowledgement", "authority_declaration", "review_ready"
];

function jsonResponse(statusCode, payload, origin) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key,x-client-version",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
      "Access-Control-Allow-Credentials": "false",
      "Cache-Control": "no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Content-Type": "application/json; charset=utf-8",
      "Pragma": "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

function appError(status, code, message, details) {
  return Object.assign(new Error(message), { status, code, details });
}

function safeText(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return safeText(value, 254).toLowerCase();
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function hmac(secret, value) {
  return crypto.createHmac("sha256", secret).update(String(value), "utf8").digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function randomCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function parseBody(event, maxBytes = 2_000_000) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "{}";
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw appError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  let body;
  try { body = JSON.parse(raw); } catch { throw appError(400, "INVALID_JSON", "The request body is not valid JSON."); }
  if (!body || Array.isArray(body) || typeof body !== "object") throw appError(400, "INVALID_BODY", "The request body must be an object.");
  return body;
}

function eventHeaders(event) {
  return Object.fromEntries(Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
}

function eventPath(event) {
  return event.rawPath || event.requestContext?.http?.path || event.path || "/";
}

function eventMethod(event) {
  return (event.requestContext?.http?.method || event.httpMethod || "GET").toUpperCase();
}

function validInvitation(invitation, email, nowMs) {
  return invitation && invitation.status === "active" && invitation.expiresAt > nowMs && normalizeEmail(invitation.recipientEmail) === normalizeEmail(email);
}

function maskEmail(email) {
  const [local, domain] = normalizeEmail(email).split("@");
  if (!domain) return "your invited email";
  return `${local.slice(0, Math.min(2, local.length))}${"•".repeat(Math.max(1, Math.min(5, local.length - 2)))}@${domain}`;
}

function signingData(dataUrl) {
  const value = safeText(dataUrl, 900_000);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)) throw appError(422, "INVALID_SIGNATURE", "Provide a valid signature drawing.");
  const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  if (bytes.length < 100 || bytes.length > 500_000) throw appError(422, "INVALID_SIGNATURE", "The signature drawing is empty or too large.");
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw appError(422, "INVALID_SIGNATURE", "The signature drawing is not a valid PNG image.");
  return bytes;
}

function truthyValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? "").trim());
}

function validateApplication(application) {
  const missing = REQUIRED_FIELDS.filter((field) => !truthyValue(application[field]));
  for (const field of REQUIRED_YES_FIELDS) if (application[field] !== "Yes") missing.push(`${field}:Yes`);
  if (!/^\S+@\S+\.\S+$/.test(normalizeEmail(application.guardian_a_email))) missing.push("guardian_a_email");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeText(application.student_date_of_birth, 10))) missing.push("student_date_of_birth");
  if (application.additional_needs === "Yes" && (!truthyValue(application.support_areas) || !truthyValue(application.support_details))) missing.push("support_areas/support_details");
  if (application.medical_needs === "Yes" && (!truthyValue(application.medical_conditions) || !truthyValue(application.medication_details))) missing.push("medical_conditions/medication_details");
  if (["Temporary resident", "Other / seeking advice"].includes(application.residency_status) && !truthyValue(application.visa_subclass)) missing.push("visa_subclass");
  if (["Shared care across households", "Other"].includes(application.care_arrangement) && !truthyValue(application.care_arrangement_details)) missing.push("care_arrangement_details");
  if (["Yes", "Unsure / seeking advice"].includes(application.court_orders) && !truthyValue(application.court_order_summary)) missing.push("court_order_summary");
  if (["Single account holder", "Proposed split"].includes(application.fee_responsibility) && !truthyValue(application.fee_arrangement_details)) missing.push("fee_arrangement_details");
  const decisionFactors = Array.isArray(application.decision_factors) ? application.decision_factors : [application.decision_factors].filter(Boolean);
  if (decisionFactors.length < 1 || decisionFactors.length > 3) missing.push("decision_factors (select 1-3)");
  const documents = Array.isArray(application.documents) ? application.documents : [];
  const categories = new Set(documents.map((document) => document.category));
  if (application.required_documents_pending !== "Yes") {
    for (const required of ["birth_certificate", "immunisation", "proof_of_address"]) if (!categories.has(required)) missing.push(`document:${required}`);
  } else if (!truthyValue(application.pending_document_explanation)) missing.push("pending_document_explanation");
  if (missing.length) throw appError(422, "APPLICATION_INCOMPLETE", "The application still has required information to complete.", { missing });
}

function signerRecords(application, primarySignerId) {
  const primary = {
    id: primarySignerId,
    firstName: safeText(application.guardian_a_first_name, 80),
    lastName: safeText(application.guardian_a_last_name, 80),
    email: normalizeEmail(application.guardian_a_email),
    mobile: safeText(application.guardian_a_mobile, 30),
    relationship: safeText(application.guardian_a_relationship, 80),
    required: true,
    primary: true,
    contactPermission: "Yes"
  };
  const others = [];
  for (const letter of ["b", "c", "d"]) {
    const firstName = safeText(application[`guardian_${letter}_first_name`], 80);
    if (!firstName) continue;
    const signer = {
      id: `signer-${letter}-${randomToken(8)}`,
      firstName,
      lastName: safeText(application[`guardian_${letter}_last_name`], 80),
      email: normalizeEmail(application[`guardian_${letter}_email`]),
      mobile: safeText(application[`guardian_${letter}_mobile`], 30),
      relationship: safeText(application[`guardian_${letter}_relationship`], 80),
      required: application[`guardian_${letter}_required_signer`] === "Yes",
      primary: false,
      contactPermission: safeText(application[`guardian_${letter}_contact_permission`], 30)
    };
    if (!signer.lastName || !signer.email || !signer.mobile || !signer.relationship) {
      throw appError(422, "GUARDIAN_INCOMPLETE", "Complete every added guardian before submitting.");
    }
    others.push(signer);
  }
  const invalid = others.filter((signer) => signer.required && (!signer.email || signer.contactPermission !== "Yes"));
  if (invalid.length) throw appError(409, "SIGNER_REVIEW_REQUIRED", "A required guardian cannot be contacted automatically. Contact the enrolment team before submitting.");
  return [primary, ...others];
}

function reviewGroups(application) {
  const display = (value) => Array.isArray(value) ? value.join(", ") : safeText(value, 1800) || "Not provided";
  return [
    { title: "Student", items: [["Legal name", `${display(application.student_first_name)} ${display(application.student_last_name)}`], ["Date of birth", display(application.student_date_of_birth)], ["Proposed entry", `${display(application.entry_year_level)} in ${display(application.entry_year)}`], ["Current setting", display(application.current_school)], ["Address", `${display(application.student_address)}, ${display(application.student_suburb)} ${display(application.student_postcode)}`]].map(([label, value]) => ({ label, value })) },
    { title: "Family and authority", items: [["Primary guardian", `${display(application.guardian_a_first_name)} ${display(application.guardian_a_last_name)}`], ["Care arrangement", display(application.care_arrangement)], ["Court or parenting orders", display(application.court_orders)], ["Emergency contact", `${display(application.emergency_first_name)} ${display(application.emergency_last_name)}`]].map(([label, value]) => ({ label, value })) },
    { title: "Learning, wellbeing and health", items: [["Strengths", display(application.student_strengths)], ["Learning support", display(application.additional_needs)], ["Support areas", display(application.support_areas)], ["Medical/allergy information", display(application.medical_needs)], ["Immunisation statement", display(application.immunisation_status)]].map(([label, value]) => ({ label, value })) },
    { title: "Permissions and responsibilities", items: [["Previous setting permission", display(application.previous_school_permission)], ["Media permissions", display(application.media_permissions)], ["Community updates", display(application.community_updates)], ["Fee responsibility", display(application.fee_responsibility)]].map(([label, value]) => ({ label, value })) },
    { title: "Documents", items: (application.documents || []).map((document) => ({ label: document.category.replaceAll("_", " "), value: document.fileName })) }
  ];
}

export function createService({ store, drive, mailer, tracker = { record: async () => {} }, env = {}, clock = () => Date.now() }) {
  const testMode = env.TEST_MODE === "true";
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS || "http://localhost:8000,http://127.0.0.1:8000").split(",").map((value) => value.trim()).filter(Boolean));
  const otpSecret = env.OTP_HMAC_SECRET || "local-development-secret-change-me";
  const ipSecret = env.IP_HASH_SALT || "local-development-ip-secret";
  const fromEmail = env.OTP_FROM_EMAIL || "test@example.invalid";
  const replyToEmail = env.REPLY_TO_EMAIL || fromEmail;
  const signingPageUrl = env.SIGNING_PAGE_URL || "http://localhost:8000/pages/rosewood-sign-v2.html";
  const receiptPageUrl = env.RECEIPT_PAGE_URL || "http://localhost:8000/pages/rosewood-receipt-v2.html";
  if(!testMode){
    if(String(env.OTP_HMAC_SECRET||"").length<32||String(env.IP_HASH_SALT||"").length<32)throw new Error("Rosewood production secrets are missing or too short.");
    if(!env.SCHEMA_VERSION)throw new Error("Rosewood production schema version is required.");
    if(!/^\S+@\S+\.\S+$/.test(fromEmail)||!/^\S+@\S+\.\S+$/.test(replyToEmail))throw new Error("Rosewood production email configuration is invalid.");
    if(!allowedOrigins.size)throw new Error("Rosewood production origins are required.");
    for(const origin of allowedOrigins)if(new URL(origin).protocol!=="https:")throw new Error("Rosewood production origins must use HTTPS.");
    for(const pageUrl of [signingPageUrl,receiptPageUrl])if(new URL(pageUrl).protocol!=="https:")throw new Error("Rosewood production task pages must use HTTPS.");
  }

  function nowIso() { return new Date(clock()).toISOString(); }
  function sourceFingerprint(event) { const ip=event.requestContext?.http?.sourceIp||event.requestContext?.identity?.sourceIp||"unknown";return hmac(ipSecret,ip); }
  function resolveOrigin(event) { const origin=eventHeaders(event).origin||[...allowedOrigins][0]||"http://localhost:8000";if(!allowedOrigins.has(origin))throw appError(403,"ORIGIN_NOT_ALLOWED","This site is not allowed to use the Rosewood service.");return origin; }
  function bearer(event) { const value=eventHeaders(event).authorization||"";const match=value.match(/^Bearer\s+(.+)$/i);return match?.[1]||""; }
  async function requireSession(event, scope) { const raw=bearer(event);if(!raw)throw appError(401,"SESSION_REQUIRED","Your secure session has expired. Verify your email again.");const session=await store.getSession(sha256(raw));if(!session||session.revokedAt||session.expiresAt<=clock()||session.scope!==scope)throw appError(401,"SESSION_EXPIRED","Your secure session has expired. Verify your email again.");return {session,raw}; }
  function requireIdempotency(event) { const key=safeText(eventHeaders(event)["idempotency-key"],160);if(!key||key.length<12)throw appError(400,"IDEMPOTENCY_REQUIRED","A valid operation identifier is required.");return key; }
  async function limited(keys, limit, seconds) { for(const key of keys){if(!await store.checkRateLimit(key,limit,seconds))throw appError(429,"RATE_LIMITED","Too many requests. Wait before trying again.");} }
  async function send(to, template) { return mailer.send({from:fromEmail,replyTo:replyToEmail,to,subject:template.subject,text:template.text,html:template.html}); }
  function outboxEvent(type, to, message) { return {id:`out-${randomToken(10)}`,type,to,message,createdAt:nowIso()}; }
  async function dispatchOutbox() { const pending=await store.listOutbox();let sent=0;for(const item of pending){const claimed=await store.claimOutbox(item,clock(),clock()+60_000);if(!claimed)continue;try{await send(item.to,item.message);await store.markOutboxSent(item,nowIso());sent+=1;}catch{await store.releaseOutbox(item).catch(()=>{});break;}}return {examined:pending.length,sent}; }

  function receiptArtifacts(application) {
    const studentName=`${application.frozen.application.student_first_name} ${application.frozen.application.student_last_name}`;
    const receiptTasks=[];
    const outboxEvents=[];
    for(const signer of application.signers.filter(item=>item.required)){
      const rawToken=randomToken();
      receiptTasks.push({
        tokenHash:sha256(rawToken),
        applicationId:application.id,
        signerId:signer.id,
        email:signer.email,
        status:"active",
        createdAt:clock(),
        expiresAt:clock()+30*24*60*60_000,
        ttl:Math.floor((clock()+45*24*60*60_000)/1000)
      });
      const receiptUrl=`${receiptPageUrl}${receiptPageUrl.includes("?")?"&":"?"}receipt=${encodeURIComponent(rawToken)}`;
      outboxEvents.push(outboxEvent("application.completed",signer.email,applicationCompleteEmail({guardianName:signer.firstName,studentName,reference:application.reference,receiptUrl})));
    }
    return {receiptTasks,outboxEvents};
  }

  async function requestAccessOtp(event) {
    const key=requireIdempotency(event);
    return store.idempotent(key,async()=>{const body=parseBody(event,20_000),token=safeText(body.invitationToken,500),email=normalizeEmail(body.email),tokenHash=sha256(token),invitation=await store.getInvitation(tokenHash),fingerprint=sourceFingerprint(event);
      await limited([`otp-cooldown:${tokenHash}:${sha256(email)}`],1,60);
      await limited([`otp-ip:${fingerprint}`,`otp-invite:${tokenHash}`,`otp-email:${sha256(email)}`],5,900);
      const valid=validInvitation(invitation,email,clock());
      const challengeId=randomToken(24), code=randomCode();
      if(valid){const challenge={id:challengeId,purpose:"application_access",subjectHash:tokenHash,email,applicationId:invitation.applicationId,codeHmac:hmac(otpSecret,`${challengeId}:${code}`),attempts:0,maxAttempts:5,createdAt:clock(),expiresAt:clock()+10*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putChallenge(challenge);await send(email,accessOtpEmail({code})).catch(()=>{});}
      const payload={challengeId,maskedEmail:valid?maskEmail(email):"the invited mailbox",expiresInSeconds:600,resendAfterSeconds:60};
      if(testMode&&valid)payload.testCode=code;
      return payload;});
  }

  async function verifyAccessOtp(event) {
    const key=requireIdempotency(event);
    return store.idempotent(key,async()=>{const body=parseBody(event,20_000),token=safeText(body.invitationToken,500),challengeId=safeText(body.challengeId,200),code=safeText(body.code,12),tokenHash=sha256(token),challenge=await store.getChallenge(challengeId);
      if(!challenge||challenge.subjectHash!==tokenHash||challenge.purpose!=="application_access")throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");
      const consumed=await store.consumeChallenge(challengeId,hmac(otpSecret,`${challengeId}:${code}`),clock());
      if(!consumed){await store.failChallenge(challengeId);throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");}
      const invitation=await store.getInvitation(tokenHash);if(!validInvitation(invitation,challenge.email,clock()))throw appError(401,"INVITATION_INVALID","This invitation is no longer available.");
      const raw=randomToken(),session={tokenHash:sha256(raw),scope:"application",applicationId:invitation.applicationId,inviteId:invitation.inviteId,email:challenge.email,createdAt:clock(),expiresAt:clock()+30*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putSession(session);
      return {sessionToken:raw,expiresInSeconds:1800,context:await applicationContext(session,invitation)};});
  }

  async function applicationContext(session, suppliedInvitation) { const invitation=suppliedInvitation||await store.getInvitationById(session.inviteId);const app=await store.getApplication(session.applicationId);return {inviteId:session.inviteId,familyLabel:invitation?.familyLabel||"Invited family",studentName:invitation?.studentName||app?.draft?.application?.student_first_name||"",recipientEmail:session.email,status:app?.status||"draft",revision:app?.revision||0,draft:app?.draft||null}; }

  async function getSessionContext(event) { const {session}=await requireSession(event,"application");return applicationContext(session); }

  async function saveDraft(event) { const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event);if(body.schemaVersion!==env.SCHEMA_VERSION)throw appError(409,"SCHEMA_MISMATCH","This application version is no longer current. Reload before continuing.");const application=body.application;if(!application||typeof application!=="object"||Array.isArray(application))throw appError(422,"INVALID_APPLICATION","Application data is missing.");const result=await store.idempotent(key,()=>store.saveDraft({applicationId:session.applicationId,baseRevision:Number(body.baseRevision),draft:{schemaVersion:body.schemaVersion,policyVersion:safeText(body.policyVersion,80),clientRevision:Number(body.clientRevision||0),currentStage:Number(body.currentStage||0),application},savedAt:nowIso()}));return {revision:result.revision,savedAt:result.updatedAt}; }

  async function recordEngagement(event) {
    const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event,20_000),eventName=safeText(body.eventName,80),stage=Number(body.stage),elapsedSeconds=Math.max(0,Math.min(86_400,Number(body.elapsedSeconds||0)));
    if(!ENGAGEMENT_EVENTS.has(eventName)||!Number.isInteger(stage)||stage<0||stage>7)throw appError(422,"INVALID_ENGAGEMENT_EVENT","The engagement event is not valid.");
    const record={id:`evt-${randomToken(10)}`,applicationId:session.applicationId,inviteId:session.inviteId,eventName,stage,elapsedSeconds,viewport:safeText(body.viewport,40),occurredAt:nowIso(),schemaVersion:env.SCHEMA_VERSION};
    return store.idempotent(key,async()=>{await store.recordEngagement(record);try{await tracker.record(record);}catch{}return {recorded:true};});
  }

  async function createDocumentSession(event) { const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event,30_000),category=safeText(body.category,80),fileName=safeText(body.fileName,180),mimeType=safeText(body.mimeType,100),size=Number(body.size);if(!DOCUMENT_CATEGORIES.has(category)||!fileName||!MIME_TYPES.has(mimeType)||!Number.isFinite(size)||size<1||size>MAX_FILE_BYTES)throw appError(422,"INVALID_DOCUMENT","Use a PDF, JPG or PNG file no larger than 8 MB.");return store.idempotent(key,()=>drive.createUploadSession({applicationId:session.applicationId,category,fileName,mimeType,size})); }

  async function confirmDocument(event) { const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event,20_000),category=safeText(body.category,80),documentId=safeText(body.documentId,300);if(!DOCUMENT_CATEGORIES.has(category)||!documentId)throw appError(422,"INVALID_DOCUMENT","The uploaded document reference is invalid.");return store.idempotent(key,async()=>{const document=await drive.confirmUpload({documentId,expected:{applicationId:session.applicationId,category}});if(!DOCUMENT_CATEGORIES.has(document.category)||document.category!==category||!MIME_TYPES.has(document.mimeType)||document.size>MAX_FILE_BYTES)throw appError(422,"DOCUMENT_MISMATCH","The uploaded document did not match the secure upload request.");await store.attachDocument(session.applicationId,document);return {document};}); }

  async function submitApplication(event) {
    const {session}=await requireSession(event,"application"),key=requireIdempotency(event),body=parseBody(event),app=await store.getApplication(session.applicationId);if(!app?.draft?.application)throw appError(422,"DRAFT_REQUIRED","Save the application before signing.");if(Number(body.expectedRevision)!==Number(app.revision))throw appError(409,"REVISION_CONFLICT","The application changed after review. Review the latest revision before signing.");
    const application={...app.draft.application,documents:Object.values(app.documents||{})};validateApplication(application);const declarations=body.declarations||{};for(const name of ["information","privacy","authority","audit","intent"])if(declarations[name]!=="Yes")throw appError(422,"DECLARATION_REQUIRED","Every submission declaration must be accepted.");const signerName=safeText(body.signerName,160);if(!signerName)throw appError(422,"SIGNER_NAME_REQUIRED","Type the signer's full legal name.");const signatureBytes=signingData(body.signatureDataUrl);const primarySignerId=`signer-a-${randomToken(8)}`,signers=signerRecords(application,primarySignerId),frozenPayload={schemaVersion:app.draft.schemaVersion,policyVersion:app.draft.policyVersion,revision:app.revision,application};const frozenHash=sha256(stableStringify(frozenPayload));
    return store.idempotent(key,async()=>{const snapshot=await drive.storeJson({applicationId:app.id,name:`${app.id}-revision-${app.revision}.json`,value:frozenPayload}),signatureArtifact=await drive.storeSignature({applicationId:app.id,signerId:primarySignerId,data:signatureBytes});const primarySignature={id:`sig-${randomToken(10)}`,signerId:primarySignerId,signerName,revision:app.revision,revisionHash:frozenHash,artifactId:signatureArtifact.documentId,declarations,completedAt:nowIso(),networkFingerprint:sourceFingerprint(event)};const tasks=[];for(const signer of signers.filter(item=>item.required&&!item.primary)){const rawTask=randomToken(),task={tokenHash:sha256(rawTask),applicationId:app.id,signerId:signer.id,signer,status:"invited",revision:app.revision,revisionHash:frozenHash,createdAt:clock(),expiresAt:clock()+14*24*60*60_000,ttl:Math.floor((clock()+30*24*60*60_000)/1000)};tasks.push({rawTask,task});}
      const status=tasks.length?"pending_signatures":"submitted",reference=`RW-${new Date(clock()).getUTCFullYear()}-${randomToken(6).toUpperCase()}`,submittedAt=nowIso(),frozen={...frozenPayload,hash:frozenHash,snapshotId:snapshot.documentId},studentName=`${application.student_first_name} ${application.student_last_name}`,outboxEvents=[outboxEvent("signature.completed",signers[0].email,individualSignatureEmail({guardianName:signers[0].firstName,studentName}))];
      for(const {rawTask,task} of tasks){const taskUrl=`${signingPageUrl}${signingPageUrl.includes("?")?"&":"?"}task=${encodeURIComponent(rawTask)}`;outboxEvents.push(outboxEvent("signature.invited",task.signer.email,signatureInvitationEmail({guardianName:task.signer.firstName,studentName,taskUrl})));}
      let receiptTasks=[];
      if(status==="submitted"){
        const complete=receiptArtifacts({...app,status,reference,submittedAt,completedAt:submittedAt,frozen,signers,signatures:[primarySignature]});
        receiptTasks=complete.receiptTasks;
        outboxEvents.push(...complete.outboxEvents);
      }
      await store.submitApplication({applicationId:app.id,expectedRevision:app.revision,frozen,primarySignature,signers,signatureTasks:tasks.map(({task})=>task),receiptTasks,outboxEvents,submittedAt,status,reference});
      await dispatchOutbox();return {status,reference,requiredSignatures:signers.filter(item=>item.required).length,completedSignatures:1};});
  }

  async function requestSignatureOtp(event) { const key=requireIdempotency(event);return store.idempotent(key,async()=>{const body=parseBody(event,20_000),rawTask=safeText(body.taskToken,500),email=normalizeEmail(body.email),taskHash=sha256(rawTask),task=await store.getSignatureTask(taskHash),fingerprint=sourceFingerprint(event);await limited([`sign-otp-cooldown:${taskHash}:${sha256(email)}`],1,60);await limited([`sign-otp-ip:${fingerprint}`,`sign-otp-task:${taskHash}`,`sign-otp-email:${sha256(email)}`],5,900);const valid=task&&task.status==="invited"&&task.expiresAt>clock()&&normalizeEmail(task.signer.email)===email;const challengeId=randomToken(24),code=randomCode();if(valid){const challenge={id:challengeId,purpose:"signature",subjectHash:taskHash,email,applicationId:task.applicationId,signerId:task.signerId,codeHmac:hmac(otpSecret,`${challengeId}:${code}`),attempts:0,maxAttempts:5,createdAt:clock(),expiresAt:clock()+10*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putChallenge(challenge);const app=await store.getApplication(task.applicationId);await send(email,signatureOtpEmail({code,studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`})).catch(()=>{});}const result={challengeId,maskedEmail:valid?maskEmail(email):"the invited mailbox",expiresInSeconds:600,resendAfterSeconds:60};if(testMode&&valid)result.testCode=code;return result;}); }

  async function verifySignatureOtp(event) { const key=requireIdempotency(event);return store.idempotent(key,async()=>{const body=parseBody(event,20_000),rawTask=safeText(body.taskToken,500),taskHash=sha256(rawTask),challengeId=safeText(body.challengeId,200),code=safeText(body.code,12),challenge=await store.getChallenge(challengeId),task=await store.getSignatureTask(taskHash);if(!challenge||challenge.subjectHash!==taskHash||challenge.purpose!=="signature"||!task||task.status!=="invited"||task.expiresAt<=clock())throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");const consumed=await store.consumeChallenge(challengeId,hmac(otpSecret,`${challengeId}:${code}`),clock());if(!consumed){await store.failChallenge(challengeId);throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");}const raw=randomToken(),session={tokenHash:sha256(raw),scope:"signature",applicationId:task.applicationId,taskTokenHash:taskHash,signerId:task.signerId,email:task.signer.email,createdAt:clock(),expiresAt:clock()+30*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putSession(session);return {sessionToken:raw,expiresInSeconds:1800,context:await signatureContext(session)};}); }

  async function signatureContext(session) { const task=await store.getSignatureTask(session.taskTokenHash),app=await store.getApplication(session.applicationId);if(!task||task.expiresAt<=clock())throw appError(410,"TASK_EXPIRED","This signature task has expired. Contact Rosewood for a new request.");if(!app?.frozen||task.revisionHash!==app.frozen.hash)throw appError(409,"REVISION_UNAVAILABLE","The application revision is no longer available for signing.");return {studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`,revision:task.revision,revisionHash:task.revisionHash,signer:task.signer,reviewGroups:reviewGroups(app.frozen.application),status:task.status}; }
  async function getSignatureContext(event) { const {session}=await requireSession(event,"signature");return signatureContext(session); }
  async function updateSignatureDetails(event) { const {session}=await requireSession(event,"signature"),key=requireIdempotency(event),body=parseBody(event,30_000);for(const field of ["firstName","lastName","email","mobile"])if(!safeText(body[field],254))throw appError(422,"DETAILS_INCOMPLETE","Confirm all required signer details.");if(normalizeEmail(body.email)!==normalizeEmail(session.email))throw appError(422,"EMAIL_LOCKED","The verified email cannot be changed in this task. Contact Rosewood for help.");return store.idempotent(key,async()=>{await store.updateSignatureDetails(session.taskTokenHash,{firstName:safeText(body.firstName,80),lastName:safeText(body.lastName,80),email:normalizeEmail(body.email),mobile:safeText(body.mobile,30)});return signatureContext(session);}); }

  async function submitSignature(event) {
    const {session}=await requireSession(event,"signature"),key=requireIdempotency(event);
    return store.idempotent(key,async()=>{
      const body=parseBody(event),task=await store.getSignatureTask(session.taskTokenHash),app=await store.getApplication(session.applicationId);
      if(!task||task.status!=="invited"||task.expiresAt<=clock()||!app?.frozen)throw appError(409,"TASK_UNAVAILABLE","This signature task is no longer available.");
      if(Number(body.revision)!==Number(task.revision)||task.revisionHash!==app.frozen.hash)throw appError(409,"REVISION_CONFLICT","The application revision changed. Do not sign until Rosewood issues a new task.");
      if(body.auditDeclaration!==true||body.intentDeclaration!==true)throw appError(422,"DECLARATION_REQUIRED","Accept both declarations before signing.");
      const signerName=safeText(body.signerName,160);
      if(!signerName)throw appError(422,"SIGNER_NAME_REQUIRED","Type your full legal name.");
      const bytes=signingData(body.signatureDataUrl),artifact=await drive.storeSignature({applicationId:app.id,signerId:task.signerId,data:bytes}),completedAt=nowIso(),signature={id:`sig-${randomToken(10)}`,signerId:task.signerId,signerName,revision:task.revision,revisionHash:task.revisionHash,artifactId:artifact.documentId,declarations:{audit:true,intent:true},comments:safeText(body.comments,1500),completedAt,networkFingerprint:sourceFingerprint(event)},signers=app.signers.map(item=>item.id===task.signerId?{...item,...task.signer}:item),signatures=[...(app.signatures||[]),signature],willComplete=signers.filter(item=>item.required).every(item=>signatures.some(record=>record.signerId===item.id)),studentName=`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`,outboxEvents=[outboxEvent("signature.completed",task.signer.email,individualSignatureEmail({guardianName:task.signer.firstName,studentName}))];
      let receiptTasks=[];
      if(willComplete){const complete=receiptArtifacts({...app,status:"submitted",completedAt,signers,signatures});receiptTasks=complete.receiptTasks;outboxEvents.push(...complete.outboxEvents);}
      const completed=await store.completeSignature({tokenHash:session.taskTokenHash,signature,at:completedAt,receiptTasks,outboxEvents});
      if(!completed)throw appError(409,"SIGNATURE_ALREADY_COMPLETE","This signature has already been recorded.");
      await dispatchOutbox();
      return {status:completed.application.status,reference:completed.application.reference};
    });
  }

  async function getReceipt(event) { const {session}=await requireSession(event,"application"),app=await store.getApplication(session.applicationId);if(!app||!["pending_signatures","submitted"].includes(app.status))throw appError(404,"RECEIPT_UNAVAILABLE","No submitted application receipt is available.");return {reference:app.reference,status:app.status,submittedAt:app.submittedAt,completedAt:app.completedAt||null,revision:app.frozen.revision,policyVersion:app.frozen.policyVersion,studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`,signers:app.signers.filter(item=>item.required).map(signer=>({name:`${signer.firstName} ${signer.lastName}`,relationship:signer.relationship,status:app.signatures.some(signature=>signature.signerId===signer.id)?"signed":"pending"}))}; }

  async function requestReceiptOtp(event) {
    const key=requireIdempotency(event);
    return store.idempotent(key,async()=>{
      const body=parseBody(event,20_000),rawReceipt=safeText(body.receiptToken,500),email=normalizeEmail(body.email),receiptHash=sha256(rawReceipt),task=await store.getReceiptTask(receiptHash),fingerprint=sourceFingerprint(event);
      await limited([`receipt-otp-cooldown:${receiptHash}:${sha256(email)}`],1,60);
      await limited([`receipt-otp-ip:${fingerprint}`,`receipt-otp-task:${receiptHash}`,`receipt-otp-email:${sha256(email)}`],5,900);
      const candidate=task&&task.status==="active"&&task.expiresAt>clock()&&normalizeEmail(task.email)===email;
      const app=candidate?await store.getApplication(task.applicationId):null;
      const valid=Boolean(candidate&&app?.status==="submitted");
      const challengeId=randomToken(24),code=randomCode();
      if(valid){const challenge={id:challengeId,purpose:"receipt",subjectHash:receiptHash,email,applicationId:task.applicationId,signerId:task.signerId,codeHmac:hmac(otpSecret,`${challengeId}:${code}`),attempts:0,maxAttempts:5,createdAt:clock(),expiresAt:clock()+10*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putChallenge(challenge);await send(email,receiptOtpEmail({code,studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`})).catch(()=>{});}
      const result={challengeId,maskedEmail:valid?maskEmail(email):"the invited mailbox",expiresInSeconds:600,resendAfterSeconds:60};
      if(testMode&&valid)result.testCode=code;
      return result;
    });
  }

  async function verifyReceiptOtp(event) { const key=requireIdempotency(event);return store.idempotent(key,async()=>{const body=parseBody(event,20_000),rawReceipt=safeText(body.receiptToken,500),receiptHash=sha256(rawReceipt),challengeId=safeText(body.challengeId,200),code=safeText(body.code,12),challenge=await store.getChallenge(challengeId),task=await store.getReceiptTask(receiptHash);if(!challenge||challenge.subjectHash!==receiptHash||challenge.purpose!=="receipt"||!task||task.status!=="active"||task.expiresAt<=clock())throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");const consumed=await store.consumeChallenge(challengeId,hmac(otpSecret,`${challengeId}:${code}`),clock());if(!consumed){await store.failChallenge(challengeId);throw appError(401,"OTP_INVALID","The code is invalid or expired. Request a new code.");}const raw=randomToken(),session={tokenHash:sha256(raw),scope:"receipt",applicationId:task.applicationId,receiptTokenHash:receiptHash,signerId:task.signerId,email:task.email,createdAt:clock(),expiresAt:clock()+30*60_000,ttl:Math.floor((clock()+24*60*60_000)/1000)};await store.putSession(session);return {sessionToken:raw,expiresInSeconds:1800,receipt:await receiptContext(session)};}); }

  async function receiptContext(session) {
    const task=await store.getReceiptTask(session.receiptTokenHash),app=await store.getApplication(session.applicationId);
    if(!task||task.status!=="active"||task.expiresAt<=clock()||!app||app.status!=="submitted")throw appError(404,"RECEIPT_UNAVAILABLE","This receipt is no longer available through this link.");
    const recipient=app.signers.find(item=>item.id===task.signerId);
    return {reference:app.reference,status:app.status,submittedAt:app.submittedAt,completedAt:app.completedAt||app.submittedAt,revision:app.frozen.revision,policyVersion:app.frozen.policyVersion,studentName:`${app.frozen.application.student_first_name} ${app.frozen.application.student_last_name}`,recipientName:recipient?.firstName||"Guardian",signers:app.signers.filter(item=>item.required).map(signer=>{const signature=app.signatures.find(item=>item.signerId===signer.id);return {name:`${signer.firstName} ${signer.lastName}`,relationship:signer.relationship,status:signature?"signed":"pending",signedAt:signature?.completedAt||null};})};
  }
  async function getReceiptContext(event) { const {session}=await requireSession(event,"receipt");return receiptContext(session); }

  const routes = new Map([
    ["POST /v2/access/request-otp", requestAccessOtp],
    ["POST /v2/access/verify-otp", verifyAccessOtp],
    ["GET /v2/session", getSessionContext],
    ["PUT /v2/draft", saveDraft],
    ["POST /v2/engagement", recordEngagement],
    ["POST /v2/documents/session", createDocumentSession],
    ["POST /v2/documents/confirm", confirmDocument],
    ["POST /v2/applications/submit", submitApplication],
    ["POST /v2/signatures/request-otp", requestSignatureOtp],
    ["POST /v2/signatures/verify-otp", verifySignatureOtp],
    ["GET /v2/signatures/context", getSignatureContext],
    ["PATCH /v2/signatures/details", updateSignatureDetails],
    ["POST /v2/signatures/submit", submitSignature],
    ["GET /v2/receipt", getReceipt],
    ["POST /v2/receipts/request-otp", requestReceiptOtp],
    ["POST /v2/receipts/verify-otp", verifyReceiptOtp],
    ["GET /v2/receipts/context", getReceiptContext]
  ]);

  async function handler(event) {
    let origin;
    try {
      origin = resolveOrigin(event);
      if (eventMethod(event) === "OPTIONS") return jsonResponse(204, {}, origin);
      if (eventMethod(event) === "GET" && eventPath(event) === "/v2/health") return jsonResponse(200, {status:"ok",version:schemaVersionForResponse(env)}, origin);
      const route=routes.get(`${eventMethod(event)} ${eventPath(event)}`);if(!route)throw appError(404,"NOT_FOUND","The requested Rosewood service route does not exist.");
      const payload=await route(event);return jsonResponse(200,payload,origin);
    } catch (error) {
      const status=Number(error.status||500),code=error.code||"INTERNAL_ERROR";
      const message=status>=500?"The Rosewood service could not complete the request. Try again or contact the enrolment team.":error.message;
      return jsonResponse(status,{code,message,...(error.details?{details:error.details}:{})},origin||[...allowedOrigins][0]||"http://localhost:8000");
    }
  }
  handler.dispatchOutbox=dispatchOutbox;
  return handler;
}

function schemaVersionForResponse(env) {
  return env.SCHEMA_VERSION || "rosewood-v2-unknown";
}
