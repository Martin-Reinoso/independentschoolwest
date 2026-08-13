import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const failures = [];
const privateExportName = /(?:attendee|attendees|booking|bookings|registrant|registrants|registration[-_ ]?export|ticket[-_ ]?export)/i;
const secretPatterns = [
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Slack webhook", /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/],
  ["GitHub token", /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/]
];

for (const file of tracked) {
  if (privateExportName.test(file) && [".csv", ".tsv", ".xlsx", ".xls", ".json"].includes(extname(file).toLowerCase())) {
    failures.push(`${file}: filename resembles a private attendee or registration export`);
  }
  const path = resolve(root, file);
  if (statSync(path).size > 2_000_000) continue;
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const text = bytes.toString("utf8");
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text)) failures.push(`${file}: contains a high-confidence ${label} pattern`);
  }
  if ([".csv", ".tsv"].includes(extname(file).toLowerCase()) && /(?:first.?name|last.?name).*(?:email|mobile|phone)/i.test(text.slice(0, 2000))) {
    failures.push(`${file}: tabular headers resemble a personal attendee export`);
  }
}

if (failures.length) {
  console.error("Public-data safety check failed:\n" + [...new Set(failures)].sort().map(value => `- ${value}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${tracked.length} tracked files: no private export or high-confidence secret pattern found.`);
}
