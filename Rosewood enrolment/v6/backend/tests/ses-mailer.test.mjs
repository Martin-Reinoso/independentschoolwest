import assert from "node:assert/strict";
import test from "node:test";
import { SesMailer } from "../ses-mailer.mjs";

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
