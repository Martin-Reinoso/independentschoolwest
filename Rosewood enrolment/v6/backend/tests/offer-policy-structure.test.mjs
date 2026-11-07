import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {OFFER_CONTRACT} from '../offer-contract.mjs';
const sandbox={window:{}};
vm.runInNewContext(readFileSync(new URL('../../../../pages/rosewood-enrolment-offer-policy-reader.js',import.meta.url),'utf8'),sandbox);
const reader=sandbox.window.ROSEWOOD_OFFER_POLICY_READER;
const expected=[
 ['C.2.2.iif',22,'cb48e6159df4fe3737d6b0e7ee35615e9351900518f084d76750b4446307a264'],
 ['C.4.4.iih',17,'165cb55eb41103c4cbae01d826a11cad0042b033ee93e40f756290f6e0a29813'],
 ['C.4.2.iib',19,'7514e40dca2a780e5e3a8926f6d92294651615d4b7bf8dee88603cb1e85547e6'],
 ['C.4.1.iiw',18,'8d4f03471d80f0bbd2de82c279713ea1fbbe9a00d39df283c6710846342bb67b'],
 ['C.4.4.iia',17,'ef9bda8622509d226df085e0bf26858036190c8c66677e35938dd22174a9d6e1'],
 ['C.4.4.iic',18,'7ed6130deeaf44cb0a7951ca77410cf125aa297507f84115f3a3959bb62083c0'],
 ['C.4.1.iva',29,'1ed0a8990009d4c6f4c3fe44141f07537757d2ff8cb3b1a4e186936a3cde081d']
];
test('source-derived policy structure preserves every frozen line and numbered heading',()=>{
 for(const [index,[code,headings,textHash]] of expected.entries()){
  const policy=OFFER_CONTRACT.policies[index],lines=policy.text.split(/\r?\n/),covered=[];
  assert.equal(policy.sourceEvidenceCode,code);
  assert.match(policy.sourceSha256,/^[a-f0-9]{64}$/);
  assert.equal(crypto.createHash('sha256').update(policy.text.trim()).digest('hex'),textHash,'the verified source wording must not change');
  for(const [kind,start,count] of policy.sourceStructure)for(let i=start;i<start+count+(kind==='table'?1:0);i++)covered.push(i);
  assert.equal(new Set(covered).size,covered.length,'no duplicated source lines');
  assert.deepEqual(covered.sort((a,b)=>a-b),lines.flatMap((line,i)=>line.trim()?[i]:[]));
  const body=reader.renderPolicy(policy);
  assert.equal(body.contents.length,headings);
  assert.equal((body.html.match(/<h[34] /g)||[]).length,headings);
  assert.match(body.html,/<ul><li>/);
  assert.equal((body.html.match(/<ul>/g)||[]).length,(body.html.match(/<\/ul>/g)||[]).length);
  if(code!=='C.4.1.iiw')assert.ok(body.html.indexOf('<table')<body.html.indexOf('<h3'), 'document register stays before the policy body');
 }
 assert.ok(Buffer.byteLength(JSON.stringify(OFFER_CONTRACT))<200_000,'structured metadata must not duplicate the frozen prose in DynamoDB');
});
test('policy renderer escapes source text and retains legacy frozen text support',()=>{
 const result=reader.renderPolicy({text:'<script>bad()</script>\nItem & detail',sourceStructure:[['h',0,1,1,'1'],['p',1,1]]});
 assert.doesNotMatch(result.html,/<script>/);assert.match(result.html,/&lt;script&gt;/);assert.match(result.html,/Item &amp; detail/);
 assert.match(reader.renderPolicy({text:'Purpose\nLegacy policy'}).html,/Legacy policy/);
 assert.throws(()=>reader.renderPolicy({text:'one line',sourceStructure:[['p',2,1]]}),/Invalid/);
});

test('Student Code appendix retains the exact source map in place and rejects unsafe figure paths',()=>{
 const policy=structuredClone(OFFER_CONTRACT.policies[1]),figure=policy.sourceFigures[0];
 assert.equal(policy.sourceFigures.length,1);
 assert.equal(figure.sha256,'e273b2e02bd71657345e6cddc8131cf4bbc7a37b49f4e48cfd4a6f539d03870d');
 const body=reader.renderPolicy(policy);
 assert.equal((body.html.match(/<img /g)||[]).length,1);
 assert.ok(body.html.indexOf('<figure')>body.html.indexOf('Appendix A: Site Supervision Map'));
 assert.ok(body.html.includes('../'+figure.assetPath));assert.match(body.html,/width="2200" height="1600"/);
 figure.alt='<script>bad()</script>';assert.ok(reader.renderPolicy(policy).html.includes('&lt;script&gt;'));
 for(const unsafe of ['https://example.test/map.png','../../private.png','Files/Policies/offer-snapshots/map-'+ '0'.repeat(64)+'.png']){
  figure.assetPath=unsafe;assert.throws(()=>reader.renderPolicy(policy),/Invalid frozen policy figure/);
 }
});

test('policy downloads preserve older snapshots and pin both formats to the exact policy source',()=>{
 assert.equal(reader.renderDownloads(OFFER_CONTRACT.policies[0]),'');
 const policy={title:'Policy & details',sourceSha256:'a'.repeat(64),sourceDownloads:{sourceSha256:'a'.repeat(64)}};
 for(const format of ['pdf','docx'])policy.sourceDownloads[format]={assetPath:`Files/Policies/offer-snapshots/parent-code-${'b'.repeat(64)}.${format}`,sha256:'b'.repeat(64),bytes:100};
 const html=reader.renderDownloads(policy);
 assert.match(html,/target="_blank" rel="noopener noreferrer"/);assert.match(html,/download>Download policy Word document/);
 assert.match(html,/Policy &amp; details documents/);assert.equal((html.match(/<a /g)||[]).length,2);
 for(const mutate of [p=>p.sourceDownloads.sourceSha256='c'.repeat(64),p=>delete p.sourceDownloads.docx,p=>p.sourceDownloads.pdf.bytes=0,p=>p.sourceDownloads.pdf.assetPath='https://example.test/policy.pdf',p=>p.sourceDownloads.pdf.assetPath='../private.pdf',p=>p.sourceDownloads.pdf.sha256='c'.repeat(64),p=>p.sourceDownloads.pdf.assetPath=p.sourceDownloads.docx.assetPath]){
  const invalid=structuredClone(policy);mutate(invalid);assert.throws(()=>reader.renderDownloads(invalid),/Invalid frozen policy downloads/);
 }
});
