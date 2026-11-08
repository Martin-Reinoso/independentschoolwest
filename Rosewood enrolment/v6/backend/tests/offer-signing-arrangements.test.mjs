import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,drawing,application} from './helpers/offer-harness.mjs';
import {applicationOfferControls} from '../offer-details.mjs';
import {makeOfferPacket} from '../offer-workflow.mjs';

const acceptance=c=>({offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing});
function legacy(h){const app=h.apps.get('app-synthetic');app.formVersion='rosewood-application-2026.1';app.guardianIds=app.signerControls.map(c=>c.guardianId);app.signerControls.forEach(c=>{app.values[`app_guardian_${c.guardianIndex}_email`]=c.currentEmail;});delete app.signerControls;app.values.app_guardian_1_permission='No, do not contact them';return app;}
async function issue(h,arrangement){const request={applicationIds:['app-synthetic'],signingArrangements:{'app-synthetic':arrangement}},prepared=await h.call('/v6/staff/offers/preview',request);assert.equal(prepared.httpStatus,200);const payload={...request,letterDate:prepared.letterDate,packetHash:prepared.packetHash,guardianPlanReviewed:true,confirmation:'Send reviewed family offer',operationId:'synthetic-signing-arrangement'};return {prepared,payload,result:await h.call('/v6/staff/offers/issue',payload)};}

test('legacy no-contact guardian stays required while the main carer previews, receives and signs',async()=>{
 const h=harness();legacy(h);const original=structuredClone([...h.apps]);const {prepared,result}=await issue(h,{mode:'all_guardians'});assert.equal(result.httpStatus,200);assert.equal(prepared.messages.length,1);assert.equal(prepared.messages[0].to,'alex@example.test');assert.deepEqual(prepared.children[0].guardians.map(g=>[g.required,g.contactPermitted]),[[true,true],[true,false]]);
 const l=await h.login(),c=await h.child(l.session);assert.equal(c.reviewRequired,false);assert.match(c.signingArrangementNotice,/will not be emailed/);assert.equal(c.required,2);
 const signed=await h.call('/v6/offers/sign',acceptance(c),l.session);assert.equal(signed.status,'awaiting_signatures');assert.equal(signed.signed,1);assert.equal(signed.required,2);assert.equal(h.tasks.size,1);assert.equal(h.outbox.length,2);assert.ok(h.outbox.every(e=>e.payload.to==='alex@example.test'));assert.equal(h.records.size,1);assert.deepEqual([...h.apps],original);
 const staff=await h.call('/v6/staff/offers');assert.equal(staff.families[0].recipients.find(r=>!r.primary).deliveryStatus,'contact_restricted');
});

test('explicit main-carer-only approval completes with one signature, records authority and never contacts the restricted guardian',async()=>{
 const h=harness();legacy(h);const original=structuredClone([...h.apps]);const {prepared,result}=await issue(h,{mode:'primary_only',reason:'College-approved synthetic sole-signing arrangement.'});assert.equal(result.httpStatus,200);assert.equal(prepared.children[0].packet.signers.length,1);assert.equal(prepared.messages.length,1);assert.equal(h.audits.filter(a=>a.type==='offer.signing_arrangement_approved').length,1);
 const offer=[...h.offers.values()][0];assert.equal(offer.signingArrangement.recordedBy,'staff@example.test');assert.ok(offer.signingArrangement.recordedAt);assert.deepEqual(offer.signingArrangement.excludedGuardianIds,['g2']);
 const l=await h.login(),c=await h.child(l.session);assert.equal(c.required,1);assert.equal(c.details.guardians.length,2);assert.equal(c.details.guardians[1].signatureRequired,false);
 const signed=await h.call('/v6/offers/sign',acceptance(c),l.session);assert.equal(signed.status,'signed_conditional');assert.equal(signed.required,1);assert.equal(h.tasks.size,1);assert.ok(h.outbox.every(e=>e.payload.to==='alex@example.test'));assert.equal(h.outbox.filter(e=>e.payload.tags.message_type==='offer_complete').length,1);assert.equal((await h.call('/v6/offers/record',{offerId:c.offerId},l.session)).contentType,'application/pdf');assert.deepEqual([...h.apps],original);
});

test('sole-signing approval requires a reason, review and staff authority; changed arrangements invalidate preview',async()=>{
 const h=harness();legacy(h);const base={applicationIds:['app-synthetic']};
 for(const arrangement of [{mode:'primary_only'},{mode:'primary_only',reason:'short'},{mode:'skip_guardian'},{mode:'all_guardians',reason:'unexpected reason'},{mode:'primary_only',reason:'Valid synthetic reason',excludedGuardianIds:['g1']}])assert.equal((await h.call('/v6/staff/offers/preview',{...base,signingArrangements:{'app-synthetic':arrangement}})).httpStatus,422);
 assert.equal((await h.call('/v6/staff/offers/preview',{...base,signingArrangements:{'wrong-child':{mode:'primary_only'}}})).httpStatus,422);
 const p=await h.call('/v6/staff/offers/preview',base),payload={...base,letterDate:p.letterDate,packetHash:p.packetHash,operationId:'synthetic-stale-approval',guardianPlanReviewed:true,confirmation:'Send reviewed family offer',signingArrangements:{'app-synthetic':{mode:'primary_only',reason:'Synthetic approval changed after preview'}}};assert.equal((await h.call('/v6/staff/offers/issue',payload)).error,'OFFER_REVIEW_REQUIRED');assert.equal(h.outbox.length,0);assert.equal(h.offers.size,0);
 const viewer=harness({env:{STAFF_ROLES:'staff@example.test=viewer'}});assert.equal((await viewer.call('/v6/staff/offers/preview',base)).httpStatus,403);
});

test('families cannot waive signatures or lift a source contact restriction; new guardians remain required',async()=>{
 const h=harness();legacy(h);await issue(h,{mode:'primary_only',reason:'Synthetic approved sole-signing arrangement'});const l=await h.login(),c=await h.child(l.session),details=structuredClone(c.details);
 details.guardians[1].contactPermission=true;let request={offerId:c.offerId,revision:c.revision,packetHash:c.packetHash,details,guardianListConfirmed:true};assert.equal((await h.call('/v6/offers/details',request,l.session)).error,'CONTACT_PERMISSION_LOCKED');
 details.guardians[1].contactPermission=false;details.guardians.push({first:'Morgan',middle:'',last:'Synthetic',mobile:'0400 000 003',email:'morgan@example.test',relationship:'Legal guardian',contactPermission:true,signatureRequired:false});
 const saved=await h.call('/v6/offers/details',request,l.session);assert.equal(saved.httpStatus,200);assert.equal(saved.required,2);assert.equal(saved.details.guardians[2].signatureRequired,true);assert.equal(saved.packet.signers.length,2);assert.equal((await h.call('/v6/offers/sign',acceptance(saved),l.session)).status,'awaiting_signatures');assert.ok(h.outbox.every(e=>e.payload.to!=='taylor@example.test'));assert.equal(h.tasks.size,2);
 const other=harness();legacy(other);await issue(other,{mode:'all_guardians'});const x=await other.login(),cx=await other.child(x.session);cx.details.guardians[1].signatureRequired=false;const unchanged=await other.call('/v6/offers/details',{offerId:cx.offerId,revision:cx.revision,packetHash:cx.packetHash,details:cx.details,guardianListConfirmed:true},x.session);assert.equal(unchanged.required,2);assert.equal(unchanged.details.guardians[1].signatureRequired,true);
});

test('legacy compatibility does not guess identities for modern, partial, duplicate or unknown records',()=>{
 const h=harness(),app=legacy(h);assert.equal(applicationOfferControls(app).length,2);assert.equal(applicationOfferControls(app)[1].contactPermission,false);
 for(const change of [{formVersion:'rosewood-application-2026.6'},{formVersion:'unknown'},{status:'pending_signatures'},{guardianIds:['g1','g1']},{guardianIds:['g1']}])assert.equal(applicationOfferControls({...app,...change}).length,0);
 const modern=application();modern.signerControls.pop();assert.throws(()=>makeOfferPacket(modern,{}),e=>e.code==='SIGNER_REVIEW_REQUIRED');
 const duplicate=application();duplicate.signerControls[1].guardianIndex=0;assert.throws(()=>makeOfferPacket(duplicate,{}),e=>e.code==='SIGNER_REVIEW_REQUIRED');
});

test('restricted guardian without email can remain listed without blocking the main carer',async()=>{
 const h=harness();const a=legacy(h);a.values.app_guardian_1_email='';a.values.app_guardian_1_mobile='12345';const {result}=await issue(h,{mode:'all_guardians'});assert.equal(result.httpStatus,200);const l=await h.login(),c=await h.child(l.session);assert.equal((await h.call('/v6/offers/sign',acceptance(c),l.session)).status,'awaiting_signatures');assert.equal(h.tasks.size,1);
});
