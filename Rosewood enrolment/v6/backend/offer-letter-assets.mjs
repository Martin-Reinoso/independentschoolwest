import {existsSync,readFileSync} from 'node:fs';
import {checkSignaturePng,pdfHash} from './offer-pdf.mjs';

export const OFFER_LETTER_LOGO_SHA256='dd953904c7b919720a0fb381f2c75b8d8ded324fc46e79076cb6be454e2f3f9e';
const missing=()=>Object.assign(new Error('The principal signature is not configured and verified. Contact the College administrator before preparing an offer.'),{status:503,code:'LETTER_SIGNATURE_REQUIRED'});

// The image is held in the restricted application secret, never Git, a public URL,
// a browser configuration endpoint, or a generic deployment asset directory.
export function principalSignatureFromConfig(config){
 const encoded=config.OFFER_PRINCIPAL_SIGNATURE_PNG_BASE64,expected=config.OFFER_PRINCIPAL_SIGNATURE_SHA256;
 if(typeof encoded!=='string'||encoded.length>270000||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)||!/^[a-f0-9]{64}$/.test(expected||''))throw missing();
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length>200000||bytes.toString('base64')!==encoded||pdfHash(bytes)!==expected)throw missing();
 try{checkSignaturePng(bytes);}catch{throw missing();}
 return bytes;
}

let logo;
export function offerLetterLogo(){
 if(!logo){
  const packaged=new URL('./pdf-assets/rosewood-emblem.png',import.meta.url);
  logo=readFileSync(existsSync(packaged)?packaged:new URL('../../../img/rosewood-emblem-corrected-transparent.png',import.meta.url));
  if(pdfHash(logo)!==OFFER_LETTER_LOGO_SHA256){logo=undefined;throw new Error('The reviewed letter emblem has changed.');}
 }
 return logo;
}
