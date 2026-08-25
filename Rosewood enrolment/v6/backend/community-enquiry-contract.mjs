import crypto from "node:crypto";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

const definition = {
  workflow: "community_enquiry",
  formVersion: "rosewood-community-enquiry-2026.1",
  schemaVersion: "rosewood-v6-2026-08-08-form-v8",
  fields: [
    { id: "name", required: true, maxLength: 120 },
    { id: "email", required: true, maxLength: 254 },
    {
      id: "interest",
      required: true,
      options: [
        "Ask a general question",
        "Offer help or professional expertise",
        "Discuss donating or lending",
        "Receive Rosewood College updates",
        "Share another idea"
      ]
    },
    { id: "message", required: false, maxLength: 4000 }
  ],
  notificationRecipient: "info@ffe.org.au",
  source: "discover_rosewood"
};

export const COMMUNITY_ENQUIRY_CONTRACT = Object.freeze({
  ...definition,
  definitionHash: crypto.createHash("sha256").update(JSON.stringify(stable(definition))).digest("hex")
});
