import crypto from "node:crypto";

export const FAMILY_COMMUNICATION_TEMPLATE = Object.freeze({
  id: "application_review_update",
  revision: "2026-09-03.1",
  label: "Application review update"
});

const SUBJECTS = Object.freeze({
  entry_2027: "An update on your Rosewood College Application for Enrolment",
  mixed_entry: "An update on your Rosewood College Applications for Enrolment",
  later_entry: "Looking ahead: your Rosewood College Application for Enrolment"
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function joinNames(names) {
  const clean = names.map(value => String(value || "").trim()).filter(Boolean);
  if (clean.length < 2) return clean[0] || "your child";
  return `${clean.slice(0, -1).join(", ")} and ${clean.at(-1)}`;
}

function applicationNoun(count) {
  return count === 1 ? "Application" : "Applications";
}

function applicationVerb(count) {
  return count === 1 ? "has" : "have";
}

export function familyCommunicationVariant(applications) {
  const years = applications.map(application => Number(application.entryYear));
  if (!years.length || years.some(year => !Number.isInteger(year) || year < 2027 || year > 2100)) {
    return { variant: "", error: "Every selected application must have an entry year of 2027 or later before this template can be prepared." };
  }
  if (years.every(year => year === 2027)) return { variant: "entry_2027", error: "" };
  if (years.every(year => year >= 2028)) return { variant: "later_entry", error: "" };
  return { variant: "mixed_entry", error: "" };
}

function messageCopy(variant, applications) {
  const allNames = joinNames(applications.map(application => application.studentFirstName));
  const count = applications.length;
  const application = applicationNoun(count);
  const has = applicationVerb(count);

  if (variant === "entry_2027") {
    return {
      eyebrow: "Application update",
      heading: count === 1 ? "Your application is under review" : "Your applications are under review",
      preheader: "We are reviewing applications and will contact families soon about interviews in September.",
      paragraphs: [
        `Thank you for completing the ${application} for Enrolment for ${allNames}.`,
        `It has been very encouraging to see families take this important step with Rosewood College. Our Enrolment Team is now carefully reviewing each application, and we will contact you shortly with an update.`
      ],
      notice: "We will be in touch directly as the review progresses.",
      sectionHeading: "Family interviews in September",
      sectionParagraphs: [
        "Our Founding Principal, Dr Anne-Marie Irwin, will be in Melbourne from 22 to 28 September. Family interviews will commence on 22 September, and we will contact you soon with further information about the next steps and available times."
      ]
    };
  }

  if (variant === "later_entry") {
    const years = [...new Set(applications.map(application => application.entryYear))].sort().join(" and ");
    return {
      eyebrow: "Looking ahead",
      heading: count === 1 ? "Your application has been received" : "Your applications have been received",
      preheader: "We have received your Rosewood College Application for Enrolment and will share future-entry next steps when they are available.",
      paragraphs: [
        `Thank you for completing the ${application} for Enrolment for ${allNames}. It is very encouraging to see families already looking ahead to Rosewood College.`,
        `Our September family interviews will focus on applications for entry in 2027, so we will not be arranging an interview for ${allNames} at this stage. The completed ${application.toLowerCase()} ${has} been received, and we will contact you when we are ready to share the next steps for families seeking entry in ${years}.`
      ],
      notice: "No action is required from you at this time.",
      sectionHeading: "What happens next",
      sectionParagraphs: [
        "We will keep your application on record and contact you directly when information for the relevant entry year is available."
      ]
    };
  }

  const currentApplications = applications.filter(application => Number(application.entryYear) === 2027);
  const laterApplications = applications.filter(application => Number(application.entryYear) >= 2028);
  const currentNames = joinNames(currentApplications.map(application => application.studentFirstName));
  const laterNames = joinNames(laterApplications.map(application => application.studentFirstName));
  const laterYears = [...new Set(laterApplications.map(application => application.entryYear))].sort().join(" and ");
  return {
    eyebrow: "Application update",
    heading: "Your applications are under review",
    preheader: "We are reviewing your family’s Rosewood College applications and will contact you about the relevant next steps.",
    paragraphs: [
      `Thank you for completing the Applications for Enrolment for ${allNames}.`,
      "It has been very encouraging to see families take this important step with Rosewood College. Our Enrolment Team is now carefully reviewing each application."
    ],
    notice: "No action is required from you at this stage.",
    sectionHeading: "Next steps for each entry year",
    sectionParagraphs: [
      `Our September family interviews will focus on applications for entry in 2027. We will contact you soon with further information about next steps and available times for ${currentNames}.`,
      `We have also received the ${applicationNoun(laterApplications.length).toLowerCase()} for ${laterNames}, for entry in ${laterYears}. We will contact you when we are ready to share the next steps for those future entry years.`
    ]
  };
}

function plainText({ greeting, copy }) {
  return [
    `Dear ${greeting},`,
    "",
    ...copy.paragraphs.flatMap(paragraph => [paragraph, ""]),
    "NO ACTION IS REQUIRED",
    copy.notice,
    "",
    copy.sectionHeading.toUpperCase(),
    ...copy.sectionParagraphs.flatMap(paragraph => [paragraph, ""]),
    "In the meantime, please keep an eye on your inbox. If your contact details have changed since you submitted the application, please email us at enrolment@ffe.org.au.",
    "",
    "Kind regards,",
    "Rosewood College Enrolment Team",
    "",
    "This is a private enrolment message. If you did not expect it, please reply to enrolment@ffe.org.au.",
    "Rosewood College's proposed opening in 2027 remains subject to completion of the school registration process."
  ].join("\n");
}

function htmlEmail({ greeting, copy }) {
  const paragraphs = copy.paragraphs.map(paragraph => `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#2D3748;margin:0 0 16px;">${escapeHtml(paragraph)}</p>`).join("");
  const sectionParagraphs = copy.sectionParagraphs.map(paragraph => `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#2D3748;margin:0 0 16px;">${escapeHtml(paragraph)}</p>`).join("");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"><title>Rosewood College application update</title><style>html,body{width:100%!important;margin:0!important;padding:0!important;-webkit-text-size-adjust:100%!important;-ms-text-size-adjust:100%!important}table{border-collapse:collapse!important;border-spacing:0!important}@media only screen and (max-width:640px){.outer-pad{padding:0!important}.email-shell{width:100%!important;max-width:100%!important}.mobile-pad{padding-left:22px!important;padding-right:22px!important}.mobile-title{font-size:28px!important}.header-copy{padding-right:14px!important}.header-emblem{width:76px!important}}</style></head>
<body style="width:100%;margin:0;padding:0;background-color:#EDE9E0;font-family:Arial,Helvetica,sans-serif;color:#14233D;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent;mso-hide:all;">${escapeHtml(copy.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#EDE9E0;"><tr><td class="outer-pad" align="center" style="padding:24px 12px;"><table role="presentation" class="email-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;margin:0 auto;">
<tr><td class="mobile-pad" style="background-color:#00234B;padding:22px 38px;border-bottom:4px solid #C84A35;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="header-copy" valign="middle" style="padding-right:24px;"><p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#D7A458;margin:0 0 7px;">Rosewood College</p><p style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;line-height:1.3;color:#FFFFFF;margin:0;">Enrolment Team</p></td><td width="94" align="right" valign="middle"><img class="header-emblem" src="https://ffe.org.au/img/rosewood-emblem-corrected-transparent.png" alt="Rosewood College" width="88" style="display:block;width:88px;max-width:100%;height:auto;border:0;"></td></tr></table></td></tr>
<tr><td class="mobile-pad" style="background-color:#FFFFFF;padding:36px 44px 27px;"><p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#C84A35;margin:0 0 10px;text-align:center;">${escapeHtml(copy.eyebrow)}</p><h1 class="mobile-title" style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;line-height:1.18;color:#00234B;text-align:center;margin:0 0 25px;">${escapeHtml(copy.heading)}</h1><p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#2D3748;margin:0 0 16px;">Dear ${escapeHtml(greeting)},</p>${paragraphs}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:23px 0;"><tr><td style="background-color:#F7F3EB;border-left:4px solid #D7A458;padding:18px 20px;"><p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#A84B34;margin:0 0 7px;">No action is required</p><p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#475569;margin:0;">${escapeHtml(copy.notice)}</p></td></tr></table>
<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;line-height:1.3;color:#00234B;margin:26px 0 10px;">${escapeHtml(copy.sectionHeading)}</h2>${sectionParagraphs}<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#2D3748;margin:0 0 25px;">In the meantime, please keep an eye on your inbox. If your contact details have changed since you submitted the application, please email us at <a href="mailto:enrolment@ffe.org.au" style="color:#A84B34;font-weight:700;text-decoration:underline;">enrolment@ffe.org.au</a>.</p><p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#2D3748;margin:0 0 4px;">Kind regards,</p><p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.6;color:#00234B;margin:0;">Rosewood College Enrolment Team</p></td></tr>
<tr><td class="mobile-pad" style="background-color:#F7F3EB;padding:22px 44px;border-top:1px solid #E4DED3;"><p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;color:#566070;margin:0 0 8px;">This is a private enrolment message. If you did not expect it, please reply to <a href="mailto:enrolment@ffe.org.au" style="color:#566070;font-weight:700;text-decoration:underline;">enrolment@ffe.org.au</a>.</p><p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;color:#718096;margin:0;">Rosewood College&rsquo;s proposed opening in 2027 remains subject to completion of the school registration process.</p></td></tr>
<tr><td align="center" style="background-color:#001530;padding:18px 30px;"><p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:rgba(255,255,255,.55);margin:0;">Rosewood College &nbsp;&middot;&nbsp; An initiative of Families for Education Ltd</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function renderFamilyCommunication({ applications, recipient }) {
  const { variant, error } = familyCommunicationVariant(applications);
  if (error) throw Object.assign(new Error(error), { status: 422, code: "FAMILY_TEMPLATE_UNAVAILABLE" });
  const copy = messageCopy(variant, applications);
  const greeting = String(recipient.name || "Parent/Guardian").trim().split(/\s+/)[0] || "Parent/Guardian";
  const subject = SUBJECTS[variant];
  const text = plainText({ greeting, copy });
  const html = htmlEmail({ greeting, copy });
  return { subject, text, html, preheader: copy.preheader, variant };
}

export function familyCommunicationContentHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}
