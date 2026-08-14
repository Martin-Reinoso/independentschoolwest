import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../../../../pages/rosewood-enrolment-v6.js", import.meta.url), "utf8");

function frontendFunction(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist in the family frontend`);
  const remainder = source.slice(start + 12);
  const nextFunction = remainder.search(/\n  (?:async )?function /);
  const end = nextFunction === -1 ? -1 : start + 12 + nextFunction;
  assert.notEqual(end, -1, `${name} must be followed by another function`);
  return Function(`"use strict"; return (${source.slice(start, end).trim()});`)();
}

const clearSupersededDocumentUploadErrors = frontendFunction("clearSupersededDocumentUploadErrors");
const documentFileValidationMessage = frontendFunction("documentFileValidationMessage");

function upload(key, category, status, overrides = {}) {
  return [key, { key, category, status, promise: null, ...overrides }];
}

test("a replacement selection clears only completed failed uploads in its document category", () => {
  const activePromise = Promise.resolve();
  const uploads = new Map([
    upload("failed-old", "birth_certificate", "error"),
    upload("failed-second", "birth_certificate", "error"),
    upload("uploaded", "birth_certificate", "uploaded"),
    upload("uploading", "birth_certificate", "uploading", { promise: activePromise }),
    upload("active-error", "birth_certificate", "error", { promise: activePromise }),
    upload("other-category-error", "immunisation", "error")
  ]);

  assert.equal(clearSupersededDocumentUploadErrors(uploads, "birth_certificate", true), true);
  assert.deepEqual([...uploads.keys()], ["uploaded", "uploading", "active-error", "other-category-error"]);
});

test("cancelling the file picker does not discard an existing retryable error", () => {
  const uploads = new Map([upload("failed-old", "birth_certificate", "error")]);

  assert.equal(clearSupersededDocumentUploadErrors(uploads, "birth_certificate", false), false);
  assert.equal(uploads.has("failed-old"), true);
});

test("invalid-to-valid, same-file retry and multiple replacement selections cannot retain a stale error", () => {
  const scenarios = [
    { name: "invalid-to-valid", previous: [upload("wrong.txt", "birth_certificate", "error")], selected: ["correct.pdf"] },
    { name: "same-file retry", previous: [upload("same.pdf", "birth_certificate", "error")], selected: ["same.pdf"] },
    { name: "multiple replacement", previous: [upload("wrong.exe", "birth_certificate", "error")], selected: ["front.jpg", "back.png"] }
  ];

  for (const scenario of scenarios) {
    const uploads = new Map(scenario.previous);
    clearSupersededDocumentUploadErrors(uploads, "birth_certificate", scenario.selected.length > 0);
    scenario.selected.forEach(key => uploads.set(key, { key, category: "birth_certificate", status: "waiting", promise: null }));
    assert.equal([...uploads.values()].some(item => item.status === "error"), false, scenario.name);
    assert.deepEqual([...uploads.keys()], scenario.selected, scenario.name);
  }
});

test("document validation accepts supported boundary files and rejects type and size failures", () => {
  const tenMegabytes = 10 * 1024 * 1024;
  for (const mimeType of ["application/pdf", "image/png", "image/jpeg"]) {
    assert.equal(documentFileValidationMessage({ size: 1 }, mimeType), "");
    assert.equal(documentFileValidationMessage({ size: tenMegabytes }, mimeType), "");
  }
  assert.match(documentFileValidationMessage({ size: 100 }, "text/plain"), /PDF, PNG or JPEG/);
  assert.match(documentFileValidationMessage({ size: 100 }, "application/octet-stream"), /PDF, PNG or JPEG/);
  assert.match(documentFileValidationMessage({ size: 0 }, "application/pdf"), /no larger than 10 MB/);
  assert.match(documentFileValidationMessage({ size: tenMegabytes + 1 }, "application/pdf"), /no larger than 10 MB/);
});

test("the file-selection path clears stale category and global upload errors before starting replacements", () => {
  const selection = source.slice(source.indexOf("  function startSelectedDocumentUploads"), source.indexOf("  async function finishDocumentUploads"));
  assert.ok(selection.indexOf("clearSupersededDocumentUploadErrors") < selection.indexOf("for (const file of selectedFiles)"));
  assert.match(selection, /errorSummary\.dataset\.errorCode === "DOCUMENT_UPLOAD_FAILED"/);
  assert.match(selection, /renderDocumentUploadState\(category\)/);
});
