(() => {
  "use strict";

  const config = window.ROSEWOOD_ENROLMENT_CONFIG || {};
  const apiEndpoint = String(config.apiEndpoint || "").replace(/\/+$/, "");
  const query = new URLSearchParams(window.location.search);
  const inviteToken = query.get("invite") || "";
  const previewMode = Boolean(config.previewMode);
  const form = document.getElementById("enrolment-form");
  const accessMessage = document.getElementById("access-message");
  const progressWrap = document.getElementById("progress-wrap");
  const stepTitle = document.getElementById("step-title");
  const saveState = document.getElementById("save-state");
  const submitError = document.getElementById("submit-error");
  const steps = [...document.querySelectorAll("[data-step]")];
  const progressButtons = [...document.querySelectorAll("[data-go-step]")];
  const uploadedDocuments = {};
  const startedAt = Date.now();
  const sessionId = crypto.randomUUID();
  const storageKey = `rosewood-enrolment-${inviteToken.slice(-12) || "preview"}`;
  let currentStep = 0;
  let highestStep = previewMode ? 6 : 0;
  let invitation = null;
  let saveTimer;

  const stepNames = {
    0: "Welcome",
    1: "Student",
    2: "Family",
    3: "Health and support",
    4: "Permissions",
    5: "Documents",
    6: "Review and sign",
    7: "Application received"
  };

  const engagementEvents = new Set([
    "page_view",
    "form_started",
    "step_viewed",
    "step_completed",
    "validation_error",
    "document_uploaded",
    "submission_started",
    "submission_completed",
    "submission_failed"
  ]);

  function showAccessError(message) {
    accessMessage.innerHTML = "";
    const icon = document.createElement("div");
    icon.className = "access-icon";
    icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h2v2h-2Zm0-8h2v6h-2Zm1-7a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/></svg>';
    const text = document.createElement("p");
    text.textContent = message;
    accessMessage.append(icon, text);
  }

  async function apiRequest(path, payload, options = {}) {
    if (!apiEndpoint) {
      throw new Error("The secure enrolment service has not been connected yet.");
    }

    const response = await fetch(`${apiEndpoint}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken, ...payload }),
      keepalive: Boolean(options.keepalive)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "The enrolment service could not complete this request.");
    }
    return result;
  }

  async function logEvent(eventName, section = "", metadata = {}) {
    if (!engagementEvents.has(eventName) || previewMode || !apiEndpoint || !inviteToken) {
      return;
    }

    try {
      await apiRequest("/engagement", {
        eventName,
        section,
        sessionId,
        metadata: {
          ...metadata,
          elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
          viewport: `${window.innerWidth}x${window.innerHeight}`
        }
      }, { keepalive: true });
    } catch {
      // Engagement logging must never interrupt the family completing the form.
    }
  }

  async function validateInvitation() {
    if (previewMode) {
      invitation = {
        inviteId: "preview",
        familyLabel: "Preview Family",
        studentName: "",
        status: "invited"
      };
      return;
    }

    if (!inviteToken) {
      throw new Error("This private page requires the invitation link sent by Rosewood College.");
    }

    const result = await apiRequest("/invitation/validate", {});
    if (result.status === "submitted") {
      throw new Error(`This invitation has already been used. Application reference: ${result.submissionId || "available from the enrolment team"}.`);
    }
    invitation = result;
  }

  function todayString() {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10);
  }

  function setFieldValue(name, value) {
    const controls = [...form.elements].filter((element) => element.name === name);
    if (!controls.length) return;

    if (controls[0].type === "checkbox") {
      const values = Array.isArray(value) ? value : [value];
      controls.forEach((control) => {
        control.checked = values.includes(control.value);
      });
      return;
    }

    if (controls[0].type === "radio") {
      controls.forEach((control) => {
        control.checked = control.value === value;
      });
      return;
    }

    controls[0].value = value ?? "";
  }

  function restoreDraft() {
    if (previewMode) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Preview mode remains usable when browser storage is unavailable.
      }
      return;
    }
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!draft || draft.submitted) return;
      Object.entries(draft.fields || {}).forEach(([name, value]) => setFieldValue(name, value));
      Object.assign(uploadedDocuments, draft.uploadedDocuments || {});
      if (draft.fields?.parent_b_first_name || draft.fields?.parent_b_last_name) {
        const parentBCard = document.getElementById("parent-b-card");
        const toggleParentB = document.getElementById("toggle-parent-b");
        parentBCard.hidden = false;
        toggleParentB.setAttribute("aria-expanded", "true");
        toggleParentB.textContent = "Remove parent / guardian B";
      }
      currentStep = Math.min(Number(draft.currentStep) || 0, 6);
      highestStep = Math.min(Number(draft.highestStep) || currentStep, 6);
      renderUploadedDocuments();
    } catch {
      // Ignore malformed or unavailable local storage and start a clean form.
    }
  }

  function formToObject() {
    const result = {};
    const data = new FormData(form);
    for (const [key, value] of data.entries()) {
      if (value instanceof File) continue;
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = Array.isArray(result[key]) ? [...result[key], value] : [result[key], value];
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  function saveDraft() {
    if (previewMode || currentStep === 7) return;
    saveState.classList.add("is-saving");
    saveState.querySelector("span:last-child").textContent = "Saving…";
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        fields: formToObject(),
        uploadedDocuments,
        currentStep,
        highestStep,
        savedAt: new Date().toISOString()
      }));
    } catch {
      saveState.querySelector("span:last-child").textContent = "Could not save locally";
      return;
    }
    window.setTimeout(() => {
      saveState.classList.remove("is-saving");
      saveState.querySelector("span:last-child").textContent = "Saved on this device";
    }, 320);
  }

  function scheduleSave() {
    if (previewMode) return;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 350);
  }

  function syncConditionalFields() {
    const parentBCard = document.getElementById("parent-b-card");
    const hasParentB = !parentBCard.hidden;
    document.getElementById("signature-b-field").hidden = !hasParentB;
    document.getElementById("signature-b-date-field").hidden = !hasParentB;

    document.querySelectorAll("[data-required-when-visible]").forEach((control) => {
      control.required = !control.closest("[hidden]");
    });

    document.querySelectorAll("[hidden] input, [hidden] select, [hidden] textarea").forEach((control) => {
      if (!control.closest(".form-step")) control.disabled = true;
    });
    document.querySelectorAll(":not([hidden]) > input, :not([hidden]) > select, :not([hidden]) > textarea").forEach((control) => {
      if (!control.closest("[hidden]")) control.disabled = false;
    });
  }

  function updateProgress() {
    const progressStep = Math.min(Math.max(currentStep, 1), 6);
    const percent = currentStep === 0 ? 0 : Math.round((Math.min(currentStep, 6) / 6) * 100);
    document.getElementById("progress-label").textContent = `Step ${progressStep} of 6`;
    document.getElementById("progress-percent").textContent = `${percent}% complete`;
    document.getElementById("progress-bar").style.width = `${percent}%`;
    stepTitle.textContent = previewMode && currentStep === 7 ? "Preview complete" : stepNames[currentStep];

    progressButtons.forEach((button) => {
      const step = Number(button.dataset.goStep);
      button.classList.toggle("is-active", step === currentStep);
      button.classList.toggle("is-complete", step < currentStep || step <= highestStep);
      button.disabled = !previewMode && step > highestStep;
    });
  }

  function showStep(nextStep, options = {}) {
    currentStep = nextStep;
    highestStep = Math.max(highestStep, Math.min(nextStep, 6));
    steps.forEach((step) => step.classList.toggle("is-active", Number(step.dataset.step) === nextStep));
    progressWrap.hidden = nextStep === 0 || nextStep === 7;
    updateProgress();
    syncConditionalFields();

    if (nextStep === 6) buildReview();
    if (!options.preserveScroll) window.scrollTo({ top: 0, behavior: "smooth" });
    scheduleSave();
    logEvent("step_viewed", stepNames[nextStep]);
  }

  function clearFieldErrors(section) {
    section.querySelectorAll("[aria-invalid=true]").forEach((control) => control.removeAttribute("aria-invalid"));
    section.querySelectorAll(".field-error").forEach((error) => error.remove());
  }

  function addFieldError(control, message) {
    control.setAttribute("aria-invalid", "true");
    const container = control.closest(".field, .permission-card, .permission-tile") || control.parentElement;
    if (!container.querySelector(".field-error")) {
      const error = document.createElement("span");
      error.className = "field-error";
      error.textContent = message;
      container.append(error);
    }
  }

  function validateCheckboxGroups(section) {
    let valid = true;
    const medical = [...section.querySelectorAll('input[name="medical_conditions"]')];
    if (medical.length && !medical.some((control) => control.checked)) {
      addFieldError(medical[0], "Select at least one option.");
      valid = false;
    }

    const factors = [...section.querySelectorAll('input[name="decision_factors"]')];
    if (factors.length) {
      const count = factors.filter((control) => control.checked).length;
      if (count < 1 || count > 3) {
        addFieldError(factors[0], "Choose between one and three options.");
        valid = false;
      }
    }
    return valid;
  }

  function validateStep(stepNumber) {
    const section = steps.find((step) => Number(step.dataset.step) === stepNumber);
    if (!section) return true;
    clearFieldErrors(section);
    if (previewMode) return true;
    syncConditionalFields();
    let firstInvalid = null;

    const controls = [...section.querySelectorAll("input, select, textarea")].filter((control) => {
      return !control.disabled && !control.closest("[hidden]") && control.type !== "file";
    });

    for (const control of controls) {
      if (!control.checkValidity()) {
        firstInvalid ||= control;
        const message = control.validity.valueMissing ? "This field is required." : "Please check this value.";
        addFieldError(control, message);
      }
    }

    if (!validateCheckboxGroups(section)) {
      firstInvalid ||= section.querySelector(".field-error")?.parentElement?.querySelector("input");
    }

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      logEvent("validation_error", stepNames[stepNumber], { field: firstInvalid.name || "group" });
      return false;
    }
    return true;
  }

  function reviewValue(data, name, fallback = "Not provided") {
    const value = data[name];
    if (Array.isArray(value)) return value.join(", ");
    return value || fallback;
  }

  function createReviewCard(title, step, entries) {
    const card = document.createElement("article");
    card.className = "review-card";
    const header = document.createElement("header");
    const heading = document.createElement("h4");
    heading.textContent = title;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => showStep(step));
    header.append(heading, edit);

    const list = document.createElement("dl");
    entries.forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      wrapper.append(term, description);
      list.append(wrapper);
    });
    card.append(header, list);
    return card;
  }

  function buildReview() {
    const data = formToObject();
    const reviewList = document.getElementById("review-list");
    reviewList.innerHTML = "";
    reviewList.append(
      createReviewCard("Student", 1, [
        ["Student", `${reviewValue(data, "student_first_name", "")} ${reviewValue(data, "student_last_name", "")}`.trim() || "Not provided"],
        ["Date of birth", reviewValue(data, "student_date_of_birth")],
        ["Proposed entry", `${reviewValue(data, "entry_year_level", "")}, ${reviewValue(data, "entry_year", "")}`],
        ["Current school", reviewValue(data, "current_school")],
        ["Home", `${reviewValue(data, "student_suburb", "")} ${reviewValue(data, "student_postcode", "")}`.trim() || "Not provided"],
        ["Language", reviewValue(data, "student_main_language")]
      ]),
      createReviewCard("Family", 2, [
        ["Parent / guardian A", `${reviewValue(data, "parent_a_first_name", "")} ${reviewValue(data, "parent_a_last_name", "")}`.trim() || "Not provided"],
        ["Email", reviewValue(data, "parent_a_email")],
        ["Mobile", reviewValue(data, "parent_a_mobile")],
        ["Parent / guardian B", `${reviewValue(data, "parent_b_first_name", "")} ${reviewValue(data, "parent_b_last_name", "")}`.trim() || "Not added"],
        ["Emergency contact", `${reviewValue(data, "emergency_first_name", "")} ${reviewValue(data, "emergency_last_name", "")}`.trim() || "Not provided"],
        ["Emergency mobile", reviewValue(data, "emergency_mobile")]
      ]),
      createReviewCard("Care", 3, [
        ["Additional needs", reviewValue(data, "additional_needs")],
        ["Medical conditions", reviewValue(data, "medical_conditions")],
        ["Doctor", reviewValue(data, "doctor_name")],
        ["Ambulance cover", reviewValue(data, "ambulance_cover")],
        ["Court / parenting orders", reviewValue(data, "court_orders")],
        ["Immunisation statement", reviewValue(data, "immunisation_available")]
      ]),
      createReviewCard("Permissions", 4, [
        ["Previous school contact", reviewValue(data, "previous_school_permission")],
        ["Media permissions", reviewValue(data, "media_permissions", "None selected")],
        ["Fee responsibility", reviewValue(data, "fee_responsibility")],
        ["Referral source", reviewValue(data, "referral_source")],
        ["Decision factors", reviewValue(data, "decision_factors")]
      ]),
      createReviewCard("Documents", 5, Object.values(uploadedDocuments).length
        ? Object.values(uploadedDocuments).map((document) => [document.categoryLabel, document.fileName])
        : [["Uploaded files", "No documents uploaded"]])
    );
  }

  function renderUploadedDocuments() {
    document.querySelectorAll(".upload-card").forEach((card) => {
      const record = uploadedDocuments[card.dataset.document];
      card.classList.toggle("is-uploaded", Boolean(record));
      card.classList.remove("is-error");
      const status = card.querySelector(".upload-status");
      const button = card.querySelector(".upload-button span");
      if (record) {
        status.textContent = `Uploaded: ${record.fileName}`;
        button.textContent = "Replace file";
      } else {
        status.textContent = "";
        button.textContent = "Choose file";
      }
    });
  }

  function documentLabel(card) {
    return card.querySelector("strong").textContent.replace("*", "").trim();
  }

  async function uploadDocument(input) {
    const card = input.closest(".upload-card");
    const file = input.files?.[0];
    if (!file) return;
    card.classList.remove("is-error");
    const status = card.querySelector(".upload-status");

    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
      card.classList.add("is-error");
      status.textContent = "Use a PDF, JPG or PNG file no larger than 10 MB.";
      input.value = "";
      return;
    }

    status.textContent = "Uploading securely…";
    input.disabled = true;
    try {
      let uploadResult;
      if (previewMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        uploadResult = { key: `preview/${card.dataset.document}/${file.name}` };
      } else {
        const presign = await apiRequest("/documents/presign", {
          category: card.dataset.document,
          fileName: file.name,
          contentType: file.type,
          size: file.size
        });
        const response = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "x-amz-server-side-encryption": "AES256"
          },
          body: file
        });
        if (!response.ok) throw new Error("The document upload did not complete.");
        uploadResult = presign;
      }

      uploadedDocuments[card.dataset.document] = {
        category: card.dataset.document,
        categoryLabel: documentLabel(card),
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        storageKey: uploadResult.key
      };
      renderUploadedDocuments();
      scheduleSave();
      logEvent("document_uploaded", "Documents", { category: card.dataset.document, size: file.size });
    } catch (error) {
      card.classList.add("is-error");
      status.textContent = error.message || "The document could not be uploaded. Please try again.";
    } finally {
      input.disabled = false;
      input.value = "";
    }
  }

  function validateDocuments() {
    if (previewMode) return true;
    const missing = [...document.querySelectorAll("[data-required-document]")].filter((card) => {
      return !uploadedDocuments[card.dataset.document];
    });
    document.querySelectorAll(".upload-card").forEach((card) => card.classList.remove("is-error"));
    missing.forEach((card) => {
      card.classList.add("is-error");
      card.querySelector(".upload-status").textContent = "Required before submission, or explain why it is unavailable in final comments.";
    });
    return missing.length === 0;
  }

  async function submitApplication() {
    submitError.hidden = true;
    if (!previewMode && !validateStep(6)) return;
    const missingDocuments = previewMode ? false : !validateDocuments();
    const finalComments = form.elements.final_comments.value.trim();
    if (missingDocuments && !finalComments) {
      submitError.textContent = "Please upload the required documents or explain in final comments why they are not yet available.";
      submitError.hidden = false;
      showStep(5);
      return;
    }

    const submitButton = document.getElementById("submit-button");
    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = "Submitting securely…";
    logEvent("submission_started", "Review and sign");

    try {
      const payload = {
        application: formToObject(),
        documents: Object.values(uploadedDocuments),
        legalVersion: config.legalVersion || "",
        sessionId,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString()
      };
      let result;
      if (previewMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        result = { submissionId: `PREVIEW-${Date.now().toString().slice(-6)}` };
      } else {
        result = await apiRequest("/applications/submit", payload);
      }

      localStorage.removeItem(storageKey);
      document.getElementById("submission-reference").textContent = result.submissionId;
      await logEvent("submission_completed", "Review and sign", { submissionId: result.submissionId });
      showStep(7);
    } catch (error) {
      submitError.textContent = error.message || "Your application could not be submitted. Your answers remain saved on this device; please try again.";
      submitError.hidden = false;
      submitButton.disabled = false;
      submitButton.querySelector("span").textContent = "Submit enrolment application";
      logEvent("submission_failed", "Review and sign", { message: String(error.message || "unknown").slice(0, 120) });
    }
  }

  function setupEventListeners() {
    form.addEventListener("input", (event) => {
      event.target.removeAttribute("aria-invalid");
      event.target.closest(".field, .permission-card, .permission-tile")?.querySelector(".field-error")?.remove();
      scheduleSave();
    });
    form.addEventListener("change", scheduleSave);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitApplication();
    });

    document.querySelectorAll("[data-next]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!previewMode && currentStep > 0 && !validateStep(currentStep)) return;
        if (!previewMode && currentStep === 5) validateDocuments();
        logEvent(currentStep === 0 ? "form_started" : "step_completed", stepNames[currentStep]);
        showStep(currentStep + 1);
      });
    });
    document.querySelectorAll("[data-back]").forEach((button) => {
      button.addEventListener("click", () => showStep(Math.max(0, currentStep - 1)));
    });
    progressButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const requestedStep = Number(button.dataset.goStep);
        if (previewMode || requestedStep <= highestStep) showStep(requestedStep);
      });
    });

    document.getElementById("toggle-parent-b").addEventListener("click", (event) => {
      const card = document.getElementById("parent-b-card");
      card.hidden = !card.hidden;
      event.currentTarget.setAttribute("aria-expanded", String(!card.hidden));
      event.currentTarget.textContent = card.hidden ? "+ Add parent / guardian B" : "Remove parent / guardian B";
      syncConditionalFields();
      scheduleSave();
    });

    document.querySelectorAll("[data-file-input]").forEach((input) => {
      input.addEventListener("change", () => uploadDocument(input));
    });

    const factorInputs = [...document.querySelectorAll('input[name="decision_factors"]')];
    factorInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const selected = factorInputs.filter((control) => control.checked);
        factorInputs.forEach((control) => {
          control.disabled = selected.length >= 3 && !control.checked;
        });
        document.getElementById("factor-count").textContent = `${selected.length} of 3 selected.`;
      });
    });

    const noConditions = document.querySelector('input[name="medical_conditions"][value="No known medical conditions"]');
    document.querySelectorAll('input[name="medical_conditions"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input === noConditions && input.checked) {
          document.querySelectorAll('input[name="medical_conditions"]').forEach((other) => {
            if (other !== input) other.checked = false;
          });
        } else if (input.checked) {
          noConditions.checked = false;
        }
      });
    });

    window.addEventListener("beforeunload", saveDraft);
  }

  async function init() {
    try {
      await validateInvitation();
      accessMessage.hidden = true;
      form.hidden = false;
      if (previewMode) {
        document.body.classList.add("is-preview-mode");
        document.getElementById("preview-banner").hidden = false;
        saveState.querySelector("span:last-child").textContent = "Preview only";
        document.getElementById("submit-button").querySelector("span").textContent = "Finish content preview";
        document.getElementById("success-eyebrow").textContent = "Preview complete";
        document.getElementById("success-heading").textContent = "You’ve reached the end of the enrolment form.";
        document.getElementById("success-lead").textContent = "This was a content review only. No application or information was sent to Rosewood College.";
        document.getElementById("success-note").textContent = "You can return to the preview link at any time to review the form again.";
        document.getElementById("reference-label").textContent = "Preview reference";
      }
      if (invitation?.familyLabel) {
        document.getElementById("family-greeting").textContent = `, ${invitation.familyLabel}`;
      }
      if (invitation?.studentName) {
        const [firstName, ...lastName] = invitation.studentName.trim().split(/\s+/);
        setFieldValue("student_first_name", firstName);
        setFieldValue("student_last_name", lastName.join(" "));
      }
      form.elements.signature_a_date.value ||= todayString();
      form.elements.signature_b_date.value ||= todayString();
      restoreDraft();
      setupEventListeners();
      showStep(currentStep, { preserveScroll: true });
      logEvent("page_view", "Welcome");
    } catch (error) {
      showAccessError(error.message || "We could not confirm this invitation. Please contact the Rosewood enrolment team.");
    }
  }

  init();
})();
