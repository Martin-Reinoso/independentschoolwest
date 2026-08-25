import crypto from "node:crypto";
import {
  APPLICATION_FIELD_PREFIXES,
  APPLICATION_REQUIRED_FIELDS,
  APPLICATION_STATIC_FIELDS,
  APPLICATION_V7_REQUIRED_FIELDS,
  APPLICATION_V7_STATIC_FIELDS,
  APPLICATION_V8_REQUIRED_FIELDS,
  APPLICATION_V8_STATIC_FIELDS,
  APPLICATION_V14_REQUIRED_FIELDS,
  APPLICATION_SURVEY_FIELDS,
  EOI_FIELDS,
  EOI_REQUIRED,
  SCHEMA_VERSION
} from "./schema.mjs";

export const CURRENT_FORM_VERSIONS = Object.freeze({
  eoi: "rosewood-eoi-2026.16",
  application: "rosewood-application-2026.17"
});

const LEGACY_SCHEMA_VERSION = "rosewood-v6-2026-08-05";
const V6_SCHEMA_VERSION = "rosewood-v6-2026-08-08-contact-permission";
const V7_SCHEMA_VERSION = "rosewood-v6-2026-08-08-form-v7";

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
  formVersion: "rosewood-eoi-2026.7",
  schemaVersion: V7_SCHEMA_VERSION,
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
  formVersion: "rosewood-application-2026.7",
  schemaVersion: V7_SCHEMA_VERSION,
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

const v8FrontendAssetHashes = freeze({
  ...v7FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "f3a372080e6c6eabf08ae32255d1e0e03be84628bd7287aa6b6ef6f22255a14d",
  "pages/rosewood-enrolment-v6.js": "08f3c3024415a9271159399b01d88fab63c99219a68d1865a5a45bb96fea4d29",
  "pages/rosewood-enrolment-v6.css": "2b7e8f95dfd32329f719271e722c49c5edeb922e5eba8fd61ad0ba67f5b15e20"
});

const eoi2026v8 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.8",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js19-css13-form-v8",
    frontendAssetHashes: v8FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v7.contract
});

const application2026v8 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.8",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js19-css13-form-v8",
    frontendAssetHashes: v8FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: {
    fieldPrefixes: APPLICATION_FIELD_PREFIXES,
    staticFields: APPLICATION_V8_STATIC_FIELDS,
    requiredFields: APPLICATION_V8_REQUIRED_FIELDS,
    optionalSurveyFields: APPLICATION_SURVEY_FIELDS,
    retiredInterfaceFields: ["previous_school_attended", "previous_school_name", "previous_school_year_level"],
    repeatedGroups: application2026v7.contract.repeatedGroups,
    contactPermission: application2026v7.contract.contactPermission,
    conditionalRules: application2026v7.contract.conditionalRules.filter(rule => rule.when?.field !== "previous_school_attended")
  }
});

const v9FrontendAssetHashes = freeze({
  ...v8FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "e30fed23f1291ce61a151627c27f17110fdfb076d18140f015c4d873280bde05",
  "pages/rosewood-enrolment-v6.js": "785d9bcbea60ff4e67e774c899346c89e056d913d1631f79bc88e0e809241f85",
  "pages/rosewood-enrolment-v6.css": "f8d821e159ea55d77ce03d8e00cd4e3fc3d2f6a606bbb9f2c3c618facb2dff22"
});

const eoi2026v9 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.9",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js20-css14-form-v9",
    frontendAssetHashes: v9FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v8.contract
});

const application2026v9 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.9",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-08",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js20-css14-form-v9",
    frontendAssetHashes: v9FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v8.contract
});

const v10FrontendAssetHashes = freeze({
  ...v9FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.js": "b06e9625b0ef26560243fdc72efa27414bc2314d555b2dd1210e292fd6bdfdb4"
});

const eoi2026v10 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.10",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-09",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js21-css14-form-v10",
    frontendAssetHashes: v10FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v9.contract
});

const application2026v10 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.10",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-09",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js21-css14-form-v10",
    frontendAssetHashes: v10FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v9.contract
});

const v11FrontendAssetHashes = freeze({
  ...v10FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.js": "5cba48f5b6479c91302b6b74f60b57cdbbad86147bf00ed3f31f040e7c8e8b27"
});

const eoi2026v11 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.11",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-13",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js22-css14-form-v11",
    frontendAssetHashes: v11FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v10.contract
});

const application2026v11 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.11",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-13",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js22-css14-form-v11",
    frontendAssetHashes: v11FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v10.contract
});

const v12FrontendAssetHashes = freeze({
  ...v11FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "b8c2485d84726ed730b29647fea6b783f146c78c2d5a242666ac7c8533ab51c8",
  "pages/rosewood-enrolment-v6.js": "ed7d2d2cfd2c1708c7c33a1f463d677a9c464b4046fbbd3aed67fe831955268c",
  "pages/rosewood-enrolment-v6.css": "552c6f5c70b9027c3858d64982920a03137347788be1af802749caab9a939bd1"
});

const eoi2026v12 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.12",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-14",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js23-css15-form-v12",
    frontendAssetHashes: v12FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v11.contract
});

const application2026v12 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.12",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-14",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js23-css15-form-v12",
    frontendAssetHashes: v12FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v11.contract
});

const v13FrontendAssetHashes = freeze({
  ...v12FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "7a0b03851fd371997c459b2552a4b7201f4f11891b18d3862f996fd79396d25c",
  "pages/rosewood-enrolment-v6.js": "8224a86b88e2808bddb6c836a434e41e770288394145f9a719e1e57cc0f1ea07"
});

const eoi2026v13 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.13",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-14",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js24-css15-form-v13",
    frontendAssetHashes: v13FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v12.contract
});

const application2026v13 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.13",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-14",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js24-css15-form-v13",
    frontendAssetHashes: v13FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v12.contract
});

const v14FrontendAssetHashes = freeze({
  ...v13FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "11a50c0c1a42214997b0b844c90e9c87bd2a3c6e1ca922f983622ba2eedb84a7",
  "pages/rosewood-enrolment-v6.js": "b40860aaa9c96a70879c684fcaed18889082d573a7fb0a62eaab5eb5f6f4ea22",
  "pages/rosewood-enrolment-v6.css": "ad64b038c8d9803bf48ba93e7e37896f78c72c4828efaeab95309a29a3d3643d"
});

const eoi2026v14 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.14",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-15",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js25-css16-form-v14",
    frontendAssetHashes: v14FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v13.contract
});

const application2026v14 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.14",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-15",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js25-css16-form-v14",
    frontendAssetHashes: v14FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: {
    ...application2026v13.contract,
    requiredFields: APPLICATION_V14_REQUIRED_FIELDS
  }
});

const v15FrontendAssetHashes = freeze({
  ...v14FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "87b622dec1164b5a49ee1c9cdbfafb8e492a2f1b09fb3d7dc8698ba1dd794541",
  "pages/rosewood-enrolment-v6.js": "ddcd2f7132c18e61db98b54ad734d2bda9f062f08f0837a083023a543648c951"
});

const eoi2026v15 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.15",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-16",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js26-css16-form-v15",
    frontendAssetHashes: v15FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v14.contract
});

const application2026v15 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.15",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-16",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js26-css16-form-v15",
    frontendAssetHashes: v15FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v14.contract
});

const v16FrontendAssetHashes = freeze({
  ...v15FrontendAssetHashes,
  "pages/rosewood-application-sign-v6.html": "bfd0d16607e625ca8cf569fe0868c92bfe32bb6089115eb3b2a65dd2b1034499",
  "pages/rosewood-application-sign-v6.js": "78cc1c0a7d82eb7206db0f300cfde211064cf4ff8ee368d751bec989690f3e2e",
  "pages/rosewood-enrolment-v6.html": "e21bd4e7c1dd44bcf1f16edbd059708199afa165184525486bb8ee13dd421c7d",
  "pages/rosewood-enrolment-v6.js": "e9197bb4d883ca31cda76a48d42dcfe28cb8d5dc91a5993040c4ce5a9c8233f8"
});

const application2026v16 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.16",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-23",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js27-css16-form-v16-sign5",
    frontendAssetHashes: v16FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v15.contract
});

const v17FrontendAssetHashes = freeze({
  ...v16FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "5f2f23b986efc2d687652a8a03bef0e7fc9ec13bb133800fe2956c6f229ce4e8",
  "pages/rosewood-enrolment-v6.js": "193e720bdc4b38629cd34b11146ac0b3dc2f7ab14e2ff88c68a0d0f79206702b",
  "pages/rosewood-enrolment-admin-v6.html": "89b4e9db8c2c749eece1afb0bcff2f4661f9b67339c5adaaef006a7c6ea32a51",
  "pages/rosewood-enrolment-admin-v6.js": "47181aa885f710f6ef87549609ef8e395721c1c52b983b24bf41a3d8510980f7"
});

const eoi2026v16 = complete({
  workflow: "eoi",
  formVersion: CURRENT_FORM_VERSIONS.eoi,
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-25",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js28-css16-admin7-renew-access",
    frontendAssetHashes: v17FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v15.contract
});

const application2026v17 = complete({
  workflow: "application",
  formVersion: CURRENT_FORM_VERSIONS.application,
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-25",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js28-css16-form-v17-sign5-admin7-renew-access",
    frontendAssetHashes: v17FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v16.contract
});

export const FORM_DEFINITIONS = freeze({
  eoi: { [eoi2026v1.formVersion]: eoi2026v1, [eoi2026v2.formVersion]: eoi2026v2, [eoi2026v3.formVersion]: eoi2026v3, [eoi2026v4.formVersion]: eoi2026v4, [eoi2026v5.formVersion]: eoi2026v5, [eoi2026v6.formVersion]: eoi2026v6, [eoi2026v7.formVersion]: eoi2026v7, [eoi2026v8.formVersion]: eoi2026v8, [eoi2026v9.formVersion]: eoi2026v9, [eoi2026v10.formVersion]: eoi2026v10, [eoi2026v11.formVersion]: eoi2026v11, [eoi2026v12.formVersion]: eoi2026v12, [eoi2026v13.formVersion]: eoi2026v13, [eoi2026v14.formVersion]: eoi2026v14, [eoi2026v15.formVersion]: eoi2026v15, [eoi2026v16.formVersion]: eoi2026v16 },
  application: { [application2026v1.formVersion]: application2026v1, [application2026v2.formVersion]: application2026v2, [application2026v3.formVersion]: application2026v3, [application2026v4.formVersion]: application2026v4, [application2026v5.formVersion]: application2026v5, [application2026v6.formVersion]: application2026v6, [application2026v7.formVersion]: application2026v7, [application2026v8.formVersion]: application2026v8, [application2026v9.formVersion]: application2026v9, [application2026v10.formVersion]: application2026v10, [application2026v11.formVersion]: application2026v11, [application2026v12.formVersion]: application2026v12, [application2026v13.formVersion]: application2026v13, [application2026v14.formVersion]: application2026v14, [application2026v15.formVersion]: application2026v15, [application2026v16.formVersion]: application2026v16, [application2026v17.formVersion]: application2026v17 }
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
