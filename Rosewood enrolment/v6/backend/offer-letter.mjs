import {PDFDocument,rgb} from 'pdf-lib';
import {OFFER_CONTRACT} from './offer-contract.mjs';
import {embedOfferFonts,validateOfferSignature,pdfHash,OFFER_PDF_MAX_BYTES} from './offer-pdf.mjs';
import {offerLetterLogo} from './offer-letter-assets.mjs';

export const OFFER_LETTER_VERSION='rosewood-provisional-offer-2026.3-review';
const fail=(code,message)=>Object.assign(new Error(message),{status:422,code});
export function letterContent({date,parents,children,meetingConfirmed=false,includeGathering=false,testCopy=false}){
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw fail('LETTER_DATE_REQUIRED','Select a valid letter date.');
 if(!Array.isArray(parents)||!parents.length||parents.length>8||parents.some(p=>typeof p!=='string'||!p.trim()||p.length>320)||!Array.isArray(children)||!children.length||children.length>8||children.some(c=>typeof c.studentName!=='string'||!c.studentName.trim()||c.studentName.length>320||typeof c.entryLevel!=='string'||!c.entryLevel.trim()||c.entryLevel.length>60||c.entryYear!=='2027'))throw fail('LETTER_DETAILS_REQUIRED','Review the family names and offered places.');
 if(typeof meetingConfirmed!=='boolean'||typeof includeGathering!=='boolean'||typeof testCopy!=='boolean')throw fail('LETTER_OPTIONS_REQUIRED','Review the letter options.');
 if(includeGathering && date>='2027-01-17')throw fail('GATHERING_DATE_PASSED','The January gathering paragraph is no longer current. Remove it before preparing this letter.');
 const plural=children.length>1,possessive=plural?'children’s':'child’s';
 const letter={version:OFFER_LETTER_VERSION,date,title:'Provisional offer of enrolment',testCopy,
  meetingConfirmed,includeGathering,greeting:`Dear ${parents.join(' and ')},`,
  opening:meetingConfirmed?`Thank you for meeting with me. It was a pleasure to get to know your family and discuss your hopes for your ${possessive} education.`:`Thank you for your interest in Rosewood College and for sharing your hopes for your ${possessive} education.`,
  offerSentence:`We are pleased to make a provisional offer of ${plural?'places':'a place'} at Rosewood College for:`,
  children:children.map(({studentName,entryLevel,entryYear})=>({studentName,entryLevel,entryYear})),
  noticeHeading:`About your provisional ${plural?'offers':'offer'}`,notice:OFFER_CONTRACT.introduction.text,
  acceptanceHeading:`Accepting your ${plural?'offers':'offer'}`,
  acceptance:`Please use the private portal link in your email to review the terms and digitally accept the provisional offer for ${plural?'each child':'your child'}. Acceptance is complete once all required parents or guardians have signed.`,
  gatheringHeading:'January family gathering',gathering:includeGathering?'We warmly invite your family to join our Founding 2027 Families on Sunday 17 January 2027, to meet other families and spend time getting to know one another. We will share further details and attendance arrangements once finalised.':'',
  closing:'Thank you for your confidence in our vision. We would be honoured to welcome your family as founding members of Rosewood and to shape our school community together.',
  salutation:'Warm regards,',principalName:'Dr Anne-Marie Irwin',principalRole:'Founding Principal',schoolName:'Rosewood College'};
 letter.paragraphs=[letter.greeting,letter.opening,letter.offerSentence,...letter.children.map(c=>`${c.studentName} - ${c.entryLevel}, ${c.entryYear}`),letter.noticeHeading,letter.notice,letter.acceptanceHeading,letter.acceptance,...(letter.gathering?[letter.gatheringHeading,letter.gathering]:[]),letter.closing,letter.salutation,`${letter.principalName}\n${letter.principalRole}\n${letter.schoolName}`];
 return letter;
}

export async function renderOfferLetter(letter,{signaturePng}={}){
 if(!signaturePng)throw Object.assign(new Error('The principal signature is required before preparing an offer.'),{status:503,code:'LETTER_SIGNATURE_REQUIRED'});
 await validateOfferSignature(signaturePng);
 const pdf=await PDFDocument.create(),{regular,bold,serif}=await embedOfferFonts(pdf,{serif:true}),logo=await pdf.embedPng(offerLetterLogo()),signature=await pdf.embedPng(signaturePng);
 const timestamp=new Date(`${letter.date}T00:00:00Z`);
 pdf.setTitle('Rosewood College - provisional offer of enrolment');pdf.setAuthor('Rosewood College');pdf.setCreator('Rosewood College');pdf.setProducer('Rosewood College');pdf.setCreationDate(timestamp);pdf.setModificationDate(timestamp);
 const navy=rgb(.094,.169,.271),clay=rgb(.682,.286,.204),muted=rgb(.40,.44,.48),line=rgb(.847,.847,.827),pale=rgb(.945,.965,.973);
 const left=48,right=547.28,width=right-left,bodySize=10.1,leading=13.8,bottom=65;let page,y;
 const supported=new Set(regular.getCharacterSet()),measured=new Map();
 function clean(value){const text=String(value??'').normalize('NFC');for(const c of text)if(c!=='\n'&&!supported.has(c.codePointAt(0)))throw fail('LETTER_FONT_REQUIRED','The letter needs an additional supported font. Contact the College before issuing.');return text;}
 function measure(text,font,size){const key=`${font.name}:${size}:${text}`;if(!measured.has(key))measured.set(key,font.widthOfTextAtSize(text,size));return measured.get(key);}
 function wrap(text,{font=regular,size=bodySize,max=width}={}){
  const rows=[],space=measure(' ',font,size);
  for(const part of clean(text).split('\n')){let row='',used=0;for(const word of part.split(/\s+/).filter(Boolean)){const length=measure(word,font,size);if(row&&used+space+length>max){rows.push(row);row='';used=0;}if(length>max){if(row){rows.push(row);row='';used=0;}for(const c of word){const n=measure(c,font,size);if(used+n>max){rows.push(row);row='';used=0;}row+=c;used+=n;}}else{used+=length+(row?space:0);row=row?`${row} ${word}`:word;}}rows.push(row);}return rows;
 }
 function addPage(){
  if(pdf.getPageCount()>=8)throw fail('LETTER_LAYOUT_LIMIT','The family letter is too long. Review the names before issuing.');
  page=pdf.addPage([595.28,841.89]);
  page.drawRectangle({x:left,y:811,width:width*.73,height:3.5,color:navy});page.drawRectangle({x:left+width*.73,y:811,width:width*.27,height:3.5,color:clay});
  if(pdf.getPageCount()===1){
   page.drawImage(logo,{x:42,y:719,width:72,height:90});page.drawText('ROSEWOOD COLLEGE',{x:125,y:766,size:23,font:serif,color:navy});page.drawText('Office of the Founding Principal',{x:126,y:746,size:9,font:regular,color:muted});
   page.drawLine({start:{x:left,y:710},end:{x:right,y:710},color:line,thickness:.6});
   page.drawText('FOUNDING FAMILIES  |  2027',{x:left,y:691,size:8,font:bold,color:clay});const dateText=new Intl.DateTimeFormat('en-AU',{dateStyle:'long',timeZone:'UTC'}).format(timestamp);page.drawText(dateText,{x:right-measure(dateText,regular,9),y:691,size:9,font:regular,color:muted});y=660;
  }else{page.drawText('ROSEWOOD COLLEGE',{x:left,y:783,size:17,font:serif,color:navy});page.drawText('Provisional offer of enrolment - continued',{x:left,y:764,size:9,font:regular,color:muted});page.drawLine({start:{x:left,y:752},end:{x:right,y:752},color:line,thickness:.6});y=730;}
 }
 function ensure(height){if(!page||y-height<bottom)addPage();}
 function para(text,{font=regular,size=bodySize,gap=9,keepNext=0}={}){
  const rows=wrap(text,{font,size}),step=size===bodySize?leading:size*1.35;ensure(Math.min(rows.length,2)*step+gap+keepNext);
  for(const row of rows){ensure(step);if(row)page.drawText(row,{x:left,y,size,font,color:navy});y-=step;}y-=gap;
 }
 function heading(text){para(text,{font:bold,size:10.4,gap:4,keepNext:leading*2+9});}
 function tableHeader(){page.drawRectangle({x:left,y:y-20,width,height:20,color:pale});['STUDENT','YEAR LEVEL','ENTRY YEAR'].forEach((s,i)=>page.drawText(s,{x:left+[11,width*.48+11,width*.79+11][i],y:y-13,size:7.6,font:bold,color:muted}));y-=20;}
 function childTable(){
  const starts=[0,width*.48,width*.79],colWidths=[width*.48,width*.31,width*.21];
  const rows=letter.children.map(c=>[c.studentName,c.entryLevel,c.entryYear].map((s,i)=>wrap(s,{max:colWidths[i]-22})));
  ensure(20+Math.max(...rows[0].map(a=>a.length))*leading+10);tableHeader();
  for(const row of rows){const height=Math.max(...row.map(a=>a.length))*leading+10;if(y-height<bottom){addPage();tableHeader();}page.drawRectangle({x:left,y:y-height,width,height,color:pale});row.forEach((cell,i)=>cell.forEach((text,j)=>page.drawText(text,{x:left+starts[i]+11,y:y-15-j*leading,font:regular,size:bodySize,color:navy})));y-=height;}y-=15;
 }
 addPage();para(letter.title,{font:serif,size:21,gap:15});para(letter.greeting);para(letter.opening);para(letter.offerSentence,{gap:8});childTable();
 heading(letter.noticeHeading);para(letter.notice);heading(letter.acceptanceHeading);para(letter.acceptance);
 if(letter.gathering){heading(letter.gatheringHeading);para(letter.gathering);}
 para(letter.closing);
 ensure(90);para(letter.salutation,{gap:2});const scale=Math.min(181/signature.width,25/signature.height);page.drawImage(signature,{x:left,y:y-25,width:signature.width*scale,height:signature.height*scale});y-=34;
 para(letter.principalName,{font:bold,gap:1});para(letter.principalRole,{size:9,gap:0});para(letter.schoolName,{size:9,gap:0});
 for(const [index,p] of pdf.getPages().entries()){
  p.drawLine({start:{x:left,y:53},end:{x:right,y:53},color:line,thickness:.6});p.drawText('Families for Education Ltd',{x:left,y:38,size:7.5,font:regular,color:muted});const contact='enrolment@ffe.org.au  |  ffe.org.au';p.drawText(contact,{x:right-measure(contact,regular,7.5),y:38,size:7.5,font:regular,color:muted});
  const foot=letter.testCopy?'TEST COPY - FICTIONAL FAMILY - NOT ISSUED TO A FAMILY':`${index+1} / ${pdf.getPageCount()}`;p.drawText(foot,{x:(595.28-measure(foot,bold,7))/2,y:22,size:7,font:bold,color:letter.testCopy?clay:muted});
 }
 const bytes=Buffer.from(await pdf.save({useObjectStreams:true}));if(bytes.length>OFFER_PDF_MAX_BYTES)throw fail('LETTER_SIZE_LIMIT','The letter exceeds the attachment size limit.');
 return {bytes,sha256:pdfHash(bytes),fileName:'Rosewood-offer.pdf',pages:pdf.getPageCount()};
}
