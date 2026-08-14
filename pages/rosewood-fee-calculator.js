(function initialiseRosewoodFeeCalculator(global) {
  "use strict";

  const CONFIG = Object.freeze({
    tuitionCents: 699000,
    resourceLevyCents: 91000,
    foundationDiscountCents: 100000,
    annualNetBasisPoints: 9500,
    standardNetBasisPoints: 10000,
    siblingNetBasisPoints: Object.freeze([10000, 8500, 7000, 5500, 0]),
    maximumChildren: 20,
    terms: 4,
    bondAmounts: Object.freeze({ a: 200000, b10: 1000000, b20: 2000000 })
  });

  const BOND_LABELS = Object.freeze({
    a: "Option A",
    b10: "Option B ($10,000)",
    b20: "Option B ($20,000)"
  });

  function roundRate(cents, basisPoints) {
    return Math.floor(((cents * basisPoints) + 5000) / 10000);
  }

  function siblingNetBasisPoints(position) {
    return CONFIG.siblingNetBasisPoints[Math.min(position - 1, CONFIG.siblingNetBasisPoints.length - 1)];
  }

  function bondNetBasisPoints(bond, position) {
    if (bond === "b20") return 9500;
    if (bond === "b10" && position === 1) return 9500;
    return CONFIG.standardNetBasisPoints;
  }

  function ordinal(value) {
    const remainderTen = value % 10;
    const remainderHundred = value % 100;
    if (remainderTen === 1 && remainderHundred !== 11) return `${value}st`;
    if (remainderTen === 2 && remainderHundred !== 12) return `${value}nd`;
    if (remainderTen === 3 && remainderHundred !== 13) return `${value}rd`;
    return `${value}th`;
  }

  function validateSelections(selections) {
    const children = Number(selections.children);
    if (!Number.isInteger(children) || children < 1 || children > CONFIG.maximumChildren) {
      throw new RangeError(`Children must be an integer from 1 to ${CONFIG.maximumChildren}.`);
    }
    if (!Object.hasOwn(CONFIG.bondAmounts, selections.bond)) {
      throw new TypeError("Unknown bond arrangement.");
    }
    if (selections.bond === "b20" && children < 2) {
      throw new RangeError("The $20,000 bond requires at least two children.");
    }
    if (selections.payment !== "term" && selections.payment !== "annual") {
      throw new TypeError("Unknown payment plan.");
    }
    const bondAlreadyPaidCents = Number(selections.bondAlreadyPaidCents ?? 0);
    const allowedPaidAmounts = selections.bond === "b20"
      ? [0, 1000000, 2000000]
      : [0, CONFIG.bondAmounts[selections.bond]];
    if (!Number.isInteger(bondAlreadyPaidCents) || !allowedPaidAmounts.includes(bondAlreadyPaidCents)) {
      throw new RangeError("The recorded bond payment is not valid for this arrangement.");
    }
    return { children, bond: selections.bond, payment: selections.payment, bondAlreadyPaidCents };
  }

  function calculateStudent(position, bond, payment) {
    const baseTuitionCents = CONFIG.tuitionCents;
    const foundationDiscountCents = Math.min(CONFIG.foundationDiscountCents, baseTuitionCents);
    const afterFoundationCents = baseTuitionCents - foundationDiscountCents;

    const siblingBasisPoints = siblingNetBasisPoints(position);
    const afterSiblingCents = roundRate(afterFoundationCents, siblingBasisPoints);
    const siblingDiscountCents = afterFoundationCents - afterSiblingCents;

    const bondBasisPoints = bondNetBasisPoints(bond, position);
    const afterBondCents = roundRate(afterSiblingCents, bondBasisPoints);
    const bondDiscountCents = afterSiblingCents - afterBondCents;

    const annualBasisPoints = payment === "annual" ? CONFIG.annualNetBasisPoints : CONFIG.standardNetBasisPoints;
    const afterAnnualCents = roundRate(afterBondCents, annualBasisPoints);
    const annualDiscountCents = afterBondCents - afterAnnualCents;

    const netTuitionCents = afterAnnualCents;
    const annualFeeCents = netTuitionCents + CONFIG.resourceLevyCents;

    return Object.freeze({
      position,
      label: `${ordinal(position)} child`,
      baseTuitionCents,
      siblingDiscountCents,
      bondDiscountCents,
      annualDiscountCents,
      foundationDiscountCents,
      netTuitionCents,
      resourceLevyCents: CONFIG.resourceLevyCents,
      annualFeeCents
    });
  }

  function allocateEvenly(cents, parts) {
    const base = Math.floor(cents / parts);
    const remainder = cents % parts;
    return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
  }

  function sum(students, key) {
    return students.reduce((total, student) => total + student[key], 0);
  }

  function calculateFamily(rawSelections) {
    const selections = validateSelections(rawSelections);
    const students = Array.from(
      { length: selections.children },
      (_, index) => calculateStudent(index + 1, selections.bond, selections.payment)
    );

    const baseTuitionCents = sum(students, "baseTuitionCents");
    const siblingDiscountCents = sum(students, "siblingDiscountCents");
    const bondDiscountCents = sum(students, "bondDiscountCents");
    const annualDiscountCents = sum(students, "annualDiscountCents");
    const foundationDiscountCents = sum(students, "foundationDiscountCents");
    const netTuitionCents = sum(students, "netTuitionCents");
    const resourceLevyCents = sum(students, "resourceLevyCents");
    const annualFeeCents = sum(students, "annualFeeCents");
    const bondAmountCents = CONFIG.bondAmounts[selections.bond];
    const bondDueCents = bondAmountCents - selections.bondAlreadyPaidCents;
    const firstYearCommitmentCents = annualFeeCents + bondDueCents;

    const tuitionByTermCents = allocateEvenly(netTuitionCents, CONFIG.terms);
    const termPaymentsCents = tuitionByTermCents.map((tuitionCents, index) => (
      tuitionCents + (index === 0 ? resourceLevyCents : 0)
    ));

    return Object.freeze({
      ...selections,
      students,
      baseTuitionCents,
      siblingDiscountCents,
      bondDiscountCents,
      annualDiscountCents,
      foundationDiscountCents,
      netTuitionCents,
      resourceLevyCents,
      annualFeeCents,
      bondAmountCents,
      bondDueCents,
      firstYearCommitmentCents,
      tuitionByTermCents: Object.freeze(tuitionByTermCents),
      termPaymentsCents: Object.freeze(termPaymentsCents)
    });
  }

  const api = Object.freeze({ CONFIG, allocateEvenly, calculateFamily, calculateStudent, roundRate });
  global.RosewoodFeeCalculator = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function startBrowserCalculator() {
    const form = document.querySelector("#fee-form");
    if (!form) return;

    const currency = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const elements = {
      studentCount: document.querySelector("#student-count"),
      bondPaid: document.querySelector("#bond-paid"),
      bondPaidHelp: document.querySelector("#bond-paid-help"),
      bondB20: document.querySelector("#bond-b20"),
      bondB20Card: document.querySelector("#bond-b20-card"),
      selectionMessage: document.querySelector("#selection-message"),
      annualTotalLive: document.querySelector("#annual-total-live"),
      estimateSummary: document.querySelector("#estimate-summary"),
      annualFees: document.querySelector("#annual-fees"),
      bondAmount: document.querySelector("#bond-amount"),
      bondSummary: document.querySelector("#bond-summary"),
      firstYearTotal: document.querySelector("#first-year-total"),
      savingNote: document.querySelector("#saving-note"),
      annualSaving: document.querySelector("#annual-saving"),
      baseTuition: document.querySelector("#base-tuition"),
      siblingDiscount: document.querySelector("#sibling-discount"),
      bondDiscount: document.querySelector("#bond-discount"),
      annualDiscount: document.querySelector("#annual-discount"),
      foundationDiscount: document.querySelector("#foundation-discount"),
      netTuition: document.querySelector("#net-tuition"),
      resourceLevy: document.querySelector("#resource-levy"),
      breakdownTotal: document.querySelector("#breakdown-total"),
      paymentSchedule: document.querySelector("#payment-schedule"),
      scheduleNote: document.querySelector("#schedule-note"),
      studentBreakdownBody: document.querySelector("#student-breakdown-body"),
      reset: document.querySelector("#reset-calculator"),
      print: document.querySelector("#print-estimate")
    };

    function format(cents) {
      return currency.format(cents / 100);
    }

    function formatDiscount(cents) {
      return cents === 0 ? format(0) : `-${format(cents)}`;
    }

    function currentSelections() {
      return {
        children: Number(elements.studentCount.value),
        payment: form.elements.namedItem("payment").value,
        bond: form.elements.namedItem("bond").value,
        bondAlreadyPaidCents: Number(elements.bondPaid.value)
      };
    }

    function updateBondPaidOptions(bond) {
      const previousValue = Number(elements.bondPaid.value || 0);
      const bondAmountCents = CONFIG.bondAmounts[bond];
      const allowedAmounts = bond === "b20" ? [0, 1000000, 2000000] : [0, bondAmountCents];
      const options = allowedAmounts.map((amountCents) => {
        const option = document.createElement("option");
        option.value = String(amountCents);
        if (amountCents === 0) option.textContent = "Nothing yet";
        else if (bond === "b20" && amountCents === 1000000) option.textContent = "The first $10,000 Option B bond";
        else option.textContent = "The full selected bond";
        return option;
      });
      elements.bondPaid.replaceChildren(...options);
      elements.bondPaid.value = String(allowedAmounts.includes(previousValue) ? previousValue : 0);
      elements.bondPaidHelp.textContent = bond === "b20"
        ? "Choose the first $10,000 only if your family has already paid the first Option B bond and is adding the second $10,000 described in the fee schedule. Changes from Option A, refunds and other adjustments are not modelled; contact the College."
        : "This changes only the bond payment included in this estimate. Changes from Option A to Option B, refunds and other bond adjustments are not modelled; contact the College.";
    }

    function makeScheduleRow(label, detail, cents) {
      const row = document.createElement("div");
      row.className = "schedule-row";
      const strong = document.createElement("strong");
      strong.textContent = label;
      const small = document.createElement("small");
      small.textContent = detail;
      const value = document.createElement("span");
      value.textContent = format(cents);
      row.append(strong, small, value);
      return row;
    }

    function renderSchedule(result) {
      elements.paymentSchedule.replaceChildren();
      if (result.payment === "annual") {
        elements.paymentSchedule.append(makeScheduleRow(
          "Full-year payment",
          "Due at the start of Term 1",
          result.annualFeeCents
        ));
        elements.scheduleNote.textContent = "This includes the 5% annual-payment tuition discount and the full Student Resource Levy. The fee schedule allows 14 days for payment.";
        return;
      }

      result.termPaymentsCents.forEach((amountCents, index) => {
        const detail = index === 0
          ? "Estimated tuition instalment plus the full resource levy"
          : "Estimated tuition instalment";
        elements.paymentSchedule.append(makeScheduleRow(`Term ${index + 1}`, detail, amountCents));
      });
      elements.scheduleNote.textContent = "Tuition is divided across four indicative term invoices. The full resource levy is added to Term 1. Invoices allow 14 days for payment.";
    }

    function tableCell(text, className) {
      const cell = document.createElement("td");
      cell.textContent = text;
      if (className) cell.className = className;
      return cell;
    }

    function renderStudents(result) {
      const rows = result.students.map((student) => {
        const row = document.createElement("tr");
        row.append(
          tableCell(student.label),
          tableCell(formatDiscount(student.siblingDiscountCents), student.siblingDiscountCents === 0 ? "zero-discount" : ""),
          tableCell(formatDiscount(student.bondDiscountCents), student.bondDiscountCents === 0 ? "zero-discount" : ""),
          tableCell(formatDiscount(student.annualDiscountCents), student.annualDiscountCents === 0 ? "zero-discount" : ""),
          tableCell(formatDiscount(student.foundationDiscountCents), student.foundationDiscountCents === 0 ? "zero-discount" : ""),
          tableCell(format(student.resourceLevyCents)),
          tableCell(format(student.annualFeeCents))
        );
        return row;
      });
      elements.studentBreakdownBody.replaceChildren(...rows);
    }

    function updateBondAvailability(children) {
      const unavailable = children < 2;
      elements.bondB20.disabled = unavailable;
      elements.bondB20Card.classList.toggle("is-disabled", unavailable);
      if (unavailable && elements.bondB20.checked) {
        form.querySelector('input[name="bond"][value="b10"]').checked = true;
        elements.selectionMessage.textContent = "The $10,000 Option B bond was selected because the $20,000 option requires two or more children.";
      } else {
        elements.selectionMessage.textContent = "";
      }
    }

    function render() {
      const requestedChildren = Number(elements.studentCount.value);
      updateBondAvailability(requestedChildren);
      const selectedBond = form.elements.namedItem("bond").value;
      updateBondPaidOptions(selectedBond);
      const result = calculateFamily(currentSelections());
      const comparison = calculateFamily({
        children: result.children,
        bond: result.bond,
        payment: result.payment === "annual" ? "term" : "annual",
        bondAlreadyPaidCents: result.bondAlreadyPaidCents
      });
      const childLabel = result.children === 1 ? "1 child" : `${result.children} children`;
      const paymentLabel = result.payment === "annual" ? "paying annually" : "paying by term";

      elements.annualTotalLive.textContent = format(result.annualFeeCents);
      elements.estimateSummary.textContent = `For ${childLabel}, ${paymentLabel} with ${BOND_LABELS[result.bond]}.`;
      elements.annualFees.textContent = format(result.annualFeeCents);
      elements.bondAmount.textContent = format(result.bondDueCents);
      if (result.bondAlreadyPaidCents === 0) {
        elements.bondSummary.textContent = `${format(result.bondAmountCents)} selected; nothing recorded as paid`;
      } else if (result.bondDueCents === 0) {
        elements.bondSummary.textContent = `${format(result.bondAmountCents)} selected; full bond already paid`;
      } else {
        elements.bondSummary.textContent = `${format(result.bondAmountCents)} selected; ${format(result.bondAlreadyPaidCents)} already paid`;
      }
      elements.firstYearTotal.textContent = format(result.firstYearCommitmentCents);

      elements.baseTuition.textContent = format(result.baseTuitionCents);
      elements.siblingDiscount.textContent = formatDiscount(result.siblingDiscountCents);
      elements.bondDiscount.textContent = formatDiscount(result.bondDiscountCents);
      elements.annualDiscount.textContent = formatDiscount(result.annualDiscountCents);
      elements.foundationDiscount.textContent = formatDiscount(result.foundationDiscountCents);
      elements.netTuition.textContent = format(result.netTuitionCents);
      elements.resourceLevy.textContent = format(result.resourceLevyCents);
      elements.breakdownTotal.textContent = format(result.annualFeeCents);

      const savingCents = result.payment === "annual"
        ? comparison.annualFeeCents - result.annualFeeCents
        : result.annualFeeCents - comparison.annualFeeCents;
      elements.annualSaving.textContent = format(savingCents);
      elements.savingNote.querySelector("p").replaceChildren();
      const savingText = document.createTextNode(result.payment === "annual"
        ? "The annual-payment discount reduces the term-payment estimate by "
        : "Choosing annual payment would reduce this estimate by ");
      const savingStrong = document.createElement("strong");
      savingStrong.id = "annual-saving";
      savingStrong.textContent = format(savingCents);
      elements.savingNote.querySelector("p").append(savingText, savingStrong, document.createTextNode("."));
      elements.annualSaving = savingStrong;

      renderSchedule(result);
      renderStudents(result);
    }

    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("change", render);
    elements.reset.addEventListener("click", () => {
      form.reset();
      elements.selectionMessage.textContent = "";
      render();
      elements.studentCount.focus();
    });
    elements.print.addEventListener("click", () => window.print());

    render();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startBrowserCalculator);
    else startBrowserCalculator();
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
