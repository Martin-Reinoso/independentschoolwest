import { createHash } from 'node:crypto';

export const PROPOSED_SENDER = 'Rosewood College Accounts <rosewood.accounts@ffe.org.au>';
const validEmail = (value) =>
  typeof value === 'string' &&
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(
    value,
  ) &&
  value.length <= 254;
const fail = (code, message) => Object.assign(new Error(message), { code, status: 400 });
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

/** Explicit operator configuration. The application never enables delivery by a UI flag. */
export function loadMailConfig({ env = process.env, demoMode = false } = {}) {
  const mode = env.BILLING_MAIL_TRANSPORT || 'disabled';
  const senderName = env.BILLING_MAIL_FROM_NAME || 'Rosewood College Accounts';
  const fromAddress = env.BILLING_MAIL_FROM_ADDRESS || '';
  const replyTo = env.BILLING_MAIL_REPLY_TO || fromAddress;
  const region = env.BILLING_MAIL_REGION || '';
  let reason =
    'Email delivery is disabled. Drafts, reviews and reminder preparation are available.';
  let enabled = false;
  if (!['disabled', 'ses'].includes(mode))
    throw fail('MAIL_CONFIG_INVALID', 'Choose disabled or ses for BILLING_MAIL_TRANSPORT.');
  if (demoMode) reason = 'Synthetic demonstration: external email delivery is always disabled.';
  else if (mode === 'ses' && env.BILLING_MAIL_DELIVERY_ENABLED === '1') {
    if (
      !validEmail(fromAddress) ||
      !validEmail(replyTo) ||
      !/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(region) ||
      typeof senderName !== 'string' ||
      senderName.length > 100 ||
      /[\r\n<>"\x00-\x1f]/.test(senderName)
    ) {
      throw fail(
        'MAIL_CONFIG_INVALID',
        'Set a verified sender address, reply-to address, name and SES region before enabling delivery.',
      );
    }
    enabled = true;
    reason =
      'Amazon SES delivery enabled for approved queued messages. Provider acceptance does not confirm inbox delivery.';
  }
  return {
    mode,
    enabled,
    demoMode,
    senderName,
    fromAddress,
    replyTo,
    region,
    profile: env.BILLING_MAIL_AWS_PROFILE || undefined,
    configurationSet: env.BILLING_MAIL_CONFIGURATION_SET || undefined,
    reason,
    timeoutMs: 20_000,
    maxAttachmentBytes: 5 * 1024 * 1024,
  };
}

export function mailStatus(config) {
  return {
    mode: config.mode,
    enabled: config.enabled,
    demoMode: config.demoMode,
    sender: config.fromAddress ? `${config.senderName} <${config.fromAddress}>` : '',
    proposedSender: PROPOSED_SENDER,
    reason: config.reason,
  };
}

export function renderEmailHtml({ body, senderName = 'Rosewood College Accounts' }) {
  const paragraphs = String(body)
    .split(/\n\s*\n/)
    .map(
      (part) =>
        `<p style="margin:0 0 18px;line-height:1.65">${escape(part).replaceAll('\n', '<br>')}</p>`,
    )
    .join('');
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#193349"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dce3e6"><tr><td style="padding:24px 30px;background:#193349;color:#ffffff;font-size:22px;font-weight:bold">${escape(senderName)}</td></tr><tr><td style="padding:30px;font-size:16px">${paragraphs}<p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #dce3e6;font-size:13px;color:#566573">Please reply to this email if you need assistance with your account.</p></td></tr></table></td></tr></table></body></html>`;
}

/** No SDK or credential discovery happens until an explicitly enabled worker sends. */
export async function createMailTransport(config, { client, Command } = {}) {
  if (!config.enabled || config.demoMode)
    throw fail('MAIL_DISABLED', config.reason || 'Email delivery is disabled.');
  if (!client) {
    const sdk = await import('@aws-sdk/client-sesv2');
    // SendEmail has no idempotency token. SDK retries could duplicate accepted mail.
    client = new sdk.SESv2Client({
      region: config.region,
      profile: config.profile,
      maxAttempts: 1,
    });
    Command = sdk.SendEmailCommand;
  }
  if (!Command) throw new Error('A send command constructor is required.');
  return {
    async send(payload, attachment, { attemptId } = {}) {
      if (
        !validEmail(payload.to) ||
        !payload.subject ||
        payload.subject.length > 200 ||
        /[\r\n\x00-\x1f]/.test(payload.subject) ||
        typeof payload.body !== 'string' ||
        payload.body.length > 20_000
      )
        throw fail('MAIL_CONTENT_INVALID', 'Review the recipient, subject and email body.');
      if (
        payload.document?.settings?.demoMode ||
        payload.document?.document?.sellerSnapshot?.demoMode ||
        payload.document?.document?.snapshot?.sellerSnapshot?.demoMode
      )
        throw fail(
          'SAMPLE_MAIL_BLOCKED',
          'Sample documents cannot be sent through a live email provider.',
        );
      if (
        !Buffer.isBuffer(attachment) ||
        attachment.subarray(0, 5).toString() !== '%PDF-' ||
        attachment.length > config.maxAttachmentBytes
      )
        throw fail(
          'MAIL_ATTACHMENT_INVALID',
          'The PDF attachment is unavailable or exceeds the 5 MB email limit.',
        );
      const kind = payload.document?.kind;
      if (!['invoice', 'receipt', 'credit', 'statement'].includes(kind))
        throw fail('MAIL_CONTENT_INVALID', 'The email document type is invalid.');
      const input = {
        FromEmailAddress: `"${config.senderName}" <${config.fromAddress}>`,
        ReplyToAddresses: [config.replyTo],
        Destination: { ToAddresses: [payload.to] },
        Content: {
          Simple: {
            Subject: { Data: payload.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: payload.body, Charset: 'UTF-8' },
              Html: {
                Data: renderEmailHtml({ body: payload.body, senderName: config.senderName }),
                Charset: 'UTF-8',
              },
            },
            Attachments: [
              {
                RawContent: attachment,
                FileName: `rosewood-${kind}.pdf`,
                ContentType: 'application/pdf',
                ContentDisposition: 'ATTACHMENT',
                ContentTransferEncoding: 'BASE64',
              },
            ],
          },
        },
        ...(config.configurationSet ? { ConfigurationSetName: config.configurationSet } : {}),
        EmailTags: [
          {
            Name: 'billing_attempt',
            Value: createHash('sha256')
              .update(String(attemptId || ''))
              .digest('hex'),
          },
        ],
      };
      const result = await client.send(new Command(input), {
        abortSignal: AbortSignal.timeout(config.timeoutMs),
      });
      if (
        typeof result.MessageId !== 'string' ||
        !result.MessageId ||
        result.MessageId.length > 200
      )
        throw Object.assign(
          new Error('The provider response did not include an acceptance identifier.'),
          { code: 'MAIL_RESULT_UNCERTAIN' },
        );
      return {
        providerId: result.MessageId,
        attachmentSha256: createHash('sha256').update(attachment).digest('hex'),
      };
    },
    close() {
      client.destroy?.();
    },
  };
}

export function classifyMailFailure(error) {
  const code = /^[A-Za-z0-9_]{1,100}$/.test(error?.code || error?.name || '')
    ? error.code || error.name
    : 'MAIL_PROVIDER_ERROR';
  const status = error?.$metadata?.httpStatusCode;
  const beforeSend = [
    'MAIL_CONTENT_INVALID',
    'SAMPLE_MAIL_BLOCKED',
    'MAIL_ATTACHMENT_INVALID',
    'MAIL_DISABLED',
    'DOCUMENT_UNSUPPORTED_TEXT',
  ].includes(code);
  return {
    outcome:
      beforeSend || (Number.isInteger(status) && status >= 400 && status < 500 && status !== 408)
        ? 'failed'
        : 'uncertain',
    errorCode: code,
  };
}
