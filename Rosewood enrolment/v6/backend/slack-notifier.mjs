function completedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Slack completion notification requires a valid completion timestamp.");
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function safeReference(value) {
  const reference = String(value || "").trim();
  if (!/^APP-[A-Z0-9_-]{6,40}$/.test(reference)) throw new Error("Slack completion notification requires a valid application reference.");
  return reference;
}

export function applicationCompletionMessage({ reference, completedAt, staffPortalUrl }) {
  const safePortalUrl = new URL(staffPortalUrl);
  if (safePortalUrl.protocol !== "https:") throw new Error("Slack staff portal URL must use HTTPS.");
  const safeCompletedAt = completedTime(completedAt);
  const safeApplicationReference = safeReference(reference);
  const summary = "A Rosewood Application for Enrolment is complete and ready for staff review.";
  return {
    text: `${summary} Reference: ${safeApplicationReference}.`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `:white_check_mark: *Application for Enrolment complete*\n${summary}` }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Reference*\n${safeApplicationReference}` },
          { type: "mrkdwn", text: `*Completed*\n${safeCompletedAt}` }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open staff portal" },
            url: safePortalUrl.toString()
          }
        ]
      }
    ]
  };
}

export class SlackNotifier {
  constructor({ webhookUrl = "", staffPortalUrl = "" } = {}) {
    this.webhookUrl = String(webhookUrl || "").trim();
    this.staffPortalUrl = String(staffPortalUrl || "").trim();
    this.enabled = Boolean(this.webhookUrl);
    if (this.enabled) {
      const url = new URL(this.webhookUrl);
      if (url.protocol !== "https:" || url.hostname !== "hooks.slack.com") throw new Error("Slack webhook URL is invalid.");
      if (!this.staffPortalUrl) throw new Error("Slack notifications require a staff portal URL.");
    }
  }

  async send(payload) {
    if (!this.enabled) return { skipped: true, reason: "not_configured" };
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(applicationCompletionMessage({ ...payload, staffPortalUrl: this.staffPortalUrl }))
    });
    if (!response.ok) throw new Error(`Slack webhook delivery failed with status ${response.status}.`);
    return { delivered: true };
  }
}
