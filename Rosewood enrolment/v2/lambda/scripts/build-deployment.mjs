import { spawnSync } from "node:child_process";
import { copyFileSync, lstatSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../../lambda-dist/", import.meta.url));
const runtimeFiles = [
  "core.mjs",
  "dynamo-store.mjs",
  "email-templates.mjs",
  "google-auth.mjs",
  "google-drive-adapter.mjs",
  "google-sheets-tracker.mjs",
  "index.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "ses-mailer.mjs"
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: outputDirectory,
    env: process.env,
    encoding: "utf8",
    stdio: "inherit"
  });
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

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
for (const file of runtimeFiles) copyFileSync(path.join(sourceDirectory, file), path.join(outputDirectory, file));

run("pnpm", ["install", "--prod", "--frozen-lockfile", "--ignore-scripts", "--config.node-linker=hoisted"]);
assertNoSymlinks(outputDirectory);
run(process.execPath, ["--input-type=module", "--eval", "const module = await import('./index.mjs'); if (typeof module.handler !== 'function') process.exit(2);"]);

process.stdout.write(`Deployment bundle ready: ${outputDirectory}\n`);
