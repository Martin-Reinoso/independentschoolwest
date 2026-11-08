import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,PDFName} from 'pdf-lib';
import {readFileSync} from 'node:fs';
import {letterContent,renderOfferLetter} from '../offer-letter.mjs';
import {principalSignatureFromConfig} from '../offer-letter-assets.mjs';
import {pdfHash} from '../offer-pdf.mjs';
import {harness,application,drawing,schedule} from './helpers/offer-harness.mjs';

const signaturePng=Buffer.from(drawing.split(',')[1],'base64');
const data={date:'2026-11-08',parents:['Alex Synthetic','Taylor Synthetic'],children:[{studentName:'Avery Synthetic',entryLevel:'Foundation',entryYear:'2027'}]};

test('personalised letter uses selected children, singular/plural and explicit meeting/gathering choices',()=>{
 const single=letterContent(data);assert.match(single.offerSentence,/a place/);assert.match(single.acceptance,/your child/);assert.doesNotMatch(single.opening,/meeting/);assert.equal(single.gathering,'');
 const plural=letterContent({...data,children:[...data.children,{studentName:'Jordan Synthetic',entryLevel:'Year 2',entryYear:'2027'}],meetingConfirmed:true,includeGathering:true});assert.match(plural.offerSentence,/places/);assert.match(plural.acceptance,/each child/);assert.match(plural.opening,/meeting with me/);assert.match(plural.gathering,/Sunday 17 January 2027/);assert.equal(plural.children.length,2);
 for(const date of ['2026-02-30','2026-11-31','bad'])assert.throws(()=>letterContent({...data,date}),e=>e.code==='LETTER_DATE_REQUIRED');
 assert.throws(()=>letterContent({...data,date:'2027-01-17',includeGathering:true}),e=>e.code==='GATHERING_DATE_PASSED');
 assert.throws(()=>letterContent({...data,meetingConfirmed:'yes'}),e=>e.code==='LETTER_OPTIONS_REQUIRED');
});

test('private principal signature fails closed when missing, changed or invalid',async()=>{
 const config={OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64:signaturePng.toString('base64'),OFFER_PRINCIPAL_SIGNATURE_SHA256:pdfHash(signaturePng)};
 assert.deepEqual(principalSignatureFromConfig(config),signaturePng);
 for(const change of [{OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64:''},{OFFER_PRINCIPAL_SIGNATURE_SHA256:'0'.repeat(64)},{OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64:'not an image'}])assert.throws(()=>principalSignatureFromConfig({...config,...change}),e=>e.code==='LETTER_SIGNATURE_REQUIRED');
 await assert.rejects(()=>renderOfferLetter(letterContent(data)),e=>e.code==='LETTER_SIGNATURE_REQUIRED');
 const h=harness({env:{OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64:''}});assert.equal((await h.call('/v6/staff/offers/preview',{applicationIds:['app-synthetic'],schedule})).status,503);assert.equal(h.offers.size,0);assert.equal(h.outbox.length,0);
});

test('reviewed letter PDF is deterministic, contains the emblem and signature, and remains bounded for eight long-name children',async()=>{
 const letter=letterContent({...data,parents:['Zoë Éléonore Łukasz Nguyen','Taylor Synthetic'],meetingConfirmed:true,includeGathering:true});
 const first=await renderOfferLetter(letter,{signaturePng}),second=await renderOfferLetter(letter,{signaturePng});assert.equal(first.sha256,second.sha256);assert.equal(first.sha256,pdfHash(first.bytes));assert.equal(first.pages,1);assert.ok(first.bytes.length<2_000_000);
 const pdf=await PDFDocument.load(first.bytes);assert.equal(pdf.getPageCount(),1);
 const images=pdf.context.enumerateIndirectObjects().map(([,o])=>o.dict).filter(d=>d?.get(PDFName.of('Subtype'))?.toString()==='/Image');
 assert.ok(images.some(d=>d.get(PDFName.of('Width'))?.asNumber()===1435));assert.ok(images.some(d=>d.get(PDFName.of('Width'))?.asNumber()===900));
 const large=letterContent({...data,parents:Array.from({length:8},(_,i)=>`${'Alexandra '.repeat(24)}Synthetic ${i}`),children:Array.from({length:8},(_,i)=>({studentName:`${'Éléonore'.repeat(30)} Synthetic ${i}`,entryLevel:'Foundation / Prep',entryYear:'2027'})),meetingConfirmed:true,includeGathering:true});
 const many=await renderOfferLetter(large,{signaturePng});assert.ok(many.pages>1&&many.pages<=8);assert.ok(many.bytes.length<2_000_000);
});

test('reviewed PDF bytes are the issued attachment and changed options/signature require another review',async()=>{
 const h=harness(),{prepared,payload,result}=await h.issue();assert.equal(result.children.length,1);const family=[...h.families.values()][0];assert.equal(family.letterHash,prepared.letterPdfSha256);assert.deepEqual(h.letters.get(family.letterFileId).data,Buffer.from(prepared.letterPdfBase64,'base64'));
 const changed=harness(),preview=await changed.call('/v6/staff/offers/preview',{applicationIds:['app-synthetic'],schedule});
 const request={...payload,packetHash:preview.packetHash};assert.equal((await changed.call('/v6/staff/offers/issue',{...request,letterOptions:{meetingConfirmed:true}})).status,409);assert.equal(changed.outbox.length,0);
 // A different valid PNG, not a corrupted byte sequence, changes the exact reviewed PDF.
 const replacement=readFileSync(new URL('./fixtures/synthetic-principal-signature-alt.png',import.meta.url));
 changed.env.OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64=replacement.toString('base64');changed.env.OFFER_PRINCIPAL_SIGNATURE_SHA256=pdfHash(replacement);
 assert.equal((await changed.call('/v6/staff/offers/issue',request)).status,409);assert.equal(changed.outbox.length,0);
});

test('reviewed and queued family openings use only selected structured first names',async()=>{
 for(const count of [1,2,3]){
  const h=harness(),names=['Mary Rose','Anne-Marie','Zoë'];
  for(const [i,name] of names.entries()){
   const app=application();app.id=`app-name-${i}`;app.values.student_first=name;app.values.student_middle='Middle';h.apps.set(app.id,app);
  }
  const before=structuredClone([...h.apps]);
  const {prepared,result}=await h.issue(names.slice(0,count).map((_,i)=>`app-name-${i}`));
  assert.equal(result.httpStatus,200);
  const opening=`Congratulations! We are delighted to offer ${count===1?'Mary Rose':count===2?'Mary Rose and Anne-Marie':'Mary Rose, Anne-Marie and Zoë'} ${count===1?'a provisional place at Rosewood College for Foundation in 2027.':'provisional places at Rosewood College:'}`;
  const preview=prepared.messages.find(m=>m.primary),queued=h.outbox.find(m=>m.payload.tags?.message_type==='offer_family_invitation').payload;
  for(const email of [preview,queued]){
   assert.ok(email.text.includes(opening));assert.ok(email.html.includes(`<p>${opening}</p>`));
   assert.doesNotMatch(email.text,/Avery/);
   if(count<3)assert.doesNotMatch(email.text,/Zoë/);
   if(count>1)for(const name of names.slice(0,count))assert.ok(email.text.includes(`${name} Middle Synthetic — Foundation, 2027`));
  }
  assert.deepEqual([...h.apps],before);
  assert.deepEqual([...h.families.values()][0].accounts[0].children.map(c=>c.studentFirstName),names.slice(0,count));
 }
 const h=harness(),prepared=await h.call('/v6/staff/offers/preview',{applicationIds:['app-synthetic'],schedule});
 h.apps.get('app-synthetic').values.student_first='Corrected';
 const result=await h.call('/v6/staff/offers/issue',{applicationIds:['app-synthetic'],schedule,letterDate:prepared.letterDate,packetHash:prepared.packetHash,guardianPlanReviewed:true,confirmation:'Send reviewed family offer',operationId:'synthetic-operation-12345'});
 assert.equal(result.error,'OFFER_REVIEW_REQUIRED');assert.equal(h.outbox.length,0);assert.equal(h.offers.size,0);
});

test('both staff surfaces prepare acceptance without financial-choice inputs',()=>{
 const root=new URL('../../../../pages/',import.meta.url);
 for(const [file,attribute] of [['rosewood-enrolment-offers-admin-v1.html','id'],['rosewood-enrolment-admin-v6.html','data-offer-id']]){
  const html=readFileSync(new URL(file,root),'utf8');for(const control of ['letter-date','letter-meeting-confirmed','letter-gathering'])assert.ok(html.includes(`${attribute}="${control}"`),`${file}: ${control}`);
  for(const control of ['fee-schedule','bond','bond-amount','credit','payment-days','refund-days','accept-by','conditions-by'])assert.equal(html.includes(`${attribute}="${control}"`),false);
  assert.match(html,/Bond and payment options will be chosen separately/);
 }
});

test('backdating a letter cannot restore a gathering invitation after its date',async()=>{
 const h=harness(),now=Date.parse('2027-01-17T01:00:00Z');h.setTime(now);for(const session of h.sessions.values()){session.expiresAt=now+600000;session.absoluteExpiresAt=now+600000;}
 const result=await h.call('/v6/staff/offers/preview',{applicationIds:['app-synthetic'],letterDate:'2026-11-08',letterOptions:{includeGathering:true},schedule});
 assert.equal(result.status,422);assert.equal(result.error,'GATHERING_DATE_PASSED');assert.equal(h.letters.size,0);assert.equal(h.outbox.length,0);
});
