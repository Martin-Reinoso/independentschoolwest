import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const failure=()=>Object.assign(new Error('A frozen policy figure is unavailable or has changed.'),{status:503,code:'POLICY_FIGURE_UNAVAILABLE'});

// Only immutable local files may be embedded. Never fetch a URL from an agreement.
export function validatePolicyFigure(figure,bytes){
 if(!figure||!/^[a-f0-9]{64}$/.test(figure.sha256)||!/^Files\/Policies\/offer-snapshots\/[a-z0-9-]+-[a-f0-9]{64}\.png$/.test(figure.assetPath)||!figure.assetPath.endsWith('-'+figure.sha256+'.png')||!Buffer.isBuffer(bytes)||bytes.length<24||bytes.length>1_000_000||figure.bytes!==bytes.length)throw failure();
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||![figure.width,figure.height].every(n=>Number.isInteger(n)&&n>0&&n<=4096)||figure.width*figure.height>8_000_000||bytes.readUInt32BE(16)!==figure.width||bytes.readUInt32BE(20)!==figure.height||createHash('sha256').update(bytes).digest('hex')!==figure.sha256)throw failure();
 return bytes;
}

export function policyFigureBytes(figure){
 // Validate the path before constructing any filesystem URL.
 if(!figure||!/^[a-f0-9]{64}$/.test(figure.sha256)||!/^Files\/Policies\/offer-snapshots\/[a-z0-9-]+-[a-f0-9]{64}\.png$/.test(figure.assetPath)||!figure.assetPath.endsWith('-'+figure.sha256+'.png'))throw failure();
 const packaged=new URL('./policy-assets/'+figure.sha256+'.png',import.meta.url);
 try{return validatePolicyFigure(figure,readFileSync(existsSync(packaged)?packaged:new URL('../../../'+figure.assetPath,import.meta.url)));}
 catch{throw failure();}
}
