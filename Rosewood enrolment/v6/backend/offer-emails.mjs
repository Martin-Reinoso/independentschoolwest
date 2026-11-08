import { OFFER_CONTRACT } from "./offer-contract.mjs";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const childLabel = child => `${child.studentName} — ${child.entryLevel}, ${child.entryYear}`;
// Preserve compound given names. Older saved invitations may have only a full name.
const offeredNames = children => {
  const names = children.map(child => child.studentFirstName?.trim() || child.studentName);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
};

function render({ subject, name, paragraphs, children = [], link, linkLabel }) {
  const greeting = `Dear ${name},`;
  const help = "If you have any questions or notice any incorrect details, please email enrolment@ffe.org.au.";
  return {
    subject,
    text: [greeting, ...paragraphs, ...(children.length ? [children.map(childLabel).join("\n")] : []), ...(link ? [`${linkLabel}:\n${link}`, "Please do not forward this private link."] : []), help, "Warm regards,\nRosewood College"].join("\n\n"),
    html: `<p>${escape(greeting)}</p>${paragraphs.map(p => `<p>${escape(p)}</p>`).join("")}${children.length ? `<ul>${children.map(child => `<li>${escape(childLabel(child))}</li>`).join("")}</ul>` : ""}${link ? `<p><a href="${escape(link)}">${escape(linkLabel)}</a></p><p>Please do not forward this private link.</p>` : ""}<p>${help}</p><p>Warm regards,<br>Rosewood College</p>`
  };
}

export function offerInvitationEmail({ name, primary, children, link }) {
  if (!children?.length || children.some(child => !child.studentName || !child.entryYear || !child.entryLevel)) throw new Error("Offer email requires its authorised child list.");
  const plural = children.length > 1;
  return render({
    subject: primary ? "Your Rosewood College provisional enrolment offer" : "Rosewood College — your signature is requested",
    name, children, link, linkLabel: "Open your enrolment portal",
    paragraphs: primary ? [
      `Congratulations! We are delighted to offer ${offeredNames(children)} ${plural ? "places" : "a place"} at Rosewood College.`,
      `Attached is your family's personalised provisional offer letter from our Founding Principal, Dr Anne-Marie Irwin. It sets out ${plural ? "the offers" : "the offer"} listed below.`,
      OFFER_CONTRACT.introduction.text,
      `Use the link below to access your family portal and select ${plural ? "each child" : "your child"} to check the details, review the Terms and Conditions of Enrolment and digitally sign acceptance. You do not need to upload any documents.`,
      "Where another parent or guardian is required to sign and may be contacted, they will receive their own email after you have signed for all children included in their request. A guardian with a contact restriction will not be emailed; the College will confirm any remaining signing arrangement. Acceptance is complete once all required guardians have signed."
    ] : [
      `The first parent or guardian has signed acceptance of ${plural ? "the provisional offers" : "the provisional offer"} listed below. Your signature is now requested.`,
      "Use your private link to verify your email, review the submitted details and terms, and sign. Acceptance is complete once all required guardians have signed.",
      OFFER_CONTRACT.introduction.text
    ]
  });
}

export function offerSignatureReceipt({ name, child, complete }) {
  return render({ subject: "Rosewood College — your signature has been recorded", name, paragraphs: [
    `Your signature accepting the provisional offer for ${childLabel(child)} has been recorded.`,
    complete ? "All required signatures for this child are now recorded. You will receive a separate confirmation of the completed acceptance." : "Acceptance is awaiting the other required guardian signatures. Please check your portal for any other children whose offers still need your signature.",
    OFFER_CONTRACT.introduction.text
  ] });
}

export function offerCompletionEmail({ name, child, hasAttachment = false }) {
  return render({ subject: "Rosewood College — provisional offer acceptance complete", name, paragraphs: [
    `This email acknowledges your acceptance of our provisional offer of enrolment for ${childLabel(child)}.`,
    "All required parent or guardian signatures have been recorded, and this stage of the enrolment process is complete for this child.",
    hasAttachment ? "Please keep this email and the attached copy of your signed acceptance for your records. Review the details and let us know if anything is incorrect." : "You can reopen your private enrolment portal to view or save your acceptance record. Please keep a copy for your records.",
    OFFER_CONTRACT.introduction.text
  ] });
}
