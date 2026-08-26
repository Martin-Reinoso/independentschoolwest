const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "site-analytics.js"), "utf8");
const publicPages = [
  "index.html",
  "donate.html",
  "family-evening/index.html",
  "pages/info-session.html",
  "pages/rosewood-fee-calculator.html",
  "pages/rosewood-fee-schedule.html",
  "emails/email01.html",
  "emails/email02.html",
  "emails/email03.html",
  "emails/email04.html",
  "emails/email05.html",
  "emails/email06.html",
  "emails/email07.html",
  "emails/email08.html",
  "pages/letter-to-families-august-2026.html"
];
const protectedPages = [
  "pages/rosewood-enrolment-v6.html",
  "pages/rosewood-application-sign-v6.html",
  "pages/rosewood-enrolment-admin-v6.html",
  "pages/rosewood-receipt-v2.html",
  "pages/rosewood-application-link-request-review.html"
];

test("public production pages use one shared analytics loader", () => {
  for (const relativePath of publicPages) {
    const html = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.match(html, /<script src="\/site-analytics\.js" defer><\/script>/, relativePath);
    assert.equal((html.match(/site-analytics\.js/g) || []).length, 1, relativePath);
  }
});

test("enrolment, signing, staff, receipt and review pages remain tag-free", () => {
  for (const relativePath of protectedPages) {
    const html = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.doesNotMatch(html, /site-analytics|googletagmanager|gtag\(/i, relativePath);
  }
});

test("the loader starts automatically and strips query strings from page reporting", () => {
  assert.match(source, /analytics_storage: "granted"/);
  assert.match(source, /loadAnalytics\(\);/);
  assert.match(source, /page_location: `\$\{window\.location\.origin\}\$\{window\.location\.pathname\}`/);
  assert.match(source, /allow_google_signals: false/);
  assert.match(source, /allow_ad_personalization_signals: false/);
  assert.doesNotMatch(source, /localStorage|Analytics choices|Allow analytics|location\.href|document\.forms|FormData|input\.value/);
  assert.equal(fs.existsSync(path.join(root, "site-analytics.css")), false);
});

test("the loader defensively blocks sensitive routes", () => {
  for (const marker of ["rosewood-enrolment", "rosewood-application-sign", "rosewood-enrolment-admin", "rosewood-receipt", "application-link-request-review"]) {
    assert.match(source, new RegExp(marker));
  }
});
