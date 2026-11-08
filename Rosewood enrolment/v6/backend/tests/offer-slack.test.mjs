import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,application,drawing} from './helpers/offer-harness.mjs';
import {DynamoStore} from '../dynamo-store.mjs';
const enabled={pendingEnabled:true,completionEnabled:true};
const notifications=h=>h.outbox.filter(e=>e.kind==='slack');
const acceptance=c=>({offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing});
async function sign(h,who=0,index=0){const l=await h.login(who),c=await h.child(l.session,index),body=acceptance(c);const result=await h.call('/v6/offers/sign',body,l.session);assert.equal(result.httpStatus,200);return {l,c,body,result};}

test('offer signatures atomically queue pending then complete notifications; repeated signing does not duplicate them',async()=>{
 const h=harness({slack:enabled});h.apps.get('app-synthetic').reference='APP-SYNTHETIC';const original=structuredClone([...h.apps]);await h.issue();assert.equal(notifications(h).length,0);
 let captured;const save=h.store.signOffer;h.store.signOffer=async i=>{captured=i;return save(i);};
 const first=await sign(h);assert.equal(first.result.status,'awaiting_signatures');assert.deepEqual(notifications(h).map(e=>e.payload.type),['offer_signature_pending']);assert.equal(notifications(h)[0].payload.requiredCount,2);assert.deepEqual(notifications(h)[0].payload.signedBy,['Alex Synthetic']);
 const before=h.outbox.length;assert.equal((await h.call('/v6/offers/sign',first.body,first.l.session)).alreadySigned,true);assert.equal(h.outbox.length,before);
 let transaction;const store=new DynamoStore({tableName:'synthetic-main',auditTableName:'synthetic-audit',client:{send:async c=>{transaction=c.input.TransactItems;}}});await store.signOffer(captured);assert.ok(transaction.some(a=>a.Put?.Item.data?.kind==='slack'));assert.ok(transaction.some(a=>a.Put?.Item.entity==='offer_signature'));assert.ok(transaction.some(a=>a.Put?.ConditionExpression?.includes('#d.#r = :r')));
 const last=await sign(h,1);assert.equal(last.result.status,'signed_conditional');const events=notifications(h);assert.deepEqual(events.map(e=>e.payload.type),['offer_signature_pending','offer_acceptance_complete']);assert.deepEqual(events[1].payload.signedBy,['Alex Synthetic','Taylor Synthetic']);assert.equal((await h.call('/v6/offers/sign',last.body,last.l.session)).alreadySigned,true);assert.equal(notifications(h).length,2);
 for(const e of events){assert.deepEqual(Object.keys(e.payload).sort(),['type','reference','studentName','entryYear','entryLevel','signedBy','requiredCount','signedAt'].sort());assert.doesNotMatch(JSON.stringify(e.payload),/@example.test|fileId|token|signatureDataUrl|contactPermission|reason/);}
 assert.deepEqual([...h.apps],original);
});

test('restricted required guardian remains pending without exposing the restriction to Slack or emailing them',async()=>{
 const h=harness({slack:enabled});h.apps.get('app-synthetic').signerControls[1].contactPermission=false;await h.issue();const first=await sign(h);assert.equal(first.result.status,'awaiting_signatures');assert.deepEqual(notifications(h).map(e=>e.payload.type),['offer_signature_pending']);assert.equal(notifications(h)[0].payload.requiredCount,2);assert.ok(h.outbox.filter(e=>e.kind==='email').every(e=>e.payload.to!=='taylor@example.test'));assert.doesNotMatch(JSON.stringify(notifications(h)),/Taylor|restricted|restriction|contactPermission/);
});

test('approved sole-guardian signing queues completion only',async()=>{
 const h=harness({slack:enabled});const base={applicationIds:['app-synthetic'],signingArrangements:{'app-synthetic':{mode:'primary_only',reason:'Approved synthetic single-guardian arrangement.'}}};const p=await h.call('/v6/staff/offers/preview',base);const issued=await h.call('/v6/staff/offers/issue',{...base,letterDate:p.letterDate,packetHash:p.packetHash,guardianPlanReviewed:true,confirmation:'Send reviewed family offer',operationId:'synthetic-sole-offer-slack'});assert.equal(issued.httpStatus,200);await sign(h);assert.deepEqual(notifications(h).map(e=>e.payload.type),['offer_acceptance_complete']);assert.equal(notifications(h)[0].payload.requiredCount,1);assert.doesNotMatch(JSON.stringify(notifications(h)),/arrangement|reason|Taylor/);
});

test('sibling acceptance notifications remain separate for each child',async()=>{
 const h=harness({slack:enabled}),sibling=application();sibling.id='app-sibling';sibling.values.student_first='Jordan';h.apps.set(sibling.id,sibling);await h.issue(['app-synthetic','app-sibling']);await sign(h,0,0);await sign(h,0,1);assert.deepEqual(notifications(h).map(e=>e.payload.type),['offer_signature_pending','offer_signature_pending']);await sign(h,1,0);await sign(h,1,1);for(const name of ['Avery Synthetic','Jordan Synthetic'])assert.deepEqual(notifications(h).filter(e=>e.payload.studentName===name).map(e=>e.payload.type),['offer_signature_pending','offer_acceptance_complete']);
});

test('three required guardians notify progress after each signature and complete only on the last',async()=>{
 const h=harness({slack:enabled});await h.issue();const l=await h.login(),c=await h.child(l.session),details=structuredClone(c.details);details.guardians.push({first:'Morgan',middle:'',last:'Synthetic',mobile:'0400 000 003',email:'morgan@example.test',relationship:'Legal guardian',contactPermission:true});const saved=await h.call('/v6/offers/details',{offerId:c.offerId,revision:c.revision,packetHash:c.packetHash,details,guardianListConfirmed:true},l.session);assert.equal(saved.required,3);await h.call('/v6/offers/sign',acceptance(saved),l.session);await sign(h,1);assert.deepEqual(notifications(h).map(e=>e.payload.type),['offer_signature_pending','offer_signature_pending']);await sign(h,'morgan@example.test');assert.deepEqual(notifications(h).map(e=>e.payload.signedBy.length),[1,2,3]);assert.equal(notifications(h).at(-1).payload.type,'offer_acceptance_complete');
});

test('failed signature transaction leaves no Slack job; disabled pending route does not suppress completion',async()=>{
 const h=harness({slack:enabled,store:{signOffer:async()=>{throw Object.assign(Error('Synthetic conflict'),{status:409});}}});await h.issue();const l=await h.login(),c=await h.child(l.session);assert.equal((await h.call('/v6/offers/sign',acceptance(c),l.session)).httpStatus,409);assert.equal(notifications(h).length,0);assert.equal(h.removed.length,3);assert.equal([...h.offers.values()][0].signatures.length,0);
 const other=harness({slack:{pendingEnabled:false,completionEnabled:true}});await other.issue();await sign(other);assert.equal(notifications(other).length,0);await sign(other,1);assert.deepEqual(notifications(other).map(e=>e.payload.type),['offer_acceptance_complete']);
});

test('offer Slack delivery retries the saved notification without repeating acceptance or family emails',async()=>{
 let calls=0,attempts=0,released=0,done=false;const sent=[];
 const h=harness({slack:{...enabled,send:async payload=>{calls++;sent.push(structuredClone(payload));if(calls===1)throw Error('Synthetic Slack unavailable');return {delivered:true};}}});await h.issue();await sign(h);const signatures=structuredClone([...h.offers.values()][0].signatures),emailCount=h.mail.length,event=notifications(h)[0];
 h.store.listOutbox=async()=>done?[]:[{PK:'OUTBOX',SK:event.id,data:event}];h.store.claimOutbox=async()=>({attempts:++attempts});h.store.releaseOutbox=async()=>{released++;};h.store.completeOutbox=async()=>{done=true;};
 assert.equal((await h.handler.dispatchOutbox()).failed,1);assert.equal(released,1);assert.equal(done,false);assert.equal((await h.handler.dispatchOutbox()).completed,1);assert.equal(done,true);assert.equal((await h.handler.dispatchOutbox()).examined,0);assert.deepEqual(sent[0],sent[1]);assert.equal(h.mail.length,emailCount);assert.deepEqual([...h.offers.values()][0].signatures,signatures);assert.equal(notifications(h).length,1);
});
