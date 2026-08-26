const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

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

function runAnalytics(pathname = "/pages/rosewood-fee-calculator.html") {
  const executableAnalytics = analytics.replace("G-XXXXXXXXXX", "G-TEST12345");
  const appendedScripts = [];
  const context = {
    URL,
    Date,
    document: {
      title: "Rosewood fee calculator",
      referrer: "https://example.com/source?private=value#fragment",
      createElement: () => ({}),
      head: { append: script => appendedScripts.push(script) }
    },
    window: {
      location: { origin: "https://ffe.org.au", pathname }
    }
  };
  vm.runInNewContext(executableAnalytics, context);
  return { window: context.window, appendedScripts };
}

function normaliseDataLayer(dataLayer) {
  return Array.from(dataLayer, entry => JSON.parse(JSON.stringify(Array.from(entry))));
}

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
  assert.match(analytics, /const pageLocation = `\$\{window\.location\.origin\}\$\{window\.location\.pathname\}`/);
  assert.match(analytics, /const pageReferrer = sanitiseUrl\(document\.referrer\)/);
  assert.match(analytics, /page_location: pageLocation/);
  assert.match(analytics, /page_path: window\.location\.pathname/);
  assert.match(analytics, /page_referrer: pageReferrer/);
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

test("the public analytics interface accepts only approved calculator events", () => {
  const { window } = runAnalytics();

  assert.equal(typeof window.ffeAnalytics.track, "function");
  window.ffeAnalytics.track("fee_calculator_started");
  window.ffeAnalytics.track("not_an_approved_event", { fee: 6900 });

  const events = normaliseDataLayer(window.dataLayer);
  assert.deepEqual(events.at(-1), ["event", "fee_calculator_started", {}]);
  assert.equal(events.some(entry => entry[1] === "not_an_approved_event"), false);
});

test("calculator analytics strips raw selections and permits only safe categorical labels", () => {
  const { window } = runAnalytics();

  window.ffeAnalytics.track("fee_calculator_step_completed", {
    step: "payment",
    option: "annual",
    children: 3,
    payment: "annual",
    bond: "b20",
    fee: 17240.78
  });
  window.ffeAnalytics.track("fee_calculator_step_completed", { step: "private-value" });

  const events = normaliseDataLayer(window.dataLayer);
  assert.deepEqual(events.at(-1), ["event", "fee_calculator_step_completed", {
    step: "payment",
    option: "annual"
  }]);
  assert.equal(events.filter(entry => entry[1] === "fee_calculator_step_completed").length, 1);
});

test("calculator option reporting accepts only predefined categorical labels", () => {
  const { window } = runAnalytics();

  window.ffeAnalytics.track("fee_calculator_step_completed", { step: "family", option: "five_plus" });
  window.ffeAnalytics.track("fee_calculator_step_completed", { step: "bond", option: "private-value" });

  const events = normaliseDataLayer(window.dataLayer)
    .filter(entry => entry[1] === "fee_calculator_step_completed");
  assert.deepEqual(events, [
    ["event", "fee_calculator_step_completed", { step: "family", option: "five_plus" }],
    ["event", "fee_calculator_step_completed", { step: "bond" }]
  ]);
});

test("all GA4 events inherit sanitised page context", () => {
  const { window } = runAnalytics();
  const config = normaliseDataLayer(window.dataLayer).find(entry => entry[0] === "config");

  assert.equal(config[2].page_location, "https://ffe.org.au/pages/rosewood-fee-calculator.html");
  assert.equal(config[2].page_referrer, "https://example.com/source");
});

test("the GA4 release guide requires Enhanced Measurement to stay disabled", () => {
  const guidePath = path.join(root, "docs/ga4-setup.md");
  assert.equal(fs.existsSync(guidePath), true, "docs/ga4-setup.md must exist");
  const guide = fs.readFileSync(guidePath, "utf8");
  assert.match(guide, /Enhanced Measurement[^\n]+disabled/i);
  assert.match(guide, /outbound[^\n]+URL/i);
});
