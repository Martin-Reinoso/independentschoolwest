import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { currentFormDefinition } from "../form-definitions.mjs";
import { OFFER_ASSET_HASHES } from "../offer-assets.mjs";
import { APPLICATION_REQUEST_CONTRACT } from "../application-request-contract.mjs";
import {OFFER_LETTER_LOGO_SHA256} from '../offer-letter-assets.mjs';
import {OFFER_CONTRACT} from '../offer-contract.mjs';
import {policyFigureBytes,verifyPolicyDownloads} from '../offer-policy-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "lambda-dist");
const repositoryRoot = path.resolve(root, "../../..");
const files = ["index.mjs", "service.mjs", "offer-workflow.mjs", "offer-letter.mjs", "offer-contract.mjs", "offer-assets.mjs", "invitation-access.mjs", "application-request-contract.mjs", "community-enquiry-contract.mjs", "application-review.mjs", "schema.mjs", "form-definitions.mjs", "production-canary.mjs", "dynamo-store.mjs", "google-auth.mjs", "google-drive.mjs", "staged-google-drive.mjs", "google-sheets.mjs", "ses-mailer.mjs", "slack-notifier.mjs", "email-templates.mjs", "family-communication-templates.mjs", "package.json", "pnpm-lock.yaml"];
const retiredAssetPaths = {
  "pages/rosewood-application-link-request.html": "Rosewood enrolment/v6/historical-assets/application-link-request-2026.1/rosewood-application-link-request.html.source",
  "pages/rosewood-application-link-request.js": "Rosewood enrolment/v6/historical-assets/application-link-request-2026.1/rosewood-application-link-request.js.source"
};
files.push("email-delivery-policy.mjs", "synthetic-runtime.mjs", "offer-emails.mjs", "offer-details.mjs", "offer-pdf.mjs", "offer-record-pdf.mjs", "offer-content-hash.mjs", "offer-letter-assets.mjs", "family-portal.mjs");
files.push("offer-policy-assets.mjs");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: output, env: process.env, encoding: "utf8", stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
}

function assertNoSymlinks(directory) {
  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    const metadata = lstatSync(entryPath);
    if (metadata.isSymbolicLink()) throw new Error(`Deployment output contains a symbolic link: ${entryPath}`);
    if (metadata.isDirectory()) assertNoSymlinks(entryPath);
  }
}

function assertFormAssets() {
  const expected = { ...OFFER_ASSET_HASHES, ...currentFormDefinition("application").source.frontendAssetHashes, ...APPLICATION_REQUEST_CONTRACT.source.frontendAssetHashes };
  for (const [relativePath, expectedHash] of Object.entries(expected)) {
    const retainedPath = retiredAssetPaths[relativePath] || relativePath;
    const actualHash = crypto.createHash("sha256").update(readFileSync(path.join(repositoryRoot, retainedPath))).digest("hex");
    if (actualHash !== expectedHash) throw new Error(`Form asset changed without a new immutable form definition: ${relativePath}`);
  }
}

assertFormAssets();
for (const policy of OFFER_CONTRACT.policies) verifyPolicyDownloads(policy);
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of files) copyFileSync(path.join(root, file), path.join(output, file));
mkdirSync(path.join(output,'policy-assets'));
for(const policy of OFFER_CONTRACT.policies)for(const figure of policy.sourceFigures||[]){
  policyFigureBytes(figure);
  copyFileSync(path.join(repositoryRoot,figure.assetPath),path.join(output,'policy-assets',figure.sha256+'.png'));
}
mkdirSync(path.join(output,'pdf-assets'));
for(const file of ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSerif-Regular.ttf','OFL.txt'])copyFileSync(path.join(root,'pdf-assets',file),path.join(output,'pdf-assets',file));
const emblem=path.join(repositoryRoot,'img/rosewood-emblem-corrected-transparent.png');
if(crypto.createHash('sha256').update(readFileSync(emblem)).digest('hex')!==OFFER_LETTER_LOGO_SHA256)throw new Error('The reviewed letter emblem changed.');
copyFileSync(emblem,path.join(output,'pdf-assets/rosewood-emblem.png'));
run(process.env.PNPM_BIN || "pnpm", ["install", "--prod", "--frozen-lockfile", "--ignore-scripts", "--config.node-linker=hoisted"]);
assertNoSymlinks(output);
run(process.execPath, ["--input-type=module", "--eval", "const module = await import('./index.mjs'); if (typeof module.handler !== 'function') process.exit(2);"]);
console.log(`Deployment bundle ready: ${output}`);
