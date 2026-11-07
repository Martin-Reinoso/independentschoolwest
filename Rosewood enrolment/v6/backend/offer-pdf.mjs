import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PDFDocument, rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const OFFER_PDF_MAX_BYTES = 2_000_000;
export const pdfHash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const failure = (code, message) => Object.assign(new Error(message), {status:422, code});
const fonts = ['Regular','Bold'].map(weight => readFileSync(new URL(`./pdf-assets/NotoSans-${weight}.ttf`, import.meta.url)));
export async function embedOfferFonts(pdf,{serif=false}={}){
  pdf.registerFontkit(fontkit);
  const [regular,bold]=await Promise.all(fonts.map(data=>pdf.embedFont(data,{subset:true})));
  return {regular,bold,...(serif?{serif:await pdf.embedFont(readFileSync(new URL('./pdf-assets/NotoSerif-Regular.ttf',import.meta.url)),{subset:true})}:{})};
}
const colour = {navy:rgb(.09,.24,.32), grey:rgb(.32,.35,.38), rule:rgb(.72,.62,.49)};

// Bounds are checked before PNG decoding, including decompressed image dimensions.
export function checkSignaturePng(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length<100 || bytes.length>500_000 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii',12,16)!=='IHDR') throw failure('INVALID_SIGNATURE','Provide a valid signature image.');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if (!width || !height || width>4096 || height>2048 || width*height>4_000_000) throw failure('INVALID_SIGNATURE','The signature image dimensions are invalid.');
}
export async function validateOfferSignature(bytes) {
  checkSignaturePng(bytes);
  try { const pdf=await PDFDocument.create(); await pdf.embedPng(bytes); }
  catch { throw failure('INVALID_SIGNATURE','Provide a valid signature image.'); }
}

// Shared, bounded A4 layout. Fonts are embedded locally; no runtime font/network fetch.
export async function createOfferPdf({title,timestamp,subtitle='Provisional enrolment acceptance'}) {
  const pdf=await PDFDocument.create();
  const {regular,bold}=await embedOfferFonts(pdf);
  const supported=new Set(regular.getCharacterSet());
  const when=new Date(timestamp); if(!Number.isFinite(when.getTime()))throw failure('PDF_DATE_REQUIRED','The document date is invalid.');
  pdf.setTitle(title);pdf.setAuthor('Rosewood College');pdf.setCreator('Rosewood College');pdf.setProducer('Rosewood College');pdf.setCreationDate(when);pdf.setModificationDate(when);
  const left=50,right=545.28,width=right-left,bottom=61; let page,y;
  function clean(value) {
    const text=String(value??'').normalize('NFC').replace(/\r\n?/g,'\n').replace(/\t/g,'    ');
    for(const char of text)if(char!=='\n'&&!supported.has(char.codePointAt(0)))throw failure('PDF_FONT_REQUIRED','This document contains characters requiring an additional supported font. Contact the College before signing or issuing.');
    return text;
  }
  function newPage() {
    if(pdf.getPageCount()>=120)throw failure('PDF_LAYOUT_LIMIT','This document exceeds the page limit.');
    page=pdf.addPage([595.28,841.89]);y=742;
    page.drawText('ROSEWOOD COLLEGE',{x:left,y:796,size:15,font:bold,color:colour.navy});
    page.drawText(subtitle,{x:left,y:779,size:8.5,font:regular,color:colour.grey});
    page.drawLine({start:{x:left,y:770},end:{x:right,y:770},color:colour.rule,thickness:.8});
  }
  function ensure(height){if(!page||y-height<bottom)newPage();}
  const measured=new Map();
  function measure(value,size,font){const key=`${font===bold?'b':'r'}:${size}:${value}`;if(!measured.has(key))measured.set(key,font.widthOfTextAtSize(value,size));return measured.get(key);}
  function lines(value,size,font) {
    const result=[],space=measure(' ',size,font);
    for(const paragraph of clean(value).split('\n')) {
      let line='',lineWidth=0;
      for(const word of paragraph.split(/\s+/).filter(Boolean)) {
        const wordWidth=measure(word,size,font);
        if(line && lineWidth+space+wordWidth>width){result.push(line);line='';lineWidth=0;}
        // Long unbroken names, URLs and hashes wrap without being lost or clipped.
        if(wordWidth>width){
          if(line){result.push(line);line='';lineWidth=0;}
          for(const char of word){const charWidth=measure(char,size,font);if(lineWidth+charWidth>width){result.push(line);line='';lineWidth=0;}line+=char;lineWidth+=charWidth;}
        }else {lineWidth+=wordWidth+(line?space:0);line=line?`${line} ${word}`:word;}
      }
      result.push(line);
    }
    return result;
  }
  function paragraph(value,{size=9.5,strong=false,gap=8,keepNext=0,color=colour.grey}={}) {
    const font=strong?bold:regular,rows=lines(value,size,font),leading=size*1.45;
    ensure(Math.min(rows.length,2)*leading+gap+keepNext);
    for(const row of rows){ensure(leading);if(row)page.drawText(row,{x:left,y,size,font,color});y-=leading;}
    y-=gap;
  }
  function heading(value,{size=13}={}){paragraph(value,{size,strong:true,gap:10,keepNext:32,color:colour.navy});}
  async function signature(bytes){checkSignaturePng(bytes);const image=await pdf.embedPng(bytes);const scale=Math.min(250/image.width,65/image.height);ensure(85);page.drawImage(image,{x:left,y:y-image.height*scale,width:image.width*scale,height:image.height*scale});y-=image.height*scale+16;}
  async function signatureEntry(name,bytes,caption){
    const nameHeight=lines(name,11,bold).length*11*1.45+8,captionHeight=lines(caption,8.5,regular).length*8.5*1.45+8;
    ensure(nameHeight+(bytes?85:0)+captionHeight+5);
    paragraph(name,{strong:true,size:11});if(bytes)await signature(bytes);paragraph(caption,{size:8.5});
  }
  async function figure(bytes,caption){
    const image=await pdf.embedPng(bytes),scale=Math.min(width/image.width,360/image.height);
    const height=image.height*scale,captionHeight=lines(caption,8.5,regular).length*8.5*1.45+8;
    ensure(height+captionHeight+20);
    page.drawImage(image,{x:left,y:y-height,width:image.width*scale,height});
    y-=height+12;paragraph(caption,{size:8.5});
  }
  async function finish(){
    const total=pdf.getPageCount();
    for(const [index,p] of pdf.getPages().entries()){
      p.drawLine({start:{x:left,y:45},end:{x:right,y:45},color:colour.rule,thickness:.5});
      p.drawText('Families for Education Ltd  |  Rosewood College',{x:left,y:30,size:7,font:regular,color:colour.grey});
      const label=`${index+1} / ${total}`;p.drawText(label,{x:right-regular.widthOfTextAtSize(label,7),y:30,size:7,font:regular,color:colour.grey});
    }
    const bytes=Buffer.from(await pdf.save({useObjectStreams:true}));
    if(bytes.length>OFFER_PDF_MAX_BYTES)throw failure('PDF_SIZE_LIMIT','The signed record exceeds the document size limit.');
    return {bytes,sha256:pdfHash(bytes),contentType:'application/pdf',pages:total};
  }
  return {paragraph,heading,signature,signatureEntry,figure,newPage,ensure,finish};
}
