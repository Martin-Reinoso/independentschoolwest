function melbourneTime(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Slack ${label} notification requires a valid timestamp.`);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function safeReference(value) {
  const reference = String(value || "").trim();
  if (!/^APP-[A-Z0-9_-]{6,40}$/.test(reference)) throw new Error("Slack notification requires a valid application reference.");
  return reference;
}

function safeName(value, label) {
  const name = String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!name || name.length > 180) throw new Error(`Slack notification requires a valid ${label}.`);
  return name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeNames(values, label) {
  if (!Array.isArray(values) || !values.length || values.length > 6) throw new Error(`Slack notification requires ${label}.`);
  return values.map(value => safeName(value, label));
}

function safePortalUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Slack staff portal URL must use HTTPS.");
  return url;
}

function actions(staffPortalUrl) {
  return [{
    type: "actions",
    elements: [{
      type: "button",
      text: { type: "plain_text", text: "Open staff portal" },
      url: safePortalUrl(staffPortalUrl).toString()
    }]
  }];
}

export function signaturePendingMessage({ reference, submittedAt, studentName, signedBy, awaitingSignatures, staffPortalUrl }) {
  const applicationReference = safeReference(reference);
  const student = safeName(studentName, "student name");
  const signed = safeNames(signedBy, "completed signer name");
  const awaiting = safeNames(awaitingSignatures, "pending signer name");
  const submitted = melbourneTime(submittedAt, "pending signature");
  return {
    text: `Application submitted: additional signature pending. Student: ${student}. Reference: ${applicationReference}.`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: ":hourglass_flowing_sand: *Application submitted: additional signature pending*" } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Student*\n${student}` },
          { type: "mrkdwn", text: `*Signed by*\n${signed.join(", ")}` },
          { type: "mrkdwn", text: `*Awaiting signature from*\n${awaiting.join(", ")}` },
          { type: "mrkdwn", text: `*Reference*\n${applicationReference}` },
          { type: "mrkdwn", text: `*Submitted*\n${submitted}` },
          { type: "mrkdwn", text: "*Status*\nAwaiting additional parent/guardian signature" }
        ]
      },
      ...actions(staffPortalUrl)
    ]
  };
}

export function applicationCompletionMessage({ reference, completedAt, studentName, signedBy, staffPortalUrl }) {
  const applicationReference = safeReference(reference);
  const student = safeName(studentName, "student name");
  const signed = safeNames(signedBy, "completed signer name");
  const completed = melbourneTime(completedAt, "completion");
  const summary = signed.length === 1
    ? "The required parent or guardian signature has been received. The application is ready for staff review."
    : "All required parent or guardian signatures have been received. The application is ready for staff review.";
  return {
    text: `Application for Enrolment complete. Student: ${student}. Reference: ${applicationReference}.`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: ":white_check_mark: *Application for Enrolment complete*" } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Student*\n${student}` },
          { type: "mrkdwn", text: `*Signed by*\n${signed.join(", ")}` },
          { type: "mrkdwn", text: `*Reference*\n${applicationReference}` },
          { type: "mrkdwn", text: `*Completed*\n${completed}` }
        ]
      },
      { type: "section", text: { type: "mrkdwn", text: summary } },
      ...actions(staffPortalUrl)
    ]
  };
}

// Offer acceptance is separate from the original Application submission. Only
// operational identity/progress fields are projected; no guardian contact restrictions,
// private links, signatures, email addresses or agreement documents reach Slack.
export function offerAcceptanceMessage({ type, reference, studentName, entryYear, entryLevel, signedBy, requiredCount, signedAt, staffPortalUrl }) {
  const complete = type === "offer_acceptance_complete";
  if (!complete && type !== "offer_signature_pending") throw new Error("Slack offer notification type is invalid.");
  const student = safeName(studentName, "student name");
  const signed = safeNames(signedBy, "completed signer name");
  if (!Number.isInteger(requiredCount) || requiredCount < 1 || requiredCount > 6 || signed.length > requiredCount || complete !== (signed.length === requiredCount)) throw new Error("Slack offer signature progress is invalid.");
  if (!/^20\d{2}$/.test(String(entryYear))) throw new Error("Slack offer entry year is invalid.");
  const level = safeName(entryLevel, "entry level");
  const at = melbourneTime(signedAt, "offer acceptance");
  const heading = complete ? "Provisional offer acceptance complete" : "Provisional offer: parent/guardian acceptance received";
  const summary = complete
    ? "All required signatures have been received. The offer remains subject to registration and written confirmation of commencement."
    : "Acceptance is awaiting the remaining required parent/guardian signatures.";
  return {
    text: `${heading}. Student: ${student}. ${signed.length} of ${requiredCount} required signatures received.`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `${complete ? ":white_check_mark:" : ":hourglass_flowing_sand:"} *${heading}*` } },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*Student*\n${student}` },
        { type: "mrkdwn", text: `*Entry*\n${level} · ${entryYear}` },
        { type: "mrkdwn", text: `*Signed by*\n${signed.join(", ")}` },
        { type: "mrkdwn", text: `*Signature progress*\n${signed.length} of ${requiredCount} required signatures` },
        ...(reference ? [{ type: "mrkdwn", text: `*Application reference*\n${safeReference(reference)}` }] : []),
        { type: "mrkdwn", text: `*Accepted*\n${at}` }
      ] },
      { type: "section", text: { type: "mrkdwn", text: summary } },
      ...actions(staffPortalUrl)
    ]
  };
}

function webhook(value, label) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "hooks.slack.com") throw new Error(`Slack ${label} webhook URL is invalid.`);
  return raw;
}

export class SlackNotifier {
  constructor({ pendingWebhookUrl = "", completionWebhookUrl = "", staffPortalUrl = "" } = {}) {
    this.pendingWebhookUrl = webhook(pendingWebhookUrl, "pending-signature");
    this.completionWebhookUrl = webhook(completionWebhookUrl, "completion");
    this.staffPortalUrl = String(staffPortalUrl || "").trim();
    this.pendingEnabled = Boolean(this.pendingWebhookUrl);
    this.completionEnabled = Boolean(this.completionWebhookUrl);
    this.enabled = this.pendingEnabled || this.completionEnabled;
    if (this.enabled && !this.staffPortalUrl) throw new Error("Slack notifications require a staff portal URL.");
  }

  async send(payload) {
    const type = String(payload?.type || "");
    const pending = type === "signature_pending" || type === "offer_signature_pending";
    const complete = type === "application_complete" || type === "offer_acceptance_complete";
    if (!pending && !complete) throw new Error("Slack notification type is invalid.");
    const webhookUrl = pending ? this.pendingWebhookUrl : this.completionWebhookUrl;
    if (!webhookUrl) return { skipped: true, reason: "not_configured" };
    const message = type.startsWith("offer_")
      ? offerAcceptanceMessage({ ...payload, staffPortalUrl: this.staffPortalUrl })
      : pending ? signaturePendingMessage({ ...payload, staffPortalUrl: this.staffPortalUrl })
      : applicationCompletionMessage({ ...payload, staffPortalUrl: this.staffPortalUrl });
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error(`Slack webhook delivery failed with status ${response.status}.`);
    return { delivered: true };
  }
}
