const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SCHEMA_VERSION = "rosewood-v6-2026-08-08-form-v8";
export const CONTACT_PERMISSION_YES = "Yes, the school may contact this person";
export const CONTACT_PERMISSION_NO = "No, do not contact this person";
export const EOI_FIELDS = [
  "eoi_language", "eoi_title", "eoi_first", "eoi_last", "eoi_relationship", "eoi_email", "eoi_mobile", "eoi_address",
  "eoi_suburb", "eoi_state", "eoi_postcode", "eoi_country", "eoi_student_first", "eoi_student_last", "eoi_dob", "eoi_gender",
  "eoi_religion", "eoi_year", "eoi_level", "eoi_current_school", "eoi_current_year", "eoi_needs", "eoi_need_category",
  "eoi_family_connection", "eoi_other_children", "eoi_discovery", "eoi_information"
];
export const EOI_REQUIRED = [
  "eoi_first", "eoi_last", "eoi_relationship", "eoi_email", "eoi_mobile", "eoi_address", "eoi_suburb", "eoi_postcode",
  "eoi_country", "eoi_student_first", "eoi_student_last", "eoi_dob", "eoi_gender", "eoi_religion", "eoi_year", "eoi_level",
  "eoi_needs", "eoi_family_connection", "eoi_other_children", "eoi_discovery"
];

export const APPLICATION_FIELD_PREFIXES = [
  "student_", "app_guardian_", "emergency_", "previous_school_", "fee_", "application_", "sacrament_"
];

export const APPLICATION_STATIC_FIELDS = [
  "app_guardians_complete", "current_level", "entry_year", "entry_level", "current_school", "current_school_other", "care_arrangement", "care_other",
  "shared_parenting", "future_siblings", "future_sibling_count",
  "residence_country", "birth_country", "nationality", "ethnicity", "arrival_date", "residency_status", "australian_citizen",
  "residency_evidence", "visa_subclass", "visa_expiry", "previous_visa", "indigenous_status", "main_language", "other_languages",
  "additional_needs", "need_categories", "need_other", "professional_categories", "professional_other", "reports_attached", "ndis_support",
  "court_orders", "other_relevant_information", "parish", "medical_conditions", "other_medical_condition", "condition_details",
  "allergy_details", "anaphylaxis_risk", "anaphylaxis_device", "immunisation", "humanitarian_health", "doctor_name", "doctor_address",
  "doctor_phone", "medicare_number", "medicare_expiry", "private_insurance", "ambulance_cover", "healthcare_card"
];

export const APPLICATION_V7_STATIC_FIELDS = [
  ...APPLICATION_STATIC_FIELDS,
  "previous_school_attended", "previous_school_year_level", "interrupted_schooling", "interrupted_schooling_details",
  "formal_assessment", "formal_assessment_details", "formal_assessment_report", "current_adjustments", "rosewood_adjustments",
  "medicare_reference", "private_insurance_provider", "private_insurance_policy", "student_healthcare_number", "student_healthcare_expiry"
];

export const APPLICATION_REQUIRED_FIELDS = [
  "student_first", "student_last", "student_dob", "student_gender", "student_religion", "current_level", "entry_year",
  "entry_level", "current_school", "student_address_share", "care_arrangement", "student_address", "student_suburb",
  "student_state", "student_postcode", "student_country", "future_siblings", "residence_country", "birth_country", "nationality",
  "residency_status", "australian_citizen", "indigenous_status", "main_language", "additional_needs",
  "reports_attached", "ndis_support", "court_orders", "medical_conditions", "immunisation", "anaphylaxis_risk", "doctor_name", "doctor_address",
  "ambulance_cover", "healthcare_card", "app_guardians_complete", "previous_school_permission", "previous_school_name",
  "previous_school_address", "previous_school_interstate", "fee_option", "application_discovery", "application_influences",
  "application_signature_ip", "application_signature_terms", "application_signature_date"
];

export const APPLICATION_V7_REQUIRED_FIELDS = [
  ...APPLICATION_REQUIRED_FIELDS.filter(key => ![
    "previous_school_permission", "previous_school_name", "previous_school_address", "previous_school_interstate", "fee_option",
    "application_discovery", "application_influences"
  ].includes(key)),
  "previous_school_attended", "interrupted_schooling", "formal_assessment", "doctor_phone", "medicare_number", "medicare_reference",
  "application_student_agreement", "application_parent_agreement", "application_agreement_acknowledgement"
];

export const APPLICATION_V8_STATIC_FIELDS = [...APPLICATION_V7_STATIC_FIELDS];

export const APPLICATION_V8_REQUIRED_FIELDS = APPLICATION_V7_REQUIRED_FIELDS.filter(key => key !== "previous_school_attended");

export const APPLICATION_SURVEY_FIELDS = [
  "application_special_aptitudes",
  "application_preferred_subjects",
  "application_subjects_needing_help",
  "application_hobbies_cultural_pursuits",
  "application_sport_participation",
  "application_extracurricular_activities",
  "application_local_library",
  "application_school_attractions",
  "application_desired_personal_qualities",
  "application_mentoring_value",
  "application_intended_years"
];

const MAX_TEXT = 5000;
const MAX_LONG_TEXT = 12000;
const MAX_ARRAY = 30;
const MAX_GUARDIANS = 6;
const MAX_EMERGENCY_CONTACTS = 6;

export function safeText(value, max = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeEmail(value) {
  return safeText(value, 254).toLowerCase();
}

export function truthy(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? "").trim());
}

function cleanValue(value) {
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map(item => safeText(item, 500)).filter(Boolean);
  if (typeof value === "boolean" || typeof value === "number") return value;
  return safeText(value, MAX_LONG_TEXT);
}

export function validateEoi(input) {
  if (!input || Array.isArray(input) || typeof input !== "object") throw validationError("Provide the EOI answers as an object.");
  const unexpected = Object.keys(input).filter(key => !EOI_FIELDS.includes(key));
  const values = Object.fromEntries(EOI_FIELDS.map(key => [key, cleanValue(input[key])]).filter(([, value]) => truthy(value)));
  const missing = EOI_REQUIRED.filter(key => !truthy(values[key]));
  if (values.eoi_needs === "Yes" && !truthy(values.eoi_need_category)) missing.push("eoi_need_category");
  if (!EMAIL_PATTERN.test(normalizeEmail(values.eoi_email))) missing.push("eoi_email:invalid");
  if (!DATE_PATTERN.test(values.eoi_dob || "")) missing.push("eoi_dob:invalid");
  if (unexpected.length || missing.length) throw validationError("Complete the required EOI information.", { unexpected, missing: [...new Set(missing)] });
  values.eoi_email = normalizeEmail(values.eoi_email);
  return values;
}

function isApplicationField(key) {
  return APPLICATION_FIELD_PREFIXES.some(prefix => key.startsWith(prefix)) || APPLICATION_V7_STATIC_FIELDS.includes(key);
}

export function sanitizeApplication(input) {
  if (!input || Array.isArray(input) || typeof input !== "object") throw validationError("Provide the application answers as an object.");
  const unexpected = Object.keys(input).filter(key => !isApplicationField(key));
  if (unexpected.length) throw validationError("The application contains fields outside the V6 contract.", { unexpected });
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, cleanValue(value)]));
}

function usesExplicitContactPermission(formVersion) {
  return /\.(6|7|8|9)$/.test(String(formVersion || ""));
}

export function contactPermissionAllowed(value, formVersion = "rosewood-application-2026.6") {
  if (usesExplicitContactPermission(formVersion)) return value === CONTACT_PERMISSION_YES;
  return !["No", "No, do not contact them", CONTACT_PERMISSION_NO].includes(String(value || "").trim());
}

export function validateApplicationForSubmission(input, guardianCount = 1, emergencyCount = 2, formVersion = "rosewood-application-2026.6") {
  const values = sanitizeApplication(input);
  const v8 = /\.(8|9)$/.test(String(formVersion));
  const v7OrLater = /\.(7|8|9)$/.test(String(formVersion));
  const requiredFields = v8 ? APPLICATION_V8_REQUIRED_FIELDS : v7OrLater ? APPLICATION_V7_REQUIRED_FIELDS : APPLICATION_REQUIRED_FIELDS;
  const missing = requiredFields.filter(key => !truthy(values[key]));
  for (let index = 0; index < Math.max(1, Math.min(MAX_GUARDIANS, Number(guardianCount))); index += 1) {
    const prefix = `app_guardian_${index}_`;
    const requiredGuardianSuffixes = ["first", "last", "mobile", "relationship", "contact_type", "sms", "healthcare", "address", "suburb", "state", "postcode", "country", "occupation_group", "occupation", "school_education", "further_education", "birth_country", "nationality", "languages", "residency", "indigenous", ...(v7OrLater ? ["marital", "religion"] : ["ethnicity"] )];
    for (const suffix of requiredGuardianSuffixes) {
      if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    }
    if (values[`${prefix}healthcare`] === "Yes") for (const suffix of ["healthcare_number", "healthcare_expiry"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    if (values[`${prefix}residency`] === "Temporary Resident") for (const suffix of ["visa_subclass", "visa_expiry"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    if (values[`${prefix}postal_same`] === "No") for (const suffix of ["postal_address", "postal_suburb", "postal_state", "postal_postcode", "postal_country"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    if (index > 0 && !truthy(values[`${prefix}permission`])) missing.push(`${prefix}permission`);
    if (index > 0 && usesExplicitContactPermission(formVersion) && ![CONTACT_PERMISSION_YES, CONTACT_PERMISSION_NO].includes(values[`${prefix}permission`])) missing.push(`${prefix}permission:invalid`);
    const emailRequired = index === 0 || !usesExplicitContactPermission(formVersion) || contactPermissionAllowed(values[`${prefix}permission`], formVersion);
    if (emailRequired && !truthy(values[`${prefix}email`])) missing.push(`${prefix}email`);
    if (truthy(values[`${prefix}email`]) && !EMAIL_PATTERN.test(normalizeEmail(values[`${prefix}email`]))) missing.push(`${prefix}email:invalid`);
  }
  for (let index = 0; index < Math.max(2, Math.min(MAX_EMERGENCY_CONTACTS, Number(emergencyCount))); index += 1) {
    const prefix = `emergency_${index}_`;
    for (const suffix of ["first", "last", "relationship", "mobile"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
  }
  if (values.student_religion === "Other" && !truthy(values.student_religion_other)) missing.push("student_religion_other");
  if (values.current_school === "Other" && !truthy(values.current_school_other)) missing.push("current_school_other");
  if (!v8 && v7OrLater && values.previous_school_attended === "Yes") for (const key of ["previous_school_name", "previous_school_year_level"]) if (!truthy(values[key])) missing.push(key);
  if (v7OrLater && values.interrupted_schooling === "Yes" && !truthy(values.interrupted_schooling_details)) missing.push("interrupted_schooling_details");
  const arrangements = Array.isArray(values.care_arrangement) ? values.care_arrangement : [values.care_arrangement];
  if (arrangements.includes("Other") && !truthy(values.care_other)) missing.push("care_other");
  if (arrangements.includes("Shared Custody") && !truthy(values.shared_parenting)) missing.push("shared_parenting");
  if (values.future_siblings === "Yes" && !truthy(values.future_sibling_count)) missing.push("future_sibling_count");
  if (values.australian_citizen === "No" && !truthy(values.residency_evidence)) missing.push("residency_evidence");
  if (values.australian_citizen === "No" && values.residency_evidence && values.residency_evidence !== "Eligible for Australian Passport") for (const key of ["visa_subclass", "visa_expiry"]) if (!truthy(values[key])) missing.push(key);
  if (values.additional_needs === "Yes" && !truthy(values.need_categories)) missing.push("need_categories");
  if (v7OrLater && values.formal_assessment === "Yes") for (const key of ["formal_assessment_details", "formal_assessment_report"]) if (!truthy(values[key])) missing.push(key);
  if ((Array.isArray(values.need_categories) ? values.need_categories : [values.need_categories]).includes("Other") && !truthy(values.need_other)) missing.push("need_other");
  if ((Array.isArray(values.professional_categories) ? values.professional_categories : [values.professional_categories]).includes("Other") && !truthy(values.professional_other)) missing.push("professional_other");
  if ((Array.isArray(values.medical_conditions) ? values.medical_conditions : [values.medical_conditions]).includes("Other") && !truthy(values.other_medical_condition)) missing.push("other_medical_condition");
  if (v7OrLater && values.healthcare_card === "Yes") for (const key of ["student_healthcare_number", "student_healthcare_expiry"]) if (!truthy(values[key])) missing.push(key);
  if (!v7OrLater) {
    if (values.fee_option === "Both Parents / Guardian") for (const key of ["fee_both_nominee", "fee_both_date"]) if (!truthy(values[key])) missing.push(key);
    if (values.fee_option === "One Parent / Guardian") for (const key of ["fee_one_nominee", "fee_one_date"]) if (!truthy(values[key])) missing.push(key);
    if (values.fee_option === "Percentage split with custodial court order") for (const key of ["fee_guardian_a", "fee_guardian_a_percent", "fee_guardian_b", "fee_guardian_b_percent", "fee_split_date"]) if (!truthy(values[key])) missing.push(key);
    if (Array.isArray(values.application_influences) && values.application_influences.length !== 3) missing.push("application_influences:three_required");
  }
  if (v7OrLater) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    for (const sacrament of ["Baptism", "Reconciliation", "Eucharist", "Confirmation"]) {
      const key = `sacrament_${sacrament}_date`;
      if (truthy(values[key]) && (!DATE_PATTERN.test(values[key]) || values[key] > today)) missing.push(`${key}:invalid`);
    }
  }
  const additionalPermissions = Array.from({ length: Math.max(0, guardianCount - 1) }, (_, offset) => values[`app_guardian_${offset + 1}_permission`]);
  const hasSuppressedSignature = usesExplicitContactPermission(formVersion) && additionalPermissions.some(permission => permission === CONTACT_PERMISSION_NO);
  const hasElectronicSignature = guardianCount > 1 && additionalPermissions.some(permission => contactPermissionAllowed(permission, formVersion));
  if ((guardianCount <= 1 || hasSuppressedSignature) && !truthy(values.application_one_signature_reason)) missing.push("application_one_signature_reason");
  if (hasElectronicSignature && !truthy(values.application_additional_signature_later)) missing.push("application_additional_signature_later");
  if (missing.length) throw validationError("Complete the required Application for Enrolment information.", { missing: [...new Set(missing)] });
  return values;
}

export function splitApplication(values, applicationId, guardianCount, emergencyCount) {
  const student = Object.fromEntries(Object.entries(values).filter(([key]) => !key.startsWith("app_guardian_") && !key.startsWith("emergency_") && !key.startsWith("previous_school_") && !key.startsWith("fee_") && !key.startsWith("application_")));
  const guardians = [];
  for (let index = 0; index < Math.min(MAX_GUARDIANS, guardianCount); index += 1) {
    const prefix = `app_guardian_${index}_`;
    guardians.push(Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value])));
  }
  const emergencyContacts = [];
  for (let index = 0; index < Math.min(MAX_EMERGENCY_CONTACTS, emergencyCount); index += 1) {
    const prefix = `emergency_${index}_`;
    emergencyContacts.push(Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value])));
  }
  const conditions = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith("previous_school_") || key.startsWith("fee_") || ["application_discovery", "application_influences", "application_student_agreement", "application_parent_agreement", "application_agreement_acknowledgement", ...APPLICATION_SURVEY_FIELDS].includes(key)));
  return { applicationId, student, guardians, emergencyContacts, conditions };
}

export function validationError(message, details) {
  return Object.assign(new Error(message), { status: 422, code: "VALIDATION_ERROR", details });
}
