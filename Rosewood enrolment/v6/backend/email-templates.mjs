function frame(content, { privateFooter = true } = {}) {
  const footer = privateFooter ? '<hr style="border:0;border-top:1px solid #e4ded3;margin:28px 0"><p style="font-size:13px;color:#566070">This is a private enrolment message. If you did not expect it, reply to enrolment@ffe.org.au.</p>' : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f1e9;font-family:Arial,sans-serif;color:#14233d"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #ddd4c4;border-radius:16px;padding:32px"><p style="margin:0 0 20px;font:700 13px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#a84b34">Rosewood College</p>${content}${footer}</div></div></body></html>`;
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function button(label, url) {
  return `<p style="margin:26px 0"><a href="${url}" style="display:inline-block;background:#2f6f4e;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">${label}</a></p>`;
}

function fallbackLink(url) {
  return `<div style="margin:22px 0;padding:16px;background:#f4f1e9;border-radius:8px"><p style="margin:0 0 8px;font-size:14px;color:#566070">If the button does not open, copy and paste this private link into your browser:</p><p style="margin:0;overflow-wrap:anywhere;word-break:break-word;font-size:13px"><a href="${url}" style="color:#245f45">${url}</a></p></div>`;
}

export function eoiAcknowledgement({ firstName, studentName, reference }) {
  const subject = `Rosewood College expression of interest received - ${reference}`;
  const text = `Dear ${firstName},\n\nWe have received your expression of interest for ${studentName}. Your reference is ${reference}.\n\nThis is not an Application for Enrolment. If Rosewood invites you to apply, you will receive a separate private link.\n\nRosewood College`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Expression of interest received</h1><p>Dear ${firstName},</p><p>We have received your expression of interest for <strong>${studentName}</strong>.</p><p>Your reference is <strong>${reference}</strong>.</p><p>This is not an Application for Enrolment. If Rosewood invites you to apply, you will receive a separate private link.</p>`) };
}

export function applicationInvitation({ firstName, studentName, entryLevel, entryYear, invitationUrl, expiresAt, linked, requested = false }) {
  const subject = "Invitation to Apply for Enrolment at Rosewood College";
  const greeting = firstName || "Parent/Guardian";
  const assistance = "If you require assistance or have questions, please do not hesitate to get in touch at enrolment@ffe.org.au.";
  const signoff = "Kind regards,\n\nRosewood College Enrolment Team";
  const expiry = `This private invitation expires on ${expiresAt}.`;
  const directIntro = "Thank you for considering Rosewood College for your child’s education.";
  const directInvite = "We are pleased to invite you to begin an Application for Enrolment using the private link below. When prompted, please enter the same email address that received this invitation.";
  const requestedInvite = "You recently requested an Application for Enrolment link. Please use the private link below to begin. When prompted, enter the same email address that received this message.";
  const interest = [entryLevel, entryYear].filter(Boolean).join(", ");
  const linkedIntro = `Our records indicate that you have expressed interest${interest ? ` in ${interest}` : ""} at Rosewood College${studentName ? ` for your child ${studentName}` : ""}.`;
  const linkedInvite = "We now invite you to apply online using the application link below. When prompted, please enter the same email address that received this invitation. This allows us to prefill parts of the application using information you have already provided.";
  const introduction = linked ? linkedIntro : directIntro;
  const invitation = linked ? linkedInvite : requested ? requestedInvite : directInvite;
  const text = `Dear ${greeting},\n\n${introduction}\n\n${invitation}\n\nBEGIN APPLICATION\n${invitationUrl}\n\n${assistance}\n\n${signoff}\n\n${expiry}`;
  const html = frame(`<h1 style="font:700 28px Georgia,serif">Application for Enrolment</h1><p>Dear ${htmlEscape(greeting)},</p><p>${htmlEscape(introduction)}</p><p>${htmlEscape(invitation)}</p>${button("BEGIN APPLICATION", invitationUrl)}<p>${htmlEscape(assistance)}</p><p>Kind regards,</p><p>Rosewood College Enrolment Team</p><p style="font-size:14px;color:#566070">${htmlEscape(expiry)}</p>`);
  return { subject, text, html };
}

export function applicationOtp({ code }) {
  const subject = `${code} is your Rosewood College verification code`;
  const text = `Your Rosewood College verification code is ${code}. It expires in 10 minutes. Do not share this code.`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Verification code</h1><p>Enter this code to continue your Application for Enrolment:</p><p style="font:700 36px 'Courier New',monospace;letter-spacing:.16em">${code}</p><p>This code expires in 10 minutes. Do not share it.</p>`) };
}

export function communityEnquiryNotification({ reference, name, email, interest, message, submittedAt }) {
  const subject = `New Rosewood College enquiry - ${interest}`;
  const content = message || "No message was provided.";
  const text = `A new enquiry was submitted through the Rosewood College website.\n\nReference: ${reference}\nReceived: ${submittedAt}\nName: ${name}\nEmail: ${email}\nReason: ${interest}\n\nMessage:\n${content}`;
  const html = frame(`<h1 style="font:700 28px Georgia,serif">New website enquiry</h1><p>A new enquiry was submitted through the Rosewood College website.</p><table role="presentation" style="width:100%;border-collapse:collapse;margin:22px 0"><tr><td style="padding:7px 12px 7px 0;color:#566070">Reference</td><td style="padding:7px 0;font-weight:700">${htmlEscape(reference)}</td></tr><tr><td style="padding:7px 12px 7px 0;color:#566070">Received</td><td style="padding:7px 0">${htmlEscape(submittedAt)}</td></tr><tr><td style="padding:7px 12px 7px 0;color:#566070">Name</td><td style="padding:7px 0">${htmlEscape(name)}</td></tr><tr><td style="padding:7px 12px 7px 0;color:#566070">Email</td><td style="padding:7px 0"><a href="mailto:${htmlEscape(email)}" style="color:#245f45">${htmlEscape(email)}</a></td></tr><tr><td style="padding:7px 12px 7px 0;color:#566070">Reason</td><td style="padding:7px 0">${htmlEscape(interest)}</td></tr></table><h2 style="font:700 19px Georgia,serif">Message</h2><p style="white-space:pre-wrap">${htmlEscape(content)}</p>`, { privateFooter: false });
  return { subject, text, html };
}

export function staffOtp({ code }) {
  const subject = `${code} is your Rosewood enrolment staff access code`;
  const text = `Your Rosewood enrolment staff access code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request access, reply to enrolment@ffe.org.au.`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Staff access code</h1><p>Enter this code to access the Rosewood enrolment operations portal:</p><p style="font:700 36px 'Courier New',monospace;letter-spacing:.16em">${code}</p><p>This code expires in 10 minutes. Do not share it.</p><p style="font-size:14px;color:#566070">If you did not request staff access, reply to enrolment@ffe.org.au.</p>`) };
}

export function applicationSubmitted({ firstName, studentName, reference, pendingSignatures }) {
  const status = pendingSignatures ? "The application is waiting for the additional parent/guardian signature." : "The application is complete and has been received.";
  const subject = `Rosewood College application received - ${reference}`;
  const text = `Dear ${firstName},\n\nWe received the Application for Enrolment for ${studentName}. Reference: ${reference}. ${status}\n\nRosewood College`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Application received</h1><p>Dear ${firstName},</p><p>We received the Application for Enrolment for <strong>${studentName}</strong>.</p><p>Reference: <strong>${reference}</strong></p><p>${status}</p>`) };
}

export function signatureInvitation({ firstName, signingUrl }) {
  const subject = "Signature requested for a Rosewood College Application for Enrolment";
  const explanation = "You are receiving this email because you were listed as a parent or guardian in a Rosewood College Application for Enrolment and your signature has been requested. Please use the private link below to verify your email, review the application and provide your signature. If you did not expect this request, please do not sign or forward the link and contact enrolment@ffe.org.au.";
  const text = `Dear ${firstName},\n\n${explanation}\n\nREVIEW APPLICATION AND SIGN\n${signingUrl}\n\nRosewood College Enrolment Team`;
  const content = `<h1 style="font:700 28px Georgia,serif">Signature requested</h1><p>Dear ${htmlEscape(firstName)},</p><p>${htmlEscape(explanation)}</p>${button("Review application and sign", signingUrl)}${fallbackLink(signingUrl)}<p>Kind regards,</p><p>Rosewood College Enrolment Team</p>`;
  return { subject, text, html: frame(content, { privateFooter: false }) };
}

export function signatureOtp({ code }) {
  return applicationOtp({ code });
}

export function applicationComplete({ firstName, studentName, reference }) {
  const subject = `Rosewood College application complete - ${reference}`;
  const text = `Dear ${firstName},\n\nAll required signatures for ${studentName}'s Application for Enrolment have been received. Reference: ${reference}.\n\nRosewood College`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Application complete</h1><p>Dear ${firstName},</p><p>All required signatures for <strong>${studentName}</strong>'s Application for Enrolment have been received.</p><p>Reference: <strong>${reference}</strong></p>`) };
}

export function staffCaseEmail({ subject, body, actionUrl = "", actionLabel = "View request" }) {
  const safeSubject = String(subject || "").trim();
  const safeBody = String(body || "").trim();
  const actionText = actionUrl ? `\n\n${actionLabel.toUpperCase()}\n${actionUrl}` : "";
  const text = `${safeBody}${actionText}\n\nKind regards,\n\nRosewood College Enrolment Team`;
  const paragraphs = safeBody.split(/\n{2,}/).map(value => `<p style="white-space:pre-wrap">${htmlEscape(value)}</p>`).join("");
  const action = actionUrl ? `${button(actionLabel, actionUrl)}${fallbackLink(actionUrl)}` : "";
  const html = frame(`<h1 style="font:700 28px Georgia,serif">${htmlEscape(safeSubject)}</h1>${paragraphs}${action}<p>Kind regards,</p><p>Rosewood College Enrolment Team</p>`);
  return { subject: safeSubject, text, html };
}

export function meetingBookingInvitation({ firstName, studentName, seriesTitle, bookingUrl, expiresAt }) {
  const greeting = firstName || "Parent/Guardian";
  const subject = `Choose a meeting time with Rosewood College`;
  const context = studentName ? ` regarding ${studentName}'s Application for Enrolment` : "";
  const text = `Dear ${greeting},\n\nRosewood College invites you to choose a time for ${seriesTitle}${context}.\n\nCHOOSE A TIME\n${bookingUrl}\n\nThis private link expires on ${expiresAt}.\n\nKind regards,\n\nRosewood College Enrolment Team`;
  const html = frame(`<h1 style="font:700 28px Georgia,serif">Choose a meeting time</h1><p>Dear ${htmlEscape(greeting)},</p><p>Rosewood College invites you to choose a time for <strong>${htmlEscape(seriesTitle)}</strong>${htmlEscape(context)}.</p>${button("Choose a time", bookingUrl)}${fallbackLink(bookingUrl)}<p style="font-size:14px;color:#566070">This private link expires on ${htmlEscape(expiresAt)}.</p><p>Kind regards,</p><p>Rosewood College Enrolment Team</p>`);
  return { subject, text, html };
}

export function meetingBookingConfirmation({ firstName, studentName, seriesTitle, startsAt, location }) {
  const greeting = firstName || "Parent/Guardian";
  const subject = `Rosewood College meeting confirmed`;
  const student = studentName ? ` for ${studentName}` : "";
  const where = location ? `\nLocation: ${location}` : "";
  const text = `Dear ${greeting},\n\nYour ${seriesTitle}${student} is confirmed.\n\nTime: ${startsAt}${where}\n\nIf you need to change this booking, contact enrolment@ffe.org.au.\n\nKind regards,\n\nRosewood College Enrolment Team`;
  const html = frame(`<h1 style="font:700 28px Georgia,serif">Meeting confirmed</h1><p>Dear ${htmlEscape(greeting)},</p><p>Your <strong>${htmlEscape(seriesTitle)}</strong>${htmlEscape(student)} is confirmed.</p><div style="margin:22px 0;padding:16px;background:#f4f1e9;border-radius:8px"><p style="margin:0 0 6px"><strong>${htmlEscape(startsAt)}</strong></p>${location ? `<p style="margin:0">${htmlEscape(location)}</p>` : ""}</div><p>If you need to change this booking, contact enrolment@ffe.org.au.</p>`);
  return { subject, text, html };
}
