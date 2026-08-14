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
  const result = await createApplicationInvitation({ store, recipientEmail: "family@example.com", firstName: "Alex", applicationUrl: "https://ffe.org.au/form", clock });
  assert.equal(result.sourceEoiId, null);
  assert.equal(store.created.application.sourceEoiId, "");
  assert.equal(store.created.application.values.app_guardian_0_email, "family@example.com");
  assert.equal(store.created.application.values.student_first, undefined);
  assert.deepEqual(store.created.invitation.applicationIds, [result.applicationId]);
  assert.equal(store.created.invitation.expiresAt, clock() + 14 * 86400_000);
  assert.match(result.invitationUrl, /^https:\/\/ffe\.org\.au\/form\?workflow=application&invite=/);
});

test("direct invitation requires a parent or guardian first name", async () => {
  const store = new InvitationStore();
  await assert.rejects(() => createApplicationInvitation({ store, recipientEmail: "family@example.com", applicationUrl: "https://ffe.org.au/form", clock }), error => error.code === "PARENT_NAME_REQUIRED");
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

test("invitation emails use the approved direct and EOI-linked variants", () => {
  const applicationUrl = "https://ffe.org.au/form?invite=private-token";
  const signingUrl = "https://ffe.org.au/sign?task=private-token";
  const application = applicationInvitation({ firstName: "Alex", invitationUrl: applicationUrl, expiresAt: "4 September 2026", linked: false });
  const linked = applicationInvitation({ firstName: "Alex", studentName: "Avery Example", entryLevel: "Foundation", entryYear: "2027", invitationUrl: applicationUrl, expiresAt: "4 September 2026", linked: true });
  const signature = signatureInvitation({ firstName: "Alex", studentName: "Avery", signingUrl });
  const signatureExplanation = "You are receiving this email because you were listed as a parent or guardian in a Rosewood College Application for Enrolment and your signature has been requested. Please use the private link below to verify your email, review the application and provide your signature. If you did not expect this request, please do not sign or forward the link and contact enrolment@ffe.org.au.";
  assert.equal(application.subject, "Invitation to Apply for Enrolment at Rosewood College");
  assert.match(application.text, /Thank you for considering Rosewood College for your child’s education/);
  assert.doesNotMatch(application.text, /opportunity to learn more about your family and your hopes/);
  assert.match(application.text, /same email address that received this invitation/);
  assert.match(application.text, /Rosewood College Enrolment Team/);
  assert.match(application.text, /expires on 4 September 2026/);
  assert.match(linked.text, /expressed interest in Foundation, 2027 at Rosewood College for your child Avery Example/);
  assert.match(linked.text, /prefill parts of the application/);
  assert.doesNotMatch(application.html, /copy and paste this private link into your browser/i);
  assert.equal(application.html.split(applicationUrl).length - 1, 1);
  assert.equal(application.text.split(applicationUrl).length - 1, 1);
  assert.match(signature.html, /copy and paste this private link into your browser/i);
  assert.equal(signature.html.split(signingUrl).length - 1, 3);
  assert.equal(signature.subject, "Signature requested for a Rosewood College Application for Enrolment");
  assert.match(signature.text, new RegExp(signatureExplanation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(signature.html.indexOf(signatureExplanation) < signature.html.indexOf("Review application and sign"));
  assert.doesNotMatch(`${signature.subject}\n${signature.text}\n${signature.html}`, /Avery|medical|family details/i);
});

test("invitation email escapes names before rendering HTML", () => {
  const message = applicationInvitation({ firstName: "<Alex>", invitationUrl: "https://ffe.org.au/form", expiresAt: "4 September 2026", linked: false });
  assert.doesNotMatch(message.html, /Dear <Alex>/);
  assert.match(message.html, /Dear &lt;Alex&gt;/);
});
