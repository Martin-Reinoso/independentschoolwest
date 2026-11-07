import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createEmailDeliveryPolicy } from "./email-delivery-policy.mjs";
import {OFFER_PDF_MAX_BYTES} from './offer-pdf.mjs';

function formattedMailbox(displayName, address) {
  const safeName = String(displayName || "").replace(/[\r\n<>]/g, " ").replace(/\s+/g, " ").trim();
  return safeName ? `${safeName} <${address}>` : address;
}

export class SesMailer {
  constructor({ from, fromName, replyTo, configurationSetName, deliveryPolicy = createEmailDeliveryPolicy(), client = new SESv2Client({}) }) {
    this.from = from;
    this.fromName = fromName;
    this.replyTo = replyTo;
    this.configurationSetName = configurationSetName;
    this.client = client;
    this.deliveryPolicy = deliveryPolicy;
  }

  async send(message) {
    const { to, subject, text, html, tags = {}, replyTo, attachments = [] } = this.deliveryPolicy.prepare(message);
    const replyToAddress = String(replyTo || this.replyTo || "").trim();
    if (/[\r\n]/.test(replyToAddress)) throw new Error("SES Reply-To address is invalid.");
    if(attachments.length>1)throw new Error('Only one reviewed PDF attachment is supported.');
    const attachmentData=attachments.map(a=>{
      const limit=['Rosewood-offer.pdf','Rosewood-signed-acceptance.pdf'].includes(a.fileName)?OFFER_PDF_MAX_BYTES:0;
      if(!limit || a.contentType!=='application/pdf' || !Buffer.isBuffer(a.data) || a.data.length>limit || !a.data.subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('Invalid offer PDF attachment.');
      return {FileName:a.fileName,ContentType:a.contentType,RawContent:a.data,ContentDisposition:'ATTACHMENT',ContentTransferEncoding:'BASE64'};
    });
    const result = await this.client.send(new SendEmailCommand({
      FromEmailAddress: formattedMailbox(this.fromName, this.from),
      ReplyToAddresses: replyToAddress ? [replyToAddress] : undefined,
      Destination: { ToAddresses: [to] },
      ConfigurationSetName: this.configurationSetName || undefined,
      EmailTags: Object.entries(tags).map(([Name, Value]) => ({ Name, Value: String(Value).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) })),
      Content: { Simple: { ...(attachmentData.length?{Attachments:attachmentData}:{}), Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } } } }
    }));
    return { messageId: result.MessageId };
  }
}
