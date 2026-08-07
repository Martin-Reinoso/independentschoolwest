import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../../../../", import.meta.url);

async function sha256(relativePath) {
  const content = await readFile(new URL(relativePath, root));
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function policies() {
  const source = await readFile(new URL("pages/rosewood-enrolment-policies-v6.js", root), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.rosewoodPolicyDocuments;
}

test("the policy reader uses the three byte-identical approved Word documents", async () => {
  const documents = await policies();
  const expected = {
    "enrolment-policy": {
      title: "Enrolment Policy",
      sourceSha256: "e4f59b3928a36f98dc38392ca33ddef599bdca4be7c84eefa6a23dac5d91ca2a",
      sourceTextSha256: "3d31c7d244631268adeb239554627313b6ad398bf1fc255918d8bfdbef4f06b1",
      headings: 16
    },
    "enrolment-procedure": {
      title: "Enrolment Procedure",
      sourceSha256: "042abe1f25ccd8acfc640365ca3cfc4aaa5eb6ea5b25576e5d407e0d7778066f",
      sourceTextSha256: "5d8bc8720a8d14ee0f93cddfda752916ef14d4a642b4337039070eaf84cf641b",
      headings: 21
    },
    "privacy-policy": {
      title: "Privacy Policy",
      sourceSha256: "f0cde7768b7ab470a41f95885f409797aacb9f3154cc2e58332144aaa6f26823",
      sourceTextSha256: "df21a188ebbe89a70574021e7ae27c4c44206c8e5eee9d050382cf856cfe82cc",
      headings: 15
    }
  };

  assert.deepEqual(Object.keys(documents), Object.keys(expected));
  for (const [slug, contract] of Object.entries(expected)) {
    const document = documents[slug];
    assert.equal(document.title, contract.title);
    assert.equal(document.sourceSha256, contract.sourceSha256);
    assert.equal(document.sourceTextSha256, contract.sourceTextSha256);
    assert.equal(document.headings.length, contract.headings);
    assert.equal(await sha256(`pages/${document.sourceFile}`), contract.sourceSha256);
    assert.match(document.html, /<table class="policy-register">/);
    assert.match(document.html, /<h3 id="policy-section-/);
    assert.match(document.html, /<ul><li>/);
    const pdf = await readFile(new URL(`pages/${document.sourcePdf}`, root));
    assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
  }

  assert.match(documents["enrolment-policy"].html, /The purpose of this policy is to establish the principles and criteria governing the enrolment of students at Rosewood College\./);
  assert.match(documents["enrolment-procedure"].html, /This procedure sets out the process for managing student enrolment at Rosewood College/);
  assert.match(documents["privacy-policy"].html, /Appendix B: Shortform Privacy Collection Statement/);
});

test("the application welcome links to the internal policy reader without a collection-notice reference", async () => {
  const [html, source, css] = await Promise.all([
    readFile(new URL("pages/rosewood-enrolment-v6.html", root), "utf8"),
    readFile(new URL("pages/rosewood-enrolment-v6.js", root), "utf8"),
    readFile(new URL("pages/rosewood-enrolment-v6.css", root), "utf8")
  ]);
  const gatewayFunction = source.slice(source.indexOf("  function renderGateway"), source.indexOf("  function renderOtp"));
  const gateway = gatewayFunction.slice(0, gatewayFunction.indexOf("    return intro(kind === \"acceptance\""));
  const viewer = source.slice(source.indexOf("  function welcomePolicyLinks"), source.indexOf("  function communicationNotice"));

  assert.match(html, /rosewood-enrolment-policies-v6\.js\?v=1/);
  assert.match(gateway, /following Rosewood College policies/);
  assert.match(gateway, /Information provided through this application will be managed in accordance with the Privacy Policy\./);
  assert.doesNotMatch(gateway, /Privacy Collection Notice/);
  assert.match(viewer, /data-policy-link/);
  assert.match(viewer, /data-policy-return/);
  assert.match(viewer, /download/);
  assert.doesNotMatch(viewer, /type="checkbox"|acknowledgement checkbox/i);
  assert.match(source, /history\.pushState/);
  assert.match(source, /window\.addEventListener\("popstate"/);
  assert.match(source, /state\.values/);
  assert.match(css, /\.policy-reader-toolbar \{ position: sticky/);
  assert.match(css, /body\.policy-reader-open \.story-panel \{ display: none/);
  assert.match(css, /\.policy-register, \.policy-register tbody/);
});
