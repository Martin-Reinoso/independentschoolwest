(() => {
  "use strict";

  const config = window.ROSEWOOD_V2_CONFIG || {};
  const params = new URLSearchParams(window.location.search);
  const previewMode = params.get("preview") === "1";
  const apiEndpoint = String(config.apiEndpoint || "").replace(/\/+$/, "");
  const schemaVersion = config.schemaVersion || "rosewood-v2-2026-08-02";
  const policyVersion = config.policyVersion || "draft-2026-08-02";
  const stageNames = ["Prepare", "Student", "Family", "Care", "Choices", "Documents", "Review", "Sign"];
  const baselineDocumentCategories = ["birth_certificate", "immunisation", "proof_of_address"];
  const schoolYearLevels = new Set(["Prep", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"]);
  const guardianLetters = ["b", "c", "d"];
  const allowedFileTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
  const maxFileBytes = 8 * 1024 * 1024;

  const accessView = document.getElementById("access-view");
  const applicationView = document.getElementById("application-view");
  const emailCard = document.getElementById("email-card");
  const otpCard = document.getElementById("otp-card");
  const requestOtpForm = document.getElementById("request-otp-form");
  const verifyOtpForm = document.getElementById("verify-otp-form");
  const enrolmentForm = document.getElementById("enrolment-form");
  const accessError = document.getElementById("access-error");
  const otpError = document.getElementById("otp-error");
  const globalErrors = document.getElementById("global-errors");
  const saveState = document.getElementById("save-state");
  const saveDetail = document.getElementById("save-detail");
  const otpInput = document.getElementById("otp-code");
  const verifyOtpButton = document.getElementById("verify-otp-button");

  const incomingInvitationToken = params.get("invite") || "";
  const storedInvitationToken = sessionStorage.getItem("rosewood_v2_invite") || "";
  let invitationToken = incomingInvitationToken || storedInvitationToken;
  let sessionToken = sessionStorage.getItem("rosewood_v2_session") || "";
  let sessionContext = null;
  let currentStage = 0;
  let maxVisitedStage = 0;
  let baseRevision = 0;
  let latestClientRevision = 0;
  let saveTimer = null;
  let saveInFlight = null;
  let localStorageKey = "";
  let challengeId = "";
  let resendTimer = null;
  let uploadedDocuments = {};
  let signatureStarted = false;
  let drawing = false;
  let lastPoint = null;
  const journeyStartedAt = Date.now();
  let stageStartedAt = journeyStartedAt;

  if (!previewMode && incomingInvitationToken) {
    if (storedInvitationToken && storedInvitationToken !== incomingInvitationToken) {
      sessionStorage.removeItem("rosewood_v2_session");
      sessionToken = "";
    }
    sessionStorage.setItem("rosewood_v2_invite", incomingInvitationToken);
    params.delete("invite");
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function setError(container, message) {
    container.textContent = message || "";
    container.hidden = !message;
  }

  function toast(message) {
    const region = document.getElementById("toast-region");
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => item.remove(), 4500);
  }

  function maskEmail(email) {
    const [local, domain] = String(email || "").split("@");
    if (!domain) return "your invited email";
    const shown = local.length <= 2 ? local[0] : `${local.slice(0, 2)}${"•".repeat(Math.min(5, local.length - 2))}`;
    return `${shown}@${domain}`;
  }

  async function apiRequest(path, options = {}) {
    if (previewMode) throw new Error("Preview mode cannot call the Rosewood service.");
    if (!apiEndpoint) throw new Error("The V2 service is not configured yet.");
    const headers = {
      "Content-Type": "application/json",
      "X-Client-Version": schemaVersion,
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(`${apiEndpoint}${path}`, {
      method: options.method || "GET",
      headers,
      cache: "no-store",
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "The Rosewood service could not complete this request.");
      error.code = payload.code || "REQUEST_FAILED";
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function operationId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  function track(eventName, stage = currentStage, elapsedOverride = null) {
    if (previewMode || !sessionToken || stage > 7) return;
    const elapsedSeconds = elapsedOverride ?? Math.round((Date.now() - stageStartedAt) / 1000);
    apiRequest("/v2/engagement", {
      method: "POST",
      idempotencyKey: operationId("engagement"),
      body: { eventName, stage, elapsedSeconds, viewport: `${window.innerWidth}x${window.innerHeight}` }
    }).catch(() => {});
  }

  function updateSaveStatus(state, title, detail) {
    saveState.dataset.state = state;
    saveState.querySelector("strong").textContent = title;
    saveDetail.textContent = detail;
  }

  function collectFormData() {
    const formData = new FormData(enrolmentForm);
    const result = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = Array.isArray(result[key]) ? [...result[key], value] : [result[key], value];
      } else {
        result[key] = value;
      }
    }
    result.documents = Object.values(uploadedDocuments).map(({ uploadUrl, ...document }) => document);
    return result;
  }

  function restoreFormData(data) {
    if (!data || typeof data !== "object") return;
    guardianLetters.forEach((letter) => {
      if (Object.keys(data).some((name) => name.startsWith(`guardian_${letter}_`))) addGuardian({ letter, focus: false, persist: false, announce: false });
    });
    for (const [name, raw] of Object.entries(data)) {
      if (name === "documents" && Array.isArray(raw)) {
        uploadedDocuments = Object.fromEntries(raw.map((document) => [document.category, document]));
        updateDocumentCards();
        continue;
      }
      const controls = [...enrolmentForm.elements].filter((control) => control.name === name);
      if (!controls.length) continue;
      const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      controls.forEach((control) => {
        if (control.type === "checkbox" || control.type === "radio") control.checked = values.includes(control.value);
        else control.value = values[0] || "";
      });
    }
    updateConditionals();
  }

  function saveLocalDraft() {
    if (previewMode || !localStorageKey) return;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify({
        schemaVersion,
        savedAt: new Date().toISOString(),
        data: collectFormData(),
        stage: currentStage,
        baseRevision
      }));
    } catch {
      updateSaveStatus("error", "Could not save on this device", "Your current answers remain visible, but this browser could not store the fallback copy.");
    }
  }

  function restoreLocalDraft({ newerThan = 0 } = {}) {
    if (previewMode || !localStorageKey) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(localStorageKey) || "null");
      if (!saved || saved.schemaVersion !== schemaVersion || !saved.data) return false;
      const localSavedAt = Date.parse(saved.savedAt || "") || 0;
      if (newerThan && localSavedAt <= newerThan) return false;
      restoreFormData(saved.data);
      maxVisitedStage = Math.min(7, Math.max(0, Number(saved.stage || 0)));
      updateSaveStatus("local", "Recovered on this device", `Local fallback from ${new Date(saved.savedAt).toLocaleString("en-AU")}. Waiting for the next secure save.`);
      return true;
    } catch {
      return false;
    }
  }

  async function saveDraft({ immediate = false } = {}) {
    window.clearTimeout(saveTimer);
    saveLocalDraft();
    latestClientRevision += 1;
    const requestedClientRevision = latestClientRevision;

    if (previewMode) {
      updateSaveStatus("saved", "Preview only", "Nothing is stored on this device or sent to Rosewood.");
      return { revision: baseRevision };
    }
    if (!sessionToken) return null;

    const execute = async () => {
      if (saveInFlight) await saveInFlight.catch(() => {});
      updateSaveStatus("saving", "Saving securely…", "Your local fallback is current; waiting for Rosewood to acknowledge this revision.");
      saveInFlight = apiRequest("/v2/draft", {
        method: "PUT",
        idempotencyKey: operationId("draft"),
        body: {
          baseRevision,
          clientRevision: requestedClientRevision,
          schemaVersion,
          policyVersion,
          currentStage,
          application: collectFormData()
        }
      });
      try {
        const result = await saveInFlight;
        baseRevision = Number(result.revision);
        saveLocalDraft();
        if (requestedClientRevision === latestClientRevision) {
          updateSaveStatus("saved", "Saved securely", `Revision ${baseRevision} acknowledged by Rosewood at ${new Date(result.savedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}.`);
        }
        return result;
      } catch (error) {
        if (error.code === "REVISION_CONFLICT") {
          updateSaveStatus("error", "This application changed elsewhere", "Reload and review the other saved revision before continuing.");
        } else {
          updateSaveStatus("error", "Could not save securely", "Your local fallback is current. Rosewood has not acknowledged the latest changes; retrying on the next edit.");
        }
        throw error;
      } finally {
        saveInFlight = null;
      }
    };

    if (immediate) return execute();
    saveTimer = window.setTimeout(() => execute().catch(() => {}), 1100);
    return null;
  }

  function fieldValue(name) {
    const controls = [...enrolmentForm.elements].filter((control) => control.name === name && !control.disabled);
    const selected = controls.filter((control) => {
      if (control.type === "checkbox" || control.type === "radio") return control.checked;
      return Boolean(control.value);
    });
    if (!selected.length) return "";
    return selected.map((control) => control.value).join(", ");
  }

  function requiredDocumentCategories() {
    const required = [...baselineDocumentCategories];
    if (schoolYearLevels.has(fieldValue("current_year_level"))) required.push("school_report");
    if (["Temporary resident", "Other / seeking advice"].includes(fieldValue("residency_status"))) required.push("residency");
    if (fieldValue("court_orders") === "Yes") required.push("court_order");
    if (fieldValue("anaphylaxis") === "Yes") required.push("medical_plan");
    return required;
  }

  function updateConditionals() {
    document.querySelectorAll("[data-show-when]").forEach((region) => {
      const [name, expectedValues = ""] = region.dataset.showWhen.split(":");
      const expected = expectedValues.split("|");
      const visible = expected.includes(fieldValue(name));
      region.hidden = !visible;
      region.querySelectorAll("input, select, textarea").forEach((control) => {
        control.disabled = !visible;
        if (control.dataset.requiredWhenVisible !== undefined) control.required = visible;
      });
    });
    updateDocumentCards();
    updateSignatureLock();
  }

  function setFieldError(control, message) {
    control.classList.add("field-invalid");
    control.setAttribute("aria-invalid", "true");
    let error = control.closest(".form-field")?.querySelector(".field-error[data-generated]");
    if (!error && control.closest(".form-field")) {
      error = document.createElement("p");
      error.className = "field-error";
      error.dataset.generated = "true";
      control.closest(".form-field").append(error);
    }
    if (error) error.textContent = message;
  }

  function clearValidation(stage) {
    stage.querySelectorAll(".field-invalid").forEach((control) => {
      control.classList.remove("field-invalid");
      control.removeAttribute("aria-invalid");
    });
    stage.querySelectorAll(".field-error[data-generated]").forEach((error) => error.remove());
    stage.querySelectorAll("fieldset[data-group-invalid]").forEach((fieldset) => delete fieldset.dataset.groupInvalid);
  }

  function validateDocumentStage(errors) {
    const pending = fieldValue("required_documents_pending") === "Yes";
    if (!pending) {
      requiredDocumentCategories().forEach((category) => {
        if (!uploadedDocuments[category]) errors.push(`Upload the required ${category.replaceAll("_", " ")} or explain why it is pending.`);
      });
    }
  }

  function validateStage(index, { focus = true } = {}) {
    const stage = document.querySelector(`[data-stage="${index}"]`);
    if (!stage) return true;
    clearValidation(stage);
    const errors = [];
    let firstInvalid = null;

    stage.querySelectorAll("input, select, textarea").forEach((control) => {
      if (control.disabled || control.type === "file" || control.type === "submit" || control.type === "button") return;
      if (!control.checkValidity()) {
        if ((control.type === "radio" || control.type === "checkbox") && stage.querySelector(`[name="${CSS.escape(control.name)}"]:checked`)) return;
        const label = control.closest("label")?.querySelector("span")?.textContent?.replace("*", "").trim() || control.name.replaceAll("_", " ");
        errors.push(`${label} is required or needs a valid value.`);
        firstInvalid ||= control;
        if (!["checkbox", "radio"].includes(control.type)) setFieldError(control, "Please complete this field.");
      }
    });

    stage.querySelectorAll("[data-min-checked]").forEach((group) => {
      const count = group.querySelectorAll("input[type=checkbox]:checked").length;
      const min = Number(group.dataset.minChecked || 0);
      const max = Number(group.dataset.maxChecked || Infinity);
      if (count < min) {
        errors.push(`Select at least ${min} option in this group.`);
        firstInvalid ||= group.querySelector("input");
      }
      if (count > max) {
        errors.push(`Select no more than ${max} options in this group.`);
        firstInvalid ||= group.querySelector("input:checked");
      }
    });

    if (index === 5) validateDocumentStage(errors);
    if (index === 7 && !signatureStarted) {
      errors.push("Draw your signature before submitting.");
      document.getElementById("signature-box").classList.add("is-invalid");
      document.getElementById("signature-error").hidden = false;
      firstInvalid ||= document.getElementById("signature-canvas");
    }

    const navItem = document.querySelector(`[data-go-stage="${index}"]`);
    navItem?.classList.toggle("has-errors", errors.length > 0);
    navItem?.classList.toggle("is-complete", errors.length === 0 && index < 7);
    if (errors.length) {
      track("validation_error", index);
      globalErrors.querySelector("ul").replaceChildren(...errors.map((message) => {
        const item = document.createElement("li");
        item.textContent = message;
        return item;
      }));
      globalErrors.hidden = false;
      if (focus) {
        globalErrors.focus();
        window.setTimeout(() => firstInvalid?.focus(), 80);
      }
      return false;
    }
    globalErrors.hidden = true;
    return true;
  }

  function setStage(index, { validateCurrent = false } = {}) {
    if (validateCurrent && !validateStage(currentStage)) return false;
    const previousStage = currentStage;
    const target = Math.max(0, Math.min(8, Number(index)));
    currentStage = target;
    maxVisitedStage = Math.max(maxVisitedStage, Math.min(target, 7));
    document.querySelectorAll(".stage").forEach((stage) => { stage.hidden = Number(stage.dataset.stage) !== target; });
    document.querySelectorAll("[data-go-stage]").forEach((button) => {
      const buttonStage = Number(button.dataset.goStage);
      button.setAttribute("aria-current", buttonStage === target ? "step" : "false");
      button.disabled = buttonStage > maxVisitedStage && !previewMode;
    });
    if (target === 6) buildReview();
    document.getElementById("mobile-step-name").textContent = target < 8 ? stageNames[target] : "Complete";
    document.getElementById("mobile-step-count").textContent = target < 8 ? `${target + 1} of 8` : "Complete";
    document.getElementById("mobile-progress-bar").style.width = `${Math.min(100, ((target + 1) / 8) * 100)}%`;
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector(`[data-stage="${target}"] h1, [data-stage="${target}"] h2`)?.focus?.({ preventScroll: true });
    saveLocalDraft();
    if (target !== previousStage) {
      track("stage_viewed", target);
      stageStartedAt = Date.now();
    }
    return true;
  }

  function valueLabel(value) {
    if (Array.isArray(value)) return value.length ? value.join(", ") : "Not provided";
    if (value === "Yes") return "Yes";
    return String(value || "Not provided");
  }

  function createReviewValueSection(id, title, stage, items) {
    const card = document.createElement("section");
    card.className = "form-card review-section";
    card.id = id;
    const heading = document.createElement("div");
    heading.className = "review-heading";
    heading.innerHTML = `<h3>${title}</h3>`;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-quiet";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => setStage(stage));
    heading.append(edit);
    const list = document.createElement("dl");
    list.className = "review-list";
    items.forEach(([label, value]) => {
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = valueLabel(value);
      list.append(term, description);
    });
    card.append(heading, list);
    return card;
  }

  function createReviewSection(id, title, stage, fields) {
    return createReviewValueSection(id, title, stage, fields.map(([label, name]) => [label, fieldValue(name)]));
  }

  function guardianReviewItems() {
    const items = [
      ["Guardian 1", `${fieldValue("guardian_a_first_name")} ${fieldValue("guardian_a_last_name")} · ${fieldValue("guardian_a_relationship")} · ${fieldValue("guardian_a_contact_role")} · required signer`],
      ["Guardian 1 email", fieldValue("guardian_a_email")],
      ["Guardian 1 mobile", fieldValue("guardian_a_mobile")],
      ["Guardian 1 lives with student", fieldValue("guardian_a_lives_with_student")],
      ["Guardian 1 legal responsibility", fieldValue("guardian_a_legal_responsibility")]
    ];
    guardianLetters.forEach((letter, index) => {
      if (!fieldValue(`guardian_${letter}_first_name`)) return;
      const required = fieldValue(`guardian_${letter}_required_signer`) === "Yes" ? "required signer" : "not a required signer";
      const label = `Guardian ${index + 2}`;
      items.push(
        [label, `${fieldValue(`guardian_${letter}_first_name`)} ${fieldValue(`guardian_${letter}_last_name`)} · ${fieldValue(`guardian_${letter}_relationship`)} · ${fieldValue(`guardian_${letter}_contact_role`)} · ${required}`],
        [`${label} email`, fieldValue(`guardian_${letter}_email`)],
        [`${label} mobile`, fieldValue(`guardian_${letter}_mobile`)],
        [`${label} lives with student`, fieldValue(`guardian_${letter}_lives_with_student`)],
        [`${label} legal responsibility`, fieldValue(`guardian_${letter}_legal_responsibility`)],
        [`${label} contact permission`, fieldValue(`guardian_${letter}_contact_permission`)]
      );
    });
    return items;
  }

  function buildReview() {
    const container = document.getElementById("review-content");
    container.replaceChildren(
      createReviewSection("review-student", "Student", 1, [["Legal first name", "student_first_name"], ["Middle names", "student_middle_names"], ["Legal family name", "student_last_name"], ["Preferred name", "student_preferred_name"], ["Date of birth", "student_date_of_birth"], ["Gender", "student_gender"], ["Proposed entry", "entry_year_level"], ["Commencement year", "entry_year"], ["Current setting", "current_school"], ["Current level", "current_year_level"], ["Residential address", "student_address"], ["Suburb", "student_suburb"], ["Postcode", "student_postcode"], ["Country of birth", "country_of_birth"], ["Residency", "residency_status"], ["Visa status", "visa_subclass"], ["Visa expiry", "visa_expiry"], ["Home language", "home_language"], ["Interpreter", "interpreter_required"], ["Faith tradition", "religion"], ["Parish or community", "parish"], ["Rosewood connection", "family_connection"], ["Future siblings", "future_siblings"], ["Future sibling details", "future_sibling_details"]]),
      createReviewValueSection("review-family", "Family and authority", 2, [...guardianReviewItems(), ["Care arrangement", fieldValue("care_arrangement")], ["Care arrangement details", fieldValue("care_arrangement_details")], ["Court or parenting orders", fieldValue("court_orders")], ["Order summary", fieldValue("court_order_summary")], ["Informal carer", fieldValue("informal_carer")], ["Emergency contact", `${fieldValue("emergency_first_name")} ${fieldValue("emergency_last_name")} · ${fieldValue("emergency_relationship")} · ${fieldValue("emergency_mobile")}`], ["Emergency email", fieldValue("emergency_email")], ["Emergency collection", fieldValue("emergency_may_collect")], ["All guardians included", fieldValue("guardian_completeness")]]),
      createReviewSection("review-care", "Learning, wellbeing and health", 3, [["Strengths", "student_strengths"], ["Current support", "additional_needs"], ["Support areas", "support_areas"], ["Support details", "support_details"], ["NDIS", "ndis_status"], ["Medical or allergy information", "medical_needs"], ["Conditions or allergies", "medical_conditions"], ["Medication and instructions", "medication_details"], ["Anaphylaxis", "anaphylaxis"], ["Immunisation status", "immunisation_status"], ["Doctor or practice", "doctor_practice"], ["Practice phone", "doctor_phone"], ["Ambulance cover", "ambulance_cover"]]),
      createReviewSection("review-choices", "Choices and responsibilities", 4, [["Previous setting permission", "previous_school_permission"], ["Previous setting", "previous_school_name"], ["Previous setting contact", "previous_school_contact"], ["Media permissions", "media_permissions"], ["Name permission", "student_name_permission"], ["Community updates", "community_updates"], ["Fee responsibility", "fee_responsibility"], ["Fee arrangement details", "fee_arrangement_details"], ["Referral source", "referral_source"], ["Decision factors", "decision_factors"]]),
      createReviewSection("review-documents", "Documents", 5, [["Uploaded categories", "documents"], ["Required evidence pending", "required_documents_pending"], ["Pending explanation", "pending_document_explanation"]])
    );
    document.getElementById("review-policy-version").textContent = policyVersion;
    const documentList = container.querySelector("#review-documents dd");
    if (documentList) documentList.textContent = Object.values(uploadedDocuments).map((document) => document.fileName).join(", ") || "No files uploaded";
  }

  function addGuardian({ letter = "", focus = true, persist = true, announce = true } = {}) {
    const active = new Set([...document.querySelectorAll("[data-guardian]")].map((card) => card.dataset.guardian));
    const selectedLetter = letter || guardianLetters.find((candidate) => !active.has(candidate));
    if (!guardianLetters.includes(selectedLetter) || active.has(selectedLetter)) {
      if (announce && !letter) toast("Please contact the enrolment team if more than four guardians or carers need to be recorded.");
      return null;
    }
    const fragment = document.getElementById("guardian-template").content.cloneNode(true);
    const card = fragment.querySelector(".guardian-card");
    card.dataset.guardian = selectedLetter;
    card.querySelector(".eyebrow").textContent = `Guardian ${guardianLetters.indexOf(selectedLetter) + 2}`;
    card.querySelectorAll("[data-guardian-field]").forEach((control) => {
      const field = control.dataset.guardianField;
      control.name = `guardian_${selectedLetter}_${field}`;
      control.id = `guardian-${selectedLetter}-${field}-${crypto.randomUUID()}`;
    });
    card.querySelector(".remove-guardian").addEventListener("click", () => {
      card.remove();
      document.getElementById("guardian-complete").checked = false;
      saveDraft();
      toast("Guardian removed. Please confirm the guardian list again.");
    });
    document.getElementById("additional-guardians").append(fragment);
    document.getElementById("guardian-complete").checked = false;
    updateConditionals();
    if (persist) saveDraft();
    if (focus) card.querySelector("input")?.focus();
    if (announce) toast("Guardian added. The completeness confirmation has been cleared.");
    return card;
  }

  function updateDocumentCards() {
    const required = new Set(requiredDocumentCategories());
    const visibility = {
      school_report: schoolYearLevels.has(fieldValue("current_year_level")),
      medical_plan: fieldValue("medical_needs") === "Yes" || fieldValue("additional_needs") === "Yes",
      court_order: ["Yes", "Unsure / seeking advice"].includes(fieldValue("court_orders")),
      residency: ["Temporary resident", "Other / seeking advice"].includes(fieldValue("residency_status")),
      sacramental: true
    };
    document.querySelectorAll("[data-document-card]").forEach((card) => {
      const category = card.dataset.documentCard;
      const document = uploadedDocuments[category];
      const status = card.querySelector("[data-document-status]");
      const remove = card.querySelector("[data-remove-document]");
      if (Object.prototype.hasOwnProperty.call(visibility, category)) card.hidden = !visibility[category] && !document;
      if (document) {
        status.textContent = document.fileName;
        card.dataset.uploaded = "true";
        if (remove) remove.hidden = false;
      } else {
        status.textContent = required.has(category) ? "Required - not uploaded" : "Optional";
        delete card.dataset.uploaded;
        if (remove) remove.hidden = true;
      }
    });
  }

  async function removeDocument(category, button) {
    const document = uploadedDocuments[category];
    if (!document) return;
    button.disabled = true;
    try {
      if (!previewMode) {
        await apiRequest("/v2/documents/remove", {
          method: "POST",
          idempotencyKey: operationId("document-remove"),
          body: { category, documentId: document.documentId }
        });
      }
      delete uploadedDocuments[category];
      updateDocumentCards();
      if (!previewMode) await saveDraft({ immediate: true });
      else saveLocalDraft();
      toast(`${document.fileName} was removed.`);
    } catch (error) {
      toast(error.message || "The document could not be removed.");
    } finally {
      button.disabled = false;
    }
  }

  function prepareDocumentControls() {
    document.querySelectorAll("[data-document-card]").forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-danger document-remove";
      button.dataset.removeDocument = card.dataset.documentCard;
      button.textContent = "Remove";
      button.hidden = true;
      button.addEventListener("click", () => removeDocument(card.dataset.documentCard, button));
      card.querySelector(".document-state").append(button);
    });
  }

  async function uploadDocument(input) {
    const file = input.files?.[0];
    if (!file) return;
    const category = input.dataset.documentCategory;
    const card = input.closest(".document-card");
    const status = card.querySelector("[data-document-status]");
    const progress = card.querySelector(".upload-progress");
    const bar = progress.querySelector("span");
    if (uploadedDocuments[category]) {
      input.value = "";
      toast("Remove the existing file before choosing a replacement.");
      return;
    }
    if (!allowedFileTypes.has(file.type)) {
      input.value = "";
      toast("Use a PDF, JPG or PNG file.");
      return;
    }
    if (file.size > maxFileBytes) {
      input.value = "";
      toast("This file is larger than the 8 MB limit.");
      return;
    }

    status.textContent = previewMode ? "Simulating upload…" : "Preparing secure upload…";
    progress.hidden = false;
    bar.style.width = "18%";

    try {
      if (previewMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        bar.style.width = "100%";
        uploadedDocuments[category] = { category, fileName: file.name, mimeType: file.type, size: file.size, documentId: `preview-${category}` };
      } else {
        const session = await apiRequest("/v2/documents/session", {
          method: "POST",
          idempotencyKey: operationId("document-session"),
          body: { category, fileName: file.name, mimeType: file.type, size: file.size }
        });
        bar.style.width = "38%";
        const uploadResponse = await fetch(session.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        const driveFile = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !driveFile.id) throw new Error("Google Drive did not confirm the upload.");
        bar.style.width = "78%";
        const confirmed = await apiRequest("/v2/documents/confirm", {
          method: "POST",
          idempotencyKey: operationId("document-confirm"),
          body: { category, documentId: driveFile.id }
        });
        uploadedDocuments[category] = confirmed.document;
        bar.style.width = "100%";
      }
      updateDocumentCards();
      toast(`${file.name} is ready.`);
      saveDraft();
    } catch (error) {
      bar.style.width = "0";
      status.textContent = "Upload failed";
      toast(error.message || "The document could not be uploaded.");
    } finally {
      window.setTimeout(() => { progress.hidden = true; }, 800);
    }
  }

  function signatureContext() {
    const canvas = document.getElementById("signature-canvas");
    return canvas.getContext("2d", { willReadFrequently: true });
  }

  function updateSignatureLock() {
    const enabled = document.getElementById("signature-record-declaration").checked && document.getElementById("signature-consent-declaration").checked;
    const overlay = document.getElementById("signature-overlay");
    overlay.hidden = enabled;
    document.getElementById("signature-canvas").setAttribute("aria-disabled", String(!enabled));
  }

  function canvasPoint(event) {
    const canvas = document.getElementById("signature-canvas");
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  }

  function startSignature(event) {
    if (!document.getElementById("signature-overlay").hidden) return;
    drawing = true;
    lastPoint = canvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drawSignature(event) {
    if (!drawing) return;
    const point = canvasPoint(event);
    const context = signatureContext();
    context.strokeStyle = "#1f3f63";
    context.lineWidth = 3.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPoint = point;
    signatureStarted = true;
    document.getElementById("clear-signature").disabled = false;
    document.getElementById("signature-box").classList.remove("is-invalid");
    document.getElementById("signature-error").hidden = true;
    document.getElementById("signature-date").textContent = `Signing date: ${new Date().toLocaleDateString("en-AU")} (confirmed by the server on submission).`;
  }

  function stopSignature(event) {
    drawing = false;
    lastPoint = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
  }

  function clearSignature() {
    const canvas = document.getElementById("signature-canvas");
    signatureContext().clearRect(0, 0, canvas.width, canvas.height);
    signatureStarted = false;
    document.getElementById("clear-signature").disabled = true;
    document.getElementById("signature-date").textContent = "Date will be set by the Rosewood service when submitted.";
  }

  function beginResendCountdown(seconds = 60) {
    window.clearInterval(resendTimer);
    const resend = document.getElementById("resend-otp");
    const countdown = document.getElementById("resend-countdown");
    let remaining = seconds;
    resend.disabled = true;
    countdown.textContent = `Resend available in ${remaining}s`;
    resendTimer = window.setInterval(() => {
      remaining -= 1;
      countdown.textContent = remaining > 0 ? `Resend available in ${remaining}s` : "";
      if (remaining <= 0) {
        window.clearInterval(resendTimer);
        resend.disabled = false;
      }
    }, 1000);
  }

  async function requestOtp(email) {
    setError(accessError, "");
    const submit = requestOtpForm.querySelector("button[type=submit]");
    submit.disabled = true;
    submit.textContent = "Sending securely…";
    try {
      const result = await apiRequest("/v2/access/request-otp", {
        method: "POST",
        idempotencyKey: operationId("request-otp"),
        body: { invitationToken, email }
      });
      challengeId = result.challengeId || "";
      document.getElementById("masked-email").textContent = result.maskedEmail || maskEmail(email);
      emailCard.hidden = true;
      otpCard.hidden = false;
      otpInput.value = "";
      otpInput.focus();
      beginResendCountdown(Number(result.resendAfterSeconds || 60));
    } catch (error) {
      setError(accessError, error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "Send my secure code";
    }
  }

  async function verifyOtp(code) {
    setError(otpError, "");
    verifyOtpButton.disabled = true;
    verifyOtpButton.textContent = "Verifying…";
    try {
      const result = await apiRequest("/v2/access/verify-otp", {
        method: "POST",
        idempotencyKey: operationId("verify-otp"),
        body: { invitationToken, challengeId, code }
      });
      sessionToken = result.sessionToken;
      sessionStorage.setItem("rosewood_v2_session", sessionToken);
      sessionStorage.setItem("rosewood_v2_invite", invitationToken);
      await openApplication(result.context);
      track("application_opened", currentStage, Math.round((Date.now() - journeyStartedAt) / 1000));
    } catch (error) {
      setError(otpError, error.message);
      otpInput.select();
    } finally {
      verifyOtpButton.textContent = "Verify and open application";
      verifyOtpButton.disabled = otpInput.value.length !== 6;
    }
  }

  async function openApplication(initialContext = null) {
    sessionContext = initialContext;
    if (!previewMode && !sessionContext) sessionContext = await apiRequest("/v2/session");
    if (previewMode) {
      sessionContext = {
        inviteId: "preview-invite",
        familyLabel: "The Example Family",
        studentName: "Ava Example",
        recipientEmail: "parent@example.test",
        revision: 0,
        draft: null
      };
    }
    baseRevision = Number(sessionContext.revision || 0);
    localStorageKey = sessionContext.inviteId ? `rosewood_v2_draft_${sessionContext.inviteId}` : "";
    document.getElementById("journey-student").textContent = sessionContext.studentName || sessionContext.familyLabel || "Invited family";
    if (sessionContext.recipientEmail) enrolmentForm.elements.guardian_a_email.value = sessionContext.recipientEmail;
    if (sessionContext.studentName) {
      const parts = sessionContext.studentName.trim().split(/\s+/);
      enrolmentForm.elements.student_first_name.value = parts.shift() || "";
      enrolmentForm.elements.student_last_name.value = parts.join(" ");
    }
    const serverDraft = sessionContext.draft?.application ? sessionContext.draft : null;
    const recoveredLocal = restoreLocalDraft({ newerThan: Date.parse(serverDraft?.savedAt || "") || 0 });
    if (!recoveredLocal && serverDraft) restoreFormData(serverDraft.application);
    accessView.hidden = true;
    applicationView.hidden = false;
    updateConditionals();
    setStage(0);
    if (previewMode) {
      updateSaveStatus("saved", "Preview only", "Nothing entered here is saved or sent.");
    } else if (recoveredLocal) {
      updateSaveStatus("local", "Recovered on this device", "This browser copy is newer than Rosewood's acknowledged revision. It will be saved securely after your next change.");
    } else if (serverDraft) {
      updateSaveStatus("saved", "Saved securely", `Revision ${baseRevision} recovered from Rosewood.`);
    } else {
      updateSaveStatus("local", "Secure session verified", "Draft changes will be kept on this device and acknowledged by Rosewood after each pause.");
    }
  }

  async function submitApplication() {
    for (let index = 0; index <= 7; index += 1) {
      if (!validateStage(index, { focus: false })) {
        setStage(index);
        validateStage(index, { focus: true });
        return;
      }
    }
    const submit = document.getElementById("submit-application");
    submit.disabled = true;
    submit.textContent = previewMode ? "Completing preview…" : "Submitting securely…";
    try {
      if (previewMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        document.getElementById("application-reference").textContent = "RW-PREVIEW-2027";
        document.getElementById("complete-lead").textContent = "This content preview is complete. No information, file or signature was saved or sent.";
      } else {
        await saveDraft({ immediate: true });
        const canvas = document.getElementById("signature-canvas");
        const result = await apiRequest("/v2/applications/submit", {
          method: "POST",
          idempotencyKey: operationId("submit"),
          body: {
            expectedRevision: baseRevision,
            schemaVersion,
            policyVersion,
            declarations: {
              information: fieldValue("information_declaration"),
              privacy: fieldValue("privacy_acknowledgement"),
              authority: fieldValue("authority_declaration"),
              audit: fieldValue("signature_record_declaration"),
              intent: fieldValue("signature_consent_declaration")
            },
            signerName: fieldValue("signature_name"),
            signatureDataUrl: canvas.toDataURL("image/png")
          }
        });
        document.getElementById("application-reference").textContent = result.reference;
        if (result.status === "submitted") {
          document.getElementById("additional-signature-status").classList.add("is-complete");
          document.getElementById("additional-signature-status").querySelector("span").textContent = "Every required guardian signature is complete.";
          document.getElementById("receipt-status").classList.add("is-complete");
          document.getElementById("receipt-status").querySelector("span").textContent = "Your immutable receipt is ready through the secure link emailed to you.";
        }
        if (localStorageKey) localStorage.removeItem(localStorageKey);
        sessionStorage.removeItem("rosewood_v2_session");
        sessionStorage.removeItem("rosewood_v2_invite");
      }
      setStage(8);
    } catch (error) {
      toast(error.message || "The application could not be submitted. Your draft remains available.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Submit my signature";
    }
  }

  function bindEvents() {
    prepareDocumentControls();
    requestOtpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = document.getElementById("access-email").value.trim();
      if (!document.getElementById("access-email").checkValidity()) {
        setError(accessError, "Enter the invited email address in a valid format.");
        return;
      }
      requestOtp(email);
    });
    verifyOtpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (/^\d{6}$/.test(otpInput.value)) verifyOtp(otpInput.value);
    });
    otpInput.addEventListener("input", () => {
      otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
      verifyOtpButton.disabled = otpInput.value.length !== 6;
      setError(otpError, "");
    });
    document.getElementById("change-email").addEventListener("click", () => {
      otpCard.hidden = true;
      emailCard.hidden = false;
      challengeId = "";
      document.getElementById("access-email").focus();
    });
    document.getElementById("resend-otp").addEventListener("click", () => requestOtp(document.getElementById("access-email").value.trim()));
    document.getElementById("preview-entry").addEventListener("click", () => openApplication());
    document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", async () => {
      const completedStage = currentStage;
      const elapsedSeconds = Math.round((Date.now() - stageStartedAt) / 1000);
      if (setStage(currentStage + 1, { validateCurrent: true })) {
        track("stage_completed", completedStage, elapsedSeconds);
        await saveDraft({ immediate: true }).catch(() => {});
      }
    }));
    document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => setStage(currentStage - 1)));
    document.querySelectorAll("[data-go-stage]").forEach((button) => button.addEventListener("click", () => setStage(Number(button.dataset.goStage))));
    document.getElementById("add-guardian").addEventListener("click", () => addGuardian());
    document.querySelectorAll("[data-document-category]").forEach((input) => input.addEventListener("change", () => uploadDocument(input)));
    enrolmentForm.addEventListener("input", (event) => {
      if (event.target.type !== "file") {
        updateConditionals();
        saveDraft();
      }
    });
    enrolmentForm.addEventListener("change", (event) => {
      if (event.target.name?.startsWith("guardian_") && event.target.name !== "guardian_completeness") document.getElementById("guardian-complete").checked = false;
      updateConditionals();
      if (event.target.type !== "file") saveDraft();
    });
    enrolmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitApplication();
    });
    const canvas = document.getElementById("signature-canvas");
    canvas.addEventListener("pointerdown", startSignature);
    canvas.addEventListener("pointermove", drawSignature);
    canvas.addEventListener("pointerup", stopSignature);
    canvas.addEventListener("pointercancel", stopSignature);
    document.getElementById("clear-signature").addEventListener("click", clearSignature);
  }

  async function initialise() {
    bindEvents();
    updateConditionals();
    if (previewMode) {
      document.getElementById("preview-entry").hidden = false;
      requestOtpForm.hidden = true;
      document.querySelector("#email-card > p:not(.eyebrow)").textContent = "Explore every stage with synthetic information. Preview mode cannot save, upload, send email or submit.";
      return;
    }
    if (!invitationToken) {
      setError(accessError, "This private page requires the invitation link sent by Rosewood College.");
      requestOtpForm.querySelector("button").disabled = true;
      return;
    }
    if (!apiEndpoint) {
      setError(accessError, "The V2 secure service has not been connected yet. Use the synthetic preview while deployment is completed.");
      requestOtpForm.querySelector("button").disabled = true;
      return;
    }
    if (sessionToken) {
      try {
        await openApplication();
        track("application_opened", currentStage);
      } catch {
        sessionToken = "";
        sessionStorage.removeItem("rosewood_v2_session");
      }
    }
  }

  initialise();
})();
