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
  assert.match(studentSource, /regardless of the child’s vaccination status/);
  assert.match(studentSource, /You can obtain the statement through myGov/);
  assert.match(studentSource, /class="immunisation-law-link"/);
  assert.match(css, /\.immunisation-guidance a \{[^}]+text-decoration-line: underline/);
  assert.match(css, /\.external-link-mark/);
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
  assert.match(adminSource, /record\.canRenewAccess/);
  assert.match(adminSource, /Renew access/);
  assert.match(adminSource, /\/v6\/staff\/invitations\/renew-access/);
  assert.match(adminSource, /saved answers and revision history will be preserved/);
  assert.match(adminSource, /if \(!quiet\) clearNotices\("dashboard-error"\)/);
});

test("V6.14 applies the approved family feedback without weakening verification or saved-draft safety", async () => {
  const [source, html] = await Promise.all([
    readFile(new URL("../../../../pages/rosewood-enrolment-v6.js", import.meta.url), "utf8"),
    readFile(new URL("../../../../pages/rosewood-enrolment-v6.html", import.meta.url), "utf8")
  ]);
  const studentSource = source.slice(source.indexOf("function renderApplicationStudent"), source.indexOf("function applicationGuardianFields"));
  assert.match(source, /const APPLICATION_IDLE_SECONDS = 90 \* 60/);
  assert.match(source, /const SESSION_WARNING_SECONDS = 5 \* 60/);
  assert.match(html, /Your session will expire soon/);
  assert.match(source, /This code is valid for \$\{minutes\}:\$\{remainder\}/);
  assert.match(source, /The resend delay below does not shorten this time/);
  assert.match(source, /label: "Foundation \(Prep\)"/);
  assert.doesNotMatch(source.slice(source.indexOf("const entryLevels"), source.indexOf("const currentLevels")), /Year 6/);
  assert.doesNotMatch(source.slice(source.indexOf("const currentSchools"), source.indexOf("const needCategories")), /Our Lady of Rosary|St Mary's/);
  assert.match(studentSource, /future_sibling_count.*type: "number"/);
  assert.match(studentSource, /Student's Nationality and Citizenship/);
  assert.match(studentSource, /Current Country of Residence/);
  assert.match(studentSource, /Country of Birth/);
  assert.match(studentSource, /Country of Nationality/);
  assert.match(studentSource, /Health professionals involved/);
  assert.match(studentSource, /reports_attached", "Reports Attached", \["Yes", "N\/A"\]/);
  assert.match(studentSource, /medicare_expiry", "Medicare Expiry", \{ type: "month", required: true \}/);
  assert.match(studentSource, /field\("other_languages", "Other Languages"\)/);
  assert.doesNotMatch(studentSource, /This information will not impact the offer of enrolment/);
  assert.match(studentSource, /We may contact you to clarify the information provided or request relevant reports/);
});

test("V6.15 uses family-facing wording and navigates to the exact unanswered family control", async () => {
  const source = await readFile(new URL("../../../../pages/rosewood-enrolment-v6.js", import.meta.url), "utf8");
  const studentSource = source.slice(source.indexOf("function renderApplicationStudent"), source.indexOf("function applicationGuardianFields"));
  const validationSource = source.slice(source.indexOf("function missingAnswerGuidance"), source.indexOf("function field"));
  const inlineSource = source.slice(source.indexOf("function showInlineServerValidation"), source.indexOf("function clearResolvedServerValidation"));

  assert.match(studentSource, /Do you have any other children, apart from this child, who may apply to Rosewood College in the future\?/);
  assert.match(studentSource, /Do not include the child named in this application\./);
  assert.match(studentSource, /How many other children may apply\?/);
  assert.match(validationSource, /future_siblings: \{ section: "Student – Family"/);
  assert.match(validationSource, /Please select Yes or No for “Do you have any other children who may apply\?”/);
  assert.match(validationSource, /Please enter how many other children may apply\./);
  assert.match(source, /data-validation-field="\$\{esc\(first\.field\)\}"/);
  assert.match(source, /field: action\.dataset\.validationField \|\| ""/);
  assert.match(inlineSource, /requestedControl \|\| firstControl/);
  assert.match(inlineSource, /behavior: "smooth"/);
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
  assert.match(source, /timeZone: "Australia\/Melbourne"/);
  assert.match(source, /formatToParts\(value\)/);
  assert.match(source, /value="\$\{melbourneDate\(\)\}"/);
  assert.doesNotMatch(source, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
  assert.match(await readFile(new URL("../../../../pages/rosewood-enrolment-v6.js", import.meta.url), "utf8"), /rosewood-application-2026\.18/);
  assert.match(await readFile(new URL("../../../../pages/rosewood-enrolment-v6.html", import.meta.url), "utf8"), /rosewood-enrolment-v6\.js\?v=29/);
  assert.match(html, /rosewood-application-sign-v6\.css\?v=2/);
  assert.match(html, /rosewood-application-sign-v6\.js\?v=5/);
  assert.match(css, /\.application-review-section/);
  assert.match(css, /\.review-answer \{ grid-template-columns: 1fr/);
});
