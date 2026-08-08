import assert from "node:assert/strict";
import test from "node:test";
import { CURRENT_FORM_VERSIONS, currentFormDefinition, definitionHash, getFormDefinition, recordFormReference } from "../form-definitions.mjs";

test("workflow definitions are immutable, addressable contracts", () => {
  for (const workflow of ["eoi", "application"]) {
    const definition = currentFormDefinition(workflow);
    assert.equal(definition.formVersion, CURRENT_FORM_VERSIONS[workflow]);
    assert.equal(getFormDefinition(workflow, definition.formVersion), definition);
    assert.equal(definition.definitionHash.length, 64);
    assert.ok(Object.isFrozen(definition));
    assert.ok(Object.isFrozen(definition.contract));
  }
});

test("definition hashes are stable regardless of object key ordering", () => {
  assert.equal(definitionHash({ b: 2, a: { d: 4, c: 3 } }), definitionHash({ a: { c: 3, d: 4 }, b: 2 }));
});

test("the launch contracts remain addressable with their original hashes", () => {
  assert.equal(getFormDefinition("eoi", "rosewood-eoi-2026.1").definitionHash, "ada72bcafedfd2ccdd7058a545a3ff44b1ed0916c5d1c9e7d7d639d85ef2d633");
  assert.equal(getFormDefinition("application", "rosewood-application-2026.1").definitionHash, "110e0d4afeb3bb131d4372c27ced3f05aa0984d3050bf789cfe6cc9f52b215c8");
  assert.equal(getFormDefinition("eoi", "rosewood-eoi-2026.2").definitionHash, "cd6ac14d0dbfef137bf29c704e75df8ccddb054af1bf3cf95756e86a7ec27bd4");
  assert.equal(getFormDefinition("application", "rosewood-application-2026.2").definitionHash, "2e3340b08eb416d2557d9f6037c4783dd1ae4d75f8933ff269dd62ab85efcf18");
  assert.equal(getFormDefinition("eoi", "rosewood-eoi-2026.3").definitionHash, "cb14ce24b9cfb2be599f4a545123182ebd483feb71af8a2cb1c4be79836eb5b8");
  assert.equal(getFormDefinition("application", "rosewood-application-2026.3").definitionHash, "51db852d22dc1ea8723b77cbc440be0f9c047ad7f94abb8c21a949036dbf65bf");
  assert.equal(getFormDefinition("eoi", "rosewood-eoi-2026.4").definitionHash, "e73021e53fb5b52566b95ca27dd25b134785050b852d8722d81d76012d5d6560");
  assert.equal(getFormDefinition("application", "rosewood-application-2026.4").definitionHash, "582a03e0cf4fdab80f1548cc23b48fc5d04a1accceb44f1289c627ddecc7e74b");
  assert.equal(getFormDefinition("eoi", "rosewood-eoi-2026.5").definitionHash, "f95e94056ea537a4ab918207f5cd96f6668c5ea61a0eec0e22747a0e3a064f3d");
  assert.equal(getFormDefinition("application", "rosewood-application-2026.5").definitionHash, "f7cfb4de813c69b9fc5ff15a195274be84667bc41e60cc2ca148ad7542e89885");
});

test("the current contracts pin every policy-reader release asset", () => {
  for (const workflow of ["eoi", "application"]) {
    const hashes = currentFormDefinition(workflow).source.frontendAssetHashes;
    assert.equal(Object.keys(hashes).length, 18);
    assert.equal(hashes["pages/rosewood-enrolment-languages.js"], "7dccdcbdef9a218290de171bb55c19354bfdb3b6821b86cf139854ca8e68d273");
    assert.equal(hashes["pages/rosewood-enrolment-v5.css"], "ca05a7270013368efe0e13bb39c8417518e13430372f926b5959fe0b6e1fe881");
    assert.equal(hashes["pages/rosewood-enrolment-policies-v6.js"], "8bf2abedcf2b9aa70e6ff55b3d837a96604dc06784d8f46b68b637056a4ce095");
    assert.equal(hashes["pages/rosewood-policies/privacy-policy-rosewood-college.docx"], "f0cde7768b7ab470a41f95885f409797aacb9f3154cc2e58332144aaa6f26823");
  }
});

test("legacy records resolve to the current workflow contract without changing answers", () => {
  const reference = recordFormReference({ schemaVersion: "legacy-schema", values: { retired_question: "retained" } }, "application");
  assert.equal(reference.formVersion, CURRENT_FORM_VERSIONS.application);
  assert.equal(reference.formDefinitionHash, currentFormDefinition("application").definitionHash);
  assert.equal(reference.schemaVersion, "legacy-schema");
});

test("V8 keeps V7 addressable while retiring only the previous-education interface", () => {
  const previous = getFormDefinition("application", "rosewood-application-2026.7");
  const current = currentFormDefinition("application");
  assert.equal(previous.formVersion, "rosewood-application-2026.7");
  assert.equal(current.formVersion, "rosewood-application-2026.8");
  assert.ok(previous.contract.requiredFields.includes("previous_school_attended"));
  assert.ok(!current.contract.requiredFields.includes("previous_school_attended"));
  assert.deepEqual(current.contract.retiredInterfaceFields, ["previous_school_attended", "previous_school_name", "previous_school_year_level"]);
  assert.equal(current.contract.optionalSurveyFields.length, 11);
});
