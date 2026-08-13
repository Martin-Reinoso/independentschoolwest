import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("V6.11 retains Google address assistance for EOI without replacing manual address fields", async () => {
  const javascript = await source("pages/rosewood-enrolment-v6.js");

  assert.match(javascript, /PlaceAutocompleteElement/);
  assert.match(javascript, /fields: \["addressComponents"\]/);
  assert.match(javascript, /Suggestions are provided by Google\. You can also enter the address manually below\./);
  assert.match(javascript, /data-address-line="\$\{esc\(fields\.line\)\}"/);
  assert.match(javascript, /line: "student_address", suburb: "student_suburb", state: "student_state", postcode: "student_postcode", country: "student_country"/);
  assert.match(javascript, /line: "eoi_address", suburb: "eoi_suburb", state: "eoi_state", postcode: "eoi_postcode", country: "eoi_country"/);
  assert.match(javascript, /"\/v6\/eoi\/config"/);
  assert.match(javascript, /control\?\.tagName === "SELECT"/);
  assert.match(javascript, /value = stateLong/);
  assert.match(javascript, /prefix \+ "postal_address"/);
  assert.match(javascript, /scheduleAutosave\(\)/);
  assert.doesNotMatch(javascript, /navigator\.geolocation|getCurrentPosition|formattedAddress|location\.lat/);
});

test("the restricted browser key is loaded from runtime contexts and never static assets", async () => {
  const [html, javascript] = await Promise.all([
    source("pages/rosewood-enrolment-v6.html"),
    source("pages/rosewood-enrolment-v6.js")
  ]);

  assert.match(javascript, /state\.workflow === "eoi" \? state\.eoiAddressAutocomplete : state\.applicationContext\?\.addressAutocomplete/);
  assert.match(javascript, /config\?\.enabled === true && config\.provider === "google_places" && config\.apiKey/);
  assert.doesNotMatch(html, /AIza[0-9A-Za-z_-]+/);
  assert.doesNotMatch(javascript, /AIza[0-9A-Za-z_-]+/);
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/);
  assert.match(javascript, /auth_referrer_policy=origin/);
  assert.match(html, /script-src 'self' https:\/\/maps\.googleapis\.com https:\/\/\*\.gstatic\.com/);
  assert.match(html, /connect-src[^;]+https:\/\/places\.googleapis\.com/);
});

test("address assistance fails open to an accessible manual-entry path", async () => {
  const [javascript, css] = await Promise.all([
    source("pages/rosewood-enrolment-v6.js"),
    source("pages/rosewood-enrolment-v6.css")
  ]);

  assert.match(javascript, /Address suggestions are unavailable right now\. Please enter the address manually below\./);
  assert.match(javascript, /data-address-status role="status"/);
  assert.match(javascript, /autocomplete\.setAttribute\("aria-labelledby", labelId\)/);
  assert.match(css, /\.address-lookup-widget:focus-within/);
  assert.match(css, /\.address-lookup-widget gmp-place-autocomplete \{ width: 100%/);
});
