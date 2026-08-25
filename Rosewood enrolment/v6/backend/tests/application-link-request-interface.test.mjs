import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { APPLICATION_REQUEST_CONTRACT } from "../application-request-contract.mjs";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(backendDirectory, "../../../..");
const read = relativePath => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

test("the public application-link request remains a minimal two-field family gateway", () => {
  const page = read("pages/rosewood-application-link-request.html");
  const script = read("pages/rosewood-application-link-request.js");
  const homepage = read("index.html");

  assert.deepEqual(APPLICATION_REQUEST_CONTRACT.fields.map(field => field.id), ["parent_guardian_name", "email"]);
  assert.equal(APPLICATION_REQUEST_CONTRACT.sourceEoiMatching, "explicit_staff_link_only");
  assert.match(page, /Parent\/guardian name/);
  assert.match(page, /Email address/);
  assert.match(page, /more than one child/);
  assert.doesNotMatch(page, /confirm email|child(?:'s)? name|year level/i);
  assert.match(script, /\/v6\/application-link-requests/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
  assert.match(homepage, /id="application-link-request"/);
  assert.match(homepage, /Request Application Link/);
  assert.doesNotMatch(homepage, /tinyurl\.com\/RosewoodCollegeEOI/);
});

