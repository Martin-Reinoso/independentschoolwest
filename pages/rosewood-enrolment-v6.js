/* Rosewood Enrolment V6: live EOI and Application; later workflows remain non-writing previews. */
(function () {
  "use strict";

  const form = document.querySelector("#family-form");
  const root = document.querySelector("#form-root");
  const errorSummary = document.querySelector("#error-summary");
  const progress = document.querySelector("#progress");
  const reviewTools = document.querySelector("#review-tools");
  const frameSelect = document.querySelector("#frame-select");
  const sessionExpiredDialog = document.querySelector("#session-expired-dialog");
  const sessionExpiredCopy = document.querySelector("#session-expired-copy");
  const params = new URLSearchParams(location.search);
  const reviewMode = params.get("review") === "1";
  const apiBase = "https://6zyzo44sdb5zmmx53toktqrnuu0sikyd.lambda-url.ap-southeast-2.on.aws";
  const invitationToken = params.get("invite") || "";
  const policyDocuments = window.rosewoodPolicyDocuments || {};
  const policyOrder = ["enrolment-policy", "enrolment-procedure", "privacy-policy"];
  const SUPPORTED_APPLICATION_FORM_VERSIONS = new Set(["rosewood-application-2026.1", "rosewood-application-2026.2", "rosewood-application-2026.3", "rosewood-application-2026.4", "rosewood-application-2026.5", "rosewood-application-2026.6", "rosewood-application-2026.7", "rosewood-application-2026.8", "rosewood-application-2026.9"]);
  const CONTACT_PERMISSION_YES = "Yes, the school may contact this person";
  const CONTACT_PERMISSION_NO = "No, do not contact this person";
  const APPLICATION_SESSION_STORAGE_KEY = "rosewood-enrolment-v6-active-session";

  const state = {
    workflow: params.get("workflow") || "application",
    screen: 0,
    policySlug: params.get("policy") || "",
    values: {},
    signatures: {},
    challengeId: "",
    sessionToken: "",
    familySessionToken: "",
    statusSessionToken: "",
    familyContext: null,
    revision: 0,
    formVersion: "",
    formDefinitionHash: "",
    applicationContext: null,
    eoiResult: null,
    submitResult: null,
    statusContext: null,
    correction: null,
    serverValidation: [],
    saveStatus: "idle",
    lastSavedSnapshot: "",
    changeVersion: 0,
    sessionAbsoluteExpiresAt: 0,
    paused: false,
    otpResends: {},
    counts: { appGuardian: 2, sibling: 1, futureSibling: 1, relative: 1, emergency: 2, acceptanceGuardian: 2, declineGuardian: 1 }
  };
  let resendTimer;
  let autosaveTimer;
  let autosaveMaxTimer;
  let sessionExpiryTimer;
  let saveQueue = Promise.resolve();
  let googlePlacesPromise;
  const documentUploads = new Map();
  const boundAddressLookups = new WeakSet();
  const AUTOSAVE_DEBOUNCE_MS = 1200;
  const AUTOSAVE_MAX_WAIT_MS = 8000;
  const APPLICATION_IDLE_SECONDS = 20 * 60;

  function liveWorkflow() {
    return !reviewMode && ["eoi", "application"].includes(state.workflow);
  }

  function policySlugFromLocation() {
    const current = new URLSearchParams(location.search);
    const slug = current.get("policy") || "";
    return current.get("workflow") === "application" && policyDocuments[slug] ? slug : "";
  }

  function activePolicy() {
    return state.workflow === "application" ? policyDocuments[state.policySlug] || null : null;
  }

  function policyHref(slug = "") {
    const url = new URL(location.href);
    url.searchParams.set("workflow", "application");
    if (slug) url.searchParams.set("policy", slug);
    else url.searchParams.delete("policy");
    url.hash = "";
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function applyFormContract(context) {
    const formVersion = context?.formVersion;
    if (!SUPPORTED_APPLICATION_FORM_VERSIONS.has(formVersion)) {
      const error = new Error("This saved application uses a form version that this page cannot open. Please contact Rosewood College; your saved information has not been changed.");
      error.code = "FORM_VERSION_UNSUPPORTED";
      throw error;
    }
    state.formVersion = formVersion;
    state.formDefinitionHash = context.formDefinitionHash || "";
  }

  async function api(path, options = {}) {
    const { authToken, ...requestOptions } = options;
    const requestAuthToken = authToken || state.sessionToken;
    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        ...requestOptions,
        headers: {
          "Content-Type": "application/json",
          ...(requestAuthToken ? { Authorization: `Bearer ${requestAuthToken}` } : {}),
          ...(options.headers || {})
        }
      });
    } catch (error) {
      error.code = "NETWORK_ERROR";
      throw error;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "The secure enrolment service could not complete this request.");
      error.code = payload.error;
      error.details = payload.details;
      throw error;
    }
    if (requestAuthToken && path !== "/v6/session/logout") armSessionExpiry(payload.idleTimeoutSeconds);
    return payload;
  }

  function showServiceError(error) {
    if (["SESSION_EXPIRED", "SESSION_REQUIRED"].includes(error.code)) {
      showSessionExpired();
      return;
    }
    const missing = Array.isArray(error.details?.missing) ? error.details.missing.map(missingAnswerGuidance) : [];
    state.serverValidation = missing;
    const details = missing.map(item => `<li><strong>${esc(item.section)}:</strong> ${esc(item.message)}</li>`).join("");
    const first = missing[0];
    const action = first ? `<li class="validation-summary-action"><button type="button" class="button button-secondary" data-validation-screen="${first.screen}">Review ${esc(first.section)}</button></li>` : "";
    errorSummary.querySelector("ul").innerHTML = `<li>${esc(missing.length ? "Review the information below before submitting the application." : error.message)}</li>${details}${action}`;
    errorSummary.hidden = false;
    errorSummary.focus();
  }

  function persistBrowserSession() {
    if (!liveWorkflow() || state.workflow !== "application" || !(state.familySessionToken || state.sessionToken || state.statusSessionToken)) return;
    sessionStorage.setItem(APPLICATION_SESSION_STORAGE_KEY, JSON.stringify({
      familySessionToken: state.familySessionToken,
      sessionToken: state.sessionToken,
      statusSessionToken: state.statusSessionToken,
      email: state.values.application_gateway_email || state.applicationContext?.recipientEmail || "",
      screen: state.screen,
      absoluteExpiresAt: state.sessionAbsoluteExpiresAt
    }));
  }

  function clearPersistedBrowserSession() {
    sessionStorage.removeItem(APPLICATION_SESSION_STORAGE_KEY);
  }

  async function restoreBrowserSession() {
    if (!liveWorkflow() || state.workflow !== "application") return false;
    let stored;
    try { stored = JSON.parse(sessionStorage.getItem(APPLICATION_SESSION_STORAGE_KEY) || "null"); } catch { stored = null; }
    if (!stored || (!stored.familySessionToken && !stored.sessionToken && !stored.statusSessionToken)) return false;
    if (stored.absoluteExpiresAt && stored.absoluteExpiresAt <= Date.now()) {
      clearPersistedBrowserSession();
      return false;
    }
    state.values.application_gateway_email = stored.email || "";
    state.familySessionToken = stored.familySessionToken || "";
    state.sessionAbsoluteExpiresAt = Number(stored.absoluteExpiresAt || 0);
    try {
      if (stored.statusSessionToken) {
        state.statusSessionToken = stored.statusSessionToken;
        state.statusContext = await api("/v6/application/status", { method: "GET", authToken: stored.statusSessionToken });
        state.screen = 8;
      } else if (stored.sessionToken) {
        const context = await api("/v6/application/context", { method: "GET", authToken: stored.sessionToken });
        applyApplicationSession({ sessionToken: stored.sessionToken, context });
        state.familySessionToken = stored.familySessionToken || "";
        state.screen = Math.max(3, Math.min(7, Number(context.screen || stored.screen || 3)));
      } else {
        const result = await api("/v6/application/family", { method: "GET", authToken: stored.familySessionToken });
        state.familyContext = result.family;
        state.screen = 2;
      }
      armSessionExpiry();
      return true;
    } catch (error) {
      clearPersistedBrowserSession();
      state.familySessionToken = "";
      state.sessionToken = "";
      state.statusSessionToken = "";
      if (!["SESSION_EXPIRED", "SESSION_REQUIRED"].includes(error.code)) showServiceError(error);
      return false;
    }
  }

  function missingAnswerGuidance(code) {
    const [field, qualifier = ""] = String(code).split(":");
    const exact = {
      "application_influences:three_required": { section: "Conditions", screen: 6, message: "Select exactly three answers for \u201cPlease indicate the three most important things that influenced your decision\u201d." },
      application_influences: { section: "Conditions", screen: 6, message: "Select exactly three answers for \u201cPlease indicate the three most important things that influenced your decision\u201d." },
      application_additional_signature_later: { section: "Signature", screen: 7, message: "Confirm that the additional parent or guardian will be contacted separately to sign." },
      application_one_signature_reason: { section: "Signature", screen: 7, message: "Explain why only one parent or guardian is included in this application." },
      birth_certificate: { section: "Documents", screen: 5, message: "Upload the student's birth certificate." }
    };
    const exactMatch = exact[qualifier ? `${field}:${qualifier}` : field];
    if (exactMatch) return { code: String(code), field, ...exactMatch };

    let section = "Student";
    let screen = 3;
    let label = field.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
    const guardian = field.match(/^app_guardian_(\d+)_(.+)$/);
    const emergency = field.match(/^emergency_(\d+)_(.+)$/);
    if (guardian) {
      section = "Parent / Guardian";
      screen = 4;
      label = `Parent / Guardian ${String.fromCharCode(65 + Number(guardian[1]))}: ${guardian[2].replaceAll("_", " ")}`;
    } else if (emergency) {
      section = "Parent / Guardian";
      screen = 4;
      label = `Emergency contact ${Number(emergency[1]) + 1}: ${emergency[2].replaceAll("_", " ")}`;
    } else if (field === "app_guardians_complete") {
      section = "Parent / Guardian";
      screen = 4;
      label = "Guardian confirmation";
    } else if (["previous_school_attended", "previous_school_name", "previous_school_year_level", "interrupted_schooling", "interrupted_schooling_details", "formal_assessment", "formal_assessment_details", "formal_assessment_report"].includes(field)) {
      section = "Student";
      screen = 3;
    } else if (field.startsWith("previous_school_") || field.startsWith("fee_") || ["application_discovery", "application_influences", "application_student_agreement", "application_parent_agreement", "application_agreement_acknowledgement"].includes(field)) {
      section = "Conditions";
      screen = 6;
    } else if (field.startsWith("application_signature_") || field.startsWith("application_one_signature") || field.startsWith("application_additional_signature")) {
      section = "Signature";
      screen = 7;
    }
    const message = qualifier === "invalid" ? `Enter a valid ${label.toLowerCase()}.` : `Complete ${label.toLowerCase()}.`;
    return { code: String(code), field, section, screen, message };
  }

  function clearSessionExpiryTimer() {
    clearTimeout(sessionExpiryTimer);
    sessionExpiryTimer = undefined;
  }

  function armSessionExpiry(seconds = APPLICATION_IDLE_SECONDS) {
    clearSessionExpiryTimer();
    if (!liveWorkflow() || state.workflow !== "application" || !(state.sessionToken || state.familySessionToken)) return;
    const idleDelay = Math.max(1, Number(seconds) || APPLICATION_IDLE_SECONDS) * 1000;
    const absoluteDelay = state.sessionAbsoluteExpiresAt ? Math.max(0, state.sessionAbsoluteExpiresAt - Date.now()) : idleDelay;
    sessionExpiryTimer = window.setTimeout(showSessionExpired, Math.min(idleDelay, absoluteDelay));
  }

  function beginSessionExpiry(result) {
    if (Number(result.absoluteTimeoutSeconds) > 0) state.sessionAbsoluteExpiresAt = Date.now() + Number(result.absoluteTimeoutSeconds) * 1000;
    armSessionExpiry(result.idleTimeoutSeconds || result.expiresInSeconds);
  }

  function showSessionExpired(forceUnsaved = false) {
    if (!liveWorkflow() || state.workflow !== "application" || sessionExpiredDialog.open) return;
    const unsaved = forceUnsaved || ["dirty", "saving", "offline", "error"].includes(state.saveStatus) || pendingDocumentFiles() || Boolean(state.signatures.application_signature);
    clearAutosaveTimers();
    clearSessionExpiryTimer();
    state.saveStatus = "expired";
    sessionExpiredCopy.textContent = unsaved
      ? "For your security, this session ended after 20 minutes without activity. Your last successfully saved progress is safe, but changes made after the last save may need to be entered again."
      : "For your security, this session ended after 20 minutes without activity. Your previously saved progress is safe.";
    errorSummary.hidden = true;
    updateSaveState(workflows.application.screens[state.screen]);
    sessionExpiredDialog.showModal();
  }

  const yesNo = ["Yes", "No"];
  const languageCatalogue = window.rosewoodLanguageCatalogue || ["English"];
  const years = Array.from({ length: 20 }, (_, index) => String(2027 + index));
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
  const occupationGroups = [
    "Group 1: Senior management, government administration, defence and qualified professionals",
    "Group 2: Other managers, arts/media/sportspeople and associate professionals",
    "Group 3: Tradespeople, clerical workers and skilled office, sales and service staff",
    "Group 4: Machine operators, hospitality workers, assistants and labourers",
    "Not in paid work during the past 12 months",
    "Prefer not to answer / Unknown"
  ];
  const occupations = "Academic;Accountant;Acting/Theatre;Advertising;Agriculture/Farming;Agronomist;Analyst;Animal Worker;Antique/Art Dealer;Architecture/Drafting;Armed Services;Artist/Painter;Author/Writer;Aviation/Pilot/Hostess;Banking;Bookmaker;Builder;Business Admin/Manager;Butcher;Caterer;Chemist / Pharmacy;Cleaner;Clerk;Communications;Composing;Computers;Construction/Building;Consultant;Consulting Services;Contractor;Cook;Counselling;Deli Owner;Dental Technician;Dentistry;Detective;Development Officer;Diplomatic Corps;Director;Doctor (Medicine);Driver;Economist;Editor;Education;Electrician;Engineering;Entertainment;Fashion;Financial Services;Fire Officer;Food/Catering;Foreman;Garden/Plants;General Administration;Geology;Germany;Government Departments;Grazier;Hair Dresser;Health Services;Home Duties;Homemaker/Houseperson;Hospitality;Hotel;Insurance;Interior Design;Interpreter;Investor;Jewellery Services;Laundry Proprietor;Lawyer;Legal Services;Library Services;Manager;Manufacturer;Manufacturing Industry;Marketing;Mechanic;Media/TV/Radio/Newspapers;Medical Records Admin;Merchant;Minister;Motel Proprietor;Nurse;Optometrist;Panel Shop Prop;Personnel;Phamacist;Photography;Physiotherapist;Plumber;Postman;Professional Polo Player;Programmer;Psychologist;Public Servant;Publishing;Radiographer;Real Estate;Recreation;Religion;Removalist;Retailer;Retired;Sales Manager;Salesman;Scientist;Secretarial/Clerical;Self Employed;Social Work;Sport/Athletics;Storeman;Student;Surveyor;Technician;Tradespeople;Transport;Transport Operator;Travel Industry;Veterinarian;Viticulture;Volunteer Worker;Welder;Winemaker".split(";");
  const emergencyRelationships = ["Father", "Mother", "Stepfather", "Stepmother", "Guardian", "Uncle", "Aunt", "Grandparent", "Friend", "Sibling", "Unknown"];
  const countryCodes = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW","XK"];
  const regionNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en-AU"], { type: "region" }) : null;
  const countryCatalogue = [...new Set(countryCodes.map(code => regionNames?.of(code) || code))].sort((left, right) => left.localeCompare(right, "en-AU"));
  const hhcStudentCommitments = ["Attend school regularly and punctually", "Participate in Religious Education lessons and liturgical celebrations", "Do the prescribed homework and home study each evening", "Co-operate with all staff members", "Observe the College rules as specified in the Student Planner", "Wear the uniform correctly", "Behave appropriately on public transport", "Participate in sporting activities", "Attend all compulsory College excursions, camps, retreats and reflection days"];
  const hhcParentCommitments = ["Support the Catholic ethos and practices of the College", "Pay all fees by the due date", "Promote the College in the community", "Attend Parent/Teacher interviews", "Notify the College in writing when my/our child is unable to attend school", "Provide an environment which supports our child's learning", "Provide the correct uniform and support the College uniform rules", "Communicate with the College on matters of concern", "Notify the College if our child has any special learning needs", "Support the College by attendance at functions organised by the College and Parents and Friends Association where possible", "Obtain the permission of the Principal for prolonged absences", "Inform the College when relevant family details change", "The College taking photographs/video footage of my/our child that may appear in College publications, promotions and social media. Parents/Guardians should notify the College in writing if permission is not given", "Provide, in writing to the Principal, at least ten school weeks notice if seeking to cease the enrolment of my/our child before the completion of Grade 12"];

  const languageList = document.querySelector("#language-list");
  languageList.innerHTML = languageCatalogue.map(language => `<option value="${esc(language)}"></option>`).join("");
  const countryList = document.querySelector("#country-list");
  countryList.innerHTML = countryCatalogue.map(country => `<option value="${esc(country)}"></option>`).join("");

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function melbourneDate(value = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
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

  function addressLookup(id, fields, label = "Find address") {
    return `<div class="address-lookup span-three" data-address-lookup data-address-line="${esc(fields.line)}" data-address-suburb="${esc(fields.suburb)}" data-address-state="${esc(fields.state)}" data-address-postcode="${esc(fields.postcode)}" data-address-country="${esc(fields.country)}">
      <div class="address-lookup-heading"><span id="${esc(id)}-label">${esc(label)}</span><small>Optional</small></div>
      <div class="address-lookup-widget" data-address-widget aria-labelledby="${esc(id)}-label" aria-busy="true"><span>Loading address suggestions...</span></div>
      <p class="address-lookup-status" id="${esc(id)}-status" data-address-status role="status">Suggestions are provided by Google. You can also enter the address manually below.</p>
    </div>`;
  }

  function addressAutocompleteConfig() {
    const config = state.applicationContext?.addressAutocomplete;
    return config?.enabled === true && config.provider === "google_places" && config.apiKey ? config : null;
  }

  function loadGooglePlaces(config) {
    if (window.google?.maps?.places?.PlaceAutocompleteElement) return Promise.resolve(window.google.maps.places);
    if (googlePlacesPromise) return googlePlacesPromise;
    googlePlacesPromise = new Promise((resolve, reject) => {
      const callback = `rosewoodGooglePlacesReady${Date.now()}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => reject(new Error("Address suggestions took too long to load.")), 15000);
      const finish = result => {
        window.clearTimeout(timeout);
        delete window[callback];
        resolve(result);
      };
      window[callback] = async () => {
        try {
          const places = await window.google.maps.importLibrary("places");
          finish(places);
        } catch (error) {
          window.clearTimeout(timeout);
          delete window[callback];
          reject(error);
        }
      };
      script.async = true;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.apiKey)}&libraries=places&v=weekly&loading=async&callback=${callback}&language=en&region=${encodeURIComponent(config.region || "AU")}&auth_referrer_policy=origin`;
      script.addEventListener("error", () => {
        window.clearTimeout(timeout);
        delete window[callback];
        reject(new Error("Address suggestions could not be loaded."));
      }, { once: true });
      document.head.append(script);
    });
    return googlePlacesPromise;
  }

  function componentValue(components, type, short = false) {
    const component = components.find(item => Array.isArray(item.types) && item.types.includes(type));
    return component ? String(short ? component.shortText : component.longText || "").trim() : "";
  }

  function applySelectedAddress(wrapper, place) {
    const components = Array.isArray(place.addressComponents) ? place.addressComponents : [];
    const unit = componentValue(components, "subpremise");
    const streetNumber = componentValue(components, "street_number");
    const route = componentValue(components, "route");
    const premise = componentValue(components, "premise");
    const street = [streetNumber, route].filter(Boolean).join(" ") || premise;
    const line = `${unit ? `Unit ${unit}, ` : ""}${street}`.trim();
    const suburb = componentValue(components, "locality") || componentValue(components, "postal_town") || componentValue(components, "sublocality_level_1") || componentValue(components, "administrative_area_level_2");
    const updates = {
      [wrapper.dataset.addressLine]: line,
      [wrapper.dataset.addressSuburb]: suburb,
      [wrapper.dataset.addressState]: componentValue(components, "administrative_area_level_1", true),
      [wrapper.dataset.addressPostcode]: componentValue(components, "postal_code"),
      [wrapper.dataset.addressCountry]: componentValue(components, "country")
    };
    let updated = false;
    Object.entries(updates).forEach(([name, value]) => {
      const control = root.querySelector(`[name="${CSS.escape(name)}"]`);
      if (!control || !value) return;
      control.value = value;
      state.values[name] = value;
      clearResolvedServerValidation(name);
      updated = true;
    });
    const status = wrapper.querySelector("[data-address-status]");
    if (!updated) {
      status.textContent = "We could not separate that result into the address fields. Please enter the address manually below.";
      return;
    }
    captureValues();
    scheduleAutosave();
    status.textContent = "Address selected. Please review the address fields below before continuing.";
    root.querySelector(`[name="${CSS.escape(wrapper.dataset.addressLine)}"]`)?.focus({ preventScroll: true });
  }

  function setAddressLookupFallback(wrapper, message = "Address suggestions are unavailable right now. Please enter the address manually below.") {
    const widget = wrapper.querySelector("[data-address-widget]");
    const status = wrapper.querySelector("[data-address-status]");
    if (widget) {
      widget.removeAttribute("aria-busy");
      widget.innerHTML = '<span class="address-lookup-unavailable">Address search unavailable</span>';
    }
    if (status) status.textContent = message;
  }

  async function bindAddressAutocomplete() {
    const wrappers = [...root.querySelectorAll("[data-address-lookup]")].filter(wrapper => !boundAddressLookups.has(wrapper));
    if (!wrappers.length) return;
    wrappers.forEach(wrapper => boundAddressLookups.add(wrapper));
    const config = addressAutocompleteConfig();
    if (!config) {
      wrappers.forEach(wrapper => setAddressLookupFallback(wrapper, reviewMode ? "Address suggestions become available after a family verifies its invitation. Enter the address manually for this review." : undefined));
      return;
    }
    try {
      const { PlaceAutocompleteElement } = await loadGooglePlaces(config);
      wrappers.forEach(wrapper => {
        if (!wrapper.isConnected) return;
        const widget = wrapper.querySelector("[data-address-widget]");
        const labelId = wrapper.querySelector(".address-lookup-heading span")?.id;
        const autocomplete = new PlaceAutocompleteElement();
        autocomplete.placeholder = "Start typing an address";
        autocomplete.setAttribute("aria-label", "Search for an address");
        if (labelId) autocomplete.setAttribute("aria-labelledby", labelId);
        try { autocomplete.locationBias = { south: -44, west: 112, north: -10, east: 154 }; } catch {}
        autocomplete.addEventListener("gmp-select", async event => {
          const status = wrapper.querySelector("[data-address-status]");
          status.textContent = "Adding the selected address...";
          try {
            const place = event.placePrediction.toPlace();
            await place.fetchFields({ fields: ["addressComponents"] });
            applySelectedAddress(wrapper, place);
          } catch {
            status.textContent = "That address could not be added automatically. Please enter it manually below.";
          }
        });
        autocomplete.addEventListener("gmp-error", () => setAddressLookupFallback(wrapper));
        widget.replaceChildren(autocomplete);
        widget.removeAttribute("aria-busy");
      });
    } catch {
      wrappers.forEach(wrapper => setAddressLookupFallback(wrapper));
    }
  }

  function choices(name, label, options, config = {}) {
    const multiple = config.multiple === true;
    const stored = state.values[name] ?? config.value;
    const selected = Array.isArray(stored) ? stored : [stored];
    return `<fieldset class="question ${config.className || ""}"${multiple && config.required ? " data-required-group" : ""}${config.max ? ` data-max="${config.max}"` : ""}${config.exact ? ` data-exact="${config.exact}"` : ""}><legend>${label}${config.required ? ' <span class="required" aria-hidden="true">*</span>' : ""}</legend>${config.intro ? `<small class="group-intro">${config.intro}</small>` : ""}<div class="${config.grid ? "choice-grid" : "choice-row"}">${options.map((option, index) => `<label class="choice"><input type="${multiple ? "checkbox" : "radio"}" name="${name}" value="${esc(option)}"${selected.includes(option) ? " checked" : ""}${config.required && !multiple && index === 0 ? " required" : ""}${config.disabled ? " disabled" : ""}><span>${esc(option)}</span></label>`).join("")}</div>${config.hint ? `<small class="group-note">${config.hint}</small>` : ""}</fieldset>`;
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
    const saveLater = liveWorkflow() && state.workflow === "application" && state.screen >= 3 && state.screen <= 7
      ? '<button type="button" class="button button-quiet save-later-button" data-action="save-close">Save and continue later</button>'
      : "";
    const left = options.left != null ? options.left : `${back}${saveLater}`;
    const label = options.label || "Next";
    return `<div class="step-actions"><div class="left">${left}</div><div class="right">${options.secondary || ""}<button type="submit" class="button button-primary"${options.disabled ? " disabled" : ""}>${label}</button></div></div>`;
  }

  function documentPlaceholder(title) {
    return `<span class="source-link" aria-disabled="true"><span><strong>${title}</strong><small>Rosewood-approved document pending</small></span><span>Unavailable</span></span>`;
  }

  function welcomePolicyLinks() {
    return `<nav class="welcome-policy-links" aria-label="Optional Rosewood College policy information"><ul>${policyOrder.map(slug => {
      const policy = policyDocuments[slug];
      if (!policy) return "";
      return `<li><a class="welcome-policy-link" href="${esc(policyHref(slug))}" data-policy-link="${esc(slug)}">${esc(policy.title)}</a></li>`;
    }).join("")}</ul></nav>`;
  }

  function policyTabs(activeSlug) {
    return policyOrder.map(slug => {
      const policy = policyDocuments[slug];
      if (!policy) return "";
      const current = slug === activeSlug ? ' aria-current="page"' : "";
      return `<a href="${esc(policyHref(slug))}" data-policy-link="${esc(slug)}"${current}>${esc(policy.title)}</a>`;
    }).join("");
  }

  function policyContents(policy) {
    return `<details class="policy-contents"><summary>Contents</summary><ol>${policy.headings.map(heading => `<li class="policy-contents-level-${heading.level}"><a href="#${esc(heading.id)}"><span>${esc(heading.number)}</span>${esc(heading.title)}</a></li>`).join("")}</ol></details>`;
  }

  function renderPolicyViewer(policy) {
    const options = policyOrder.map(slug => {
      const item = policyDocuments[slug];
      if (!item) return "";
      return `<option value="${esc(slug)}"${slug === policy.slug ? " selected" : ""}>${esc(item.title)}</option>`;
    }).join("");
    return `<article class="policy-reader" aria-labelledby="policy-reader-title">
      <div class="policy-reader-toolbar">
        <div class="policy-reading-progress" aria-hidden="true"><span data-policy-progress></span></div>
        <a class="policy-return" href="${esc(policyHref())}" data-policy-return><span aria-hidden="true">&#8592;</span><span>Return to application</span></a>
        <nav class="policy-tabs" aria-label="Choose a Rosewood College policy">${policyTabs(policy.slug)}</nav>
        <label class="policy-mobile-selector"><span>Choose policy</span><select data-policy-select aria-label="Choose a Rosewood College policy">${options}</select></label>
      </div>
      <header class="policy-reader-heading">
        <p class="eyebrow">Rosewood College policy</p>
        <h2 id="policy-reader-title" tabindex="-1">${esc(policy.title)}</h2>
        <p>Read the approved policy below. Reviewing a policy does not accept it or submit your application.</p>
      </header>
      <div class="policy-reader-utilities">
        ${policyContents(policy)}
        <div class="policy-original-actions" aria-label="Original ${esc(policy.title)} document">
          <a class="button button-secondary" href="${esc(policy.sourcePdf)}">View original layout (PDF)</a>
          <a class="button button-quiet" href="${esc(policy.sourceFile)}" download>Download original Word document</a>
        </div>
      </div>
      <div class="policy-document" data-policy-document>${policy.html}</div>
      <footer class="policy-reader-footer"><a class="button button-secondary" href="${esc(policyHref())}" data-policy-return><span aria-hidden="true">&#8592;</span> Return to application</a></footer>
    </article>`;
  }

  function communicationNotice() {
    return `<p class="communication-notice">By providing your email address and/or mobile phone number, you agree to receive messages of both a promotional and informational nature from Rosewood College. Message frequency varies. Message and data rates may apply. You can opt out of promotional communications at any time using the unsubscribe link in our emails and/or by replying STOP to our text messages.</p>`;
  }

  function renderGateway(kind) {
    const labels = { application: "begin the formal application", acceptance: "formally accept the offered place", decline: "formally decline the offered place" };
    if (kind === "application") {
      const invitationNotice = liveWorkflow() && !invitationToken ? notice("Private invitation required", "Open the unique Application for Enrolment link sent by Rosewood College. A general link cannot start an application.", "legal-note") : "";
      return intro("Welcome to your enrolment application", "Dear Parent/Guardian,", workflows[kind].label) +
        invitationNotice + `<div class="gateway-welcome-copy"><p>Please enter the email address that received your invitation to begin applying for your child's admission to Rosewood College.</p><p>If you have previously submitted an Expression of Interest or provided information to Rosewood College, please use the same email address. We may use the information already provided to prepopulate parts of your application.</p><p>If this is your first contact with Rosewood College, entering the email address that received the invitation will create a new application for you.</p><p class="gateway-policy-note">If you would like more information, Rosewood College's enrolment and privacy policies are available here:</p>${welcomePolicyLinks()}<p>Supporting documents will be requested later in the application. You can save your progress and return if you need time to obtain them.</p><p>Information provided through this application will be managed in accordance with the Privacy Policy.</p></div>` +
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
      const statusLabel = status => ({ invited: "Not Started", in_progress: "In Progress", pending_signatures: "Awaiting Parent/Guardian Signature", staff_review_required: "Staff Review Required", submitted: "Completed" })[status] || status;
      const cards = applications.map(record => {
        const statusClass = record.status === "submitted" ? " is-complete" : record.status === "pending_signatures" ? " is-pending" : "";
        const action = record.editable
          ? `<button type="button" class="button button-primary" data-select-application="${esc(record.applicationId)}">Continue</button>`
          : ["pending_signatures", "staff_review_required", "submitted"].includes(record.status) ? `<button type="button" class="button button-secondary" data-view-application-status="${esc(record.applicationId)}">View status</button>` : "Unavailable";
        const initial = String(record.studentName || "S").trim().charAt(0).toUpperCase();
        const eoiNote = record.sourceEoiId ? '<p class="child-application-eoi-note">Information from your Expression of Interest has been included.</p>' : "";
        return `<article class="child-application-card"><div class="child-application-icon" aria-hidden="true">${esc(initial)}</div><div class="child-application-main"><h4>${esc(record.studentName)}</h4>${eoiNote}<dl><div><dt>Status</dt><dd><span class="status-pill${statusClass}">${esc(statusLabel(record.status))}</span></dd></div></dl></div><div class="child-application-action">${action}</div></article>`;
      }).join("");
      const records = applications.length ? section("Child applications", `<div class="child-application-list">${cards}</div>`) : "";
      const startCopy = applications.length ? "Add another child" : "Enter the first child";
      return intro("Choose a child application", linked ? "Information from an Expression of Interest has been included for one or more children below. Continue an existing application or start a separate application for another child." : "Add each child who will apply to Rosewood College. Each child has a separate application record.", workflows[kind].label) +
        section("Invited parent or guardian", `<div class="review-card"><dl>${family.parentGuardianName ? `<dt>Name</dt><dd>${esc(family.parentGuardianName)}</dd>` : ""}<dt>Email</dt><dd>${esc(family.recipientEmail || state.values.application_gateway_email)}</dd></dl></div>`) + records +
        section(startCopy, `<p>${applications.length ? "Use this only for another child. Their medical details, documents, progress and signatures will remain separate from the applications above." : "Enter the child’s name to create their Application for Enrolment."}</p><div class="field-grid two">${field("application_new_first", "Student First Name", { required: true })}${field("application_new_last", "Student Last Name", { required: true })}</div>`) + actions({ label: applications.length ? "Start another application" : "Start application", back: false, left: '<button type="button" class="button button-secondary" data-action="sign-out">Sign out</button>' });
    }
    if (kind === "application") {
      const previewCards = [
        { initial: "A", name: "Avery Example", eoiLinked: true, status: "In Progress", action: '<button type="button" class="button button-primary" data-action="next">Continue</button>' },
        { initial: "J", name: "Jordan Example", eoiLinked: false, status: "Completed", complete: true, action: '<button type="button" class="button button-secondary" data-static>View status</button>' }
      ].map(record => `<article class="child-application-card"><div class="child-application-icon" aria-hidden="true">${record.initial}</div><div class="child-application-main"><h4>${record.name}</h4>${record.eoiLinked ? '<p class="child-application-eoi-note">Information from your Expression of Interest has been included.</p>' : ""}<dl><div><dt>Status</dt><dd><span class="status-pill${record.complete ? " is-complete" : ""}">${record.status}</span></dd></div></dl></div><div class="child-application-action">${record.action}</div></article>`).join("");
      return intro("Choose a child application", "Your information was located. Continue an existing child application or start a separate application for another child.", workflows[kind].label) +
        section("Invited parent or guardian", '<div class="review-card"><dl><dt>Name</dt><dd>Alex Example</dd><dt>Email</dt><dd>family@example.test</dd></dl></div>') +
        section("Child applications", `<div class="child-application-list">${previewCards}</div>`) + newRecord;
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
    const guardianNote = kind === "appGuardian" ? `<p class="repeat-guidance">Before continuing, use <strong>+ Add Contact</strong> to enter any additional legal parents or guardians.</p>` : "";
    const buttonClass = kind === "appGuardian" ? "button button-primary add-contact-button" : "button button-secondary";
    const buttonLabel = kind === "appGuardian" ? "+ Add Contact" : `Add ${singular.toLowerCase()}`;
    return `<div class="repeat-list">${Array.from({ length: state.counts[kind] }, (_, index) => `<article class="repeat-card" data-repeat-kind="${kind}" data-repeat-index="${index}" tabindex="-1"><header><h4>${singular} ${index + 1}</h4>${index > 0 ? `<button type="button" class="button button-quiet" data-remove="${kind}">Remove</button>` : ""}</header><div class="field-grid">${renderer(index)}</div></article>`).join("")}</div><div class="repeat-controls">${guardianNote}<button type="button" class="${buttonClass}" data-add="${kind}">${buttonLabel}</button></div>`;
  }

  function renderApplicationStudent() {
    return intro("Student", "Provide the student, residence, family, background, support, sacramental and medical information requested in the application.", "Application for enrolment") +
      section("Student Details", `<div class="field-grid">${field("student_first", "First Name", { required: true, autocomplete: "given-name" })}${field("student_middle", "Middle Name", { autocomplete: "additional-name" })}${field("student_last", "Last Name", { required: true, autocomplete: "family-name" })}${field("student_preferred", "Preferred Name")}${field("student_dob", "Date of Birth", { type: "date", required: true })}${field("student_gender", "Gender", { type: "select", options: ["Male", "Female"], required: true })}${field("student_religion", "Religion", { type: "select", options: religions, required: true })}</div><div class="conditional-panel" data-conditional="other-religion"><div class="field-grid">${field("student_religion_other", "Other religion", { required: true, className: "span-three" })}</div></div><div class="field-grid student-enrolment-grid">${field("current_level", "Current School Year", { type: "select", options: currentLevels, required: true })}${field("entry_year", "Year the student will commence at Rosewood College", { type: "select", options: years, required: true, value: "2027" })}${field("entry_level", "Year Level of Entry at Rosewood College", { type: "select", options: primaryLevels, required: true })}${field("current_school", "Current Early Learning Centre / Kindergarten / Primary School", { type: "select", options: currentSchools, required: true, className: "span-three student-school-field" })}</div><div class="conditional-panel" data-conditional="other-current-school"><div class="field-grid">${field("current_school_other", "Other Early Learning Centre / Kindergarten / Primary School", { required: true, className: "span-three" })}</div></div>${choices("interrupted_schooling", "Interrupted schooling: Has the student experienced any extended absence or interruption to their schooling?", yesNo, { required: true })}<div class="conditional-panel" data-conditional="interrupted-schooling"><div class="field-grid">${field("interrupted_schooling_details", "Please provide approximate dates and brief details", { type: "textarea", required: true, className: "span-three" })}</div></div>`) +
      section("Student Primary Address", `${choices("student_address_share", "Share this address with other Parent/Guardian?", ["Yes, share", "No, keep private"], { required: true })}${addressLookup("student-address-search", { line: "student_address", suburb: "student_suburb", state: "student_state", postcode: "student_postcode", country: "student_country" }, "Find the student's address")}<div class="field-grid">${field("student_address", "Address", { required: true, className: "span-two", autocomplete: "off" })}${field("student_suburb", "Suburb", { required: true, autocomplete: "off" })}${field("student_state", "State", { required: true, autocomplete: "off" })}${field("student_postcode", "Postcode", { required: true, autocomplete: "off" })}${field("student_country", "Country", { required: true, list: "country-list", value: "Australia", autocomplete: "off", hint: "Start typing to search the full country catalogue." })}${field("care_arrangement", "Home Care Arrangement", { type: "select", options: ["Both Parents", "Mother Only", "Father Only", "Shared Custody", "Carer / Guardian", "Out-of-home care", "Kinship", "Other"], required: true, className: "span-two" })}</div><div class="conditional-panel" data-conditional="other-care-arrangement"><div class="field-grid">${field("care_other", "Other Care Arrangement", { required: true, className: "span-three" })}</div></div><div class="conditional-panel" data-conditional="shared-parenting"><div class="field-grid">${field("shared_parenting", "Shared Parenting Schedule", { type: "textarea", required: true, className: "span-three" })}</div></div>`) +
      section("Family", `${choices("future_siblings", "Do you have any other children that may attend our school?", yesNo, { required: true, className: "family-question" })}<div class="conditional-panel" data-conditional="future-siblings">${choices("future_sibling_count", "How many children?", ["1", "2", "3", "4", "5", "6", "7+"], { required: true })}</div>`) +
      section("Nationality and Citizenship", `<div class="government-context"><strong>Government Requirement</strong><p>The information in this section is about the student and is collected to meet government reporting requirements.</p></div><div class="field-grid country-catalogue-grid">${field("residence_country", "Student's current country of residence", { required: true, list: "country-list", hint: "Start typing to search the full country catalogue." })}${field("birth_country", "Student's country of birth", { required: true, list: "country-list", hint: "In which country was the student born? Start typing to search." })}${field("nationality", "Student's country of nationality", { required: true, list: "country-list", hint: "Start typing to search the full country catalogue." })}${field("ethnicity", "Student's ethnicity", { hint: "If not born in Australia" })}</div><div class="field-grid citizenship-date-row">${field("arrival_date", "When did the student arrive in or return to live in Australia?", { type: "date", className: "span-three mobile-safe-date", hint: "For students born overseas, enter the date they first arrived to live in Australia. If the student previously lived in Australia and later lived overseas, enter the date they most recently returned to live in Australia." })}${field("residency_status", "What is the residential status of the student?", { type: "select", options: ["Permanent", "Temporary"], required: true, className: "span-three" })}</div>${choices("australian_citizen", "Citizenship Status", yesNo, { required: true, intro: "Is the student an Australian citizen?", className: "citizenship-question" })}<div class="conditional-panel" data-conditional="residency-evidence">${choices("residency_evidence", "Evidence of Australian Residency", ["Permanent Resident", "Eligible for Australian Passport", "Temporary Resident", "Other / Visitor / Overseas Student"], { required: true, grid: true })}<div class="conditional-panel visa-panel" data-conditional="visa-details"><p class="visa-evidence-note">Please provide up to date evidence of visa status from the Department of Home Affairs, including any changes to visa or citizenship as soon as notified</p><div class="field-grid">${field("visa_subclass", "Visa subclass", { required: true })}${field("visa_expiry", "Visa expiry", { type: "date", required: true })}${field("previous_visa", "Previous visa subclass")}</div></div></div>${choices("indigenous_status", "Aboriginal / Torres Strait Islander Status", ["Aboriginal", "Torres Strait Islander", "Aboriginal and Torres Strait Islander", "Not Applicable"], { required: true })}<h5 class="content-subheading">Languages</h5><div class="field-grid two">${field("main_language", "Main Language", { list: "language-list", required: true, hint: "Start typing to search the language catalogue." })}${field("other_languages", "Other Languages", { list: "language-list", hint: "Start typing to search." })}</div>`) +
      section("General / Additional Needs", `<div class="needs-introduction"><p>To meet duty of care obligations and facilitate the smooth transition of your child into the school, please provide all required information. This will assist the school to implement appropriate adjustments and strategies to meet the particular needs of your child. If the information is not provided or is incomplete, incorrect or misleading, current or ongoing enrolment may be reviewed.</p><p class="needs-assurance"><strong>*Please Note:</strong> This information will not impact the offer of enrolment.</p></div>${choices("formal_assessment", "Has the student completed a formal assessment relating to learning, development, wellbeing or giftedness?", yesNo, { required: true })}<div class="conditional-panel" data-conditional="formal-assessment"><div class="field-grid">${field("formal_assessment_details", "Please provide brief details of the assessment", { type: "textarea", required: true, className: "span-three" })}</div>${choices("formal_assessment_report", "Is a report available?", yesNo, { required: true })}</div>${choices("additional_needs", "General / Additional Needs", yesNo, { required: true })}<div data-conditional="additional-needs">${choices("need_categories", "Please Specify", needCategories, { multiple: true, grid: true, required: true })}<div data-conditional="other-need" class="field-grid">${field("need_other", "Other Additional Need", { required: true, className: "span-three" })}</div><div class="field-grid">${field("current_adjustments", "What adjustments or support is currently provided for the student?", { type: "textarea", className: "span-three" })}${field("rosewood_adjustments", "What adjustments or support may assist the student at Rosewood College?", { type: "textarea", className: "span-three" })}</div></div>${choices("professional_categories", "Health Professionals", professionalCategories, { multiple: true, grid: true })}<div data-conditional="other-professional" class="field-grid">${field("professional_other", "Other Health Professional", { required: true })}</div>${choices("reports_attached", "Reports Attached", yesNo, { required: true })}${choices("ndis_support", "NDIS Support", yesNo, { required: true })}${choices("court_orders", "Court or Parenting Orders", yesNo, { required: true })}<div class="field-grid">${field("other_relevant_information", "Other Relevant Information", { type: "textarea", className: "span-three" })}</div>`) +
      section("Sacraments", `<div class="field-grid">${field("parish", "Parish where student lives", { className: "span-three" })}</div>${["Baptism", "Reconciliation", "Eucharist", "Confirmation"].map(item => `${check(`sacrament_${item}`, item)}<div class="conditional-panel" data-sacrament="sacrament_${item}"><div class="field-grid two">${field(`sacrament_${item}_date`, `${item} Date`, { type: "date", max: melbourneDate() })}${field(`sacrament_${item}_location`, `${item} Location`)}</div></div>`).join("")}`) +
      section("Medical Details", `${choices("medical_conditions", "Medical Conditions", medicalConditions, { multiple: true, grid: true, required: true })}<div data-conditional="other-medical" class="field-grid">${field("other_medical_condition", "Other medical condition", { required: true, className: "span-three" })}</div><div class="field-grid">${field("condition_details", "Condition Details", { type: "textarea", className: "span-two" })}${field("allergy_details", "Allergy Details", { type: "textarea" })}</div>${choices("anaphylaxis_risk", "Anaphylaxis Risk", yesNo, { required: true })}${choices("anaphylaxis_device", "EpiPen / Anapen", ["EpiPen", "Anapen"], { multiple: true, max: 1, hint: "Optional. Select the active option again to clear it." })}<div class="immunisation-guidance"><p>Vaccinations are recorded on the Australian Immunisation Register (AIR). <a href="https://www.health.vic.gov.au/immunisation/primary-school-immunisation-requirements" target="_blank" rel="noopener noreferrer">Victorian law<span class="visually-hidden"> (opens in a new tab)</span></a> requires an Immunisation History Statement for primary school enrolment. You can obtain it through myGov and upload it later in this application.</p></div>${choices("immunisation", "Is Immunisation History Statement held and will be uploaded with this application?", yesNo, { required: true })}${choices("humanitarian_health", "If the student entered Australia on a humanitarian visa, did they receive a refugee health check?", yesNo)}<div class="field-grid">${field("doctor_name", "Doctor Name", { required: true })}${field("doctor_address", "Doctor's practice/Address", { required: true, className: "span-two" })}${field("doctor_phone", "Doctor Phone", { type: "tel", required: true })}${field("medicare_number", "Medicare Number", { required: true })}${field("medicare_reference", "Medicare Ref Number", { required: true })}${field("medicare_expiry", "Medicare Expiry", { type: "date" })}${field("private_insurance_provider", "Private health insurance provider")}${field("private_insurance_policy", "Private health insurance policy number")}</div>${choices("ambulance_cover", "Ambulance Cover", yesNo, { required: true })}${choices("healthcare_card", "Health Care Card", yesNo, { required: true })}<div class="conditional-panel" data-student-healthcare="healthcare_card"><div class="field-grid two">${field("student_healthcare_number", "Health Care Card No.", { required: true })}${field("student_healthcare_expiry", "Health Care Card Expiry", { type: "date", required: true })}</div></div>`) + actions();
  }

  function applicationGuardianFields(index) {
    const prefix = `app_guardian_${index}_`;
    const permission = state.values[prefix + "permission"];
    const emailRequired = index === 0 || permission === CONTACT_PERMISSION_YES;
    return choices(prefix + "share", "Share your contact details with other parents or guardians on this application?", ["Yes, share them", "No, keep them private"], { required: true, className: "span-three" }) +
      field(prefix + "title", "Title", { type: "select", options: titles, required: true }) + field(prefix + "first", "Given Name", { required: true }) + field(prefix + "last", "Surname", { required: true }) +
      field(prefix + "email", "Email", { type: "email", required: emailRequired, hint: index > 0 && permission === CONTACT_PERMISSION_NO ? "Stored with the application if provided. Rosewood College will not use it for automated contact or signing requests." : "" }) + field(prefix + "mobile", "Mobile Phone", { type: "tel", required: true }) + field(prefix + "home", "Home Phone", { type: "tel" }) + field(prefix + "work", "Work Phone", { type: "tel" }) +
      field(prefix + "relationship", "Relationship", { type: "select", options: relationships, required: true }) + field(prefix + "contact_type", "Contact Type", { type: "select", options: ["Primary", "Secondary"], required: true }) +
      field(prefix + "marital", "Marital Status", { type: "select", options: ["Married", "De-Facto", "Divorced", "Single", "Separated", "Widowed", "Engaged", "Other"], required: true }) + field(prefix + "religion", "Religion", { type: "select", options: religions, required: true }) +
      choices(prefix + "sms", "SMS Messaging", yesNo, { required: true, className: "span-three", hint: "Is this person to receive SMS messaging (for emergency and reminder purposes)." }) + choices(prefix + "healthcare", "Health Care Card", yesNo, { required: true, className: "span-three" }) +
      `<div class="conditional-panel span-three" data-healthcare="${prefix}healthcare"><div class="field-grid two">${field(prefix + "healthcare_number", "Health Care Card No.", { required: true })}${field(prefix + "healthcare_expiry", "Health Care Card Expiry", { type: "date", required: true })}</div></div>` +
      `<h5 class="subsection-heading span-three">Residential and postal address</h5>` +
      addressLookup(`${prefix}residential-search`, { line: prefix + "address", suburb: prefix + "suburb", state: prefix + "state", postcode: prefix + "postcode", country: prefix + "country" }, `Find Contact ${index + 1}'s residential address`) +
      field(prefix + "address", "Residential Address", { required: true, className: "span-two", autocomplete: "off" }) + field(prefix + "suburb", "Suburb", { required: true, autocomplete: "off" }) + field(prefix + "state", "State", { required: true, autocomplete: "off" }) + field(prefix + "postcode", "Postcode", { required: true, autocomplete: "off" }) + field(prefix + "country", "Country", { required: true, list: "country-list", value: "Australia", autocomplete: "off", hint: "Start typing to search." }) + choices(prefix + "postal_same", "Postal Address Same as Residential?", yesNo, { required: true, className: "span-three" }) +
      `<div class="conditional-panel span-three" data-postal="${prefix}postal_same"><div class="field-grid">${addressLookup(`${prefix}postal-search`, { line: prefix + "postal_address", suburb: prefix + "postal_suburb", state: prefix + "postal_state", postcode: prefix + "postal_postcode", country: prefix + "postal_country" }, `Find Contact ${index + 1}'s postal address`)}${field(prefix + "postal_address", "Postal Address", { required: true, className: "span-two", autocomplete: "off" })}${field(prefix + "postal_suburb", "Postal Suburb", { required: true, autocomplete: "off" })}${field(prefix + "postal_state", "Postal State", { required: true, autocomplete: "off" })}${field(prefix + "postal_postcode", "Postal Postcode", { required: true, autocomplete: "off" })}${field(prefix + "postal_country", "Postal Country", { required: true, list: "country-list", autocomplete: "off" })}</div></div>` +
      `<h5 class="subsection-heading span-three">Occupation and education</h5>` +
      field(prefix + "occupation_group", "Occupational Group", { type: "select", options: occupationGroups, required: true, className: "span-two", hint: "Please refer to the ACARA Parent Occupation Groups guide to help select the appropriate occupational group." }) + field(prefix + "occupation", "Occupation", { type: "select", options: occupations, required: true }) + field(prefix + "employer", "Employer") +
      field(prefix + "school_education", "School Level Education", { type: "select", options: ["Year 12", "Year 11", "Year 10", "Year 9 or below"], required: true }) + field(prefix + "further_education", "University / Further Education", { type: "select", options: ["Bachelor degree or above", "Advanced Diploma / Diploma", "Certificate I-IV", "No post-school qualification"], required: true }) +
      `<h5 class="subsection-heading span-three">Residency</h5>` +
      field(prefix + "birth_country", "Country of Birth", { list: "country-list", required: true, hint: "Start typing to search." }) + field(prefix + "nationality", "Nationality", { list: "country-list", required: true, hint: "Start typing to search." }) + field(prefix + "ethnicity", "Ethnicity") + field(prefix + "languages", "Record all languages spoken", { list: "language-list", required: true, hint: "Start typing to search; separate multiple languages with commas." }) +
      field(prefix + "residency", "Residency Status", { type: "select", options: ["Citizen", "Permanent Resident", "Temporary Resident"], required: true }) + `<div class="conditional-panel span-three" data-guardian-visa="${prefix}residency"><p class="visa-evidence-note">Please provide up to date evidence of visa status from the Department of Home Affairs, including any changes to visa or citizenship as soon as notified</p><div class="field-grid two">${field(prefix + "visa_subclass", "Visa Subclass", { required: true })}${field(prefix + "visa_expiry", "Visa Expiry", { type: "date", required: true })}</div></div>` +
      choices(prefix + "indigenous", "Aboriginal / Torres Strait Islander", ["Aboriginal", "Torres Strait Islander", "Aboriginal and Torres Strait Islander", "Not Applicable"], { required: true, className: "span-three" }) +
      (index > 0 ? choices(prefix + "permission", "Can the school contact this person?", [CONTACT_PERMISSION_YES, CONTACT_PERMISSION_NO], { required: true, className: "span-three" }) + `<div class="contact-permission-notice span-three" data-contact-permission-notice="${prefix}permission" role="status"><strong>Do not contact</strong><p>Please note: This person will not receive messages or a separate signature request. If their signature is required, Rosewood College will contact you to discuss the next steps.</p></div>` : "");
  }

  function renderApplicationGuardians() {
    const emergency = index => field(`emergency_${index}_first`, "First Name", { required: true }) + field(`emergency_${index}_last`, "Last Name", { required: true }) + field(`emergency_${index}_relationship`, "Relationship", { type: "select", options: emergencyRelationships, required: true }) + field(`emergency_${index}_mobile`, "Mobile Phone", { type: "tel", required: true }) + field(`emergency_${index}_home`, "Home Phone", { type: "tel" }) + field(`emergency_${index}_work`, "Work Phone", { type: "tel" }) + field(`emergency_${index}_email`, "Email", { type: "email" });
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
    const note = liveWorkflow() ? notice("Save and return", "If you do not have every optional document now, upload the documents available and use Save and continue later at the end of this page.") : notice("Frontend review", "Files remain on your device in this review frame.");
    return intro("Documents", "Upload the supporting documents available for this application.", "Application for enrolment") + note +
      `<div class="document-list">${applicationDocuments.map((document, index) => { const existing = uploaded.filter(item => item.category === document[3]); const alreadyUploaded = existing.length > 0; return `<article class="document-card" data-document-category="${document[3]}"><header><div><h4>${document[0]}${document[2] ? ' <span class="required">*</span>' : ""}</h4><p>${document[1]}</p>${alreadyUploaded ? `<p class="uploaded-document">Uploaded: ${existing.map(item => esc(item.fileName)).join(", ")}</p>` : ""}</div><span class="document-badge" data-document-badge>${alreadyUploaded ? "Uploaded" : document[2] ? "1 file required" : "Optional"}</span></header>${field(`application_document_${index}`, `Choose ${document[0]}`, { type: "file", required: document[2] && !alreadyUploaded, multiple: true, accept, hint: "Multiple files accepted, maximum 10 MB each. Upload begins as soon as you choose a file." })}<div class="upload-list" data-upload-list="${document[3]}" aria-live="polite">${documentUploadRows(document[3])}</div><p class="upload-card-error" data-upload-error="${document[3]}" role="alert" hidden></p></article>`; }).join("")}</div>` + actions();
  }

  function termsHeadings(count) {
    return `<ol class="terms-heading-list">${agreementHeadings.slice(0, count).map(heading => `<li><strong>${heading}</strong></li>`).join("")}</ol>`;
  }

  function renderApplicationConditions() {
    const list = items => `<ul class="agreement-list">${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
    return intro("Conditions", "Review the three Parent / Carer Agreement sections and confirm each one before continuing.", "Application for enrolment") +
      section("Student commitments", `<p class="agreement-lead">I/We agree that if my/our child is enrolled at Rosewood College he/she should:</p>${list(hhcStudentCommitments)}${check("application_student_agreement", "I / We agree to the student commitments above.", { required: true })}`) +
      section("Parent / Carer commitments", `<p class="agreement-lead">If my/our child is enrolled at Rosewood College, I/we agree to:</p>${list(hhcParentCommitments)}${check("application_parent_agreement", "I / We agree to the parent / carer commitments above.", { required: true })}`) +
      section("Acknowledgement", `${check("application_agreement_acknowledgement", "I/We acknowledge having read the particulars contained in this enrolment form and understand my/our obligations to support Rosewood College in all areas of my/our child's education.", { required: true })}`) +
      section("Student and family survey", `<p class="section-copy">These questions are optional.</p><div class="field-grid survey-grid">${field("application_special_aptitudes", "In which subjects does your child have special aptitude?", { type: "textarea" })}${field("application_preferred_subjects", "What are your child's preferred school subjects?", { type: "textarea" })}${field("application_subjects_needing_help", "In which subjects may your child be in need of special help?", { type: "textarea" })}${field("application_hobbies_cultural_pursuits", "What are your child's main hobbies or cultural pursuits (apart from sporting interests)?", { type: "textarea" })}${choices("application_sport_participation", "Does your child participate in any sports organised through the school or independent of the school?", yesNo, { className: "span-three" })}${choices("application_extracurricular_activities", "Does your child attend any extra-curricular school activity, for example, debating, Scouts or Girl Guides, youth groups etc?", yesNo, { className: "span-three" })}${choices("application_local_library", "Does your child belong to a local library?", yesNo, { className: "span-three" })}${field("application_school_attractions", "What attracts you most to the school?", { type: "textarea" })}${field("application_desired_personal_qualities", "What personal qualities would you most like to see developed in your child at the school?", { type: "textarea" })}${field("application_mentoring_value", "What value do you think the mentoring system would have for you as parents?", { type: "textarea" })}${field("application_intended_years", "How many years do you intend your child to study at our school?", { type: "number", min: 1, max: 13 })}</div>`) + actions();
  }

  function signaturePanel(prefix, declaration, options = {}) {
    const isChecked = name => Array.isArray(state.values[name]) ? state.values[name].length > 0 : Boolean(state.values[name]);
    const fixedDate = options.fixedDate ? melbourneDate() : "";
    return `<article class="signature-card"><h4>${options.title || "Parent / Guardian"}</h4><label class="declaration"><input type="checkbox" name="${prefix}_ip" required${isChecked(`${prefix}_ip`) ? " checked" : ""}><span>I acknowledge and agree that, at the time of signing this form, my IP address will be recorded and stored by the School for administrative, security and legal compliance purposes. <span class="required">*</span></span></label><p class="validation-message" data-validation-for="${prefix}_ip" hidden>You must acknowledge the IP address recording to continue</p><label class="declaration"><input type="checkbox" name="${prefix}_terms" required${isChecked(`${prefix}_terms`) ? " checked" : ""}><span>${declaration} <span class="required">*</span></span></label><p class="validation-message" data-validation-for="${prefix}_terms" hidden>You must agree to the terms to continue</p><div class="signature-wrap is-locked" data-signature="${prefix}" data-auto-date="${options.autoDate ? "true" : "false"}"><canvas width="960" height="190" tabindex="0" aria-label="Signature area. Use a pointer to sign or press Enter to add a review signature."></canvas><div class="signature-overlay">Please agree to the terms above to enable signing</div></div><p class="signature-recording-note">Your drawing is kept in this browser while you review the form. It is securely recorded only when you submit.</p><button type="button" class="button button-secondary" data-clear-signature="${prefix}" disabled>Clear Signature</button><div class="field-grid two signature-date-grid">${field(`${prefix}_date`, "Date", { type: "date", required: true, readonly: options.autoDate || options.fixedDate, value: fixedDate, hint: options.fixedDate ? "Set securely to the date this application is submitted." : "" })}</div></article>`;
  }

  function renderApplicationSignature() {
    const additional = Array.from({ length: Math.max(0, state.counts.appGuardian - 1) }, (_, offset) => {
      const index = offset + 1;
      const prefix = `app_guardian_${index}_`;
      return { index, name: [state.values[prefix + "first"], state.values[prefix + "last"]].filter(Boolean).join(" ") || `Parent / Guardian ${String.fromCharCode(65 + index)}`, email: state.values[prefix + "email"] || "Email not provided", permitted: state.values[prefix + "permission"] === CONTACT_PERMISSION_YES };
    });
    const permitted = additional.filter(item => item.permitted);
    const suppressed = additional.filter(item => !item.permitted);
    const cards = additional.map(item => `<article class="review-card signature-routing-card ${item.permitted ? "is-permitted" : "is-suppressed"}"><h4>${esc(item.name)}</h4><dl><dt>Contact permission</dt><dd>${item.permitted ? "Contact permitted" : "Do not contact"}</dd><dt>Email</dt><dd>${esc(item.email)}</dd><dt>Signature</dt><dd>${item.permitted ? "Separate signature request required" : "Signature request suppressed"}</dd>${item.permitted ? "" : "<dt>Application review</dt><dd>Staff review required</dd>"}</dl><p>${item.permitted ? "This person will receive a separate email requesting their signature after this application is submitted." : `Both parents or guardians are normally requested to sign. You have asked us not to contact ${esc(item.name)}, so no signature request will be sent to them. Please explain why only one signature is being provided. Rosewood College will contact you if further information or consent is required.`}</p></article>`).join("");
    const needsExplanation = state.counts.appGuardian === 1 || suppressed.length > 0;
    const reasonHint = state.counts.appGuardian === 1 ? "Only one parent/guardian has been included in this application. Enter the reason above or call the College to discuss." : "Only one signature is being provided for the parent or guardian marked Do not contact. Enter the reason above or call the College to discuss.";
    const explanation = `<div class="guardian-signature-followup">${cards}${permitted.length ? check("application_additional_signature_later", "I understand that each parent or guardian marked Contact permitted will receive a separate signature request after I submit this application.", { required: true }) : ""}${needsExplanation ? `<div class="field-grid">${field("application_one_signature_reason", "Explanation for only one signature", { type: "textarea", required: true, className: "span-three", hint: reasonHint })}</div>` : ""}</div>`;
    return intro("Signature", "Completing, signing and lodging this application is required for consideration but does not guarantee enrolment. Enrolment is formalised only after an offer and Enrolment Agreement.", "Application for enrolment") +
      section("Signature of Parents / Guardians", `<p class="signature-disclaimer"><strong>Disclaimer:</strong> Personal information will be held, used and disclosed in accordance with the College Privacy Collection Notice and Privacy Policy.</p>${signaturePanel("application_signature", "I declare that I have read, understood and given consent to all matters contained in this application.", { title: "Parent / Guardian: Primary Contact", fixedDate: true })}${explanation}<div class="field-grid">${field("application_additional_information", "Additional Information", { type: "textarea", className: "span-three" })}</div>`) + actions({ label: liveWorkflow() ? "Submit application" : "Submit application preview" });
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
    const reviewSuppressed = state.values.app_guardian_1_permission === CONTACT_PERMISSION_NO;
    const reviewGuardianName = [state.values.app_guardian_1_first, state.values.app_guardian_1_last].filter(Boolean).join(" ") || "Parent / Guardian B";
    const reviewContext = application && !liveWorkflow() ? {
      reference: "APP-REVIEW",
      status: reviewSuppressed ? "staff_review_required" : "pending_signatures",
      requiresStaffReview: reviewSuppressed,
      signers: [
        { guardianId: "review-primary", name: "Primary Parent / Guardian", signatureStatus: "Complete" },
        { guardianId: "review-additional", name: reviewGuardianName, maskedEmail: "p***@example.test", contactPermission: reviewSuppressed ? "Do not contact" : "Contact permitted", signatureRequired: true, signatureStatus: reviewSuppressed ? "suppressed" : "pending", requestStatus: reviewSuppressed ? "Signature request suppressed" : "Sent", requestSent: !reviewSuppressed, requestSentAt: reviewSuppressed ? "" : new Date().toISOString(), openedAt: "", emailVerifiedAt: "", canCorrectEmail: !reviewSuppressed, canResend: !reviewSuppressed }
      ]
    } : null;
    if (application && (state.statusContext || reviewContext)) {
      const context = state.statusContext || reviewContext;
      const labels = { pending_signatures: "Awaiting parent/guardian signature", staff_review_required: "Staff review required", submitted: "Complete" };
      const signerCards = (context.signers || []).map((signer, index) => {
        const complete = signer.signatureStatus === "Complete";
        const actionAttributes = liveWorkflow() ? `data-guardian-id="${esc(signer.guardianId)}"` : "data-static";
        const actions = !complete && signer.canCorrectEmail ? `<div class="status-signer-actions"><button type="button" class="button button-secondary" data-action="correct-signer-email" ${actionAttributes}>Correct email address</button><button type="button" class="button button-quiet" data-action="resend-signature" ${actionAttributes}>Resend signature request</button></div>` : "";
        return `<article class="status-signer ${complete ? "is-complete" : signer.contactPermission === "Do not contact" ? "is-suppressed" : "is-pending"}"><header><div><p class="eyebrow">${index === 0 ? "Submitting applicant" : "Required signer"}</p><h4>${esc(signer.name)}</h4></div><span class="status-pill${complete ? " is-complete" : " is-pending"}">${esc(complete ? "Complete" : signer.requestStatus)}</span></header>${complete ? "<p class=\"complete-only\">Complete</p>" : `<dl><dt>Email</dt><dd>${esc(signer.maskedEmail)}</dd><dt>Contact permission</dt><dd>${esc(signer.contactPermission)}</dd><dt>Signature required</dt><dd>${signer.signatureRequired ? "Yes" : "No"}</dd><dt>Request sent</dt><dd>${signer.requestSent ? `Yes${signer.requestSentAt ? `, ${esc(formatStatusDate(signer.requestSentAt))}` : ""}` : "No"}</dd><dt>Opened</dt><dd>${signer.openedAt ? formatStatusDate(signer.openedAt) : "Not yet"}</dd><dt>Email verified</dt><dd>${signer.emailVerifiedAt ? formatStatusDate(signer.emailVerifiedAt) : "Not yet"}</dd></dl>${actions}`}</article>`;
      }).join("");
      const liveActions = liveWorkflow() ? `<div class="step-actions"><div class="left">${state.familySessionToken ? '<button type="button" class="button button-secondary" data-action="family-selector">View or add another child</button>' : ""}</div><div class="right"><button type="button" class="button button-quiet" data-action="refresh-status">Refresh status</button></div></div>` : notice("Frontend review", "These status controls are displayed for review only. Nothing is sent, corrected or reopened.");
      return `<div class="application-status-page" aria-live="polite"><div class="success-card compact-success"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Application for enrolment</p><h3>Application submitted</h3><div class="status-card"><strong>Reference ${esc(context.reference)}</strong><p>Application status: ${esc(labels[context.status] || context.status)}</p></div></div>${context.requiresStaffReview ? notice("Staff review required", "Rosewood College will review the signature and consent information provided with this application.", "contact-permission-notice") : ""}<section class="signature-status-section" aria-labelledby="signature-progress-title"><h3 id="signature-progress-title">Signature progress</h3>${signerCards}</section>${liveWorkflow() ? renderCorrectionPanel() : ""}${liveActions}</div>`;
    }
    return `<div class="success-card"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">${application ? "Application for enrolment" : "Enrolment Agreement"}</p><h3>Current guardian step complete</h3><p>${application ? "The captured process completes the current guardian's application step and may request separate signatures from additional guardians." : "The captured process records the current guardian's acceptance and sends each additional guardian a separate signing request."}</p><div class="status-card"><strong>Nothing was submitted</strong><p>V6 has no backend. No record, invitation, email or legally effective signature was created.</p></div></div>`;
  }

  function formatStatusDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
  }

  function renderCorrectionPanel() {
    const correction = state.correction;
    if (!correction) return "";
    const signer = state.statusContext?.signers?.find(item => item.guardianId === correction.guardianId);
    const close = '<button type="button" class="button button-quiet" data-action="cancel-correction">Cancel</button>';
    if (correction.step === "otp") return `<section class="email-correction-panel" aria-labelledby="correction-title"><p class="eyebrow">Step-up verification</p><h3 id="correction-title">Verify your application email</h3><p>A six-digit code was sent to the email address you used to submit this application.</p><div class="field-grid two">${field("signature_correction_code", "Verification code", { required: true, maxlength: 6 })}</div><div class="inline-actions"><button type="button" class="button button-primary" data-action="verify-correction-code">Verify code</button>${close}</div></section>`;
    if (correction.step === "form") return `<section class="email-correction-panel" aria-labelledby="correction-title"><p class="eyebrow">Pending signer</p><h3 id="correction-title">Correct email address</h3><p class="correction-warning">Correcting this email will cancel the current signing link and send a new request to the corrected address. It will not reopen or create another application.</p><p>Current address: <strong>${esc(signer?.maskedEmail || "")}</strong></p><div class="field-grid two">${field("signature_corrected_email", "Corrected email address", { type: "email", required: true })}${field("signature_corrected_email_confirmation", "Enter corrected email again", { type: "email", required: true })}</div>${check("signature_correction_confirmed", "I understand that the current signing link will be cancelled and replaced.", { required: true })}<div class="inline-actions"><button type="button" class="button button-primary" data-action="confirm-email-correction">Confirm and send new request</button>${close}</div></section>`;
    return "";
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
  state.policySlug = policySlugFromLocation();

  function captureValues() {
    const data = new FormData(form);
    const checkboxNames = new Set([...form.querySelectorAll('input[type="checkbox"]')].map(input => input.name).filter(Boolean));
    form.querySelectorAll("input, select, textarea").forEach(control => {
      if (!control.name || control.type === "file" || control.type === "checkbox" || (control.type === "radio" && !control.checked)) return;
      state.values[control.name] = control.value;
    });
    checkboxNames.forEach(name => { state.values[name] = data.getAll(name); });
  }

  function navigatePolicy(slug) {
    captureValues();
    const nextSlug = policyDocuments[slug] ? slug : "";
    const url = new URL(location.href);
    url.searchParams.set("workflow", "application");
    if (nextSlug) url.searchParams.set("policy", nextSlug);
    else url.searchParams.delete("policy");
    url.hash = "";
    history.pushState({ policy: nextSlug }, "", `${url.pathname}${url.search}${url.hash}`);
    state.policySlug = nextSlug;
    render();
    window.requestAnimationFrame(() => {
      const heading = nextSlug ? document.querySelector("#policy-reader-title") : document.querySelector("#form-root .section-intro h3");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function updatePolicyReadingProgress() {
    const documentBody = root.querySelector("[data-policy-document]");
    const indicator = root.querySelector("[data-policy-progress]");
    if (!documentBody || !indicator) return;
    const bounds = documentBody.getBoundingClientRect();
    const documentTop = window.scrollY + bounds.top;
    const available = Math.max(1, documentBody.offsetHeight - window.innerHeight * 0.55);
    const progressValue = Math.min(1, Math.max(0, (window.scrollY - documentTop + 170) / available));
    indicator.style.transform = `scaleX(${progressValue})`;
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
    const applicationDraftOpen = !(liveWorkflow() && state.workflow === "application") || state.screen >= 3;
    save.hidden = !applicationDraftOpen;
    if (!applicationDraftOpen) return;
    save.classList.remove("is-saved", "is-dirty", "is-saving", "is-offline", "is-error", "is-expired");
    if (state.paused) {
      save.classList.add("is-saved");
      save.querySelector("strong").textContent = "Saved";
      save.querySelector("small").textContent = `Last saved ${state.lastSavedLabel || "just now"}`;
      return;
    }
    if (liveWorkflow()) {
      if (state.workflow === "eoi") {
        const submitted = Boolean(state.eoiResult);
        if (submitted) save.classList.add("is-saved");
        save.querySelector("strong").textContent = submitted ? "Submitted" : "Not submitted";
        save.querySelector("small").textContent = submitted ? "Your expression of interest was received" : "This one-page form is sent when you submit";
        return;
      }
      const activeUploads = [...documentUploads.values()].filter(upload => ["preparing", "uploading", "confirming"].includes(upload.status));
      const failedUploads = [...documentUploads.values()].filter(upload => upload.status === "error");
      if (activeUploads.length) {
        const average = Math.round(activeUploads.reduce((total, upload) => total + upload.progress, 0) / activeUploads.length);
        save.classList.add("is-saving");
        save.querySelector("strong").textContent = "Uploading";
        save.querySelector("small").textContent = `${activeUploads.length} file${activeUploads.length === 1 ? "" : "s"} in progress${average ? `, ${average}%` : ""}`;
        return;
      }
      if (failedUploads.length) {
        save.classList.add("is-error");
        save.querySelector("strong").textContent = "Upload failed";
        save.querySelector("small").textContent = "Review the file message below";
        return;
      }
      if (state.screen === 7 && state.signatures.application_signature && ["idle", "saved", "dirty"].includes(state.saveStatus)) {
        save.classList.add("is-saved");
        save.querySelector("strong").textContent = "Signature ready";
        save.querySelector("small").textContent = "Recorded only when you submit";
        return;
      }
      const statuses = {
        dirty: ["is-dirty", "In progress", "Saving after you pause"],
        saving: ["is-saving", "Saving", "Sending changes"],
        saved: ["is-saved", "Saved", `All changes saved ${state.lastSavedLabel || "just now"}`],
        offline: ["is-offline", "No connection", "Changes are waiting to be saved"],
        error: ["is-error", "Save failed", "Your latest changes are not saved"],
        expired: ["is-expired", "Session expired", "Saved progress is safe; sign in again"]
      };
      const status = statuses[state.saveStatus];
      if (status) {
        save.classList.add(status[0]);
        save.querySelector("strong").textContent = status[1];
        save.querySelector("small").textContent = status[2];
        return;
      }
      const verified = Boolean(state.sessionToken || state.familySessionToken);
      save.querySelector("strong").textContent = verified ? "Connected" : "Not connected";
      save.querySelector("small").textContent = verified ? "Choose a child to begin" : "Verify your invitation email to begin";
      return;
    }
    const isForm = screen.formStep != null && state.workflow !== "signing";
    save.querySelector("strong").textContent = "Frontend review";
    save.querySelector("small").textContent = isForm ? "Answers are simulated and not persisted" : "Not connected or saved";
  }

  function updateEnvironment() {
    const live = liveWorkflow();
    const ribbon = document.querySelector("#environment-ribbon");
    ribbon.hidden = live;
    document.body.classList.toggle("no-environment-ribbon", live);
    document.querySelector("#environment-label").textContent = "Frontend review";
    document.querySelector("#environment-copy").textContent = "Nothing entered in this review workflow is saved, uploaded, emailed or submitted.";
    document.querySelector("#footer-environment").textContent = live ? "Secure online form" : "Frontend review only";
  }

  function render() {
    clearInterval(resendTimer);
    const workflow = workflows[state.workflow];
    const policy = activePolicy();
    if (policy) {
      document.body.classList.add("policy-reader-open");
      document.title = `${policy.title} | Rosewood College Enrolment`;
      document.querySelector("#workflow-label").textContent = "Application for enrolment";
      document.querySelector("#step-title").textContent = policy.title;
      document.querySelector("#story-kicker").textContent = workflow.label;
      document.querySelector("#story-title").textContent = workflow.title;
      document.querySelector("#story-copy").textContent = workflow.copy;
      document.querySelector("#story-promise-copy").textContent = "Reviewing a policy does not accept it or submit the application.";
      updateEnvironment();
      document.querySelector("#save-state").hidden = true;
      progress.hidden = true;
      reviewTools.hidden = true;
      errorSummary.hidden = true;
      root.innerHTML = renderPolicyViewer(policy);
      window.requestAnimationFrame(updatePolicyReadingProgress);
      return;
    }
    document.body.classList.remove("policy-reader-open");
    document.title = "Enrolment | Rosewood College";
    state.screen = Math.max(0, Math.min(state.screen, workflow.screens.length - 1));
    const screen = workflow.screens[state.screen];
    document.querySelector("#workflow-label").textContent = workflow.label;
    document.querySelector("#step-title").textContent = screen.label;
    document.querySelector("#story-kicker").textContent = workflow.label;
    document.querySelector("#story-title").textContent = workflow.title;
    document.querySelector("#story-copy").textContent = workflow.copy;
    document.querySelector("#story-promise-copy").textContent = workflow.promise;
    updateEnvironment();
    if (state.paused) {
      document.querySelector("#step-title").textContent = "Progress saved";
      progress.hidden = true;
      reviewTools.hidden = true;
      errorSummary.hidden = true;
      const familyAction = state.familySessionToken ? '<button type="button" class="button button-secondary" data-action="return-to-family-selector">Return to child applications</button>' : "";
      root.innerHTML = `<div class="success-card"><div class="success-mark" aria-hidden="true">&#10003;</div><p class="eyebrow">Application for enrolment</p><h3>Your progress is saved</h3><p>You can close this tab safely. To continue later, open your private invitation link and verify the same email address.</p><div class="status-card"><strong>Last saved ${esc(state.lastSavedLabel || "just now")}</strong><p>Your completed answers remain attached to this child’s application.</p></div>${familyAction}</div>`;
      updateSaveState(screen);
      persistBrowserSession();
      return;
    }
    root.innerHTML = screen.render();
    errorSummary.hidden = true;
    renderProgress(screen);
    renderFrameSelector();
    updateSaveState(screen);
    updateConditionals();
    bindAddressAutocomplete();
    bindCanvas();
    showInlineServerValidation();
    const resendButton = root.querySelector("[data-resend-kind]");
    if (resendButton && state.otpResends[resendButton.dataset.resendKind]) startResendCountdown(resendButton.dataset.resendKind);
    const panel = document.querySelector(".form-panel");
    if (panel && state.screen > 0) panel.scrollIntoView({ block: "start" });
    persistBrowserSession();
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
    const careArrangement = root.querySelector('[name="care_arrangement"]')?.value || selected("care_arrangement");
    setConditional('[data-conditional="other-care-arrangement"]', careArrangement === "Other");
    setConditional('[data-conditional="shared-parenting"]', careArrangement === "Shared Custody");
    setConditional('[data-conditional="interrupted-schooling"]', selected("interrupted_schooling") === "Yes");
    setConditional('[data-conditional="future-siblings"]', selected("future_siblings") === "Yes");
    const citizenshipRequiresEvidence = selected("australian_citizen") === "No";
    const residencyEvidence = selected("residency_evidence");
    setConditional('[data-conditional="residency-evidence"]', citizenshipRequiresEvidence);
    setConditional('[data-conditional="visa-details"]', citizenshipRequiresEvidence && Boolean(residencyEvidence) && residencyEvidence !== "Eligible for Australian Passport");
    setConditional('[data-conditional="additional-needs"]', selected("additional_needs") === "Yes");
    setConditional('[data-conditional="formal-assessment"]', selected("formal_assessment") === "Yes");
    setConditional('[data-conditional="other-need"]', selectedMany("need_categories").includes("Other"));
    setConditional('[data-conditional="other-professional"]', selectedMany("professional_categories").includes("Other"));
    setConditional('[data-conditional="other-medical"]', selectedMany("medical_conditions").includes("Other"));
    root.querySelectorAll("[data-sacrament]").forEach(container => setConditional(`[data-sacrament="${container.dataset.sacrament}"]`, root.querySelector(`[name="${CSS.escape(container.dataset.sacrament)}"]`)?.checked));
    root.querySelectorAll("[data-postal]").forEach(container => setConditional(`[data-postal="${container.dataset.postal}"]`, selected(container.dataset.postal) === "No"));
    root.querySelectorAll("[data-healthcare]").forEach(container => setConditional(`[data-healthcare="${container.dataset.healthcare}"]`, selected(container.dataset.healthcare) === "Yes"));
    root.querySelectorAll("[data-student-healthcare]").forEach(container => setConditional(`[data-student-healthcare="${container.dataset.studentHealthcare}"]`, selected(container.dataset.studentHealthcare) === "Yes"));
    root.querySelectorAll("[data-contact-permission-notice]").forEach(container => {
      const permissionField = container.dataset.contactPermissionNotice;
      const prohibited = selected(permissionField) === CONTACT_PERMISSION_NO;
      container.hidden = !prohibited;
      const prefix = permissionField.replace(/permission$/, "");
      const email = root.querySelector(`[name="${CSS.escape(prefix + "email")}"]`);
      if (email) email.required = !prohibited;
    });
    root.querySelectorAll("[data-guardian-visa]").forEach(container => {
      const fieldName = container.dataset.guardianVisa;
      setConditional(`[data-guardian-visa="${fieldName}"]`, root.querySelector(`[name="${CSS.escape(fieldName)}"]`)?.value === "Temporary Resident");
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
      const prefix = container.dataset.signature;
      const savedSignature = state.signatures[prefix];
      if (typeof savedSignature === "string") {
        const image = new Image();
        image.addEventListener("load", () => context.drawImage(image, 0, 0, canvas.width, canvas.height));
        image.src = savedSignature;
      }
      let drawing = false;
      let drewInk = false;
      const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
      const record = finished => {
        state.signatures[prefix] = finished ? canvas.toDataURL("image/png") : state.signatures[prefix] || true;
        if (container.dataset.autoDate === "true") {
          const date = root.querySelector(`[name="${prefix}_date"]`);
          if (date) date.value = new Date().toISOString().slice(0, 10);
        }
        updateSignatureLocks();
        updateSaveState(workflows[state.workflow].screens[state.screen]);
      };
      canvas.addEventListener("pointerdown", event => { if (container.classList.contains("is-locked")) return; drawing = true; drewInk = false; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); });
      canvas.addEventListener("pointermove", event => { if (!drawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); drewInk = true; record(false); });
      canvas.addEventListener("pointerup", () => { if (drawing && drewInk) record(true); drawing = false; });
      canvas.addEventListener("pointercancel", () => { if (drawing && drewInk) record(true); drawing = false; });
      canvas.addEventListener("keydown", event => { if (event.key !== "Enter" || container.classList.contains("is-locked")) return; event.preventDefault(); context.beginPath(); context.moveTo(120, 120); context.bezierCurveTo(250, 15, 360, 170, 520, 70); context.stroke(); record(true); });
    });
  }

  function showInlineServerValidation({ focus = false } = {}) {
    root.querySelectorAll("[data-server-invalid]").forEach(element => {
      element.classList.remove("is-invalid");
      element.removeAttribute("data-server-invalid");
    });
    root.querySelectorAll(".server-validation-message").forEach(element => element.remove());
    const current = state.serverValidation.filter(item => item.screen === state.screen);
    let firstControl;
    current.forEach(item => {
      const control = root.querySelector(`[name="${CSS.escape(item.field)}"]`);
      const documentCard = item.field === "birth_certificate" ? root.querySelector('[data-document-category="birth_certificate"]') : null;
      const wrapper = control?.closest(".field, .question, .check-line, .declaration") || documentCard;
      if (!wrapper) return;
      wrapper.classList.add("is-invalid");
      wrapper.setAttribute("data-server-invalid", "");
      const message = document.createElement("p");
      message.className = "validation-message server-validation-message";
      message.setAttribute("role", "alert");
      message.textContent = item.message;
      wrapper.append(message);
      if (!firstControl) firstControl = control || wrapper;
    });
    if (focus && firstControl) {
      firstControl.scrollIntoView({ block: "center" });
      firstControl.focus?.({ preventScroll: true });
    }
  }

  function clearResolvedServerValidation(field) {
    const relevant = state.serverValidation.filter(item => item.field === field);
    if (!relevant.length) return;
    const resolved = item => {
      const controls = [...root.querySelectorAll(`[name="${CSS.escape(item.field)}"]`)];
      if (!controls.length) return false;
      if (item.code.endsWith(":three_required")) return controls.filter(control => control.checked).length === 3;
      if (item.code.endsWith(":invalid")) return controls[0].checkValidity();
      if (["checkbox", "radio"].includes(controls[0].type)) return controls.some(control => control.checked);
      return Boolean(controls[0].value.trim());
    };
    state.serverValidation = state.serverValidation.filter(item => item.field !== field || !resolved(item));
    showInlineServerValidation();
    if (!state.serverValidation.length) errorSummary.hidden = true;
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
    root.querySelectorAll('input[type="date"]').forEach(control => {
      if (control.disabled || control.closest("[hidden]") || !control.value || control.checkValidity()) return;
      markInvalid(control, messages, "Enter a valid date that is not in the future");
    });
    root.querySelectorAll("[data-required-group]").forEach(group => {
      if (group.closest("[hidden]") || group.querySelectorAll("input:not(:disabled)").length === 0) return;
      if (group.dataset.exact) return;
      if (!group.querySelector("input:checked")) { group.classList.add("is-invalid"); messages.push(`Select at least one option for ${group.querySelector("legend").textContent.replace("*", "").trim()}`); }
    });
    root.querySelectorAll("[data-max]").forEach(group => {
      const max = Number(group.dataset.max);
      if (group.querySelectorAll("input:checked").length > max) { group.classList.add("is-invalid"); messages.push(`Choose no more than ${max} options for ${group.querySelector("legend").textContent.replace("*", "").trim()}`); }
    });
    root.querySelectorAll("[data-exact]").forEach(group => {
      const exact = Number(group.dataset.exact);
      if (group.querySelectorAll("input:checked").length !== exact) { group.classList.add("is-invalid"); messages.push(`Choose exactly ${exact} options for ${group.querySelector("legend").textContent.replace("*", "").trim()}`); }
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
    const label = wrapper.querySelector("legend, .field > span, strong, span")?.textContent.replace("*", "").trim() || control.name;
    messages.push(override || `Complete ${label}`);
    const inline = root.querySelector(`[data-validation-for="${CSS.escape(control.name)}"]`);
    if (inline) inline.hidden = false;
  }

  function next() {
    captureValues();
    if (state.screen < workflows[state.workflow].screens.length - 1) state.screen += 1;
    render();
  }

  async function navigateToScreen(target) {
    captureValues();
    if (applicationDraftActive()) {
      try {
        await saveApplicationDraft(currentApplicationStage(), { mode: "navigation" });
      } catch (error) {
        state.screen = target;
        render();
        showServiceError(error);
        return;
      }
    }
    state.screen = target;
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

  function applicationDraftActive() {
    return liveWorkflow() && state.workflow === "application" && Boolean(state.sessionToken && state.applicationContext) && state.screen >= 3 && state.screen <= 7 && !state.paused;
  }

  function currentApplicationStage() {
    return workflows.application.screens[state.screen]?.label.toLowerCase().replaceAll(" ", "_") || "application";
  }

  function clearAutosaveTimers() {
    clearTimeout(autosaveTimer);
    clearTimeout(autosaveMaxTimer);
    autosaveTimer = undefined;
    autosaveMaxTimer = undefined;
  }

  function draftSnapshot({ values = state.values, screen = state.screen, guardianCount = state.counts.appGuardian, emergencyCount = state.counts.emergency } = {}) {
    return JSON.stringify({ values, screen, guardianCount, emergencyCount });
  }

  function scheduleAutosave(markChange = true) {
    if (!applicationDraftActive()) return;
    if (markChange) state.changeVersion += 1;
    state.saveStatus = navigator.onLine ? "dirty" : "offline";
    updateSaveState(workflows.application.screens[state.screen]);
    clearTimeout(autosaveTimer);
    if (!navigator.onLine) return;
    const run = () => {
      clearAutosaveTimers();
      saveApplicationDraft(currentApplicationStage(), { mode: "autosave" }).catch(() => {});
    };
    autosaveTimer = window.setTimeout(run, AUTOSAVE_DEBOUNCE_MS);
    if (!autosaveMaxTimer) autosaveMaxTimer = window.setTimeout(run, AUTOSAVE_MAX_WAIT_MS);
  }

  async function saveApplicationDraft(stage, { mode = "navigation", force = false } = {}) {
    if (!applicationDraftActive()) return state.applicationContext;
    clearAutosaveTimers();
    captureValues();
    const version = state.changeVersion;
    const payload = {
      values: JSON.parse(JSON.stringify(state.values)),
      screen: state.screen,
      guardianCount: state.counts.appGuardian,
      emergencyCount: state.counts.emergency
    };
    const snapshot = draftSnapshot(payload);
    if (!force && snapshot === state.lastSavedSnapshot) {
      state.saveStatus = "saved";
      updateSaveState(workflows.application.screens[state.screen]);
      return state.applicationContext;
    }
    const operation = saveQueue.catch(() => {}).then(async () => {
      if (!force && snapshot === state.lastSavedSnapshot) {
        state.saveStatus = version === state.changeVersion ? "saved" : navigator.onLine ? "dirty" : "offline";
        updateSaveState(workflows.application.screens[state.screen]);
        return state.applicationContext;
      }
      if (!navigator.onLine) {
        const error = new Error("Your device is offline. Reconnect before closing this form.");
        error.code = "NETWORK_OFFLINE";
        throw error;
      }
      state.saveStatus = "saving";
      updateSaveState(workflows.application.screens[state.screen]);
      try {
        const result = await api("/v6/application/draft", {
          method: "PUT",
          body: JSON.stringify({
            expectedRevision: state.revision,
            values: payload.values,
            screen: payload.screen,
            stage,
            guardianCount: payload.guardianCount,
            emergencyCount: payload.emergencyCount,
            percentComplete: Math.round((Math.max(0, payload.screen - 2) / 5) * 100),
            saveMode: mode,
            formVersion: state.formVersion,
            formDefinitionHash: state.formDefinitionHash
          })
        });
        state.revision = result.revision;
        state.applicationContext = { ...state.applicationContext, ...result };
        state.lastSavedSnapshot = snapshot;
        state.lastSavedLabel = new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
        state.saveStatus = version === state.changeVersion ? "saved" : navigator.onLine ? "dirty" : "offline";
        updateSaveState(workflows.application.screens[state.screen]);
        return result;
      } catch (error) {
        const expired = ["SESSION_EXPIRED", "SESSION_REQUIRED"].includes(error.code);
        if (expired) showSessionExpired(true);
        else {
          state.saveStatus = !navigator.onLine || ["NETWORK_ERROR", "NETWORK_OFFLINE"].includes(error.code) ? "offline" : "error";
          updateSaveState(workflows.application.screens[state.screen]);
        }
        throw error;
      }
    });
    saveQueue = operation;
    return operation;
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

  function documentUploadKey(category, file) {
    return `${category}:${file.name}:${file.size}:${file.lastModified}`;
  }

  function documentUploadLabel(upload) {
    const labels = {
      preparing: "Preparing file",
      uploading: `Uploading ${upload.progress}%`,
      confirming: "Securing file",
      uploaded: "Uploaded",
      error: "Upload failed"
    };
    return labels[upload.status] || "Waiting";
  }

  function documentUploadRows(category) {
    return [...documentUploads.values()].filter(upload => upload.category === category).map(upload => {
      const retry = upload.status === "error" ? `<button type="button" class="button button-quiet upload-retry" data-retry-upload="${esc(upload.key)}">Retry</button>` : "";
      return `<div class="upload-item is-${upload.status}" data-upload-item="${esc(upload.key)}"><div class="upload-item-heading"><span class="upload-file-name">${esc(upload.file.name)}</span><strong>${documentUploadLabel(upload)}</strong></div><progress max="100" value="${upload.progress}">${upload.progress}%</progress>${retry}</div>`;
    }).join("");
  }

  function renderDocumentUploadState(category) {
    const card = root.querySelector(`[data-document-category="${CSS.escape(category)}"]`);
    if (!card) return;
    const uploads = [...documentUploads.values()].filter(upload => upload.category === category);
    const failed = uploads.find(upload => upload.status === "error");
    const list = card.querySelector(`[data-upload-list="${CSS.escape(category)}"]`);
    const message = card.querySelector(`[data-upload-error="${CSS.escape(category)}"]`);
    if (list) list.innerHTML = documentUploadRows(category);
    card.classList.toggle("has-upload-error", Boolean(failed));
    card.classList.toggle("has-upload-active", uploads.some(upload => ["preparing", "uploading", "confirming"].includes(upload.status)));
    if (message) {
      message.hidden = !failed;
      message.textContent = failed?.error || "";
    }
    if (uploads.some(upload => upload.status === "uploaded")) {
      const badge = card.querySelector("[data-document-badge]");
      if (badge) badge.textContent = "Uploaded";
    }
    updateSaveState(workflows.application.screens[state.screen]);
  }

  function setDocumentUploadState(upload, status, progress = upload.progress) {
    upload.status = status;
    upload.progress = Math.max(0, Math.min(100, Math.round(progress)));
    renderDocumentUploadState(upload.category);
  }

  function uploadWithProgress(upload, url, headers, file, onProgress) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", url);
      Object.entries(headers || {}).forEach(([name, value]) => request.setRequestHeader(name, value));
      request.timeout = 10 * 60 * 1000;
      request.upload.addEventListener("progress", event => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      });
      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) resolve();
        else {
          const error = new Error("The secure file service did not accept this upload. Please try again.");
          error.code = "UPLOAD_REJECTED";
          reject(error);
        }
      });
      request.addEventListener("error", () => {
        const error = new Error("The connection was interrupted while uploading this file. Check your connection and try again.");
        error.code = "NETWORK_ERROR";
        reject(error);
      });
      request.addEventListener("timeout", () => {
        const error = new Error("The file upload took too long. Please try again.");
        error.code = "UPLOAD_TIMEOUT";
        reject(error);
      });
      request.addEventListener("abort", () => {
        const error = new Error("The file upload was cancelled.");
        error.code = "UPLOAD_ABORTED";
        reject(error);
      });
      upload.request = request;
      request.send(file);
    });
  }

  function uploadErrorMessage(error, file) {
    if (error.code === "INVALID_DOCUMENT") return error.message;
    if (["SESSION_EXPIRED", "SESSION_REQUIRED"].includes(error.code)) return "Your session expired before this file finished. Sign in again to continue.";
    if (error.code === "UPLOAD_ABORTED") return "This upload was cancelled. Select Retry to upload it again.";
    return `${file.name} was not uploaded. ${error.message || "Please check the file and try again."}`;
  }

  function startDocumentUpload(upload) {
    if (upload.promise) return upload.promise;
    upload.error = "";
    setDocumentUploadState(upload, "preparing", 1);
    const operation = (async () => {
      const mimeType = mimeTypeFor(upload.file);
      if (!["application/pdf", "image/png", "image/jpeg"].includes(mimeType) || upload.file.size < 1 || upload.file.size > 10 * 1024 * 1024) {
        const error = new Error("Use a PDF, PNG or JPEG file no larger than 10 MB.");
        error.code = "INVALID_DOCUMENT";
        throw error;
      }
      const checksumSha256 = await sha256Base64(upload.file);
      const started = await api("/v6/application/documents/start", { method: "POST", body: JSON.stringify({ category: upload.category, fileName: upload.file.name, mimeType, size: upload.file.size, checksumSha256 }) });
      setDocumentUploadState(upload, "uploading", 3);
      await uploadWithProgress(upload, started.uploadUrl, started.uploadHeaders || { "Content-Type": mimeType }, upload.file, progressValue => setDocumentUploadState(upload, "uploading", Math.max(3, progressValue)));
      setDocumentUploadState(upload, "confirming", 100);
      const confirmed = await confirmDocumentAfterScan(upload.category, started.documentId);
      const document = { category: upload.category, documentId: confirmed.document.documentId, fileName: confirmed.document.fileName, size: confirmed.document.size };
      const documents = state.applicationContext.documents || [];
      state.applicationContext.documents = documents.some(item => item.documentId === document.documentId) ? documents : [...documents, document];
      upload.document = document;
      setDocumentUploadState(upload, "uploaded", 100);
      return document;
    })().catch(error => {
      upload.error = uploadErrorMessage(error, upload.file);
      setDocumentUploadState(upload, "error", upload.progress);
      if (["SESSION_EXPIRED", "SESSION_REQUIRED"].includes(error.code)) showSessionExpired(true);
      throw error;
    }).finally(() => {
      upload.promise = null;
      upload.request = null;
    });
    upload.promise = operation;
    operation.catch(() => {});
    return operation;
  }

  function startSelectedDocumentUploads(input) {
    if (!applicationDraftActive() || state.screen !== 5) return;
    const match = input.name.match(/^application_document_(\d+)$/);
    const category = match ? applicationDocuments[Number(match[1])]?.[3] : "";
    if (!category) return;
    for (const file of input.files || []) {
      const key = documentUploadKey(category, file);
      const existing = documentUploads.get(key);
      if (existing?.status === "uploaded" || existing?.promise) continue;
      const upload = existing || { key, category, file, status: "waiting", progress: 0, error: "", promise: null, request: null };
      documentUploads.set(key, upload);
      startDocumentUpload(upload);
    }
  }

  async function finishDocumentUploads() {
    root.querySelectorAll('input[type="file"][name^="application_document_"]').forEach(startSelectedDocumentUploads);
    const active = [...documentUploads.values()].map(upload => upload.promise).filter(Boolean);
    if (active.length) await Promise.allSettled(active);
    const failed = [...documentUploads.values()].filter(upload => upload.status === "error");
    if (failed.length) {
      renderDocumentUploadState(failed[0].category);
      const error = new Error(`${failed.length} selected file${failed.length === 1 ? " has" : "s have"} not uploaded. Review the message in the Documents section and select Retry.`);
      error.code = "DOCUMENT_UPLOAD_FAILED";
      throw error;
    }
  }

  function resetDocumentUploads() {
    documentUploads.forEach(upload => upload.request?.abort());
    documentUploads.clear();
  }

  function documentUploadsNeedAttention() {
    return [...documentUploads.values()].some(upload => ["preparing", "uploading", "confirming", "error"].includes(upload.status));
  }

  function applyApplicationSession(result) {
    resetDocumentUploads();
    state.serverValidation = [];
    applyFormContract(result.context);
    state.sessionToken = result.sessionToken;
    state.applicationContext = result.context;
    if (result.family) state.familyContext = result.family;
    state.revision = result.context.revision;
    state.values = { application_gateway_email: state.values.application_gateway_email, ...result.context.values };
    state.counts.appGuardian = result.context.guardianCount || 1;
    state.counts.emergency = result.context.emergencyCount || 2;
    state.lastSavedSnapshot = draftSnapshot({ values: state.values, screen: Number(result.context.screen || 2), guardianCount: state.counts.appGuardian, emergencyCount: state.counts.emergency });
    state.saveStatus = "saved";
    state.lastSavedLabel = result.context.updatedAt ? new Date(result.context.updatedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }) : "just now";
    beginSessionExpiry(result);
  }

  async function selectFamilyApplication(applicationId, button) {
    const previous = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Opening...';
    try {
      const result = await api("/v6/application/records/select", { method: "POST", authToken: state.familySessionToken, body: JSON.stringify({ applicationId }) });
      applyApplicationSession(result);
      state.screen = Math.max(3, Math.min(7, Number(result.context.screen || 3)));
      return render();
    } catch (error) {
      button.disabled = false;
      button.innerHTML = previous;
      showServiceError(error);
    }
  }

  async function selectApplicationStatus(applicationId, button) {
    const previous = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Opening...';
    try {
      const result = await api("/v6/application/status/select", { method: "POST", authToken: state.familySessionToken, body: JSON.stringify({ applicationId }) });
      state.statusSessionToken = result.sessionToken;
      state.statusContext = result.status;
      state.correction = null;
      state.screen = 8;
      beginSessionExpiry(result);
      render();
    } catch (error) {
      button.disabled = false;
      button.innerHTML = previous;
      showServiceError(error);
    }
  }

  async function refreshApplicationStatus() {
    if (!state.statusSessionToken) return;
    state.statusContext = await api("/v6/application/status", { method: "GET", authToken: state.statusSessionToken });
    render();
  }

  function idempotencyKey() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function resendPendingSignature(guardianId, button) {
    const previous = button.textContent;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Sending...';
    try {
      const result = await api("/v6/application/status/signatures/resend", { method: "POST", authToken: state.statusSessionToken, headers: { "Idempotency-Key": idempotencyKey() }, body: JSON.stringify({ guardianId }) });
      state.statusContext = result.status;
      render();
    } catch (error) {
      button.disabled = false;
      button.textContent = previous;
      showServiceError(error);
    }
  }

  async function beginEmailCorrection(guardianId) {
    try {
      const result = await api("/v6/application/status/signatures/correction/request-code", { method: "POST", authToken: state.statusSessionToken, body: JSON.stringify({ guardianId }) });
      state.correction = { guardianId, step: "otp", challengeId: result.challengeId, sessionToken: "" };
      render();
      root.querySelector('[name="signature_correction_code"]')?.focus();
    } catch (error) { showServiceError(error); }
  }

  async function verifyEmailCorrection() {
    captureValues();
    const code = String(state.values.signature_correction_code || "").trim();
    if (code.length !== 6) return showServiceError(new Error("Enter the six-digit verification code."));
    try {
      const result = await api("/v6/application/status/signatures/correction/verify-code", { method: "POST", authToken: state.statusSessionToken, body: JSON.stringify({ guardianId: state.correction.guardianId, challengeId: state.correction.challengeId, code }) });
      state.correction = { ...state.correction, step: "form", sessionToken: result.correctionSessionToken };
      render();
      root.querySelector('[name="signature_corrected_email"]')?.focus();
    } catch (error) { showServiceError(error); }
  }

  async function confirmEmailCorrection() {
    captureValues();
    const email = String(state.values.signature_corrected_email || "").trim();
    const emailConfirmation = String(state.values.signature_corrected_email_confirmation || "").trim();
    const confirmed = Array.isArray(state.values.signature_correction_confirmed) && state.values.signature_correction_confirmed.length > 0;
    if (!email || email !== emailConfirmation || !confirmed) return showServiceError(new Error("Enter the corrected email twice and confirm that the current link will be replaced."));
    try {
      const result = await api("/v6/application/status/signatures/correction/confirm", { method: "POST", authToken: state.correction.sessionToken, headers: { "Idempotency-Key": idempotencyKey() }, body: JSON.stringify({ email, emailConfirmation, confirmed }) });
      state.statusContext = result.status;
      state.correction = null;
      render();
    } catch (error) { showServiceError(error); }
  }

  async function revokeBrowserSessions() {
    const tokens = [...new Set([state.sessionToken, state.familySessionToken, state.statusSessionToken, state.correction?.sessionToken].filter(Boolean))];
    await Promise.allSettled(tokens.map(authToken => api("/v6/session/logout", { method: "POST", authToken, body: "{}" })));
  }

  function clearApplicationSession() {
    clearAutosaveTimers();
    clearSessionExpiryTimer();
    resetDocumentUploads();
    state.sessionToken = "";
    state.familySessionToken = "";
    state.statusSessionToken = "";
    state.familyContext = null;
    state.applicationContext = null;
    state.statusContext = null;
    state.correction = null;
    state.submitResult = null;
    state.challengeId = "";
    state.revision = 0;
    state.formVersion = "";
    state.formDefinitionHash = "";
    state.values = {};
    state.signatures = {};
    state.serverValidation = [];
    state.lastSavedSnapshot = "";
    state.changeVersion = 0;
    state.sessionAbsoluteExpiresAt = 0;
    clearPersistedBrowserSession();
  }

  function returnToSignIn() {
    clearApplicationSession();
    state.saveStatus = "idle";
    state.lastSavedLabel = "";
    state.paused = false;
    state.screen = 0;
    state.otpResends.application = undefined;
    sessionExpiredDialog.close();
    render();
  }

  async function signOut() {
    await revokeBrowserSessions();
    clearApplicationSession();
    state.saveStatus = "idle";
    state.paused = false;
    state.screen = 0;
    render();
  }

  async function saveAndClose(button) {
    const previous = button.textContent;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Saving...';
    try {
      captureValues();
      if (state.screen === 5) await finishDocumentUploads();
      await saveApplicationDraft(currentApplicationStage(), { mode: "save_and_close" });
      const savedLabel = state.lastSavedLabel;
      const applicationTokens = [...new Set([state.sessionToken, state.statusSessionToken, state.correction?.sessionToken].filter(Boolean))];
      await Promise.allSettled(applicationTokens.map(authToken => api("/v6/session/logout", { method: "POST", authToken, body: "{}" })));
      if (state.familySessionToken) {
        const result = await api("/v6/application/family", { method: "GET", authToken: state.familySessionToken });
        state.familyContext = result.family;
      }
      clearAutosaveTimers();
      resetDocumentUploads();
      state.sessionToken = "";
      state.statusSessionToken = "";
      state.applicationContext = null;
      state.statusContext = null;
      state.correction = null;
      state.submitResult = null;
      state.challengeId = "";
      state.revision = 0;
      state.formVersion = "";
      state.formDefinitionHash = "";
      state.values = { application_gateway_email: state.familyContext?.recipientEmail || state.values.application_gateway_email || "" };
      state.signatures = {};
      state.serverValidation = [];
      state.lastSavedSnapshot = "";
      state.changeVersion = 0;
      state.lastSavedLabel = savedLabel;
      state.saveStatus = "saved";
      state.paused = true;
      armSessionExpiry();
      render();
    } catch (error) {
      button.disabled = false;
      button.textContent = previous;
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
      applyFormContract(result.context);
      state.familySessionToken = result.familySessionToken || "";
      state.familyContext = result.family || null;
      state.sessionToken = result.family ? "" : result.sessionToken;
      state.applicationContext = result.context;
      state.revision = result.context.revision;
      state.values = result.family ? { application_gateway_email: state.values.application_gateway_email } : { application_gateway_email: state.values.application_gateway_email, ...result.context.values };
      if (!result.family) {
        state.counts.appGuardian = result.context.guardianCount || 1;
        state.counts.emergency = result.context.emergencyCount || 2;
        state.lastSavedSnapshot = draftSnapshot({ values: state.values, screen: Number(result.context.screen || 2), guardianCount: state.counts.appGuardian, emergencyCount: state.counts.emergency });
        state.saveStatus = "saved";
      }
      beginSessionExpiry(result);
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
      setBusy(true, "Finishing uploads...");
      await finishDocumentUploads();
      await saveApplicationDraft("documents", { mode: "navigation" });
      return next();
    }
    if (state.screen === 7) {
      setBusy(true, "Submitting...");
      await saveApplicationDraft("signature", { mode: "submission" });
      const canvas = root.querySelector('[data-signature="application_signature"] canvas');
      const signatureDataUrl = typeof state.signatures.application_signature === "string" ? state.signatures.application_signature : canvas.toDataURL("image/png");
      state.submitResult = await api("/v6/application/submit", { method: "POST", body: JSON.stringify({ expectedRevision: state.revision, formVersion: state.formVersion, formDefinitionHash: state.formDefinitionHash, signatureDataUrl }) });
      state.statusSessionToken = state.submitResult.statusSessionToken || "";
      state.statusContext = state.submitResult.statusContext || null;
      state.saveStatus = "saved";
      state.lastSavedLabel = "submitted";
      return next();
    }
    const stage = workflows.application.screens[state.screen].label.toLowerCase().replaceAll(" ", "_");
    setBusy(true, "Saving...");
    await saveApplicationDraft(stage, { mode: "navigation" });
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
      if (error.code !== "DOCUMENT_UPLOAD_FAILED") state.saveStatus = ["SESSION_EXPIRED", "SESSION_REQUIRED"].includes(error.code) ? "expired" : "error";
      setBusy(false);
      updateSaveState(workflows[state.workflow].screens[state.screen]);
      showServiceError(error);
    }
  });

  form.addEventListener("input", event => {
    if (event.target.type === "file") {
      const output = event.target.closest(".field")?.querySelector("[data-file-state]");
      if (output) output.textContent = event.target.files[0] ? `${event.target.files.length} file${event.target.files.length === 1 ? "" : "s"} selected` : "Nothing selected";
      startSelectedDocumentUploads(event.target);
      return;
    }
    captureValues();
    updateConditionals();
    clearResolvedServerValidation(event.target.name);
    scheduleAutosave();
  });

  errorSummary.addEventListener("click", async event => {
    const action = event.target.closest("[data-validation-screen]");
    if (!action) return;
    const target = Number(action.dataset.validationScreen);
    if (target !== state.screen) await navigateToScreen(target);
    showInlineServerValidation({ focus: true });
  });

  form.addEventListener("click", async event => {
    const policyLink = event.target.closest("[data-policy-link]");
    const policyReturn = event.target.closest("[data-policy-return]");
    const retryUpload = event.target.closest("[data-retry-upload]");
    const action = event.target.closest("[data-action]");
    const selectedApplication = event.target.closest("[data-select-application]");
    const selectedStatus = event.target.closest("[data-view-application-status]");
    const add = event.target.closest("[data-add]");
    const remove = event.target.closest("[data-remove]");
    const clear = event.target.closest("[data-clear-signature]");
    if (policyLink) {
      event.preventDefault();
      navigatePolicy(policyLink.dataset.policyLink);
      return;
    }
    if (policyReturn) {
      event.preventDefault();
      navigatePolicy("");
      return;
    }
    if (retryUpload) {
      const upload = documentUploads.get(retryUpload.dataset.retryUpload);
      if (!upload) return;
      errorSummary.hidden = true;
      startDocumentUpload(upload);
      return;
    }
    if (selectedApplication) return selectFamilyApplication(selectedApplication.dataset.selectApplication, selectedApplication);
    if (selectedStatus) return selectApplicationStatus(selectedStatus.dataset.viewApplicationStatus, selectedStatus);
    if (action?.dataset.action === "sign-out") return signOut();
    if (action?.dataset.action === "save-close") return saveAndClose(action);
    if (action?.dataset.action === "return-to-family-selector") {
      state.paused = false;
      state.saveStatus = "idle";
      state.screen = 2;
      return render();
    }
    if (action?.dataset.action === "refresh-status") return refreshApplicationStatus().catch(showServiceError);
    if (action?.dataset.action === "resend-signature") return resendPendingSignature(action.dataset.guardianId, action);
    if (action?.dataset.action === "correct-signer-email") return beginEmailCorrection(action.dataset.guardianId);
    if (action?.dataset.action === "verify-correction-code") return verifyEmailCorrection();
    if (action?.dataset.action === "confirm-email-correction") return confirmEmailCorrection();
    if (action?.dataset.action === "cancel-correction") { state.correction = null; return render(); }
    if (action?.dataset.action === "family-selector") {
      const currentApplicationId = state.applicationContext?.applicationId || state.statusContext?.applicationId;
      if (state.familyContext && currentApplicationId) {
        state.familyContext.applications = state.familyContext.applications.map(record => record.applicationId === currentApplicationId ? { ...record, status: state.submitResult?.status || state.statusContext?.status || record.status, editable: false } : record);
      }
      const email = state.values.application_gateway_email;
      resetDocumentUploads();
      state.sessionToken = "";
      state.statusSessionToken = "";
      state.applicationContext = null;
      state.submitResult = null;
      state.statusContext = null;
      state.correction = null;
      state.values = { application_gateway_email: email };
      state.screen = 2;
      return render();
    }
    if (action?.dataset.action === "next") return next();
    if (action?.dataset.action === "back") return navigateToScreen(Math.max(0, state.screen - 1));
    if (action?.dataset.action === "resend-code") return resendCode(action.dataset.resendKind);
    if (add) {
      captureValues();
      const kind = add.dataset.add;
      state.counts[kind] += 1;
      const confirmations = { appGuardian: "app_guardians_complete", acceptanceGuardian: "acceptance_guardians_complete", declineGuardian: "decline_guardians_complete" };
      if (confirmations[kind]) state.values[confirmations[kind]] = [];
      render();
      const addedCard = root.querySelector(`[data-repeat-kind="${CSS.escape(kind)}"][data-repeat-index="${state.counts[kind] - 1}"]`);
      if (addedCard) {
        addedCard.scrollIntoView({ block: "start", behavior: "smooth" });
        window.setTimeout(() => addedCard.focus({ preventScroll: true }), 350);
      }
      scheduleAutosave();
      return;
    }
    if (remove) {
      captureValues();
      const kind = remove.dataset.remove;
      const removedIndex = state.counts[kind] - 1;
      const prefixes = {
        appGuardian: `app_guardian_${removedIndex}_`,
        emergency: `emergency_${removedIndex}_`,
        acceptanceGuardian: `acceptance_guardian_${removedIndex}_`,
        declineGuardian: `decline_guardian_${removedIndex}_`,
        sibling: `sibling_${removedIndex}_`,
        futureSibling: `future_sibling_${removedIndex}_`,
        relative: `relative_${removedIndex}_`
      };
      for (const key of Object.keys(state.values)) {
        if (prefixes[kind] && key.startsWith(prefixes[kind])) state.values[key] = Array.isArray(state.values[key]) ? [] : "";
      }
      state.counts[kind] = Math.max(1, removedIndex);
      const confirmations = { appGuardian: "app_guardians_complete", acceptanceGuardian: "acceptance_guardians_complete", declineGuardian: "decline_guardians_complete" };
      if (confirmations[kind]) state.values[confirmations[kind]] = [];
      render();
      scheduleAutosave();
      return;
    }
    if (clear) {
      const prefix = clear.dataset.clearSignature;
      state.signatures[prefix] = false;
      const canvas = root.querySelector(`[data-signature="${prefix}"] canvas`);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      const date = root.querySelector(`[name="${prefix}_date"]`);
      if (date && root.querySelector(`[data-signature="${prefix}"]`).dataset.autoDate === "true") date.value = "";
      captureValues();
      scheduleAutosave();
      updateSignatureLocks();
    }
  });

  form.addEventListener("change", event => {
    const selector = event.target.closest("[data-policy-select]");
    if (selector) navigatePolicy(selector.value);
  });

  document.querySelector("#step-list").addEventListener("click", async event => {
    const target = event.target.closest("[data-goto]");
    if (!target) return;
    await navigateToScreen(Number(target.dataset.goto));
  });

  frameSelect.addEventListener("change", () => { captureValues(); state.screen = Number(frameSelect.value); render(); });
  sessionExpiredDialog.addEventListener("cancel", event => event.preventDefault());
  document.querySelector("#return-to-sign-in").addEventListener("click", returnToSignIn);
  window.addEventListener("offline", () => {
    if (!applicationDraftActive()) return;
    clearAutosaveTimers();
    state.saveStatus = "offline";
    updateSaveState(workflows.application.screens[state.screen]);
  });
  window.addEventListener("online", () => {
    if (!applicationDraftActive() || !["offline", "error"].includes(state.saveStatus)) return;
    scheduleAutosave(false);
  });
  window.addEventListener("popstate", () => {
    state.policySlug = policySlugFromLocation();
    render();
    window.requestAnimationFrame(updatePolicyReadingProgress);
  });
  window.addEventListener("scroll", updatePolicyReadingProgress, { passive: true });
  window.addEventListener("resize", updatePolicyReadingProgress);
  window.addEventListener("beforeunload", event => {
    if (!applicationDraftActive() || (!["dirty", "saving", "offline", "error"].includes(state.saveStatus) && !documentUploadsNeedAttention() && !state.signatures.application_signature)) return;
    event.preventDefault();
    event.returnValue = "";
  });
  restoreBrowserSession().finally(render);
})();
