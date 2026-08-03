(() => {
  "use strict";

  const form = document.querySelector("#application-form");
  const steps = [...document.querySelectorAll(".form-step")];
  const stepButtons = [...document.querySelectorAll("[data-go-step]")];
  const progressBar = document.querySelector("#progress-bar");
  const progressLabel = document.querySelector("#progress-label");
  const progressPercent = document.querySelector("#progress-percent");
  const stepTitle = document.querySelector("#step-title");
  const reviewSummary = document.querySelector("#review-summary");
  const allGuardiansConfirmed = form.elements.all_guardians_confirmed;
  const titles = [
    "Before you begin",
    "Student and family information",
    "Parents, guardians and emergency contacts",
    "Supporting documents",
    "Conditions and permissions",
    "Review and signature",
    "Prototype complete"
  ];
  let currentStep = 0;
  let furthestStep = 0;
  let guardianCount = 0;

  function showStep(nextStep, focusHeading = true) {
    const boundedStep = Math.max(0, Math.min(nextStep, steps.length - 1));
    currentStep = boundedStep;
    furthestStep = Math.max(furthestStep, boundedStep);

    steps.forEach((step) => {
      const isCurrent = Number(step.dataset.step) === boundedStep;
      step.hidden = !isCurrent;
      step.classList.toggle("is-active", isCurrent);
    });

    stepTitle.textContent = titles[boundedStep];
    const formStep = Math.min(boundedStep, 5);
    const percentage = boundedStep === 0 ? 0 : Math.min(100, formStep * 20);
    progressBar.style.width = `${percentage}%`;
    progressLabel.textContent = boundedStep === 0 ? "Introduction" : boundedStep === 6 ? "Prototype complete" : `Step ${boundedStep} of 5`;
    progressPercent.textContent = `${percentage}% reviewed`;

    stepButtons.forEach((button) => {
      const target = Number(button.dataset.goStep);
      button.classList.toggle("is-active", target === boundedStep);
      button.classList.toggle("is-reviewed", target < furthestStep && target !== boundedStep);
      if (target === boundedStep) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    updateReviewSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (focusHeading) {
      const heading = steps.find((step) => Number(step.dataset.step) === boundedStep)?.querySelector("h3");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        window.setTimeout(() => heading.focus({ preventScroll: true }), 250);
      }
    }
  }

  document.addEventListener("click", (event) => {
    const next = event.target.closest("[data-next]");
    const back = event.target.closest("[data-back]");
    const direct = event.target.closest("[data-go-step]");
    if (next) showStep(currentStep + 1);
    if (back) showStep(currentStep - 1);
    if (direct) showStep(Number(direct.dataset.goStep));
  });

  function addRepeat(type) {
    const template = document.querySelector(`#${type}-template`);
    const list = document.querySelector(`[data-repeat-list="${type}"]`);
    if (!template || !list) return;
    const item = template.content.firstElementChild.cloneNode(true);
    const index = list.children.length + 1;
    item.querySelectorAll("[data-repeat-field]").forEach((control) => {
      control.name = `${type}_${index}_${control.dataset.repeatField}`;
    });
    list.append(item);
  }

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-repeat]");
    const remove = event.target.closest("[data-remove-repeat]");
    if (add) addRepeat(add.dataset.addRepeat);
    if (remove) remove.closest(".repeat-card")?.remove();
  });

  function renumberGuardians() {
    [...document.querySelectorAll("#guardian-list .guardian-card")].forEach((card, index) => {
      const number = index + 1;
      card.dataset.guardianIndex = String(number);
      card.querySelector("[data-guardian-number]").textContent = number;
      card.querySelectorAll("[data-guardian-field]").forEach((control) => {
        const field = control.dataset.guardianField;
        control.name = `guardian_${number}_${field}`;
        if (control.type === "radio") control.name = `guardian_${number}_${field}`;
      });
      const remove = card.querySelector("[data-remove-guardian]");
      remove.hidden = index === 0;
    });
  }

  function addGuardian() {
    const template = document.querySelector("#guardian-template");
    const list = document.querySelector("#guardian-list");
    guardianCount += 1;
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.instance = String(guardianCount);
    list.append(card);
    renumberGuardians();
    allGuardiansConfirmed.checked = false;
  }

  document.querySelector("#add-guardian").addEventListener("click", addGuardian);
  document.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-guardian]");
    if (!remove) return;
    remove.closest(".guardian-card")?.remove();
    renumberGuardians();
    allGuardiansConfirmed.checked = false;
  });

  function updateConditional(targetId, show) {
    const target = document.querySelector(`#${targetId}`);
    if (target) target.hidden = !show;
  }

  form.addEventListener("change", (event) => {
    const control = event.target;
    if (control.name === "student_citizen") updateConditional("student-visa", control.value === "No");
    if (control.name === "additional_needs") updateConditional("additional-needs", control.value === "Yes");

    if (control.matches("[data-local-file]")) {
      const status = document.querySelector(`[data-file-status="${control.dataset.localFile}"]`);
      const count = control.files.length;
      status.textContent = count ? `${count} file${count === 1 ? "" : "s"} selected locally - not uploaded` : "No file selected";
    }

    const maxGroup = control.closest("[data-max-checked]");
    if (maxGroup && control.type === "checkbox") {
      const max = Number(maxGroup.dataset.maxChecked);
      const checked = [...maxGroup.querySelectorAll("input:checked")];
      const message = maxGroup.parentElement.querySelector("[data-choice-message]");
      if (checked.length > max) {
        control.checked = false;
        message.textContent = `Choose no more than ${max}.`;
        message.classList.add("is-error");
      } else {
        message.textContent = `${checked.length} of ${max} selected.`;
        message.classList.remove("is-error");
      }
    }
    updateReviewSummary();
  });

  function updateReviewSummary() {
    const controls = [...form.elements].filter((control) => control.name && !control.disabled && control.type !== "file");
    const answered = controls.filter((control) => {
      if (control.type === "checkbox" || control.type === "radio") return control.checked;
      return String(control.value || "").trim();
    }).length;
    const guardians = document.querySelectorAll("#guardian-list .guardian-card").length;
    reviewSummary.textContent = answered
      ? `${answered} prototype controls contain a value across ${guardians} guardian contact${guardians === 1 ? "" : "s"}. Nothing has been saved or transmitted.`
      : `This prototype does not require data entry. It currently shows ${guardians} guardian contact form. Review the section content using the links above.`;
  }

  const ipDeclaration = document.querySelector("#ip-declaration");
  const consentDeclaration = document.querySelector("#consent-declaration");
  const signatureBox = document.querySelector("#signature-box");
  const signatureCanvas = document.querySelector("#signature-canvas");
  const signatureOverlay = document.querySelector("#signature-overlay");
  const clearSignature = document.querySelector("#clear-signature");
  const signatureDate = document.querySelector("#signature-date");
  const context = signatureCanvas.getContext("2d");
  let drawing = false;
  let hasSignature = false;

  function signingEnabled() {
    return ipDeclaration.checked && consentDeclaration.checked;
  }

  function updateSignatureLock() {
    const enabled = signingEnabled();
    signatureBox.classList.toggle("is-locked", !enabled);
    signatureOverlay.hidden = enabled;
    clearSignature.disabled = !enabled || !hasSignature;
    signatureDate.value = enabled ? new Intl.DateTimeFormat("en-AU").format(new Date()) : "";
  }

  function canvasPoint(event) {
    const rect = signatureCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (signatureCanvas.width / rect.width),
      y: (event.clientY - rect.top) * (signatureCanvas.height / rect.height)
    };
  }

  signatureCanvas.addEventListener("pointerdown", (event) => {
    if (!signingEnabled()) return;
    drawing = true;
    hasSignature = true;
    signatureCanvas.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  });

  signatureCanvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const point = canvasPoint(event);
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#15233b";
    context.lineTo(point.x, point.y);
    context.stroke();
  });

  function stopDrawing() {
    drawing = false;
    updateSignatureLock();
  }

  signatureCanvas.addEventListener("pointerup", stopDrawing);
  signatureCanvas.addEventListener("pointercancel", stopDrawing);
  ipDeclaration.addEventListener("change", updateSignatureLock);
  consentDeclaration.addEventListener("change", updateSignatureLock);
  clearSignature.addEventListener("click", () => {
    context.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    hasSignature = false;
    updateSignatureLock();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    showStep(6);
  });

  // The V3 prototype deliberately has no storage, fetch, upload or analytics calls.
  addGuardian();
  updateSignatureLock();
  showStep(0, false);
})();
