import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export class SesMailer {
  constructor({ client = new SESv2Client({}) } = {}) {
    this.client = client;
  }

  async send({ from, replyTo, to, subject, text, html }) {
    const result = await this.client.send(new SendEmailCommand({
      FromEmailAddress: from,
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: text, Charset: "UTF-8" },
            Html: { Data: html, Charset: "UTF-8" }
          }
        }
      }
    }));
    return { messageId: result.MessageId };
  }
}
