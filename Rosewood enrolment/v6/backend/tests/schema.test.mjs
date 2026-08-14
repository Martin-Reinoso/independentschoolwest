import assert from "node:assert/strict";
import test from "node:test";
import { APPLICATION_REQUIRED_FIELDS, APPLICATION_SURVEY_FIELDS, APPLICATION_V7_REQUIRED_FIELDS, APPLICATION_V8_REQUIRED_FIELDS, APPLICATION_V14_REQUIRED_FIELDS, CONTACT_PERMISSION_NO, CONTACT_PERMISSION_YES, sanitizeApplication, splitApplication, validateApplicationForSubmission, validateEoi } from "../schema.mjs";

function validEoi() {
  return {
    eoi_first: "Alex", eoi_last: "Example", eoi_relationship: "Mother", eoi_email: " ALEX@EXAMPLE.COM ", eoi_mobile: "0400000000",
    eoi_address: "1 Example Street", eoi_suburb: "Melbourne", eoi_postcode: "3000", eoi_country: "Australia",
    eoi_student_first: "Avery", eoi_student_last: "Example", eoi_dob: "2020-01-02", eoi_gender: "Female", eoi_religion: "No Religion",
    eoi_year: "2027", eoi_level: "Foundation", eoi_needs: "No", eoi_family_connection: "New Family", eoi_other_children: "No",
    eoi_discovery: "School Website"
  };
}

test("EOI normalises email and preserves the mapped fields", () => {
  const result = validateEoi(validEoi());
  assert.equal(result.eoi_email, "alex@example.com");
  assert.equal(result.eoi_student_first, "Avery");
});

test("EOI requires a need category only after Yes", () => {
  const input = { ...validEoi(), eoi_needs: "Yes" };
  assert.throws(() => validateEoi(input), error => error.details.missing.includes("eoi_need_category"));
});

test("Application accepts V6 dynamic guardian, confirmation and sacrament fields", () => {
  const result = sanitizeApplication({ app_guardian_2_first: "Casey", app_guardians_complete: ["Confirmed"], sacrament_Baptism: "Confirmed", current_level: "Foundation" });
  assert.equal(result.app_guardian_2_first, "Casey");
  assert.deepEqual(result.app_guardians_complete, ["Confirmed"]);
  assert.equal(result.sacrament_Baptism, "Confirmed");
});

test("Application rejects fields belonging to Acceptance", () => {
  assert.throws(() => sanitizeApplication({ acceptance_terms_agree: "Confirmed" }), /outside the V6 contract/);
});

function validApplication(permission) {
  const values = Object.fromEntries(APPLICATION_REQUIRED_FIELDS.map(field => [field, "Synthetic"]));
  values.application_influences = ["Reputation", "Location", "Fees"];
  values.application_signature_ip = ["Confirmed"];
  values.application_signature_terms = ["Confirmed"];
  values.application_one_signature_reason = "The applicant asked the College to review consent arrangements.";
  values.application_additional_signature_later = ["Confirmed"];
  for (let index = 0; index < 2; index += 1) {
    const prefix = `app_guardian_${index}_`;
    for (const suffix of ["first", "last", "mobile", "relationship", "contact_type", "sms", "healthcare", "address", "suburb", "state", "postcode", "country", "occupation_group", "occupation", "school_education", "further_education", "birth_country", "nationality", "ethnicity", "languages", "residency", "indigenous"]) values[`${prefix}${suffix}`] = "Synthetic";
  }
  values.app_guardian_0_email = "applicant@example.test";
  values.app_guardian_1_permission = permission;
  for (let index = 0; index < 2; index += 1) for (const suffix of ["first", "last", "relationship", "mobile"]) values[`emergency_${index}_${suffix}`] = "Synthetic";
  return values;
}

test("V6 permits a no-contact guardian without an email only when one-signature reasoning is recorded", () => {
  const values = validApplication(CONTACT_PERMISSION_NO);
  delete values.app_guardian_1_email;
  delete values.application_additional_signature_later;
  assert.equal(validateApplicationForSubmission(values, 2, 2, "rosewood-application-2026.6").app_guardian_1_permission, CONTACT_PERMISSION_NO);
  delete values.application_one_signature_reason;
  assert.throws(() => validateApplicationForSubmission(values, 2, 2, "rosewood-application-2026.6"), error => error.details.missing.includes("application_one_signature_reason"));
});

test("V6 requires an email and later-signature confirmation for a contactable guardian", () => {
  const values = validApplication(CONTACT_PERMISSION_YES);
  delete values.app_guardian_1_email;
  delete values.application_additional_signature_later;
  assert.throws(() => validateApplicationForSubmission(values, 2, 2, "rosewood-application-2026.6"), error => error.details.missing.includes("app_guardian_1_email") && error.details.missing.includes("application_additional_signature_later"));
  values.app_guardian_1_email = "guardian@example.test";
  values.application_additional_signature_later = ["Confirmed"];
  assert.equal(validateApplicationForSubmission(values, 2, 2, "rosewood-application-2026.6").app_guardian_1_permission, CONTACT_PERMISSION_YES);
});

test("V6 does not accept a legacy or inferred contact-permission value", () => {
  const values = validApplication("No, do not contact them");
  assert.throws(() => validateApplicationForSubmission(values, 2, 2, "rosewood-application-2026.6"), error => error.details.missing.includes("app_guardian_1_permission:invalid"));
});

function validV7Application() {
  const values = Object.fromEntries(APPLICATION_V7_REQUIRED_FIELDS.map(field => [field, "Synthetic"]));
  Object.assign(values, {
    previous_school_attended: "No",
    interrupted_schooling: "No",
    formal_assessment: "No",
    healthcare_card: "No",
    application_signature_ip: ["Confirmed"],
    application_signature_terms: ["Confirmed"],
    application_student_agreement: ["Confirmed"],
    application_parent_agreement: ["Confirmed"],
    application_agreement_acknowledgement: ["Confirmed"],
    application_one_signature_reason: "Only one legal parent or guardian is available to sign.",
    app_guardian_0_email: "applicant@example.test"
  });
  for (const suffix of ["first", "last", "mobile", "relationship", "contact_type", "sms", "healthcare", "address", "suburb", "state", "postcode", "country", "occupation_group", "occupation", "school_education", "further_education", "birth_country", "nationality", "languages", "residency", "indigenous", "marital", "religion"]) values[`app_guardian_0_${suffix}`] = "Synthetic";
  for (let index = 0; index < 2; index += 1) for (const suffix of ["first", "last", "relationship", "mobile"]) values[`emergency_${index}_${suffix}`] = "Synthetic";
  return values;
}

test("V7 validates the new conditional education, assessment and health-card fields", () => {
  const values = validV7Application();
  Object.assign(values, { previous_school_attended: "Yes", interrupted_schooling: "Yes", formal_assessment: "Yes", healthcare_card: "Yes" });
  assert.throws(
    () => validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.7"),
    error => ["previous_school_name", "previous_school_year_level", "interrupted_schooling_details", "formal_assessment_details", "formal_assessment_report", "student_healthcare_number", "student_healthcare_expiry"].every(field => error.details.missing.includes(field))
  );
  Object.assign(values, {
    previous_school_name: "Synthetic School",
    previous_school_year_level: "Foundation",
    interrupted_schooling_details: "Synthetic dates and details",
    formal_assessment_details: "Synthetic assessment",
    formal_assessment_report: "Yes",
    student_healthcare_number: "SYNTHETIC",
    student_healthcare_expiry: "2027-01-01"
  });
  assert.equal(validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.7").previous_school_name, "Synthetic School");
});

test("V7 rejects future sacrament dates while keeping them optional", () => {
  const values = validV7Application();
  values.sacrament_Baptism_date = "2999-01-01";
  assert.throws(() => validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.7"), error => error.details.missing.includes("sacrament_Baptism_date:invalid"));
  delete values.sacrament_Baptism_date;
  assert.equal(validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.7").sacrament_Baptism_date, undefined);
});

test("V8 retires previous education from the active contract and preserves the optional survey", () => {
  const values = validV7Application();
  delete values.previous_school_attended;
  Object.assign(values, Object.fromEntries(APPLICATION_SURVEY_FIELDS.map((field, index) => [field, index < 3 ? `Synthetic answer ${index + 1}` : "No"])));
  const validated = validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.8");
  assert.ok(!APPLICATION_V8_REQUIRED_FIELDS.includes("previous_school_attended"));
  assert.equal(validated.application_special_aptitudes, "Synthetic answer 1");
  const split = splitApplication(validated, "app-synthetic", 1, 2);
  assert.equal(split.conditions.application_mentoring_value, "No");
  assert.equal(split.student.previous_school_attended, undefined);
});

test("V14 requires a month-and-year Medicare expiry and a positive other-child count", () => {
  const values = validV7Application();
  delete values.previous_school_attended;
  Object.assign(values, {
    future_siblings: "Yes",
    future_sibling_count: "2",
    medicare_expiry: "2030-06"
  });
  const validated = validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.14");
  assert.ok(APPLICATION_V14_REQUIRED_FIELDS.includes("medicare_expiry"));
  assert.equal(validated.medicare_expiry, "2030-06");

  values.medicare_expiry = "2030-06-30";
  values.future_sibling_count = "7+";
  assert.throws(
    () => validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.14"),
    error => error.details.missing.includes("medicare_expiry:invalid") && error.details.missing.includes("future_sibling_count:invalid")
  );
});

test("V8 survey answers remain optional", () => {
  const values = validV7Application();
  delete values.previous_school_attended;
  for (const field of APPLICATION_SURVEY_FIELDS) delete values[field];
  assert.equal(validateApplicationForSubmission(values, 1, 2, "rosewood-application-2026.8").student_first, "Synthetic");
});
