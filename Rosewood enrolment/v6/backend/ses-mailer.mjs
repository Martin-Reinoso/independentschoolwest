import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

function formattedMailbox(displayName, address) {
  const safeName = String(displayName || "").replace(/[\r\n<>]/g, " ").replace(/\s+/g, " ").trim();
  return safeName ? `${safeName} <${address}>` : address;
}

export class SesMailer {
  constructor({ from, fromName, replyTo, configurationSetName, client = new SESv2Client({}) }) {
    this.from = from;
    this.fromName = fromName;
    this.replyTo = replyTo;
    this.configurationSetName = configurationSetName;
    this.client = client;
  }

  async send({ to, subject, text, html, tags = {}, replyTo }) {
    const replyToAddress = String(replyTo || this.replyTo || "").trim();
    if (/[\r\n]/.test(replyToAddress)) throw new Error("SES Reply-To address is invalid.");
    const result = await this.client.send(new SendEmailCommand({
      FromEmailAddress: formattedMailbox(this.fromName, this.from),
      ReplyToAddresses: replyToAddress ? [replyToAddress] : undefined,
      Destination: { ToAddresses: [to] },
      ConfigurationSetName: this.configurationSetName || undefined,
      EmailTags: Object.entries(tags).map(([Name, Value]) => ({ Name, Value: String(Value).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) })),
      Content: { Simple: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } } } }
    }));
    return { messageId: result.MessageId };
  }
}
