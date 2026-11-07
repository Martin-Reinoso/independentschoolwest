import {createOfferPdf, pdfHash} from './offer-pdf.mjs';
import {offerContentHash} from './offer-content-hash.mjs';
import {policyFigureBytes} from './offer-policy-assets.mjs';

export const OFFER_RECORD_FILE_NAME='Rosewood-signed-acceptance.pdf';
const date=value=>new Intl.DateTimeFormat('en-AU',{dateStyle:'long',timeStyle:'short',timeZone:'Australia/Melbourne'}).format(new Date(value));
const invalid=()=>Object.assign(new Error('The acceptance evidence does not match the frozen agreement.'),{status:409,code:'OFFER_EVIDENCE_MISMATCH'});

// Receives only the immutable offer and an explicitly keyed set of its signature images.
// No access links, email addresses, phone numbers, IPs or provider/storage IDs are printed.
export async function renderOfferRecordPdf(offer, signatureImages) {
  const p=offer.packet,s=p.schedule;
  if(!Array.isArray(offer.signers) || !offer.signers.length || offer.signers.length>6 || new Set(offer.signers.map(s=>s.id)).size!==offer.signers.length || offerContentHash(offer.signers.map(({name})=>({name})))!==offerContentHash(p.signers) || !['awaiting_signatures','signed_conditional'].includes(offer.status))throw invalid();
  if(!offer.signatures?.length || offerContentHash(p)!==offer.packetHash || offerContentHash(p.contract)!==offer.contractHash || new Set(offer.signatures.map(s=>s.signerId)).size!==offer.signatures.length)throw invalid();
  const complete=offer.signers.every(signer=>offer.signatures.some(s=>s.signerId===signer.id));
  if(complete!==(offer.status==='signed_conditional'))throw invalid();
  for(const signed of offer.signatures){
    const signer=offer.signers.find(s=>s.id===signed.signerId),image=signatureImages.get(signed.id);
    if(!signer || signer.name!==signed.signerName || signed.packetHash!==offer.packetHash || signed.contractHash!==offer.contractHash || !Buffer.isBuffer(image) || pdfHash(image)!==signed.imageSha256 || !['reviewAcknowledged','conditionsAcknowledged','termsAcknowledged','electronicConsent'].every(key=>signed[key]===true))throw invalid();
  }
  const doc=await createOfferPdf({title:'Rosewood College - signed provisional offer acceptance',timestamp:offer.updatedAt});
  doc.heading('Acceptance of provisional offer',{size:19});
  doc.paragraph(complete?'All required guardians have signed. Acceptance of this provisional offer is complete.':'Partly signed. Acceptance remains pending until all required guardians have signed.',{strong:true});
  doc.paragraph(p.contract.introduction.text);
  doc.heading('Student and offered place');
  doc.paragraph(`${p.studentName}\n${p.entryLevel} - ${p.entryYear}`,{strong:true,size:11});
  if(p.details?.student?.preferred)doc.paragraph(`Preferred name: ${p.details.student.preferred}`);
  for(const guardian of p.details?.guardians||[])doc.paragraph(`${[guardian.first,guardian.middle,guardian.last].filter(Boolean).join(' ')}${guardian.relationship?` - ${guardian.relationship}`:''}`);
  doc.paragraph(`Issued: ${date(offer.createdAt)}\nAccept by: ${date(s.acceptBy)}\nCommencement conditions deadline: ${date(s.conditionsBy)}`);
  doc.heading('Electronic signatures');
  doc.paragraph(p.contract.acceptanceDeclaration);
  doc.paragraph(p.contract.termsDeclaration);
  doc.paragraph(p.contract.declaration);
  for(const signer of offer.signers){
    const signed=offer.signatures.find(s=>s.signerId===signer.id);
    await doc.signatureEntry(signer.name,signed?signatureImages.get(signed.id):null,signed?`Signed electronically on ${date(signed.signedAt)}. Identity verified by email code. Accepted the offer and terms and consented to electronic signing.`:'Awaiting signature.');
  }
  doc.newPage();doc.heading('Offer schedule');
  doc.paragraph(s.feeSchedule);
  doc.paragraph(`Refundable family bond: $${Number(s.bondAmount||(s.bondOption==='higher'?10000:2000)).toLocaleString('en-AU')}. Existing bond credit: $${Number(s.bondCredit||0).toLocaleString('en-AU')}.\nPayment after confirmation: ${s.paymentDays} days. Refund period if commencement conditions fail: ${s.refundDays} days.`);
  doc.heading('Terms and Conditions of Enrolment',{size:17});
  doc.paragraph(p.contract.introduction.text);
  for(const section of p.contract.sections){doc.heading(`${section.id}. ${section.title}`);for(const text of section.paragraphs)doc.paragraph(text);}
  for(const policy of p.contract.policies){
    doc.newPage();doc.heading(policy.title,{size:17});doc.paragraph('Policy text included in the accepted agreement',{size:8.5});
    const lines=policy.text.split(/\r?\n/),figures=(policy.sourceStructure||[]).filter(block=>block[0]==='figure'),seen=new Set();
    let cursor=0;
    for(const [,start,count,index] of figures){
      if(!Number.isInteger(start)||start<cursor||start>lines.length||count!==0||!Number.isInteger(index)||seen.has(index)||!policy.sourceFigures?.[index])throw invalid();
      if(start>cursor)doc.paragraph(lines.slice(cursor,start).join('\n'),{size:9,gap:8});
      const figure=policy.sourceFigures[index];
      await doc.figure(policyFigureBytes(figure),figure.caption);
      seen.add(index);cursor=start;
    }
    if(seen.size!==(policy.sourceFigures||[]).length)throw invalid();
    if(cursor<lines.length)doc.paragraph(lines.slice(cursor).join('\n'),{size:9,gap:8});
  }
  doc.newPage();doc.heading('Record verification');
  doc.paragraph('This is a copy of the agreement and electronic signatures retained securely by the College. It does not confirm commencement or request payment.');
  doc.paragraph(`Agreement content SHA-256: ${offer.packetHash}\nContract SHA-256: ${offer.contractHash}\nRecord updated: ${date(offer.updatedAt)}`,{size:8});
  return {...await doc.finish(),fileName:OFFER_RECORD_FILE_NAME};
}
