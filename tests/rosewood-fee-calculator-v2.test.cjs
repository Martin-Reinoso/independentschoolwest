"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../pages/rosewood-fee-calculator.js");
const planner = require("../pages/rosewood-fee-calculator-v2.js");

const goldenAnnualFees = {
  a: {
    term: [690000, 1290150, 1800450, 2220900, 2311900],
    annual: [660050, 1234743, 1724078, 2128056, 2219056]
  },
  b10: {
    term: [660050, 1260200, 1770500, 2190950, 2281950],
    annual: [631598, 1206291, 1695626, 2099604, 2190604]
  },
  b20: {
    term: [null, 1234743, 1724078, 2128056, 2219056],
    annual: [null, 1182106, 1651524, 2039853, 2130853]
  }
};

for (const [bond, paymentPlans] of Object.entries(goldenAnnualFees)) {
  for (const [payment, totals] of Object.entries(paymentPlans)) {
    totals.forEach((expectedAnnualFeeCents, index) => {
      if (expectedAnnualFeeCents == null) return;
      const children = index + 1;
      const view = planner.calculatePlanningView({ children, payment, bond });
      assert.equal(view.result.annualFeeCents, expectedAnnualFeeCents, `${children} children, ${bond}, ${payment}`);
    });
  }
}

const representativeVectors = [
  {
    selection: { children: 1, payment: "term", bond: "a" },
    annual: 690000,
    schedule: [240750, 149750, 149750, 149750],
    weekly: 13269,
    fortnightly: 26538,
    reductions: 100000,
    bondDue: 200000,
    combined: 890000,
    annualChoiceSaving: 29950
  },
  {
    selection: { children: 1, payment: "annual", bond: "a" },
    annual: 660050,
    schedule: [660050],
    weekly: 12693,
    fortnightly: 25387,
    reductions: 129950,
    bondDue: 200000,
    combined: 860050,
    annualChoiceSaving: 29950
  },
  {
    selection: { children: 1, payment: "annual", bond: "b10" },
    annual: 631598,
    schedule: [631598],
    weekly: 12146,
    fortnightly: 24292,
    reductions: 158402,
    bondDue: 1000000,
    combined: 1631598,
    annualChoiceSaving: 28452
  },
  {
    selection: { children: 2, payment: "term", bond: "a" },
    annual: 1290150,
    schedule: [459038, 277038, 277037, 277037],
    weekly: 24811,
    fortnightly: 49621,
    reductions: 289850,
    bondDue: 200000,
    combined: 1490150,
    annualChoiceSaving: 55407
  },
  {
    selection: { children: 2, payment: "term", bond: "b20" },
    annual: 1234743,
    schedule: [445186, 263186, 263186, 263185],
    weekly: 23745,
    fortnightly: 47490,
    reductions: 345257,
    bondDue: 2000000,
    combined: 3234743,
    annualChoiceSaving: 52637
  },
  {
    selection: { children: 2, payment: "annual", bond: "b20" },
    annual: 1182106,
    schedule: [1182106],
    weekly: 22733,
    fortnightly: 45466,
    reductions: 397894,
    bondDue: 2000000,
    combined: 3182106,
    annualChoiceSaving: 52637
  },
  {
    selection: { children: 5, payment: "annual", bond: "b20" },
    annual: 2130853,
    schedule: [2130853],
    weekly: 40978,
    fortnightly: 81956,
    reductions: 1819147,
    bondDue: 2000000,
    combined: 4130853,
    annualChoiceSaving: 88203
  }
];

for (const vector of representativeVectors) {
  const view = planner.calculatePlanningView(vector.selection);
  assert.equal(view.result.annualFeeCents, vector.annual);
  assert.deepEqual(view.selectedSchedule.map((item) => item.amountCents), vector.schedule);
  assert.equal(view.weeklyEquivalentCents, vector.weekly);
  assert.equal(view.fortnightlyEquivalentCents, vector.fortnightly);
  assert.equal(view.totalReductionsCents, vector.reductions);
  assert.equal(view.result.bondDueCents, vector.bondDue);
  assert.equal(view.result.firstYearCommitmentCents, vector.combined);
  assert.equal(view.annualChoiceSavingCents, vector.annualChoiceSaving);
}

for (let children = 1; children <= engine.CONFIG.maximumChildren; children += 1) {
  const eligibleBonds = ["a", "b10", ...(children >= 2 ? ["b20"] : [])];
  for (const bond of eligibleBonds) {
    for (const payment of ["term", "annual"]) {
      const view = planner.calculatePlanningView({ children, bond, payment });
      const result = view.result;
      assert.equal(view.publishedTuitionBeforeReductionsCents, result.baseTuitionCents);
      assert.equal(view.nonDiscountableLevyCents, result.resourceLevyCents);
      assert.equal(view.totalReductionsCents, result.siblingDiscountCents + result.bondDiscountCents + result.annualDiscountCents + result.foundationDiscountCents);
      assert.equal(view.automaticReductionsCents, result.siblingDiscountCents + result.foundationDiscountCents);
      assert.equal(view.choiceReductionsCents, result.bondDiscountCents + result.annualDiscountCents);
      assert.equal(view.automaticReductionsCents + view.choiceReductionsCents, view.totalReductionsCents);
      assert.equal(view.publishedTuitionBeforeReductionsCents - view.totalReductionsCents, result.netTuitionCents);
      assert.equal(result.netTuitionCents + view.nonDiscountableLevyCents, result.annualFeeCents);
      assert.equal(view.weeklyEquivalentCents, planner.roundDivide(result.annualFeeCents, 52));
      assert.equal(view.fortnightlyEquivalentCents, planner.roundDivide(result.annualFeeCents, 26));
      assert.equal(result.bondAlreadyPaidCents, 0, "V2 must remain a hypothetical calculator without payment history");
      assert.equal(result.bondDueCents, result.bondAmountCents);
      assert.equal(result.firstYearCommitmentCents, result.annualFeeCents + result.bondAmountCents);
      assert.equal(view.selectedSchedule.reduce((sum, item) => sum + item.amountCents, 0), result.annualFeeCents);
      if (payment === "term") {
        assert.equal(view.selectedSchedule.length, 4);
        assert.equal(view.selectedSchedule[0].amountCents - result.tuitionByTermCents[0], result.resourceLevyCents);
        for (let index = 1; index < 4; index += 1) {
          assert.equal(view.selectedSchedule[index].amountCents, result.tuitionByTermCents[index]);
        }
      } else {
        assert.equal(view.selectedSchedule.length, 1);
        assert.equal(view.selectedSchedule[0].amountCents, result.annualFeeCents);
      }
    }
  }
}

const ignoredPaymentHistory = planner.calculatePlanningView({ children: 2, payment: "annual", bond: "b20", bondAlreadyPaidCents: 1000000 });
assert.equal(ignoredPaymentHistory.result.bondAlreadyPaidCents, 0, "V2 must ignore payment-history input");
assert.equal(ignoredPaymentHistory.result.bondDueCents, 2000000);

const oneChildAAnnual = planner.calculatePlanningView({ children: 1, payment: "annual", bond: "a" });
const b10Comparison = planner.calculateBondComparison(oneChildAAnnual, "b10");
assert.equal(b10Comparison.annualFeeDifferenceCents, -28452, "Bond choice comparisons must use engine-to-engine fee differences");
assert.equal(b10Comparison.bondAmountDifferenceCents, 800000);

const twoChildAAnnual = planner.calculatePlanningView({ children: 2, payment: "annual", bond: "a" });
const b20Comparison = planner.calculateBondComparison(twoChildAAnnual, "b20");
assert.equal(b20Comparison.annualFeeDifferenceCents, -52637);
assert.equal(b20Comparison.bondAmountDifferenceCents, 1800000);

assert.equal(planner.roundDivide(631598, 52), 12146);
assert.equal(planner.roundDivide(631598, 26), 24292);
assert.notEqual(planner.roundDivide(660050, 26), planner.roundDivide(660050, 52) * 2, "Fortnightly must be rounded independently");
assert.throws(() => planner.roundDivide(-1, 52), RangeError);
assert.throws(() => planner.roundDivide(100, 0), RangeError);
assert.throws(() => planner.calculatePlanningView({ children: 1, payment: "term", bond: "b20" }), RangeError);

const repoRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(repoRoot, "pages/rosewood-fee-calculator-v2.html"), "utf8");
const css = fs.readFileSync(path.join(repoRoot, "pages/rosewood-fee-calculator-v2.css"), "utf8");
const script = fs.readFileSync(path.join(repoRoot, "pages/rosewood-fee-calculator-v2.js"), "utf8");
const homepage = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(repoRoot, "sitemap.xml"), "utf8");

assert.match(html, /noindex, nofollow, noarchive, nosnippet/);
assert.match(html, /A gentler way to plan/);
assert.match(html, /not payment plans offered by the College/);
assert.match(html, /excludes the refundable bond/);
assert.match(html, /Full hypothetical picture/);
assert.match(html, /Student Resource Levy included in annual fees supports books, stationery, IT equipment, camps, excursions/);
assert.match(html, /Option A keeps the bond lower\. Option B uses a larger refundable bond to unlock an ongoing tuition reduction/);
assert.match(html, /update this estimate instantly/);
assert.match(html, /the 5% tuition reduction applies immediately/);
assert.match(html, /\$1,000 Foundation Year reduction/);
assert.match(html, /From the fifth child onwards, tuition is fully reduced/);
assert.match(html, /id="v2-large-family-count" type="number" min="5" max="20"/);
assert.doesNotMatch(html, /Both options are equally valid/);
assert.match(html, /Any applicable sibling, bond and annual-payment discounts are then calculated on the remaining tuition/);
assert.doesNotMatch(html, /compound|multiply rather than add/i);
assert.doesNotMatch(html, /Foundation reduction order:/);
assert.match(html, /href="rosewood-fee-schedule\.html"/);
assert.match(html, /id="estimate-heading" tabindex="-1"/);
assert.doesNotMatch(html, /How much of this bond arrangement has your family already paid/);
assert.doesNotMatch(html, /id="v2-bond-paid"/);
assert.doesNotMatch(html, /bond still due/i);
assert.match(html, /id="static-fee-fallback"/);
assert.match(html, /id="print-incomplete-title"/);
assert.ok(html.indexOf('id="foundation-benefit"') < html.indexOf('id="v2-annual-fees"'), "Foundation savings must appear before the total annual fee");
assert.ok(html.indexOf('id="weekly-equivalent"') < html.indexOf('id="v2-annual-fees"'), "Budgeting equivalents must appear before the total annual fee");
assert.ok(html.indexOf('data-dialog-panel="calculation"') < html.indexOf('data-dialog-panel="payment"'), "Calculation details must be the first supporting action");
assert.match(html, /<dialog[^>]+id="fee-detail-dialog"/);
assert.doesNotMatch(script, /localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest/);
assert.match(script, /Total bond arrangement/);
assert.match(script, /renderEstimate\(\);\s*settleOpportunityFocus/);
assert.match(script, /classList\.toggle\("has-completed-estimate"/);
assert.match(script, /staticFallback\.hidden = true/);
assert.match(css, /body:not\(\.has-completed-estimate\) \.print-incomplete/);
assert.match(css, /body:not\(\.has-completed-estimate\) \.estimate/);
assert.match(css, /body\.has-completed-estimate \.estimate/);
assert.doesNotMatch(homepage, /rosewood-fee-calculator-v2\.html/);
assert.doesNotMatch(sitemap, /rosewood-fee-calculator-v2\.html/);

console.log("Rosewood fee planner V2 tests passed.");
