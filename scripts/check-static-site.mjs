import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const candidates = tracked.filter(file => [".html", ".css"].includes(extname(file).toLowerCase()));
const missing = [];

function localTarget(sourceFile, rawReference) {
  const value = rawReference.trim().replace(/^['"]|['"]$/g, "");
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value) || value.includes("{{") || value.includes("${") || /\s\+\s|\.replace\(/.test(value)) return null;
  const pathname = value.split(/[?#]/, 1)[0];
  if (!pathname || /^(?:data|blob):/i.test(pathname)) return null;
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { decoded = pathname; }
  const absolute = decoded.startsWith("/") ? join(root, decoded) : resolve(root, dirname(sourceFile), decoded);
  if (relative(root, absolute).split(sep).includes("..")) return null;
  return normalize(absolute);
}

function existsAsSitePath(target) {
  if (existsSync(target) && statSync(target).isFile()) return true;
  if (existsSync(target) && statSync(target).isDirectory() && existsSync(join(target, "index.html"))) return true;
  if (!extname(target) && existsSync(`${target}.html`)) return true;
  return false;
}

for (const file of candidates) {
  const source = readFileSync(join(root, file), "utf8");
  const references = [];
  if (file.endsWith(".html")) {
    for (const match of source.matchAll(/\b(?:href|src|poster)\s*=\s*(?<!\\)(["'])(.*?)\1/gis)) references.push(match[2]);
    for (const match of source.matchAll(/\bsrcset\s*=\s*(?<!\\)(["'])(.*?)\1/gis)) {
      for (const item of match[2].split(",")) references.push(item.trim().split(/\s+/, 1)[0]);
    }
  }
  for (const match of source.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gis)) references.push(match[2]);
  for (const reference of references) {
    const target = localTarget(file, reference);
    if (target && !existsAsSitePath(target)) missing.push(`${file}: ${reference}`);
  }
}

if (missing.length) {
  console.error("Broken local site references:\n" + [...new Set(missing)].sort().map(value => `- ${value}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${candidates.length} tracked HTML/CSS files: all local references resolve.`);
}
