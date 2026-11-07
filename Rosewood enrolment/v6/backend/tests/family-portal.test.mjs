import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { harness, application, drawing } from './helpers/offer-harness.mjs';
import { currentFormDefinition } from '../form-definitions.mjs';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const now = Date.parse('2026-11-08T00:00:00Z');
const sibling = (h, id, status='in_progress', invitationId='family-synthetic') => { const app={...application(),id,invitationId,status,values:{...application().values,student_first:id,entry_year:'2028',entry_level:'Year 1'}};h.apps.set(id,app);return app; };
function familySession(h, value='application-family') {h.sessions.set(hash(value),{tokenHash:hash(value),scope:'application_family',invitationId:'family-synthetic',email:'alex@example.test',createdAt:now,expiresAt:now+5400000,absoluteExpiresAt:now+28800000});return value;}
async function sign(h, session) { const c=await h.child(session);const result=await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,typedName:c.signerName,signatureDataUrl:drawing},session);assert.equal(result.httpStatus,200); }

test('primary overview joins only the explicit invitation and reports each separate application/offer stage', async()=>{
 const h=harness();await h.issue();const login=await h.login();
 sibling(h,'Draft child');sibling(h,'Review child','submitted');sibling(h,'Pending child','pending_signatures');sibling(h,'Foreign child','in_progress','different-family');
 const original=JSON.stringify([...h.apps.values()]),outbox=h.outbox.length;
 const result=await h.call('/v6/family/context',undefined,login.session);
 assert.equal(result.httpStatus,200);assert.equal(result.children.length,4);assert.equal(result.canUseApplications,true);
 assert.deepEqual(result.children.map(c=>c.stage),['offer_ready','application_in_progress','application_submitted','application_awaiting_signatures']);
 assert.equal(result.children[1].entryYear,'2028');assert.equal(result.children[1].applicationAction,'continue');
 assert.doesNotMatch(JSON.stringify(result),/guardian|mobile|revisionHash|tokenHash|frozen-original|Foreign child/);
 assert.equal(JSON.stringify([...h.apps.values()]),original);assert.equal(h.outbox.length,outbox);
 const fromApplication=await h.call('/v6/family/context',undefined,familySession(h));assert.deepEqual(fromApplication.children,result.children);
});

test('secondary access is limited to released signing requests, cannot open drafts, and follows current contact permissions',async()=>{
 const h=harness();await h.issue();const primary=await h.login();await sign(h,primary.session);const secondary=await h.login(1);sibling(h,'Draft child');
 const result=await h.call('/v6/family/context',undefined,secondary.session);assert.equal(result.children.length,1);assert.equal(result.canUseApplications,false);assert.equal(result.children[0].applicationAction,'');
 assert.equal(result.children[0].stage,'offer_awaiting_signatures');
 assert.equal((await h.call('/v6/family/open',{target:'application',applicationId:'app-synthetic'},secondary.session)).httpStatus,403);
 assert.equal((await h.call('/v6/family/open',{target:'application',applicationId:'Draft child'},secondary.session)).httpStatus,403);
 await sign(h,secondary.session);assert.equal((await h.call('/v6/family/context',undefined,secondary.session)).children[0].stage,'acceptance_complete');
 h.apps.get('app-synthetic').signerControls[1].contactPermission=false;
 assert.equal((await h.call('/v6/family/context',undefined,secondary.session)).httpStatus,403);
});

test('offer-to-application handoff preserves absolute lifetime and logout revokes both directions without messages',async()=>{
 const h=harness();await h.issue();const primary=await h.login();sibling(h,'Draft child');const messageCount=h.mail.length,outboxCount=h.outbox.length;
 const root=h.sessions.get(hash(primary.session));const result=await h.call('/v6/family/open',{target:'application',applicationId:'Draft child'},primary.session);
 assert.equal(result.httpStatus,200);assert.equal(result.absoluteExpiresAt,root.absoluteExpiresAt);assert.equal(result.applicationAction,'continue');
 const bridge=h.sessions.get(hash(result.sessionToken));assert.equal(bridge.scope,'application_family');assert.equal(bridge.portalAnchor,hash(primary.session));
 const family=await h.call('/v6/application/family',undefined,result.sessionToken);assert.equal(family.httpStatus,200);assert.equal(family.family.portal.children.length,2);
 const offerId=[...h.offers.values()][0].id;
 const back=await h.call('/v6/family/open',{target:'offer',applicationId:'app-synthetic',offerId},result.sessionToken);assert.equal(back.httpStatus,200);
 assert.equal(h.sessions.get(hash(back.sessionToken)).portalAnchor,hash(primary.session));assert.equal((await h.child(back.sessionToken)).httpStatus,200);
 await h.call('/v6/session/logout',{endFamilyAccess:true},back.sessionToken);
 assert.equal((await h.call('/v6/application/family',undefined,result.sessionToken)).error,'SESSION_EXPIRED');
 assert.equal((await h.child(primary.session)).httpStatus,401);assert.equal(h.mail.length,messageCount);assert.equal(h.outbox.length,outboxCount);
});

test('application access can open an issued offer, but not another family or an unissued/revoked task',async()=>{
 const h=harness();await h.issue();const token=familySession(h),offerId=[...h.offers.values()][0].id;
 assert.equal((await h.call('/v6/family/open',{target:'offer',applicationId:'foreign',offerId},token)).httpStatus,403);
 const result=await h.call('/v6/family/open',{target:'offer',applicationId:'app-synthetic',offerId},token);assert.equal(result.httpStatus,200);assert.equal((await h.child(result.sessionToken)).httpStatus,200);
 [...h.tasks.values()][0].status='revoked';
 assert.equal((await h.call('/v6/family/context',undefined,token)).children[0].stage,'application_submitted');
 assert.equal((await h.call('/v6/family/open',{target:'offer',applicationId:'app-synthetic',offerId},token)).httpStatus,403);
 assert.equal((await h.child(result.sessionToken)).httpStatus,409);
});

test('invitation revocation, source-session expiry and cross-invitation membership fail closed',async()=>{
 const h=harness();await h.issue();const token=familySession(h),offerId=[...h.offers.values()][0].id;
 const result=await h.call('/v6/family/open',{target:'offer',applicationId:'app-synthetic',offerId},token);assert.equal(result.httpStatus,200);
 const get=h.store.getInvitationById;h.store.getInvitationById=async id=>({...await get(id),status:'revoked'});
 assert.equal((await h.call('/v6/family/context',undefined,token)).httpStatus,403);assert.equal((await h.child(result.sessionToken)).error,'SESSION_EXPIRED');
 h.store.getInvitationById=get;h.sessions.get(hash(token)).expiresAt=now;
 assert.equal((await h.child(result.sessionToken)).error,'SESSION_EXPIRED');
 h.sessions.get(hash(token)).expiresAt=now+5400000;h.apps.get('app-synthetic').invitationId='other-invitation';
 assert.equal((await h.call('/v6/family/context',undefined,token)).httpStatus,403);
});

test('later sibling offers appear through the explicit family relationship and never release secondary requests early',async()=>{
 const h=harness();await h.issue();const primary=await h.login();await sign(h,primary.session);const secondary=await h.login(1);
 const child=sibling(h,'Later child','submitted');child.values.entry_year='2027';
 const prepared=await h.call('/v6/staff/offers/preview',{applicationIds:[child.id],schedule:(await import('./helpers/offer-harness.mjs')).schedule});
 const issued=await h.call('/v6/staff/offers/issue',{applicationIds:[child.id],schedule:(await import('./helpers/offer-harness.mjs')).schedule,letterDate:prepared.letterDate,packetHash:prepared.packetHash,guardianPlanReviewed:true,confirmation:'Send reviewed family offer',operationId:'later-sibling-operation-12345'});assert.equal(issued.httpStatus,200);
 const p=await h.call('/v6/family/context',undefined,primary.session);assert.equal(p.children.length,2);assert.equal(p.children[1].stage,'offer_ready');
 assert.equal((await h.call('/v6/family/context',undefined,secondary.session)).children.length,1);
 const opened=await h.call('/v6/family/open',{target:'offer',applicationId:child.id,offerId:issued.children[0].offerId},primary.session);assert.equal(opened.httpStatus,200);await sign(h,opened.sessionToken);
 assert.equal((await h.call('/v6/family/context',undefined,secondary.session)).children.length,2);
});

test('blended-family guardians see only their released children, despite sharing a family invitation',async()=>{
 const h=harness(),other=sibling(h,'Blended child','submitted');other.values.entry_year='2027';other.signerControls[1]={...other.signerControls[1],guardianId:'g3',name:'Jordan Synthetic',currentEmail:'jordan@example.test'};other.values.app_guardian_1_first='Jordan';
 await h.issue(['app-synthetic',other.id]);const primary=await h.login();
 const children=(await h.call('/v6/offers/context',undefined,primary.session)).children;
 for(const row of children){const c=await h.call('/v6/offers/select',{offerId:row.offerId},primary.session);const signed=await h.call('/v6/offers/sign',{offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,typedName:c.signerName,signatureDataUrl:drawing},primary.session);assert.equal(signed.httpStatus,200);}
 const secondary=await h.login(1),overview=await h.call('/v6/family/context',undefined,secondary.session);
 assert.deepEqual(overview.children.map(c=>c.applicationId),['app-synthetic']);assert.equal(overview.children[0].applicationAction,'');
 const foreignOffer=children.find(c=>c.applicationId===other.id);assert.equal((await h.call('/v6/family/open',{target:'offer',applicationId:other.id,offerId:foreignOffer.offerId},secondary.session)).httpStatus,403);
});

test('application editing scopes inherit bridge revocation and no restricted draft is upgraded or returned',async()=>{
 const h=harness();await h.issue();const primary=await h.login(),draft=sibling(h,'Draft child');
 const definition=currentFormDefinition('application');Object.assign(draft,{formVersion:definition.formVersion,formDefinitionHash:definition.definitionHash,schemaVersion:definition.schemaVersion,revision:1});
 const bridge=await h.call('/v6/family/open',{target:'application',applicationId:draft.id},primary.session);assert.equal(bridge.httpStatus,200);
 const selected=await h.call('/v6/application/records/select',{applicationId:draft.id},bridge.sessionToken);assert.equal(selected.httpStatus,200);assert.equal(h.sessions.get(hash(selected.sessionToken)).portalAnchor,hash(primary.session));
 assert.equal(selected.absoluteExpiresAt,bridge.absoluteExpiresAt);
 // Save-and-close revokes only the child editing session, leaving the overview available.
 await h.call('/v6/session/logout',{},selected.sessionToken);assert.equal((await h.call('/v6/application/family',undefined,bridge.sessionToken)).httpStatus,200);
 const reopened=await h.call('/v6/application/records/select',{applicationId:draft.id},bridge.sessionToken);assert.equal(reopened.httpStatus,200);
 draft.signerControls[0].contactPermission=false;const before=JSON.stringify(draft);
 assert.equal((await h.call('/v6/application/records/select',{applicationId:draft.id},bridge.sessionToken)).httpStatus,403);
 assert.equal((await h.call('/v6/application/context',undefined,reopened.sessionToken)).error,'SESSION_EXPIRED');
 const family=await h.call('/v6/application/family',undefined,bridge.sessionToken);assert.equal(family.family.applications.some(app=>app.applicationId===draft.id),false);assert.equal(JSON.stringify(draft),before);
 draft.signerControls[0].contactPermission=true;draft.signerControls[0].currentEmail='corrected@example.test';
 assert.equal((await h.call('/v6/application/records/select',{applicationId:draft.id},bridge.sessionToken)).httpStatus,403);
 draft.signerControls[0].currentEmail='alex@example.test';await h.call('/v6/session/logout',{endFamilyAccess:true},bridge.sessionToken);
 assert.equal((await h.call('/v6/application/context',undefined,reopened.sessionToken)).error,'SESSION_EXPIRED');
});

test('an expired unsigned offer keeps its deadline status and cannot be reopened from the application portal',async()=>{
 const h=harness();await h.issue();const token=familySession(h),offer=[...h.offers.values()][0];offer.packet.schedule.acceptBy='2026-11-07T00:00:00Z';
 const view=await h.call('/v6/family/context',undefined,token);assert.equal(view.children[0].stage,'offer_deadline_passed');assert.equal(view.children[0].offer,undefined);
 assert.equal((await h.call('/v6/family/open',{target:'offer',applicationId:'app-synthetic',offerId:offer.id},token)).httpStatus,403);
 offer.status='withdrawn';assert.equal((await h.call('/v6/family/context',undefined,token)).children[0].stage,'offer_withdrawn');
});
