import crypto from "node:crypto";
import {offerContentHash} from './offer-content-hash.mjs';

const fail = (code, message) => { throw Object.assign(new Error(message), { status: 422, code }); };
export const personName = person => [person.first, person.middle, person.last].filter(Boolean).join(" ");
const clean = (value, max = 100) => String(value ?? "").trim().slice(0, max);
const digest = offerContentHash;

export function initialOfferDetails(app, signers) {
  const values = app.values || {};
  return {
    student: Object.fromEntries(["first", "middle", "last", "preferred"].map(key => [key, clean(values[`student_${key}`])])),
    guardians: signers.map(signer => {
      const control = app.signerControls.find(c => c.guardianId === signer.id);
      const prefix = `app_guardian_${control.guardianIndex}_`;
      const fallback = signer.name.split(/\s+/);
      return { id: signer.id, source: "application", first: clean(values[prefix + "first"] || fallback.slice(0, -1).join(" ") || fallback[0]), middle: "", last: clean(values[prefix + "last"] || fallback.at(-1)), mobile: clean(values[prefix + "mobile"], 40), email: signer.email, relationship: clean(values[prefix + "relationship"]), contactPermission: control.contactPermission === true, shareContact: values[prefix + "share"] === "Yes, share them" };
    })
  };
}

export function packetWithDetails(packet, details) {
  return { ...packet, studentName: personName(details.student), signers: details.guardians.map(person => ({ name: personName(person) })),
    // The common signed packet contains identities and relationships. Private contact
    // fields are held in the restricted offer revision and bound by its content hash.
    details: { student: details.student, guardians: details.guardians.map(({ first, middle, last, relationship }) => ({ first, middle, last, relationship })) },
    detailsHash: digest(details)
  };
}

export function visibleOfferDetails(details, { primary, email }) {
  if (primary) return structuredClone(details);
  return { student: structuredClone(details.student), guardians: details.guardians.map(guardian => {
    const { id, first, middle, last, relationship } = guardian;
    return { id, first, middle, last, relationship, ...(guardian.email === email || guardian.shareContact ? { email: guardian.email, mobile: guardian.mobile } : {}) };
  }) };
}

function field(value, label, { optional = false, max = 100 } = {}) {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail("DETAILS_INVALID", `Check ${label}.`);
  const result = value.trim();
  if (!optional && !result) fail("DETAILS_REQUIRED", `Enter ${label}.`);
  return result;
}

export function validateOfferDetails(input, existing, { primaryEmail, confirmed }) {
  if (!confirmed || !input || typeof input !== "object" || !input.student || !Array.isArray(input.guardians) || input.guardians.length < 1 || input.guardians.length > 6) fail("GUARDIAN_REVIEW_REQUIRED", "Check the student details and confirm all legal parents or guardians are included.");
  const student = Object.fromEntries(["first", "middle", "last", "preferred"].map(key => [key, field(input.student[key], `the student's ${key} name`, { optional: ["middle", "preferred"].includes(key) })]));
  const previous = new Map(existing.guardians.map(person => [person.id, person]));
  const seenIds = new Set(), seenEmails = new Set();
  const guardians = input.guardians.map(person => {
    if (!person || typeof person !== "object") fail("DETAILS_INVALID", "Check each guardian's details.");
    const prior = person.id ? previous.get(person.id) : null;
    if (person.id && !prior) fail("GUARDIAN_ID_INVALID", "Reopen this offer before changing guardian details.");
    const id = prior?.id || `offer-guardian-${crypto.randomUUID()}`;
    if (seenIds.has(id)) fail("GUARDIAN_DUPLICATE", "Each guardian must be listed once.");
    seenIds.add(id);
    const address = field(person.email, "the guardian's email", { max: 254 }).toLowerCase();
    if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address)) fail("EMAIL_INVALID", "Enter one valid email address for each guardian.");
    if (prior && address !== prior.email) fail("SIGNING_EMAIL_LOCKED", "Existing signing emails cannot be changed here. Email enrolment@ffe.org.au for assistance.");
    if (seenEmails.has(address)) fail("GUARDIAN_DUPLICATE", "Each guardian needs their own email address to sign.");
    seenEmails.add(address);
    if (typeof person.contactPermission !== "boolean") fail("CONTACT_PERMISSION_REQUIRED", "Confirm whether the College may contact each guardian.");
    if (address === primaryEmail && !person.contactPermission) fail("PRIMARY_CONTACT_REQUIRED", "The signing guardian must permit contact for this offer.");
    const mobile = field(person.mobile, "the guardian's mobile number", { max: 40 });
    if (!/^[+()\d\s.-]{6,40}$/.test(mobile) || mobile.replace(/\D/g, '').length < 6) fail("PHONE_INVALID", "Check the guardian's mobile number.");
    const relationship = field(person.relationship, "the guardian's relationship");
    if (!["Parent", "Mother", "Father", "Legal guardian"].includes(relationship) && (!prior || relationship !== prior.relationship)) fail("GUARDIAN_AUTHORITY_REQUIRED", "For another relationship, email enrolment@ffe.org.au to confirm the signing arrangement.");
    return { id, source: prior?.source || "offer_added", first: field(person.first, "the guardian's given name"), middle: field(person.middle ?? "", "the guardian's middle name", { optional: true }), last: field(person.last, "the guardian's surname"), mobile, email: address, relationship, contactPermission: person.contactPermission, shareContact: prior?.shareContact || false };
  });
  // Existing required guardians, including saved additions, cannot be removed in a
  // subsequent draft. An authorised College arrangement is a separate operation.
  if (existing.guardians.some(person => !seenIds.has(person.id))) fail("REQUIRED_GUARDIAN_REMOVED", "A required guardian cannot be removed here. Email enrolment@ffe.org.au to confirm the signing arrangement.");
  return { student, guardians };
}

export function offerSignerContactAllowed(offer, app, signer) {
  if (!signer) return false;
  const detail = offer.details?.guardians.find(person => person.id === signer.id);
  if (detail?.contactPermission === false) return false;
  if (signer.source === "offer_added") return detail?.source === "offer_added" && detail.contactPermission === true && detail.email === signer.email && Boolean(offer.detailsConfirmedBy);
  const control = app?.signerControls?.find(person => person.guardianId === signer.id);
  return control?.contactPermission === true && String(control.currentEmail || "").trim().toLowerCase() === signer.email;
}

// Only pending guardian invitations can be regrouped. Already-issued scopes remain
// intact; an added child uses a fresh, scoped request after primary acceptance.
export function reconcileOfferAccounts(family, offer) {
  const accounts = family.accounts.map(account => ({ ...account, children: account.children.map(child => ({ ...child })) }));
  for (const account of accounts) {
    account.children = account.children.filter(child => child.offerId !== offer.id || account.tokenHash);
  }
  for (const signer of offer.signers) {
    const existing = accounts.find(account => account.email === signer.email && account.children.some(child => child.offerId === offer.id));
    const target = existing || accounts.find(account => account.email === signer.email && !account.tokenHash) || { id: `recipient-${crypto.randomUUID()}`, email: signer.email, primary: false, tokenHash: "", children: [] };
    target.name = signer.name;
    const child = { offerId: offer.id, signerId: signer.id, studentName: offer.packet.studentName, studentFirstName: offer.details?.student.first, entryYear: offer.packet.entryYear, entryLevel: offer.packet.entryLevel };
    target.children = [...target.children.filter(item => item.offerId !== offer.id), child];
    if (!accounts.includes(target)) accounts.push(target);
  }
  return { ...family, revision: family.revision + 1, accounts: accounts.filter(account => account.children.length) };
}
