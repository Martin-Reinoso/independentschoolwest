import assert from "node:assert/strict";
import test from "node:test";
import { applicationInvitation, signatureInvitation } from "../email-templates.mjs";
import { createApplicationInvitation } from "../service.mjs";

class InvitationStore {
  constructor(eoi = null) { this.eoi = eoi; this.created = null; }
  async getEoi(id) { return this.eoi?.id === id ? this.eoi : null; }
  async createInvitation(value) { this.created = value; }
}

const clock = () => Date.parse("2026-08-05T12:00:00.000Z");

test("direct invitation creates an application without an EOI link", async () => {
  const store = new InvitationStore();
  const result = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", studentFirstName: "Avery", applicationUrl: "https://ffe.org.au/form", clock });
  assert.equal(result.sourceEoiId, null);
  assert.equal(store.created.application.sourceEoiId, "");
  assert.equal(store.created.application.values.app_guardian_0_email, "family@example.com");
  assert.match(result.invitationUrl, /^https:\/\/ffe\.org\.au\/form\?workflow=application&invite=/);
});

test("explicit EOI link prefills names and records source_eoi_id", async () => {
  const eoi = { id: "eoi-1", contactId: "contact-1", studentId: "student-1", submittedAt: "2026-08-01T00:00:00Z", values: { eoi_email: "family@example.com", eoi_first: "Alex", eoi_last: "Example", eoi_mobile: "0400000000", eoi_student_first: "Avery", eoi_student_last: "Example", eoi_dob: "2020-01-01", eoi_gender: "Female", eoi_religion: "Catholic", eoi_year: "2027", eoi_level: "Foundation", eoi_current_school: "*Not At School", eoi_current_year: "Not at School", eoi_needs: "No", eoi_need_category: "", eoi_title: "Ms", eoi_relationship: "Mother", eoi_address: "1 Street", eoi_suburb: "Melbourne", eoi_state: "Victoria", eoi_postcode: "3000", eoi_country: "Australia" } };
  const store = new InvitationStore(eoi);
  const result = await createApplicationInvitation({ store, recipientEmail: "family@example.com", sourceEoiId: "eoi-1", applicationUrl: "https://ffe.org.au/form", clock });
  assert.equal(result.sourceEoiId, "eoi-1");
  assert.equal(store.created.application.values.student_first, "Avery");
  assert.equal(store.created.application.values.app_guardian_0_first, "Alex");
});

test("linking is explicit and fails closed for an unknown EOI", async () => {
  const store = new InvitationStore();
  await assert.rejects(() => createApplicationInvitation({ store, recipientEmail: "family@example.com", sourceEoiId: "missing", applicationUrl: "https://ffe.org.au/form", clock }), error => error.code === "EOI_NOT_FOUND");
});

test("linked EOI email cannot silently change during invitation", async () => {
  const store = new InvitationStore({ id: "eoi-1", values: { eoi_email: "first@example.com" } });
  await assert.rejects(() => createApplicationInvitation({ store, recipientEmail: "other@example.com", sourceEoiId: "eoi-1", applicationUrl: "https://ffe.org.au/form", clock }), error => error.code === "EOI_EMAIL_MISMATCH");
});

test("invitation emails include a copy-and-paste fallback for blocked new tabs", () => {
  const applicationUrl = "https://ffe.org.au/form?invite=private-token";
  const signingUrl = "https://ffe.org.au/sign?task=private-token";
  const application = applicationInvitation({ firstName: "Alex", studentName: "Avery", invitationUrl: applicationUrl, expiresAt: "4 September 2026", linked: false });
  const signature = signatureInvitation({ firstName: "Alex", studentName: "Avery", signingUrl });
  assert.match(application.html, /copy and paste this private link into your browser/i);
  assert.equal(application.html.split(applicationUrl).length - 1, 3);
  assert.match(signature.html, /copy and paste this private link into your browser/i);
  assert.equal(signature.html.split(signingUrl).length - 1, 3);
});
