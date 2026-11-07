import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(backend, "../../..");
const source = JSON.parse(readFileSync(path.join(backend, "../post-offer/agreement-draft.json"), "utf8"));
if (!source.id || source.sections.length !== 14 || source.policies.length !== 7 || !source.introduction?.text) throw new Error("Incomplete offer content source.");
const banner = "// Generated from post-offer/agreement-draft.json. Run scripts/generate-offer-content.mjs; do not edit.\n";
const { policies, ...review } = source;
const outputs = new Map([
  [path.join(backend, "offer-contract.mjs"), `${banner}// Issue requires approval of this exact content hash. Draft status is not approval.\nexport const OFFER_CONTRACT = ${JSON.stringify(source, null, 2)};\n`],
  [path.join(root, "pages/rosewood-enrolment-offer-terms-v1.js"), `${banner}window.ROSEWOOD_OFFER_REVIEW_CONTRACT = ${JSON.stringify(source, null, 2)};\n`],
  [path.join(root, "pages/rosewood-enrolment-acceptance-terms-review.js"), `${banner}window.ROSEWOOD_ACCEPTANCE_TERMS_REVIEW = ${JSON.stringify(review, null, 2)};\nwindow.ROSEWOOD_ACCEPTANCE_TERMS_REVIEW.policies = window.ROSEWOOD_OFFER_REVIEW_CONTRACT.policies;\n`]
]);
for (const [file, contents] of outputs) {
  if (process.argv.includes("--check")) {
    if (readFileSync(file, "utf8") !== contents) throw new Error(`Offer content is out of date: ${path.basename(file)}`);
  } else writeFileSync(file, contents);
}
console.log(process.argv.includes("--check") ? "Offer content projections match." : "Offer content projections generated; approval unchanged.");
