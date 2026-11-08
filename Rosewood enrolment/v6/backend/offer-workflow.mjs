import crypto from 'node:crypto';
import { initialOfferDetails, packetWithDetails, visibleOfferDetails, validateOfferDetails, personName, offerSignerContactAllowed, reconcileOfferAccounts, applicationOfferControls, requiredOfferSigners } from './offer-details.mjs';
import { OFFER_CONTRACT } from './offer-contract.mjs';
import {letterContent, renderOfferLetter} from './offer-letter.mjs';
import {principalSignatureFromConfig} from './offer-letter-assets.mjs';
import {renderOfferRecordPdf, OFFER_RECORD_FILE_NAME} from './offer-record-pdf.mjs';
import {validateOfferSignature, pdfHash} from './offer-pdf.mjs';
import {offerContentHash} from './offer-content-hash.mjs';
import {offerInvitationEmail, offerSignatureReceipt, offerCompletionEmail} from './offer-emails.mjs';

const hash = value => typeof value==='string'?crypto.createHash('sha256').update(value).digest('hex'):offerContentHash(value);
const random = () => crypto.randomBytes(32).toString('base64url');
const failure = (status, code, message) => Object.assign(new Error(message), {status, code});
const text = (value, max=300) => String(value || '').trim().slice(0,max);
const email = value => text(value,254).toLowerCase();
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const checksum = value => hash(value);

export function offerSigners(app) {
  const controls = applicationOfferControls(app);
  if (!controls.length || controls.length !== Number(app.guardianCount) || new Set(controls.map(c=>c.guardianId)).size!==controls.length || new Set(controls.map(c=>Number(c.guardianIndex))).size!==controls.length || controls.some(c=>!Number.isInteger(Number(c.guardianIndex))||Number(c.guardianIndex)<0||Number(c.guardianIndex)>=controls.length)) throw failure(409,'SIGNER_REVIEW_REQUIRED','Review the required guardians before preparing an offer.');
  return controls.map(control => {
    const i=control.guardianIndex;
    const person={id:control.guardianId, name:text(control.name || [app.values?.[`app_guardian_${i}_first`],app.values?.[`app_guardian_${i}_last`]].filter(Boolean).join(' ')), email:email(control.currentEmail), permitted:control.contactPermission === true};
    if (!person.id || !person.name || (person.permitted && !/^\S+@\S+\.\S+$/.test(person.email))) throw failure(409,'SIGNER_REVIEW_REQUIRED','A required guardian cannot be contacted. Resolve the authorised signing arrangement with the College first.');
    return person;
  });
}

export function makeOfferPacket(app, input, now=Date.now(), arrangement={}) {
  if (!app || app.status !== 'submitted') throw failure(409,'APPLICATION_NOT_COMPLETE','A completed application is required before an offer can be prepared.');
  let signers=offerSigners(app);
  const studentName=[app.values?.student_first,app.values?.student_last].filter(Boolean).join(' ');
  const entryYear=text(app.values?.entry_year,4), entryLevel=text(app.values?.entry_level,60);
  if (!studentName || !/^20\d{2}$/.test(entryYear) || !entryLevel) throw failure(409,'ENTRY_DETAILS_REQUIRED','Confirm the student and entry details before preparing an offer.');
  if (entryYear !== '2027') throw failure(409,'OFFER_YEAR_UNSUPPORTED','This opening-year offer is for 2027 only. Prepare a separately reviewed offer for another entry year.');
  const financialFields=['feeSchedule','paymentDays','refundDays','bondOption','bondAmount','bondCredit'];
  if(financialFields.some(key=>Object.hasOwn(input,key)))throw failure(422,'PAYMENT_CHOICES_DEFERRED','Bond and payment choices are made later. Reload the staff portal to prepare this provisional offer without financial selections.');
  if(['acceptBy','conditionsBy'].some(key=>Object.hasOwn(input,key)))throw failure(422,'OFFER_DEADLINES_REMOVED','Offer deadlines are no longer required. Reload the staff portal to prepare this provisional offer without deadline dates.');
  const schedule={expiryPolicy:'none',financialArrangements:'deferred'};
  if(!arrangement || typeof arrangement!=='object' || Array.isArray(arrangement) || Object.keys(arrangement).some(k=>!['mode','reason'].includes(k)) || !['all_guardians','primary_only'].includes(arrangement.mode||'all_guardians'))throw failure(422,'SIGNING_ARRANGEMENT_REQUIRED','Choose the signing arrangement for this child.');
  const mode=arrangement.mode||'all_guardians', reason=text(arrangement.reason,2000),primary=signers.find(s=>s.email===email(app.recipientEmail));
  if(!primary?.permitted)throw failure(409,'PRIMARY_REVIEW_REQUIRED','Review the main carer contact details before preparing an offer.');
  if(mode==='primary_only' && (reason.length<10 || String(arrangement.reason).length>2000))throw failure(422,'SIGNING_APPROVAL_REQUIRED','Record why the College has approved the main carer alone to sign.');
  if(mode==='all_guardians' && reason)throw failure(422,'SIGNING_APPROVAL_REQUIRED','An approval reason applies only to the main-carer-only arrangement.');
  signers=signers.map(s=>({...s,required:mode!=='primary_only'||s.id===primary.id}));
  const signingArrangement={mode,reason,primaryGuardianId:primary.id,excludedGuardianIds:signers.filter(s=>!s.required).map(s=>s.id)};
  const details=initialOfferDetails(app,signers);
  signers=signers.map(signer=>({...signer,name:personName(details.guardians.find(person=>person.id===signer.id))}));
  const packet=packetWithDetails({contract:OFFER_CONTRACT, studentName, entryYear, entryLevel, signers:signers.map(({name})=>({name})), schedule, ...(mode==='primary_only'?{signingArrangement:'The College has approved the main carer alone to sign for the guardians listed when this offer was issued. Any newly added guardian must also sign.'}:{})},details);
  return {packet, details, signingArrangement, packetHash:checksum(packet), signers, applicationId:app.id, applicationRevisionHash:app.revisionHash, signatureControlRevision:Number(app.signatureControlRevision || 0)};
}

// Existing issued deadlines remain authoritative; only explicitly deadline-free new offers stay open.
export function offerAcceptanceOpen(offer, now) {
  const schedule=offer?.packet?.schedule;
  if(schedule?.acceptBy)return Number.isFinite(Date.parse(schedule.acceptBy)) && Date.parse(schedule.acceptBy)>now;
  return schedule?.expiryPolicy==='none';
}

// A family is an explicit invitation relationship, never an inferred name/email match.
export async function offerTaskAccess(store, task, now, {all=false}={}) {
  if (!task || task.status!=='active') return [];
  const result=[];
  for(const child of task.children || []) {
    const offer=await store.getOffer(child.offerId);
    const app=offer && await store.getApplication(offer.applicationId);
    const signer=offer?.signers.find(s=>s.id===child.signerId && s.email===task.email);
    const permitted=offer && offerSignerContactAllowed(offer,app,signer);
    const signed=offer?.signatures.find(s=>s.signerId===child.signerId);
    if(!offer || offer.familyId!==task.familyId || !['awaiting_signatures','signed_conditional'].includes(offer.status) || !signer || !permitted || (!signed && !offerAcceptanceOpen(offer,now))) {
      if(all)return [];continue;
    }
    result.push({offer,app,signer,signed});
  }
  return result;
}

export function createOfferRoutes(c) {
 const {store,drive,mailer,env,clock,parseBody,requireStaffSession,requireSession,networkFingerprint,signatureBytes,createAuditEvent,emailOutbox,slack,slackOutbox,offerOtp,dispatchOutbox}=c;
 const iso=()=>new Date(clock()).toISOString();
 const page=env.ENROLMENT_OFFER_PAGE_URL || 'https://ffe.org.au/pages/rosewood-enrolment-offer-v1.html';
 const audit=(record,type,actor,details={})=>createAuditEvent({workflow:'enrolment_offer',recordId:record.id,type,at:iso(),actorType:actor.scope==='staff'?'staff':'family',actorId:actor.email,details});
 const enabled=()=>{if(env.ENROLMENT_OFFERS_ENABLED!=='true')throw failure(503,'OFFERS_NOT_ENABLED','Online offer acceptance is not yet available. Please contact the College.');};
 const approved=()=>env.ENROLMENT_OFFER_APPROVED_HASH===hash(OFFER_CONTRACT);
 const summary=o=>({offerId:o.id,applicationId:o.applicationId,familyId:o.familyId,studentName:o.packet.studentName,entryYear:o.packet.entryYear,entryLevel:o.packet.entryLevel,status:o.status,required:requiredOfferSigners(o).length,signed:o.signatures.length,createdAt:o.createdAt,signers:o.signers.map(s=>({name:s.name,required:s.required!==false,contactPermitted:s.permitted===true,signedAt:o.signatures.find(x=>x.signerId===s.id)?.signedAt||''}))});
 function message(account,link) { return offerInvitationEmail({name:account.name,primary:account.primary,children:account.children,link}); }
 function invitation(account,raw,family) {
   const payload={to:account.email,...message(account,`${page}?invite=${encodeURIComponent(raw)}`),tags:{workflow:'enrolment_offer',message_type:'offer_family_invitation',record_id:account.tokenHash},_tracking:{kind:'offer_family_invitation',familyId:family.id,taskTokenHash:account.tokenHash}};
   if(account.primary)payload._offerLetter={familyId:family.id,fileId:family.letterFileId,sha256:family.letterHash};
   return emailOutbox(payload,clock());
 }
 async function prepare(body) {
   const ids=Array.isArray(body.applicationIds)?body.applicationIds:[];
   if(!ids.length || ids.length>8 || new Set(ids).size!==ids.length || ids.some(id=>typeof id!=='string'||id.length>200))throw failure(422,'FAMILY_SELECTION_REQUIRED','Select one to eight completed applications from the same family.');
   const apps=await Promise.all([...ids].sort().map(id=>store.getApplication(id)));
   if(!apps[0]?.invitationId || apps.some(a=>!a || a.invitationId!==apps[0].invitationId))throw failure(409,'FAMILY_MISMATCH','Select children linked to the same family invitation.');
   const arrangements=body.signingArrangements||{};
   if(typeof arrangements!=='object'||Array.isArray(arrangements)||Object.keys(arrangements).some(id=>!ids.includes(id)))throw failure(422,'SIGNING_ARRANGEMENT_REQUIRED','Review the signing arrangements for the selected children.');
   const prepared=apps.map(a=>makeOfferPacket(a,body.schedule||{},clock(),arrangements[a.id]||{}));
   const primaryEmail=email(apps[0].recipientEmail);
   if(!primaryEmail || apps.some(a=>email(a.recipientEmail)!==primaryEmail))throw failure(409,'PRIMARY_REVIEW_REQUIRED','Review the primary family email before preparing the offer.');
   const accounts=[];
   for(const child of prepared) {
     const seen=new Set();
     for(const signer of child.signers.filter(s=>s.required!==false && s.email)) {
       if(seen.has(signer.email))throw failure(409,'SIGNER_REVIEW_REQUIRED','Each signing guardian needs their own verified email address.');seen.add(signer.email);
       let account=accounts.find(a=>a.email===signer.email);
       if(account && account.name.toLocaleLowerCase()!==signer.name.toLocaleLowerCase())throw failure(409,'SIGNER_REVIEW_REQUIRED','The same email has different guardian names. Review the signing arrangement.');
       if(!account){account={id:`recipient-${accounts.length+1}`,name:signer.name,email:signer.email,primary:signer.email===primaryEmail,contactPermitted:true,children:[]};accounts.push(account);}
       account.contactPermitted=account.contactPermitted&&signer.permitted;
       account.children.push({applicationId:child.applicationId,signerId:signer.id,studentName:child.packet.studentName,studentFirstName:child.details.student.first,entryYear:child.packet.entryYear,entryLevel:child.packet.entryLevel});
     }
   }
   if(accounts.length>8 || !accounts.some(a=>a.primary && a.contactPermitted && a.children.length===prepared.length))throw failure(409,'SIGNER_REVIEW_REQUIRED','The primary recipient must be authorised for every selected child.');
   // Freeze the calendar date so an overnight send cannot silently change the reviewed letter.
   const currentDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(clock()));
   const date=body.letterDate || currentDate;
   if(!/^20\d{2}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))throw failure(422,'LETTER_DATE_REQUIRED','Select a valid letter date.');
   const options=body.letterOptions||{};
   if(options.includeGathering && currentDate>='2027-01-17')throw failure(422,'GATHERING_DATE_PASSED','The January gathering paragraph is no longer current. Remove it before preparing this letter.');
   const letter=letterContent({date,parents:accounts.filter(a=>a.children.length===prepared.length).map(a=>a.name),children:prepared.map(p=>p.packet),meetingConfirmed:options.meetingConfirmed??false,includeGathering:options.includeGathering??false,testCopy:env.EMAIL_DELIVERY_MODE==='test'});
   const pdf=await renderOfferLetter(letter,{signaturePng:principalSignatureFromConfig(env)});
   const messages=accounts.filter(a=>a.contactPermitted).map(a=>({recipientId:a.id,to:a.email,primary:a.primary,...message(a,'[Your private portal link]')}));
   const packetHash=hash({prepared,accounts,letterHash:pdf.sha256,messages});
   return {apps,prepared,accounts,letter,pdf,messages,packetHash};
 }
 async function preview(event) {
   const actor=await requireStaffSession(event,['admin','admissions']);const p=await prepare(parseBody(event,20000));
   return {packetHash:p.packetHash,children:p.prepared.map(x=>({applicationId:x.applicationId,packet:x.packet,packetHash:x.packetHash,signingArrangement:x.signingArrangement,guardians:x.signers.map(s=>({name:s.name,required:s.required,contactPermitted:s.permitted}))})),recipients:p.accounts.map(a=>({name:a.name,email:a.email,primary:a.primary,childCount:a.children.length,contactPermitted:a.contactPermitted})),messages:p.messages,letterDate:p.letter.date,letter:p.letter,letterPdfBase64:p.pdf.bytes.toString('base64'),letterPdfSha256:p.pdf.sha256,contractApprovalHash:hash(OFFER_CONTRACT),approved:approved(),issueEnabled:env.ENROLMENT_OFFERS_ENABLED==='true',reviewedBy:actor.email};
 }
 async function issue(event) {
   const actor=await requireStaffSession(event,['admin','admissions']);enabled();if(!approved())throw failure(409,'AGREEMENT_APPROVAL_REQUIRED','The exact agreement version must be approved before issue.');
   const body=parseBody(event,20000),p=await prepare(body),op=text(body.operationId,100);
   if(!/^[A-Za-z0-9-]{16,100}$/.test(op))throw failure(422,'OPERATION_REQUIRED','A valid operation identifier is required.');
   if(body.confirmation!=='Send reviewed family offer' || body.guardianPlanReviewed!==true || body.packetHash!==p.packetHash)throw failure(409,'OFFER_REVIEW_REQUIRED','Review the exact family offer, signing arrangement, attachment and recipients before sending.');
   const familyId=`family-offer-${hash(op)}`;
   const existing=await store.getOfferFamily(familyId);
   if(existing){if(existing.packetHash!==p.packetHash)throw failure(409,'OFFER_EXISTS','This operation has already been used for a different offer.');return {familyId,children:await Promise.all(existing.offerIds.map(async id=>staffSummary(await store.getOffer(id)))),deduplicated:true};}
   const previous=await Promise.all(p.apps.map(a=>store.getOfferByApplication(a.id)));
   if(previous.some(o=>o && (o.status!=='withdrawn'||o.signatures.length)))throw failure(409,'OFFER_EXISTS','A selected child already has an active or signed offer.');
   const offers=p.prepared.map((x,i)=>({id:`offer-${crypto.randomUUID()}`,familyId,applicationId:x.applicationId,operationId:op,packet:x.packet,details:x.details,signingArrangement:{...x.signingArrangement,recordedBy:actor.email,recordedAt:iso()},issuedPacketHash:x.packetHash,packetHash:x.packetHash,contractHash:hash(OFFER_CONTRACT),applicationRevisionHash:x.applicationRevisionHash,signatureControlRevision:x.signatureControlRevision,signers:x.signers,signatures:[],status:'awaiting_signatures',revision:1,createdAt:iso(),createdBy:actor.email,previousOfferId:previous[i]?.id||''}));
   const accounts=p.accounts.map(a=>({...a,tokenHash:'',children:a.children.map(c=>({offerId:offers.find(o=>o.applicationId===c.applicationId).id,signerId:c.signerId,studentName:c.studentName,studentFirstName:c.studentFirstName,entryYear:c.entryYear,entryLevel:c.entryLevel}))}));
   const tasks=accounts.filter(a=>a.primary).map(a=>{const raw=random();a.tokenHash=hash(raw);return {...a,raw,familyId,status:'active'};});
   const family={id:familyId,invitationId:p.apps[0].invitationId,packetHash:p.packetHash,offerIds:offers.map(o=>o.id),accounts,letter:p.letter,letterHash:p.pdf.sha256,createdAt:iso(),createdBy:actor.email,revision:1};
   const files=[];
   try {
     const attachment=await drive.storeOfferLetter({familyId,data:p.pdf.bytes,sha256:p.pdf.sha256});files.push(attachment);family.letterFileId=attachment.id;
     for(const o of offers){const file=await drive.storeOfferSnapshot({offerId:o.id,revision:1,snapshot:{packet:o.packet,packetHash:o.packetHash,familyId,letterHash:family.letterHash,createdAt:o.createdAt,createdBy:o.createdBy}});files.push(file);o.snapshotFileId=file.id;}
     await store.issueOfferFamily({family,offers,tasks:tasks.map(({raw,...t})=>t),applications:p.apps,outboxEvents:tasks.map(t=>invitation(t,t.raw,family)),auditEvents:[audit(family,'offer.family_issued',actor,{children:offers.length,recipients:tasks.length,letterHash:family.letterHash}),...offers.filter(o=>o.signingArrangement.mode==='primary_only').map(o=>audit(o,'offer.signing_arrangement_approved',actor,{mode:o.signingArrangement.mode,reason:o.signingArrangement.reason,primaryGuardianId:o.signingArrangement.primaryGuardianId,excludedGuardianIds:o.signingArrangement.excludedGuardianIds}))]});
   }catch(error){for(const file of files)await drive.deleteArtifact(file).catch(()=>console.error('Offer artifact cleanup failed'));throw error;}
   await dispatchOutbox(20);return {familyId,children:offers.map(summary)};
 }
 async function available(task){return offerTaskAccess(store,task,clock());}
 async function requestCode(event) {
   enabled();const body=parseBody(event,10000),tokenHash=hash(text(body.invite,1000)),recipient=email(body.email);
   for(const [key,limit,seconds] of [[`offer-net:${networkFingerprint(event)}`,100,1800],[`offer-cooldown:${tokenHash}:${hash(recipient)}`,1,30],[`offer-task:${tokenHash}`,5,1800],[`offer-email:${hash(recipient)}`,5,1800]])if(!await store.checkRateLimit(key,limit,seconds))throw failure(429,'OTP_RATE_LIMIT','Please wait before requesting another verification code.');
   const task=await store.getOfferTask(tokenHash),children=await available(task),challengeId=`challenge-${crypto.randomUUID()}`;
   if(children.length && task.email===recipient){const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');await store.putChallenge({id:challengeId,purpose:'enrolment_offer',subjectHash:tokenHash,email:recipient,codeHmac:crypto.createHmac('sha256',env.OTP_HMAC_SECRET).update(`${challengeId}:${code}`).digest('hex'),attempts:0,maxAttempts:5,createdAt:clock(),expiresAt:clock()+600000,ttl:Math.floor((clock()+86400000)/1000)});await mailer.send({to:recipient,...offerOtp({code}),tags:{workflow:'enrolment_offer',message_type:'offer_otp',record_id:task.familyId}});}
   return {challengeId,expiresInSeconds:600,resendAfterSeconds:30,message:'If the private invitation and email match, a code has been sent.'};
 }
 async function verifyCode(event) {
   enabled();const body=parseBody(event,10000),taskHash=hash(text(body.invite,1000)),task=await store.getOfferTask(taskHash),challenge=await store.getChallenge(text(body.challengeId));
   if(!(await available(task)).length || !challenge || challenge.purpose!=='enrolment_offer' || challenge.subjectHash!==taskHash || challenge.email!==task.email)throw failure(401,'OTP_INVALID','The code is invalid or expired.');
   const candidate=crypto.createHmac('sha256',env.OTP_HMAC_SECRET).update(`${challenge.id}:${text(body.code,12)}`).digest('hex');
   if(!await store.consumeChallenge(challenge.id,candidate,clock())){await store.failChallenge(challenge.id);throw failure(401,'OTP_INVALID','The code is invalid or expired.');}
   const raw=random();await store.putSession({tokenHash:hash(raw),scope:'enrolment_offer',familyId:task.familyId,taskTokenHash:taskHash,email:task.email,verifiedAt:iso(),createdAt:clock(),expiresAt:clock()+5400000,absoluteExpiresAt:clock()+28800000,ttl:Math.floor((clock()+86400000)/1000)});
   await store.recordOfferAccess({tokenHash:taskHash,at:iso(),auditEvent:audit({id:task.familyId},'offer.portal_verified',{email:task.email})});
   return {sessionToken:raw,expiresInSeconds:5400,absoluteExpiresAt:clock()+28800000};
 }
 async function verified(event){enabled();const actor=await requireSession(event,'enrolment_offer'),task=await store.getOfferTask(actor.taskTokenHash),children=await available(task);if(!children.length || task.familyId!==actor.familyId || task.email!==actor.email)throw failure(409,'OFFER_UNAVAILABLE','These offers are no longer available. Contact the College.');return {actor,task,children};}
 function childContext({offer,signer,signed,app},task){
   const blocked=requiredOfferSigners(offer).some(person=>!offerSignerContactAllowed(offer,app,person));
   return {...summary(offer),packet:offer.packet,packetHash:offer.packetHash,revision:offer.revision,details:visibleOfferDetails(offer.details,{primary:task.primary,email:task.email}),primary:task.primary===true,editable:task.primary===true&&offer.signatures.length===0,signerName:signer.name,signerEmail:signer.email,alreadySigned:Boolean(signed),signedAt:signed?.signedAt||'',declaration:offer.packet.contract.declaration,reviewRequired:offer.correction?.status==='open',signingHoldReason:offer.correction?.status==='open'?'The College is reviewing this offer. Please email enrolment@ffe.org.au before signing.':'',signingArrangementNotice:blocked?'You can sign now. Another required guardian has a contact restriction and will not be emailed. Acceptance will remain pending while the College confirms their signing arrangement.':offer.packet.signingArrangement||''};
 }
 async function context(event){const {children,actor}=await verified(event);return {expiresAt:actor.expiresAt,absoluteExpiresAt:actor.absoluteExpiresAt,children:children.map(x=>({...summary(x.offer),alreadySigned:Boolean(x.signed),reviewRequired:x.offer.correction?.status==='open'}))};}
 async function select(event){const {children,actor,task}=await verified(event),body=parseBody(event,10000),child=children.find(x=>x.offer.id===body.offerId);if(!child)throw failure(404,'OFFER_UNAVAILABLE','This child offer is not available to you.');await store.recordOfferAccess({tokenHash:task.tokenHash,offerId:child.offer.id,at:iso(),auditEvent:audit(child.offer,'offer.child_opened',actor)});return childContext(child,task);}
 async function saveDetails(event) {
   const {children,actor,task}=await verified(event),body=parseBody(event,20000),child=children.find(item=>item.offer.id===body.offerId);
   if(!child)throw failure(404,'OFFER_UNAVAILABLE','This child offer is not available to you.');
   const {offer,app}=child;
   if(!task.primary || offer.signatures.length || offer.correction?.status==='open')throw failure(409,'DETAILS_LOCKED','These offer details are read-only. Email enrolment@ffe.org.au about any error.');
   if(body.revision!==offer.revision || body.packetHash!==offer.packetHash)throw failure(409,'DETAILS_CHANGED','These details changed in another session. Reopen the offer before continuing.');
   const details=validateOfferDetails(body.details,offer.details,{primaryEmail:actor.email,confirmed:body.guardianListConfirmed===true});
   const packet=packetWithDetails(offer.packet,details);
   const next={...offer,details,packet,packetHash:hash(packet),revision:offer.revision+1,detailsConfirmedBy:actor.email,detailsConfirmedAt:iso(),updatedAt:iso(),signers:details.guardians.map(person=>({id:person.id,name:personName(person),email:person.email,permitted:person.contactPermission,required:person.signatureRequired!==false,source:person.source}))};
   const family=await store.getOfferFamily(offer.familyId),nextFamily=reconcileOfferAccounts(family,next);
   await store.saveOfferDetails({offer:next,family:nextFamily,expectedRevision:offer.revision,expectedFamilyRevision:family.revision,expectedApplication:app,taskTokenHash:task.tokenHash,auditEvents:[audit(next,'offer.details_saved',actor,{revision:next.revision,packetHash:next.packetHash,guardianCount:next.signers.length})]});
   return childContext({...child,offer:next,signer:next.signers.find(person=>person.id===child.signer.id)},task);
 }
 async function sign(event) {
   const {children,actor,task}=await verified(event),body=parseBody(event),child=children.find(x=>x.offer.id===body.offerId);
   if(!child)throw failure(404,'OFFER_UNAVAILABLE','This child offer is not available to you.');const {offer,signer,signed,app}=child;
   if(signed)return {...summary(offer),alreadySigned:true};
   if(task.primary)validateOfferDetails(offer.details,offer.details,{primaryEmail:actor.email,confirmed:true});
   if(offer.correction?.status==='open')throw failure(409,'OFFER_REVIEW_REQUIRED','The College is reviewing a correction request. Signing will be available after it is resolved.');
   if(body.packetHash!==offer.packetHash || !['reviewAcknowledged','conditionsAcknowledged','termsAcknowledged','electronicConsent'].every(k=>body[k]===true))throw failure(422,'ACCEPTANCE_REQUIRED','Read the offer and confirm every signing declaration.');
   if(body.typedName!==undefined && text(body.typedName,320).replace(/\s+/g,' ').toLocaleLowerCase()!==signer.name.replace(/\s+/g,' ').toLocaleLowerCase())throw failure(422,'SIGNER_NAME_MISMATCH','Your signing name must match your guardian details.');
   const data=signatureBytes(body.signatureDataUrl),signatureId=`signature-${crypto.randomUUID()}`,files=[];let committed=false;
   await validateOfferSignature(data);
   try{
     const artifact=await drive.storeOfferSignature({offerId:offer.id,signerId:signer.id,signatureId,data});files.push(artifact);
     const signature={id:signatureId,signerId:signer.id,signerName:signer.name,signerEmail:actor.email,verifiedAt:actor.verifiedAt,signedAt:iso(),packetHash:offer.packetHash,contractHash:offer.contractHash,fileId:artifact.id,imageSha256:pdfHash(data),networkFingerprint:networkFingerprint(event),reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true};
     const signatures=[...offer.signatures,signature],next={...offer,signatures,revision:offer.revision+1,status:requiredOfferSigners(offer).every(person=>signatures.some(s=>s.signerId===person.id))?'signed_conditional':'awaiting_signatures',updatedAt:iso()};
     const images=new Map([[signatureId,data]]);
     for(const prior of offer.signatures)images.set(prior.id,await drive.readOfferSignature({offerId:offer.id,signerId:prior.signerId,signatureId:prior.id,fileId:prior.fileId,sha256:prior.imageSha256}));
     const pdf=await renderOfferRecordPdf(next,images);
     const recordFile=await drive.storeOfferRecord({offerId:offer.id,revision:next.revision,packetHash:offer.packetHash,data:pdf.bytes,sha256:pdf.sha256});files.push(recordFile);
     next.acceptanceRecord={offerId:offer.id,revision:next.revision,packetHash:offer.packetHash,fileId:recordFile.id,sha256:pdf.sha256};
     const snapshot=await drive.storeOfferSnapshot({offerId:offer.id,revision:next.revision,snapshot:{packet:offer.packet,details:offer.details,packetHash:offer.packetHash,signatures,status:next.status,acceptanceRecord:next.acceptanceRecord,updatedAt:next.updatedAt}});files.push(snapshot);next.snapshotFileId=snapshot.id;
     const receipt=emailOutbox({to:actor.email,...offerSignatureReceipt({name:signer.name,child:offer.packet,complete:next.status==='signed_conditional'}),tags:{workflow:'enrolment_offer',message_type:'offer_signature_receipt',record_id:offer.id},_tracking:{kind:'offer_family_receipt',familyId:offer.familyId,taskTokenHash:task.tokenHash,offerId:offer.id}},clock());
     const family=await store.getOfferFamily(offer.familyId);
     const familyOffers=await Promise.all(family.offerIds.map(id=>id===next.id?next:store.getOffer(id)));
     const primary=family.accounts.find(a=>a.primary),tasks=[],messages=[receipt],applications=new Map([[app.id,app]]);
     const nextFamily={...family,revision:family.revision+1,accounts:family.accounts.map(a=>({...a}))};
     for(const account of nextFamily.accounts.filter(a=>!a.primary&&!a.tokenHash)){
       const selected=account.children.map(c=>familyOffers.find(o=>o.id===c.offerId));
       if(!selected.every(o=>o?.status==='awaiting_signatures'&&o.correction?.status!=='open'&&o.signatures.some(s=>s.signerEmail===primary.email)&&offerAcceptanceOpen(o,clock())))continue;
       let permitted=true;
       for(const o of selected){const source=await store.getApplication(o.applicationId);applications.set(source.id,source);const assigned=account.children.find(c=>c.offerId===o.id);const candidate=o.signers.find(s=>s.id===assigned.signerId);if(!offerSignerContactAllowed(o,source,candidate)||candidate.email!==account.email)permitted=false;}
       if(!permitted)continue;
       const raw=random();account.tokenHash=hash(raw);const pending={...account,familyId:family.id,status:'active',childOpenedAt:{}};tasks.push(pending);messages.push(invitation(pending,raw,family));
     }
     if(next.status==='signed_conditional')for(const recipient of nextFamily.accounts.filter(a=>a.children.some(c=>c.offerId===next.id)&&offerSignerContactAllowed(next,app,next.signers.find(s=>s.id===a.children.find(c=>c.offerId===next.id).signerId)))){
       messages.push(emailOutbox({to:recipient.email,...offerCompletionEmail({name:recipient.name,child:offer.packet,hasAttachment:true}),_offerRecord:next.acceptanceRecord,tags:{workflow:'enrolment_offer',message_type:'offer_complete',record_id:offer.id},_tracking:{kind:'offer_family_receipt',familyId:family.id,taskTokenHash:recipient.tokenHash,offerId:offer.id}},clock()));
     }
     const complete=next.status==='signed_conditional';
     if(complete?slack?.completionEnabled:slack?.pendingEnabled){
       const required=requiredOfferSigners(next),signedRequired=next.signatures.filter(s=>required.some(person=>person.id===s.signerId));
       messages.push(slackOutbox({
         type:complete?'offer_acceptance_complete':'offer_signature_pending',
         reference:app.reference||'',studentName:next.packet.studentName,
         entryYear:next.packet.entryYear,entryLevel:next.packet.entryLevel,
         signedBy:signedRequired.map(s=>s.signerName),requiredCount:required.length,
         signedAt:signature.signedAt
       },clock()));
     }
     await store.signOffer({offer:next,family:nextFamily,expectedFamilyRevision:family.revision,tasks,applications:[...applications.values()],expectedRevision:offer.revision,expectedApplication:app,taskTokenHash:task.tokenHash,signature,outboxEvents:messages,auditEvents:[audit(offer,'offer.signed',actor,{signerId:signer.id,packetHash:offer.packetHash}),...(next.status==='signed_conditional'?[audit(offer,'offer.completed',actor,{packetHash:offer.packetHash})]:[])]});committed=true;await dispatchOutbox(20);return summary(next);
   }catch(error){if(!committed)for(const f of files)await drive.deleteArtifact(f).catch(()=>console.error('Offer artifact cleanup failed'));throw error;}
 }
 function staffSummary(offer){return {...summary(offer),signingArrangement:offer.signingArrangement||null,correction:offer.correction||null,correctionHistory:offer.correctionHistory||[]};}
 async function list(event) {
   await requireStaffSession(event);const families=await store.listOfferFamilies(),states=await store.listEmailOutboxStates();
   return {families:await Promise.all(families.map(async f=>({familyId:f.id,createdAt:f.createdAt,children:await Promise.all(f.offerIds.map(async id=>staffSummary(await store.getOffer(id)))),recipients:await Promise.all(f.accounts.map(async a=>{const t=a.tokenHash?await store.getOfferTask(a.tokenHash):null,state=states.find(x=>x.recordId===a.tokenHash && x.messageType==='offer_family_invitation');const contactAllowed=(await Promise.all(a.children.map(async c=>{const o=await store.getOffer(c.offerId),app=o&&await store.getApplication(o.applicationId);return o&&offerSignerContactAllowed(o,app,o.signers.find(s=>s.id===c.signerId));}))).every(Boolean);return {recipientId:a.id,name:a.name,email:a.email,primary:a.primary,requestReady:Boolean(a.tokenHash),deliveryStatus:!a.tokenHash&&!contactAllowed?'contact_restricted':!a.tokenHash?'awaiting_primary':state?.state || t?.deliveryStatus || 'unavailable',deliveryAt:t?.deliveryAt||'',portalOpenedAt:t?.portalOpenedAt||'',childOpenedAt:t?.childOpenedAt||{}};}))})))};
 }
 async function resolveCorrection(event) {
   const actor=await requireStaffSession(event,['admin','admissions']),body=parseBody(event,8000),offer=await store.getOffer(text(body.offerId)),note=text(body.note,2000);
   if(!offer||offer.correction?.status!=='open'||note.length<10||body.confirmation!=='Resolve without changing agreement')throw failure(422,'CORRECTION_REVIEW_REQUIRED','Record the resolution. Material agreement changes require a replacement agreement; this action changes no signed content.');
   const next={...offer,revision:offer.revision+1,correction:{...offer.correction,status:'resolved',resolution:note,resolvedBy:actor.email,resolvedAt:iso()}};
   await store.saveOfferCorrection({offer:next,expectedRevision:offer.revision,auditEvents:[audit(offer,'offer.correction_resolved',actor)]});return {resolved:true};
 }
 async function record(event) {
   const {children,actor}=await verified(event),body=parseBody(event,8000),child=children.find(c=>c.offer.id===body.offerId);
   if(!child?.signed)throw failure(403,'SIGNED_RECORD_REQUIRED','Sign this agreement before downloading your acceptance record.');
   const ref=child.offer.acceptanceRecord;
   if(!ref || ref.offerId!==child.offer.id || ref.packetHash!==child.offer.packetHash)throw failure(409,'SIGNED_RECORD_UNAVAILABLE','Your signed record is not available. Please contact the College.');
   const bytes=await drive.readOfferRecord(ref);
   await store.recordAudit(audit(child.offer,'offer.record_downloaded',actor));
   return {fileName:OFFER_RECORD_FILE_NAME,contentType:'application/pdf',base64:bytes.toString('base64'),sha256:ref.sha256};
 }
 async function candidates(event){await requireStaffSession(event,['admin','admissions']);const records=await store.scanEntities(['application']);const groups=new Map();for(const r of records){const app=r.data;if(app.status!=='submitted'||!app.invitationId)continue;const group=groups.get(app.invitationId)||{familyId:app.invitationId,email:app.recipientEmail,children:[]};group.children.push({applicationId:app.id,studentName:[app.values?.student_first,app.values?.student_last].filter(Boolean).join(' '),entryYear:app.values?.entry_year||'',entryLevel:app.values?.entry_level||''});groups.set(app.invitationId,group);}return {families:[...groups.values()]};}
 async function resend(event) {
   const actor=await requireStaffSession(event,['admin','admissions']);enabled();const b=parseBody(event,10000),family=await store.getOfferFamily(text(b.familyId)),a=family?.accounts.find(x=>x.id===b.recipientId);
   if(!a || b.confirmation!=='Resend family invitation')throw failure(422,'RESEND_REVIEW_REQUIRED','Review the family recipient before resending.');
   const old=await store.getOfferTask(a.tokenHash),current=await offerTaskAccess(store,old,clock(),{all:true});
   if(!current.length || current.every(x=>x.signed))throw failure(409,'OFFER_UNAVAILABLE','There is no available unsigned offer for this recipient.');
   if(!await store.checkRateLimit(`offer-resend:${family.id}:${a.id}`,1,60))throw failure(429,'RESEND_RATE_LIMIT','Please wait before resending.');
   const raw=random(),task={...old,tokenHash:hash(raw),deliveryStatus:'',deliveryAt:'',portalOpenedAt:'',childOpenedAt:{}};
   const next={...family,revision:family.revision+1,accounts:family.accounts.map(x=>x.id===a.id?{...x,tokenHash:task.tokenHash}:x)};
   await store.replaceOfferFamilyTask({family:next,expectedRevision:family.revision,previousTokenHash:old.tokenHash,task,applications:current.map(x=>x.app),outboxEvents:[invitation({...a,tokenHash:task.tokenHash},raw,next)],auditEvents:[audit(family,'offer.family_invitation_resent',actor,{recipientId:a.id})]});await dispatchOutbox(20);return {resent:true};
 }
 async function revoke(event){const actor=await requireStaffSession(event,['admin','admissions']),b=parseBody(event,10000),offer=await store.getOffer(text(b.offerId));if(!offer || b.confirmation!=='Withdraw unsigned offer' || offer.signatures.length)throw failure(409,'WITHDRAWAL_REVIEW_REQUIRED','Only unsigned offers can be withdrawn here.');await store.revokeOffer({offer,reason:text(b.reason,1000),auditEvents:[audit(offer,'offer.withdrawn',actor)]});return {withdrawn:true};}
 return new Map([['POST /v6/staff/offers/preview',preview],['POST /v6/staff/offers/issue',issue],['GET /v6/staff/offers',list],['GET /v6/staff/offers/candidates',candidates],['POST /v6/staff/offers/resend',resend],['POST /v6/staff/offers/withdraw',revoke],['POST /v6/offers/request-code',requestCode],['POST /v6/offers/verify-code',verifyCode],['GET /v6/offers/context',context],['POST /v6/offers/select',select],['POST /v6/offers/sign',sign],['POST /v6/offers/details',saveDetails],['POST /v6/offers/record',record],['POST /v6/staff/offers/correction/resolve',resolveCorrection]]);
}
