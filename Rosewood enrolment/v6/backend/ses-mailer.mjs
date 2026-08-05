import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export class SesMailer {
  constructor({ from, replyTo, configurationSetName, client = new SESv2Client({}) }) {
    this.from = from;
    this.replyTo = replyTo;
    this.configurationSetName = configurationSetName;
    this.client = client;
  }

  async send({ to, subject, text, html, tags = {} }) {
    const result = await this.client.send(new SendEmailCommand({
      FromEmailAddress: this.from,
      ReplyToAddresses: this.replyTo ? [this.replyTo] : undefined,
      Destination: { ToAddresses: [to] },
      ConfigurationSetName: this.configurationSetName || undefined,
      EmailTags: Object.entries(tags).map(([Name, Value]) => ({ Name, Value: String(Value).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) })),
      Content: { Simple: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } } } }
    }));
    return { messageId: result.MessageId };
  }
}
