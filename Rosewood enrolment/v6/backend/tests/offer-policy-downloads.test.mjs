import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {validatePolicyDownload,verifyPolicyDownloads} from '../offer-policy-assets.mjs';

test('download release verification rejects altered bytes, source versions, formats and paths',()=>{
 const policy={sourceSha256:'a'.repeat(64),sourceDownloads:{sourceSha256:'a'.repeat(64)}};
 const fixtures={pdf:Buffer.from('%PDF-1.7\nfixture'),docx:Buffer.from('504b030466697874757265','hex')};
 for(const [format,bytes] of Object.entries(fixtures)){
  const sha256=createHash('sha256').update(bytes).digest('hex');
  policy.sourceDownloads[format]={assetPath:`Files/Policies/offer-snapshots/policy-${sha256}.${format}`,sha256,bytes:bytes.length};
  assert.equal(validatePolicyDownload(policy,format,bytes),bytes);
  assert.throws(()=>validatePolicyDownload(policy,format,Buffer.concat([bytes,Buffer.from('changed')])));
  const wrongMagic=Buffer.from(bytes);wrongMagic[0]=0;
  const mutated=structuredClone(policy);mutated.sourceDownloads[format].sha256=createHash('sha256').update(wrongMagic).digest('hex');mutated.sourceDownloads[format].assetPath=`Files/Policies/offer-snapshots/policy-${mutated.sourceDownloads[format].sha256}.${format}`;
  assert.throws(()=>validatePolicyDownload(mutated,format,wrongMagic));
 }
 for(const mutate of [p=>p.sourceDownloads.sourceSha256='b'.repeat(64),p=>p.sourceDownloads.pdf.assetPath='../../private.pdf',p=>p.sourceDownloads.pdf.bytes=0,p=>p.sourceDownloads.pdf.assetPath=p.sourceDownloads.docx.assetPath]){
  const bad=structuredClone(policy);mutate(bad);assert.throws(()=>validatePolicyDownload(bad,'pdf',fixtures.pdf));
 }
 assert.doesNotThrow(()=>verifyPolicyDownloads({}));
 assert.throws(()=>verifyPolicyDownloads(policy),/ENOENT/,'missing published files stop the build');
});
