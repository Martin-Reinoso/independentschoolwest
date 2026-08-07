import crypto from "node:crypto";
import {
  APPLICATION_FIELD_PREFIXES,
  APPLICATION_REQUIRED_FIELDS,
  APPLICATION_STATIC_FIELDS,
  EOI_FIELDS,
  EOI_REQUIRED,
  SCHEMA_VERSION
} from "./schema.mjs";

export const CURRENT_FORM_VERSIONS = Object.freeze({
  eoi: "rosewood-eoi-2026.2",
  application: "rosewood-application-2026.2"
});

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

export function definitionHash(definition) {
  return crypto.createHash("sha256").update(canonicalJson(definition), "utf8").digest("hex");
}

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function complete(definition) {
  const immutableDefinition = canonical(definition);
  return freeze({ ...immutableDefinition, definitionHash: definitionHash(immutableDefinition) });
}

const eoi2026v1 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.1",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js11-css6",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "3da970686fcadaf857a362158e90d5b79518ae3bcc270c9e34ee667993b9643f",
      "pages/rosewood-enrolment-v6.js": "f115503d405ebd546183968d3db71c5135baf211467c920c00911c7b55841f71"
    },
    validator: "schema.mjs#validateEoi"
  },
  contract: {
    fields: EOI_FIELDS,
    requiredFields: EOI_REQUIRED,
    conditionalRules: [
      { when: { field: "eoi_needs", equals: "Yes" }, required: ["eoi_need_category"] }
    ]
  }
});

const eoi2026v2 = complete({
  workflow: "eoi",
  formVersion: CURRENT_FORM_VERSIONS.eoi,
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js12-css7",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "cecc8b37c3f2b2cfdedd998e7efec6ed4edbc7f9933553a6a188df9b089f36ea",
      "pages/rosewood-enrolment-v6.js": "cf8f8caa5d3695e56519f607887dc709594f37d170af22778a2f0e0fd1892557"
    },
    validator: "schema.mjs#validateEoi"
  },
  contract: {
    fields: EOI_FIELDS,
    requiredFields: EOI_REQUIRED,
    conditionalRules: [
      { when: { field: "eoi_needs", equals: "Yes" }, required: ["eoi_need_category"] }
    ]
  }
});

const application2026v1 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.1",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js11-css6",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "3da970686fcadaf857a362158e90d5b79518ae3bcc270c9e34ee667993b9643f",
      "pages/rosewood-enrolment-v6.js": "f115503d405ebd546183968d3db71c5135baf211467c920c00911c7b55841f71"
    },
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: {
    fieldPrefixes: APPLICATION_FIELD_PREFIXES,
    staticFields: APPLICATION_STATIC_FIELDS,
    requiredFields: APPLICATION_REQUIRED_FIELDS,
    repeatedGroups: {
      guardians: { prefix: "app_guardian_{index}_", minimum: 1, maximum: 6 },
      emergencyContacts: { prefix: "emergency_{index}_", minimum: 2, maximum: 6 }
    },
    conditionalRules: [
      { when: { field: "student_religion", equals: "Other" }, required: ["student_religion_other"] },
      { when: { field: "current_school", equals: "Other" }, required: ["current_school_other"] },
      { when: { field: "future_siblings", equals: "Yes" }, required: ["future_sibling_count"] },
      { when: { field: "australian_citizen", equals: "No" }, required: ["residency_evidence"] },
      { when: { field: "additional_needs", equals: "Yes" }, required: ["need_categories"] },
      { when: { field: "fee_option", equals: "Both Parents / Guardian" }, required: ["fee_both_nominee", "fee_both_date"] },
      { when: { field: "fee_option", equals: "One Parent / Guardian" }, required: ["fee_one_nominee", "fee_one_date"] }
    ]
  }
});

const application2026v2 = complete({
  workflow: "application",
  formVersion: CURRENT_FORM_VERSIONS.application,
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js12-css7",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "cecc8b37c3f2b2cfdedd998e7efec6ed4edbc7f9933553a6a188df9b089f36ea",
      "pages/rosewood-enrolment-v6.js": "cf8f8caa5d3695e56519f607887dc709594f37d170af22778a2f0e0fd1892557"
    },
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: {
    fieldPrefixes: APPLICATION_FIELD_PREFIXES,
    staticFields: APPLICATION_STATIC_FIELDS,
    requiredFields: APPLICATION_REQUIRED_FIELDS,
    repeatedGroups: {
      guardians: { prefix: "app_guardian_{index}_", minimum: 1, maximum: 6 },
      emergencyContacts: { prefix: "emergency_{index}_", minimum: 2, maximum: 6 }
    },
    conditionalRules: [
      { when: { field: "student_religion", equals: "Other" }, required: ["student_religion_other"] },
      { when: { field: "current_school", equals: "Other" }, required: ["current_school_other"] },
      { when: { field: "future_siblings", equals: "Yes" }, required: ["future_sibling_count"] },
      { when: { field: "australian_citizen", equals: "No" }, required: ["residency_evidence"] },
      { when: { field: "additional_needs", equals: "Yes" }, required: ["need_categories"] },
      { when: { field: "fee_option", equals: "Both Parents / Guardian" }, required: ["fee_both_nominee", "fee_both_date"] },
      { when: { field: "fee_option", equals: "One Parent / Guardian" }, required: ["fee_one_nominee", "fee_one_date"] }
    ]
  }
});

export const FORM_DEFINITIONS = freeze({
  eoi: { [eoi2026v1.formVersion]: eoi2026v1, [eoi2026v2.formVersion]: eoi2026v2 },
  application: { [application2026v1.formVersion]: application2026v1, [application2026v2.formVersion]: application2026v2 }
});

export function getFormDefinition(workflow, formVersion = CURRENT_FORM_VERSIONS[workflow]) {
  return FORM_DEFINITIONS[workflow]?.[formVersion] || null;
}

export function currentFormDefinition(workflow) {
  return getFormDefinition(workflow, CURRENT_FORM_VERSIONS[workflow]);
}

export function recordFormReference(record, workflow) {
  const formVersion = record?.formVersion || CURRENT_FORM_VERSIONS[workflow];
  const definition = getFormDefinition(workflow, formVersion);
  if (!definition) return { formVersion, formDefinitionHash: record?.formDefinitionHash || "", schemaVersion: record?.schemaVersion || "" };
  return {
    formVersion,
    formDefinitionHash: record?.formDefinitionHash || definition.definitionHash,
    schemaVersion: record?.schemaVersion || definition.schemaVersion
  };
}
