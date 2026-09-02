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
    assert.equal(Object.keys(hashes).length, 21);
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

test("the current release keeps earlier contracts addressable and changes only pinned release interfaces", () => {
  const previous = getFormDefinition("application", "rosewood-application-2026.10");
  const v11 = getFormDefinition("application", "rosewood-application-2026.11");
  const v12 = getFormDefinition("application", "rosewood-application-2026.12");
  const v13 = getFormDefinition("application", "rosewood-application-2026.13");
  const v14 = getFormDefinition("application", "rosewood-application-2026.14");
  const v15 = getFormDefinition("application", "rosewood-application-2026.15");
  const v16 = getFormDefinition("application", "rosewood-application-2026.16");
  const v17 = getFormDefinition("application", "rosewood-application-2026.17");
  const v18 = getFormDefinition("application", "rosewood-application-2026.18");
  const v19 = getFormDefinition("application", "rosewood-application-2026.19");
  const v20 = getFormDefinition("application", "rosewood-application-2026.20");
  const v21 = getFormDefinition("application", "rosewood-application-2026.21");
  const v22 = getFormDefinition("application", "rosewood-application-2026.22");
  const v23 = getFormDefinition("application", "rosewood-application-2026.23");
  const v24 = getFormDefinition("application", "rosewood-application-2026.24");
  const current = currentFormDefinition("application");
  const previousEoi = getFormDefinition("eoi", "rosewood-eoi-2026.10");
  const v11Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.11");
  const v12Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.12");
  const v13Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.13");
  const v14Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.14");
  const v15Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.15");
  const v16Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.16");
  const v17Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.17");
  const v18Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.18");
  const v19Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.19");
  const v20Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.20");
  const v21Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.21");
  const v22Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.22");
  const v23Eoi = getFormDefinition("eoi", "rosewood-eoi-2026.23");
  const currentEoi = currentFormDefinition("eoi");
  assert.equal(previous.formVersion, "rosewood-application-2026.10");
  assert.equal(v11.formVersion, "rosewood-application-2026.11");
  assert.equal(v12.formVersion, "rosewood-application-2026.12");
  assert.equal(v13.formVersion, "rosewood-application-2026.13");
  assert.equal(v14.formVersion, "rosewood-application-2026.14");
  assert.equal(v15.formVersion, "rosewood-application-2026.15");
  assert.equal(v16.formVersion, "rosewood-application-2026.16");
  assert.equal(v17.formVersion, "rosewood-application-2026.17");
  assert.equal(v18.formVersion, "rosewood-application-2026.18");
  assert.equal(v19.formVersion, "rosewood-application-2026.19");
  assert.equal(v20.formVersion, "rosewood-application-2026.20");
  assert.equal(v21.formVersion, "rosewood-application-2026.21");
  assert.equal(v22.formVersion, "rosewood-application-2026.22");
  assert.equal(v23.formVersion, "rosewood-application-2026.23");
  assert.equal(v24.formVersion, "rosewood-application-2026.24");
  assert.equal(current.formVersion, "rosewood-application-2026.26");
  assert.deepEqual(v13.contract, previous.contract);
  assert.deepEqual(v13.contract, v11.contract);
  assert.deepEqual(v13.contract, v12.contract);
  assert.deepEqual(v14.contract.fields, v13.contract.fields);
  assert.deepEqual(v14.contract.conditionalRules, v13.contract.conditionalRules);
  assert.deepEqual(v15.contract, v14.contract);
  assert.deepEqual(v16.contract, v15.contract);
  assert.deepEqual(v17.contract, v16.contract);
  assert.deepEqual(v18.contract, v17.contract);
  assert.deepEqual(v19.contract, v18.contract);
  assert.deepEqual(v20.contract, v19.contract);
  assert.deepEqual(v21.contract, v20.contract);
  assert.deepEqual(current.contract, v21.contract);
  assert.ok(current.contract.requiredFields.includes("medicare_expiry"));
  assert.ok(!v13.contract.requiredFields.includes("medicare_expiry"));
  assert.equal(v11Eoi.formVersion, "rosewood-eoi-2026.11");
  assert.equal(v12Eoi.formVersion, "rosewood-eoi-2026.12");
  assert.equal(v13Eoi.formVersion, "rosewood-eoi-2026.13");
  assert.equal(v14Eoi.formVersion, "rosewood-eoi-2026.14");
  assert.equal(v15Eoi.formVersion, "rosewood-eoi-2026.15");
  assert.equal(v16Eoi.formVersion, "rosewood-eoi-2026.16");
  assert.equal(v17Eoi.formVersion, "rosewood-eoi-2026.17");
  assert.equal(v18Eoi.formVersion, "rosewood-eoi-2026.18");
  assert.equal(v19Eoi.formVersion, "rosewood-eoi-2026.19");
  assert.equal(v20Eoi.formVersion, "rosewood-eoi-2026.20");
  assert.equal(v21Eoi.formVersion, "rosewood-eoi-2026.21");
  assert.equal(v22Eoi.formVersion, "rosewood-eoi-2026.22");
  assert.equal(v23Eoi.formVersion, "rosewood-eoi-2026.23");
  assert.equal(currentEoi.formVersion, "rosewood-eoi-2026.25");
  assert.deepEqual(currentEoi.contract, previousEoi.contract);
  assert.deepEqual(currentEoi.contract, v11Eoi.contract);
  assert.deepEqual(currentEoi.contract, v12Eoi.contract);
  assert.deepEqual(currentEoi.contract, v13Eoi.contract);
  assert.deepEqual(currentEoi.contract, v14Eoi.contract);
  assert.deepEqual(currentEoi.contract, v15Eoi.contract);
  assert.deepEqual(currentEoi.contract, v17Eoi.contract);
  assert.deepEqual(currentEoi.contract, v18Eoi.contract);
  assert.deepEqual(currentEoi.contract, v19Eoi.contract);
  assert.deepEqual(currentEoi.contract, v20Eoi.contract);
  assert.ok(!current.contract.requiredFields.includes("previous_school_attended"));
  assert.deepEqual(current.contract.retiredInterfaceFields, ["previous_school_attended", "previous_school_name", "previous_school_year_level"]);
  assert.equal(current.contract.optionalSurveyFields.length, 11);
});
