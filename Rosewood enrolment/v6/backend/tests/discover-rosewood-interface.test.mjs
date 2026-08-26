import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(backendDirectory, "../../../..");
const read = relativePath => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

test("Discover Rosewood activates both forms without changing the current homepage registration path", () => {
  const page = read("discover-rosewood.html");
  const script = read("pages/discover-rosewood-forms.js");
  const homepage = read("index.html");

  assert.match(page, /id="application-link-form"/);
  assert.match(page, /Parent\/guardian name/);
  assert.match(page, /Email address/);
  assert.match(page, /id="community-contact-form"/);
  assert.match(page, /Ask a general question/);
  assert.match(page, /Offer help or professional expertise/);
  assert.match(page, /maxlength="4000"/);
  assert.match(page, /pages\/discover-rosewood-forms\.js/);
  assert.match(page, /connect-src https:\/\/6zyzo44sdb5zmmx53toktqrnuu0sikyd\.lambda-url\.ap-southeast-2\.on\.aws/);
  assert.doesNotMatch(page, /Front-end preview only|no record is created and no email is sent|rosewood-application-link-request-review\.js/);
  assert.match(script, /\/v6\/application-link-requests/);
  assert.match(script, /\/v6\/community-enquiries/);
  assert.match(script, /idempotency-key/);
  assert.match(script, /startedAt/);
  assert.match(script, /website/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
  assert.match(homepage, /https:\/\/tinyurl\.com\/FamiliesEdEOI/);
  assert.doesNotMatch(homepage, /id="application-link-request"|discover-rosewood-forms\.js/);
});

test("Discover Rosewood provides accessible validation, loading, success and retry states", () => {
  const page = read("discover-rosewood.html");
  const script = read("pages/discover-rosewood-forms.js");
  const styles = read("pages/discover-rosewood.css");

  assert.match(page, /role="alert" tabindex="-1" hidden/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /<h3 id="success-title">Check your email<\/h3>/);
  assert.match(page, /class="application-request-success-email"><strong id="success-email"><\/strong><\/p>/);
  assert.match(page, /Your application link will arrive shortly\./);
  assert.match(page, /Please check your inbox and junk folder\./);
  assert.doesNotMatch(page, /If <strong id="success-email"><\/strong> can receive an application link/);
  assert.match(page, /aria-describedby="community-name-error"/);
  assert.match(page, /aria-describedby="community-email-error"/);
  assert.match(page, /aria-describedby="community-interest-error"/);
  assert.match(script, /aria-invalid/);
  assert.match(script, /is-loading/);
  assert.match(script, /The service could not be reached/);
  assert.match(styles, /\.community-submit-loader/);
  assert.match(styles, /\.community-form-field\.is-invalid/);
  assert.match(styles, /@media \(max-width: 560px\)/);
});
