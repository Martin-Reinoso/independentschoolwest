import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,PDFName} from 'pdf-lib';
import {readFileSync} from 'node:fs';
import {letterContent,renderOfferLetter} from '../offer-letter.mjs';
import {principalSignatureFromConfig} from '../offer-letter-assets.mjs';
import {pdfHash} from '../offer-pdf.mjs';
import {harness,drawing,schedule} from './helpers/offer-harness.mjs';

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

test('both staff surfaces expose the shared renderer controls and current family bond options',()=>{
 const root=new URL('../../../../pages/',import.meta.url);
 for(const [file,attribute] of [['rosewood-enrolment-offers-admin-v1.html','id'],['rosewood-enrolment-admin-v6.html','data-offer-id']]){
  const html=readFileSync(new URL(file,root),'utf8');for(const control of ['letter-date','letter-meeting-confirmed','letter-gathering','bond-amount'])assert.ok(html.includes(`${attribute}="${control}"`),`${file}: ${control}`);
  assert.match(html,/\$20,000 — 5% tuition reduction for every child/);assert.doesNotMatch(html,/\$10,000 per child with the approved discount/);
 }
});

test('backdating a letter cannot restore a gathering invitation after its date',async()=>{
 const h=harness(),now=Date.parse('2027-01-17T01:00:00Z');h.setTime(now);for(const session of h.sessions.values()){session.expiresAt=now+600000;session.absoluteExpiresAt=now+600000;}
 const result=await h.call('/v6/staff/offers/preview',{applicationIds:['app-synthetic'],letterDate:'2026-11-08',letterOptions:{includeGathering:true},schedule:{...schedule,acceptBy:'2027-02-01T00:00:00Z',conditionsBy:'2027-03-01T00:00:00Z'}});
 assert.equal(result.status,422);assert.equal(result.error,'GATHERING_DATE_PASSED');assert.equal(h.letters.size,0);assert.equal(h.outbox.length,0);
});
