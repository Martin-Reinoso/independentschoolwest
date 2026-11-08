import assert from "node:assert/strict";
import test from "node:test";
import { applicationCompletionMessage, signaturePendingMessage, SlackNotifier } from "../slack-notifier.mjs";

const portalUrl = "https://ffe.org.au/pages/rosewood-enrolment-admin-v6.html";
const syntheticWebhook = suffix => ["https://hooks.slack.com", "services", "T000", suffix, "synthetic"].join("/");

test("pending notification includes only the approved operational identity fields", () => {
  const message = signaturePendingMessage({
    reference: "APP-2026-SYNTHETIC",
    submittedAt: "2026-08-09T03:15:00.000Z",
    studentName: "Avery Example",
    signedBy: ["Alex Applicant"],
    awaitingSignatures: ["Taylor Guardian"],
    staffPortalUrl: portalUrl
  });
  const serialized = JSON.stringify(message);
  for (const expected of ["Avery Example", "Alex Applicant", "Taylor Guardian", "APP-2026-SYNTHETIC", "Awaiting additional parent/guardian signature", "Open staff portal"]) {
    assert.match(serialized, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const sensitive of ["@example.test", "date_of_birth", "medical", "applicationId", "guardianId", "currentEmail"]) {
    assert.doesNotMatch(serialized, new RegExp(sensitive, "i"));
  }
});

test("completion notification includes student and signer names without application answers", () => {
  const message = applicationCompletionMessage({
    reference: "APP-2026-SYNTHETIC",
    completedAt: "2026-08-09T03:15:00.000Z",
    studentName: "Avery Example",
    signedBy: ["Alex Applicant", "Taylor Guardian"],
    staffPortalUrl: portalUrl
  });
  const serialized = JSON.stringify(message);
  for (const expected of ["Avery Example", "Alex Applicant", "Taylor Guardian", "APP-2026-SYNTHETIC", "All required parent or guardian signatures", "Open staff portal"]) {
    assert.match(serialized, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const sensitive of ["@example.test", "date_of_birth", "medical", "applicationId", "guardianId", "currentEmail"]) {
    assert.doesNotMatch(serialized, new RegExp(sensitive, "i"));
  }
});

test("one-guardian completion uses singular wording", () => {
  const message = applicationCompletionMessage({
    reference: "APP-2026-SYNTHETIC",
    completedAt: "2026-08-09T03:15:00.000Z",
    studentName: "Avery Example",
    signedBy: ["Alex Applicant"],
    staffPortalUrl: portalUrl
  });
  assert.match(JSON.stringify(message), /The required parent or guardian signature has been received/);
});

test("notifier routes pending and complete messages to different webhooks", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200 };
    };
    const notifier = new SlackNotifier({
      pendingWebhookUrl: syntheticWebhook("BPENDING"),
      completionWebhookUrl: syntheticWebhook("BCOMPLETE"),
      staffPortalUrl: portalUrl
    });
    assert.equal(notifier.pendingEnabled, true);
    assert.equal(notifier.completionEnabled, true);
    await notifier.send({ type: "signature_pending", reference: "APP-2026-SYNTHETIC", submittedAt: "2026-08-09T03:15:00.000Z", studentName: "Avery Example", signedBy: ["Alex Applicant"], awaitingSignatures: ["Taylor Guardian"] });
    await notifier.send({ type: "application_complete", reference: "APP-2026-SYNTHETIC", completedAt: "2026-08-09T04:15:00.000Z", studentName: "Avery Example", signedBy: ["Alex Applicant", "Taylor Guardian"] });
    assert.equal(requests.length, 2);
    assert.match(String(requests[0].url), /BPENDING/);
    assert.match(String(requests[1].url), /BCOMPLETE/);
    assert.match(requests[0].options.body, /Taylor Guardian/);
    assert.match(requests[1].options.body, /Application for Enrolment complete/);

    globalThis.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(() => notifier.send({ type: "application_complete", reference: "APP-2026-SYNTHETIC", completedAt: "2026-08-09T04:15:00.000Z", studentName: "Avery Example", signedBy: ["Alex Applicant", "Taylor Guardian"] }), /status 503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unconfigured routes skip only their own notification type", async () => {
  const notifier = new SlackNotifier({ completionWebhookUrl: syntheticWebhook("BCOMPLETE"), staffPortalUrl: portalUrl });
  assert.equal(notifier.pendingEnabled, false);
  assert.equal(notifier.completionEnabled, true);
  assert.deepEqual(await notifier.send({ type: "signature_pending" }), { skipped: true, reason: "not_configured" });
  await assert.rejects(() => notifier.send({ type: "unknown" }), /type is invalid/);
});

test("names are escaped before Slack mrkdwn rendering", () => {
  const serialized = JSON.stringify(signaturePendingMessage({
    reference: "APP-2026-SYNTHETIC",
    submittedAt: "2026-08-09T03:15:00.000Z",
    studentName: "Avery <Example>",
    signedBy: ["Alex & Applicant"],
    awaitingSignatures: ["Taylor > Guardian"],
    staffPortalUrl: portalUrl
  }));
  assert.match(serialized, /Avery &lt;Example&gt;/);
  assert.match(serialized, /Alex &amp; Applicant/);
  assert.match(serialized, /Taylor &gt; Guardian/);
});

test("offer notifications route partial and complete acceptance separately and keep offer status provisional", async () => {
  const originalFetch=globalThis.fetch,requests=[];
  try {
    globalThis.fetch=async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:true,status:200};};
    const n=new SlackNotifier({pendingWebhookUrl:syntheticWebhook('BPENDING'),completionWebhookUrl:syntheticWebhook('BCOMPLETE'),staffPortalUrl:portalUrl});
    const base={reference:'APP-SYNTHETIC',studentName:'Avery <Synthetic>',entryYear:'2027',entryLevel:'Foundation',signedBy:['Alex & Synthetic'],requiredCount:2,signedAt:'2026-11-08T00:00:00Z',email:'private@example.test',contactRestriction:'private reason',signatureDataUrl:'private signature',invite:'private token'};
    await n.send({...base,type:'offer_signature_pending'});await n.send({...base,type:'offer_acceptance_complete',signedBy:['Alex & Synthetic','Taylor Synthetic']});
    assert.match(requests[0].url,/BPENDING/);assert.match(requests[1].url,/BCOMPLETE/);assert.match(JSON.stringify(requests[0].body),/1 of 2 required signatures/);assert.match(JSON.stringify(requests[1].body),/subject to registration and written confirmation/);assert.match(JSON.stringify(requests),/Avery &lt;Synthetic&gt;/);assert.doesNotMatch(JSON.stringify(requests),/private@example|private reason|private signature|private token|Application for Enrolment complete/);
    globalThis.fetch=async()=>({ok:false,status:503});await assert.rejects(()=>n.send({...base,type:'offer_signature_pending'}),/status 503/);
  } finally {globalThis.fetch=originalFetch;}
});

test("offer notification rejects inconsistent completion and can omit a missing legacy reference", async () => {
  const originalFetch=globalThis.fetch;let delivered=0;
  try {
    globalThis.fetch=async()=>{delivered++;return {ok:true,status:200};};
    const n=new SlackNotifier({pendingWebhookUrl:syntheticWebhook('BPENDING'),completionWebhookUrl:syntheticWebhook('BCOMPLETE'),staffPortalUrl:portalUrl});
    const base={studentName:'Avery Synthetic',entryYear:'2027',entryLevel:'Foundation',signedBy:['Alex Synthetic'],requiredCount:2,signedAt:'2026-11-08T00:00:00Z'};
    await assert.rejects(()=>n.send({...base,type:'offer_acceptance_complete'}),/progress is invalid/);assert.equal(delivered,0);
    await n.send({...base,type:'offer_signature_pending'});assert.equal(delivered,1);
    const disabled=new SlackNotifier({completionWebhookUrl:syntheticWebhook('BCOMPLETE'),staffPortalUrl:portalUrl});assert.deepEqual(await disabled.send({type:'offer_signature_pending'}),{skipped:true,reason:'not_configured'});assert.equal(delivered,1);
  } finally {globalThis.fetch=originalFetch;}
});
