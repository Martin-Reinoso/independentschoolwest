import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { OFFER_CONTRACT } from "../offer-contract.mjs";
import { offerInvitationEmail, offerSignatureReceipt, offerCompletionEmail } from "../offer-emails.mjs";

const child = { studentName: "Avery Synthetic", studentFirstName: "Avery", entryLevel: "Foundation", entryYear: "2027" };
const sibling = { studentName: "Jordan Synthetic", studentFirstName: "Jordan", entryLevel: "Year 2", entryYear: "2027" };
const link = "https://example.test/portal?invite=synthetic";

test("initial message names every offered child, identifies the principal's attachment and preserves provisional status", () => {
  for (const children of [[child], [child, sibling]]) {
    const email = offerInvitationEmail({ name: "Alex Synthetic", primary: true, children, link });
    for (const item of children) assert.ok(email.text.includes(`${item.studentName} — ${item.entryLevel}, ${item.entryYear}`));
    assert.match(email.text, /Dr Anne-Marie Irwin/);
    assert.ok(email.text.includes(OFFER_CONTRACT.introduction.text));
    assert.match(email.text, /after you have signed for all children included in their request/);
    assert.match(email.text, /Acceptance is complete once all required guardians have signed/);
    assert.equal(email.text.split(link).length - 1, 1);
    assert.equal(email.html.split(link).length - 1, 1);
    assert.ok(!email.subject.includes(child.studentName));
    assert.match(email.text, children.length === 1 ? /offer Avery a place/ : /offer Avery and Jordan places/);
    assert.match(email.text, children.length === 1 ? /select your child/ : /select each child/);
  }
});

test("opening joins three given names, preserves compound names and falls back to a stored full name", () => {
  const third = { ...child, studentName: "Mary Rose Synthetic", studentFirstName: "Mary Rose" };
  const email = offerInvitationEmail({ name: "Alex", primary: true, children: [child, sibling, third], link });
  const opening = "Congratulations! We are delighted to offer Avery, Jordan and Mary Rose places at Rosewood College.";
  assert.ok(email.text.includes(opening));
  assert.ok(email.html.includes(`<p>${opening}</p>`));
  for (const first of [undefined, " "]) {
    const legacy = offerInvitationEmail({ name: "Alex", primary: true, children: [{ ...third, studentFirstName: first }], link });
    assert.match(legacy.text, /offer Mary Rose Synthetic a place/);
  }
});

test("secondary request lists only its scoped children and does not claim an attached principal letter", () => {
  const email = offerInvitationEmail({ name: "Taylor Synthetic", primary: false, children: [child], link });
  assert.ok(email.text.includes(child.studentName));
  assert.ok(!email.text.includes(sibling.studentName));
  assert.doesNotMatch(email.text, /letter attached|Attached is/);
  assert.match(email.text, /review the submitted details and terms/);
  assert.throws(() => offerInvitationEmail({ name: "Taylor", children: [], link }));
});

test("individual receipt distinguishes pending signatures from completed acceptance", () => {
  const pending = offerSignatureReceipt({ name: "Alex", child, complete: false });
  assert.match(pending.text, /awaiting the other required guardian signatures/);
  const completed = offerSignatureReceipt({ name: "Taylor", child, complete: true });
  assert.match(completed.text, /separate confirmation/);
  assert.doesNotMatch(pending.text, /stage of the enrolment process is complete/);
});

test("completion acknowledgement includes child entry details and only claims attachment when available", () => {
  const email = offerCompletionEmail({ name: "Taylor", child, hasAttachment: true });
  assert.match(email.text, /Foundation, 2027/);
  assert.match(email.text, /attached copy of your signed acceptance/);
  assert.match(email.text, /All required parent or guardian signatures/);
  assert.match(email.text, /registration approval/);
  assert.doesNotMatch(offerCompletionEmail({ name: "Taylor", child }).text, /attached copy/);
});

test("family supplied names cannot inject HTML into an offer email", () => {
  const email = offerInvitationEmail({ name: "<script>alert(1)</script>", primary: true, children: [{ ...child, studentName: '<img src=x onerror="alert(1)">', studentFirstName: '<img src=x onerror="alert(1)">' }], link });
  assert.doesNotMatch(email.html, /<script>|<img /);
  assert.match(email.html, /&lt;img/);
});

test("browser previews and backend use the same approved fourteen-section content", () => {
  const context = { window: {} };
  vm.runInNewContext(readFileSync(new URL("../../../../pages/rosewood-enrolment-offer-terms-v1.js", import.meta.url), "utf8"), context);
  vm.runInNewContext(readFileSync(new URL("../../../../pages/rosewood-enrolment-acceptance-terms-review.js", import.meta.url), "utf8"), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.ROSEWOOD_ACCEPTANCE_TERMS_REVIEW)), OFFER_CONTRACT);
  assert.equal(OFFER_CONTRACT.sections.length, 14);
  assert.equal(OFFER_CONTRACT.status, "approved");
  assert.ok(OFFER_CONTRACT.sections[3].paragraphs.some(p => p.includes("$20,000 is the maximum family bond")));
  assert.doesNotMatch(JSON.stringify(OFFER_CONTRACT.sections), /\$10,000 per child/);
});
