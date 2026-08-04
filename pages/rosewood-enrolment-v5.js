/* Rosewood Enrolment V5: frontend-only review build. No values leave this page. */
(function () {
  "use strict";

  const root = document.querySelector("#form-root");
  const form = document.querySelector("#family-form");
  const workflowSelect = document.querySelector("#workflow-select");
  const errorSummary = document.querySelector("#error-summary");
  const state = { workflow: "application", step: 0, values: {}, touched: {}, counts: { guardian: 2, sibling: 1, futureSibling: 1, relative: 1, emergency: 2 }, signatures: {} };

  const yesNo = ["Yes", "No"];
  const yesNoUnsure = ["Yes", "No", "Unsure"];
  const entryYears = Array.from({ length: 19 }, (_, index) => String(2027 + index));
  const genders = ["Female", "Male", "Non-binary", "Another term", "Prefer not to say"];
  const needs = ["Autism spectrum (ASD)", "Acquired brain injury", "ADD / ADHD", "Anxiety", "Behavioural concerns", "Giftedness", "Global developmental delay", "Oral language / communication difficulties", "Intellectual disability / developmental delay", "Physical impairment", "Mental health issues", "Vision impairment", "Hearing impairment", "Other"];
  const medicalConditions = ["No medical condition", "Anaphylaxis", "Asthma", "Diabetes", "Epilepsy", "Migraines", "Other"];
  const discovery = ["Current school", "Family or friends", "Parish", "Rosewood website", "Social media", "Community event", "Open day or tour", "Local advertising", "Search engine", "Other"];
  const decisionFactors = ["Catholic identity and values", "School culture", "Learning approach", "Student wellbeing", "Additional learning support", "Location", "Facilities", "Class sizes", "Co-curricular opportunities", "Reputation", "Family recommendation", "Fees", "Other"];
  const applicationDiscovery = ["Advertising", "Current school family", "Early learning centre / kindergarten", "Friends", "Internet search", "Live in area", "Local parish / church", "Past student / family", "School website", "Social media", "Word of mouth", "Another primary school"];
  const applicationInfluences = ["Reputation", "Environment and atmosphere", "Mission, values and culture", "Faith based", "Location", "Facilities", "Fees", "Class sizes", "Size of school", "Pastoral care", "Catering to individual needs", "Learning support", "Quality of teaching", "Curriculum range and choice", "Sports", "Arts", "Co-curriculum", "Coeducation", "Family history or connection", "Friends attending", "Referral from friends or family", "Tour"];

  const workflows = {
    eoi: {
      label: "Expression of interest",
      title: "Expression of interest.",
      copy: "Register your interest in Rosewood College. This is not an application for enrolment.",
      steps: ["Contact", "Student", "Interest", "Review"],
      render: [renderEoiContact, renderEoiStudent, renderEoiInterest, renderReview]
    },
    application: {
      label: "Application for enrolment",
      title: "Application for enrolment.",
      copy: "Work through the student, family, health, document and consent information required to assess an application.",
      steps: ["Access", "Student", "Family", "Documents", "Conditions", "Sign"],
      render: [renderAccess, renderStudent, renderFamily, renderDocuments, renderConditions, renderSignature]
    },
    acceptance: {
      label: "Offer acceptance",
      title: "Accept an enrolment offer.",
      copy: "Review the offer, confirm family details and complete the enrolment agreement as a separate transaction.",
      steps: ["Offer", "Student", "Family", "Documents", "Agreement", "Sign"],
      render: [renderOffer, renderAcceptanceStudent, renderFamily, renderAcceptanceDocuments, renderAcceptanceAgreement, renderSignature]
    },
    signing: {
      label: "Guardian signing",
      title: "Review and sign the agreement.",
      copy: "An invited guardian verifies their identity, reviews the complete agreement and signs in a clearly separated step.",
      steps: ["Identity", "Introduction", "Details", "Review", "Sign", "Complete"],
      render: [renderSigningIdentity, renderSigningIntroduction, renderSigningDetails, renderSigningReview, renderSigningSignature, renderSigningComplete]
    },
    decline: {
      label: "Decline offer",
      title: "Decline an enrolment offer.",
      copy: "Declining an offer is kept separate from the application and acceptance forms.",
      steps: ["Offer", "Student", "Family", "Sign"],
      render: [renderOffer, renderDeclineStudent, renderFamily, renderSignature]
    }
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function attrs(options = {}) {
    const output = [];
    if (options.required) output.push("required");
    if (options.type === "email") output.push('autocomplete="email"');
    if (options.autocomplete) output.push(`autocomplete="${esc(options.autocomplete)}"`);
    if (options.maxlength) output.push(`maxlength="${options.maxlength}"`);
    if (options.accept) output.push(`accept="${esc(options.accept)}"`);
    if (options.multiple) output.push("multiple");
    if (options.readonly) output.push("readonly");
    return output.join(" ");
  }

  function field(name, label, options = {}) {
    const value = state.values[name] || options.value || "";
    const required = options.required ? ' <span class="required" aria-hidden="true">*</span>' : "";
    const className = `field ${options.className || ""}`.trim();
    let control;
    if (options.type === "textarea") {
      control = `<textarea id="${name}" name="${name}" ${attrs(options)}>${esc(value)}</textarea>`;
    } else if (options.type === "select") {
      control = `<select id="${name}" name="${name}" ${attrs(options)}><option value="">Select</option>${(options.options || []).map(option => `<option${value === option ? " selected" : ""}>${esc(option)}</option>`).join("")}</select>`;
    } else if (options.type === "file") {
      control = `<input id="${name}" name="${name}" type="file" ${attrs(options)}><span class="file-state" data-file-state>Nothing selected</span>`;
    } else {
      control = `<input id="${name}" name="${name}" type="${options.type || "text"}" value="${esc(value)}" ${attrs(options)}>`;
    }
    return `<label class="${className}" for="${name}"><span>${label}${required}</span>${control}${options.hint ? `<small>${options.hint}</small>` : ""}</label>`;
  }

  function choices(name, label, options, config = {}) {
    const type = config.multiple ? "checkbox" : "radio";
    const selected = Array.isArray(state.values[name]) ? state.values[name] : [state.values[name]];
    return `<fieldset class="question ${config.className || ""}"${config.max ? ` data-max="${config.max}"` : ""}${config.required && config.multiple ? " data-required-group" : ""}><legend>${label}${config.required ? ' <span class="required" aria-hidden="true">*</span>' : ""}</legend><div class="${config.grid ? "choice-grid" : "choice-row"}">${options.map((option, index) => `<label class="choice"><input type="${type}" name="${name}" value="${esc(option)}"${selected.includes(option) ? " checked" : ""}${config.required && !config.multiple && index === 0 ? " required" : ""}><span>${esc(option)}</span></label>`).join("")}</div>${config.hint ? `<small class="group-note">${config.hint}</small>` : ""}</fieldset>`;
  }

  function intro(title, lead, eyebrow = "") {
    return `<div class="section-intro">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h3>${title}</h3><p class="lead">${lead}</p></div>`;
  }

  function section(title, body, note = "") {
    return `<details class="form-section" open><summary><span>${title}</span>${note ? `<small>${note}</small>` : ""}</summary><div class="section-body">${body}</div></details>`;
  }

  function notice(title, copy, className = "notice") {
    return `<div class="${className}"><strong>${title}</strong><p>${copy}</p></div>`;
  }

  function actions(options = {}) {
    const steps = workflows[state.workflow].steps;
    const back = state.step > 0 ? '<button class="button button-secondary" type="button" data-action="back">Back</button>' : "<span></span>";
    const final = state.step === steps.length - 1;
    const label = options.label || (final ? completionLabel() : "Save and continue");
    return `<div class="step-actions"><div>${back}</div><div class="right">${options.secondary || ""}<button class="button button-primary" type="submit"${options.disabled ? " disabled" : ""}>${label}</button></div></div>`;
  }

  function completionLabel() {
    return ({ eoi: "Finish preview", application: "Finish application preview", acceptance: "Finish acceptance preview", signing: "Finish signing preview", decline: "Finish decline preview" })[state.workflow];
  }

  function repeatCard(kind, index, title, fields) {
    return `<article class="repeat-card"><header><h4>${title} ${index + 1}</h4>${index > 0 ? `<button type="button" class="button button-quiet" data-remove="${kind}">Remove</button>` : ""}</header><div class="field-grid">${fields(index)}</div></article>`;
  }

  function repeatBlock(kind, title, singular, fields) {
    return `<div class="repeat-list">${Array.from({ length: state.counts[kind] }, (_, index) => repeatCard(kind, index, singular, fields)).join("")}</div><div class="repeat-controls"><button type="button" class="button button-secondary" data-add="${kind}">Add ${singular.toLowerCase()}</button></div>`;
  }

  function guardianFields(index, full = true) {
    const prefix = `guardian_${index}_`;
    return field(prefix + "title", "Title", { type: "select", options: ["Mr", "Mrs", "Ms", "Mx", "Dr", "Other"], required: true }) +
      field(prefix + "first", "Legal first name", { required: true, autocomplete: "given-name" }) +
      field(prefix + "last", "Legal family name", { required: true, autocomplete: "family-name" }) +
      field(prefix + "relationship", "Relationship to student", { type: "select", options: ["Mother", "Father", "Parent", "Guardian", "Carer", "Other"], required: true }) +
      field(prefix + "email", "Email", { type: "email", required: true }) +
      field(prefix + "mobile", "Mobile phone", { type: "tel", required: true, autocomplete: "tel" }) +
      (full ? choices(prefix + "share", "Share these contact details with the other parent/guardian contacts?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" }) +
      field(prefix + "home", "Home phone", { type: "tel" }) +
      field(prefix + "work", "Work phone", { type: "tel" }) +
      field(prefix + "contactType", "Contact role", { type: "select", options: ["Primary contact", "Secondary contact"], required: true }) +
      field(prefix + "marital", "Marital status", { type: "select", options: ["Married", "Separated", "Divorced", "Single", "Widowed", "Other", "Prefer not to say"] }) +
      field(prefix + "religion", "Religion", { type: "select", options: ["Catholic", "Other Christian", "Other religion", "No religion", "Prefer not to say"] }) +
      field(prefix + "healthcareCard", "Health Care Card status and details") +
      field(prefix + "address", "Residential address", { className: "span-three", autocomplete: "street-address", required: true }) +
      choices(prefix + "postalSame", "Is the postal address the same as the residential address?", yesNo, { required: true, className: "span-three" }) +
      field(prefix + "postalAddress", "Postal address, if different", { className: "span-three" }) +
      choices(prefix + "alumni", "Did this person attend Rosewood?", yesNo, { required: true, className: "span-three" }) +
      field(prefix + "alumniYear", "Graduation or final year") +
      field(prefix + "alumniName", "Name while at school", { className: "span-two" }) +
      field(prefix + "occupationGroup", "Occupation group", { type: "select", options: ["A", "B", "C", "D", "N – no paid employment in the previous 12 months"] }) +
      field(prefix + "occupation", "Occupation", {}) +
      field(prefix + "employer", "Employer", {}) +
      field(prefix + "schoolEducation", "Highest school education", { type: "select", options: ["Year 12", "Year 11", "Year 10", "Year 9 or below"] }) +
      field(prefix + "furtherEducation", "Further education", { type: "select", options: ["Bachelor degree or above", "Advanced Diploma / Diploma", "Certificate I–IV", "No post-school qualification"] }) +
      field(prefix + "country", "Country of birth", {}) +
      field(prefix + "nationality", "Nationality", {}) +
      field(prefix + "ethnicity", "Cultural or ethnic background", {}) +
      field(prefix + "languages", "Languages spoken", {}) +
      field(prefix + "residency", "Residency status", { type: "select", options: ["Citizen", "Permanent resident", "Temporary resident"] }) +
      field(prefix + "visa", "Visa subclass and expiry") +
      choices(prefix + "indigenous", "Aboriginal and/or Torres Strait Islander", ["Not applicable", "Aboriginal", "Torres Strait Islander", "Both", "Prefer not to say"], { className: "span-three" }) +
      choices(prefix + "sms", "May the school send necessary enrolment and operational SMS messages?", yesNo, { required: true, className: "span-three" }) +
      choices(prefix + "contactPermission", "May Rosewood contact this person about the student?", ["Yes", "No, do not contact them"], { required: true, className: "span-three", hint: "Selecting No prevents routine contact and a separate signature invitation; contact the College if you are unsure." }) : "");
  }

  function renderEoiContact() {
    return intro("Your contact details", "Tell us who we should contact about this expression of interest.", "Expression of interest") +
      notice("Before you begin", "Submitting an expression of interest does not guarantee a place and is not an application for enrolment.") +
      section("Parent, guardian or carer", `<div class="field-grid">${field("eoi_title", "Title", { type: "select", options: ["Mr", "Mrs", "Ms", "Mx", "Dr", "Other"], required: true })}${field("eoi_first", "First name", { required: true, autocomplete: "given-name" })}${field("eoi_last", "Family name", { required: true, autocomplete: "family-name" })}${field("eoi_email", "Email", { type: "email", required: true })}${field("eoi_mobile", "Mobile phone", { type: "tel", required: true })}${field("eoi_relationship", "Relationship to student", { required: true })}</div>`) +
      section("Home address", `<div class="field-grid">${field("eoi_address", "Street address", { required: true, className: "span-two" })}${field("eoi_suburb", "Suburb", { required: true })}${field("eoi_state", "State", { type: "select", options: ["VIC", "NSW", "ACT", "QLD", "SA", "WA", "TAS", "NT"], required: true })}${field("eoi_postcode", "Postcode", { required: true })}</div>`) + actions();
  }

  function renderEoiStudent() {
    return intro("Student details", "Provide the student’s basic details and the year level you are considering.") +
      section("Student", `<div class="field-grid">${field("student_first", "Legal first name", { required: true })}${field("student_middle", "Middle name")}${field("student_last", "Legal family name", { required: true })}${field("student_preferred", "Preferred name")}${field("student_dob", "Date of birth", { type: "date", required: true })}${field("student_gender", "Gender", { type: "select", options: genders, required: true })}</div>`) +
      section("Proposed enrolment", `<div class="field-grid">${field("entry_year", "Calendar year", { type: "select", options: entryYears, required: true })}${field("entry_level", "Year level", { type: "select", options: ["Foundation", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"], required: true })}${field("current_school", "Current school or early learning service")}</div>${choices("additional_needs", "Does the student have additional learning, development or wellbeing needs?", yesNoUnsure, { required: true })}${choices("need_categories", "Support or need categories", needs, { multiple: true, grid: true, hint: "Select all that apply. This appears only when Yes or Unsure is selected." })}`) + actions();
  }

  function renderEoiInterest() {
    return intro("Your interest in Rosewood", "This helps the College understand your connection and answer your questions.") +
      section("Connection", choices("family_connection", "Does your family have a current or previous connection with Rosewood?", yesNo, { required: true }) + `<div class="field-grid">${field("connection_details", "Please tell us who and how", { className: "span-three" })}</div>`) +
      section("How you found us", choices("discovery", "How did you hear about Rosewood?", discovery, { multiple: true, grid: true }) + choices("decision_factors", "What matters most when choosing a school?", decisionFactors, { multiple: true, grid: true, max: 3, hint: "Choose up to three." })) +
      section("Anything else", `<div class="field-grid">${field("eoi_questions", "Questions or additional information", { type: "textarea", className: "span-three", maxlength: 1500 })}</div>`) + actions();
  }

  function renderAccess() {
    return intro("Secure application access", "In production, each invited family receives a unique link and verifies its identity before any personal information is shown.", "Application") +
      notice("Frontend review", "This screen simulates the intended access sequence. It will not send an email, OTP or create a record.") +
      section("Invitation", `<div class="status-card"><strong>Application invitation</strong><p>Student: Avery Example · Proposed commencement: 2027 · Status: Not started</p></div><div class="field-grid two">${field("access_email", "Invited email address", { type: "email", required: true })}${field("access_code", "Six-digit verification code", { required: true, hint: "Any six digits work in this frontend review." })}</div>`) + actions();
  }

  function renderStudent() {
    return intro("Student information", "This section follows the full application record: identity, schooling, family connections, background, learning support, sacraments and health.", "Application") +
      section("Identity and enrolment", `<div class="field-grid">${field("student_first", "Legal first name", { required: true })}${field("student_middle", "Middle name")}${field("student_last", "Legal family name", { required: true })}${field("student_preferred", "Preferred name")}${field("student_dob", "Date of birth", { type: "date", required: true })}${field("student_gender", "Gender", { type: "select", options: genders, required: true })}${field("student_religion", "Religion", { type: "select", options: ["Catholic", "Anglican", "Orthodox", "Other Christian", "Buddhist", "Hindu", "Islam", "Jewish", "Sikh", "Pentecostal", "Evangelical", "Booked for Baptism", "Other", "No religion", "Prefer not to say"], required: true })}${field("entry_year", "Commencement year", { type: "select", options: entryYears, required: true })}${field("entry_level", "Commencement year level", { type: "select", options: ["Foundation", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"], required: true })}${field("entry_term", "Commencement term", { type: "select", options: ["Term 1", "Term 2", "Term 3", "Term 4"], required: true })}${field("current_level", "Current year level", { type: "select", options: ["Not yet at school", "Early years / kindergarten", "Foundation", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"], required: true })}${field("current_school", "Current school or early learning service", { className: "span-two" })}</div>`) +
      section("Residence and family connections", `${choices("share_student_address", "May this address be shared with the other contacts on this application?", ["Yes, share it", "No, keep it private"], { required: true })}${choices("care_arrangement", "Home care arrangement", ["Both parents", "Mother only", "Father only", "Shared custody", "Carer / guardian", "Out-of-home care", "Kinship", "Other"], { required: true, grid: true })}<div class="field-grid">${field("care_other", "Other care arrangement")}${field("shared_care_details", "Shared-parenting schedule or relevant arrangements", { type: "textarea", className: "span-two" })}${field("student_address", "Street address", { required: true, className: "span-two" })}${field("student_suburb", "Suburb", { required: true })}${field("student_state", "State", { required: true })}${field("student_postcode", "Postcode", { required: true })}${field("residence_country", "Country of residence", { required: true })}</div>${choices("family_connection_type", "Family connection with Rosewood", ["Current family", "Previous family", "New family"], { required: true })}${choices("attending_siblings", "Are any siblings already attending Rosewood?", yesNo, { required: true })}<div data-conditional-repeat="sibling">${repeatBlock("sibling", "Siblings currently attending", "Sibling", index => field(`sibling_${index}_name`, "Full name") + field(`sibling_${index}_status`, "Status") + field(`sibling_${index}_dob`, "Date of birth", { type: "date" }) + field(`sibling_${index}_level`, "Year level") + field(`sibling_${index}_school`, "School or preschool"))}</div>${choices("future_siblings", "Are there other children who may enrol in future?", yesNo, { required: true })}<div data-conditional-repeat="futureSibling">${repeatBlock("futureSibling", "Other children who may enrol", "Child", index => field(`future_${index}_first`, "First name") + field(`future_${index}_last`, "Family name") + field(`future_${index}_level`, "Expected year level") + field(`future_${index}_year`, "Possible starting year") + field(`future_${index}_dob`, "Date of birth", { type: "date" }) + field(`future_${index}_school`, "Current school or preschool"))}</div>${choices("other_relatives", "Have any other relatives attended Rosewood?", yesNo, { required: true })}<div data-conditional-repeat="relative">${repeatBlock("relative", "Other family connections", "Relative", index => field(`relative_${index}_name`, "Full name") + field(`relative_${index}_relationship`, "Relationship") + field(`relative_${index}_years`, "Year or years attended"))}</div>`) +
      section("Background and residency", `<div class="field-grid">${field("birth_country", "Country of birth", { required: true })}${field("nationality", "Country of nationality", { required: true })}${field("ethnicity", "Cultural or ethnic background")}${field("arrival_date", "Arrival or return date in Australia", { type: "date" })}${field("residency_status", "Residential status", { type: "select", options: ["Permanent", "Temporary"], required: true })}${field("home_language", "Main language spoken at home", { required: true })}${field("other_languages", "Other languages spoken", { className: "span-two" })}</div>${choices("australian_citizen", "Is the student an Australian citizen?", yesNo, { required: true })}${choices("residency_evidence", "Evidence of residency", ["Permanent resident", "Eligible for Australian passport", "Temporary resident", "Other / visitor / overseas student"], { grid: true })}<div class="field-grid two">${field("visa_subclass", "Current visa subclass")}${field("visa_expiry", "Visa expiry", { type: "date" })}${field("previous_visa", "Previous visa subclass", { className: "span-two" })}</div>${choices("aboriginal_tsi", "Does the student identify as Aboriginal and/or Torres Strait Islander?", ["Not applicable", "Aboriginal", "Torres Strait Islander", "Aboriginal and Torres Strait Islander", "Prefer not to say"], { required: true })}`) +
      section("Learning, development and wellbeing", `${choices("additional_needs", "Does the student have additional learning, development or wellbeing needs?", yesNoUnsure, { required: true })}${choices("need_categories", "Support or need categories", needs, { multiple: true, grid: true, required: true })}<div class="field-grid">${field("need_details", "Please describe the student’s needs, strengths and current support", { type: "textarea", className: "span-three" })}${field("professionals", "Professionals or services involved", { className: "span-two" })}${field("ndis", "NDIS plan or funded support")}</div>${choices("professional_categories", "Health professionals involved", ["Paediatrician", "Psychologist", "Speech pathologist", "Occupational therapist", "Physiotherapist", "Counsellor", "Other"], { multiple: true, grid: true })}${choices("reports_available", "Are assessments, reports or support plans available?", yesNo, {})}${choices("court_orders", "Are there court orders or parenting arrangements affecting the school?", yesNo, { required: true })}<div class="field-grid">${field("other_relevant_information", "Other relevant information", { type: "textarea", className: "span-three" })}</div>`) +
      section("Sacraments", `<div class="field-grid">${field("parish", "Current parish")}</div>${["Baptism", "Reconciliation", "First Eucharist", "Confirmation"].map(item => `${choices(`sacrament_${item}`, `${item} received?`, yesNo, {})}<div class="field-grid two">${field(`sacrament_${item}_date`, `${item} date`, { type: "date" })}${field(`sacrament_${item}_place`, `${item} parish or place`)}</div>`).join("")}`) +
      section("Medical and emergency information", `${choices("medical_conditions", "Medical conditions", medicalConditions, { multiple: true, grid: true, required: true })}<div class="field-grid">${field("medical_details", "Condition details", { type: "textarea", className: "span-two" })}${field("allergy_details", "Allergy details", { type: "textarea" })}${field("medication", "Medication, dose and timing", { className: "span-two" })}${field("medical_device", "Medical device or action plan")}</div>${choices("anaphylaxis_risk", "Is the student at risk of anaphylaxis?", yesNo, {})}${choices("anaphylaxis_device", "Does the student carry an EpiPen or Anapen?", ["EpiPen", "Anapen", "Neither", "Not applicable"], {})}${choices("immunisation", "Is the student’s immunisation history statement available?", yesNo, { required: true })}${choices("humanitarian", "Has the student completed a humanitarian health assessment, if applicable?", ["Yes", "No", "Not applicable", "Unsure"], {})}<div class="field-grid">${field("doctor_name", "Doctor or clinic name", { required: true })}${field("doctor_address", "Doctor address", { className: "span-two" })}${field("doctor_phone", "Doctor phone", { type: "tel", required: true })}${field("medicare", "Medicare number and reference")}${field("medicare_expiry", "Medicare expiry")}${field("private_insurer", "Private health insurer")}${field("private_policy", "Policy number")}${field("ambulance", "Ambulance cover or membership")}${field("healthcare_card", "Health Care Card status and details", { className: "span-two" })}</div>`) + actions();
  }

  function renderFamily() {
    return intro("Parent, guardian and emergency contacts", "Add every adult who has parental responsibility or day-to-day care. Contact details are kept as separate records.", workflows[state.workflow].label) +
      notice("Separated families and carers", "Where parents are separated, the school may require both parents’ consent or relevant court orders. Informal carers may need a statutory declaration.", "legal-note") +
      section("Parents, guardians and carers", repeatBlock("guardian", "Contacts", "Contact", index => guardianFields(index, true)), `${state.counts.guardian} contact records`) +
      section("Emergency contacts", repeatBlock("emergency", "Emergency contacts", "Emergency contact", index => (index === 0 ? choices(`emergency_${index}_share`, "May these emergency details be shared with the other contacts?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" }) : "") + field(`emergency_${index}_first`, "First name", { required: true }) + field(`emergency_${index}_last`, "Family name", { required: true }) + field(`emergency_${index}_relationship`, "Relationship", { required: true }) + field(`emergency_${index}_mobile`, "Mobile phone", { type: "tel", required: true }) + field(`emergency_${index}_home`, "Home phone", { type: "tel" }) + field(`emergency_${index}_work`, "Work phone", { type: "tel" }) + field(`emergency_${index}_email`, "Email", { type: "email" }))) +
      section("Contact confirmation", choices("contacts_complete", "Have all people with parental responsibility or day-to-day care been included?", yesNo, { required: true, hint: "Select No if another contact still needs to be added." })) + actions();
  }

  const applicationDocuments = [
    ["Birth certificate", "A copy of the student’s birth certificate."],
    ["Immunisation statement, medical management plans or health professional reports", "Current health and support evidence, where applicable."],
    ["School reports or NAPLAN results", "The two most recent school reports and available NAPLAN results, where applicable."],
    ["Sacramental certificates", "Relevant sacramental evidence, where applicable."],
    ["Proof of address", "A recent gas, electricity or water bill."],
    ["Passport or visa documentation", "Relevant residency and visa evidence, where applicable."]
  ];

  function documentCard(item, index, required = false) {
    return `<article class="document-card"><header><div><h4>${item[0]}${required ? ' <span class="required">*</span>' : ""}</h4><p>${item[1]}</p></div><span class="document-badge">PDF, JPG or PNG · 10 MB each</span></header><div class="file-picker">${field(`document_${index}`, `Choose ${item[0].toLowerCase()}`, { type: "file", required, multiple: true, accept: ".pdf,.jpg,.jpeg,.png" })}</div></article>`;
  }

  function renderDocuments() {
    return intro("Supporting documents", "Upload the documents relevant to this application. In this review build, files remain on your device and only the filename is displayed.", "Application") +
      notice("Sensitive information", "Use a secure, access-controlled upload service before release. Email attachments and public cloud links are not an acceptable production substitute.", "legal-note") +
      `<div class="document-list">${applicationDocuments.map((item, index) => documentCard(item, index, index === 0 || index === 4)).join("")}</div>` + actions();
  }

  const applicationTerms = [
    ["Accuracy of information", "The information provided must be true, complete and kept up to date."],
    ["Authority to enrol", "The person submitting confirms they have authority to provide the information and consents required."],
    ["Enrolment assessment", "The College may consider the application against its published enrolment policy and available places."],
    ["Educational records", "The College may contact current or previous schools to obtain information relevant to enrolment and transition."],
    ["Health and safety", "Families must disclose information needed to support the student’s health, safety and participation."],
    ["Learning support", "The College may consult with the family and relevant professionals to plan reasonable support."],
    ["Family arrangements", "Court orders, parenting arrangements and changes to parental responsibility must be provided promptly."],
    ["Attendance", "Students are expected to attend regularly and families must explain absences."],
    ["Student behaviour", "Students and families are expected to support the College’s behaviour and child-safety expectations."],
    ["Communication", "Families must maintain current contact details and respond to important College communications."],
    ["Digital services", "School systems and devices must be used in accordance with the applicable acceptable-use requirements."],
    ["Images and recordings", "Optional permissions are collected separately and may be changed prospectively."],
    ["Fees", "Fee responsibility must be allocated explicitly between the people named below."],
    ["Privacy", "Personal information is handled under the College Privacy Collection Notice and Privacy Policy."],
    ["Changes", "Material changes affecting enrolment information or consents must be reported to the College."]
  ];

  function termsList(terms) {
    return `<ol class="terms-list">${terms.map(term => `<li><strong>${term[0]}</strong><span>${term[1]}</span></li>`).join("")}</ol>`;
  }

  function renderConditions() {
    return intro("Conditions, permissions and fees", "Review the enrolment conditions and make each optional or financial decision explicitly.", "Application") +
      notice("Draft Rosewood wording", "These clauses map the required decision points but require approval by Rosewood’s governing body and legal/privacy advisers before release.", "legal-note") +
      section("Application conditions", termsList(applicationTerms)) +
      section("Educational records", choices("records_permission", "May Rosewood contact the student’s current or previous school and request relevant educational records?", ["I give permission", "I do not give permission"], { required: true }) + `<div class="field-grid">${field("previous_school_name", "Previous school name", { required: true })}${field("previous_school_address", "Previous school address", { className: "span-two", required: true })}</div>${choices("previous_school_interstate", "Is the previous school interstate?", ["No", "Yes", "Not applicable"], { required: true })}`) +
      section("Images and recordings", choices("photo_permission", "Student photographs", ["I give permission", "I do not give permission"], { required: true }) + choices("recording_permission", "Audio or video recordings", ["I give permission", "I do not give permission"], { required: true }) + choices("name_permission", "Use of the student’s name with approved material", ["First name only", "First and family name", "No name"], { required: true }) + choices("media_channels", "Approved channels", ["Secure family portal", "Printed College publications", "College website", "College social media", "News media"], { multiple: true, grid: true })) +
      section("National Educational Access Licence for Schools", notice("NEALS notice", "The College may copy and communicate student work for educational purposes under the National Educational Access Licence for Schools. Public promotional use remains governed by the permissions above.")) +
      section("Fee responsibility", choices("fee_arrangement", "How will school fee responsibility be allocated?", ["One person is responsible for 100%", "Two people share responsibility", "Another approved arrangement"], { required: true }) + `<div class="field-grid">${field("fee_person_1", "Responsible person 1 – full name", { required: true })}${field("fee_percent_1", "Percentage", { type: "number", required: true, hint: "The combined allocation must total 100%." })}${field("fee_start_1", "Responsibility start date", { type: "date", required: true })}${field("fee_person_2", "Responsible person 2 – full name")}${field("fee_percent_2", "Percentage", { type: "number" })}${field("fee_start_2", "Responsibility start date", { type: "date" })}</div>`) +
      section("Application insight", choices("discovery", "How did you first hear about Rosewood?", applicationDiscovery, { multiple: true, grid: true, required: true }) + choices("decision_factors", "Which factors most influenced your application?", applicationInfluences, { multiple: true, grid: true, max: 3, required: true, hint: "Choose the three most important." })) + actions();
  }

  function victorianGuidance() {
    return `<div class="guidance"><p><strong>The Victorian Government provides the following guidance regarding admission requirements.</strong></p><p><strong>Consent</strong></p><p>The signature of:</p><ul><li>the student, if they are over 15 and living independently</li><li>a parent as defined in the Family Law Act 1975</li><li>both parents for parents who are separated, or a copy of any court order that affects the relationship between the family and the school</li><li>an informal carer, supported by a statutory declaration.</li></ul><p><strong>In the absence of a current court order, each parent of a child who is not 18 has equal parental responsibility.</strong></p><p>An informal carer may be a relative or other carer, has day-to-day care of the student with the student regularly living with them, and may provide other consent such as for excursions.</p><p>Statutory declarations for informal carers apply for 12 months. In a dispute, the wishes of a parent legally responsible for the student prevail over those of an informal carer.</p><p>Secondary students may complete parts of the form and co-sign.</p></div>`;
  }

  function signaturePanel(prefix, declarationText, options = {}) {
    return `<div class="signature-card"><h4>${options.title || "Parent or guardian declaration"}</h4><label class="declaration"><input type="checkbox" name="${prefix}_ip" required><span><strong>IP address recording</strong>I acknowledge that, at the time of signing, my IP address will be recorded and stored by the College for administrative, security and legal compliance purposes.</span></label><p class="validation-message" data-validation-for="${prefix}_ip" hidden>You must acknowledge the IP address recording to continue.</p><label class="declaration"><input type="checkbox" name="${prefix}_terms" required><span><strong>Declaration</strong>${declarationText}</span></label><p class="validation-message" data-validation-for="${prefix}_terms" hidden>You must agree to the terms to continue.</p><div class="field-grid two">${field(prefix + "_name", "Signer’s full legal name", { required: true })}${field(prefix + "_date", "Date", { type: "date", required: true, value: new Date().toISOString().slice(0, 10), readonly: true })}</div><div class="signature-wrap is-locked" data-signature="${prefix}"><canvas width="960" height="190" tabindex="0" aria-label="Signature area. Use a pointer to sign or press Enter to add a review signature."></canvas><div class="signature-overlay">Please agree to the terms above to enable signing</div></div><button type="button" class="button button-secondary" data-clear-signature="${prefix}">Clear signature</button><p class="group-note">In production, the signature event would be linked to the authenticated signer, agreement version, timestamp and audit record.</p></div>`;
  }

  function renderSignature() {
    const copy = state.workflow === "decline" ? "I confirm that I am authorised to decline this offer and that the information in this form is correct." : state.workflow === "acceptance" ? "I have read and agree to the enrolment agreement and confirm that the information provided is correct." : "I confirm that this application is complete and correct and that I have reviewed the conditions and permissions recorded in it.";
    return intro(state.workflow === "decline" ? "Sign the decline notice" : "Declaration and signature", "Review the guidance and declarations before signing.", workflows[state.workflow].label) +
      section("Victorian admission guidance", victorianGuidance()) +
      notice("Privacy disclaimer", "Personal information will be held, used and disclosed in accordance with the College Privacy Collection Notice and Privacy Policy available on the College website.", "legal-note") +
      section("Signature", signaturePanel(state.workflow, copy)) +
      section("Additional information", `<div class="field-grid">${field("signature_comments", "Comments or information for the College", { type: "textarea", className: "span-three", maxlength: 1000 })}</div>${choices("only_signer", "Are you the only person with parental responsibility or authority required to sign?", yesNo, { required: true, hint: "If No, the other person would receive their own secure signing invitation." })}`) + actions();
  }

  function renderOffer() {
    return intro("Your enrolment offer", "Confirm that you have opened the intended student’s offer before continuing.", workflows[state.workflow].label) +
      notice("Frontend review", "This synthetic offer does not affect any real application or enrolment record.") +
      section("Offer record", `<div class="status-card"><strong>Offer for Avery Example</strong><p>Proposed commencement: Year 7, Term 1 2027 · Offer status: Awaiting family decision</p></div><div class="field-grid two">${field("offer_email", "Invited email", { type: "email", required: true })}${field("offer_code", "Verification code", { required: true, hint: "Any six digits work in review mode." })}</div>${choices("offer_correct", "Is this the correct student and offer?", yesNo, { required: true })}`) + actions();
  }

  function renderAcceptanceStudent() {
    return intro("Confirm student details", "The offer is pre-filled from the application. Correct any changed details before accepting.", "Offer acceptance") +
      section("Student and commencement", `<div class="field-grid">${field("student_first", "Legal first name", { required: true })}${field("student_middle", "Middle name")}${field("student_last", "Legal family name", { required: true })}${field("student_dob", "Date of birth", { type: "date", required: true })}${field("student_gender", "Gender", { type: "select", options: genders, required: true })}${field("entry_year", "Commencement year", { required: true })}${field("entry_level", "Year level", { required: true })}${field("entry_term", "Term", { required: true })}${field("current_school", "Current school", { className: "span-two" })}</div>${choices("student_correct", "Are these student and commencement details correct?", yesNo, { required: true })}`) + actions();
  }

  function renderAcceptanceDocuments() {
    const docs = [["Parent/Guardian/Carer Code of Conduct", "Read the current College code, sign it, then upload the signed copy."], ["Student Code of Conduct", "Read the current student code with the student before continuing."]];
    return intro("Required documents", "Review each current Rosewood document. The reference links below are intentionally disabled until Rosewood-approved versions are supplied.", "Offer acceptance") +
      notice("Release blocker", "Do not publish this workflow until Rosewood-approved, versioned documents replace these placeholders.", "legal-note") +
      `<div class="document-list">${docs.map((item, index) => `<article class="document-card"><header><div><h4>${item[0]}</h4><p>${item[1]}</p></div><span class="document-badge">Approval pending</span></header><button type="button" class="button button-secondary" disabled>Open current document</button><div class="file-picker">${field(index === 0 ? "signed_parent_code" : "signed_student_code", `Upload signed ${item[0]}`, { type: "file", required: true, accept: ".pdf,.jpg,.jpeg,.png" })}</div></article>`).join("")}</div>` + actions();
  }

  const acceptanceTerms = applicationTerms.concat([["Acceptance of place", "The family accepts the offered place for the stated commencement and agrees to tell the College promptly if circumstances change."]]);

  function renderAcceptanceAgreement() {
    return intro("Enrolment agreement", "Review the conditions attached to accepting the place and record the required permissions.", "Offer acceptance") +
      notice("Draft Rosewood agreement", "The workflow and decision points are complete, but this wording is not a legally approved Rosewood enrolment agreement.", "legal-note") +
      section("Agreement conditions", termsList(acceptanceTerms)) +
      section("Permissions", choices("transfer_permission", "May Rosewood contact the previous school and request transfer records?", ["I give permission", "I do not give permission"], { required: true }) + choices("accept_media", "Media permission", ["I give permission", "I do not give permission"], { required: true }) + choices("ict_ack", "I have reviewed the digital technologies and acceptable-use expectations", ["Confirmed"], { required: true })) +
      section("Agreement confirmation", `<label class="declaration"><input type="checkbox" name="agreement_ready" required><span><strong>I accept the enrolment agreement</strong>I have read the conditions, documents and permissions above and am ready to continue to signing.</span></label>`) + actions();
  }

  function renderSigningIdentity() {
    return intro("Verify your identity", "You have been invited to sign the enrolment agreement for Avery Example.", "Guardian signing") +
      notice("No email will be sent", "This frontend simulates the identity check. A production OTP must be delivered by an approved transactional email service using a Rosewood-controlled domain.") +
      section("Email verification", `<div class="field-grid two">${field("sign_email", "Email", { type: "email", required: true })}${field("sign_code", "Verification code", { required: true, hint: "Any six digits work in review mode." })}</div>`) + actions();
  }

  function renderSigningIntroduction() {
    return intro("Sign the Enrolment Agreement Form", "You will confirm your details, review the complete submitted agreement and provide your own electronic signature.", "Guardian signing") +
      notice("About five minutes", "Your signature is an individual task. Any other required guardian signs through their own secure invitation.") +
      section("Form and student", `<div class="review-card"><h4>Enrolment Agreement Form</h4><dl><dt>Student</dt><dd>Avery Example</dd><dt>School</dt><dd>Rosewood College</dd><dt>Your role</dt><dd>Parent/guardian signer</dd></dl></div>`) + actions({ label: "Next: confirm my details" });
  }

  function renderSigningDetails() {
    return intro("Confirm your details", "Check the pre-filled guardian record before reviewing the agreement.", "Guardian signing") +
      section("Hannah Example · Parent/guardian", `<div class="field-grid">${guardianFields(0, false)}</div>${choices("sign_share", "Share these details with the other contacts?", ["Yes, share them", "No, keep them private"], { required: true })}${choices("sign_contact_type", "Contact type", ["Primary contact", "Secondary contact"], { required: true })}${choices("sign_contact_permission", "May Rosewood contact you about this student?", ["Yes", "No, do not contact me"], { required: true })}${choices("sign_details_correct", "I confirm my details are correct", ["Confirmed"], { required: true })}`) + actions();
  }

  function renderSigningReview() {
    return intro("Review the complete agreement", "This page is read-only. Signing controls appear on the next page.", "Guardian signing") +
      notice("Important", "The ‘Pending signature’ area below is a status marker only. It cannot be signed on this review page.") +
      section("Student and offer", `<div class="review-card"><h4>Avery Example</h4><dl><dt>Commencement</dt><dd>Year 7, Term 1 2027</dd><dt>School</dt><dd>Rosewood College</dd><dt>Acceptance</dt><dd>Place accepted by the submitting guardian</dd></dl></div>`) +
      section("Parents and guardians", `<div class="review-card"><h4>Alex Example</h4><dl><dt>Relationship</dt><dd>Parent</dd><dt>Signature</dt><dd>Recorded in submitted agreement</dd></dl></div><div class="review-card"><h4>Hannah Example</h4><dl><dt>Relationship</dt><dd>Parent</dd><dt>Signature status</dt><dd>Pending – read-only preview. You will sign on the next page.</dd></dl></div>`) +
      section("Documents", `<div class="review-card"><h4>Conduct documents</h4><dl><dt>Parent/Guardian/Carer Code</dt><dd>Signed copy recorded</dd><dt>Student Code</dt><dd>Signed copy recorded</dd></dl></div>`) +
      section("Agreement, permissions and signatures", termsList(acceptanceTerms) + `<div class="status-card"><strong>Current signature task: Hannah Example</strong><p>Signature status: Pending – continue to the dedicated Sign page below.</p></div>`) +
      `<label class="declaration"><input type="checkbox" name="review_ready" required><span><strong>I have reviewed the form and am ready to proceed</strong>The Next button becomes available once this confirmation is selected.</span></label>` + actions({ label: "Next: sign agreement", disabled: true });
  }

  function renderSigningSignature() {
    return intro("Sign the enrolment agreement", "Agree to both terms to enable the signature area. The date is set automatically.", "Guardian signing") +
      section("Hannah Example · Parent/guardian", signaturePanel("guardian_sign", "As the parent/guardian of my child, I declare that I have read, understood and given consent to the matters in this enrolment agreement, including the Parent/Guardian/Carer Code and Student Code of Conduct.", { title: "Parent/Guardian: Hannah Example" })) + actions({ label: "Finish signing preview", disabled: true });
  }

  function renderSigningComplete() {
    return `<div class="success-card"><div class="success-mark" aria-hidden="true">✓</div><p class="eyebrow">Guardian signing</p><h3>Signature step complete</h3><p>In production, Hannah’s signature would now be recorded and the agreement would show whether any other guardian signatures remain outstanding.</p><div class="status-card"><strong>Review-mode result</strong><p>No signature, IP address, timestamp, email or document has been saved.</p></div><button type="button" class="button button-secondary" data-action="view-signed">View signed form preview</button></div>`;
  }

  function renderDeclineStudent() {
    return intro("Decline the enrolment offer", "Confirm the student and tell Rosewood why the place will not be accepted.", "Decline offer") +
      section("Student and offer", `<div class="field-grid">${field("student_first", "Student first name", { required: true })}${field("student_last", "Student family name", { required: true })}${field("student_gender", "Gender", { type: "select", options: genders, required: true })}${field("entry_year", "Offer year", { required: true })}${field("entry_level", "Offered year level", { required: true })}${field("entry_term", "Commencement", { required: true })}</div>`) +
      section("Decision", choices("decline_confirm", "Do you confirm that you wish to decline this enrolment offer?", ["Yes, decline the offer"], { required: true }) + `<div class="field-grid">${field("decline_reason", "Reason for declining", { type: "textarea", className: "span-three", required: true })}${field("destination_school", "Name of the school the student will attend instead", { className: "span-two", required: true })}${field("decline_details", "Additional information", { type: "textarea", className: "span-three" })}</div>`) + actions();
  }

  function reviewEntries() {
    return Object.entries(state.values).filter(([, value]) => value && (!Array.isArray(value) || value.length)).slice(0, 80);
  }

  function renderReview() {
    const entries = reviewEntries();
    return intro("Review your expression of interest", "Check the details below before finishing this frontend preview.", "Expression of interest") +
      notice("Nothing will be submitted", "The finish button demonstrates the completion state only. All information disappears when this page is closed.") +
      `<div class="review-card"><h4>Your answers</h4><dl>${entries.length ? entries.map(([key, value]) => `<dt>${esc(key.replaceAll("_", " "))}</dt><dd>${esc(Array.isArray(value) ? value.join(", ") : value)}</dd>`).join("") : "<dt>No answers yet</dt><dd>Use Back or the synthetic example to add review data.</dd>"}</dl></div>` + actions();
  }

  function captureValues() {
    const data = new FormData(form);
    const checkboxNames = new Set([...form.querySelectorAll('input[type="checkbox"]')].map(input => input.name));
    form.querySelectorAll("input, select, textarea").forEach(control => {
      if (!control.name || control.type === "file") return;
      if (control.type === "checkbox") return;
      if (control.type === "radio" && !control.checked) return;
      state.values[control.name] = control.value;
    });
    checkboxNames.forEach(name => { state.values[name] = data.getAll(name); });
  }

  function render() {
    const workflow = workflows[state.workflow];
    const step = Math.min(state.step, workflow.steps.length - 1);
    state.step = step;
    document.querySelector("#workflow-label").textContent = workflow.label;
    document.querySelector("#step-title").textContent = workflow.steps[step];
    document.querySelector("#story-kicker").textContent = workflow.label;
    document.querySelector("#story-title").textContent = workflow.title;
    document.querySelector("#story-copy").textContent = workflow.copy;
    document.querySelector("#progress-label").textContent = `Step ${step + 1} of ${workflow.steps.length}`;
    const percent = Math.round((step / Math.max(workflow.steps.length - 1, 1)) * 100);
    document.querySelector("#progress-percent").textContent = `${percent}% complete`;
    document.querySelector("#progress-bar").style.width = `${percent}%`;
    document.querySelector("#step-list").innerHTML = workflow.steps.map((label, index) => `<li><button type="button" data-step="${index}"${index === step ? ' aria-current="step"' : ""}${index < step ? ' class="is-reviewed"' : ""}>${label}</button></li>`).join("");
    root.innerHTML = workflow.render[step]();
    errorSummary.hidden = true;
    bindCanvas();
    updateConditionalFields();
    window.scrollTo({ top: document.querySelector(".form-panel").offsetTop, behavior: "smooth" });
  }

  function validate() {
    errorSummary.hidden = true;
    root.querySelectorAll(".is-invalid").forEach(element => element.classList.remove("is-invalid"));
    const messages = [];
    const required = [...root.querySelectorAll("[required]")].filter(control => !control.disabled && control.offsetParent !== null);
    const radioGroups = new Set();
    required.forEach(control => {
      if (control.type === "radio") {
        if (radioGroups.has(control.name)) return;
        radioGroups.add(control.name);
        if (!root.querySelector(`input[name="${CSS.escape(control.name)}"]:checked`)) markInvalid(control, messages);
      } else if (control.type === "checkbox") {
        if (!control.checked) markInvalid(control, messages);
      } else if (!control.value.trim()) {
        markInvalid(control, messages);
      } else if (control.type === "email" && !control.checkValidity()) {
        markInvalid(control, messages, "Enter a valid email address");
      }
    });
    root.querySelectorAll(".question[data-max]").forEach(group => {
      const max = Number(group.dataset.max);
      if (group.querySelectorAll('input[type="checkbox"]:checked').length > max) {
        group.classList.add("is-invalid");
        messages.push(`Choose no more than ${max} options for ${group.querySelector("legend").textContent.replace("*", "").trim()}`);
      }
    });
    root.querySelectorAll(".question[data-required-group]").forEach(group => {
      if (group.hidden || [...group.querySelectorAll("input")].every(input => input.disabled)) return;
      if (!group.querySelector('input[type="checkbox"]:checked')) {
        group.classList.add("is-invalid");
        messages.push(`Choose at least one option for ${group.querySelector("legend").textContent.replace("*", "").trim()}`);
      }
    });
    root.querySelectorAll("[data-signature]").forEach(container => {
      const name = container.dataset.signature;
      if (!state.signatures[name]) {
        container.classList.add("is-invalid");
        messages.push("Provide a signature");
      }
    });
    if (messages.length) {
      errorSummary.querySelector("ul").innerHTML = [...new Set(messages)].map(message => `<li>${esc(message)}</li>`).join("");
      errorSummary.hidden = false;
      errorSummary.focus();
      return false;
    }
    return true;
  }

  function markInvalid(control, messages, override) {
    const wrapper = control.closest(".field, .question, .declaration") || control;
    wrapper.classList.add("is-invalid");
    const label = wrapper.querySelector("strong, legend, .field > span")?.textContent.replace("*", "").trim() || control.name;
    messages.push(override || `Complete ${label}`);
  }

  function updateConditionalFields() {
    const needsAnswer = root.querySelector('input[name="additional_needs"]:checked')?.value;
    const categories = root.querySelector('input[name="need_categories"]')?.closest("fieldset");
    if (categories) {
      categories.hidden = !["Yes", "Unsure"].includes(needsAnswer);
      categories.querySelectorAll("input").forEach(input => { input.disabled = categories.hidden; });
    }
    const repeatConditions = { sibling: "attending_siblings", futureSibling: "future_siblings", relative: "other_relatives" };
    Object.entries(repeatConditions).forEach(([kind, questionName]) => {
      const container = root.querySelector(`[data-conditional-repeat="${kind}"]`);
      if (!container) return;
      const visible = root.querySelector(`input[name="${questionName}"]:checked`)?.value === "Yes";
      container.hidden = !visible;
      container.querySelectorAll("input, select, textarea, button").forEach(control => { control.disabled = !visible; });
    });
    const residencyEvidence = root.querySelector('input[name="residency_evidence"]')?.closest("fieldset");
    if (residencyEvidence) {
      const visible = root.querySelector('input[name="australian_citizen"]:checked')?.value === "No";
      residencyEvidence.hidden = !visible;
      residencyEvidence.querySelectorAll("input").forEach(input => { input.disabled = !visible; });
    }
    updateSignatureLock();
    updatePrimaryButton();
  }

  function updateSignatureLock() {
    root.querySelectorAll("[data-signature]").forEach(container => {
      const prefix = container.dataset.signature;
      const unlocked = root.querySelector(`[name="${prefix}_ip"]`)?.checked && root.querySelector(`[name="${prefix}_terms"]`)?.checked;
      container.classList.toggle("is-locked", !unlocked);
      const overlay = container.querySelector(".signature-overlay");
      if (overlay) overlay.hidden = unlocked;
      ["ip", "terms"].forEach(suffix => {
        const name = `${prefix}_${suffix}`;
        const message = root.querySelector(`[data-validation-for="${name}"]`);
        if (message) message.hidden = !(state.touched[name] && !root.querySelector(`[name="${name}"]`)?.checked);
      });
    });
  }

  function updatePrimaryButton() {
    if (state.workflow !== "signing") return;
    const primary = root.querySelector('.step-actions button[type="submit"]');
    if (!primary) return;
    if (state.step === 3) primary.disabled = !root.querySelector('[name="review_ready"]')?.checked;
    if (state.step === 4) {
      const declarationsReady = root.querySelector('[name="guardian_sign_ip"]')?.checked && root.querySelector('[name="guardian_sign_terms"]')?.checked;
      primary.disabled = !(declarationsReady && state.signatures.guardian_sign);
    }
  }

  function bindCanvas() {
    root.querySelectorAll("[data-signature]").forEach(container => {
      const canvas = container.querySelector("canvas");
      const context = canvas.getContext("2d");
      context.lineWidth = 3;
      context.lineCap = "round";
      context.strokeStyle = "#15233b";
      let drawing = false;
      function point(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
      }
      canvas.addEventListener("pointerdown", event => {
        if (container.classList.contains("is-locked")) return;
        drawing = true;
        canvas.setPointerCapture(event.pointerId);
        const p = point(event);
        context.beginPath();
        context.moveTo(p.x, p.y);
      });
      canvas.addEventListener("pointermove", event => {
        if (!drawing) return;
        const p = point(event);
        context.lineTo(p.x, p.y);
        context.stroke();
        state.signatures[container.dataset.signature] = true;
        updatePrimaryButton();
      });
      canvas.addEventListener("pointerup", () => { drawing = false; });
      canvas.addEventListener("keydown", event => {
        if (event.key !== "Enter" || container.classList.contains("is-locked")) return;
        event.preventDefault();
        context.beginPath(); context.moveTo(150, 115); context.bezierCurveTo(280, 15, 350, 175, 500, 75); context.stroke();
        state.signatures[container.dataset.signature] = true;
        updatePrimaryButton();
      });
    });
  }

  function finish() {
    const messages = {
      eoi: ["Expression of interest preview complete", "In production, a confirmation email and reference number would be issued."],
      application: ["Application preview complete", "In production, this application would be securely recorded and made available to authorised enrolment staff."],
      acceptance: ["Offer acceptance preview complete", "In production, guardian signing invitations would now be issued and tracked separately."],
      decline: ["Decline preview complete", "In production, the offer record would be closed and the family would receive confirmation."]
    };
    const message = messages[state.workflow];
    root.innerHTML = `<div class="success-card"><div class="success-mark" aria-hidden="true">✓</div><p class="eyebrow">${esc(workflows[state.workflow].label)}</p><h3>${message[0]}</h3><p>${message[1]}</p><div class="status-card"><strong>Review-mode result</strong><p>No information, files, decision, signature or IP address has been saved.</p></div><button type="button" class="button button-secondary" data-action="restart">Start again</button></div>`;
  }

  function fillSynthetic() {
    const date = "2014-04-18";
    root.querySelectorAll("input, select, textarea").forEach(control => {
      if (control.disabled || control.type === "file" || control.readOnly) return;
      if (control.type === "checkbox" || control.type === "radio") {
        const group = [...root.querySelectorAll(`[name="${CSS.escape(control.name)}"]`)];
        if (control === group[0]) control.checked = true;
      } else if (control.tagName === "SELECT") {
        control.selectedIndex = Math.min(1, control.options.length - 1);
      } else if (control.type === "email") control.value = "family@example.test";
      else if (control.type === "tel") control.value = "0400 000 000";
      else if (control.type === "date") control.value = date;
      else if (control.type === "number") control.value = control.name.includes("percent") ? "100" : "1";
      else if (control.name.includes("code")) control.value = "123456";
      else if (control.name.includes("first")) control.value = "Avery";
      else if (control.name.includes("last")) control.value = "Example";
      else if (control.name.includes("name")) control.value = "Alex Example";
      else control.value = "Synthetic review information";
    });
    updateConditionalFields();
    root.querySelectorAll(".question[data-required-group]:not([hidden])").forEach(group => {
      if (!group.querySelector("input:checked")) {
        const firstAvailable = group.querySelector("input:not(:disabled)");
        if (firstAvailable) firstAvailable.checked = true;
      }
    });
    captureValues();
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    captureValues();
    if (!validate()) return;
    const final = state.step === workflows[state.workflow].steps.length - 1;
    if (final && state.workflow !== "signing") finish();
    else if (state.workflow === "signing" && state.step === 4) { state.step = 5; render(); }
    else if (!final) { state.step += 1; render(); }
  });

  form.addEventListener("input", event => {
    if (event.target.name) state.touched[event.target.name] = true;
    if (event.target.type === "file") {
      const label = event.target.closest(".field");
      const output = label?.querySelector("[data-file-state]");
      if (output) output.textContent = event.target.files[0] ? `${event.target.files[0].name} · ${Math.ceil(event.target.files[0].size / 1024)} KB · local only` : "Nothing selected";
    }
    updateConditionalFields();
  });

  form.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    const remove = event.target.closest("[data-remove]");
    const clearSignature = event.target.closest("[data-clear-signature]");
    const action = event.target.closest("[data-action]");
    if (add) { captureValues(); state.counts[add.dataset.add] += 1; render(); }
    if (remove) { captureValues(); state.counts[remove.dataset.remove] = Math.max(1, state.counts[remove.dataset.remove] - 1); render(); }
    if (clearSignature) { state.signatures[clearSignature.dataset.clearSignature] = false; const canvas = root.querySelector(`[data-signature="${clearSignature.dataset.clearSignature}"] canvas`); canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); }
    if (action?.dataset.action === "back") { captureValues(); state.step = Math.max(0, state.step - 1); render(); }
    if (action?.dataset.action === "restart") { state.step = 0; state.values = {}; state.touched = {}; state.signatures = {}; render(); }
    if (action?.dataset.action === "view-signed") { state.step = 3; render(); }
  });

  document.querySelector("#step-list").addEventListener("click", event => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    captureValues();
    state.step = Number(button.dataset.step);
    render();
  });

  workflowSelect.addEventListener("change", () => {
    captureValues();
    state.workflow = workflowSelect.value;
    state.step = 0;
    history.replaceState(null, "", `${location.pathname}?workflow=${state.workflow}`);
    render();
  });

  document.querySelector("#fill-example").addEventListener("click", fillSynthetic);
  document.querySelector("#clear-workflow").addEventListener("click", () => { state.values = {}; state.touched = {}; state.signatures = {}; state.step = 0; render(); });

  const requestedWorkflow = new URLSearchParams(location.search).get("workflow");
  if (requestedWorkflow && workflows[requestedWorkflow]) state.workflow = requestedWorkflow;
  workflowSelect.value = state.workflow;
  render();
})();
