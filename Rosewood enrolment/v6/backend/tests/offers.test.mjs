import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createService} from '../service.mjs';
import {OFFER_CONTRACT} from '../offer-contract.mjs';
import {makeOfferPacket} from '../offer-workflow.mjs';
import {DynamoStore} from '../dynamo-store.mjs';
const hash=s=>crypto.createHash('sha256').update(typeof s==='string'?s:JSON.stringify(s)).digest('hex');
const now=Date.parse('2026-11-08T00:00:00Z');
const schedule={acceptBy:'2026-12-01T00:00:00Z',conditionsBy:'2027-01-20T00:00:00Z'};
import {application,harness,drawing} from './helpers/offer-harness.mjs';
export {harness} from './helpers/offer-harness.mjs';
test('offer issue is disabled by default and exact content approval is required',async()=>{
 for(const env of [{ENROLMENT_OFFERS_ENABLED:'false'},{ENROLMENT_OFFER_APPROVED_HASH:'wrong'}]){const h=harness({env});const {result}=await h.issue();assert.ok([503,409].includes(result.status));assert.equal(h.outbox.length,0);assert.equal(h.offers.size,0);}
});
test('unauthenticated and viewer staff cannot issue offers',async()=>{
 const h=harness({env:{STAFF_ROLES:'staff@example.test=viewer'}});assert.equal((await h.call('/v6/staff/offers/preview',{applicationId:'app-synthetic',schedule})).status,403);assert.equal((await h.call('/v6/staff/offers/issue',{},'')).status,401);
});
test('complete independent signing preserves original application and ends conditional',async()=>{
 const h=harness();const before=structuredClone(h.apps.get('app-synthetic'));const {result}=await h.issue();assert.equal(result.children[0].status,'awaiting_signatures');assert.equal(h.outbox.length,1);
 for(let index=0;index<2;index++){const {session}=await h.login(index);const context=await h.child(session);assert.equal(context.packet.contract.sections.length,14);const signed=await h.call('/v6/offers/sign',{offerId:context.offerId,packetHash:context.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing},session);assert.equal(signed.status,index?'signed_conditional':'awaiting_signatures');}
 assert.deepEqual(h.apps.get('app-synthetic'),before);assert.equal(h.artifacts.length,2);assert.equal([...h.offers.values()][0].signatures.length,2);
});
test('duplicate issue and signature requests do not duplicate email or evidence',async()=>{
 const h=harness();const {payload}=await h.issue();await h.call('/v6/staff/offers/issue',payload);assert.equal(h.outbox.length,1);const {session}=await h.login();const c=await h.child(session);const b={offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing};await h.call('/v6/offers/sign',b,session);await h.call('/v6/offers/sign',b,session);assert.equal(h.artifacts.length,1);assert.equal(h.outbox.length,3);
});
test('unknown and mismatched invites do not disclose a family or send a code',async()=>{
 const h=harness();await h.issue();const result=await h.call('/v6/offers/request-code',{invite:'unknown',email:'alex@example.test'},'');assert.equal(result.status,200);assert.equal(h.mail.length,0);assert.equal(result.packet,undefined);
});
test('OTP replay and incorrect session scope are rejected',async()=>{
 const h=harness();await h.issue();const l=await h.login();assert.equal((await h.call('/v6/offers/verify-code',{invite:l.invite,challengeId:l.challengeId,code:l.code},'')).status,401);assert.equal((await h.call('/v6/offers/context',undefined,'staff')).status,401);
});
test('contact withdrawal blocks existing sessions and new issue',async()=>{
 const h=harness();await h.issue();const l=await h.login();h.apps.get('app-synthetic').signerControls[0].contactPermission=false;assert.equal((await h.child(l.session)).status,409);
 const other=harness();other.apps.get('app-synthetic').signerControls[1].contactPermission=false;assert.equal((await other.issue()).result.status,409);assert.equal(other.outbox.length,0);
});
test('missing declarations and stale packet cannot create a signature file',async()=>{
 const h=harness();await h.issue();const l=await h.login();const c=await h.child(l.session);const bad=await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:'wrong',signatureDataUrl:drawing},l.session);assert.equal(bad.status,422);assert.equal(h.artifacts.length,0);
});
test('late acceptance is rejected while completed evidence remains readable',async()=>{
 const h=harness();await h.issue();h.setTime(Date.parse('2026-12-02T00:00:00Z'));const out=h.outbox[0].payload;const invite=new URL(out.text.match(/https:\/\/\S+/)[0]).searchParams.get('invite');await h.call('/v6/offers/request-code',{invite,email:'alex@example.test'},'');assert.equal(h.mail.length,0);
});
test('database conflict cleans up unreferenced signature image',async()=>{
 const h=harness({store:{signOffer:async()=>{throw Object.assign(Error('Conflict'),{status:409});}}});await h.issue();const l=await h.login();const c=await h.child(l.session);const result=await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing},l.session);assert.equal(result.status,409);assert.equal(h.removed.length,3);assert.equal([...h.offers.values()][0].signatures.length,0);
});
test('offer acceptance needs entry details and dates but no financial selection',()=>{
 const app=application();delete app.values.entry_year;assert.throws(()=>makeOfferPacket(app,schedule,now));
 for(const key of ['acceptBy','conditionsBy'])assert.throws(()=>makeOfferPacket(application(),{...schedule,[key]:''},now));
 const prepared=makeOfferPacket(application(),schedule,now);
 assert.deepEqual(prepared.packet.schedule,{...schedule,financialArrangements:'deferred'});
 assert.match(prepared.packet.contract.paymentArrangementsNotice,/chosen separately at a later stage/);
});
test('stale financial selections are rejected before an offer or email is created',async()=>{
 const h=harness();
 for(const key of ['feeSchedule','paymentDays','refundDays','bondOption','bondAmount','bondCredit']){
  const response=await h.call('/v6/staff/offers/preview',{applicationIds:['app-synthetic'],schedule:{...schedule,[key]:'stale'}});
  assert.equal(response.status,422);assert.equal(response.error,'PAYMENT_CHOICES_DEFERRED');
 }
 assert.equal(h.offers.size,0);assert.equal(h.outbox.length,0);
});
test('a delivery worker failure after signature commit cannot delete committed signature evidence',async()=>{
 const h=harness();await h.issue();const l=await h.login();const c=await h.child(l.session);
 h.store.listOutbox=async()=>{throw Error('Synthetic post-commit worker failure');};
 const response=await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing},l.session);
 assert.equal(response.status,500);
 assert.equal([...h.offers.values()][0].signatures.length,1);
 assert.equal(h.removed.length,0);
 const retry=await h.call('/v6/offers/sign',{offerId:c.offerId},l.session);
 assert.equal(retry.alreadySigned,true);
 assert.equal(h.artifacts.length,1);
});
test('resend invalidates old verified session and preserves the exact agreement',async()=>{
 const h=harness();await h.issue();const l=await h.login();const original=[...h.offers.values()][0];const resent=await h.call('/v6/staff/offers/resend',{familyId:original.familyId,recipientId:'recipient-1',confirmation:'Resend family invitation'});assert.equal(resent.resent,true);assert.equal((await h.child(l.session)).status,409);assert.equal([...h.offers.values()][0].packetHash,original.packetHash);assert.equal(h.outbox.length,2);
});
test('completed signature remains readable after offer deadline with fresh OTP',async()=>{
 const h=harness();await h.issue();let l=await h.login();const c=await h.child(l.session);await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing},l.session);h.setTime(Date.parse('2026-12-02T00:00:00Z'));l=await h.login();const reopened=await h.child(l.session);assert.equal(reopened.alreadySigned,true);assert.equal(reopened.packetHash,c.packetHash);
});
test('signed offer cannot be withdrawn through unsigned-offer control',async()=>{
 const h=harness();await h.issue();const l=await h.login();const c=await h.child(l.session);await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing},l.session);const result=await h.call('/v6/staff/offers/withdraw',{offerId:c.offerId,confirmation:'Withdraw unsigned offer'});assert.equal(result.status,409);
});
test('each declaration and valid signature data is required server-side',async()=>{
 const h=harness();await h.issue();const l=await h.login();const c=await h.child(l.session);const body={offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing};for(const key of ['reviewAcknowledged','conditionsAcknowledged','termsAcknowledged','electronicConsent'])assert.equal((await h.call('/v6/offers/sign',{...body,[key]:false},l.session)).status,422);assert.equal((await h.call('/v6/offers/sign',{...body,signatureDataUrl:'not-an-image'},l.session)).status,422);assert.equal(h.artifacts.length,0);
});
test('expired session and withdrawn offer fail closed',async()=>{
 const h=harness();await h.issue();const l=await h.login();h.setTime(now+5400001);assert.equal((await h.child(l.session)).status,401);h.setTime(now);const offer=[...h.offers.values()][0];await h.call('/v6/staff/offers/withdraw',{offerId:offer.id,confirmation:'Withdraw unsigned offer',reason:'Synthetic withdrawal'});assert.equal((await h.child(l.session)).status,409);
});

function sibling(h,{id='app-sibling',family='family-synthetic',secondGuardian='taylor@example.test'}={}){const app=structuredClone(h.apps.get('app-synthetic'));app.id=id;app.invitationId=family;app.values.student_first='Jordan';app.values.entry_level='Year 2';app.signerControls[0].guardianId='sibling-g1';app.signerControls[1].guardianId='sibling-g2';app.signerControls[1].currentEmail=secondGuardian;if(secondGuardian!=='taylor@example.test')app.signerControls[1].name='Morgan Synthetic';h.apps.set(id,app);return app;}
const acceptance=c=>({offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing});
test('two siblings receive one primary letter email, one independent guardian invitation and separate acceptance records',async()=>{
 const h=harness();sibling(h);const before=structuredClone([...h.apps]);const {prepared,result}=await h.issue(['app-synthetic','app-sibling']);assert.equal(result.children.length,2);assert.equal(h.outbox.length,1);assert.equal(h.outbox.filter(e=>e.payload._offerLetter).length,1);assert.ok(Buffer.from(prepared.letterPdfBase64,'base64').subarray(0,5).equals(Buffer.from('%PDF-')));assert.deepEqual(prepared.letter.children.map(c=>c.studentName).sort(),['Avery Synthetic','Jordan Synthetic']);
 for(let parent=0;parent<2;parent++){const l=await h.login(parent);const list=await h.call('/v6/offers/context',undefined,l.session);assert.equal(list.children.length,2);for(const c of list.children){const child=await h.call('/v6/offers/select',{offerId:c.offerId},l.session);const result=await h.call('/v6/offers/sign',acceptance(child),l.session);assert.equal(result.status,parent?'signed_conditional':'awaiting_signatures');}}
 assert.deepEqual([...h.apps],before);assert.equal(h.artifacts.length,4);assert.ok([...h.offers.values()].every(o=>o.signatures.length===2));
});
test('a guardian authorised for one child cannot list select or sign the sibling offer',async()=>{
 const h=harness();sibling(h,{secondGuardian:'morgan@example.test'});await h.issue(['app-synthetic','app-sibling']);const primary=await h.login();for(const row of (await h.call('/v6/offers/context',undefined,primary.session)).children){const c=await h.call('/v6/offers/select',{offerId:row.offerId},primary.session);await h.call('/v6/offers/sign',acceptance(c),primary.session);}const index=h.outbox.findIndex(x=>x.payload.to==='taylor@example.test');const invite=new URL(h.outbox[index].payload.text.match(/https:\/\/\S+/)[0]).searchParams.get('invite');const challenge=await h.call('/v6/offers/request-code',{invite,email:'taylor@example.test'},'');const code=h.mail.at(-1).text.match(/\b\d{6}\b/)[0];const login=await h.call('/v6/offers/verify-code',{invite,challengeId:challenge.challengeId,code},'');const list=await h.call('/v6/offers/context',undefined,login.sessionToken);assert.equal(list.children.length,1);const siblingOffer=[...h.offers.values()].find(o=>o.applicationId==='app-sibling');assert.equal((await h.call('/v6/offers/select',{offerId:siblingOffer.id},login.sessionToken)).status,404);assert.equal((await h.call('/v6/offers/sign',{offerId:siblingOffer.id},login.sessionToken)).status,404);assert.equal(h.artifacts.length,2);
});
test('family grouping cannot be inferred from matching emails and duplicate shared guardian email is blocked',async()=>{
 const h=harness();sibling(h,{family:'unrelated-family'});assert.equal((await h.issue(['app-synthetic','app-sibling'])).result.status,409);assert.equal(h.outbox.length,0);
 const same=harness();same.apps.get('app-synthetic').signerControls[1].currentEmail='alex@example.test';assert.equal((await same.issue()).result.status,409);
});
test('changed letter date contact controls or fee content invalidates reviewed issue',async()=>{
 for(const change of ['date','contact','deadline']){const h=harness();const {payload}=await h.issue();payload.operationId+='new';if(change==='date')payload.letterDate='2026-11-09';if(change==='deadline')payload.schedule={...payload.schedule,acceptBy:'2026-12-02T00:00:00Z'};if(change==='contact')h.apps.get('app-synthetic').signatureControlRevision++;const result=await h.call('/v6/staff/offers/issue',payload);assert.equal(result.status,409);assert.equal(h.outbox.length,1);}
});
test('real portal verification and child access are tracked separately from email delivery',async()=>{
 const h=harness();await h.issue();let view=await h.call('/v6/staff/offers');assert.equal(view.families[0].recipients[0].portalOpenedAt,'');const l=await h.login();view=await h.call('/v6/staff/offers');assert.ok(view.families[0].recipients[0].portalOpenedAt);assert.deepEqual(view.families[0].recipients[0].childOpenedAt,{});const c=await h.child(l.session);view=await h.call('/v6/staff/offers');assert.ok(view.families[0].recipients[0].childOpenedAt[c.offerId]);assert.equal(view.families[0].recipients[0].deliveryStatus,'unavailable');assert.ok(!JSON.stringify(view).includes('taskTokenHash'));
});
function outboxRunner(h){const queue=h.outbox.map(data=>({PK:'OUTBOX',SK:data.id,data}));const completed=[];h.store.listOutbox=async()=>queue;h.store.claimOutbox=async()=>({attempts:1});h.store.completeOutbox=async(item,result)=>completed.push(result);h.store.releaseOutbox=async()=>{};return completed;}
test('delivery worker retrieves the exact reviewed private PDF and sends it only with the primary family email',async()=>{
 const h=harness();await h.issue();const done=outboxRunner(h);const result=await h.handler.dispatchOutbox();assert.equal(result.completed,1);assert.equal(h.mail.length,1);assert.equal(h.mail[0].attachments.length,1);assert.ok(Buffer.isBuffer(h.mail[0].attachments[0].data));assert.equal(done.length,1);const view=await h.call('/v6/staff/offers');assert.ok(view.families[0].recipients.filter(r=>r.primary).every(r=>r.deliveryStatus==='accepted_by_ses'));
});
test('delivery rechecks every child contact permission before sending the family letter',async()=>{
 const h=harness();sibling(h);await h.issue(['app-synthetic','app-sibling']);h.apps.get('app-sibling').signerControls[0].contactPermission=false;const done=outboxRunner(h);await h.handler.dispatchOutbox();assert.equal(h.mail.length,0);assert.ok(done.some(d=>d.suppressed));assert.equal((await h.call('/v6/staff/offers')).families[0].recipients[0].deliveryStatus,'suppressed');
});
test('family transaction includes each source revision task snapshot outbox and audit atomically',async()=>{
 const h=harness();sibling(h);await h.issue(['app-synthetic','app-sibling']);let command;const store=new DynamoStore({tableName:'synthetic-main',auditTableName:'synthetic-audit',client:{send:async c=>{command=c;}}});await store.issueOfferFamily({family:[...h.families.values()][0],offers:[...h.offers.values()],tasks:[...h.tasks.values()],applications:[...h.apps.values()],outboxEvents:h.outbox,auditEvents:h.audits});const actions=command.input.TransactItems;assert.equal(actions.filter(a=>a.ConditionCheck?.Key.PK.startsWith('APP#')).length,2);assert.equal(actions.filter(a=>a.Put?.Item.SK==='ISSUED').length,2);assert.equal(new Set(actions.map(a=>JSON.stringify((a.Put?.Item||a.ConditionCheck?.Key||a.Update?.Key)))).size,actions.length);assert.ok(actions.length<100);assert.ok(!actions.some(a=>a.Put?.Item.PK.startsWith('APP#')||a.Update?.Key.PK.startsWith('APP#')));
});
test('family transaction failure cleans up letter and all child snapshots',async()=>{
 const h=harness({store:{issueOfferFamily:async()=>{throw Object.assign(Error('Conflict'),{status:409});}}});sibling(h);assert.equal((await h.issue(['app-synthetic','app-sibling'])).result.status,409);assert.equal(h.removed.length,3);assert.equal(h.outbox.length,0);
});
test('replacement family link revokes the prior session for all siblings',async()=>{
 const h=harness();sibling(h);await h.issue(['app-synthetic','app-sibling']);const l=await h.login();const f=[...h.families.values()][0];assert.equal((await h.call('/v6/staff/offers/resend',{familyId:f.id,recipientId:'recipient-1',confirmation:'Resend family invitation'})).resent,true);assert.equal((await h.call('/v6/offers/context',undefined,l.session)).status,409);assert.equal(h.outbox.length,2);
});

test('SES feedback waits for correlation and cannot downgrade delivered status on a late send event',async()=>{
 const h=harness();await h.issue();const t=[...h.tasks.values()][0];h.store.recordSesEvent=async()=>true;
 const event=kind=>({Records:[{EventSource:'aws:sns',Sns:{Message:JSON.stringify({eventType:kind,mail:{messageId:'synthetic-provider-id',timestamp:'2026-11-08T00:01:00Z',tags:{message_type:['offer_family_invitation'],workflow:['enrolment_offer'],record_id:[t.tokenHash]}},delivery:{timestamp:'2026-11-08T00:02:00Z'}})}}]});
 await assert.rejects(()=>h.handler.processSesFeedback(event('Delivery')),/correlation/);
 h.store.getEmailMessage=async()=>({tracking:{kind:'offer_family_invitation',taskTokenHash:t.tokenHash}});
 await h.handler.processSesFeedback(event('Delivery'));await h.handler.processSesFeedback(event('Send'));assert.equal(h.tasks.get(t.tokenHash).deliveryStatus,'delivered');assert.equal((await h.call('/v6/staff/offers')).families[0].recipients[0].portalOpenedAt,'');
});
test('Dynamo signing includes the active task condition to reject a revoked-link race',async()=>{
 const h=harness();await h.issue();const offer=[...h.offers.values()][0],task=[...h.tasks.values()][0];let command;const store=new DynamoStore({tableName:'synthetic',client:{send:async c=>{command=c;}}});const family=[...h.families.values()][0];
 await store.signOffer({offer,family:{...family,revision:2},expectedFamilyRevision:1,tasks:[{tokenHash:'synthetic-secondary',familyId:family.id,status:'active'}],expectedRevision:1,expectedApplication:h.apps.get('app-synthetic'),taskTokenHash:task.tokenHash,signature:{signerId:'g1'},outboxEvents:[],auditEvents:[]});
 const actions=command.input.TransactItems;
 assert.ok(actions.some(a=>a.ConditionCheck?.Key.PK===`OFFER_TASK#${task.tokenHash}` && a.ConditionCheck.ExpressionAttributeValues[':s']==='active'));
 const familyWrite=actions.find(a=>a.Put?.Item.PK===`OFFER_FAMILY#${family.id}`).Put;
 assert.equal(familyWrite.ExpressionAttributeValues[':r'],1);assert.equal(familyWrite.Item.data.revision,2);assert.equal(familyWrite.ConditionExpression,'#d.#r = :r');
 assert.equal(actions.find(a=>a.Put?.Item.PK==='OFFER_TASK#synthetic-secondary').Put.ConditionExpression,'attribute_not_exists(PK)');
});

test('guardian requests wait for primary acceptance of their selected siblings and are queued once',async()=>{
 const h=harness();sibling(h);await h.issue(['app-synthetic','app-sibling']);assert.equal(h.tasks.size,1);
 assert.equal((await h.call('/v6/staff/offers')).families[0].recipients[1].deliveryStatus,'awaiting_primary');
 const primary=await h.login(),list=await h.call('/v6/offers/context',undefined,primary.session);
 const first=await h.call('/v6/offers/select',{offerId:list.children[0].offerId},primary.session);
 await h.call('/v6/offers/sign',acceptance(first),primary.session);assert.equal(h.tasks.size,1);
 const second=await h.call('/v6/offers/select',{offerId:list.children[1].offerId},primary.session);
 await h.call('/v6/offers/sign',acceptance(second),primary.session);await h.call('/v6/offers/sign',acceptance(second),primary.session);
 assert.equal(h.tasks.size,2);assert.equal(h.outbox.filter(x=>x.payload.tags.message_type==='offer_family_invitation'&&x.payload.to==='taylor@example.test').length,1);
 const other=await h.login(1);assert.equal((await h.call('/v6/offers/context',undefined,other.session)).children.length,2);
});

test('final signature queues distinct completion copies exactly once and record excludes access secrets',async()=>{
 const h=harness();await h.issue();const first=await h.login(),c=await h.child(first.session);
 assert.equal((await h.call('/v6/offers/record',{offerId:c.offerId},first.session)).status,403);
 await h.call('/v6/offers/sign',acceptance(c),first.session);assert.equal(h.outbox.filter(x=>x.payload.tags.message_type==='offer_complete').length,0);
 const second=await h.login(1),other=await h.child(second.session);await h.call('/v6/offers/sign',acceptance(other),second.session);await h.call('/v6/offers/sign',acceptance(other),second.session);
 assert.equal(h.outbox.filter(x=>x.payload.tags.message_type==='offer_complete').length,2);assert.equal(h.outbox.filter(x=>x.payload.tags.message_type==='offer_signature_receipt').length,2);
 const record=await h.call('/v6/offers/record',{offerId:c.offerId},first.session);assert.equal(record.status,200);assert.equal(record.contentType,'application/pdf');const bytes=Buffer.from(record.base64,'base64');assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.equal(record.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));assert.deepEqual(bytes,h.records.get(h.offers.get(c.offerId).acceptanceRecord.fileId).data);
 for(const item of h.outbox.filter(x=>x.payload.tags.message_type==='offer_complete')){assert.deepEqual(item.payload._offerRecord,h.offers.get(c.offerId).acceptanceRecord);assert.match(item.payload.text,/attached copy/);}
});

test('family correction-request route is absent; families can email the College',async()=>{
 const h=harness();await h.issue();const l=await h.login(),c=await h.child(l.session);
 assert.equal((await h.call('/v6/offers/correction',{offerId:c.offerId,reason:'Synthetic correction request'},l.session)).status,404);
 assert.equal([...h.offers.values()][0].correction,undefined);
});

test('offer sessions slide on activity, expire absolutely and are revoked on logout',async()=>{
 const h=harness();await h.issue();const l=await h.login();h.setTime(now+80*60000);assert.equal((await h.child(l.session)).status,'awaiting_signatures');h.setTime(now+150*60000);assert.equal((await h.child(l.session)).status,'awaiting_signatures');
 await h.call('/v6/session/logout',{},l.session);assert.equal((await h.child(l.session)).status,401);
 h.setTime(now);const next=await h.login();for(let hour=1;hour<8;hour++){h.setTime(now+hour*3600000);assert.equal((await h.child(next.session)).status,'awaiting_signatures');}h.setTime(now+8*3600000+1);assert.equal((await h.child(next.session)).status,401);
});

const detailsRequest = (context, details=context.details) => ({offerId:context.offerId,revision:context.revision,packetHash:context.packetHash,details,guardianListConfirmed:true});
test('primary corrections create an offer revision, preserve the application and invalidate a stale signature',async()=>{
 const h=harness(),original=structuredClone(h.apps.get('app-synthetic'));await h.issue();const l=await h.login(),c=await h.child(l.session);
 const details=structuredClone(c.details);details.student.middle='Louise';details.guardians[0].middle='James';details.guardians[0].mobile='0400 123 456';
 const saved=await h.call('/v6/offers/details',detailsRequest(c,details),l.session);
 assert.equal(saved.status,'awaiting_signatures');assert.equal(saved.packet.studentName,'Avery Louise Synthetic');assert.equal(saved.signerName,'Alex James Synthetic');assert.notEqual(saved.packetHash,c.packetHash);assert.equal(saved.revision,c.revision+1);
 assert.equal(h.outbox.length,1);assert.deepEqual(h.apps.get('app-synthetic'),original);
 assert.equal((await h.call('/v6/offers/sign',acceptance(c),l.session)).status,422);
 assert.equal((await h.call('/v6/offers/details',detailsRequest(c,details),l.session)).status,409);
 assert.equal((await h.call('/v6/offers/sign',acceptance(saved),l.session)).status,'awaiting_signatures');
 assert.equal((await h.call('/v6/offers/details',detailsRequest(saved,details),l.session)).status,409);
 const secondary=await h.login(1),second=await h.child(secondary.session);
 assert.equal(second.editable,false);assert.equal(second.primary,false);assert.equal(second.packetHash,saved.packetHash);assert.equal(second.packet.studentName,'Avery Louise Synthetic');
 assert.equal(second.details.guardians[0].email,undefined);assert.equal(second.details.guardians[0].mobile,undefined);assert.equal(second.details.guardians[1].email,'taylor@example.test');
 assert.equal((await h.call('/v6/offers/details',detailsRequest(second,details),secondary.session)).status,409);
});

test('added guardian is scoped to the child, verifies independently and is required for completion',async()=>{
 const h=harness(),original=structuredClone(h.apps.get('app-synthetic'));await h.issue();const l=await h.login(),c=await h.child(l.session),details=structuredClone(c.details);
 details.guardians.push({first:'Morgan',middle:'',last:'Synthetic',mobile:'0400 000 003',email:'morgan@example.test',relationship:'Legal guardian',contactPermission:true});
 const saved=await h.call('/v6/offers/details',detailsRequest(c,details),l.session);assert.equal(saved.required,3);assert.equal(h.outbox.length,1);assert.equal(h.tasks.size,1);
 await h.call('/v6/offers/sign',acceptance(saved),l.session);
 assert.equal(h.outbox.filter(item=>item.payload.to==='morgan@example.test').length,1);
 const other=await h.login(1),otherContext=await h.child(other.session);assert.equal((await h.call('/v6/offers/sign',acceptance(otherContext),other.session)).status,'awaiting_signatures');
 const added=await h.login('morgan@example.test'),addedContext=await h.child(added.session);assert.equal(addedContext.editable,false);assert.equal(addedContext.packetHash,saved.packetHash);
 assert.equal((await h.call('/v6/offers/sign',acceptance(addedContext),added.session)).status,'signed_conditional');
 assert.equal(h.outbox.filter(item=>item.payload.tags.message_type==='offer_complete').length,3);assert.deepEqual(h.apps.get('app-synthetic'),original);
});

test('guardian removal, email changes, forged identities, missing authority and malformed details fail before writes',async()=>{
 const h=harness();await h.issue();const l=await h.login(),c=await h.child(l.session);
 const invalid=[d=>d.guardians.pop(),d=>d.guardians[1].email='replacement@example.test',d=>d.guardians[1].id='forged',d=>d.guardians[1].relationship='Other',d=>d.guardians[1].mobile='wrong',d=>d.student.last='',d=>d.guardians.push({...d.guardians[1],id:undefined})];
 for(const change of invalid){const details=structuredClone(c.details);change(details);assert.equal((await h.call('/v6/offers/details',detailsRequest(c,details),l.session)).status,422);}
 assert.equal((await h.call('/v6/offers/details',{...detailsRequest(c),guardianListConfirmed:false},l.session)).status,422);
 assert.equal([...h.offers.values()][0].revision,1);assert.equal(h.outbox.length,1);
});

test('a saved no-contact choice blocks signing and requests without waiving the required guardian',async()=>{
 const h=harness();await h.issue();const l=await h.login(),c=await h.child(l.session),details=structuredClone(c.details);details.guardians[1].contactPermission=false;
 const saved=await h.call('/v6/offers/details',detailsRequest(c,details),l.session);assert.equal(saved.required,2);assert.equal(saved.reviewRequired,true);assert.match(saved.signingHoldReason,/contact restrictions/);
 assert.equal((await h.call('/v6/offers/sign',acceptance(saved),l.session)).status,409);assert.equal(h.tasks.size,1);assert.equal(h.outbox.length,1);
 details.guardians[1].contactPermission=true;const restored=await h.call('/v6/offers/details',detailsRequest(saved,details),l.session);assert.equal(restored.reviewRequired,false);
 assert.equal((await h.call('/v6/offers/sign',acceptance(restored),l.session)).status,'awaiting_signatures');
});

test('an already authorised application relationship is retained without requiring a parent label',async()=>{
 const h=harness();h.apps.get('app-synthetic').values.app_guardian_1_relationship='Guardian';await h.issue();const l=await h.login(),c=await h.child(l.session);
 const saved=await h.call('/v6/offers/details',detailsRequest(c),l.session);assert.equal(saved.details.guardians[1].relationship,'Guardian');
 assert.equal((await h.call('/v6/offers/sign',acceptance(saved),l.session)).status,'awaiting_signatures');
});

test('typed signing name cannot contradict the verified guardian details',async()=>{
 const h=harness();await h.issue();const l=await h.login(),c=await h.child(l.session);
 assert.equal((await h.call('/v6/offers/sign',{...acceptance(c),typedName:'Another Person'},l.session)).status,422);
 assert.equal(h.artifacts.length,0);
});

test('detail save is atomic with unsigned offer, source, active primary task and family revision guards',async()=>{
 const h=harness();await h.issue();const l=await h.login(),c=await h.child(l.session);await h.call('/v6/offers/details',detailsRequest(c),l.session);
 const offer=[...h.offers.values()][0],family=[...h.families.values()][0],task=[...h.tasks.values()][0];let command;
 const store=new DynamoStore({tableName:'synthetic-main',auditTableName:'synthetic-audit',client:{send:async value=>{command=value;}}});
 await store.saveOfferDetails({offer,family,expectedRevision:1,expectedFamilyRevision:1,expectedApplication:h.apps.get('app-synthetic'),taskTokenHash:task.tokenHash});
 const actions=command.input.TransactItems;
 assert.ok(actions.some(item=>item.ConditionCheck?.Key.PK.startsWith('APP#')));
 assert.ok(actions.some(item=>item.ConditionCheck?.ExpressionAttributeValues[':p']===true));
 assert.ok(actions.some(item=>item.Put?.ConditionExpression.includes('size(#d.#signatures) = :zero')));
 assert.ok(actions.some(item=>item.Put?.Item.SK==='DETAILS#2'&&item.Put.ConditionExpression==='attribute_not_exists(PK)'));
 assert.ok(!actions.some(item=>item.Put?.Item.PK.startsWith('APP#')||item.Update?.Key.PK.startsWith('APP#')||item.Put?.Item.entity==='outbox'));
});

test('offer access sends provisional-offer OTP wording in both email formats',async()=>{
 const h=harness();await h.issue();await h.login();
 const email=h.mail.at(-1);
 assert.equal(email.tags.message_type,'offer_otp');
 for(const body of [email.text,email.html]){
  assert.match(body,/access your provisional offer of enrolment/);
  assert.match(body,/10 minutes/);
  assert.doesNotMatch(body,/Application for Enrolment/);
 }
});
