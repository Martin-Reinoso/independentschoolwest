/* Rosewood Enrolment V6: live EOI and Application; later workflows remain non-writing previews. */
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
  const apiBase = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const invitationToken = params.get("invite") || "";

  const state = {
    workflow: params.get("workflow") || "application",
    screen: 0,
    values: {},
    signatures: {},
    challengeId: "",
    sessionToken: "",
    familySessionToken: "",
    familyContext: null,
    revision: 0,
    applicationContext: null,
    eoiResult: null,
    submitResult: null,
    saveStatus: "idle",
    otpResends: {},
    counts: { appGuardian: 2, sibling: 1, futureSibling: 1, relative: 1, emergency: 2, acceptanceGuardian: 2, declineGuardian: 1 }
  };
  let resendTimer;

  function liveWorkflow() {
    return !reviewMode && ["eoi", "application"].includes(state.workflow);
  }

  async function api(path, options = {}) {
    const { authToken, ...requestOptions } = options;
    const response = await fetch(`${apiBase}${path}`, {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(authToken || state.sessionToken ? { Authorization: `Bearer ${authToken || state.sessionToken}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "The secure enrolment service could not complete this request.");
      error.code = payload.error;
      error.details = payload.details;
      throw error;
    }
    return payload;
  }

  function showServiceError(error) {
    const details = Array.isArray(error.details?.missing) && error.details.missing.length
      ? `<li>${esc(error.details.missing.length)} required answer${error.details.missing.length === 1 ? " is" : "s are"} still incomplete.</li>`
      : "";
    errorSummary.querySelector("ul").innerHTML = `<li>${esc(error.message)}</li>${details}`;
    errorSummary.hidden = false;
    errorSummary.focus();
  }

  const yesNo = ["Yes", "No"];
  const languageCatalogue = window.rosewoodLanguageCatalogue || ["English"];
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
  const applicationDiscoverySources = discoverySources.filter(source => !["Current School Family", "Social Media"].includes(source));
  const influenceFactors = ["Reputation", "Environment & Atmosphere", "Mission, Values & Culture", "Faith Based", "Location", "Facilities", "Fees", "Class Sizes", "Size of school", "Pastoral Care", "Catering to Individual Needs", "Learning Support", "Quality of Teaching", "Curriculum Range & Choice", "Sports", "Arts", "Co-curriculum", "Coeducation", "Family History / Connection", "Friends Attending", "Referral from Friends / Family"];
  const agreementHeadings = ["Education services", "Enrolment", "Fees", "Enrolment under minimum school entry age", "Child safe environment", "Period of Enrolment", "Policies and procedures", "Acceptable behaviour or conduct", "Conformity with principles of the Catholic faith", "Provision of accurate information", "Children with additional needs", "Assessment and updates", "Discipline", "Termination by the school", "Appeal Process on Enrolment Decisions", "General"];

  const languageList = document.querySelector("#language-list");
  languageList.innerHTML = languageCatalogue.map(language => `<option value="${esc(language)}"></option>`).join("");

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

  function documentTextLink(title) {
    return `<span class="document-text-link" aria-disabled="true">${title}<small>Rosewood document pending</small></span>`;
  }

  function communicationNotice() {
    return `<p class="communication-notice">By providing an email address and/or mobile number, you agree to receive informational and promotional messages from Rosewood College. Promotional emails will include an unsubscribe option, and you may reply STOP to promotional SMS messages.</p>`;
  }

  function renderGateway(kind) {
    const labels = { application: "begin the formal application", acceptance: "formally accept the offered place", decline: "formally decline the offered place" };
    if (kind === "application") {
      const invitationNotice = liveWorkflow() && !invitationToken ? notice("Private invitation required", "Open the unique Application for Enrolment link sent by Rosewood College. A general link cannot start an application.", "legal-note") : "";
      return intro("Welcome to your enrolment application", "Dear Parent/Guardian,", workflows[kind].label) +
        invitationNotice + `<div class="gateway-welcome-copy"><p>Please enter the email address that received your invitation to begin applying for your child's admission to Rosewood College.</p><p>If you have previously submitted an Expression of Interest or provided information to Rosewood College, please use the same email address. We may use the information already provided to prepopulate parts of your application.</p><p>If this is your first contact with Rosewood College, entering the email address that received the invitation will create a new application for you.</p><p>Before beginning, please familiarise yourself with our ${documentTextLink("Enrolment Policy")} and ${documentTextLink("Enrolment Procedure")}.</p><p>Supporting documents will be requested later in the application. You can save your progress and return if you need time to obtain them.</p><p>Information provided through this application will be managed in accordance with our ${documentTextLink("Privacy Policy")} and ${documentTextLink("Privacy Collection Notice")}.</p></div>` +
        section("Enter your email", `<div class="field-grid two">${field(`${kind}_gateway_email`, "Email", { type: "email", required: true, autocomplete: "email", disabled: liveWorkflow() && !invitationToken })}</div>`) + actions({ label: "Next", back: false, disabled: liveWorkflow() && !invitationToken });
    }
    return intro(kind === "acceptance" ? "Accept an enrolment offer" : "Decline an enrolment offer", `Parent / Guardian, enter the email address used for your Rosewood College invitation to ${labels[kind]}.`, workflows[kind].label) +
      section("Privacy documents", `<div class="source-links">${["Privacy Policy", "Privacy Collection Notice"].map(documentPlaceholder).join("")}</div>`) +
      section("Language", `<div class="field-grid two">${field(`${kind}_language`, "Language", { type: "select", options: ["English"] })}</div><div class="inline-actions"><button type="button" class="button button-quiet" data-static>Refresh language</button></div>`) +
      section("Enter your email", `<div class="field-grid two">${field(`${kind}_gateway_email`, "Email", { type: "email", required: true, autocomplete: "email" })}</div>`) + actions({ label: "Next", back: false });
  }

  function renderOtp(kind) {
    const live = liveWorkflow() && kind === "application";
    return intro("Enter your verification code", live ? "A six-digit code has been sent to your invited email address. It expires after 10 minutes." : "A six-digit code would be sent to the invited email address in production.", workflows[kind].label) +
      section("Verification", `<div class="field-grid two">${field(`${kind}_code`, "Verification Code", { required: true, maxlength: 6, hint: live ? "Enter the most recent code sent by Rosewood College." : "Review frame only." })}</div><div class="inline-actions"><button type="button" class="button button-secondary" data-action="resend-code" data-resend-kind="${kind}">Resend code</button><button type="button" class="button button-quiet" data-action="back">Change email</button></div><p class="resend-status" data-resend-status="${kind}" aria-live="polite"></p>`) + actions({ label: "Verify" });
  }

  function renderSelector(kind) {
    const noun = kind === "application" ? "application" : kind === "acceptance" ? "enrolment agreement" : "decline record";
    const action = kind === "application" ? "Continue" : kind === "acceptance" ? "Start acceptance form" : "Start decline form";
    const newRecord = kind === "decline" ? "" : section(`Start a new ${noun}`, `<div class="field-grid two">${field(`${kind}_new_first`, "Student First Name", { required: true })}${field(`${kind}_new_last`, "Student Last Name", { required: true })}</div>`) + actions({ label: `Start ${noun}` });
    if (kind === "application" && liveWorkflow() && (state.familyContext || state.applicationContext)) {
      const family = state.familyContext || { recipientEmail: state.applicationContext.recipientEmail, parentGuardianName: "", applications: [{ applicationId: state.applicationContext.applicationId, studentName: state.applicationContext.studentName, status: state.applicationContext.status, sourceEoiId: state.applicationContext.sourceEoiId, editable: ["invited", "in_progress"].includes(state.applicationContext.status) }] };
      const applications = (family.applications || []).filter(record => record.studentName);
      const linked = applications.some(record => record.sourceEoiId);
      const statusLabel = status => ({ invited: "Not Started", in_progress: "In Progress", pending_signatures: "Pending Signatures", submitted: "Submitted" })[status] || status;
      const rows = applications.map(record => `<tr><td>${esc(record.studentName)}</td><td>${record.sourceEoiId ? "Expression of Interest" : "Direct invitation"}</td><td><span class="status-pill${record.editable ? "" : " is-complete"}">${esc(statusLabel(record.status))}</span></td><td>${record.editable ? `<button type="button" class="button button-primary" data-select-application="${esc(record.applicationId)}">Continue</button>` : "Completed"}</td></tr>`).join("");
      const records = applications.length ? section("Child applications", `<div class="record-table-wrap"><table class="record-table"><thead><tr><th>Student Name</th><th>Source</th><th>Application Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`) : "";
      const startCopy = applications.length ? "Add another child" : "Enter the first child";
      return intro("Choose a child application", linked ? "We found the Expression of Interest linked by Rosewood College. You can continue that child’s application or start a separate application for another child." : "This is a direct family invitation. Add each child who will apply to Rosewood College; each child has a separate application record.", workflows[kind].label) +
        section("Invited parent or guardian", `<div class="review-card"><dl>${family.parentGuardianName ? `<dt>Name</dt><dd>${esc(family.parentGuardianName)}</dd>` : ""}<dt>Email</dt><dd>${esc(family.recipientEmail || state.values.application_gateway_email)}</dd></dl></div>`) + records +
        section(startCopy, `<p>${applications.length ? "Use this only for another child. Their medical details, documents, progress and signatures will remain separate from the applications above." : "Enter the child’s name to create their Application for Enrolment."}</p><div class="field-grid two">${field("application_new_first", "Student First Name", { required: true })}${field("application_new_last", "Student Last Name", { required: true })}</div>`) + actions({ label: applications.length ? "Start another application" : "Start application" });
    }
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
      actions({ label: liveWorkflow() ? "Submit expression of interest" : "Submit expression of interest preview", back: false });
  }

  function renderEoiAcknowledgement() {
    if (liveWorkflow() && state.eoiResult) return `<div class="success-card"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Expression of interest</p><h3>Expression of interest received</h3><p>Thank you. Rosewood College has received your Expression of Interest.</p><div class="status-card"><strong>Reference ${esc(state.eoiResult.reference)}</strong><p>An acknowledgement has been sent to ${esc(state.values.eoi_email)}. Keep the reference for your records.</p></div><p>This is an enquiry record, not an Application for Enrolment. If you are invited to apply, Rosewood College will send a separate private link.</p></div>`;
    return `<div class="success-card"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Expression of interest</p><h3>Preview complete</h3><p>The captured process issued an acknowledgement email after an expression of interest was lodged.</p><div class="status-card"><strong>Nothing was submitted</strong><p>This review frame has no backend connection.</p></div></div>`;
  }

  function repeatBlock(kind, singular, renderer) {
    return `<div class="repeat-list">${Array.from({ length: state.counts[kind] }, (_, index) => `<article class="repeat-card"><header><h4>${singular} ${index + 1}</h4>${index > 0 ? `<button type="button" class="button button-quiet" data-remove="${kind}">Remove</button>` : ""}</header><div class="field-grid">${renderer(index)}</div></article>`).join("")}</div><div class="repeat-controls"><button type="button" class="button button-secondary" data-add="${kind}">Add ${singular.toLowerCase()}</button></div>`;
  }

  function renderApplicationStudent() {
    return intro("Student", "Provide the student, residence, family, background, support, sacramental and medical information requested in the application.", "Application for enrolment") +
      section("Student Details", `<div class="field-grid">${field("student_first", "First Name", { required: true })}${field("student_middle", "Middle Name")}${field("student_last", "Last Name", { required: true })}${field("student_preferred", "Preferred Name")}${field("student_dob", "Date of Birth", { type: "date", required: true })}${field("student_gender", "Gender", { type: "select", options: ["Male", "Female"], required: true })}${field("student_religion", "Religion", { type: "select", options: religions, required: true })}</div><div class="conditional-panel" data-conditional="other-religion"><div class="field-grid">${field("student_religion_other", "Other religion", { required: true, className: "span-three" })}</div></div><div class="field-grid student-enrolment-grid">${field("current_level", "Current School Year", { type: "select", options: currentLevels, required: true })}${field("entry_year", "Entry Year", { type: "select", options: years, required: true })}${field("entry_level", "Year Level of Entry", { type: "select", options: primaryLevels, required: true })}${field("current_school", "Current Early Learning Centre / Kindergarten / Primary School", { type: "select", options: currentSchools, required: true, className: "span-three student-school-field" })}</div><div class="conditional-panel" data-conditional="other-current-school"><div class="field-grid">${field("current_school_other", "Other Early Learning Centre / Kindergarten / Primary School", { required: true, className: "span-three" })}</div></div>`) +
      section("Student Residence", `${choices("student_address_share", "Share this address with other Parent/Guardian?", ["Yes, share", "No, keep private"], { required: true })}${choices("care_arrangement", "Home Care Arrangement", ["Both Parents", "Mother Only", "Father Only", "Shared Custody", "Carer / Guardian", "Out-of-home care", "Kinship", "Other"], { multiple: true, required: true, grid: true })}<div class="conditional-panel" data-conditional="other-care-arrangement"><div class="field-grid">${field("care_other", "Other Care Arrangement", { required: true, className: "span-three" })}</div></div><div class="conditional-panel" data-conditional="shared-parenting"><div class="field-grid">${field("shared_parenting", "Shared Parenting Schedule", { type: "textarea", required: true, className: "span-three" })}</div></div>`) +
      section("Student Primary Address", `<div class="field-grid">${field("student_address", "Address", { required: true, className: "span-two" })}${field("student_suburb", "Suburb", { required: true })}${field("student_state", "State", { required: true })}${field("student_postcode", "Postcode", { required: true })}${field("student_country", "Country", { required: true, list: "country-list", value: "Australia" })}</div>`) +
      section("Family", `${choices("future_siblings", "Do you have any other children that may attend our school?", yesNo, { required: true, className: "family-question" })}<div class="conditional-panel" data-conditional="future-siblings">${choices("future_sibling_count", "How many children?", ["1", "2", "3", "4", "5", "6", "7+"], { required: true })}</div>`) +
      section("Nationality and Citizenship", `<div class="government-context"><strong>Government Requirement</strong><p>The information in this section is about the student and is collected to meet government reporting requirements.</p></div><div class="field-grid">${field("residence_country", "Student's current country of residence", { required: true, list: "country-list" })}${field("birth_country", "Student's country of birth", { required: true, list: "country-list", hint: "In which country was the student born?" })}${field("nationality", "Student's country of nationality", { required: true, list: "country-list" })}${field("ethnicity", "Student's ethnicity")}</div><div class="field-grid citizenship-date-row">${field("arrival_date", "When did the student arrive in or return to live in Australia?", { type: "date", className: "span-three", hint: "For students born overseas, enter the date they first arrived to live in Australia. If the student previously lived in Australia and later lived overseas, enter the date they most recently returned to live in Australia." })}${field("residency_status", "What is the residential status of the student?", { type: "select", options: ["Permanent", "Temporary"], required: true, className: "span-three" })}</div>${choices("australian_citizen", "Citizenship Status", yesNo, { required: true, hint: "Is the student an Australian citizen?" })}<div class="conditional-panel" data-conditional="residency-evidence">${choices("residency_evidence", "Evidence of Australian Residency", ["Permanent Resident", "Eligible for Australian Passport", "Temporary Resident", "Other / Visitor / Overseas Student"], { required: true, grid: true })}<div class="conditional-panel visa-panel" data-conditional="visa-details"><div class="field-grid">${field("visa_subclass", "Visa subclass", { required: true })}${field("visa_expiry", "Visa expiry", { type: "date", required: true })}${field("previous_visa", "Previous visa subclass")}</div></div></div>${choices("indigenous_status", "Aboriginal / Torres Strait Islander Status", ["Aboriginal", "Torres Strait Islander", "Aboriginal and Torres Strait Islander", "Not Applicable"], { required: true })}<h5 class="content-subheading">Languages</h5><div class="field-grid two">${field("main_language", "Main Language", { type: "select", options: languageCatalogue, required: true })}${field("other_languages", "Other Languages", { list: "language-list" })}</div>`) +
      section("General / Additional Needs", `<div class="needs-introduction"><p>To meet duty of care obligations and facilitate the smooth transition of your child into the school, please provide all required information. This will assist the school to implement appropriate adjustments and strategies to meet the particular needs of your child. If the information is not provided or is incomplete, incorrect or misleading, current or ongoing enrolment may be reviewed.</p><p class="needs-assurance"><strong>*Please Note:</strong> This information will not impact the offer of enrolment.</p></div>${choices("additional_needs", "General / Additional Needs", yesNo, { required: true })}<div data-conditional="additional-needs">${choices("need_categories", "Please Specify", needCategories, { multiple: true, grid: true, required: true })}<div data-conditional="other-need" class="field-grid">${field("need_other", "Other Additional Need", { required: true, className: "span-three" })}</div></div>${choices("professional_categories", "Health Professionals", professionalCategories, { multiple: true, grid: true })}<div data-conditional="other-professional" class="field-grid">${field("professional_other", "Other Health Professional", { required: true })}</div>${choices("reports_attached", "Reports Attached", yesNo, { required: true })}${choices("ndis_support", "NDIS Support", yesNo, { required: true })}${choices("court_orders", "Court or Parenting Orders", yesNo, { required: true })}<div class="field-grid">${field("other_relevant_information", "Other Relevant Information", { type: "textarea", className: "span-three" })}</div>`) +
      section("Sacraments", `<div class="field-grid">${field("parish", "Parish where student lives", { className: "span-three" })}</div>${["Baptism", "Reconciliation", "Eucharist", "Confirmation"].map(item => `${check(`sacrament_${item}`, item)}<div class="conditional-panel" data-sacrament="sacrament_${item}"><div class="field-grid two">${field(`sacrament_${item}_date`, `${item} Date`, { type: "date" })}${field(`sacrament_${item}_location`, `${item} Location`)}</div></div>`).join("")}`) +
      section("Medical Details", `${choices("medical_conditions", "Medical Conditions", medicalConditions, { multiple: true, grid: true, required: true })}<div data-conditional="other-medical" class="field-grid">${field("other_medical_condition", "Other medical condition", { required: true, className: "span-three" })}</div><div class="field-grid">${field("condition_details", "Condition Details", { type: "textarea", className: "span-two" })}${field("allergy_details", "Allergy Details", { type: "textarea" })}</div>${choices("anaphylaxis_risk", "Anaphylaxis Risk", yesNo, { required: true })}${choices("anaphylaxis_device", "EpiPen / Anapen", ["EpiPen", "Anapen"], {})}${choices("immunisation", "Immunisation", yesNo, { required: true })}${choices("humanitarian_health", "Humanitarian Health Check", yesNo, { hint: "Is the child on a humanitarian visa?" })}<div class="field-grid">${field("doctor_name", "Doctor Name", { required: true })}${field("doctor_address", "Doctor's practice/Address", { required: true, className: "span-two" })}${field("doctor_phone", "Doctor Phone", { type: "tel" })}${field("medicare_number", "Medicare Number / Reference")}${field("medicare_expiry", "Medicare Expiry", { type: "date" })}${field("private_insurance", "Private Insurance", { className: "span-two" })}</div>${choices("ambulance_cover", "Ambulance Cover", yesNo, { required: true })}${choices("healthcare_card", "Health Care Card", yesNo, { required: true })}`) + actions();
  }

  function applicationGuardianFields(index) {
    const prefix = `app_guardian_${index}_`;
    return choices(prefix + "share", "Share these details with other contacts?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" }) +
      field(prefix + "title", "Title", { type: "select", options: titles, required: true }) + field(prefix + "first", "Given Name", { required: true }) + field(prefix + "last", "Surname", { required: true }) +
      field(prefix + "email", "Email", { type: "email", required: true }) + field(prefix + "mobile", "Mobile Phone", { type: "tel", required: true }) + field(prefix + "home", "Home Phone", { type: "tel" }) + field(prefix + "work", "Work Phone", { type: "tel" }) +
      field(prefix + "relationship", "Relationship", { type: "select", options: relationships, required: true }) + field(prefix + "contact_type", "Contact Type", { type: "select", options: ["Primary", "Secondary"], required: true }) +
      field(prefix + "marital", "Marital Status", { type: "select", options: ["Married", "De-Facto", "Divorced", "Single", "Separated", "Widowed", "Engaged", "Other"] }) + field(prefix + "religion", "Religion", { type: "select", options: religions }) +
      choices(prefix + "sms", "SMS Messaging", yesNo, { required: true, className: "span-three" }) + choices(prefix + "healthcare", "Health Care Card", yesNo, { required: true, className: "span-three" }) +
      `<div class="conditional-panel span-three" data-healthcare="${prefix}healthcare"><div class="field-grid two">${field(prefix + "healthcare_number", "Health Care Card No.", { required: true })}${field(prefix + "healthcare_expiry", "Health Care Card Expiry", { type: "date", required: true })}</div></div>` +
      `<h5 class="subsection-heading span-three">Residential and postal address</h5>` +
      field(prefix + "address", "Residential Address", { required: true, className: "span-two" }) + field(prefix + "suburb", "Suburb", { required: true }) + field(prefix + "state", "State", { required: true }) + field(prefix + "postcode", "Postcode", { required: true }) + field(prefix + "country", "Country", { required: true, list: "country-list", value: "Australia" }) + choices(prefix + "postal_same", "Postal Address Same as Residential?", yesNo, { required: true, className: "span-three" }) +
      `<div class="conditional-panel span-three" data-postal="${prefix}postal_same"><div class="field-grid">${field(prefix + "postal_address", "Postal Address", { required: true, className: "span-two" })}${field(prefix + "postal_suburb", "Postal Suburb", { required: true })}${field(prefix + "postal_state", "Postal State", { required: true })}${field(prefix + "postal_postcode", "Postal Postcode", { required: true })}${field(prefix + "postal_country", "Postal Country", { required: true, list: "country-list" })}</div></div>` +
      `<h5 class="subsection-heading span-three">Occupation and education</h5>` +
      field(prefix + "occupation_group", "Occupational Group", { type: "select", options: ["A", "B", "C", "D", "N - no paid employment in the previous 12 months"], required: true }) + field(prefix + "occupation", "Occupation", { required: true }) + field(prefix + "employer", "Employer") +
      field(prefix + "school_education", "School Level Education", { type: "select", options: ["Year 12", "Year 11", "Year 10", "Year 9 or below"], required: true }) + field(prefix + "further_education", "University / Further Education", { type: "select", options: ["Bachelor degree or above", "Advanced Diploma / Diploma", "Certificate I-IV", "No post-school qualification"], required: true }) +
      `<h5 class="subsection-heading span-three">Residency</h5>` +
      field(prefix + "birth_country", "Country of Birth", { list: "country-list", required: true }) + field(prefix + "nationality", "Nationality", { list: "country-list", required: true }) + field(prefix + "ethnicity", "Ethnicity", { required: true }) + field(prefix + "languages", "Languages", { list: "language-list", required: true }) +
      field(prefix + "residency", "Residency Status", { type: "select", options: ["Citizen", "Permanent Resident", "Temporary Resident"], required: true }) + `<div class="conditional-panel span-three" data-guardian-visa="${prefix}residency"><div class="field-grid two">${field(prefix + "visa_subclass", "Visa Subclass", { required: true })}${field(prefix + "visa_expiry", "Visa Expiry", { type: "date", required: true })}</div></div>` +
      choices(prefix + "indigenous", "Aboriginal / Torres Strait Islander", ["Aboriginal", "Torres Strait Islander", "Aboriginal and Torres Strait Islander", "Not Applicable"], { required: true, className: "span-three" }) +
      (index > 0 ? choices(prefix + "permission", "Can the school contact this person about the student?", ["Yes", "No, do not contact them"], { required: true, className: "span-three", hint: "No also prevents a separate signature-request email." }) : "");
  }

  function renderApplicationGuardians() {
    const emergency = index => field(`emergency_${index}_first`, "First Name", { required: true }) + field(`emergency_${index}_last`, "Last Name", { required: true }) + field(`emergency_${index}_relationship`, "Relationship", { required: true }) + field(`emergency_${index}_mobile`, "Mobile Phone", { type: "tel", required: true }) + field(`emergency_${index}_home`, "Home Phone", { type: "tel" }) + field(`emergency_${index}_work`, "Work Phone", { type: "tel" }) + field(`emergency_${index}_email`, "Email", { type: "email" });
    return intro("Parent / Guardian", "Confirm the prefilled primary contact, add each legal parent or guardian and provide two emergency contacts.", "Application for enrolment") +
      section("Parents and Guardians", repeatBlock("appGuardian", "Contact", applicationGuardianFields) + communicationNotice(), `${state.counts.appGuardian} contact records`) +
      section("Guardian Confirmation", check("app_guardians_complete", "I have used Add Contact to enter any additional legal parent or guardian details, or there is no additional parent or guardian to add.", { required: true })) +
      section("Emergency Contacts", repeatBlock("emergency", "Emergency contact", emergency), "Two requested") + actions();
  }

  const applicationDocuments = [
    ["Birth Certificate", "Copy of the student's birth certificate", true, "birth_certificate"],
    ["Immunisation Statement / Medical Management Plan(s) / Health Professional Report(s)", "Relevant current evidence", false, "health_and_immunisation"],
    ["School Reports / NAPLAN Results", "Latest school report and available NAPLAN results", false, "school_report"],
    ["Sacramental Certificates", "Relevant sacramental evidence", false, "sacramental"],
    ["Passport / Visa Documentation", "Relevant residency and visa evidence", false, "residency"]
  ];

  function renderApplicationDocuments() {
    const accept = ".pdf,.png,.jpg,.jpeg";
    const uploaded = state.applicationContext?.documents || [];
    const note = liveWorkflow() ? notice("Save and return", "If you do not have every optional document now, continue with the documents available. Your completed sections are saved when you move forward.") : notice("Frontend review", "Files remain on your device in this review frame.");
    return intro("Documents", "Upload the supporting documents available for this application.", "Application for enrolment") + note +
      `<div class="document-list">${applicationDocuments.map((document, index) => { const existing = uploaded.filter(item => item.category === document[3]); const alreadyUploaded = existing.length > 0; return `<article class="document-card"><header><div><h4>${document[0]}${document[2] ? ' <span class="required">*</span>' : ""}</h4><p>${document[1]}</p>${alreadyUploaded ? `<p class="uploaded-document">Uploaded: ${existing.map(item => esc(item.fileName)).join(", ")}</p>` : ""}</div><span class="document-badge">${alreadyUploaded ? "Uploaded" : document[2] ? "1 file required" : "Optional"}</span></header>${field(`application_document_${index}`, `Choose ${document[0]}`, { type: "file", required: document[2] && !alreadyUploaded, multiple: true, accept, hint: "Multiple files accepted, maximum 10 MB each." })}</article>`; }).join("")}</div>` + actions();
  }

  function termsHeadings(count) {
    return `<ol class="terms-heading-list">${agreementHeadings.slice(0, count).map(heading => `<li><strong>${heading}</strong></li>`).join("")}</ol>`;
  }

  function renderApplicationConditions() {
    return intro("Conditions", "Confirm previous-school permission, school-fee responsibility and the application survey.", "Application for enrolment") +
      section("Previous School / Preschool Permission", check("previous_school_permission", "I / We give permission for the school to contact the previous school or preschool to gather relevant reports and information for educational planning.", { required: true }) + `<div class="field-grid two">${field("previous_school_name", "Name of Previous School / Preschool / Kindergarten", { required: true })}${field("previous_school_address", "Address", { required: true })}</div>${choices("previous_school_interstate", "Interstate?", ["No", "Yes", "Not Applicable"], { required: true })}`) +
      section("School Fee Responsibility", `<p class="section-question">Who will be responsible for payment of school fees?</p><p class="fee-responsibility-note"><strong>Please note, the name/s of the parent / carers signing are responsible for the payment of fees for the term of the child's enrolment at the school.</strong></p>${choices("fee_option", "Choose one fee responsibility option", ["Both Parents / Guardian", "One Parent / Guardian", "Percentage split with custodial court order"], { required: true, grid: true })}<div class="conditional-panel" data-fee="Both Parents / Guardian"><p class="conditional-note">Please nominate Parent / Guardian A or Parent / Guardian B to receive the fee account.</p><div class="field-grid two">${field("fee_both_nominee", "Fee account recipient", { type: "select", options: ["Parent / Guardian A", "Parent / Guardian B"], required: true })}${field("fee_both_date", "Date", { type: "date", required: true })}</div></div><div class="conditional-panel" data-fee="One Parent / Guardian"><div class="field-grid two">${field("fee_one_nominee", "Fee account recipient", { type: "select", options: ["Parent / Guardian A", "Parent / Guardian B"], required: true })}${field("fee_one_date", "Date", { type: "date", required: true })}</div></div><div class="conditional-panel" data-fee="Percentage split with custodial court order"><div class="field-grid">${field("fee_guardian_a", "Guardian A Name", { required: true })}${field("fee_guardian_a_percent", "Guardian A Percentage", { type: "number", min: 0, max: 100, required: true })}${field("fee_guardian_b", "Guardian B Name", { required: true })}${field("fee_guardian_b_percent", "Guardian B Percentage", { type: "number", min: 0, max: 100, required: true })}${field("fee_split_date", "Date", { type: "date", required: true })}</div></div>`) +
      section("Survey", `<div class="field-grid">${field("application_discovery", "How did you hear about us?", { type: "select", options: applicationDiscoverySources, required: true, className: "span-two" })}</div>${choices("application_influences", "Please indicate the three most important things that influenced your decision", influenceFactors, { multiple: true, grid: true, required: true, max: 3 })}`) + actions();
  }

  function signaturePanel(prefix, declaration, options = {}) {
    return `<article class="signature-card"><h4>${options.title || "Parent / Guardian"}</h4><label class="declaration"><input type="checkbox" name="${prefix}_ip" required><span>I acknowledge and agree that, at the time of signing this form, my IP address will be recorded and stored by the School for administrative, security and legal compliance purposes. <span class="required">*</span></span></label><p class="validation-message" data-validation-for="${prefix}_ip" hidden>You must acknowledge the IP address recording to continue</p><label class="declaration"><input type="checkbox" name="${prefix}_terms" required><span>${declaration} <span class="required">*</span></span></label><p class="validation-message" data-validation-for="${prefix}_terms" hidden>You must agree to the terms to continue</p><div class="signature-wrap is-locked" data-signature="${prefix}" data-auto-date="${options.autoDate ? "true" : "false"}"><canvas width="960" height="190" tabindex="0" aria-label="Signature area. Use a pointer to sign or press Enter to add a review signature."></canvas><div class="signature-overlay">Please agree to the terms above to enable signing</div></div><button type="button" class="button button-secondary" data-clear-signature="${prefix}" disabled>Clear Signature</button><div class="field-grid two">${field(`${prefix}_date`, "Date", { type: "date", required: true, readonly: options.autoDate })}</div></article>`;
  }

  function renderApplicationSignature() {
    const additionalName = [state.values.app_guardian_1_first, state.values.app_guardian_1_last].filter(Boolean).join(" ") || "Parent / Guardian B";
    const additionalEmail = state.values.app_guardian_1_email || "Email entered in the Parent / Guardian section";
    const explanation = state.counts.appGuardian === 1
      ? `<div class="field-grid">${field("application_one_signature_reason", "Explanation only one signature", { type: "textarea", required: true, className: "span-three", hint: "Only one parent/guardian has been included in this application. Enter the reason above or call the College to discuss." })}</div>`
      : `<div class="guardian-signature-followup"><div class="review-card"><h4>${esc(additionalName)}</h4><dl><dt>Email</dt><dd>${esc(additionalEmail)}</dd><dt>Signature</dt><dd>Requested after this application is submitted</dd></dl></div>${check("application_additional_signature_later", `I understand that ${esc(additionalName)} will be contacted separately to review and sign this application after I submit it.`, { required: true })}</div>`;
    return intro("Signature", "Completing, signing and lodging this application is required for consideration but does not guarantee enrolment. Enrolment is formalised only after an offer and Enrolment Agreement.", "Application for enrolment") +
      section("Signature of Parents / Guardians", `<p class="signature-disclaimer"><strong>Disclaimer:</strong> Personal information will be held, used and disclosed in accordance with the College Privacy Collection Notice and Privacy Policy.</p>${signaturePanel("application_signature", "I declare that I have read, understood and given consent to all matters contained in this application.", { title: "Parent / Guardian: Primary Contact" })}${explanation}<div class="field-grid">${field("application_additional_information", "Additional Information", { type: "textarea", className: "span-three" })}</div>`) + actions({ label: liveWorkflow() ? "Submit application" : "Submit application preview" });
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
    return intro("Enter the code", "A code has been sent to your email address. Enter the code to continue.", "Guardian signing") + section("Verification", `<div class="field-grid two">${field("signing_code", "Verification Code", { required: true, maxlength: 6, hint: "Use 123456 in this frontend review. Production codes expire after 30 minutes." })}</div><div class="inline-actions"><button type="button" class="button button-secondary" data-action="resend-code" data-resend-kind="signing">Resend code</button><button type="button" class="button button-quiet" data-action="back">Change email</button></div><p class="resend-status" data-resend-status="signing" aria-live="polite"></p>`) + actions({ label: "Verify" });
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
    if (application && liveWorkflow() && state.submitResult) {
      const pending = state.submitResult.status === "pending_signatures";
      return `<div class="success-card"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Application for enrolment</p><h3>Application received</h3><p>Your Application for Enrolment has been submitted successfully.</p><div class="status-card"><strong>Reference ${esc(state.submitResult.reference)}</strong><p>${pending ? "A separate signature request has been sent to each additional parent or guardian who must sign." : "All required signatures have been recorded."}</p></div><p>A confirmation email has been sent. You can close this page safely.</p>${state.familySessionToken ? '<button type="button" class="button button-secondary" data-action="family-selector">View or add another child</button>' : ""}</div>`;
    }
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
    application: { label: "Application for enrolment", title: "Application for enrolment.", copy: "Use the invitation sent by Rosewood College to access your application.", promise: "Secure access, student selection and the five-step application remain distinct.", formLabels: ["Student", "Parent / Guardian", "Documents", "Conditions", "Signature"], screens: [
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
      return `<li><button type="button" data-goto="${target}"${index === current ? ' aria-current="step"' : ""}${index < current ? ' class="is-reviewed"' : ""}${liveWorkflow() && index > current ? " disabled" : ""}>${label}</button></li>`;
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
    if (liveWorkflow()) {
      const verified = state.workflow === "eoi" || Boolean(state.sessionToken || state.familySessionToken);
      const saved = state.saveStatus === "saved" || Boolean(state.eoiResult || state.submitResult);
      save.classList.toggle("is-saved", saved);
      save.classList.toggle("is-saving", state.saveStatus === "saving");
      save.querySelector("strong").textContent = state.saveStatus === "saving" ? "Saving securely" : saved ? "Saved" : verified ? "Secure form" : "Secure access";
      save.querySelector("small").textContent = state.saveStatus === "saving" ? "Please keep this page open" : saved ? `Last saved ${state.lastSavedLabel || "just now"}` : verified ? "Progress saves when you continue" : "Verify your invitation email to begin";
      return;
    }
    const isForm = screen.formStep != null && state.workflow !== "signing";
    save.classList.toggle("is-saved", false);
    save.classList.toggle("is-saving", false);
    save.querySelector("strong").textContent = "Frontend review";
    save.querySelector("small").textContent = isForm ? "Answers are simulated and not persisted" : "Not connected or saved";
  }

  function updateEnvironment() {
    const live = liveWorkflow();
    document.querySelector("#environment-label").textContent = live ? "Secure enrolment form" : "Frontend review";
    document.querySelector("#environment-copy").textContent = live ? "EOI and Application information is saved securely. Offer acceptance and decline are not active." : "Nothing entered in this review workflow is saved, uploaded, emailed or submitted.";
    document.querySelector("#footer-environment").textContent = live ? "Secure online form" : "Frontend review only";
    document.querySelector("#environment-ribbon").classList.toggle("is-live", live);
  }

  function render() {
    clearInterval(resendTimer);
    const workflow = workflows[state.workflow];
    state.screen = Math.max(0, Math.min(state.screen, workflow.screens.length - 1));
    const screen = workflow.screens[state.screen];
    document.querySelector("#workflow-label").textContent = workflow.label;
    document.querySelector("#step-title").textContent = screen.label;
    document.querySelector("#story-kicker").textContent = workflow.label;
    document.querySelector("#story-title").textContent = workflow.title;
    document.querySelector("#story-copy").textContent = workflow.copy;
    document.querySelector("#story-promise-copy").textContent = workflow.promise;
    updateEnvironment();
    root.innerHTML = screen.render();
    errorSummary.hidden = true;
    renderProgress(screen);
    renderFrameSelector();
    updateSaveState(screen);
    updateConditionals();
    bindCanvas();
    const resendButton = root.querySelector("[data-resend-kind]");
    if (resendButton && state.otpResends[resendButton.dataset.resendKind]) startResendCountdown(resendButton.dataset.resendKind);
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
    setConditional('[data-conditional="other-religion"]', root.querySelector('[name="student_religion"]')?.value === "Other");
    setConditional('[data-conditional="other-current-school"]', root.querySelector('[name="current_school"]')?.value === "Other");
    setConditional('[data-conditional="other-care-arrangement"]', selectedMany("care_arrangement").includes("Other"));
    setConditional('[data-conditional="shared-parenting"]', selectedMany("care_arrangement").includes("Shared Custody"));
    setConditional('[data-conditional="future-siblings"]', selected("future_siblings") === "Yes");
    const citizenshipRequiresEvidence = selected("australian_citizen") === "No";
    const residencyEvidence = selected("residency_evidence");
    setConditional('[data-conditional="residency-evidence"]', citizenshipRequiresEvidence);
    setConditional('[data-conditional="visa-details"]', citizenshipRequiresEvidence && Boolean(residencyEvidence) && residencyEvidence !== "Eligible for Australian Passport");
    setConditional('[data-conditional="additional-needs"]', selected("additional_needs") === "Yes");
    setConditional('[data-conditional="other-need"]', selectedMany("need_categories").includes("Other"));
    setConditional('[data-conditional="other-professional"]', selectedMany("professional_categories").includes("Other"));
    setConditional('[data-conditional="other-medical"]', selectedMany("medical_conditions").includes("Other"));
    root.querySelectorAll("[data-sacrament]").forEach(container => setConditional(`[data-sacrament="${container.dataset.sacrament}"]`, root.querySelector(`[name="${CSS.escape(container.dataset.sacrament)}"]`)?.checked));
    root.querySelectorAll("[data-postal]").forEach(container => setConditional(`[data-postal="${container.dataset.postal}"]`, selected(container.dataset.postal) === "No"));
    root.querySelectorAll("[data-healthcare]").forEach(container => setConditional(`[data-healthcare="${container.dataset.healthcare}"]`, selected(container.dataset.healthcare) === "Yes"));
    root.querySelectorAll("[data-guardian-visa]").forEach(container => {
      const fieldName = container.dataset.guardianVisa;
      setConditional(`[data-guardian-visa="${fieldName}"]`, root.querySelector(`[name="${CSS.escape(fieldName)}"]`)?.value === "Temporary Resident");
    });
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

  function startResendCountdown(kind) {
    clearInterval(resendTimer);
    const update = () => {
      const record = state.otpResends[kind];
      const button = root.querySelector(`[data-resend-kind="${CSS.escape(kind)}"]`);
      const status = root.querySelector(`[data-resend-status="${CSS.escape(kind)}"]`);
      if (!record || !button || !status) return clearInterval(resendTimer);
      if (record.count >= 5) {
        button.disabled = true;
        button.textContent = "Resend unavailable";
        status.textContent = "Five new codes have been requested. Please wait 30 minutes before trying again.";
        return clearInterval(resendTimer);
      }
      const seconds = Math.max(0, Math.ceil((record.availableAt - Date.now()) / 1000));
      if (seconds > 0) {
        button.disabled = true;
        button.textContent = `Resend available in ${seconds}s`;
      } else {
        button.disabled = false;
        button.textContent = "Resend code";
        status.textContent = "You can request another code if it has not arrived.";
        clearInterval(resendTimer);
      }
    };
    update();
    resendTimer = setInterval(update, 1000);
  }

  async function resendCode(kind) {
    const record = state.otpResends[kind] || { count: 0, availableAt: 0 };
    state.otpResends[kind] = record;
    if (record.count >= 5 || record.availableAt > Date.now()) return startResendCountdown(kind);
    const button = root.querySelector(`[data-resend-kind="${CSS.escape(kind)}"]`);
    const status = root.querySelector(`[data-resend-status="${CSS.escape(kind)}"]`);
    if (!button || !status) return;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Sending...';
    status.textContent = "Sending a new code...";
    if (liveWorkflow() && kind === "application") {
      try {
        const result = await api("/v6/application/access/request-code", { method: "POST", body: JSON.stringify({ invitationToken, email: state.values.application_gateway_email }) });
        state.challengeId = result.challengeId;
        record.count += 1;
        record.availableAt = Date.now() + result.resendAfterSeconds * 1000;
        status.textContent = "A new code has been sent if the invitation and email address match.";
      } catch (error) {
        status.textContent = error.message;
        record.availableAt = Date.now() + 30000;
      }
      return startResendCountdown(kind);
    }
    window.setTimeout(() => {
      record.count += 1;
      record.availableAt = Date.now() + 30000;
      const currentStatus = root.querySelector(`[data-resend-status="${CSS.escape(kind)}"]`);
      if (currentStatus) currentStatus.textContent = "A new code has been sent.";
      startResendCountdown(kind);
    }, 900);
  }

  function setBusy(busy, label = "Working...") {
    const button = root.querySelector('button[type="submit"]');
    if (!button) return;
    if (busy) {
      button.dataset.previousLabel = button.textContent;
      button.disabled = true;
      button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span> ${esc(label)}`;
    } else {
      button.textContent = button.dataset.previousLabel || "Next";
      button.disabled = false;
    }
  }

  async function saveApplicationDraft(stage) {
    state.saveStatus = "saving";
    updateSaveState(workflows.application.screens[state.screen]);
    const result = await api("/v6/application/draft", {
      method: "PUT",
      body: JSON.stringify({
        expectedRevision: state.revision,
        values: state.values,
        screen: state.screen,
        stage,
        guardianCount: state.counts.appGuardian,
        emergencyCount: state.counts.emergency,
        percentComplete: Math.round((Math.max(0, state.screen - 2) / 5) * 100)
      })
    });
    state.revision = result.revision;
    state.applicationContext = { ...state.applicationContext, ...result };
    state.saveStatus = "saved";
    state.lastSavedLabel = new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
    updateSaveState(workflows.application.screens[state.screen]);
    return result;
  }

  function mimeTypeFor(file) {
    if (file.type) return file.type.toLowerCase();
    const extension = file.name.split(".").pop().toLowerCase();
    return ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" })[extension] || "application/octet-stream";
  }

  async function sha256Base64(file) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return btoa(String.fromCharCode(...new Uint8Array(digest)));
  }

  async function confirmDocumentAfterScan(category, documentId) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        return await api("/v6/application/documents/confirm", { method: "POST", body: JSON.stringify({ category, documentId }) });
      } catch (error) {
        if (error.code !== "DOCUMENT_SCAN_PENDING" || attempt === 29) throw error;
        await new Promise(resolve => window.setTimeout(resolve, Math.max(1, Number(error.details?.retryAfterSeconds) || 3) * 1000));
      }
    }
    throw new Error("The document security check is taking longer than expected. Please try again shortly.");
  }

  async function uploadApplicationDocuments() {
    for (let index = 0; index < applicationDocuments.length; index += 1) {
      const input = root.querySelector(`[name="application_document_${index}"]`);
      if (!input?.files?.length) continue;
      const category = applicationDocuments[index][3];
      for (const file of input.files) {
        const mimeType = mimeTypeFor(file);
        const checksumSha256 = await sha256Base64(file);
        const started = await api("/v6/application/documents/start", { method: "POST", body: JSON.stringify({ category, fileName: file.name, mimeType, size: file.size, checksumSha256 }) });
        const uploaded = await fetch(started.uploadUrl, { method: "PUT", headers: started.uploadHeaders || { "Content-Type": mimeType }, body: file });
        if (!uploaded.ok) throw new Error(`The file ${file.name} could not be uploaded. Please try again.`);
        const documentId = started.documentId || (await uploaded.json()).id;
        const confirmed = await confirmDocumentAfterScan(category, documentId);
        state.applicationContext.documents = [...(state.applicationContext.documents || []), { category, documentId: confirmed.document.documentId, fileName: confirmed.document.fileName, size: confirmed.document.size }];
      }
    }
  }

  function applyApplicationSession(result) {
    state.sessionToken = result.sessionToken;
    state.applicationContext = result.context;
    if (result.family) state.familyContext = result.family;
    state.revision = result.context.revision;
    state.values = { application_gateway_email: state.values.application_gateway_email, ...result.context.values };
    state.counts.appGuardian = result.context.guardianCount || 1;
    state.counts.emergency = result.context.emergencyCount || 2;
  }

  async function selectFamilyApplication(applicationId, button) {
    const previous = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Opening...';
    try {
      const result = await api("/v6/application/records/select", { method: "POST", authToken: state.familySessionToken, body: JSON.stringify({ applicationId }) });
      applyApplicationSession(result);
      return next();
    } catch (error) {
      button.disabled = false;
      button.innerHTML = previous;
      showServiceError(error);
    }
  }

  async function handleLiveSubmit() {
    if (state.workflow === "eoi" && state.screen === 0) {
      setBusy(true, "Submitting...");
      state.eoiResult = await api("/v6/eoi", { method: "POST", body: JSON.stringify({ values: state.values }) });
      state.saveStatus = "saved";
      state.lastSavedLabel = "submitted";
      return next();
    }
    if (state.workflow !== "application") return next();
    if (state.screen === 0) {
      setBusy(true, "Sending code...");
      const result = await api("/v6/application/access/request-code", { method: "POST", body: JSON.stringify({ invitationToken, email: state.values.application_gateway_email }) });
      state.challengeId = result.challengeId;
      state.otpResends.application = { count: 1, availableAt: Date.now() + result.resendAfterSeconds * 1000 };
      return next();
    }
    if (state.screen === 1) {
      setBusy(true, "Verifying...");
      const result = await api("/v6/application/access/verify-code", { method: "POST", body: JSON.stringify({ invitationToken, challengeId: state.challengeId, code: state.values.application_code }) });
      state.familySessionToken = result.familySessionToken || "";
      state.familyContext = result.family || null;
      state.sessionToken = result.family ? "" : result.sessionToken;
      state.applicationContext = result.context;
      state.revision = result.context.revision;
      state.values = result.family ? { application_gateway_email: state.values.application_gateway_email } : { application_gateway_email: state.values.application_gateway_email, ...result.context.values };
      if (!result.family) {
        state.counts.appGuardian = result.context.guardianCount || 1;
        state.counts.emergency = result.context.emergencyCount || 2;
      }
      return next();
    }
    if (state.screen === 2) {
      if (state.familyContext && state.familySessionToken) {
        setBusy(true, "Creating application...");
        const result = await api("/v6/application/records", { method: "POST", authToken: state.familySessionToken, body: JSON.stringify({ studentFirstName: state.values.application_new_first, studentLastName: state.values.application_new_last }) });
        applyApplicationSession(result);
      } else {
        if (state.values.application_new_first) state.values.student_first = state.values.application_new_first;
        if (state.values.application_new_last) state.values.student_last = state.values.application_new_last;
      }
      return next();
    }
    if (state.screen === 5) {
      setBusy(true, "Uploading securely...");
      await uploadApplicationDocuments();
      await saveApplicationDraft("documents");
      return next();
    }
    if (state.screen === 7) {
      setBusy(true, "Submitting...");
      await saveApplicationDraft("signature");
      const canvas = root.querySelector('[data-signature="application_signature"] canvas');
      state.submitResult = await api("/v6/application/submit", { method: "POST", body: JSON.stringify({ expectedRevision: state.revision, signatureDataUrl: canvas.toDataURL("image/png") }) });
      state.saveStatus = "saved";
      state.lastSavedLabel = "submitted";
      return next();
    }
    const stage = workflows.application.screens[state.screen].label.toLowerCase().replaceAll(" ", "_");
    setBusy(true, "Saving...");
    await saveApplicationDraft(stage);
    return next();
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    captureValues();
    if (!validate()) return;
    if (!liveWorkflow()) return next();
    try {
      await handleLiveSubmit();
    } catch (error) {
      state.saveStatus = "error";
      setBusy(false);
      updateSaveState(workflows[state.workflow].screens[state.screen]);
      showServiceError(error);
    }
  });

  form.addEventListener("input", event => {
    if (event.target.type === "file") {
      const output = event.target.closest(".field")?.querySelector("[data-file-state]");
      if (output) output.textContent = event.target.files[0] ? `${event.target.files.length} file${event.target.files.length === 1 ? "" : "s"} selected` : "Nothing selected";
    }
    captureValues();
    updateConditionals();
  });

  form.addEventListener("click", async event => {
    const action = event.target.closest("[data-action]");
    const selectedApplication = event.target.closest("[data-select-application]");
    const add = event.target.closest("[data-add]");
    const remove = event.target.closest("[data-remove]");
    const clear = event.target.closest("[data-clear-signature]");
    if (selectedApplication) return selectFamilyApplication(selectedApplication.dataset.selectApplication, selectedApplication);
    if (action?.dataset.action === "family-selector") {
      if (state.familyContext && state.applicationContext) {
        state.familyContext.applications = state.familyContext.applications.map(record => record.applicationId === state.applicationContext.applicationId ? { ...record, status: state.submitResult?.status || record.status, editable: false } : record);
      }
      const email = state.values.application_gateway_email;
      state.sessionToken = "";
      state.applicationContext = null;
      state.submitResult = null;
      state.values = { application_gateway_email: email };
      state.screen = 2;
      return render();
    }
    if (action?.dataset.action === "next") next();
    if (action?.dataset.action === "back") { captureValues(); state.screen = Math.max(0, state.screen - 1); render(); }
    if (action?.dataset.action === "resend-code") resendCode(action.dataset.resendKind);
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
