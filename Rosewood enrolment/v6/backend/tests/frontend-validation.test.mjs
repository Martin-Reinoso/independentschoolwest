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
  assert.match(source, /staff_review_required/);
  assert.match(source, /Can the school contact this person\?/);
  assert.match(source, /No, do not contact this person/);
  assert.match(source, /This person will not receive messages or a separate signature request/);
  assert.match(source, /Correct email address/);
  assert.match(source, /Resend signature request/);
  assert.match(source, /rosewood-enrolment-v6-active-session/);
  assert.match(source, /stored\.statusSessionToken/);
  assert.match(source, /Enter a valid date that is not in the future/);
  assert.match(source, /isChecked\(`\$\{prefix\}_ip`\)/);
  assert.match(canvasBinding, /canvas\.toDataURL\("image\/png"\)/);
  assert.match(canvasBinding, /context\.drawImage\(image/);
  assert.doesNotMatch(canvasBinding, /scheduleAutosave/);
});

test("V6.8 exposes the revised responsive application experience without retired conditions", async () => {
  const [source, html, css, adminSource, adminHtml] = await Promise.all([
    readFile(new URL("../../../../pages/rosewood-enrolment-v6.js", import.meta.url), "utf8"),
    readFile(new URL("../../../../pages/rosewood-enrolment-v6.html", import.meta.url), "utf8"),
    readFile(new URL("../../../../pages/rosewood-enrolment-v6.css", import.meta.url), "utf8"),
    readFile(new URL("../../../../pages/rosewood-enrolment-admin-v6.js", import.meta.url), "utf8"),
    readFile(new URL("../../../../pages/rosewood-enrolment-admin-v6.html", import.meta.url), "utf8")
  ]);
  assert.match(source, /child-application-card/);
  assert.match(css, /\.child-application-card/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(source, /Year the student will commence at Rosewood College/);
  assert.match(source, /value: "2027"/);
  assert.match(source, /const countryCodes = \[/);
  assert.ok((source.match(/"[A-Z]{2}"/g) || []).length >= 249);
  assert.match(source, /list: "country-list"/);
  assert.match(html, /datalist id="country-list"/);
  assert.match(html, /datalist id="language-list"/);
  assert.match(source, /Home Care Arrangement/);
  assert.doesNotMatch(source, /choices\("care_arrangement"[^\n]+multiple: true/);
  const selectorSource = source.slice(source.indexOf("function renderSelector"), source.indexOf("function renderEoi"));
  const studentSource = source.slice(source.indexOf("function renderApplicationStudent"), source.indexOf("function applicationGuardianFields"));
  assert.doesNotMatch(selectorSource, /<dt>Source<\/dt>|This is a direct family invitation/);
  assert.match(selectorSource, /Information from your Expression of Interest has been included/);
  assert.doesNotMatch(studentSource, /Has the student previously attended an early learning centre|section\("Previous Education"|section\("Student Residence"/);
  assert.ok(studentSource.indexOf("Interrupted schooling") > studentSource.indexOf("Current Early Learning Centre / Kindergarten / Primary School"));
  assert.match(studentSource, /section\("Student Primary Address"[^\n]+Share this address with other Parent\/Guardian\?/);
  assert.match(studentSource, /care_arrangement[^\n]+type: "select"/);
  assert.doesNotMatch(source, /Your browser may offer a saved address/);
  assert.match(studentSource, /student_address[^\n]+autocomplete: "off"/);
  assert.match(studentSource, /https:\/\/www\.health\.vic\.gov\.au\/immunisation\/primary-school-immunisation-requirements/);
  assert.match(source, /application_special_aptitudes/);
  assert.match(source, /application_mentoring_value/);
  assert.match(source, /application_intended_years/);
  assert.match(source, /return-to-family-selector/);
  assert.match(source, /const applicationTokens = \[\.\.\.new Set\(\[state\.sessionToken, state\.statusSessionToken/);
  assert.match(css, /\.country-catalogue-grid/);
  assert.match(css, /\.survey-grid/);
  assert.match(source, /max: melbourneDate\(\)/);
  assert.match(source, /timeZone: "Australia\/Melbourne"/);
  assert.match(source, /Optional\. Select the active option again to clear it/);
  assert.match(source, /Is Immunisation History Statement held and will be uploaded with this application\?/);
  assert.match(source, /application_student_agreement/);
  assert.match(source, /application_parent_agreement/);
  assert.match(source, /application_agreement_acknowledgement/);
  assert.doesNotMatch(source.slice(source.indexOf("function renderApplicationConditions"), source.indexOf("function signaturePanel")), /fee_option|previous_school_permission/);
  assert.match(source, /Set securely to the date this application is submitted/);
  assert.match(adminHtml, /Remember me on this device/);
  assert.match(adminSource, /rosewood-enrolment-staff-v6-session/);
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
  assert.match(html, /rosewood-application-sign-v6\.js\?v=4/);
  assert.match(css, /\.application-review-section/);
  assert.match(css, /\.review-answer \{ grid-template-columns: 1fr/);
});
