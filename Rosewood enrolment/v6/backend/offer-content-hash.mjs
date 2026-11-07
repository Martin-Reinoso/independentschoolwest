import crypto from 'node:crypto';

// DynamoDB maps do not preserve JavaScript property insertion order. Arrays retain
// their order; object keys are sorted before hashing the unpublished offer contract.
export function canonicalOfferJson(value) {
  function sort(item) {
    if(Array.isArray(item))return item.map(sort);
    if(item && typeof item==='object')return Object.fromEntries(Object.keys(item).sort().filter(key=>item[key]!==undefined).map(key=>[key,sort(item[key])]));
    return item;
  }
  return JSON.stringify(sort(value));
}
export const offerContentHash=value=>crypto.createHash('sha256').update(canonicalOfferJson(value)).digest('hex');
