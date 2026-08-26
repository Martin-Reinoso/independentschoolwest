"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const calculator = require("../pages/rosewood-fee-calculator.js");

const trackedAnalyticsEvents = [];
const analyticsTracker = calculator.createAnalyticsTracker({
  track(eventName, parameters) {
    trackedAnalyticsEvents.push([eventName, parameters]);
  }
});

analyticsTracker.completeStep("family", "two");
analyticsTracker.completeStep("payment", "annual");
analyticsTracker.completeStep("not-a-step");
analyticsTracker.reset();
analyticsTracker.print();
analyticsTracker.openSchedule();
analyticsTracker.askQuestion();

assert.deepEqual(trackedAnalyticsEvents, [
  ["fee_calculator_started", undefined],
  ["fee_calculator_step_completed", { step: "family", option: "two" }],
  ["fee_estimate_updated", undefined],
  ["fee_calculator_step_completed", { step: "payment", option: "annual" }],
  ["fee_estimate_updated", undefined],
  ["fee_calculator_reset", undefined],
  ["fee_estimate_printed", undefined],
  ["fee_schedule_opened", undefined],
  ["fee_question_clicked", undefined]
], "Calculator analytics should report intent without selections or calculated values");

assert.equal(calculator.analyticsOptionForControl({ id: "student-count", value: "1", dataset: {} }), "one");
assert.equal(calculator.analyticsOptionForControl({ id: "student-count", value: "4", dataset: {} }), "four");
assert.equal(calculator.analyticsOptionForControl({ id: "student-count", value: "5", dataset: {} }), "five_plus");
assert.equal(calculator.analyticsOptionForControl({ id: "student-count", value: "20", dataset: {} }), "five_plus");
assert.equal(calculator.analyticsOptionForControl({ id: "payment-annual", dataset: { analyticsOption: "annual" } }), "annual");
assert.equal(calculator.analyticsOptionForControl({ id: "bond-paid", dataset: {} }), undefined);

const expectedFamilyTotals = {
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

assert.deepEqual(calculator.CONFIG.bondAmounts, { a: 200000, b10: 1000000, b20: 2000000 });

const compoundedSecondChild = calculator.calculateStudent(2, "b20", "annual");
assert.deepEqual(
  {
    foundation: compoundedSecondChild.foundationDiscountCents,
    sibling: compoundedSecondChild.siblingDiscountCents,
    bond: compoundedSecondChild.bondDiscountCents,
    annual: compoundedSecondChild.annualDiscountCents,
    netTuition: compoundedSecondChild.netTuitionCents
  },
  { foundation: 100000, sibling: 89850, bond: 25457, annual: 24185, netTuition: 459508 },
  "Foundation must be subtracted first, followed by compounding sibling, bond and annual-payment reductions"
);

for (const [bond, paymentPlans] of Object.entries(expectedFamilyTotals)) {
  for (const [payment, totals] of Object.entries(paymentPlans)) {
    totals.forEach((expectedCents, index) => {
      if (expectedCents == null) return;
      const children = index + 1;
      const result = calculator.calculateFamily({ children, bond, payment });
      assert.equal(
        result.annualFeeCents,
        expectedCents,
        `${children} children, ${bond}, ${payment}`
      );
      assert.equal(
        result.students.reduce((total, student) => total + student.annualFeeCents, 0),
        result.annualFeeCents,
        "Family total must equal the per-student rows"
      );
      assert.equal(
        result.netTuitionCents + result.resourceLevyCents,
        result.annualFeeCents,
        "Annual fees must reconcile to tuition plus resource levies"
      );
    });
  }
}

for (let children = 1; children <= calculator.CONFIG.maximumChildren; children += 1) {
  for (const bond of ["a", "b10", ...(children > 1 ? ["b20"] : [])]) {
    for (const payment of ["term", "annual"]) {
      const result = calculator.calculateFamily({ children, bond, payment });
      assert.equal(result.students.length, children);
      assert.equal(result.resourceLevyCents, children * calculator.CONFIG.resourceLevyCents);
      assert.equal(result.netTuitionCents + result.resourceLevyCents, result.annualFeeCents);
      assert.equal(result.termPaymentsCents.reduce((total, cents) => total + cents, 0), result.annualFeeCents);
      assert.equal(result.firstYearCommitmentCents, result.annualFeeCents + result.bondDueCents);
      assert.ok(result.students.every((student) => student.netTuitionCents >= 0));
      assert.ok(result.students.every((student) => student.foundationDiscountCents <= calculator.CONFIG.foundationDiscountCents));
    }
  }
}

const optionAFirstYear = calculator.calculateFamily({ children: 1, bond: "a", payment: "term" });
assert.equal(optionAFirstYear.firstYearCommitmentCents, 890000);
assert.equal(optionAFirstYear.bondDueCents, 200000);

const optionBTenFirstYear = calculator.calculateFamily({ children: 1, bond: "b10", payment: "term" });
assert.equal(optionBTenFirstYear.firstYearCommitmentCents, 1660050);
assert.equal(optionBTenFirstYear.bondDueCents, 1000000);

const optionBTwentyFirstYear = calculator.calculateFamily({ children: 2, bond: "b20", payment: "annual" });
assert.equal(optionBTwentyFirstYear.firstYearCommitmentCents, 3182106);
assert.equal(optionBTwentyFirstYear.bondDueCents, 2000000);

const optionBTwentyUpgrade = calculator.calculateFamily({
  children: 2,
  bond: "b20",
  payment: "annual",
  bondAlreadyPaidCents: 1000000
});
assert.equal(optionBTwentyUpgrade.bondDueCents, 1000000);
assert.equal(optionBTwentyUpgrade.firstYearCommitmentCents, 2182106);

const fullyPaidBond = calculator.calculateFamily({
  children: 2,
  bond: "b20",
  payment: "annual",
  bondAlreadyPaidCents: 2000000
});
assert.equal(fullyPaidBond.bondDueCents, 0);
assert.equal(fullyPaidBond.firstYearCommitmentCents, fullyPaidBond.annualFeeCents);

assert.throws(
  () => calculator.calculateFamily({ children: 2, bond: "b20", payment: "term", bondAlreadyPaidCents: 200000 }),
  /recorded bond payment is not valid/
);

const fiveChildren = calculator.calculateFamily({ children: 5, bond: "a", payment: "annual" });
assert.equal(fiveChildren.students[4].netTuitionCents, 0, "Fifth-child tuition must remain zero");
assert.equal(fiveChildren.students[4].foundationDiscountCents, 100000, "Every 2027 student receives the Foundation reduction before percentage reductions");
assert.equal(fiveChildren.students[4].siblingDiscountCents, 599000, "The fifth-child sibling reduction clears the tuition remaining after the Foundation reduction");
assert.equal(fiveChildren.students[4].annualFeeCents, 91000, "Fifth child still pays the resource levy");

const eightChildren = calculator.calculateFamily({ children: 8, bond: "b20", payment: "annual" });
assert.deepEqual(
  eightChildren.students.slice(4).map((student) => student.annualFeeCents),
  [91000, 91000, 91000, 91000],
  "Every fifth and subsequent child must remain levy-only"
);

const twentyChildren = calculator.calculateFamily({ children: 20, bond: "b20", payment: "annual" });
assert.equal(twentyChildren.students.length, 20);
assert.ok(twentyChildren.students.slice(4).every((student) => student.annualFeeCents === 91000));

const twoChildrenByTerm = calculator.calculateFamily({ children: 2, bond: "a", payment: "term" });
assert.deepEqual(twoChildrenByTerm.termPaymentsCents, [459038, 277038, 277037, 277037]);
assert.equal(
  twoChildrenByTerm.termPaymentsCents.reduce((total, amount) => total + amount, 0),
  twoChildrenByTerm.annualFeeCents,
  "Term payments must reconcile exactly"
);

assert.throws(
  () => calculator.calculateFamily({ children: 1, bond: "b20", payment: "term" }),
  /requires at least two children/
);
assert.throws(
  () => calculator.calculateFamily({ children: 0, bond: "a", payment: "term" }),
  /Children must be an integer/
);

const calculatorSource = fs.readFileSync(path.join(__dirname, "../pages/rosewood-fee-calculator.js"), "utf8");
const calculatorHtml = fs.readFileSync(path.join(__dirname, "../pages/rosewood-fee-calculator.html"), "utf8");

assert.match(calculatorSource, /createAnalyticsTracker\(global\.ffeAnalytics\)/);
assert.match(calculatorSource, /analyticsTracker\.completeStep\([\s\S]+event\.target\.dataset\.analyticsStep,[\s\S]+analyticsOptionForControl\(event\.target\)/);
assert.match(calculatorSource, /analyticsTracker\.reset\(\)/);
assert.match(calculatorSource, /analyticsTracker\.print\(\)/);
assert.match(calculatorSource, /\[data-analytics-action="schedule"\]/);
assert.match(calculatorSource, /\[data-analytics-action="question"\]/);
assert.equal((calculatorHtml.match(/data-analytics-step="family"/g) || []).length, 1);
assert.equal((calculatorHtml.match(/data-analytics-step="payment"/g) || []).length, 2);
assert.equal((calculatorHtml.match(/data-analytics-step="bond"/g) || []).length, 4);
assert.equal((calculatorHtml.match(/data-analytics-option="term"/g) || []).length, 1);
assert.equal((calculatorHtml.match(/data-analytics-option="annual"/g) || []).length, 1);
assert.equal((calculatorHtml.match(/data-analytics-option="option_a"/g) || []).length, 1);
assert.equal((calculatorHtml.match(/data-analytics-option="option_b_10k"/g) || []).length, 1);
assert.equal((calculatorHtml.match(/data-analytics-option="option_b_20k"/g) || []).length, 1);
assert.equal((calculatorHtml.match(/data-analytics-action="schedule"/g) || []).length, 2);
assert.equal((calculatorHtml.match(/data-analytics-action="question"/g) || []).length, 1);
assert.doesNotMatch(calculatorHtml, /nothing is saved or sent/i);
assert.match(calculatorHtml, /broad option categories may be measured/i);

console.log("Rosewood fee calculator tests passed.");
