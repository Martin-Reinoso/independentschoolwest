import { spawnSync } from "node:child_process";
import { copyFileSync, lstatSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "lambda-dist");
const files = ["index.mjs", "service.mjs", "schema.mjs", "dynamo-store.mjs", "google-auth.mjs", "google-sheets.mjs", "s3-store.mjs", "ses-mailer.mjs", "email-templates.mjs", "package.json", "pnpm-lock.yaml"];

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

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of files) copyFileSync(path.join(root, file), path.join(output, file));
run(process.env.PNPM_BIN || "pnpm", ["install", "--prod", "--frozen-lockfile", "--ignore-scripts", "--config.node-linker=hoisted"]);
assertNoSymlinks(output);
run(process.execPath, ["--input-type=module", "--eval", "const module = await import('./index.mjs'); if (typeof module.handler !== 'function') process.exit(2);"]);
console.log(`Deployment bundle ready: ${output}`);
