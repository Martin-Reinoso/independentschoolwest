import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,application,drawing} from './helpers/offer-harness.mjs';
import {offerEntry} from '../offer-workflow.mjs';
import {DynamoStore} from '../dynamo-store.mjs';
const placement=id=>({applicationId:id,entryYear:'2027',entryLevel:'Year 4',recordedBy:'synthetic-operator',recordedAt:'2026-11-08T00:00:00Z',reason:'Approved synthetic placement.'});

test('approved placement flows through candidates, preview, sibling letter, emails, family review and signed packet without changing Applications',async()=>{
 const h=harness(),app=h.apps.get('app-synthetic');app.values.entry_level='Year 5';
 const sibling=application();sibling.id='app-sibling';sibling.values.student_first='Jordan';sibling.values.entry_level='Year 2';h.apps.set(sibling.id,sibling);
 h.placements.set(app.id,placement(app.id));const before=structuredClone([...h.apps]);
 const candidates=await h.call('/v6/staff/offers/candidates');assert.equal(candidates.families[0].children.find(c=>c.applicationId===app.id).entryLevel,'Year 4');
 let captured;const issue=h.store.issueOfferFamily;h.store.issueOfferFamily=async i=>{captured=i;return issue(i);};
 const {prepared,result}=await h.issue([app.id,sibling.id]);assert.equal(result.httpStatus,200);
 assert.deepEqual(prepared.letter.children.map(c=>c.entryLevel),['Year 2','Year 4']);
 assert.equal(prepared.children.find(c=>c.applicationId===app.id).packet.entryLevel,'Year 4');
 assert.match(prepared.messages[0].text,/Year 4/);assert.doesNotMatch(prepared.messages[0].text,/Year 5|Approved synthetic placement|synthetic-operator/);
 let tx;const store=new DynamoStore({tableName:'synthetic-main',auditTableName:'synthetic-audit',client:{send:async c=>{tx=c.input.TransactItems;}}});await store.issueOfferFamily(captured);
 const checks=tx.filter(a=>a.ConditionCheck?.Key.PK.startsWith('OFFER_PLACEMENT#')).map(a=>a.ConditionCheck);
 assert.equal(checks.length,2);assert.deepEqual(checks.find(c=>c.Key.PK.endsWith(app.id)).ExpressionAttributeValues[':placement'],placement(app.id));assert.equal(checks.find(c=>c.Key.PK.endsWith(sibling.id)).ConditionExpression,'attribute_not_exists(PK)');
 const l=await h.login();const context=await h.call('/v6/offers/context',undefined,l.session);const child=context.children.find(c=>c.applicationId===app.id||c.studentName==='Avery Synthetic');
 const c=await h.call('/v6/offers/select',{offerId:child.offerId},l.session);assert.equal(c.packet.entryLevel,'Year 4');
 const signed=await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing},l.session);assert.equal(signed.httpStatus,200);assert.equal(h.offers.get(c.offerId).packet.entryLevel,'Year 4');assert.deepEqual([...h.apps],before);
});

test('placement change after preview rejects stale issuance before artifacts or emails',async()=>{
 const h=harness(),id='app-synthetic';const p=await h.call('/v6/staff/offers/preview',{applicationIds:[id]});
 h.placements.set(id,placement(id));const r=await h.call('/v6/staff/offers/issue',{applicationIds:[id],letterDate:p.letterDate,packetHash:p.packetHash,guardianPlanReviewed:true,confirmation:'Send reviewed family offer',operationId:'synthetic-stale-placement'});
 assert.equal(r.httpStatus,409);assert.equal(r.error,'OFFER_REVIEW_REQUIRED');assert.equal(h.offers.size,0);assert.equal(h.outbox.length,0);assert.equal(h.letters.size,0);
});

test('missing placement preserves requested level; malformed or cross-child placement fails closed',()=>{
 const app=application();assert.deepEqual(offerEntry(app),{entryYear:'2027',entryLevel:'Foundation'});
 for(const change of [{applicationId:'other'},{entryYear:'2028'},{entryLevel:'Year 99'},{recordedBy:''},{recordedAt:'invalid'}])assert.throws(()=>offerEntry(app,{...placement(app.id),...change}),e=>e.code==='OFFER_PLACEMENT_INVALID');
});

test('request bodies cannot choose or override a stored placement',async()=>{
 const h=harness(),id='app-synthetic';h.placements.set(id,placement(id));
 const p=await h.call('/v6/staff/offers/preview',{applicationIds:[id],entryLevel:'Year 6',offerPlacement:{entryLevel:'Year 6'},placements:{[id]:{entryLevel:'Year 6'}}});assert.equal(p.httpStatus,200);assert.equal(p.children[0].packet.entryLevel,'Year 4');
});
