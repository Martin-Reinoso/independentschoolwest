/* Rosewood Enrolment V6: strict source-mapped frontend review. No data leaves this page. */
(function () {
  "use strict";

  const form = document.querySelector("#family-form");
  const root = document.querySelector("#form-root");
  const errorSummary = document.querySelector("#error-summary");
  const progress = document.querySelector("#progress");
  const reviewTools = document.querySelector("#review-tools");
  const frameSelect = document.querySelector("#frame-select");
  const params = new URLSearchParams(location.search);
  const reviewMode = params.get("review") === "1";

  const state = {
    workflow: params.get("workflow") || "application",
    screen: 0,
    values: {},
    signatures: {},
    counts: { appGuardian: 2, sibling: 1, futureSibling: 1, relative: 1, emergency: 2, acceptanceGuardian: 2, declineGuardian: 1 }
  };

  const yesNo = ["Yes", "No"];
  const years = Array.from({ length: 20 }, (_, index) => String(2026 + index));
  const primaryLevels = ["Foundation", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
  const currentLevels = ["Not at School", "Early Years / Kinder", ...primaryLevels];
  const titles = ["Mr", "Mrs", "Ms", "Dr", "Miss"];
  const relationships = ["Father", "Mother", "Stepfather", "Stepmother", "Guardian", "Uncle", "Aunt", "Grandparent", "Friend", "Unknown", "Brother"];
  const religions = ["Catholic", "Buddhist", "Christian Other", "Hindu", "Islam / Muslim", "Jewish", "Sikh", "No Religion", "Orthodox", "Pentecostal", "Booked for Baptism", "Evangelical", "Anglican", "Other"];
  const currentSchools = ["*Not At School", "Our Lady of Rosary", "St Mary's", "Aspire Atherstone", "Aspire Cobblebank", "Aspire Thornhill Park", "Binap Primary School", "Botanica Springs Kindergarten", "Bridge Road Kindergarten", "Brookfield Kindergarten", "Exford Primary School", "Eynesbury Kindergarten", "Eynesbury Primary School", "Kool Kids Weir Views", "Melton South Early Learning Kinder", "Melton South Primary School", "Mt Carberry Preschool", "St Anthony's Catholic Primary School", "St Catherine of Siena Catholic Primary School", "St Dominic's Catholic Primary School", "Strathtulloh Primary School", "Other"];
  const needCategories = ["Autism (ASD)", "Acquired Brain Injury", "ADD / ADHD", "Anxiety", "Behavioural Concerns", "Giftedness", "Global Development Delay", "Oral language / communication difficulties", "Intellectual disability / developmental delay", "Physical impairment", "Mental health issues", "Vision impairment", "Hearing impairment", "Other"];
  const professionalCategories = ["Paediatrician", "Psychologist", "Speech Pathologist", "Occupational Therapist", "Physiotherapist", "Other"];
  const medicalConditions = ["No medical condition", "Anaphylaxis", "Asthma", "Diabetes", "Epilepsy", "Migraines", "Other"];
  const discoverySources = ["Advertising", "Current School Family", "Early Learning Centre / Kindergarten", "Friends", "Internet Search", "Live in Area", "Local Parish / Church", "Past Student / Family", "School Website", "Social Media", "Word of Mouth", "Another Primary School"];
  const influenceFactors = ["Reputation", "Environment & Atmosphere", "Mission, Values & Culture", "Faith Based", "Location", "Facilities", "Fees", "Class Sizes", "Size of school", "Pastoral Care", "Catering to Individual Needs", "Learning Support", "Quality of Teaching", "Curriculum Range & Choice", "Sports", "Arts", "Co-curriculum", "Coeducation", "Family History / Connection", "Friends Attending", "Referral from Friends / Family", "Tour"];
  const agreementHeadings = ["Education services", "Enrolment", "Fees", "Enrolment under minimum school entry age", "Child safe environment", "Period of Enrolment", "Policies and procedures", "Acceptable behaviour or conduct", "Conformity with principles of the Catholic faith", "Provision of accurate information", "Children with additional needs", "Assessment and updates", "Discipline", "Termination by the school", "Appeal Process on Enrolment Decisions", "General"];

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function attributes(options = {}) {
    const output = [];
    if (options.required) output.push("required");
    if (options.readonly) output.push("readonly");
    if (options.disabled) output.push("disabled");
    if (options.multiple) output.push("multiple");
    if (options.accept) output.push(`accept="${esc(options.accept)}"`);
    if (options.maxlength) output.push(`maxlength="${options.maxlength}"`);
    if (options.list) output.push(`list="${esc(options.list)}"`);
    if (options.min != null) output.push(`min="${options.min}"`);
    if (options.max != null) output.push(`max="${options.max}"`);
    if (options.autocomplete) output.push(`autocomplete="${esc(options.autocomplete)}"`);
    return output.join(" ");
  }

  function field(name, label, options = {}) {
    const value = state.values[name] ?? options.value ?? "";
    const required = options.required ? ' <span class="required" aria-hidden="true">*</span>' : "";
    const classes = `field ${options.className || ""} ${options.readonly ? "readonly-field" : ""}`.trim();
    let control;
    if (options.type === "textarea") {
      control = `<textarea id="${name}" name="${name}" ${attributes(options)}>${esc(value)}</textarea>`;
    } else if (options.type === "select") {
      control = `<select id="${name}" name="${name}" ${attributes(options)}><option value="">Select...</option>${(options.options || []).map(option => `<option value="${esc(option)}"${value === option ? " selected" : ""}>${esc(option)}</option>`).join("")}</select>`;
    } else if (options.type === "file") {
      control = `<input id="${name}" name="${name}" type="file" ${attributes(options)}><span class="file-state" data-file-state>Nothing selected</span>`;
    } else {
      control = `<input id="${name}" name="${name}" type="${options.type || "text"}" value="${esc(value)}" ${attributes(options)}>`;
    }
    return `<label class="${classes}" for="${name}"><span>${label}${required}</span>${control}${options.hint ? `<small>${options.hint}</small>` : ""}</label>`;
  }

  function choices(name, label, options, config = {}) {
    const multiple = config.multiple === true;
    const stored = state.values[name] ?? config.value;
    const selected = Array.isArray(stored) ? stored : [stored];
    return `<fieldset class="question ${config.className || ""}"${multiple && config.required ? " data-required-group" : ""}${config.max ? ` data-max="${config.max}"` : ""}><legend>${label}${config.required ? ' <span class="required" aria-hidden="true">*</span>' : ""}</legend><div class="${config.grid ? "choice-grid" : "choice-row"}">${options.map((option, index) => `<label class="choice"><input type="${multiple ? "checkbox" : "radio"}" name="${name}" value="${esc(option)}"${selected.includes(option) ? " checked" : ""}${config.required && !multiple && index === 0 ? " required" : ""}${config.disabled ? " disabled" : ""}><span>${esc(option)}</span></label>`).join("")}</div>${config.hint ? `<small class="group-note">${config.hint}</small>` : ""}</fieldset>`;
  }

  function check(name, label, options = {}) {
    const selected = Array.isArray(state.values[name]) ? state.values[name].length > 0 : Boolean(state.values[name]);
    return `<label class="check-line ${options.className || ""}"><input type="checkbox" name="${name}" value="Confirmed"${selected ? " checked" : ""}${options.required ? " required" : ""}><span>${label}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ""}${options.hint ? `<small class="group-note">${options.hint}</small>` : ""}</span></label>`;
  }

  function readonlyCheck(label) {
    return `<label class="check-line"><input type="checkbox" checked disabled><span>${label}</span></label>`;
  }

  function intro(title, lead, eyebrow) {
    return `<div class="section-intro">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h3>${title}</h3><p class="lead">${lead}</p></div>`;
  }

  function section(title, body, note = "") {
    return `<details class="form-section" open><summary><span>${title}</span>${note ? `<small>${note}</small>` : ""}</summary><div class="section-body">${body}</div></details>`;
  }

  function notice(title, copy, className = "notice") {
    return `<div class="${className}"><strong>${title}</strong><p>${copy}</p></div>`;
  }

  function actions(options = {}) {
    const back = state.screen > 0 && options.back !== false ? '<button type="button" class="button button-secondary" data-action="back">Back</button>' : "<span></span>";
    const label = options.label || "Next";
    return `<div class="step-actions"><div>${back}</div><div class="right">${options.secondary || ""}<button type="submit" class="button button-primary"${options.disabled ? " disabled" : ""}>${label}</button></div></div>`;
  }

  function documentPlaceholder(title) {
    return `<span class="source-link" aria-disabled="true"><span><strong>${title}</strong><small>Rosewood-approved document pending</small></span><span>Unavailable</span></span>`;
  }

  function communicationNotice() {
    return `<p class="communication-notice">The captured source treats provision of an email address and/or mobile number as agreement to receive promotional and informational messages, with unsubscribe or STOP available for promotional communications. Rosewood wording requires privacy approval before production.</p>`;
  }

  function renderGateway(kind) {
    const labels = { application: "begin the formal application", acceptance: "formally accept the offered place", decline: "formally decline the offered place" };
    const links = kind === "application"
      ? ["Enrolment Policy", "Enrolment Procedure", "Privacy Policy", "Privacy Collection Notice"]
      : ["Privacy Policy", "Privacy Collection Notice"];
    const preparation = kind === "application" ? section("Prepare these documents", `<ul class="preparation-list"><li>Birth certificate</li><li>Immunisation statement</li><li>Sacramental certificates, if applicable</li><li>Residency-status evidence, if applicable</li><li>Two recent school reports and NAPLAN, if available</li><li>Court orders, if applicable</li><li>Medical or specialist reports, if applicable</li></ul>`) : "";
    return intro(kind === "application" ? "Online enrolment application" : kind === "acceptance" ? "Accept an enrolment offer" : "Decline an enrolment offer", `Parent / Guardian, use the same email address previously supplied to Rosewood College to ${labels[kind]}.`, workflows[kind].label) +
      notice("Frontend review", "Next demonstrates the source email-verification transition. No code will be sent.") +
      section("Important documents", `<div class="source-links">${links.map(documentPlaceholder).join("")}</div>`) + preparation +
      section("Language", `<div class="field-grid two">${field(`${kind}_language`, "Language", { type: "select", options: ["English"] })}</div><div class="inline-actions"><button type="button" class="button button-quiet" data-static>Refresh language</button></div>`) +
      section("Email verification", `<div class="field-grid two">${field(`${kind}_gateway_email`, "Email", { type: "email", required: true, autocomplete: "email" })}</div>`) + actions({ label: "Next", back: false });
  }

  function renderOtp(kind) {
    return intro("Enter your verification code", "A six-digit code has been sent to your email address. The production code would expire after 30 minutes.", workflows[kind].label) +
      section("Verification", `<div class="field-grid two">${field(`${kind}_code`, "Verification Code", { required: true, maxlength: 6, hint: "Use 123456 in this frontend review." })}</div><div class="inline-actions"><button type="button" class="button button-secondary" data-static>Resend code</button><button type="button" class="button button-quiet" data-action="back">Change email</button></div>`) + actions({ label: "Verify" });
  }

  function renderSelector(kind) {
    const noun = kind === "application" ? "application" : kind === "acceptance" ? "enrolment agreement" : "decline record";
    const action = kind === "application" ? "Continue" : kind === "acceptance" ? "Start acceptance form" : "Start decline form";
    const newRecord = kind === "decline" ? "" : section(`Start a new ${noun}`, `<div class="field-grid two">${field(`${kind}_new_first`, "Student First Name", { required: true })}${field(`${kind}_new_last`, "Student Last Name", { required: true })}</div>`) + actions({ label: `Start ${noun}` });
    return intro(kind === "application" ? "Select or enter a student" : kind === "acceptance" ? "Accept your offer" : "Decline an offer", `Your information was located. Select a student to continue the ${noun}.`, workflows[kind].label) +
      section("Matched contact", `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Name</th><th>Last Updated</th><th>Address</th><th>Email</th><th>Mobile Phone</th></tr></thead><tbody><tr><td>Alex Example</td><td>4 August 2026</td><td>Synthetic address</td><td>family@example.test</td><td>0400 000 000</td></tr></tbody></table></div>`) +
      section("Student records", `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Student Name</th><th>Last Updated</th><th>${kind === "acceptance" ? "Enrolment agreement" : kind === "decline" ? "Decline record" : "Form"} Status</th><th>Action</th></tr></thead><tbody><tr><td>Avery Example</td><td>4 August 2026</td><td><span class="status-pill">${kind === "application" ? "In Progress" : "Not Started"}</span></td><td><button type="button" class="button button-primary" data-action="next">${action}</button></td></tr><tr><td>Jordan Example</td><td>1 August 2026</td><td><span class="status-pill${kind === "application" ? " is-complete" : ""}">${kind === "application" ? "Submitted" : "Not Started"}</span></td><td><button type="button" class="button button-secondary" data-static>${kind === "application" ? "View" : action}</button></td></tr></tbody></table></div>`) +
      newRecord;
  }

  function renderEoi() {
    return intro("Expression of Interest Form", "Complete the contact, address and student details below.", "Expression of interest") +
      section("Primary Contact Details", `<div class="field-grid">${field("eoi_language", "Language", { type: "select", options: ["English"] })}${field("eoi_title", "Salutation", { type: "select", options: titles })}${field("eoi_first", "Primary Contact First Name", { required: true })}${field("eoi_last", "Primary Contact Last Name", { required: true })}${field("eoi_relationship", "Relationship", { type: "select", options: relationships.concat("Other"), required: true })}${field("eoi_email", "Email", { type: "email", required: true })}${field("eoi_mobile", "Mobile Phone Number", { type: "tel", required: true, hint: "Australia +61" })}</div><div class="inline-actions"><button type="button" class="button button-quiet" data-static>Refresh language</button></div>${communicationNotice()}`) +
      section("Primary Contact Address", `<div class="field-grid">${field("eoi_address", "Contact Address", { required: true, className: "span-two", hint: "Enter a location" })}${field("eoi_suburb", "Suburb", { required: true })}${field("eoi_state", "State", { type: "select", options: ["Victoria", "New South Wales", "Australian Capital Territory", "Queensland", "South Australia", "Western Australia", "Tasmania", "Northern Territory"] })}${field("eoi_postcode", "Postcode", { required: true })}${field("eoi_country", "Contact Country", { required: true, list: "country-list", value: "Australia" })}</div>`) +
      section("Student Details", `<div class="field-grid">${field("eoi_student_first", "Student First Name", { required: true })}${field("eoi_student_last", "Student Last Name", { required: true })}${field("eoi_dob", "Date of Birth", { type: "date", required: true })}</div>${choices("eoi_gender", "Gender", ["Male", "Female"], { required: true })}<div class="field-grid">${field("eoi_religion", "Religion", { type: "select", options: religions, required: true })}${field("eoi_year", "Year of Enrolment", { type: "select", options: Array.from({ length: 21 }, (_, i) => String(2026 + i)), required: true })}${field("eoi_level", "Year Level of Entry", { type: "select", options: primaryLevels, required: true })}${field("eoi_current_school", "Current School", { type: "select", options: currentSchools })}${field("eoi_current_year", "Current School Year", { type: "select", options: currentLevels })}</div>${choices("eoi_needs", "Additional Needs", yesNo, { required: true })}<div data-conditional="eoi-needs">${field("eoi_need_category", "Please Specify", { type: "select", options: needCategories, required: true })}</div>${choices("eoi_family_connection", "Family Connection", ["Current Family", "Previous Family", "New Family"], { required: true })}${choices("eoi_other_children", "Other children who may attend", yesNo, { required: true })}<div class="field-grid">${field("eoi_discovery", "How did you first hear about the school?", { type: "select", options: discoverySources.concat("Other"), required: true, className: "span-two" })}${field("eoi_information", "Additional Information or Questions", { type: "textarea", className: "span-three" })}</div>`) +
      actions({ label: "Submit expression of interest preview", back: false });
  }

  function renderEoiAcknowledgement() {
    return `<div class="success-card"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Expression of interest</p><h3>Preview complete</h3><p>The captured process issued an acknowledgement email after an expression of interest was lodged.</p><div class="status-card"><strong>Nothing was submitted</strong><p>V6 has no backend. No record was created and no email was sent.</p></div></div>`;
  }

  function repeatBlock(kind, singular, renderer) {
    return `<div class="repeat-list">${Array.from({ length: state.counts[kind] }, (_, index) => `<article class="repeat-card"><header><h4>${singular} ${index + 1}</h4>${index > 0 ? `<button type="button" class="button button-quiet" data-remove="${kind}">Remove</button>` : ""}</header><div class="field-grid">${renderer(index)}</div></article>`).join("")}</div><div class="repeat-controls"><button type="button" class="button button-secondary" data-add="${kind}">Add ${singular.toLowerCase()}</button></div>`;
  }

  function renderApplicationStudent() {
    const sibling = index => field(`sibling_${index}_name`, "Name", { required: true }) + field(`sibling_${index}_status`, "Status", { required: true }) + field(`sibling_${index}_dob`, "Date of Birth", { type: "date" }) + field(`sibling_${index}_year`, "Year / Grade", { required: true }) + field(`sibling_${index}_school`, "School / Preschool", { required: true });
    const future = index => field(`future_${index}_first`, "First Name", { required: true }) + field(`future_${index}_last`, "Last Name", { required: true }) + field(`future_${index}_level`, "Year Level", { required: true }) + field(`future_${index}_year`, "Starting Year", { required: true }) + field(`future_${index}_dob`, "Date of Birth", { type: "date" }) + field(`future_${index}_school`, "Current School / Preschool");
    const relative = index => field(`relative_${index}_name`, "Name", { required: true }) + field(`relative_${index}_relationship`, "Relationship", { required: true }) + field(`relative_${index}_year`, "Year");
    return intro("Student", "Provide the student, residence, family, background, support, sacramental and medical information requested in the application.", "Application for enrolment") +
      section("Student Details", `<div class="field-grid">${field("student_first", "First Name", { required: true })}${field("student_middle", "Middle Name")}${field("student_last", "Last Name", { required: true })}${field("student_preferred", "Preferred Name")}${field("student_dob", "Date of Birth", { type: "date", required: true })}${field("student_gender", "Gender", { type: "select", options: ["Male", "Female"], required: true })}${field("student_religion", "Religion", { type: "select", options: religions, required: true })}${field("current_level", "Current School Year", { type: "select", options: currentLevels, required: true })}${field("current_school", "Current Early Learning Centre / Kindergarten / Primary School", { type: "select", options: currentSchools })}${field("entry_year", "Entry Year", { type: "select", options: years, required: true })}${field("entry_level", "Year Level of Entry", { type: "select", options: primaryLevels, required: true })}</div>`) +
      section("Residence and Family", `${choices("student_address_share", "Share this address with other contacts", ["Yes, share", "No, keep private"], { required: true })}${choices("care_arrangement", "Home Care Arrangement", ["Both Parents", "Mother Only", "Father Only", "Shared Custody", "Carer / Guardian", "Out-of-home care", "Kinship", "Other"], { required: true, grid: true })}<div class="field-grid">${field("care_other", "Other Care Arrangement")}${field("shared_parenting", "Shared Parenting Schedule", { type: "textarea", className: "span-two" })}${field("student_address", "Address", { required: true, className: "span-two" })}${field("student_suburb", "Suburb", { required: true })}${field("student_state", "State", { required: true })}${field("student_postcode", "Postcode", { required: true })}${field("student_country", "Country", { required: true, list: "country-list", value: "Australia" })}</div>${choices("family_connection", "Family Connection", ["Current Family", "Previous Family", "New Family"], { required: true })}${choices("future_siblings", "Future Siblings", yesNo, { required: true })}<div data-conditional="future-siblings">${repeatBlock("futureSibling", "Future sibling", future)}</div>${choices("attending_siblings", "Siblings Already Attending", yesNo, { required: true })}<div data-conditional="attending-siblings">${repeatBlock("sibling", "Attending sibling", sibling)}</div>${choices("other_relatives", "Other Relatives", yesNo, { required: true })}<div data-conditional="other-relatives">${repeatBlock("relative", "Relative", relative)}</div>`) +
      section("Nationality, Citizenship and Language", `<div class="field-grid">${field("residence_country", "Current Country of Residence", { required: true, list: "country-list" })}${field("birth_country", "Country of Birth", { required: true, list: "country-list" })}${field("nationality", "Country of Nationality", { required: true, list: "country-list" })}${field("ethnicity", "Ethnicity")}${field("arrival_date", "Arrival / Return Date", { type: "date" })}${field("residency_status", "Residential Status", { type: "select", options: ["Permanent", "Temporary"], required: true })}${field("main_language", "Main Language", { required: true, list: "language-list" })}${field("other_languages", "Other Languages", { list: "language-list", className: "span-two" })}</div>${choices("australian_citizen", "Australian Citizenship", yesNo, { required: true })}<div data-conditional="residency-evidence">${choices("residency_evidence", "Evidence of Residency", ["Permanent Resident", "Eligible for Australian Passport", "Temporary Resident", "Other / Visitor / Overseas Student"], { required: true, grid: true })}<div class="field-grid">${field("visa_subclass", "Visa Subclass", { required: true })}${field("visa_expiry", "Visa Expiry", { type: "date", required: true })}${field("previous_visa", "Previous Visa Subclass")}</div></div>${choices("indigenous_status", "Aboriginal / Torres Strait Islander Status", ["Aboriginal", "Torres Strait Islander", "Aboriginal and Torres Strait Islander", "Not Applicable"], { required: true })}`) +
      section("Additional Needs", `${choices("additional_needs", "Additional Needs", yesNo, { required: true })}<div data-conditional="additional-needs">${choices("need_categories", "Please Specify", needCategories, { multiple: true, grid: true, required: true })}<div data-conditional="other-need" class="field-grid">${field("need_other", "Other Additional Need", { required: true, className: "span-three" })}</div>${choices("professional_categories", "Health Professionals", professionalCategories, { multiple: true, grid: true })}<div data-conditional="other-professional" class="field-grid">${field("professional_other", "Other Health Professional", { required: true })}</div>${choices("reports_attached", "Reports Attached", yesNo, { required: true })}${choices("ndis_support", "NDIS Support", yesNo, { required: true })}</div>${choices("court_orders", "Court or Parenting Orders", yesNo, { required: true })}<div class="field-grid">${field("other_relevant_information", "Other Relevant Information", { type: "textarea", className: "span-three" })}</div>`) +
      section("Sacraments", `<div class="field-grid">${field("parish", "Parish", { className: "span-three" })}</div>${["Baptism", "Reconciliation", "Eucharist", "Confirmation"].map(item => `${check(`sacrament_${item}`, item)}<div class="conditional-panel" data-sacrament="sacrament_${item}"><div class="field-grid two">${field(`sacrament_${item}_date`, `${item} Date`, { type: "date" })}${field(`sacrament_${item}_location`, `${item} Location`)}</div></div>`).join("")}`) +
      section("Medical", `${choices("medical_conditions", "Medical Conditions", medicalConditions, { multiple: true, grid: true, required: true })}<div class="field-grid">${field("condition_details", "Condition Details", { type: "textarea", className: "span-two" })}${field("allergy_details", "Allergy Details", { type: "textarea" })}</div>${choices("anaphylaxis_risk", "Anaphylaxis Risk", yesNo, { required: true })}${choices("anaphylaxis_device", "EpiPen / Anapen", ["EpiPen", "Anapen"], {})}${choices("immunisation", "Immunisation", yesNo, { required: true })}${choices("humanitarian_health", "Humanitarian Health Check", yesNo, {})}<div class="field-grid">${field("doctor_name", "Doctor Name", { required: true })}${field("doctor_address", "Doctor Address", { className: "span-two" })}${field("doctor_phone", "Doctor Phone", { type: "tel", required: true })}${field("medicare_number", "Medicare Number / Reference")}${field("medicare_expiry", "Medicare Expiry", { type: "date" })}${field("private_insurance", "Private Insurance", { className: "span-two" })}${field("ambulance_cover", "Ambulance Cover")}${field("healthcare_card", "Health Care Card Status / Details", { className: "span-two" })}</div>`) + actions();
  }

  function applicationGuardianFields(index) {
    const prefix = `app_guardian_${index}_`;
    return choices(prefix + "share", "Share these details?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" }) +
      field(prefix + "title", "Title", { type: "select", options: titles, required: true }) + field(prefix + "first", "Given Name", { required: true }) + field(prefix + "last", "Surname", { required: true }) +
      field(prefix + "email", "Email", { type: "email", required: true }) + field(prefix + "mobile", "Mobile Phone", { type: "tel", required: true }) + field(prefix + "home", "Home Phone", { type: "tel" }) + field(prefix + "work", "Work Phone", { type: "tel" }) +
      field(prefix + "relationship", "Relationship", { type: "select", options: relationships, required: true }) + field(prefix + "contact_type", "Contact Type", { type: "select", options: ["Primary", "Secondary"], required: true }) +
      field(prefix + "marital", "Marital Status", { type: "select", options: ["Married", "De-Facto", "Divorced", "Single", "Separated", "Widowed", "Engaged", "Other"] }) + field(prefix + "religion", "Religion", { type: "select", options: religions }) +
      choices(prefix + "sms", "SMS Choice", yesNo, { required: true, className: "span-three" }) + field(prefix + "healthcare", "Health Care Card Details", { className: "span-two" }) +
      field(prefix + "address", "Residential Address", { required: true, className: "span-three" }) + choices(prefix + "postal_same", "Postal Address Same as Residential?", yesNo, { required: true, className: "span-three" }) +
      `<div class="conditional-panel span-three" data-postal="${prefix}postal_same"><div class="field-grid">${field(prefix + "postal_address", "Postal Address", { required: true, className: "span-two" })}${field(prefix + "postal_suburb", "Postal Suburb", { required: true })}${field(prefix + "postal_state", "Postal State", { required: true })}${field(prefix + "postal_postcode", "Postal Postcode", { required: true })}${field(prefix + "postal_country", "Postal Country", { required: true, list: "country-list" })}</div></div>` +
      choices(prefix + "alumni", "Past Student?", yesNo, { required: true, className: "span-three" }) + `<div class="conditional-panel span-three" data-alumni="${prefix}alumni"><div class="field-grid two">${field(prefix + "alumni_year", "Graduation Year", { required: true })}${field(prefix + "alumni_name", "Name While at School", { required: true })}</div></div>` +
      field(prefix + "occupation_group", "Occupation Group", { type: "select", options: ["A", "B", "C", "D", "N - no paid employment in the previous 12 months"] }) + field(prefix + "occupation", "Occupation") + field(prefix + "employer", "Employer") +
      field(prefix + "school_education", "School Education", { type: "select", options: ["Year 12", "Year 11", "Year 10", "Year 9 or below"] }) + field(prefix + "further_education", "Further Education", { type: "select", options: ["Bachelor degree or above", "Advanced Diploma / Diploma", "Certificate I-IV", "No post-school qualification"] }) +
      field(prefix + "birth_country", "Country of Birth", { list: "country-list" }) + field(prefix + "nationality", "Nationality", { list: "country-list" }) + field(prefix + "ethnicity", "Ethnicity") + field(prefix + "languages", "Languages", { list: "language-list" }) +
      field(prefix + "residency", "Residency Status", { type: "select", options: ["Citizen", "Permanent Resident", "Temporary Resident"] }) + field(prefix + "visa_subclass", "Visa Subclass") + field(prefix + "visa_expiry", "Visa Expiry", { type: "date" }) +
      choices(prefix + "indigenous", "Aboriginal / Torres Strait Islander", ["Aboriginal", "Torres Strait Islander", "Aboriginal and Torres Strait Islander", "Not Applicable"], { className: "span-three" }) +
      field(prefix + "spouse", "Spouse / Partner Contact", { type: "select", options: ["None recorded", "Contact 1", "Contact 2"], className: "span-two" }) +
      (index > 0 ? choices(prefix + "permission", "Can the school contact this person about the student?", ["Yes", "No, do not contact them"], { required: true, className: "span-three", hint: "No also prevents a separate signature-request email." }) : "");
  }

  function renderApplicationGuardians() {
    const emergency = index => (index === 0 ? choices(`emergency_${index}_share`, "Share these details?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" }) : "") + field(`emergency_${index}_first`, "First Name", { required: true }) + field(`emergency_${index}_last`, "Last Name", { required: true }) + field(`emergency_${index}_relationship`, "Relationship", { required: true }) + field(`emergency_${index}_mobile`, "Mobile Phone", { type: "tel", required: true }) + field(`emergency_${index}_home`, "Home Phone", { type: "tel" }) + field(`emergency_${index}_work`, "Work Phone", { type: "tel" }) + field(`emergency_${index}_email`, "Email", { type: "email" });
    return intro("Parent / Guardian", "Confirm the prefilled primary contact, add each legal parent or guardian and provide two emergency contacts.", "Application for enrolment") +
      section("Parents and Guardians", repeatBlock("appGuardian", "Contact", applicationGuardianFields) + communicationNotice(), `${state.counts.appGuardian} contact records`) +
      section("Guardian Confirmation", check("app_guardians_complete", "I have used Add Contact to enter any additional legal parent or guardian details, or there is no additional parent or guardian to add.", { required: true })) +
      section("Emergency Contacts", repeatBlock("emergency", "Emergency contact", emergency), "Two requested") + actions();
  }

  const applicationDocuments = [
    ["Birth Certificate", "Copy of the student's birth certificate", true],
    ["Immunisation Statement / Medical Management Plan(s) / Health Professional Report(s)", "Relevant current evidence", false],
    ["SchooL Reports / NAPLAN Results", "Two recent school reports and available NAPLAN results", false],
    ["Sacramental Certificates", "Relevant sacramental evidence", false],
    ["Proof of Address", "Gas, electricity or water bill", true],
    ["Passport / Visa Documentation", "Relevant residency and visa evidence", false]
  ];

  function renderApplicationDocuments() {
    const accept = ".doc,.docx,.pdf,.odt,.png,.gif,.bmp,.jpg,.jpeg,.heic,.heif,.mp4,.avi,.mov,.webm,.mkv,.mpeg,.3gp,.flv,.ogg";
    return intro("Documents", "Upload the supporting documents for this application.", "Application for enrolment") + notice("Frontend review", "Files remain on your device. V6 displays only the local filename and never reads or uploads file contents.") +
      `<div class="document-list">${applicationDocuments.map((document, index) => `<article class="document-card"><header><div><h4>${document[0]}${document[2] ? ' <span class="required">*</span>' : ""}</h4><p>${document[1]}</p></div><span class="document-badge">${document[2] ? "1 file required" : "0 files required"}</span></header>${field(`application_document_${index}`, `Choose ${document[0]}`, { type: "file", required: document[2], multiple: true, accept, hint: "Multiple files accepted, maximum 10 MB each in production." })}</article>`).join("")}</div>` + actions();
  }

  function termsHeadings(count) {
    return `<ol class="terms-heading-list">${agreementHeadings.slice(0, count).map(heading => `<li><strong>${heading}</strong></li>`).join("")}</ol>`;
  }

  function renderApplicationConditions() {
    return intro("Conditions", "Review the conditions, permissions, fee responsibility and application survey.", "Application for enrolment") +
      notice("Rosewood legal text required", "V6 preserves the fifteen captured clause headings and controls. Complete Rosewood-approved wording is required before production.", "legal-note") +
      section("Terms and Conditions of Enrolment", termsHeadings(15) + `<div class="terms-confirmation">${check("application_terms_agree", "I / We Agree", { required: true })}</div>`) +
      section("Previous School / Preschool Permission", check("previous_school_permission", "I / We give permission for the school to contact the previous school or preschool to gather relevant reports and information for educational planning.", { required: true }) + `<div class="field-grid">${field("previous_school_name", "Name of Previous School / Preschool / Kindergarten", { required: true })}${field("previous_school_address", "Address", { required: true, className: "span-two" })}</div>${choices("previous_school_interstate", "Interstate?", ["No", "Yes", "Not Applicable"], { required: true })}`) +
      section("Photography and Recording Permission", `${choices("name_permission", "Student Name", ["I give permission", "I do not give permission"], { required: true })}${choices("photo_permission", "Photographs and Recordings", ["I give permission", "I do not give permission"], { required: true })}${choices("publication_channels", "Publication Channels", ["School publications", "School website", "School social media", "External media"], { multiple: true, grid: true })}${notice("NEALS", "The source includes a National Educational Access Licence for Schools notice and withdrawal information.")}`) +
      section("School Fee Responsibility", `${choices("fee_option", "Choose one fee responsibility option", ["Both Parents / Guardian", "One Parent / Guardian", "Percentage split with custodial court order"], { required: true, grid: true })}<div class="conditional-panel" data-fee="Both Parents / Guardian"><div class="field-grid">${field("fee_both_nominee", "Nominee / Full Name", { required: true })}${field("fee_both_date", "Date", { type: "date", required: true })}</div></div><div class="conditional-panel" data-fee="One Parent / Guardian"><div class="field-grid">${field("fee_one_nominee", "Nominee / Full Name", { required: true })}${field("fee_one_date", "Date", { type: "date", required: true })}</div></div><div class="conditional-panel" data-fee="Percentage split with custodial court order"><div class="field-grid">${field("fee_guardian_a", "Guardian A Name", { required: true })}${field("fee_guardian_a_percent", "Guardian A Percentage", { type: "number", min: 0, max: 100, required: true })}${field("fee_guardian_b", "Guardian B Name", { required: true })}${field("fee_guardian_b_percent", "Guardian B Percentage", { type: "number", min: 0, max: 100, required: true })}${field("fee_split_date", "Date", { type: "date", required: true })}</div></div>`) +
      section("Survey", `<div class="field-grid">${field("application_discovery", "How did you hear about us?", { type: "select", options: discoverySources, required: true, className: "span-two" })}</div>${choices("application_influences", "Please indicate the three most important things that influenced your decision", influenceFactors, { multiple: true, grid: true, required: true, max: 3 })}`) + actions();
  }

  function victorianGuidance() {
    return `<div class="guidance"><p><strong>The Victorian Government provides the following guidance regarding admission requirements:</strong></p><p><strong>Consent</strong></p><p>The signature of:</p><ul><li>the student, if they are over 15 and living independently</li><li>parent as defined in the Family Law Act 1975</li><li>both parents for parents who are separated, or a copy of the court order with any impact on the relationship between the family and the school</li><li>an informal carer, with a statutory declaration.</li></ul><p><strong>In the absence of a current court order, each parent of a child who is not 18 has equal parental responsibility.</strong></p><p>Carers may be a relative or other carer, have day-to-day care of the student with the student regularly living with them, and may provide any other consent required, for example excursions.</p><p><strong>Notes for informal carers:</strong> statutory declarations apply for 12 months. The wishes of a parent prevail in a dispute between a parent legally responsible for a student and an informal carer.</p><p>Secondary students may complete parts of the form and co-sign.</p></div>`;
  }

  function signaturePanel(prefix, declaration, options = {}) {
    return `<article class="signature-card"><h4>${options.title || "Parent / Guardian"}</h4><label class="declaration"><input type="checkbox" name="${prefix}_ip" required><span>I acknowledge and agree that, at the time of signing this form, my IP address will be recorded and stored by the School for administrative, security and legal compliance purposes. <span class="required">*</span></span></label><p class="validation-message" data-validation-for="${prefix}_ip" hidden>You must acknowledge the IP address recording to continue</p><label class="declaration"><input type="checkbox" name="${prefix}_terms" required><span>${declaration} <span class="required">*</span></span></label><p class="validation-message" data-validation-for="${prefix}_terms" hidden>You must agree to the terms to continue</p><div class="signature-wrap is-locked" data-signature="${prefix}" data-auto-date="${options.autoDate ? "true" : "false"}"><canvas width="960" height="190" tabindex="0" aria-label="Signature area. Use a pointer to sign or press Enter to add a review signature."></canvas><div class="signature-overlay">Please agree to the terms above to enable signing</div></div><button type="button" class="button button-secondary" data-clear-signature="${prefix}" disabled>Clear Signature</button><div class="field-grid two">${field(`${prefix}_date`, "Date", { type: "date", required: true, readonly: options.autoDate })}</div></article>`;
  }

  function renderApplicationSignature() {
    const explanation = state.counts.appGuardian === 1 ? `<div class="field-grid">${field("application_one_signature_reason", "Explanation only one signature", { type: "textarea", required: true, className: "span-three", hint: "Only one signature has been included. Enter the reason above or call the College to discuss." })}</div>` : notice("Additional guardian signature", "Each additional contactable guardian will receive a separate secure signature request after this form is submitted.");
    return intro("Signature", "Completing, signing and lodging this application is required for consideration but does not guarantee enrolment. Enrolment is formalised only after an offer and Enrolment Agreement.", "Application for enrolment") +
      section("Victorian admission guidance", victorianGuidance()) +
      notice("Disclaimer", "Personal information will be held, used and disclosed in accordance with the College Privacy Collection Notice and Privacy Policy available on the College website.", "legal-note") +
      section("Signature of Parents / Guardians", signaturePanel("application_signature", "I declare that I have read, understood and given consent to all matters contained in this application.", { title: "Parent / Guardian: Primary Contact" }) + explanation + `<div class="field-grid">${field("application_additional_information", "Additional Information", { type: "textarea", className: "span-three" })}</div>`) + actions({ label: "Submit application preview" });
  }

  function acceptanceContactFields(index, prefixBase = "acceptance") {
    const prefix = `${prefixBase}_guardian_${index}_`;
    return choices(prefix + "share", "Share these details?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" }) + (prefixBase === "decline" ? field(prefix + "title", "Salutation", { type: "select", options: titles, required: true }) : "") + field(prefix + "first", "First Name", { required: true }) + field(prefix + "last", "Last Name", { required: true }) + field(prefix + "email", "Email", { type: "email", required: true }) + field(prefix + "mobile", "Mobile Phone", { type: "tel", required: true, hint: "Australia +61" }) + field(prefix + "relationship", "Relationship to Student", { type: "select", options: relationships, required: true }) + field(prefix + "contact_type", "Contact Type", { type: "select", options: ["Primary", "Secondary"], required: true }) + (index > 0 && prefixBase === "acceptance" ? choices(prefix + "permission", "Can the school contact this person about the student?", ["Yes", "No, do not contact them"], { required: true, className: "span-three", hint: "No also prevents a signature-request email." }) : "");
  }

  function renderAcceptanceStudent() {
    return intro("Student", "Review the offered student and record acceptance of the place.", "Enrolment Agreement") + section("Student Details", `<div class="field-grid">${field("acceptance_first", "First Name", { value: "Avery", readonly: true, required: true })}${field("acceptance_last", "Last Name", { value: "Example", readonly: true, required: true })}${field("acceptance_level", "Year Level", { value: "Foundation", readonly: true, required: true })}${field("acceptance_year", "Commencement Year", { value: "2027", readonly: true, required: true })}</div>${choices("enrolment_acceptance", "Enrolment Acceptance", ["I / We accept the offered place"], { required: true })}`) + actions();
  }

  function renderAcceptanceGuardians() {
    return intro("Parent / Guardian", "Confirm each parent or guardian connected to this Enrolment Agreement.", "Enrolment Agreement") + section("Parents and Guardians", repeatBlock("acceptanceGuardian", "Contact", index => acceptanceContactFields(index)), `${state.counts.acceptanceGuardian} contact records`) + communicationNotice() + section("Guardian Confirmation", check("acceptance_guardians_complete", "I have entered any additional legal parent or guardian using Add Contact, or there is no additional parent or guardian to add.", { required: true })) + actions();
  }

  function renderAcceptanceDocuments() {
    return intro("Documents", "Download, complete, sign and upload both required conduct documents.", "Enrolment Agreement") + notice("Rosewood documents pending", "The production controls will link to approved, versioned Rosewood documents once they are available.", "legal-note") + `<div class="document-list">${[["Parent Code of Conduct", "signed_parent_code"], ["Student Code of Conduct", "signed_student_code"]].map(item => `<article class="document-card"><header><div><h4>${item[0]} <span class="required">*</span></h4><p>Download the current document, complete and sign it, then upload one signed file.</p></div><span class="document-badge">1 file required</span></header>${documentPlaceholder(item[0])}${field(item[1], `Upload signed ${item[0]}`, { type: "file", required: true })}</article>`).join("")}</div>` + actions();
  }

  function transferFields(prefix = "acceptance") {
    return `<div class="field-grid">${field(`${prefix}_transfer_first`, "First Name", { required: true })}${field(`${prefix}_transfer_last`, "Surname", { required: true })}${field(`${prefix}_transfer_dob`, "Date of Birth", { type: "date", required: true })}${field(`${prefix}_transfer_school`, "Current Preschool or School", { required: true })}${field(`${prefix}_transfer_school_number`, "Registered School Number")}${field(`${prefix}_transfer_eno`, "E No.")}${field(`${prefix}_transfer_principal`, "Principal")}</div>${check(`${prefix}_transfer_consent`, "I / We consent to the transfer of information", { required: true })}`;
  }

  function renderAcceptanceConditions() {
    return intro("Conditions", "Review the complete Enrolment Agreement and record the required acceptance and permissions.", "Enrolment Agreement") + notice("Rosewood agreement pending", "V6 preserves the sixteen captured clause headings. Complete Rosewood-approved wording and document versions are required before production.", "legal-note") + section("Terms and Conditions of Enrolment", termsHeadings(16) + `<div class="terms-confirmation">${check("acceptance_terms_agree", "I / We agree", { required: true })}</div>`) + section("Consent to Transfer of Information", transferFields()) + section("Photography and Recording Permission", choices("acceptance_photo_permission", "Authorisation", ["I give permission", "I do not give permission"], { required: true }) + notice("NEALS", "The source agreement includes educational-licensing and withdrawal information.")) + section("ICT Acceptable Usage Policy", documentPlaceholder("ICT Acceptable Usage Policy") + check("acceptance_ict", "I / We have read and understand the ICT Acceptable Usage Policy", { required: true })) + actions();
  }

  function renderAcceptanceSignature() {
    const declaration = "As the parent/guardian of my child, I declare I have read, understood and given consent to all matters contained in this form which includes Parent Code of Conduct and Student Code of Conduct. I understand that my consent will remain valid while my child continues enrolment at Rosewood College.";
    return intro("Signature", "This Offer of Enrolment requires the signature of parents or guardians. For this electronic document, signing your name is the equivalent of your signature.", "Enrolment Agreement") + section("Signature of Parents / Guardians", signaturePanel("acceptance_signature", declaration, { title: "Parent / Guardian: Primary Contact" }) + notice("Second guardian", "This person will be contacted to sign after submission of this form.") + `<div class="field-grid">${field("acceptance_additional_information", "Additional Information", { type: "textarea", className: "span-three" })}</div>`) + actions({ label: "Submit agreement preview" });
  }

  function renderSigningIdentity() {
    return intro("Verify your identity", "Hello Hannah Example, you have been requested to sign the Enrolment Agreement Form for Avery Example at Rosewood College. Please verify your identity to continue.", "Guardian signing") + section("Email", `<div class="field-grid two">${field("signing_email", "Email", { type: "email", value: "guardian@example.test", readonly: true, required: true })}</div>`) + actions({ label: "Next", back: false });
  }

  function renderSigningOtp() {
    return intro("Enter the code", "A code has been sent to your email address. Enter the code to continue.", "Guardian signing") + section("Verification", `<div class="field-grid two">${field("signing_code", "Verification Code", { required: true, maxlength: 6, hint: "Use 123456 in this frontend review. Production codes expire after 30 minutes." })}</div><div class="inline-actions"><button type="button" class="button button-secondary" data-static>Resend code</button><button type="button" class="button button-quiet" data-action="back">Change email</button></div>`) + actions({ label: "Verify" });
  }

  function renderSigningIntroduction() {
    return intro("Sign Form", "You will check your details, review the submitted form and provide your electronic signature.", "Introduction") + section("Enrolment Agreement Form", `<div class="review-card"><h4>Avery Example</h4><dl><dt>School</dt><dd>Rosewood College</dd><dt>Form</dt><dd>Enrolment Agreement Form</dd><dt>Estimated time</dt><dd>Approximately five minutes</dd></dl></div>`) + actions({ label: "Next" });
  }

  function renderSigningDetails() {
    return intro("Your Details", "Check the prefilled contact details below and confirm they are correct.", "Guardian signing") + section("Primary Information", `<div class="field-grid">${choices("signing_share", "Share these details?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" })}${field("signing_first", "First Name", { value: "Hannah", required: true })}${field("signing_last", "Last Name", { value: "Example", required: true })}${field("signing_details_email", "Email", { type: "email", value: "guardian@example.test", required: true })}${field("signing_mobile", "Mobile Phone", { type: "tel", value: "0400 000 000", required: true })}${field("signing_relationship", "Relationship to Student", { type: "select", options: relationships, required: true })}${field("signing_contact_type", "Contact Type", { type: "select", options: ["Primary", "Secondary"], required: true })}</div>${communicationNotice()}${choices("signing_contact_permission", "Can the school contact you about this student?", ["Yes", "No, do not contact me"], { required: true, disabled: true, value: "Yes", hint: "The captured source displays this choice locked to Yes." })}${check("signing_details_correct", "I confirm my details are correct", { required: true })}`) + actions({ label: "Save details and review" });
  }

  function completeAgreementReview(options = {}) {
    const signed = options.signed === true;
    return section("Student", `<div class="review-card"><dl><dt>Student</dt><dd>Avery Example</dd><dt>Year Level</dt><dd>Foundation</dd><dt>Commencement Year</dt><dd>2027</dd><dt>Enrolment Acceptance</dt><dd>I / We accept the offered place</dd></dl></div>`) +
      section("Parent / Guardian", `<div class="signed-status"><div class="review-card"><h4>Primary Guardian</h4><dl><dt>Relationship</dt><dd>Father</dd><dt>Signature</dt><dd>Recorded</dd></dl></div><div class="review-card"><h4>Hannah Example</h4><dl><dt>Relationship</dt><dd>Mother</dd><dt>Signature</dt><dd>${signed ? "Recorded" : "Pending"}</dd></dl></div></div>${readonlyCheck("All legal parents or guardians have been entered")}`) +
      section("Documents", `<div class="review-card"><dl><dt>Parent Code of Conduct</dt><dd>synthetic-parent-code.pdf · 240 KB</dd><dt>Student Code of Conduct</dt><dd>synthetic-student-code.pdf · 186 KB</dd></dl></div>`) +
      section("Conditions", termsHeadings(16) + `<div class="review-card"><dl><dt>Agreement</dt><dd>I / We agree</dd><dt>Information transfer</dt><dd>Consent recorded</dd><dt>Photography and recording</dt><dd>Permission recorded</dd><dt>ICT policy</dt><dd>Acknowledged</dd></dl></div>`) +
      section("Signatures", `<div class="signed-status"><article class="signature-card"><h4>Primary Guardian</h4><p>IP acknowledgement and declaration recorded</p><div class="recorded-signature">Recorded signature</div><p>Date: Recorded</p></article><article class="signature-card"><h4>Hannah Example</h4><p>${signed ? "IP acknowledgement and declaration recorded" : "Signature status: Pending"}</p><div class="${signed ? "recorded-signature" : "pending-signature"}">${signed ? "Recorded signature" : "Pending Signature"}</div><p>Date: ${signed ? "Recorded" : "Pending"}</p></article></div><p><strong>Comments</strong> ${signed ? "Recorded with signature task" : "Can be added on the next Sign step"}</p><p><strong>Additional Information</strong></p>`);
  }

  function renderSigningReview() {
    return intro("Review", "This is the complete submitted Enrolment Agreement. It is read-only and cannot be changed here.", "Guardian signing") + notice("Signing is on the next page", "The pending signature below is a status preview. Review the agreement, then use Continue to sign.") + completeAgreementReview() + check("signing_review_ready", "I have reviewed the form and am ready to proceed", { required: true }) + actions({ label: "Continue to sign" });
  }

  function renderSigningSign() {
    const declaration = "As the parent/guardian of my child, I declare I have read, understood and given consent to all matters contained in this form, including the Parent and Student Codes of Conduct. I understand all applicable school policies and procedures and that my consent remains valid while my child continues enrolment at Rosewood College.";
    return intro("Sign the Form", "Add any comments, accept both declarations and provide your signature.", "Guardian signing") + section("Comments", `<div class="field-grid">${field("signing_comments", "Comments for the School", { type: "textarea", maxlength: 1000, className: "span-three", hint: "0 / 1000 characters" })}</div>`) + section("Parent / Guardian: Hannah Example", signaturePanel("guardian_signature", declaration, { autoDate: true })) + actions({ label: "Submit signature" });
  }

  function renderSigningThankYou() {
    return `<div class="success-card"><div class="success-mark" aria-hidden="true">✓</div><p class="eyebrow">Guardian signing</p><h3>Signing Complete</h3><p>Thank you for signing the Enrolment Agreement Form.</p><div class="status-card"><strong>What happens next?</strong><p>A confirmation message will arrive shortly. You can safely log out and close this browser tab.</p></div><button type="button" class="button button-secondary" data-action="next">View Signed Form</button></div>`;
  }

  function renderPendingSignatures() {
    const application = state.workflow === "application";
    return `<div class="success-card"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">${application ? "Application for enrolment" : "Enrolment Agreement"}</p><h3>Current guardian step complete</h3><p>${application ? "The captured process completes the current guardian's application step and may request separate signatures from additional guardians." : "The captured process records the current guardian's acceptance and sends each additional guardian a separate signing request."}</p><div class="status-card"><strong>Nothing was submitted</strong><p>V6 has no backend. No record, invitation, email or legally effective signature was created.</p></div></div>`;
  }

  function renderSignedForm() {
    return intro("Enrolment Agreement Form", "Status: Submitted", "Signed form") + section("Record", `<div class="review-card"><dl><dt>Status</dt><dd>Submitted</dd><dt>Last Updated</dt><dd>Server timestamp would appear here</dd><dt>School</dt><dd>Rosewood College</dd></dl><div class="inline-actions"><button type="button" class="button button-secondary" data-static>Print</button><button type="button" class="button button-quiet" data-static>Logout</button></div></div>`) + completeAgreementReview({ signed: true });
  }

  function renderDeclineStudent() {
    return intro("Student", "Confirm the student and provide the required decline information.", "Decline of Enrolment Offer") + section("Student Details", `<div class="field-grid">${field("decline_first", "First Name", { value: "Avery", required: true })}${field("decline_last", "Last Name", { value: "Example", required: true })}${choices("decline_gender", "Gender", ["Male", "Female"], { required: true, className: "span-three" })}${field("decline_school", "School Name", { value: "Rosewood College", readonly: true, required: true })}${field("decline_level", "Year Level Commencing", { type: "select", options: primaryLevels, required: true, hint: "Please select a year level" })}${field("decline_year", "Commencement Year", { type: "select", options: years, required: true, hint: "Please select a starting year" })}</div>`) + section("Decline of Enrolment Offer", choices("decline_offer", "Decision", ["Thank you for your offer of a place, but we will not be seeking a place at Rosewood College."], { required: true }) + `<div class="field-grid">${field("decline_reason", "Reason for Decline", { type: "textarea", required: true, className: "span-three" })}${field("decline_destination", "Name of School", { required: true, className: "span-two", hint: "Please provide the name of the school where you will be enrolling your child." })}</div>`) + actions();
  }

  function renderDeclineGuardians() {
    return intro("Parent / Guardian", "Confirm the parent or guardian details attached to this decline record.", "Decline of Enrolment Offer") + section("Parents and Guardians", repeatBlock("declineGuardian", "Contact", index => acceptanceContactFields(index, "decline")), `${state.counts.declineGuardian} contact record`) + communicationNotice() + section("Guardian Confirmation", check("decline_guardians_complete", "I confirm that no additional parents or guardians will be added.", { required: true })) + actions();
  }

  function renderDeclineSignature() {
    const declaration = "I confirm that I will not be accepting the offer of a place at Rosewood College for my child.";
    return intro("Signature", "Please preview the form and make sure everything is correct. For this electronic document, signing your name is the equivalent of your signature.", "Decline of Enrolment Offer") + notice("One-signature explanation", "If both parent or guardian signatures are not included, provide the reason below.") + section("Signature of Parent / Guardian", signaturePanel("decline_signature", declaration, { title: "Parent / Guardian: Primary Contact" }) + `<div class="field-grid">${field("decline_one_signature_reason", "Explanation only one signature", { type: "textarea", required: true, className: "span-three", hint: "Only one signature has been included. Enter the reason above or call the College to discuss." })}${field("decline_additional_information", "Additional Information", { type: "textarea", className: "span-three" })}</div>`) + actions({ label: "Finish captured decline form" });
  }

  function renderCapturedEnd() {
    return `<div class="success-card"><p class="eyebrow">Frontend boundary</p><h3>End of captured process</h3><p>The source decline form was mapped up to its enabled submission controls. Its final confirmation, completion page and receipt were not observed, so V6 does not invent them.</p><div class="status-card"><strong>Nothing was submitted</strong><p>This frontend has no backend and no information has been saved.</p></div></div>`;
  }

  const workflows = {
    eoi: { label: "Expression of interest", title: "Expression of interest.", copy: "A single-page first contact with Rosewood College.", promise: "This is an enquiry record, not an application for enrolment.", formLabels: [], screens: [{ label: "Expression of Interest Form", render: renderEoi }, { label: "Acknowledgement", render: renderEoiAcknowledgement }] },
    application: { label: "Application for enrolment", title: "Application for enrolment.", copy: "Use the invitation sent by Rosewood College and the same email address used previously.", promise: "Email verification, student selection and the five-step application remain distinct.", formLabels: ["Student", "Parent / Guardian", "Documents", "Conditions", "Signature"], screens: [
      { label: "Application gateway", render: () => renderGateway("application") }, { label: "Email verification", render: () => renderOtp("application") }, { label: "Select or enter a student", render: () => renderSelector("application") },
      { label: "Student", formStep: 0, render: renderApplicationStudent }, { label: "Parent / Guardian", formStep: 1, render: renderApplicationGuardians }, { label: "Documents", formStep: 2, render: renderApplicationDocuments }, { label: "Conditions", formStep: 3, render: renderApplicationConditions }, { label: "Signature", formStep: 4, render: renderApplicationSignature }, { label: "Pending signatures", render: renderPendingSignatures }
    ] },
    acceptance: { label: "Offer acceptance", title: "Accept an enrolment offer.", copy: "This Enrolment Agreement is separate from the earlier application.", promise: "The offer, acceptance record and each guardian signature have their own status.", formLabels: ["Student", "Parent / Guardian", "Documents", "Conditions", "Signature"], screens: [
      { label: "Acceptance gateway", render: () => renderGateway("acceptance") }, { label: "Email verification", render: () => renderOtp("acceptance") }, { label: "Select an offer", render: () => renderSelector("acceptance") },
      { label: "Student", formStep: 0, render: renderAcceptanceStudent }, { label: "Parent / Guardian", formStep: 1, render: renderAcceptanceGuardians }, { label: "Documents", formStep: 2, render: renderAcceptanceDocuments }, { label: "Conditions", formStep: 3, render: renderAcceptanceConditions }, { label: "Signature", formStep: 4, render: renderAcceptanceSignature }, { label: "Pending signatures", render: renderPendingSignatures }
    ] },
    signing: { label: "Guardian signing", title: "Review and sign the agreement.", copy: "A guardian verifies their identity, reviews the complete submitted agreement and signs on a dedicated page.", promise: "The review is read-only. Signing occurs only after the reviewed-and-ready confirmation.", formLabels: ["Introduction", "Your Details", "Review", "Sign", "Thank You"], screens: [
      { label: "Identity", render: renderSigningIdentity }, { label: "OTP", render: renderSigningOtp }, { label: "Introduction", formStep: 0, render: renderSigningIntroduction }, { label: "Your Details", formStep: 1, render: renderSigningDetails }, { label: "Review", formStep: 2, render: renderSigningReview }, { label: "Sign", formStep: 3, render: renderSigningSign }, { label: "Thank You", formStep: 4, render: renderSigningThankYou }, { label: "Signed Form", render: renderSignedForm }
    ] },
    decline: { label: "Decline offer", title: "Decline an enrolment offer.", copy: "This decline record is separate from the application and Enrolment Agreement.", promise: "The captured source contains Student, Parent / Guardian and Signature steps only.", formLabels: ["Student", "Parent / Guardian", "Signature"], screens: [
      { label: "Decline gateway", render: () => renderGateway("decline") }, { label: "Email verification", render: () => renderOtp("decline") }, { label: "Select an offer", render: () => renderSelector("decline") }, { label: "Student", formStep: 0, render: renderDeclineStudent }, { label: "Parent / Guardian", formStep: 1, render: renderDeclineGuardians }, { label: "Signature", formStep: 2, render: renderDeclineSignature }, { label: "Capture boundary", render: renderCapturedEnd }
    ] }
  };

  if (!workflows[state.workflow]) state.workflow = "application";

  function captureValues() {
    const data = new FormData(form);
    const checkboxNames = new Set([...form.querySelectorAll('input[type="checkbox"]')].map(input => input.name).filter(Boolean));
    form.querySelectorAll("input, select, textarea").forEach(control => {
      if (!control.name || control.type === "file" || control.type === "checkbox" || (control.type === "radio" && !control.checked)) return;
      state.values[control.name] = control.value;
    });
    checkboxNames.forEach(name => { state.values[name] = data.getAll(name); });
  }

  function renderProgress(screen) {
    if (screen.formStep == null || !workflows[state.workflow].formLabels.length) {
      progress.hidden = true;
      return;
    }
    progress.hidden = false;
    const labels = workflows[state.workflow].formLabels;
    const current = screen.formStep;
    document.querySelector("#progress-label").textContent = `Step ${current + 1} of ${labels.length}`;
    const percent = Math.round((current / Math.max(labels.length - 1, 1)) * 100);
    document.querySelector("#progress-percent").textContent = `${percent}% complete`;
    document.querySelector("#progress-bar").style.width = `${percent}%`;
    document.querySelector("#step-list").innerHTML = labels.map((label, index) => {
      const target = workflows[state.workflow].screens.findIndex(item => item.formStep === index);
      return `<li><button type="button" data-goto="${target}"${index === current ? ' aria-current="step"' : ""}${index < current ? ' class="is-reviewed"' : ""}>${label}</button></li>`;
    }).join("");
  }

  function renderFrameSelector() {
    if (!reviewMode) return;
    reviewTools.hidden = false;
    const screens = workflows[state.workflow].screens;
    frameSelect.innerHTML = screens.map((screen, index) => `<option value="${index}"${state.screen === index ? " selected" : ""}>${index + 1}. ${screen.label}</option>`).join("");
  }

  function updateSaveState(screen) {
    const save = document.querySelector("#save-state");
    const isForm = screen.formStep != null && state.workflow !== "signing";
    save.classList.toggle("is-saved", isForm);
    save.querySelector("strong").textContent = isForm ? "Saved preview" : "Review mode";
    save.querySelector("small").textContent = isForm ? "Source state simulated · not persisted" : "Not connected or saved";
  }

  function render() {
    const workflow = workflows[state.workflow];
    state.screen = Math.max(0, Math.min(state.screen, workflow.screens.length - 1));
    const screen = workflow.screens[state.screen];
    document.querySelector("#workflow-label").textContent = workflow.label;
    document.querySelector("#step-title").textContent = screen.label;
    document.querySelector("#story-kicker").textContent = workflow.label;
    document.querySelector("#story-title").textContent = workflow.title;
    document.querySelector("#story-copy").textContent = workflow.copy;
    document.querySelector("#story-promise-copy").textContent = workflow.promise;
    root.innerHTML = screen.render();
    errorSummary.hidden = true;
    renderProgress(screen);
    renderFrameSelector();
    updateSaveState(screen);
    updateConditionals();
    bindCanvas();
    const panel = document.querySelector(".form-panel");
    if (panel && state.screen > 0) panel.scrollIntoView({ block: "start" });
  }

  function setConditional(selector, visible) {
    root.querySelectorAll(selector).forEach(container => {
      container.hidden = !visible;
      container.querySelectorAll("input, select, textarea, button").forEach(control => { control.disabled = !visible; });
    });
  }

  function selected(name) {
    return root.querySelector(`[name="${CSS.escape(name)}"]:checked`)?.value || "";
  }

  function selectedMany(name) {
    return [...root.querySelectorAll(`[name="${CSS.escape(name)}"]:checked`)].map(input => input.value);
  }

  function updateConditionals() {
    setConditional('[data-conditional="eoi-needs"]', selected("eoi_needs") === "Yes");
    setConditional('[data-conditional="future-siblings"]', selected("future_siblings") === "Yes");
    setConditional('[data-conditional="attending-siblings"]', selected("attending_siblings") === "Yes");
    setConditional('[data-conditional="other-relatives"]', selected("other_relatives") === "Yes");
    setConditional('[data-conditional="residency-evidence"]', selected("australian_citizen") === "No");
    setConditional('[data-conditional="additional-needs"]', selected("additional_needs") === "Yes");
    setConditional('[data-conditional="other-need"]', selectedMany("need_categories").includes("Other"));
    setConditional('[data-conditional="other-professional"]', selectedMany("professional_categories").includes("Other"));
    root.querySelectorAll("[data-sacrament]").forEach(container => setConditional(`[data-sacrament="${container.dataset.sacrament}"]`, root.querySelector(`[name="${CSS.escape(container.dataset.sacrament)}"]`)?.checked));
    root.querySelectorAll("[data-postal]").forEach(container => setConditional(`[data-postal="${container.dataset.postal}"]`, selected(container.dataset.postal) === "No"));
    root.querySelectorAll("[data-alumni]").forEach(container => setConditional(`[data-alumni="${container.dataset.alumni}"]`, selected(container.dataset.alumni) === "Yes"));
    root.querySelectorAll("[data-fee]").forEach(container => {
      const visible = selected("fee_option") === container.dataset.fee;
      container.hidden = !visible;
      container.querySelectorAll("input, select, textarea").forEach(control => { control.disabled = !visible; });
    });
    updateActionReadiness();
    updateSignatureLocks();
  }

  function updateActionReadiness() {
    const submit = root.querySelector('button[type="submit"]');
    if (!submit || root.querySelector("[data-signature]")) return;
    const gateway = root.querySelector('[name$="_gateway_email"]');
    const code = root.querySelector('[name$="_code"]');
    const newFirst = root.querySelector('[name$="_new_first"]');
    const newLast = root.querySelector('[name$="_new_last"]');
    const detailsReady = root.querySelector('[name="signing_details_correct"]');
    const reviewReady = root.querySelector('[name="signing_review_ready"]');
    if (gateway) submit.disabled = !gateway.value || !gateway.checkValidity();
    else if (code) submit.disabled = code.value.trim().length !== 6;
    else if (newFirst && newLast) submit.disabled = !newFirst.value.trim() || !newLast.value.trim();
    else if (detailsReady) submit.disabled = !detailsReady.checked;
    else if (reviewReady) submit.disabled = !reviewReady.checked;
  }

  function updateSignatureLocks() {
    const signatureContainers = [...root.querySelectorAll("[data-signature]")];
    signatureContainers.forEach(container => {
      const prefix = container.dataset.signature;
      const ip = root.querySelector(`[name="${prefix}_ip"]`);
      const terms = root.querySelector(`[name="${prefix}_terms"]`);
      const date = root.querySelector(`[name="${prefix}_date"]`);
      const unlocked = ip?.checked && terms?.checked;
      container.classList.toggle("is-locked", !unlocked);
      const overlay = container.querySelector(".signature-overlay");
      if (overlay) overlay.hidden = unlocked;
      const clear = root.querySelector(`[data-clear-signature="${prefix}"]`);
      if (clear) clear.disabled = !state.signatures[prefix];
      if (state.signatures[prefix] && !unlocked) {
        [ip, terms].forEach(control => {
          const warning = control && root.querySelector(`[data-validation-for="${control.name}"]`);
          if (control && !control.checked) {
            control.closest(".declaration")?.classList.add("is-invalid");
            if (warning) warning.hidden = false;
          }
        });
        container.classList.add("is-invalid");
        date?.closest(".field")?.classList.add("is-invalid");
      } else if (unlocked) {
        [ip, terms].forEach(control => {
          control?.closest(".declaration")?.classList.remove("is-invalid");
          const warning = control && root.querySelector(`[data-validation-for="${control.name}"]`);
          if (warning) warning.hidden = true;
        });
        container.classList.remove("is-invalid");
        date?.closest(".field")?.classList.remove("is-invalid");
      }
    });
    const submit = root.querySelector('button[type="submit"]');
    if (submit && signatureContainers.length) {
      submit.disabled = signatureContainers.some(container => {
        const prefix = container.dataset.signature;
        return container.classList.contains("is-locked") || !state.signatures[prefix] || !root.querySelector(`[name="${prefix}_date"]`)?.value;
      });
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
      const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
      const record = () => {
        state.signatures[container.dataset.signature] = true;
        if (container.dataset.autoDate === "true") {
          const date = root.querySelector(`[name="${container.dataset.signature}_date"]`);
          if (date) date.value = new Date().toISOString().slice(0, 10);
        }
        updateSignatureLocks();
      };
      canvas.addEventListener("pointerdown", event => { if (container.classList.contains("is-locked")) return; drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); });
      canvas.addEventListener("pointermove", event => { if (!drawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); record(); });
      canvas.addEventListener("pointerup", () => { drawing = false; });
      canvas.addEventListener("keydown", event => { if (event.key !== "Enter" || container.classList.contains("is-locked")) return; event.preventDefault(); context.beginPath(); context.moveTo(120, 120); context.bezierCurveTo(250, 15, 360, 170, 520, 70); context.stroke(); record(); });
    });
  }

  function validate() {
    errorSummary.hidden = true;
    root.querySelectorAll(".is-invalid").forEach(element => element.classList.remove("is-invalid"));
    root.querySelectorAll("[data-validation-for]").forEach(message => { message.hidden = true; });
    const messages = [];
    const groups = new Set();
    root.querySelectorAll("[required]").forEach(control => {
      if (control.disabled || control.closest("[hidden]")) return;
      if (control.type === "radio") {
        if (groups.has(control.name)) return;
        groups.add(control.name);
        if (!root.querySelector(`[name="${CSS.escape(control.name)}"]:checked`)) markInvalid(control, messages);
      } else if (control.type === "checkbox") {
        if (!control.checked) markInvalid(control, messages);
      } else if (!control.value.trim()) markInvalid(control, messages);
      else if (control.type === "email" && !control.checkValidity()) markInvalid(control, messages, "Enter a valid email address");
    });
    root.querySelectorAll("[data-required-group]").forEach(group => {
      if (group.closest("[hidden]") || group.querySelectorAll("input:not(:disabled)").length === 0) return;
      if (!group.querySelector("input:checked")) { group.classList.add("is-invalid"); messages.push(`Select at least one option for ${group.querySelector("legend").textContent.replace("*", "").trim()}`); }
    });
    root.querySelectorAll("[data-max]").forEach(group => {
      const max = Number(group.dataset.max);
      if (group.querySelectorAll("input:checked").length > max) { group.classList.add("is-invalid"); messages.push(`Choose no more than ${max} options for ${group.querySelector("legend").textContent.replace("*", "").trim()}`); }
    });
    root.querySelectorAll("[data-signature]").forEach(container => {
      if (!state.signatures[container.dataset.signature]) { container.classList.add("is-invalid"); messages.push("Provide a signature"); }
    });
    if (!messages.length) return true;
    errorSummary.querySelector("ul").innerHTML = [...new Set(messages)].map(message => `<li>${esc(message)}</li>`).join("");
    errorSummary.hidden = false;
    errorSummary.focus();
    return false;
  }

  function markInvalid(control, messages, override) {
    const wrapper = control.closest(".field, .question, .check-line, .declaration") || control;
    wrapper.classList.add("is-invalid");
    const label = wrapper.querySelector("legend, .field > span, strong")?.textContent.replace("*", "").trim() || control.name;
    messages.push(override || `Complete ${label}`);
    const inline = root.querySelector(`[data-validation-for="${CSS.escape(control.name)}"]`);
    if (inline) inline.hidden = false;
  }

  function next() {
    captureValues();
    if (state.screen < workflows[state.workflow].screens.length - 1) state.screen += 1;
    render();
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    captureValues();
    if (!validate()) return;
    next();
  });

  form.addEventListener("input", event => {
    if (event.target.type === "file") {
      const output = event.target.closest(".field")?.querySelector("[data-file-state]");
      if (output) output.textContent = event.target.files[0] ? `${event.target.files[0].name} · local only` : "Nothing selected";
    }
    captureValues();
    updateConditionals();
  });

  form.addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    const add = event.target.closest("[data-add]");
    const remove = event.target.closest("[data-remove]");
    const clear = event.target.closest("[data-clear-signature]");
    if (action?.dataset.action === "next") next();
    if (action?.dataset.action === "back") { captureValues(); state.screen = Math.max(0, state.screen - 1); render(); }
    if (add) {
      captureValues();
      state.counts[add.dataset.add] += 1;
      const confirmations = { appGuardian: "app_guardians_complete", acceptanceGuardian: "acceptance_guardians_complete", declineGuardian: "decline_guardians_complete" };
      if (confirmations[add.dataset.add]) state.values[confirmations[add.dataset.add]] = [];
      render();
    }
    if (remove) { captureValues(); state.counts[remove.dataset.remove] = Math.max(1, state.counts[remove.dataset.remove] - 1); render(); }
    if (clear) {
      const prefix = clear.dataset.clearSignature;
      state.signatures[prefix] = false;
      const canvas = root.querySelector(`[data-signature="${prefix}"] canvas`);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      const date = root.querySelector(`[name="${prefix}_date"]`);
      if (date && root.querySelector(`[data-signature="${prefix}"]`).dataset.autoDate === "true") date.value = "";
      updateSignatureLocks();
    }
  });

  document.querySelector("#step-list").addEventListener("click", event => {
    const target = event.target.closest("[data-goto]");
    if (!target) return;
    captureValues();
    state.screen = Number(target.dataset.goto);
    render();
  });

  frameSelect.addEventListener("change", () => { captureValues(); state.screen = Number(frameSelect.value); render(); });
  render();
})();
