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

test("legacy records resolve to the current workflow contract without changing answers", () => {
  const reference = recordFormReference({ schemaVersion: "legacy-schema", values: { retired_question: "retained" } }, "application");
  assert.equal(reference.formVersion, CURRENT_FORM_VERSIONS.application);
  assert.equal(reference.formDefinitionHash, currentFormDefinition("application").definitionHash);
  assert.equal(reference.schemaVersion, "legacy-schema");
});
