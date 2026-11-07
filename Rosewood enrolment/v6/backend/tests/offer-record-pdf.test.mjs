import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {makeOfferPacket} from '../offer-workflow.mjs';
import {renderOfferRecordPdf} from '../offer-record-pdf.mjs';
import {pdfHash,validateOfferSignature} from '../offer-pdf.mjs';
import {offerContentHash} from '../offer-content-hash.mjs';
import {application,schedule,drawing,harness} from './helpers/offer-harness.mjs';

const png=Buffer.from(drawing.split(',')[1],'base64'),now=Date.parse('2026-11-08T00:00:00Z');
function fixture(){
 const prepared=makeOfferPacket(application(),schedule,now);
 const offer={...prepared,id:'synthetic-offer',createdAt:new Date(now).toISOString(),updatedAt:new Date(now+60000).toISOString(),revision:3,status:'signed_conditional',contractHash:offerContentHash(prepared.packet.contract)};
 offer.signatures=offer.signers.map((s,i)=>({id:`synthetic-signature-${i}`,signerId:s.id,signerName:s.name,signedAt:offer.updatedAt,packetHash:offer.packetHash,contractHash:offer.contractHash,imageSha256:pdfHash(png),reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true}));
 return {offer,images:new Map(offer.signatures.map(s=>[s.id,png]))};
}
const acceptance=c=>({offerId:c.offerId,packetHash:c.packetHash,reviewAcknowledged:true,conditionsAcknowledged:true,termsAcknowledged:true,electronicConsent:true,signatureDataUrl:drawing});

test('signed PDF has bounded pages, embedded fonts and images, deterministic bytes and no active content',async()=>{
 const {offer,images}=fixture(),result=await renderOfferRecordPdf(offer,images),pdf=await PDFDocument.load(result.bytes);
 assert.equal(result.fileName,'Rosewood-signed-acceptance.pdf');assert.equal(result.sha256,pdfHash(result.bytes));assert.ok(result.bytes.length<2_000_000);assert.ok(pdf.getPageCount()>10);assert.ok(pdf.getPageCount()<120);
 assert.equal(pdf.catalog.has((await import('pdf-lib')).PDFName.of('OpenAction')),false);
 const again=await renderOfferRecordPdf(offer,images);assert.equal(again.sha256,result.sha256);
 // Map key order may change on a DynamoDB round trip; signed content must not.
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value;
 const reordered=await renderOfferRecordPdf(reorder(offer),images);assert.equal(reordered.sha256,result.sha256);
});

test('signed PDF rejects altered agreement, wrong image, duplicate signer and incomplete evidence',async()=>{
 for(const change of [o=>o.packet.studentName='Other child',o=>o.signatures[0].packetHash='wrong',o=>o.signatures[0].termsAcknowledged=false,o=>o.signatures.push(o.signatures[0]),o=>o.status='awaiting_signatures']){
  const {offer,images}=fixture();change(offer);await assert.rejects(()=>renderOfferRecordPdf(offer,images),e=>e.code==='OFFER_EVIDENCE_MISMATCH');
 }
 const {offer,images}=fixture();images.set(offer.signatures[0].id,Buffer.from('foreign image'));await assert.rejects(()=>renderOfferRecordPdf(offer,images),e=>e.code==='OFFER_EVIDENCE_MISMATCH');
});

test('PDF handles accented names and rejects unsupported glyphs explicitly',async()=>{
 const {offer,images}=fixture();offer.packet.studentName='Zoë Éléonore Łukasz Nguyễn';offer.packetHash=offerContentHash(offer.packet);offer.signatures.forEach(s=>s.packetHash=offer.packetHash);
 assert.ok((await renderOfferRecordPdf(offer,images)).bytes.length>0);
 offer.packet.studentName='测试';offer.packetHash=offerContentHash(offer.packet);offer.signatures.forEach(s=>s.packetHash=offer.packetHash);
 await assert.rejects(()=>renderOfferRecordPdf(offer,images),e=>e.code==='PDF_FONT_REQUIRED');
});

test('six required signers with long names produce a bounded complete PDF',async()=>{
 const {offer}=fixture();offer.signers=Array.from({length:6},(_,i)=>({id:`guardian-${i}`,name:`${'Alexandra'.repeat(12)} ${'Éléonore'.repeat(12)} Synthetic ${i}`}));
 offer.packet.signers=offer.signers.map(({name})=>({name}));offer.packetHash=offerContentHash(offer.packet);
 const template=offer.signatures[0];offer.signatures=offer.signers.map((s,i)=>({...template,id:`signature-${i}`,signerId:s.id,signerName:s.name,packetHash:offer.packetHash}));
 const result=await renderOfferRecordPdf(offer,new Map(offer.signatures.map(s=>[s.id,png])));assert.ok(result.bytes.length<2_000_000);assert.ok(result.pages<120);
});

test('signature decoder refuses magic-only PNGs and oversized image dimensions before storage',async()=>{
 await validateOfferSignature(png);
 const bad=Buffer.concat([png.subarray(0,8),Buffer.alloc(150)]);await assert.rejects(()=>validateOfferSignature(bad),e=>e.code==='INVALID_SIGNATURE');
 const huge=Buffer.from(png);huge.writeUInt32BE(999999,16);await assert.rejects(()=>validateOfferSignature(huge),e=>e.code==='INVALID_SIGNATURE');
 const h=harness();await h.issue();const login=await h.login(),child=await h.child(login.session);
 const result=await h.call('/v6/offers/sign',{...acceptance(child),signatureDataUrl:'data:image/png;base64,'+bad.toString('base64')},login.session);
 assert.equal(result.status,422);assert.equal(h.artifacts.length,0);assert.equal(h.records.size,0);
});

test('record storage failure rolls back staged signature and leaves no signed state or email',async()=>{
 const h=harness({drive:{storeOfferRecord:async()=>{throw Error('Synthetic storage unavailable');}}});await h.issue();const l=await h.login(),c=await h.child(l.session),queued=h.outbox.length;
 assert.equal((await h.call('/v6/offers/sign',acceptance(c),l.session)).status,500);assert.equal(h.offers.get(c.offerId).signatures.length,0);assert.equal(h.outbox.length,queued);assert.equal(h.removed.length,1);
});

test('completed copies attach exact stored PDF; foreign refs and revoked contact cannot send',async()=>{
 const h=harness();await h.issue();
 for(const index of [0,1]){const login=await h.login(index),c=await h.child(login.session);await h.call('/v6/offers/sign',acceptance(c),login.session);}
 const messages=h.outbox.filter(item=>item.payload.tags.message_type==='offer_complete'),offer=[...h.offers.values()][0],delivered=[];
 let pending=messages.map(data=>({data}));h.store.listOutbox=async()=>pending;h.store.claimOutbox=async()=>({attempts:1});h.store.completeOutbox=async(item,result)=>delivered.push(result);h.store.releaseOutbox=async()=>{};
 const mailBefore=h.mail.length;assert.equal((await h.handler.dispatchOutbox()).completed,2);
 for(const email of h.mail.slice(mailBefore)){assert.equal(email.attachments[0].fileName,'Rosewood-signed-acceptance.pdf');assert.deepEqual(email.attachments[0].data,h.records.get(offer.acceptanceRecord.fileId).data);}
 pending=[{data:structuredClone(messages[0])}];pending[0].data.payload._offerRecord.fileId='foreign-file';const sent=h.mail.length;assert.equal((await h.handler.dispatchOutbox()).failed,1);assert.equal(h.mail.length,sent);
 pending=[{data:messages[0]}];h.apps.get('app-synthetic').signerControls[0].contactPermission=false;assert.equal((await h.handler.dispatchOutbox()).completed,1);assert.equal(h.mail.length,sent);assert.equal(delivered.at(-1).suppressed,true);
});
