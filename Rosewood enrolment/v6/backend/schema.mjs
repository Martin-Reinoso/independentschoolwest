const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const SCHEMA_VERSION = "rosewood-v6-2026-08-05";
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
  return key.startsWith("student_") || key.startsWith("app_guardian_") || key.startsWith("emergency_") || key.startsWith("previous_school_") || key.startsWith("fee_") || key.startsWith("application_") || key.startsWith("sacrament_") || [
    "app_guardians_complete", "current_level", "entry_year", "entry_level", "current_school", "current_school_other", "care_arrangement", "care_other",
    "shared_parenting", "future_siblings", "future_sibling_count",
    "residence_country", "birth_country", "nationality", "ethnicity", "arrival_date", "residency_status", "australian_citizen",
    "residency_evidence", "visa_subclass", "visa_expiry", "previous_visa", "indigenous_status", "main_language", "other_languages",
    "additional_needs", "need_categories", "need_other", "professional_categories", "professional_other", "reports_attached", "ndis_support",
    "court_orders", "other_relevant_information", "parish", "medical_conditions", "other_medical_condition", "condition_details",
    "allergy_details", "anaphylaxis_risk", "anaphylaxis_device", "immunisation", "humanitarian_health", "doctor_name", "doctor_address",
    "doctor_phone", "medicare_number", "medicare_expiry", "private_insurance", "ambulance_cover", "healthcare_card"
  ].includes(key);
}

export function sanitizeApplication(input) {
  if (!input || Array.isArray(input) || typeof input !== "object") throw validationError("Provide the application answers as an object.");
  const unexpected = Object.keys(input).filter(key => !isApplicationField(key));
  if (unexpected.length) throw validationError("The application contains fields outside the V6 contract.", { unexpected });
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, cleanValue(value)]));
}

export function validateApplicationForSubmission(input, guardianCount = 1, emergencyCount = 2) {
  const values = sanitizeApplication(input);
  const required = [
    "student_first", "student_last", "student_dob", "student_gender", "student_religion", "current_level", "entry_year",
    "entry_level", "current_school", "student_address_share", "care_arrangement", "student_address", "student_suburb",
    "student_state", "student_postcode", "student_country", "future_siblings", "residence_country", "birth_country", "nationality",
    "residency_status", "australian_citizen", "indigenous_status", "main_language", "additional_needs",
    "reports_attached", "ndis_support", "court_orders", "medical_conditions", "immunisation", "anaphylaxis_risk", "doctor_name", "doctor_address",
    "ambulance_cover", "healthcare_card", "app_guardians_complete", "previous_school_permission", "previous_school_name",
    "previous_school_address", "previous_school_interstate", "fee_option", "application_discovery", "application_influences",
    "application_signature_ip", "application_signature_terms", "application_signature_date"
  ];
  const missing = required.filter(key => !truthy(values[key]));
  for (let index = 0; index < Math.max(1, Math.min(MAX_GUARDIANS, Number(guardianCount))); index += 1) {
    const prefix = `app_guardian_${index}_`;
    for (const suffix of ["first", "last", "email", "mobile", "relationship", "contact_type", "sms", "healthcare", "address", "suburb", "state", "postcode", "country", "occupation_group", "occupation", "school_education", "further_education", "birth_country", "nationality", "ethnicity", "languages", "residency", "indigenous"]) {
      if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    }
    if (values[`${prefix}healthcare`] === "Yes") for (const suffix of ["healthcare_number", "healthcare_expiry"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    if (values[`${prefix}residency`] === "Temporary Resident") for (const suffix of ["visa_subclass", "visa_expiry"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    if (values[`${prefix}postal_same`] === "No") for (const suffix of ["postal_address", "postal_suburb", "postal_state", "postal_postcode", "postal_country"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
    if (index > 0 && !truthy(values[`${prefix}permission`])) missing.push(`${prefix}permission`);
    if (!EMAIL_PATTERN.test(normalizeEmail(values[`${prefix}email`]))) missing.push(`${prefix}email:invalid`);
  }
  for (let index = 0; index < Math.max(2, Math.min(MAX_EMERGENCY_CONTACTS, Number(emergencyCount))); index += 1) {
    const prefix = `emergency_${index}_`;
    for (const suffix of ["first", "last", "relationship", "mobile"]) if (!truthy(values[`${prefix}${suffix}`])) missing.push(`${prefix}${suffix}`);
  }
  if (values.student_religion === "Other" && !truthy(values.student_religion_other)) missing.push("student_religion_other");
  if (values.current_school === "Other" && !truthy(values.current_school_other)) missing.push("current_school_other");
  const arrangements = Array.isArray(values.care_arrangement) ? values.care_arrangement : [values.care_arrangement];
  if (arrangements.includes("Other") && !truthy(values.care_other)) missing.push("care_other");
  if (arrangements.includes("Shared Custody") && !truthy(values.shared_parenting)) missing.push("shared_parenting");
  if (values.future_siblings === "Yes" && !truthy(values.future_sibling_count)) missing.push("future_sibling_count");
  if (values.australian_citizen === "No" && !truthy(values.residency_evidence)) missing.push("residency_evidence");
  if (values.australian_citizen === "No" && values.residency_evidence && values.residency_evidence !== "Eligible for Australian Passport") for (const key of ["visa_subclass", "visa_expiry"]) if (!truthy(values[key])) missing.push(key);
  if (values.additional_needs === "Yes" && !truthy(values.need_categories)) missing.push("need_categories");
  if ((Array.isArray(values.need_categories) ? values.need_categories : [values.need_categories]).includes("Other") && !truthy(values.need_other)) missing.push("need_other");
  if ((Array.isArray(values.professional_categories) ? values.professional_categories : [values.professional_categories]).includes("Other") && !truthy(values.professional_other)) missing.push("professional_other");
  if ((Array.isArray(values.medical_conditions) ? values.medical_conditions : [values.medical_conditions]).includes("Other") && !truthy(values.other_medical_condition)) missing.push("other_medical_condition");
  if (values.fee_option === "Both Parents / Guardian") for (const key of ["fee_both_nominee", "fee_both_date"]) if (!truthy(values[key])) missing.push(key);
  if (values.fee_option === "One Parent / Guardian") for (const key of ["fee_one_nominee", "fee_one_date"]) if (!truthy(values[key])) missing.push(key);
  if (values.fee_option === "Percentage split with custodial court order") for (const key of ["fee_guardian_a", "fee_guardian_a_percent", "fee_guardian_b", "fee_guardian_b_percent", "fee_split_date"]) if (!truthy(values[key])) missing.push(key);
  if (Array.isArray(values.application_influences) && values.application_influences.length !== 3) missing.push("application_influences:three_required");
  if (guardianCount <= 1 && !truthy(values.application_one_signature_reason)) missing.push("application_one_signature_reason");
  if (guardianCount > 1 && !truthy(values.application_additional_signature_later)) missing.push("application_additional_signature_later");
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
  const conditions = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith("previous_school_") || key.startsWith("fee_") || ["application_discovery", "application_influences"].includes(key)));
  return { applicationId, student, guardians, emergencyContacts, conditions };
}

export function validationError(message, details) {
  return Object.assign(new Error(message), { status: 422, code: "VALIDATION_ERROR", details });
}
