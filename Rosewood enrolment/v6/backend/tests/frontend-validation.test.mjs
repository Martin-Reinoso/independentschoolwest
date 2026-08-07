import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("submission validation identifies the section and preserves an in-browser signature", async () => {
  const source = await readFile(new URL("../../../../pages/rosewood-enrolment-v6.js", import.meta.url), "utf8");
  const canvasBinding = source.slice(source.indexOf("  function bindCanvas()"), source.indexOf("  function showInlineServerValidation"));

  assert.match(source, /application_influences:three_required/);
  assert.match(source, /data-exact/);
  assert.match(source, /Choose exactly \$\{exact\} options/);
  assert.match(source, /data-validation-screen/);
  assert.match(source, /Review \$\{esc\(first\.section\)\}/);
  assert.match(source, /Signature ready/);
  assert.match(source, /Awaiting Parent\/Guardian Signature/);
  assert.match(source, /record\.status === "pending_signatures" \? "Awaiting parent\/guardian signature"/);
  assert.match(source, /This preference applies to general communication/);
  assert.match(source, /isChecked\(`\$\{prefix\}_ip`\)/);
  assert.match(canvasBinding, /canvas\.toDataURL\("image\/png"\)/);
  assert.match(canvasBinding, /context\.drawImage\(image/);
  assert.doesNotMatch(canvasBinding, /scheduleAutosave/);
});

test("guardian signing renders the complete server-provided application review", async () => {
  const [source, html, css] = await Promise.all([
    readFile(new URL("../../../../pages/rosewood-application-sign-v6.js", import.meta.url), "utf8"),
    readFile(new URL("../../../../pages/rosewood-application-sign-v6.html", import.meta.url), "utf8"),
    readFile(new URL("../../../../pages/rosewood-application-sign-v6.css", import.meta.url), "utf8")
  ]);

  assert.match(source, /Review the complete submitted application/);
  assert.match(source, /sections\.map\(reviewSection\)/);
  assert.match(source, /groups\.map\(reviewGroup\)/);
  assert.match(source, /I have reviewed the complete submitted application/);
  assert.match(source, /Do not proceed to signing without the complete application/);
  assert.doesNotMatch(source, /const conditions = context\.review\.conditions/);
  assert.doesNotMatch(source, /<h3>Previous school permission<\/h3>/);
  assert.match(html, /rosewood-application-sign-v6\.css\?v=2/);
  assert.match(html, /rosewood-application-sign-v6\.js\?v=2/);
  assert.match(css, /\.application-review-section/);
  assert.match(css, /\.review-answer \{ grid-template-columns: 1fr/);
});
