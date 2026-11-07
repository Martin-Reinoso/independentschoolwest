import assert from "node:assert/strict";
import test from "node:test";
import { SesMailer } from "../ses-mailer.mjs";

test('SES accepts bounded signed acceptance PDFs and rejects over-limit or unreviewed attachments',async()=>{
 let input;const mailer=new SesMailer({from:'sender@example.test',client:{send:async c=>{input=c.input;return{MessageId:'synthetic'};}}});const attachment={fileName:'Rosewood-signed-acceptance.pdf',contentType:'application/pdf',data:Buffer.from('%PDF-synthetic')},message={to:'family@example.test',subject:'Test',text:'Test',html:'<p>Test</p>'};
 await mailer.send({...message,attachments:[attachment]});assert.equal(input.Content.Simple.Attachments[0].FileName,attachment.fileName);
 for(const modified of [{fileName:'unreviewed.pdf'},{contentType:'text/html'},{data:Buffer.alloc(2_000_001)}])await assert.rejects(()=>mailer.send({...message,attachments:[{...attachment,...modified}]}));
 await assert.rejects(()=>mailer.send({...message,attachments:[attachment,attachment]}));
});

test("SES uses the Rosewood display name without changing the authenticated mailbox", async () => {
  let input;
  const client = {
    async send(command) {
      input = command.input;
      return { MessageId: "synthetic-message-id" };
    }
  };
  const mailer = new SesMailer({
    from: "enrolment@ffe.org.au",
    fromName: "Rosewood College Enrolment",
    replyTo: "enrolment@ffe.org.au",
    client
  });

  await mailer.send({ to: "success@simulator.amazonses.com", subject: "Synthetic", text: "Synthetic", html: "<p>Synthetic</p>" });

  assert.equal(input.FromEmailAddress, "Rosewood College Enrolment <enrolment@ffe.org.au>");
  assert.deepEqual(input.ReplyToAddresses, ["enrolment@ffe.org.au"]);
  assert.deepEqual(input.Destination.ToAddresses, ["success@simulator.amazonses.com"]);
});

test("SES permits a validated message-specific Reply-To address", async () => {
  let input;
  const mailer = new SesMailer({
    from: "enrolment@ffe.org.au",
    fromName: "Rosewood College Enrolment",
    replyTo: "enrolment@ffe.org.au",
    client: { async send(command) { input = command.input; return { MessageId: "synthetic-message-id" }; } }
  });

  await mailer.send({
    to: "info@ffe.org.au",
    replyTo: "family@example.test",
    subject: "Synthetic enquiry",
    text: "Synthetic",
    html: "<p>Synthetic</p>"
  });

  assert.deepEqual(input.ReplyToAddresses, ["family@example.test"]);
});

test('SES attaches the reviewed PDF bytes and rejects other attachment content',async()=>{
 let input;const mailer=new SesMailer({from:'sender@example.test',client:{send:async c=>{input=c.input;return {MessageId:'synthetic'};}}});const message={to:'family@example.test',subject:'Offer',text:'See letter',html:'<p>See letter</p>'},data=Buffer.from('%PDF-synthetic');await mailer.send({...message,attachments:[{fileName:'Rosewood-offer.pdf',contentType:'application/pdf',data}]});assert.deepEqual(input.Content.Simple.Attachments[0].RawContent,data);assert.equal(input.Content.Simple.Attachments[0].ContentTransferEncoding,'BASE64');assert.equal(input.Content.Simple.Attachments[0].ContentDisposition,'ATTACHMENT');await assert.rejects(()=>mailer.send({...message,attachments:[{fileName:'Rosewood-offer.pdf',contentType:'application/pdf',data:Buffer.from('invalid')}]}));
});
