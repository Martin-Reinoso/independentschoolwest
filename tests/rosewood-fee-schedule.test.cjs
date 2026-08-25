"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const schedulePath = path.join(repoRoot, "pages/rosewood-fee-schedule.html");
const cssPath = path.join(repoRoot, "pages/rosewood-fee-schedule.css");
const schedule = fs.readFileSync(schedulePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const calculator = fs.readFileSync(path.join(repoRoot, "pages/rosewood-fee-calculator.html"), "utf8");
const calculatorV2 = fs.readFileSync(path.join(repoRoot, "pages/rosewood-fee-calculator-v2.html"), "utf8");
const homepage = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(repoRoot, "sitemap.xml"), "utf8");

assert.match(schedule, /<title>2027 Fee Schedule \| Rosewood College<\/title>/);
assert.match(schedule, /rel="canonical" href="https:\/\/ffe\.org\.au\/pages\/rosewood-fee-schedule\.html"/);
assert.doesNotMatch(schedule, /noindex/);
assert.match(schedule, /\$1,000[\s\S]+reduction from tuition for every student/);
assert.doesNotMatch(schedule, /Each reduction builds on the one before it/);
assert.doesNotMatch(schedule, /class="section discount-order"/);
assert.doesNotMatch(schedule, /Second child · Option B for siblings · annual payment/);
assert.match(schedule, /5th and every child after/);
assert.match(schedule, /100% tuition reduction/);
assert.match(schedule, /Books and stationery/);
assert.match(schedule, /Camps and excursions/);
assert.match(schedule, /Returned when the last family member leaves Rosewood/);
assert.match(schedule, /Returned when the first child leaves Rosewood/);
assert.match(schedule, /first \$10,000 is returned when the first child leaves; the second \$10,000 when the last child leaves/);
assert.match(schedule, /href="rosewood-fee-calculator\.html"/);
assert.match(calculator, /href="rosewood-fee-schedule\.html"/);
assert.match(calculatorV2, /href="rosewood-fee-schedule\.html"/);
assert.match(homepage, /href="pages\/rosewood-fee-schedule\.html"/);
assert.match(sitemap, /https:\/\/ffe\.org\.au\/pages\/rosewood-fee-schedule\.html/);
assert.match(css, /@media \(max-width: 720px\)/);
assert.match(css, /:focus-visible/);

console.log("Rosewood fee schedule tests passed.");
