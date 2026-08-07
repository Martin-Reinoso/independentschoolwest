import crypto from "node:crypto";
import {
  APPLICATION_FIELD_PREFIXES,
  APPLICATION_REQUIRED_FIELDS,
  APPLICATION_STATIC_FIELDS,
  APPLICATION_V7_REQUIRED_FIELDS,
  APPLICATION_V7_STATIC_FIELDS,
  EOI_FIELDS,
  EOI_REQUIRED,
  SCHEMA_VERSION
} from "./schema.mjs";

export const CURRENT_FORM_VERSIONS = Object.freeze({
  eoi: "rosewood-eoi-2026.7",
  application: "rosewood-application-2026.7"
});

const LEGACY_SCHEMA_VERSION = "rosewood-v6-2026-08-05";
const V6_SCHEMA_VERSION = "rosewood-v6-2026-08-08-contact-permission";

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

const v5FrontendAssetHashes = freeze({
  "pages/rosewood-enrolment-v6.html": "66802dde73b6bc5cbddca4eded58223e6f211decc707cf9299a5c7fae426d86f",
  "pages/rosewood-enrolment-v6.js": "77f741579f649ea0caba76bd2336b03c36d15863703b55adf76ee91c9de77844",
  "pages/rosewood-enrolment-v6.css": "0848d71ab246d03dce47dd1515f699a7857c4db8ffe9a6d83354f36e86ee31d7",
  "pages/rosewood-enrolment-policies-v6.js": "8bf2abedcf2b9aa70e6ff55b3d837a96604dc06784d8f46b68b637056a4ce095",
  "pages/rosewood-policies/enrolment-policy-rosewood-college.docx": "e4f59b3928a36f98dc38392ca33ddef599bdca4be7c84eefa6a23dac5d91ca2a",
  "pages/rosewood-policies/enrolment-policy-rosewood-college.pdf": "6b2d99d805ca87c71c4a774d07320786517b023ca6a82421fe18d060a6dd2f3d",
  "pages/rosewood-policies/enrolment-procedure-rosewood-college.docx": "042abe1f25ccd8acfc640365ca3cfc4aaa5eb6ea5b25576e5d407e0d7778066f",
  "pages/rosewood-policies/enrolment-procedure-rosewood-college.pdf": "88d011503e2184130d1a33ee3d6a074cd5d192ccf1da3a3f0a8a4700d2ce3097",
  "pages/rosewood-policies/privacy-policy-rosewood-college.docx": "f0cde7768b7ab470a41f95885f409797aacb9f3154cc2e58332144aaa6f26823",
  "pages/rosewood-policies/privacy-policy-rosewood-college.pdf": "cb7fa03cd8be070c3b31a6d48e1498f18a36b73f327d6d03bda5efc1bf348b99"
});

const eoi2026v1 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.1",
  schemaVersion: LEGACY_SCHEMA_VERSION,
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
  formVersion: "rosewood-eoi-2026.2",
  schemaVersion: LEGACY_SCHEMA_VERSION,
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

const eoi2026v3 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.3",
  schemaVersion: LEGACY_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js13-css8",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "0a6e9e91f41e5718138dc2772aa8a025a753f1d7c919c45379a313e53384f0c1",
      "pages/rosewood-enrolment-v6.js": "56de99e7b1ab9b58320fd29ca23df2ce1e3119e5906cbd1b4317171bc0a7c384"
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

const eoi2026v4 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.4",
  schemaVersion: LEGACY_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js14-css9",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "2cf713664c75e30dd631651d351e94c1368c967edaf08acde7c8012f159bb1c6",
      "pages/rosewood-enrolment-v6.js": "ad216fff622a5cf122ac0d57095cb770715dc760652a1e152db8aa3f18fb569c"
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

const eoi2026v5 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.5",
  schemaVersion: LEGACY_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js15-css10-policy1",
    frontendAssetHashes: v5FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v4.contract
});

const application2026v1 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.1",
  schemaVersion: LEGACY_SCHEMA_VERSION,
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
  formVersion: "rosewood-application-2026.2",
  schemaVersion: LEGACY_SCHEMA_VERSION,
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

const application2026v3 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.3",
  schemaVersion: LEGACY_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js13-css8",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "0a6e9e91f41e5718138dc2772aa8a025a753f1d7c919c45379a313e53384f0c1",
      "pages/rosewood-enrolment-v6.js": "56de99e7b1ab9b58320fd29ca23df2ce1e3119e5906cbd1b4317171bc0a7c384"
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

const application2026v4 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.4",
  schemaVersion: LEGACY_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js14-css9",
    frontendAssetHashes: {
      "pages/rosewood-enrolment-v6.html": "2cf713664c75e30dd631651d351e94c1368c967edaf08acde7c8012f159bb1c6",
      "pages/rosewood-enrolment-v6.js": "ad216fff622a5cf122ac0d57095cb770715dc760652a1e152db8aa3f18fb569c"
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

const application2026v5 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.5",
  schemaVersion: LEGACY_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js15-css10-policy1",
    frontendAssetHashes: v5FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v4.contract
});

const v6FrontendAssetHashes = freeze({
  "pages/rosewood-enrolment-v6.html": "4aca040809f958c94327aa466cf0da14805237ee13bdbae6a4fd30eb1e5f2dc5",
  "pages/rosewood-enrolment-v6.js": "71010e9e9d223404c8c38778b6ddc39729d286ec3e45dd10af2a21c750c2f28f",
  "pages/rosewood-enrolment-v6.css": "bd39de88daf238117420909c90d09767a7f2186dfda2a62ec86aac57dfdbe71b",
  "pages/rosewood-enrolment-admin-v6.html": "123619ac62efbe9aef6239b443e7fc68f801da0a7c406d3082dc88e7101bd00d",
  "pages/rosewood-enrolment-admin-v6.js": "da573dec2d36dad58f8c55e529aa8c4670d0a2324f3d467a395122149dc1d08b",
  "pages/rosewood-enrolment-admin-v6.css": "f78a0983c0a03a01421f4b268cd94646b26d1e7e9b464c10c92ef47d82d09bbd",
  "pages/rosewood-application-sign-v6.html": "1a0b9025ab8a13e7dceafe3956dbcfe21835259363763262e08417684a5c1bb7",
  "pages/rosewood-application-sign-v6.js": "37e6bcba94a1db59906abdfbf096cb45bdeda702a5973f35a751bf69094e0ff4",
  "pages/rosewood-application-sign-v6.css": "ed34d10e52ef688f3c58ab9464c66528e7095f378fd74e9f090af8e04c3e403a",
  "pages/rosewood-enrolment-policies-v6.js": "8bf2abedcf2b9aa70e6ff55b3d837a96604dc06784d8f46b68b637056a4ce095",
  "pages/rosewood-policies/enrolment-policy-rosewood-college.docx": "e4f59b3928a36f98dc38392ca33ddef599bdca4be7c84eefa6a23dac5d91ca2a",
  "pages/rosewood-policies/enrolment-policy-rosewood-college.pdf": "6b2d99d805ca87c71c4a774d07320786517b023ca6a82421fe18d060a6dd2f3d",
  "pages/rosewood-policies/enrolment-procedure-rosewood-college.docx": "042abe1f25ccd8acfc640365ca3cfc4aaa5eb6ea5b25576e5d407e0d7778066f",
  "pages/rosewood-policies/enrolment-procedure-rosewood-college.pdf": "88d011503e2184130d1a33ee3d6a074cd5d192ccf1da3a3f0a8a4700d2ce3097",
  "pages/rosewood-policies/privacy-policy-rosewood-college.docx": "f0cde7768b7ab470a41f95885f409797aacb9f3154cc2e58332144aaa6f26823",
  "pages/rosewood-policies/privacy-policy-rosewood-college.pdf": "cb7fa03cd8be070c3b31a6d48e1498f18a36b73f327d6d03bda5efc1bf348b99"
});

const eoi2026v6 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.6",
  schemaVersion: V6_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js17-css11-contact-permission",
    frontendAssetHashes: v6FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v5.contract
});

const application2026v6 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.6",
  schemaVersion: V6_SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js17-css11-contact-permission",
    frontendAssetHashes: v6FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: {
    ...application2026v5.contract,
    contactPermission: {
      field: "app_guardian_{index}_permission",
      values: ["Yes, the school may contact this person", "No, do not contact this person"],
      explicit: true,
      signatureRequestSuppressedWhenProhibited: true
    },
    conditionalRules: [
      ...application2026v5.contract.conditionalRules,
      { when: { field: "app_guardian_{index}_permission", equals: "Yes, the school may contact this person" }, required: ["app_guardian_{index}_email", "application_additional_signature_later"] },
      { when: { field: "app_guardian_{index}_permission", equals: "No, do not contact this person" }, required: ["application_one_signature_reason"] }
    ]
  }
});

const v7FrontendAssetHashes = freeze({
  "pages/rosewood-enrolment-v5.css": "ca05a7270013368efe0e13bb39c8417518e13430372f926b5959fe0b6e1fe881",
  "pages/rosewood-enrolment-v6.html": "d3e331337807ed5dacdb324819fcb95eef526ab865ebbc40c371b0128c856451",
  "pages/rosewood-enrolment-v6.js": "e674b1e858739b6234abc3a03b271fce1884bb62cd624b41633cfb6f454adbce",
  "pages/rosewood-enrolment-v6.css": "1dc83d8926142bed0a12e4e18ea81ab6d3c7f659c6658de2cb8fd9c1ec799be5",
  "pages/rosewood-enrolment-languages.js": "7dccdcbdef9a218290de171bb55c19354bfdb3b6821b86cf139854ca8e68d273",
  "pages/rosewood-enrolment-admin-v6.html": "d12ce354ede41811e001ef9476fd2af071e7be5920c6fea98d394caba33385e8",
  "pages/rosewood-enrolment-admin-v6.js": "51978e9825e5b0e3e88b27fa6f7505f496030cbb7c4d804c027d2fefdf12bd72",
  "pages/rosewood-enrolment-admin-v6.css": "85d0cb251ea6e467be6d068ebf7d15f18c8b3fb7f919c36a26050bfbee83f19f",
  "pages/rosewood-application-sign-v6.html": "ac7fa672b95755b08cb177bc2187d6c9364ed437bc795b775a1a3a9f5af262cc",
  "pages/rosewood-application-sign-v6.js": "35ac3e7e6886f4f7cb561c909b2e401e2356ef709e699b5017dc8b469855cb4a",
  "pages/rosewood-application-sign-v6.css": "ed34d10e52ef688f3c58ab9464c66528e7095f378fd74e9f090af8e04c3e403a",
  "pages/rosewood-enrolment-policies-v6.js": "8bf2abedcf2b9aa70e6ff55b3d837a96604dc06784d8f46b68b637056a4ce095",
  "pages/rosewood-policies/enrolment-policy-rosewood-college.docx": "e4f59b3928a36f98dc38392ca33ddef599bdca4be7c84eefa6a23dac5d91ca2a",
  "pages/rosewood-policies/enrolment-policy-rosewood-college.pdf": "6b2d99d805ca87c71c4a774d07320786517b023ca6a82421fe18d060a6dd2f3d",
  "pages/rosewood-policies/enrolment-procedure-rosewood-college.docx": "042abe1f25ccd8acfc640365ca3cfc4aaa5eb6ea5b25576e5d407e0d7778066f",
  "pages/rosewood-policies/enrolment-procedure-rosewood-college.pdf": "88d011503e2184130d1a33ee3d6a074cd5d192ccf1da3a3f0a8a4700d2ce3097",
  "pages/rosewood-policies/privacy-policy-rosewood-college.docx": "f0cde7768b7ab470a41f95885f409797aacb9f3154cc2e58332144aaa6f26823",
  "pages/rosewood-policies/privacy-policy-rosewood-college.pdf": "cb7fa03cd8be070c3b31a6d48e1498f18a36b73f327d6d03bda5efc1bf348b99"
});

const eoi2026v7 = complete({
  workflow: "eoi",
  formVersion: CURRENT_FORM_VERSIONS.eoi,
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js18-css12-form-v7",
    frontendAssetHashes: v7FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v6.contract
});

const application2026v7 = complete({
  workflow: "application",
  formVersion: CURRENT_FORM_VERSIONS.application,
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js18-css12-form-v7",
    frontendAssetHashes: v7FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: {
    fieldPrefixes: APPLICATION_FIELD_PREFIXES,
    staticFields: APPLICATION_V7_STATIC_FIELDS,
    requiredFields: APPLICATION_V7_REQUIRED_FIELDS,
    repeatedGroups: application2026v6.contract.repeatedGroups,
    contactPermission: application2026v6.contract.contactPermission,
    conditionalRules: [
      { when: { field: "student_religion", equals: "Other" }, required: ["student_religion_other"] },
      { when: { field: "current_school", equals: "Other" }, required: ["current_school_other"] },
      { when: { field: "previous_school_attended", equals: "Yes" }, required: ["previous_school_name", "previous_school_year_level"] },
      { when: { field: "interrupted_schooling", equals: "Yes" }, required: ["interrupted_schooling_details"] },
      { when: { field: "future_siblings", equals: "Yes" }, required: ["future_sibling_count"] },
      { when: { field: "australian_citizen", equals: "No" }, required: ["residency_evidence"] },
      { when: { field: "formal_assessment", equals: "Yes" }, required: ["formal_assessment_details", "formal_assessment_report"] },
      { when: { field: "additional_needs", equals: "Yes" }, required: ["need_categories"] },
      { when: { field: "healthcare_card", equals: "Yes" }, required: ["student_healthcare_number", "student_healthcare_expiry"] },
      ...application2026v6.contract.conditionalRules.slice(-2)
    ]
  }
});

export const FORM_DEFINITIONS = freeze({
  eoi: { [eoi2026v1.formVersion]: eoi2026v1, [eoi2026v2.formVersion]: eoi2026v2, [eoi2026v3.formVersion]: eoi2026v3, [eoi2026v4.formVersion]: eoi2026v4, [eoi2026v5.formVersion]: eoi2026v5, [eoi2026v6.formVersion]: eoi2026v6, [eoi2026v7.formVersion]: eoi2026v7 },
  application: { [application2026v1.formVersion]: application2026v1, [application2026v2.formVersion]: application2026v2, [application2026v3.formVersion]: application2026v3, [application2026v4.formVersion]: application2026v4, [application2026v5.formVersion]: application2026v5, [application2026v6.formVersion]: application2026v6, [application2026v7.formVersion]: application2026v7 }
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
