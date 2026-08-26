import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { APPLICATION_REQUEST_CONTRACT } from "../application-request-contract.mjs";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(backendDirectory, "../../../..");
const read = relativePath => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

test("the unlinked review simulates the request while the homepage uses the production form", () => {
  const page = read("pages/rosewood-application-link-request-review.html");
  const script = read("pages/rosewood-application-link-request-review.js");
  const homepage = read("index.html");

  assert.deepEqual(APPLICATION_REQUEST_CONTRACT.fields.map(field => field.id), ["parent_guardian_name", "email"]);
  assert.equal(APPLICATION_REQUEST_CONTRACT.sourceEoiMatching, "explicit_staff_link_only");
  assert.match(page, /Parent\/guardian name/);
  assert.match(page, /Email address/);
  assert.match(page, /more than one child/);
  assert.doesNotMatch(page, /confirm email|child(?:'s)? name|year level/i);
  assert.match(page, /No information is saved and no email is sent/);
  assert.match(page, /connect-src 'none'/);
  assert.doesNotMatch(script, /\/v6\/application-link-requests/);
  assert.doesNotMatch(script, /fetch\s*\(/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
  assert.match(homepage, /id="application-link-request"/);
  assert.match(homepage, /Request Application Link/);
  assert.match(homepage, /pages\/discover-rosewood-forms\.js/);
  assert.doesNotMatch(homepage, /https:\/\/tinyurl\.com\/FamiliesEdEOI/);
  assert.doesNotMatch(homepage, /tinyurl\.com\/RosewoodCollegeEOI/);
});

test("the full homepage design review retains the launched layout without the production request client", () => {
  const preview = read("homepage-application-request-review.html");

  assert.match(preview, /Homepage design review/);
  assert.match(preview, /no information is saved and no email is sent/i);
  assert.match(preview, /id="application-link-request"/);
  assert.match(preview, /rosewood-application-link-request-review\.js/);
  assert.doesNotMatch(preview, /rosewood-application-link-request\.js/);
  assert.match(preview, /noindex, nofollow, noarchive, nosnippet/);
});

test("the retired production request source remains byte-identical to its immutable contract", () => {
  const archivedHtml = read("Rosewood enrolment/v6/historical-assets/application-link-request-2026.1/rosewood-application-link-request.html.source");
  const archivedScript = read("Rosewood enrolment/v6/historical-assets/application-link-request-2026.1/rosewood-application-link-request.js.source");
  const hash = value => crypto.createHash("sha256").update(value).digest("hex");

  assert.equal(hash(archivedHtml), APPLICATION_REQUEST_CONTRACT.source.frontendAssetHashes["pages/rosewood-application-link-request.html"]);
  assert.equal(hash(archivedScript), APPLICATION_REQUEST_CONTRACT.source.frontendAssetHashes["pages/rosewood-application-link-request.js"]);
});
