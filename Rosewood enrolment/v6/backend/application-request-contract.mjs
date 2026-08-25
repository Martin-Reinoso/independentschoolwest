import crypto from "node:crypto";
import { SCHEMA_VERSION } from "./schema.mjs";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
}

const contract = {
  workflow: "application_link_request",
  formVersion: "rosewood-application-link-request-2026.1",
  schemaVersion: SCHEMA_VERSION,
  releasedAt: "2026-08-26",
  source: {
    frontend: "pages/rosewood-application-link-request.html",
    frontendRelease: "application-link-request-v2",
    frontendAssetHashes: {
      "pages/rosewood-application-link-request.html": "e8354882b6c29b81cefb51fd86239bf7c24a0a99b18468971e396cb8fe26328b",
      "pages/rosewood-application-link-request.js": "a4498da269df7439f56614bac08530c1f576f5f0cd80c075fa0eeb9d0e0af55c",
      "pages/rosewood-application-link-request.css": "f4968e5bd438d05dc492914734d57c2277aaab3054a60a758c1ba1d2105e76fc"
    }
  },
  fields: [
    { id: "parent_guardian_name", type: "text", required: true, maximumLength: 120 },
    { id: "email", type: "email", required: true, maximumLength: 254 }
  ],
  creates: "application_family_invitation",
  sourceEoiMatching: "explicit_staff_link_only"
};

export const APPLICATION_REQUEST_CONTRACT = Object.freeze({
  ...contract,
  definitionHash: crypto.createHash("sha256").update(JSON.stringify(canonical(contract)), "utf8").digest("hex")
});
