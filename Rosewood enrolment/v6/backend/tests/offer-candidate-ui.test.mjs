import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={window:{},document:{getElementById:()=>({})}};
vm.runInNewContext(readFileSync(new URL('../../../../pages/rosewood-enrolment-offers-admin-v1.js',import.meta.url),'utf8'),context);
const select=(families,offers)=>JSON.parse(JSON.stringify(context.window.rosewoodOfferCandidates(families,offers)));
const child=(id,year='2027')=>({applicationId:id,studentName:`Synthetic ${id}`,entryYear:year,entryLevel:'Year 4'});
const family=(id,children)=>({familyId:id,email:'same@example.test',children});
const issued=(id,status='awaiting_signatures',signed=0)=>({applicationId:id,status,signed});

test('partially offered family remains selectable for only the remaining child',()=>{
 const source=[family('family-a',[child('a'),child('b'),child('c')])],before=structuredClone(source);
 const result=select(source,[{children:[issued('a'),issued('b','signed_conditional',2)]}]);
 assert.equal(result.length,1);assert.equal(result[0].readyCount,1);assert.equal(result[0].offeredCount,2);
 assert.deepEqual(result[0].children.map(c=>c.eligible),[false,false,true]);
 assert.deepEqual(result[0].children.map(c=>c.offerNote),['Offer already sent','Offer accepted','Ready for an offer']);assert.deepEqual(source,before);
});
test('fully offered families leave new-offer selection; unsent siblings in other families remain',()=>{
 const result=select([family('one',[child('a')]),family('two',[child('b'),child('c')])],[{children:[issued('a'),issued('b')]}]);
 assert.deepEqual(result.map(f=>f.familyId),['two']);assert.deepEqual(result[0].children.filter(c=>c.eligible).map(c=>c.applicationId),['c']);
});
test('eligibility uses exact Application ID, not shared surname or email',()=>{
 const a=child('a'),b={...child('b'),studentName:a.studentName};const result=select([family('one',[a]),family('two',[b])],[{children:[issued('a')]}]);assert.equal(result[0].familyId,'two');assert.equal(result[0].readyCount,1);
});
test('unsigned withdrawal allows a replacement; signed or active history prevents a duplicate',()=>{
 const result=select([family('one',[child('a'),child('b'),child('c')])],[{children:[issued('a','withdrawn'),issued('b','withdrawn',1),issued('c','withdrawn')]},{children:[issued('c')]}]);
 assert.deepEqual(result[0].children.map(c=>c.eligible),[true,false,false]);assert.match(result[0].children[0].offerNote,/withdrawn/);
});
test('future-year children cannot be accidentally included with a 2027 sibling',()=>{
 const result=select([family('one',[child('a','2028'),child('b')]),family('future',[child('c','2029')])],[]);assert.equal(result.length,1);assert.equal(result[0].readyCount,1);assert.equal(result[0].children[0].eligible,false);assert.match(result[0].children[0].offerNote,/2027/);
});
