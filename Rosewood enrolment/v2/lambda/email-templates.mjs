function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shell({ preheader, heading, body, action }) {
  return `<!doctype html>
<html><body style="margin:0;background:#f6f1e8;color:#172521;font-family:Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e8"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf8;border:1px solid #ddd4c8;border-radius:18px;overflow:hidden">
<tr><td style="padding:28px 34px;background:#172521;color:#fff"><div style="font-family:Georgia,serif;font-size:26px">Rosewood College</div><div style="margin-top:5px;color:#d9c38f;font-size:11px;letter-spacing:1.8px;text-transform:uppercase">Private enrolment portal</div></td></tr>
<tr><td style="padding:38px 34px"><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:34px;line-height:1.08">${escapeHtml(heading)}</h1>${body}${action || ""}</td></tr>
<tr><td style="padding:20px 34px;background:#efe7dc;color:#5b625f;font-size:12px;line-height:1.5">This automated message relates to a private Rosewood College enrolment task. Please contact the enrolment team if you did not expect it. Do not forward one-time codes or private task links.</td></tr>
</table></td></tr></table></body></html>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 16px;line-height:1.65">${escapeHtml(text)}</p>`;
}

export function accessOtpEmail({ code, expiresMinutes = 10 }) {
  return {
    subject: "Your Rosewood College enrolment access code",
    text: `Your Rosewood College enrolment access code is ${code}. It expires in ${expiresMinutes} minutes and can be used once. If you did not request it, contact the enrolment team.`,
    html: shell({
      preheader: "Your private enrolment access code",
      heading: "Your secure access code",
      body: `${paragraph("Enter this code on the Rosewood page already open in your browser.")}<div style="margin:28px 0;padding:22px;background:#f1e8d9;border-left:4px solid #9f3447;text-align:center;font-size:34px;font-weight:bold;letter-spacing:8px">${escapeHtml(code)}</div>${paragraph(`The code expires in ${expiresMinutes} minutes and can be used once.`)}`
    })
  };
}

export function signatureInvitationEmail({ guardianName, studentName, taskUrl }) {
  const action = `<p style="margin:28px 0"><a href="${escapeHtml(taskUrl)}" style="display:inline-block;padding:13px 22px;color:#fff;background:#9f3447;border-radius:999px;font-weight:bold;text-decoration:none">Review and sign securely</a></p>`;
  return {
    subject: `Your signature is required for ${studentName}'s Rosewood application`,
    text: `Dear ${guardianName}, your independent signature is required for ${studentName}'s Rosewood College enrolment application. Open this private link: ${taskUrl}`,
    html: shell({
      preheader: `Your signature is required for ${studentName}'s application`,
      heading: "Your independent review and signature",
      body: `${paragraph(`Dear ${guardianName},`)}${paragraph(`The primary guardian has completed their part of ${studentName}'s enrolment application. Rosewood requires you to verify your email, review the same frozen application revision and sign in your own session.`)}`,
      action
    })
  };
}

export function signatureOtpEmail({ code, studentName, expiresMinutes = 10 }) {
  return {
    subject: "Your Rosewood College signature verification code",
    text: `Your verification code for ${studentName}'s Rosewood signature task is ${code}. It expires in ${expiresMinutes} minutes and can be used once.`,
    html: shell({
      preheader: "Your signature-task verification code",
      heading: "Verify your signature task",
      body: `${paragraph(`Use this code to continue reviewing ${studentName}'s application.`)}<div style="margin:28px 0;padding:22px;background:#f1e8d9;border-left:4px solid #9f3447;text-align:center;font-size:34px;font-weight:bold;letter-spacing:8px">${escapeHtml(code)}</div>${paragraph(`It expires in ${expiresMinutes} minutes and can be used once.`)}`
    })
  };
}

export function receiptOtpEmail({ code, studentName, expiresMinutes = 10 }) {
  return {
    subject: "Your Rosewood College receipt verification code",
    text: `Your verification code to view the completed application receipt for ${studentName} is ${code}. It expires in ${expiresMinutes} minutes and can be used once.`,
    html: shell({
      preheader: "Your application-receipt verification code",
      heading: "Open your application receipt",
      body: `${paragraph(`Use this code to open the completed application receipt for ${studentName}.`)}<div style="margin:28px 0;padding:22px;background:#f1e8d9;border-left:4px solid #9f3447;text-align:center;font-size:34px;font-weight:bold;letter-spacing:8px">${escapeHtml(code)}</div>${paragraph(`It expires in ${expiresMinutes} minutes and can be used once.`)}`
    })
  };
}

export function individualSignatureEmail({ guardianName, studentName }) {
  return {
    subject: `Thank you for signing ${studentName}'s Rosewood application`,
    text: `Dear ${guardianName}, your signature for ${studentName}'s Rosewood College enrolment application was successfully recorded.`,
    html: shell({ preheader: "Your signature was recorded", heading: "Your signature is complete", body: `${paragraph(`Dear ${guardianName},`)}${paragraph(`Your signature for ${studentName}'s Rosewood College enrolment application was successfully recorded.`)}${paragraph("Rosewood will send a separate confirmation when every required signature is complete.")}` })
  };
}

export function applicationCompleteEmail({ guardianName, studentName, reference, receiptUrl }) {
  const action = receiptUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(receiptUrl)}" style="display:inline-block;padding:13px 22px;color:#fff;background:#2e6558;border-radius:999px;font-weight:bold;text-decoration:none">View application receipt</a></p>` : "";
  return {
    subject: `All signatures complete for ${studentName}'s Rosewood application`,
    text: `Dear ${guardianName}, all required signatures for ${studentName}'s application have been received. Reference: ${reference}. Rosewood will now review the application.${receiptUrl ? ` Receipt: ${receiptUrl}` : ""}`,
    html: shell({ preheader: "All required signatures are complete", heading: "Application ready for Rosewood review", body: `${paragraph(`Dear ${guardianName},`)}${paragraph(`All required signatures for ${studentName}'s enrolment application have been received. Rosewood will now review the application.`)}${paragraph(`Application reference: ${reference}`)}`, action })
  };
}
