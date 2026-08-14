(function initialiseRosewoodFeePlannerV2(global) {
  "use strict";

  const engine = global.RosewoodFeeCalculator || (
    typeof module !== "undefined" && module.exports
      ? require("./rosewood-fee-calculator.js")
      : null
  );

  if (!engine) return;

  const BOND_LABELS = Object.freeze({
    a: "Option A ($2,000)",
    b10: "Option B ($10,000)",
    b20: "Option B for siblings ($20,000)"
  });

  const BOND_SHORT_LABELS = Object.freeze({
    a: "Option A",
    b10: "Option B",
    b20: "Option B for siblings"
  });

  function roundDivide(cents, divisor) {
    if (!Number.isInteger(cents) || cents < 0) throw new RangeError("Cents must be a non-negative integer.");
    if (!Number.isInteger(divisor) || divisor < 1) throw new RangeError("Divisor must be a positive integer.");
    return Math.floor((cents + (divisor / 2)) / divisor);
  }

  function calculatePlanningView(selections) {
    const result = engine.calculateFamily({
      children: selections.children,
      payment: selections.payment,
      bond: selections.bond,
      bondAlreadyPaidCents: 0
    });
    const totalReductionsCents = result.siblingDiscountCents
      + result.bondDiscountCents
      + result.annualDiscountCents
      + result.foundationDiscountCents;
    const automaticReductionsCents = result.siblingDiscountCents + result.foundationDiscountCents;
    const choiceReductionsCents = result.bondDiscountCents + result.annualDiscountCents;

    if (result.baseTuitionCents - totalReductionsCents !== result.netTuitionCents
        || result.netTuitionCents + result.resourceLevyCents !== result.annualFeeCents) {
      throw new Error("Tuition reductions and the resource levy do not reconcile to the annual estimate.");
    }

    const alternatePayment = result.payment === "annual" ? "term" : "annual";
    const paymentComparison = engine.calculateFamily({
      children: result.children,
      payment: alternatePayment,
      bond: result.bond,
      bondAlreadyPaidCents: 0
    });
    const annualChoiceSavingCents = result.payment === "annual"
      ? paymentComparison.annualFeeCents - result.annualFeeCents
      : result.annualFeeCents - paymentComparison.annualFeeCents;

    const selectedSchedule = result.payment === "annual"
      ? Object.freeze([Object.freeze({
        label: "Full-year payment",
        detail: "Due at the start of Term 1",
        amountCents: result.annualFeeCents
      })])
      : Object.freeze(result.termPaymentsCents.map((amountCents, index) => Object.freeze({
        label: `Term ${index + 1}`,
        detail: index === 0
          ? "Tuition instalment plus the full Student Resource Levy"
          : "Tuition instalment",
        amountCents
      })));

    return Object.freeze({
      result,
      weeklyEquivalentCents: roundDivide(result.annualFeeCents, 52),
      fortnightlyEquivalentCents: roundDivide(result.annualFeeCents, 26),
      publishedTuitionBeforeReductionsCents: result.baseTuitionCents,
      nonDiscountableLevyCents: result.resourceLevyCents,
      totalReductionsCents,
      automaticReductionsCents,
      choiceReductionsCents,
      alternatePayment,
      paymentComparison,
      annualChoiceSavingCents,
      selectedSchedule
    });
  }

  function calculateBondComparison(view, targetBond) {
    const current = view.result;
    const target = engine.calculateFamily({
      children: current.children,
      payment: current.payment,
      bond: targetBond,
      bondAlreadyPaidCents: 0
    });
    return Object.freeze({
      target,
      annualFeeDifferenceCents: target.annualFeeCents - current.annualFeeCents,
      bondAmountDifferenceCents: target.bondAmountCents - current.bondAmountCents
    });
  }

  const api = Object.freeze({ calculateBondComparison, calculatePlanningView, roundDivide });
  global.RosewoodFeePlannerV2 = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function startBrowserPlanner() {
    const app = document.querySelector("#planner-app");
    const form = document.querySelector("#v2-fee-form");
    const staticFallback = document.querySelector("#static-fee-fallback");
    if (!app || !form || !staticFallback) return;

    const currency = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const dateFormatter = new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const elements = {
      headerStepTitle: document.querySelector("#header-step-title"),
      progressLabel: document.querySelector("#progress-label"),
      progressPercent: document.querySelector("#progress-percent"),
      progressBar: document.querySelector("#progress-bar"),
      progressItems: Array.from(document.querySelectorAll(".progress li")),
      status: document.querySelector("#planner-status"),
      steps: Array.from(document.querySelectorAll(".journey-step")),
      estimate: document.querySelector("#v2-estimate"),
      familyChoices: Array.from(document.querySelectorAll('input[name="children-count"]')),
      largeFamilyPanel: document.querySelector("#large-family-panel"),
      largeFamilyCount: document.querySelector("#v2-large-family-count"),
      bondB20: document.querySelector("#v2-bond-b20"),
      bondB20Card: document.querySelector("#v2-bond-b20-card"),
      bondAlternatives: document.querySelector("#bond-alternatives"),
      bondAlternativesSummaryCopy: document.querySelector("#bond-alternatives-summary-copy"),
      bondDiscountAssumption: document.querySelector("#bond-discount-assumption"),
      showEstimate: document.querySelector("#show-estimate"),
      editEstimate: document.querySelector("#edit-estimate"),
      startAgain: document.querySelector("#start-again"),
      print: document.querySelector("#print-v2-estimate"),
      selectionSummary: document.querySelector("#estimate-selection-summary"),
      annualFees: document.querySelector("#v2-annual-fees"),
      summaryBondDue: document.querySelector("#summary-bond-due"),
      summaryCombinedTotal: document.querySelector("#summary-combined-total"),
      foundationBenefit: document.querySelector("#foundation-benefit"),
      weeklyEquivalent: document.querySelector("#weekly-equivalent"),
      fortnightlyEquivalent: document.querySelector("#fortnightly-equivalent"),
      budgetingNote: document.querySelector("#budgeting-note"),
      totalReductions: document.querySelector("#total-reductions"),
      reductionSummary: document.querySelector("#reduction-summary"),
      automaticReductions: document.querySelector("#automatic-reductions"),
      choiceReductions: document.querySelector("#choice-reductions"),
      familyChoice: document.querySelector("#family-choice-summary"),
      paymentChoice: document.querySelector("#payment-choice-summary"),
      bondChoice: document.querySelector("#bond-choice-summary"),
      bondResultCopy: document.querySelector("#bond-result-copy"),
      opportunityGrid: document.querySelector("#opportunity-grid"),
      paymentTimingTrigger: document.querySelector("#payment-timing-trigger"),
      detailDialog: document.querySelector("#fee-detail-dialog"),
      detailDialogTitle: document.querySelector("#fee-detail-dialog-title"),
      dialogClose: document.querySelector("#dialog-close"),
      dialogPanels: Array.from(document.querySelectorAll("[data-dialog-content]")),
      paymentSchedule: document.querySelector("#v2-payment-schedule"),
      scheduleNote: document.querySelector("#v2-schedule-note"),
      baseTuition: document.querySelector("#v2-base-tuition"),
      siblingDiscount: document.querySelector("#v2-sibling-discount"),
      bondDiscount: document.querySelector("#v2-bond-discount"),
      annualDiscount: document.querySelector("#v2-annual-discount"),
      foundationDiscount: document.querySelector("#v2-foundation-discount"),
      netTuition: document.querySelector("#v2-net-tuition"),
      resourceLevy: document.querySelector("#v2-resource-levy"),
      breakdownTotal: document.querySelector("#v2-breakdown-total"),
      studentRows: document.querySelector("#v2-student-rows"),
      studentCards: document.querySelector("#v2-student-cards"),
      printDate: document.querySelector("#print-date"),
      printSelectionRecord: document.querySelector("#print-selection-record"),
      printDetails: Array.from(document.querySelectorAll("#v2-estimate details"))
    };

    const stepTitles = ["Your family", "Payment timing", "Refundable bond", "Your estimate"];
    let currentStep = 1;
    let lastView = null;
    let printOpenStates = [];

    function format(cents) {
      return currency.format(cents / 100);
    }

    function formatReduction(cents) {
      return cents === 0 ? format(0) : `-${format(cents)}`;
    }

    function announce(message) {
      elements.status.textContent = "";
      global.requestAnimationFrame(() => {
        elements.status.textContent = message;
      });
    }

    function selectedRadio(name) {
      const selected = form.querySelector(`input[name="${name}"]:checked`);
      return selected ? selected.value : "";
    }

    function currentChildren() {
      const choice = selectedRadio("children-count");
      if (!choice) return 0;
      return choice === "5plus" ? Number(elements.largeFamilyCount.value) : Number(choice);
    }

    function currentSelections() {
      return {
        children: currentChildren(),
        payment: selectedRadio("payment"),
        bond: selectedRadio("bond")
      };
    }

    function focusHeading(step) {
      const target = step === 4
        ? document.querySelector("#estimate-heading")
        : document.querySelector(`.journey-step[data-step="${step}"] h2`);
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: global.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }

    function updateProgress(step) {
      const percent = step * 25;
      elements.progressLabel.textContent = `Step ${step} of 4`;
      elements.progressPercent.textContent = `${percent}% complete`;
      elements.progressBar.style.width = `${percent}%`;
      elements.headerStepTitle.textContent = stepTitles[step - 1];
      elements.progressItems.forEach((item, index) => {
        const itemStep = index + 1;
        item.classList.toggle("is-complete", itemStep < step);
        if (itemStep === step) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
    }

    function showStep(step, options = {}) {
      currentStep = step;
      const showingEstimate = step === 4;
      document.body.classList.toggle("has-completed-estimate", showingEstimate && Boolean(lastView));
      form.hidden = showingEstimate;
      elements.estimate.hidden = !showingEstimate;
      if (!showingEstimate) elements.status.textContent = "";
      elements.steps.forEach((section) => {
        section.hidden = Number(section.dataset.step) !== step;
      });
      updateProgress(step);
      if (options.focus !== false) focusHeading(step);
    }

    function invalidateControl(control, message) {
      control.setAttribute("aria-invalid", "true");
      announce(message);
      control.focus();
      return false;
    }

    function validateStep(step) {
      if (step === 1) {
        elements.familyChoices.forEach((input) => input.removeAttribute("aria-invalid"));
        elements.largeFamilyCount.removeAttribute("aria-invalid");
        const selected = form.querySelector('input[name="children-count"]:checked');
        if (!selected) {
          return invalidateControl(elements.familyChoices[0], "Choose how many children will attend before continuing.");
        }
        if (selected.value === "5plus" && !elements.largeFamilyCount.checkValidity()) {
          return invalidateControl(elements.largeFamilyCount, "Enter a number from 5 to 20.");
        }
      }
      if (step === 2 && !selectedRadio("payment")) {
        return invalidateControl(form.querySelector('input[name="payment"]'), "Choose a payment timing before continuing.");
      }
      if (step === 3 && !selectedRadio("bond")) {
        return invalidateControl(form.querySelector('input[name="bond"]'), "Choose a refundable bond arrangement before viewing the estimate.");
      }
      return true;
    }

    function updateBondAvailability(options = {}) {
      const children = currentChildren();
      const unavailable = children < 2;
      const wasSelected = elements.bondB20.checked;
      elements.bondB20.disabled = unavailable;
      elements.bondB20Card.classList.toggle("is-unavailable", unavailable);
      if (unavailable && wasSelected) {
        elements.bondB20.checked = false;
        elements.bondDiscountAssumption.hidden = true;
        elements.bondAlternativesSummaryCopy.textContent = "Larger refundable bonds can reduce tuition by a further 5% each year.";
        if (options.announce !== false) {
          announce("The $20,000 sibling bond was cleared because it requires two or more children. Choose another bond arrangement in Step 3.");
        }
      }
    }

    function updateFamilySelection(options = {}) {
      const selected = selectedRadio("children-count");
      const isLargeFamily = selected === "5plus";
      elements.largeFamilyPanel.hidden = !isLargeFamily;
      if (isLargeFamily && options.focus) elements.largeFamilyCount.focus();
      elements.familyChoices.forEach((input) => input.removeAttribute("aria-invalid"));
      elements.largeFamilyCount.removeAttribute("aria-invalid");
      updateBondAvailability(options);
    }

    function updateBondSelection(bond) {
      if (!bond) {
        elements.bondDiscountAssumption.hidden = true;
        elements.bondAlternativesSummaryCopy.textContent = "Larger refundable bonds can reduce tuition by a further 5% each year.";
        return;
      }

      elements.bondDiscountAssumption.hidden = bond === "a";
      elements.bondAlternativesSummaryCopy.textContent = bond === "a"
        ? "Larger refundable bonds can reduce tuition by a further 5% each year."
        : `Selected: ${BOND_LABELS[bond]}. Open to review or change this arrangement.`;
    }

    function makeScheduleRow(item) {
      const row = document.createElement("div");
      row.className = "schedule-row";
      const title = document.createElement("strong");
      title.textContent = item.label;
      const detail = document.createElement("small");
      detail.textContent = item.detail;
      const amount = document.createElement("span");
      amount.textContent = format(item.amountCents);
      row.append(title, detail, amount);
      return row;
    }

    function renderSchedule(view) {
      elements.paymentSchedule.replaceChildren(...view.selectedSchedule.map(makeScheduleRow));
      elements.scheduleNote.textContent = view.result.payment === "annual"
        ? "The full annual fee is due at the start of Term 1 and includes the annual-payment tuition reduction and Student Resource Levy. Payment is due within 14 days."
        : "Net tuition is divided across four indicative term invoices, with any cent remainder placed in the earliest terms. The full Student Resource Levy is included in Term 1. Each invoice is due within 14 days.";
    }

    function tableCell(text, className) {
      const cell = document.createElement("td");
      cell.textContent = text;
      if (className) cell.className = className;
      return cell;
    }

    function makeStudentCard(student) {
      const card = document.createElement("article");
      card.className = "student-card";
      const heading = document.createElement("h4");
      heading.textContent = student.label;
      const list = document.createElement("dl");
      const entries = [
        ["Foundation reduction", formatReduction(student.foundationDiscountCents)],
        ["Sibling reduction", formatReduction(student.siblingDiscountCents)],
        ["Bond reduction", formatReduction(student.bondDiscountCents)],
        ["Annual reduction", formatReduction(student.annualDiscountCents)],
        ["Resource levy", format(student.resourceLevyCents)],
        ["Annual fee", format(student.annualFeeCents), "student-total"]
      ];
      entries.forEach(([label, value, className]) => {
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        if (className) {
          term.className = className;
          description.className = className;
        }
        list.append(term, description);
      });
      card.append(heading, list);
      return card;
    }

    function renderStudents(result) {
      const rows = result.students.map((student) => {
        const row = document.createElement("tr");
        row.append(
          tableCell(student.label),
          tableCell(formatReduction(student.foundationDiscountCents), student.foundationDiscountCents === 0 ? "zero-reduction" : ""),
          tableCell(formatReduction(student.siblingDiscountCents), student.siblingDiscountCents === 0 ? "zero-reduction" : ""),
          tableCell(formatReduction(student.bondDiscountCents), student.bondDiscountCents === 0 ? "zero-reduction" : ""),
          tableCell(formatReduction(student.annualDiscountCents), student.annualDiscountCents === 0 ? "zero-reduction" : ""),
          tableCell(format(student.resourceLevyCents)),
          tableCell(format(student.annualFeeCents))
        );
        return row;
      });
      elements.studentRows.replaceChildren(...rows);
      elements.studentCards.replaceChildren(...result.students.map(makeStudentCard));
    }

    function createOpportunityCard({ kicker, title, metrics, copy, buttonLabel, onClick, applied = false }) {
      const card = document.createElement("article");
      card.className = `opportunity-card${applied ? " is-applied" : ""}`;
      const kickerNode = document.createElement("p");
      kickerNode.className = "opportunity-kicker";
      kickerNode.textContent = kicker;
      const heading = document.createElement("h4");
      heading.textContent = title;
      const metricsNode = document.createElement("div");
      metricsNode.className = "opportunity-metrics";
      metrics.forEach((metric) => {
        const metricNode = document.createElement("div");
        metricNode.className = "opportunity-metric";
        const labelNode = document.createElement("span");
        labelNode.textContent = metric.label;
        const valueNode = document.createElement("strong");
        valueNode.textContent = metric.value;
        metricNode.append(labelNode, valueNode);
        metricsNode.append(metricNode);
      });
      const copyNode = document.createElement("p");
      copyNode.textContent = copy;
      card.append(kickerNode, heading, metricsNode, copyNode);
      if (buttonLabel && onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button-secondary";
        button.textContent = buttonLabel;
        button.addEventListener("click", onClick);
        card.append(button);
      }
      return card;
    }

    function bondOpportunityTitle(bond) {
      if (bond === "a") return "Choose the smaller family bond";
      if (bond === "b10") return "Reduce first-child tuition";
      return "Reduce tuition for every child";
    }

    function renderOpportunities(view) {
      const cards = [];
      const result = view.result;
      if (result.payment === "term") {
        cards.push(createOpportunityCard({
          kicker: "Payment comparison",
          title: `Save ${format(view.annualChoiceSavingCents)} with annual payment`,
          metrics: [
            { label: "Annual fee change", value: `${format(view.annualChoiceSavingCents)} less` },
            { label: "What changes", value: "Pay at Term 1" }
          ],
          copy: "Adds a further 5% reduction to the tuition remaining after the earlier reductions.",
          buttonLabel: "Apply annual-payment saving",
          onClick: () => applyPaymentOption("annual")
        }));
      } else {
        cards.push(createOpportunityCard({
          kicker: "Alternative payment rhythm",
          title: "Spread fees across four term invoices",
          metrics: [
            { label: "Annual fee change", value: `${format(view.annualChoiceSavingCents)} more` },
            { label: "What changes", value: "Four invoices" }
          ],
          copy: "Removes the annual-payment reduction and spreads tuition across the school year.",
          buttonLabel: "Use term payments",
          onClick: () => applyPaymentOption("term")
        }));
      }

      const eligibleBonds = ["a", "b10", ...(result.children >= 2 ? ["b20"] : [])];
      eligibleBonds.filter((bond) => bond !== result.bond).forEach((bond) => {
        const comparison = calculateBondComparison(view, bond);
        const annualDifference = comparison.annualFeeDifferenceCents;
        const bondDifference = comparison.bondAmountDifferenceCents;
        const feeText = annualDifference === 0
          ? "No change"
          : `${format(Math.abs(annualDifference))} ${annualDifference < 0 ? "lower" : "higher"}`;
        const bondText = bondDifference === 0
          ? "No change"
          : `${format(Math.abs(bondDifference))} ${bondDifference > 0 ? "more" : "less"}`;
        cards.push(createOpportunityCard({
          kicker: "Bond comparison",
          title: bondOpportunityTitle(bond),
          metrics: [
            { label: "Annual school fees", value: feeText },
            { label: "Total bond arrangement", value: bondText }
          ],
          copy: `${BOND_LABELS[bond]} uses a ${format(comparison.target.bondAmountCents)} refundable bond. Both changes are measured against the current hypothetical selection and compare the full bond arrangements.`,
          buttonLabel: `Use ${BOND_SHORT_LABELS[bond]}`,
          onClick: () => applyBondOption(bond)
        }));
      });
      elements.opportunityGrid.replaceChildren(...cards);
    }

    function renderEstimate() {
      const view = calculatePlanningView(currentSelections());
      const result = view.result;
      lastView = view;
      const childLabel = result.children === 1 ? "1 child" : `${result.children} children`;
      const paymentLabel = result.payment === "annual" ? "annual payment" : "term payments";

      elements.selectionSummary.textContent = `${childLabel}, ${paymentLabel}, ${BOND_LABELS[result.bond]}.`;
      elements.annualFees.textContent = format(result.annualFeeCents);
      elements.summaryBondDue.textContent = format(result.bondAmountCents);
      elements.summaryCombinedTotal.textContent = format(result.firstYearCommitmentCents);
      elements.foundationBenefit.textContent = format(result.foundationDiscountCents);
      elements.weeklyEquivalent.textContent = format(view.weeklyEquivalentCents);
      elements.fortnightlyEquivalent.textContent = format(view.fortnightlyEquivalentCents);
      elements.budgetingNote.hidden = result.payment === "annual";
      elements.paymentTimingTrigger.hidden = result.payment === "annual";
      elements.totalReductions.textContent = format(view.totalReductionsCents);
      elements.reductionSummary.textContent = `Applied against ${format(view.publishedTuitionBeforeReductionsCents)} published tuition. The ${format(view.nonDiscountableLevyCents)} Student Resource Levy is included in annual fees and is not discountable.`;
      elements.automaticReductions.textContent = format(view.automaticReductionsCents);
      elements.choiceReductions.textContent = format(view.choiceReductionsCents);
      elements.familyChoice.textContent = childLabel;
      elements.paymentChoice.textContent = result.payment === "annual" ? "Pay for the year" : "Pay by term";
      elements.bondChoice.textContent = BOND_LABELS[result.bond];
      elements.bondResultCopy.textContent = result.bond === "a"
        ? "Returned when the last family member leaves Rosewood"
        : result.bond === "b10"
          ? "Returned when the first child leaves Rosewood"
          : "First $10,000 returned when the first child leaves; second $10,000 when the last child leaves";

      elements.baseTuition.textContent = format(result.baseTuitionCents);
      elements.siblingDiscount.textContent = formatReduction(result.siblingDiscountCents);
      elements.bondDiscount.textContent = formatReduction(result.bondDiscountCents);
      elements.annualDiscount.textContent = formatReduction(result.annualDiscountCents);
      elements.foundationDiscount.textContent = formatReduction(result.foundationDiscountCents);
      elements.netTuition.textContent = format(result.netTuitionCents);
      elements.resourceLevy.textContent = format(result.resourceLevyCents);
      elements.breakdownTotal.textContent = format(result.annualFeeCents);

      renderSchedule(view);
      renderStudents(result);
      renderOpportunities(view);
      elements.printDate.textContent = dateFormatter.format(new Date());
      elements.printSelectionRecord.textContent = `Selected choices: ${childLabel}; ${paymentLabel}; ${BOND_LABELS[result.bond]}.`;
      return view;
    }

    function settleOpportunityFocus(message) {
      elements.opportunityGrid.focus({ preventScroll: true });
      announce(message);
    }

    function applyPaymentOption(payment) {
      const input = form.querySelector(`input[name="payment"][value="${payment}"]`);
      input.checked = true;
      renderEstimate();
      settleOpportunityFocus(payment === "annual"
        ? "Annual payment applied. The estimate now includes the additional 5% tuition reduction."
        : "Term payments applied. The estimate now uses four school-fee invoices.");
    }

    function applyBondOption(bond) {
      const input = form.querySelector(`input[name="bond"][value="${bond}"]`);
      input.checked = true;
      if (bond !== "a") elements.bondAlternatives.open = true;
      updateBondSelection(bond);
      renderEstimate();
      settleOpportunityFocus(`${BOND_LABELS[bond]} applied. The annual fees and refundable bond have been updated.`);
    }

    function openDetailDialog(panelName) {
      const titles = {
        calculation: "How it was calculated",
        payment: "Payment schedule",
        notes: "Fee notes"
      };
      elements.detailDialogTitle.textContent = titles[panelName] || "Estimate details";
      elements.dialogPanels.forEach((panel) => {
        panel.hidden = panel.dataset.dialogContent !== panelName;
      });
      if (typeof elements.detailDialog.showModal === "function") elements.detailDialog.showModal();
      else elements.detailDialog.setAttribute("open", "");
      elements.dialogClose.focus();
    }

    function closeDetailDialog() {
      if (typeof elements.detailDialog.close === "function") elements.detailDialog.close();
      else elements.detailDialog.removeAttribute("open");
    }

    function showCompletedEstimate() {
      if (!validateStep(3)) return;
      renderEstimate();
      showStep(4, { focus: false });
      focusHeading(4);
      announce("Your 2027 planning estimate is ready. Annual fees, the refundable bond and the combined amount are shown separately.");
    }

    function resetPlanner() {
      form.reset();
      elements.largeFamilyCount.value = "5";
      elements.largeFamilyPanel.hidden = true;
      elements.bondAlternatives.open = false;
      elements.bondAlternativesSummaryCopy.textContent = "Larger refundable bonds can reduce tuition by a further 5% each year.";
      elements.bondDiscountAssumption.hidden = true;
      elements.status.textContent = "";
      lastView = null;
      updateBondAvailability({ announce: false });
      showStep(1);
    }

    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("click", (event) => {
      const nextButton = event.target.closest("[data-next-step]");
      const previousButton = event.target.closest("[data-previous-step]");
      if (nextButton) {
        const nextStep = Number(nextButton.dataset.nextStep);
        if (validateStep(currentStep)) {
          elements.status.textContent = "";
          showStep(nextStep);
        }
      } else if (previousButton) {
        elements.status.textContent = "";
        showStep(Number(previousButton.dataset.previousStep));
      }
    });
    form.addEventListener("change", (event) => {
      if (event.target.matches('input[name="children-count"]')) {
        updateFamilySelection({ focus: event.target.value === "5plus" });
        elements.status.textContent = "";
      }
      if (event.target === elements.largeFamilyCount) {
        elements.largeFamilyCount.removeAttribute("aria-invalid");
        updateBondAvailability();
      }
      if (event.target.matches('input[name="payment"]')) {
        form.querySelectorAll('input[name="payment"]').forEach((input) => input.removeAttribute("aria-invalid"));
        elements.status.textContent = "";
      }
      if (event.target.matches('input[name="bond"]')) {
        form.querySelectorAll('input[name="bond"]').forEach((input) => input.removeAttribute("aria-invalid"));
        updateBondSelection(event.target.value);
        elements.status.textContent = "";
      }
    });
    elements.showEstimate.addEventListener("click", showCompletedEstimate);
    elements.editEstimate.addEventListener("click", () => showStep(1));
    document.querySelectorAll("[data-edit-step]").forEach((button) => {
      button.addEventListener("click", () => showStep(Number(button.dataset.editStep)));
    });
    elements.startAgain.addEventListener("click", resetPlanner);
    elements.print.addEventListener("click", () => global.print());
    document.querySelectorAll("[data-dialog-panel]").forEach((button) => {
      button.addEventListener("click", () => openDetailDialog(button.dataset.dialogPanel));
    });
    elements.dialogClose.addEventListener("click", closeDetailDialog);
    elements.detailDialog.addEventListener("click", (event) => {
      if (event.target === elements.detailDialog) closeDetailDialog();
    });

    global.addEventListener("beforeprint", () => {
      printOpenStates = [];
      if (!lastView || currentStep !== 4) return;
      printOpenStates = elements.printDetails.map((detail) => detail.open);
      elements.printDetails.forEach((detail) => { detail.open = true; });
    });
    global.addEventListener("afterprint", () => {
      if (printOpenStates.length === elements.printDetails.length) {
        elements.printDetails.forEach((detail, index) => { detail.open = Boolean(printOpenStates[index]); });
      }
      printOpenStates = [];
    });

    updateBondAvailability({ announce: false });
    showStep(1, { focus: false });
    document.documentElement.classList.remove("no-js");
    app.hidden = false;
    staticFallback.hidden = true;
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startBrowserPlanner);
    else startBrowserPlanner();
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
