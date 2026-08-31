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
    return { children, bond: selections.bond, payment: selections.payment, bondAlreadyPaidCents: 0 };
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
    const bondDueCents = bondAmountCents;
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
        bond: form.elements.namedItem("bond").value
      };
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
      elements.paymentSchedule.append(makeScheduleRow(
        "Refundable family bond",
        "Due at enrolment / start of 2027",
        result.bondDueCents
      ));
      if (result.payment === "annual") {
        elements.paymentSchedule.append(makeScheduleRow(
          "Full-year payment",
          "Due at the start of Term 1",
          result.annualFeeCents
        ));
        elements.scheduleNote.textContent = "The refundable family bond is shown separately from annual school fees. The full-year payment includes the 5% annual-payment tuition discount and the full Student Resource Levy.";
        return;
      }

      result.termPaymentsCents.forEach((amountCents, index) => {
        const detail = index === 0
          ? "Estimated tuition instalment plus the full resource levy"
          : "Estimated tuition instalment";
        elements.paymentSchedule.append(makeScheduleRow(`Term ${index + 1}`, detail, amountCents));
      });
      elements.scheduleNote.textContent = "The refundable family bond is shown as a separate initial payment. Tuition is divided across four indicative term invoices, with the full Student Resource Levy added to Term 1.";
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
      const result = calculateFamily(currentSelections());
      const comparison = calculateFamily({
        children: result.children,
        bond: result.bond,
        payment: result.payment === "annual" ? "term" : "annual"
      });
      const childLabel = result.children === 1 ? "1 child" : `${result.children} children`;
      const paymentLabel = result.payment === "annual" ? "paying annually" : "paying by term";

      elements.annualTotalLive.textContent = format(result.annualFeeCents);
      elements.estimateSummary.textContent = `For ${childLabel}, ${paymentLabel} with ${BOND_LABELS[result.bond]}.`;
      elements.annualFees.textContent = format(result.annualFeeCents);
      elements.bondAmount.textContent = format(result.bondAmountCents);
      elements.bondSummary.textContent = `${BOND_LABELS[result.bond]}; refundable family bond`;
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
