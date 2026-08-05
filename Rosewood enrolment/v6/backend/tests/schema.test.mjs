import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeApplication, validateEoi } from "../schema.mjs";

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
