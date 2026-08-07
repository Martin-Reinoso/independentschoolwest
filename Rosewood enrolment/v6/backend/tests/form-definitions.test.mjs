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
});

test("legacy records resolve to the current workflow contract without changing answers", () => {
  const reference = recordFormReference({ schemaVersion: "legacy-schema", values: { retired_question: "retained" } }, "application");
  assert.equal(reference.formVersion, CURRENT_FORM_VERSIONS.application);
  assert.equal(reference.formDefinitionHash, currentFormDefinition("application").definitionHash);
  assert.equal(reference.schemaVersion, "legacy-schema");
});
