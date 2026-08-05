function frame(content) {
  return `<!doctype html><html><body style="margin:0;background:#f4f1e9;font-family:Arial,sans-serif;color:#14233d"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #ddd4c4;border-radius:16px;padding:32px"><p style="margin:0 0 20px;font:700 13px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#a84b34">Rosewood College</p>${content}<hr style="border:0;border-top:1px solid #e4ded3;margin:28px 0"><p style="font-size:13px;color:#566070">This is a private enrolment message. If you did not expect it, reply to enrolment@ffe.org.au.</p></div></div></body></html>`;
}

function button(label, url) {
  return `<p style="margin:26px 0"><a href="${url}" style="display:inline-block;background:#2f6f4e;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:8px">${label}</a></p>`;
}

export function eoiAcknowledgement({ firstName, studentName, reference }) {
  const subject = `Rosewood College expression of interest received - ${reference}`;
  const text = `Dear ${firstName},\n\nWe have received your expression of interest for ${studentName}. Your reference is ${reference}.\n\nThis is not an Application for Enrolment. If Rosewood invites you to apply, you will receive a separate private link.\n\nRosewood College`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Expression of interest received</h1><p>Dear ${firstName},</p><p>We have received your expression of interest for <strong>${studentName}</strong>.</p><p>Your reference is <strong>${reference}</strong>.</p><p>This is not an Application for Enrolment. If Rosewood invites you to apply, you will receive a separate private link.</p>`) };
}

export function applicationInvitation({ firstName, studentName, invitationUrl, expiresAt, linked }) {
  const subject = `Invitation to apply for enrolment at Rosewood College`;
  const text = `Dear ${firstName || "Parent/Guardian"},\n\nYou are invited to begin an Application for Enrolment${studentName ? ` for ${studentName}` : ""}. ${linked ? "Information from your earlier expression of interest will be available to review and edit. " : ""}Use this private link: ${invitationUrl}\n\nThe invitation expires ${expiresAt}.\n\nRosewood College`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Application for Enrolment</h1><p>Dear ${firstName || "Parent/Guardian"},</p><p>You are invited to begin an Application for Enrolment${studentName ? ` for <strong>${studentName}</strong>` : ""}.</p>${linked ? "<p>Information from your earlier expression of interest will be available to review and edit.</p>" : ""}${button("Begin application", invitationUrl)}<p style="font-size:14px;color:#566070">This private invitation expires ${expiresAt}.</p>`) };
}

export function applicationOtp({ code }) {
  const subject = `${code} is your Rosewood College verification code`;
  const text = `Your Rosewood College verification code is ${code}. It expires in 10 minutes. Do not share this code.`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Verification code</h1><p>Enter this code to continue your Application for Enrolment:</p><p style="font:700 36px 'Courier New',monospace;letter-spacing:.16em">${code}</p><p>This code expires in 10 minutes. Do not share it.</p>`) };
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

export function signatureInvitation({ firstName, studentName, signingUrl }) {
  const subject = `Signature requested for ${studentName}'s Rosewood College application`;
  const text = `Dear ${firstName},\n\nYou have been asked to review and sign the Application for Enrolment for ${studentName}. Use this private link: ${signingUrl}\n\nRosewood College`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Signature requested</h1><p>Dear ${firstName},</p><p>You have been asked to review and sign the Application for Enrolment for <strong>${studentName}</strong>.</p>${button("Review and sign", signingUrl)}`) };
}

export function signatureOtp({ code }) {
  return applicationOtp({ code });
}

export function applicationComplete({ firstName, studentName, reference }) {
  const subject = `Rosewood College application complete - ${reference}`;
  const text = `Dear ${firstName},\n\nAll required signatures for ${studentName}'s Application for Enrolment have been received. Reference: ${reference}.\n\nRosewood College`;
  return { subject, text, html: frame(`<h1 style="font:700 28px Georgia,serif">Application complete</h1><p>Dear ${firstName},</p><p>All required signatures for <strong>${studentName}</strong>'s Application for Enrolment have been received.</p><p>Reference: <strong>${reference}</strong></p>`) };
}
