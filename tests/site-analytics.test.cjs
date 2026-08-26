const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const analytics = fs.readFileSync(path.join(root, "site-analytics.js"), "utf8");
const publicPages = [
  "index.html",
  "family-evening/index.html",
  "donate.html",
  "pages/info-session.html",
  "pages/rosewood-fee-calculator.html",
  "pages/rosewood-fee-schedule.html"
];
const sensitivePages = [
  "pages/rosewood-enrolment-v6.html",
  "pages/rosewood-enrolment-admin-v6.html",
  "pages/rosewood-application-sign-v6.html",
  "pages/rosewood-sign-v2.html",
  "pages/rosewood-receipt-v2.html"
];

test("GA4 is installed only on the public sitemap pages", () => {
  for (const file of publicPages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(html, /<script src="\/site-analytics\.js" defer><\/script>/, file);
  }
  for (const file of sensitivePages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(html, /site-analytics\.js/, file);
  }
});

test("the placeholder is inert until a real GA4 Measurement ID is supplied", () => {
  assert.match(analytics, /const measurementId = "G-XXXXXXXXXX";/);
  assert.match(analytics, /placeholderMeasurementId\.test\(measurementId\)/);
  assert.match(analytics, /if \(!publicPaths\.has\(window\.location\.pathname\)\) return;/);
});

test("page-view reporting strips URL queries, fragments and raw referrers", () => {
  assert.match(analytics, /page_location: `\$\{window\.location\.origin\}\$\{window\.location\.pathname\}`/);
  assert.match(analytics, /page_path: window\.location\.pathname/);
  assert.match(analytics, /page_referrer: sanitiseUrl\(document\.referrer\)/);
  assert.doesNotMatch(analytics, /window\.location\.href/);
  assert.match(analytics, /send_page_view: false/);
  assert.match(analytics, /allow_google_signals: false/);
  assert.match(analytics, /allow_ad_personalization_signals: false/);
});

test("strict public-page CSPs permit only the GA4 script and collection hosts", () => {
  for (const file of ["index.html", "pages/rosewood-fee-calculator.html", "pages/rosewood-fee-schedule.html"]) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1] || "";
    assert.match(csp, /script-src [^;]*https:\/\/www\.googletagmanager\.com/);
    assert.match(csp, /connect-src [^;]*https:\/\/www\.google-analytics\.com/);
    assert.match(csp, /connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
  }
});
