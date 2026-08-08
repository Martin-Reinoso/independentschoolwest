import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { currentFormDefinition } from "../form-definitions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "lambda-dist");
const repositoryRoot = path.resolve(root, "../../..");
const files = ["index.mjs", "service.mjs", "application-review.mjs", "schema.mjs", "form-definitions.mjs", "production-canary.mjs", "dynamo-store.mjs", "google-auth.mjs", "google-drive.mjs", "staged-google-drive.mjs", "google-sheets.mjs", "ses-mailer.mjs", "email-templates.mjs", "package.json", "pnpm-lock.yaml"];

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
  const expected = currentFormDefinition("application").source.frontendAssetHashes;
  for (const [relativePath, expectedHash] of Object.entries(expected)) {
    const actualHash = crypto.createHash("sha256").update(readFileSync(path.join(repositoryRoot, relativePath))).digest("hex");
    if (actualHash !== expectedHash) throw new Error(`Form asset changed without a new immutable form definition: ${relativePath}`);
  }
}

assertFormAssets();
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of files) copyFileSync(path.join(root, file), path.join(output, file));
run(process.env.PNPM_BIN || "pnpm", ["install", "--prod", "--frozen-lockfile", "--ignore-scripts", "--config.node-linker=hoisted"]);
assertNoSymlinks(output);
run(process.execPath, ["--input-type=module", "--eval", "const module = await import('./index.mjs'); if (typeof module.handler !== 'function') process.exit(2);"]);
console.log(`Deployment bundle ready: ${output}`);
