import assert from "node:assert/strict";
import test from "node:test";
import { APPLICATION_REQUIRED_FIELDS, CONTACT_PERMISSION_NO, CONTACT_PERMISSION_YES, sanitizeApplication, validateApplicationForSubmission, validateEoi } from "../schema.mjs";

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
