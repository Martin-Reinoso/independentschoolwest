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
  eoi: "rosewood-eoi-2026.26",
  application: "rosewood-application-2026.27"
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
  formVersion: "rosewood-eoi-2026.16",
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
  formVersion: "rosewood-application-2026.17",
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

const v18FrontendAssetHashes = freeze({
  ...v17FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "baf905dbcaeb031b7c73dc88fc93bb6cfb92dd9dd50378f175f6b0968bd920f1",
  "pages/rosewood-enrolment-v6.js": "80150d4fe25fd0423ce5b67e38895ca8e43dd270c559b412392f27b734bdf1d4",
  "pages/rosewood-enrolment-admin-v6.html": "d79d3b5b9b8fa758ce9eaf6bbe08f7e38c6254f124d7b439888b4698e361cd94",
  "pages/rosewood-enrolment-admin-v6.js": "8f5468b1e32a968c52e23c19f51966e7b02e1ac0178994dc26bec8f69cf91dc1",
  "pages/rosewood-enrolment-admin-v6.css": "8bc03a1f00d5eea969d25854fca5e84db8fdeeb48372563c4f4728bbbf411efd"
});

const eoi2026v17 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.17",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-26",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js29-css16-admin8-public-request",
    frontendAssetHashes: v18FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v16.contract
});

const application2026v18 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.18",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-26",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js29-css16-form-v18-sign5-admin8-public-request",
    frontendAssetHashes: v18FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v17.contract
});

const v19FrontendAssetHashes = freeze({
  ...v18FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "8fd138d88eb16875f967271418630108813e9d6b20479fed5b29c4827ee23ab5",
  "pages/rosewood-enrolment-v6.js": "339324408e414f956ef4cc23d607fdf5cef8e05d2164156dc586444f947893c8",
  "pages/rosewood-enrolment-admin-v6.html": "db8c2c5a0f9460f9739ef23f1655d7f279e2873fdaa6ec0548a96e9f49f23fee",
  "pages/rosewood-enrolment-admin-v6.js": "982b4d80c539343bce126784f9e0271a9f6a6e44469149f09cb10a87541ecc7d",
  "pages/rosewood-enrolment-admin-v6.css": "1a4c7c3284ff7ed435214b8781074cd122251f869afccc6732d8244aa1cbd812"
});

const eoi2026v18 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.18",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js30-css16-admin9-enrolment-planning",
    frontendAssetHashes: v19FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v17.contract
});

const application2026v19 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.19",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js30-css16-form-v19-sign5-admin9-enrolment-planning",
    frontendAssetHashes: v19FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v18.contract
});

const v20FrontendAssetHashes = freeze({
  ...v19FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "451d919557782cd7273d59dea9b3a3b04eeb7540456f46fd7e18e3988a55367d",
  "pages/rosewood-enrolment-v6.js": "8fe8b88997eb081b4bedc9a4f2cd7a5a6bc5d2ea77625c7df87a1c731316ec8c",
  "pages/rosewood-enrolment-admin-v6.html": "7af5ef6737d8d87b5f22ea80fcaa61122a353d1f44dc7098567c803cdb7e14c3",
  "pages/rosewood-enrolment-admin-v6.js": "6e42958b0ae0116ecf137977ee05b107e8298822b91389b7a3506f0409aebbb1",
  "pages/rosewood-enrolment-admin-v6.css": "3a0cb46556118e58ceda2658d09cb9ea7fd5fe6778b3e018d979060b4d3f3770"
});

const eoi2026v19 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.19",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js31-css16-admin10-admissions-overview",
    frontendAssetHashes: v20FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v18.contract
});

const application2026v20 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.20",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js31-css16-form-v20-sign5-admin10-admissions-overview",
    frontendAssetHashes: v20FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v19.contract
});

const v21FrontendAssetHashes = freeze({
  ...v20FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "02b7c245de27b4f198aacc08b334e83a2d883da733cd27fc61f9dd65fd55a830",
  "pages/rosewood-enrolment-v6.js": "c809ac81531b497567ea12c99e9195d31e5eb412c41877a7c92bd05246ba6bed",
  "pages/rosewood-enrolment-admin-v6.html": "969f59a9010b82337199bd3c5bb32252722f63865e1ebe5df1b457e2d89a3b3e",
  "pages/rosewood-enrolment-admin-v6.js": "665f63e444a2268dde385b698c237f7b4f6ed52b579608e9d0b06c26748a812e",
  "pages/rosewood-enrolment-admin-v6.css": "2b14a16a3e42cb7675487827c8b0ed269e277cbabf0ea337ec4479127d4f986f"
});

const eoi2026v20 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.20",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js32-css16-admin11-planning-contact-context",
    frontendAssetHashes: v21FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v19.contract
});

const application2026v21 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.21",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js32-css16-form-v21-sign5-admin11-planning-contact-context",
    frontendAssetHashes: v21FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v20.contract
});

const v22FrontendAssetHashes = freeze({
  ...v21FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "059ba50eb347633e61c03f8cad7fccf36f10bdbe6a82ae8a08fec0102de76a31",
  "pages/rosewood-enrolment-v6.js": "d85baa700f43ec78ad61ba1a469790d345f59ebe1122d0f7d89c677ee31675d2",
  "pages/rosewood-enrolment-admin-v6.html": "d349737011fe4e33427a4a25e26c198f73d0fd514dce10f9d751b911f17c4c98",
  "pages/rosewood-enrolment-admin-v6.js": "94096793ef7c19649649a3aba716aead7c11bf5d3003a534b45f66e22c0ded4f",
  "pages/rosewood-enrolment-admin-v6.css": "5adaa35ca8a6ca763c5497c069b6fc0fc6b524061a4a2105bbf0b9d53fe91381"
});

const eoi2026v21 = complete({
  workflow: "eoi",
  formVersion: "rosewood-eoi-2026.21",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi",
    frontendRelease: "v6-js33-css16-admin12-planning-test-category-sort",
    frontendAssetHashes: v22FrontendAssetHashes,
    validator: "schema.mjs#validateEoi"
  },
  contract: eoi2026v20.contract
});

const application2026v22 = complete({
  workflow: "application",
  formVersion: "rosewood-application-2026.22",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-27",
  source: {
    frontend: "pages/rosewood-enrolment-v6.html?workflow=application",
    frontendRelease: "v6-js33-css16-form-v22-sign5-admin12-planning-test-category-sort",
    frontendAssetHashes: v22FrontendAssetHashes,
    validator: "schema.mjs#validateApplicationForSubmission"
  },
  contract: application2026v21.contract
});

const v23FrontendAssetHashes = freeze({
  ...v22FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.js": "3a29d8f5bb56e5d59846d00bcc33a3daffe962e6c91960c89076e5ec8c5d99fc",
  "pages/rosewood-enrolment-admin-v6.html": "9c2f6c7c8624bbf59a650dc010323dc0f7f0be43c8bdea1f05f3ad5d2ff48f04",
  "pages/rosewood-enrolment-admin-v6.js": "9b41a0f60d7784c43560c8433b9fb3e9df29b2f775d1e923ba249ad37c40ed27",
  "pages/rosewood-enrolment-admin-v6.css": "604ec269fe7654f182a0d9210cee956816a78acab9a9bba3b5a3b46eaa9f76a5",
  "pages/rosewood-enrolment-meeting-v1.html": "47aa2281f6de018dd6c0a20290e84ff5bce13e45671e808e513e7e0535d51867",
  "pages/rosewood-enrolment-meeting-v1.js": "d0a3d2f7ca292a48a75b032382898f0fd0365273088eebb1899dfd8aaebd8457",
  "pages/rosewood-enrolment-meeting-v1.css": "58d8fdc518dbdda892fab56dbd93322b8879ec145481d1719381235f78342ab8"
});

const eoi2026v22 = complete({
  workflow: "eoi", formVersion: "rosewood-eoi-2026.22", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-08-30",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi", frontendRelease: "v6-js34-admin13-case-management", frontendAssetHashes: v23FrontendAssetHashes, validator: "schema.mjs#validateEoi" },
  contract: eoi2026v21.contract
});

const application2026v23 = complete({
  workflow: "application", formVersion: "rosewood-application-2026.23", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-08-30",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=application", frontendRelease: "v6-js34-form-v23-admin13-case-management", frontendAssetHashes: v23FrontendAssetHashes, validator: "schema.mjs#validateApplicationForSubmission" },
  contract: application2026v22.contract
});

const v24FrontendAssetHashes = freeze({
  ...v23FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "358db3c9ce709e9f1149779942d1572fd668436a9cec8b43f04be2c45aaf8aaf",
  "pages/rosewood-enrolment-v6.js": "5b002d4965ca07c405b1bbb9d55a5af9dc6961adcaa6f6f91d2cf3c8d9ea1243",
  "pages/rosewood-enrolment-admin-v6.html": "5dd9c5ee425604ec0489933b8ef23722e9af5e3dfacde883152d4b260ae1d3b4",
  "pages/rosewood-enrolment-admin-v6.js": "56192b10f1888e9fd09d2b74ea4641ff3818e2a831fbe041745b7c0f38edd3ab",
  "pages/rosewood-enrolment-admin-v6.css": "4f18914ad15a9ff37e65cb8612017cddaa5ae16212dd2888154bf9c12db06537"
});

const eoi2026v23 = complete({
  workflow: "eoi", formVersion: "rosewood-eoi-2026.23", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-01",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi", frontendRelease: "v6-js34-admin14-stable-review-document-preview", frontendAssetHashes: v24FrontendAssetHashes, validator: "schema.mjs#validateEoi" },
  contract: eoi2026v22.contract
});

const application2026v24 = complete({
  workflow: "application", formVersion: "rosewood-application-2026.24", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-01",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=application", frontendRelease: "v6-js34-form-v24-admin14-stable-review-document-preview", frontendAssetHashes: v24FrontendAssetHashes, validator: "schema.mjs#validateApplicationForSubmission" },
  contract: application2026v23.contract
});

const v25FrontendAssetHashes = freeze({
  ...v24FrontendAssetHashes,
  "pages/rosewood-enrolment-v6.html": "978e68665168109d95117988c0926d3f62b02e7b3d0ee872118e6c2c3d096dfd",
  "pages/rosewood-enrolment-v6.js": "c448b8e517660d32f969540151965f57fc09021c06f58bda4e48fb3715d9c279",
  "pages/rosewood-enrolment-admin-v6.html": "ead01a2435dba96fe1758e5afc495cdf243e15a396d88e5ea5e42c20a96d3df9",
  "pages/rosewood-enrolment-admin-v6.js": "e4194592543fa97686a8eee1d71c4fcd62361be570455958fedff5b2c01de4c3",
  "pages/rosewood-enrolment-admin-v6.css": "dc4a34e55977112eafd8507e6c899b3321cf4caed99ea30f369bc21be79fea5c",
  "pages/rosewood-enrolment-meeting-v1.html": "eaf4bbf3f560588851343ef912dd341ec7be1774fc7427c1a433e57c98e69970",
  "pages/rosewood-enrolment-meeting-v1.js": "7bb0e52e404990deff834f4d9457398832b9efd4c87764a396f728a1ce164510",
  "pages/rosewood-enrolment-meeting-v1.css": "a7a46f9a2697435ae58e0c76dcafa772cecf33091ed729be16e89b5217b79ce8"
});

const eoi2026v24 = complete({
  workflow: "eoi", formVersion: "rosewood-eoi-2026.24", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-01",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi", frontendRelease: "v6-js35-admin15-separated-communications-meetings", frontendAssetHashes: v25FrontendAssetHashes, validator: "schema.mjs#validateEoi" },
  contract: eoi2026v23.contract
});

const application2026v25 = complete({
  workflow: "application", formVersion: "rosewood-application-2026.25", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-01",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=application", frontendRelease: "v6-js35-form-v25-admin15-separated-communications-meetings", frontendAssetHashes: v25FrontendAssetHashes, validator: "schema.mjs#validateApplicationForSubmission" },
  contract: application2026v24.contract
});

const v26FrontendAssetHashes = freeze({
  ...v25FrontendAssetHashes,
  "pages/rosewood-enrolment-admin-v6.html": "7b162938c0eb222f9b862fee0842e4846db5c897c98e1c42689b69239b3c0577",
  "pages/rosewood-enrolment-admin-v6.js": "d3601b0dc1f038150bd3712d67f6028792e1917547d38d2428c53131469c0ccd",
  "pages/rosewood-enrolment-admin-v6.css": "b504ff948e3b0ea5b75239017225795d63abb4da47dba7833c416dbc4ed83a47"
});

const eoi2026v25 = complete({
  workflow: "eoi", formVersion: "rosewood-eoi-2026.25", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-02",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi", frontendRelease: "v6-js35-admin16-cohort-planning", frontendAssetHashes: v26FrontendAssetHashes, validator: "schema.mjs#validateEoi" },
  contract: eoi2026v24.contract
});

const application2026v26 = complete({
  workflow: "application", formVersion: "rosewood-application-2026.26", schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-02",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=application", frontendRelease: "v6-js35-form-v25-admin16-cohort-planning", frontendAssetHashes: v26FrontendAssetHashes, validator: "schema.mjs#validateApplicationForSubmission" },
  contract: application2026v25.contract
});

const v27FrontendAssetHashes = freeze({
  ...v26FrontendAssetHashes,
  "pages/rosewood-enrolment-admin-v6.html": "e5252d7110043937ad2d24e23ebd2e8d7d3e91afe6c06f5ffc9773a5fdfe54ab",
  "pages/rosewood-enrolment-admin-v6.js": "97c172f12abdb5b03ef8ef0a0f2a7b95cf6b43e7839d29f36fc5800612affa3b",
  "pages/rosewood-enrolment-admin-v6.css": "27182afca4720756be69501dc34b52da882cd0c64f870f9909c561cf2a7a67d5"
});

const eoi2026v26 = complete({
  workflow: "eoi", formVersion: CURRENT_FORM_VERSIONS.eoi, schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-03",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=eoi", frontendRelease: "v6-js35-admin17-request-email-delivery", frontendAssetHashes: v27FrontendAssetHashes, validator: "schema.mjs#validateEoi" },
  contract: eoi2026v25.contract
});

const application2026v27 = complete({
  workflow: "application", formVersion: CURRENT_FORM_VERSIONS.application, schemaVersion: SCHEMA_VERSION, releasedAt: "2026-09-03",
  source: { frontend: "pages/rosewood-enrolment-v6.html?workflow=application", frontendRelease: "v6-js35-form-v25-admin17-request-email-delivery", frontendAssetHashes: v27FrontendAssetHashes, validator: "schema.mjs#validateApplicationForSubmission" },
  contract: application2026v26.contract
});

export const FORM_DEFINITIONS = freeze({
  eoi: { [eoi2026v1.formVersion]: eoi2026v1, [eoi2026v2.formVersion]: eoi2026v2, [eoi2026v3.formVersion]: eoi2026v3, [eoi2026v4.formVersion]: eoi2026v4, [eoi2026v5.formVersion]: eoi2026v5, [eoi2026v6.formVersion]: eoi2026v6, [eoi2026v7.formVersion]: eoi2026v7, [eoi2026v8.formVersion]: eoi2026v8, [eoi2026v9.formVersion]: eoi2026v9, [eoi2026v10.formVersion]: eoi2026v10, [eoi2026v11.formVersion]: eoi2026v11, [eoi2026v12.formVersion]: eoi2026v12, [eoi2026v13.formVersion]: eoi2026v13, [eoi2026v14.formVersion]: eoi2026v14, [eoi2026v15.formVersion]: eoi2026v15, [eoi2026v16.formVersion]: eoi2026v16, [eoi2026v17.formVersion]: eoi2026v17, [eoi2026v18.formVersion]: eoi2026v18, [eoi2026v19.formVersion]: eoi2026v19, [eoi2026v20.formVersion]: eoi2026v20, [eoi2026v21.formVersion]: eoi2026v21, [eoi2026v22.formVersion]: eoi2026v22, [eoi2026v23.formVersion]: eoi2026v23, [eoi2026v24.formVersion]: eoi2026v24, [eoi2026v25.formVersion]: eoi2026v25, [eoi2026v26.formVersion]: eoi2026v26 },
  application: { [application2026v1.formVersion]: application2026v1, [application2026v2.formVersion]: application2026v2, [application2026v3.formVersion]: application2026v3, [application2026v4.formVersion]: application2026v4, [application2026v5.formVersion]: application2026v5, [application2026v6.formVersion]: application2026v6, [application2026v7.formVersion]: application2026v7, [application2026v8.formVersion]: application2026v8, [application2026v9.formVersion]: application2026v9, [application2026v10.formVersion]: application2026v10, [application2026v11.formVersion]: application2026v11, [application2026v12.formVersion]: application2026v12, [application2026v13.formVersion]: application2026v13, [application2026v14.formVersion]: application2026v14, [application2026v15.formVersion]: application2026v15, [application2026v16.formVersion]: application2026v16, [application2026v17.formVersion]: application2026v17, [application2026v18.formVersion]: application2026v18, [application2026v19.formVersion]: application2026v19, [application2026v20.formVersion]: application2026v20, [application2026v21.formVersion]: application2026v21, [application2026v22.formVersion]: application2026v22, [application2026v23.formVersion]: application2026v23, [application2026v24.formVersion]: application2026v24, [application2026v25.formVersion]: application2026v25, [application2026v26.formVersion]: application2026v26, [application2026v27.formVersion]: application2026v27 }
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
