import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const axeUrl = "/Rosewood%20enrolment/v2/node_modules/axe-core/axe.min.js";

async function openPreview(page) {
  await page.goto("/pages/rosewood-enrolment-v2.html?preview=1");
  await page.getByRole("button", { name: "Enter synthetic content preview" }).click();
  await expect(page.locator("#application-view")).toBeVisible();
}

function browserApplication() {
  return {
    readiness_acknowledgement: "Yes",
    student_first_name: "Ava",
    student_last_name: "Example",
    student_date_of_birth: "2021-03-04",
    entry_year: "2027",
    entry_year_level: "Prep",
    current_school: "Example Early Learning",
    current_year_level: "4-year-old kindergarten",
    student_address: "1 Example Street",
    student_suburb: "Melton",
    student_postcode: "3337",
    country_of_birth: "Australia",
    residency_status: "Australian citizen",
    home_language: "English",
    family_connection: "New family",
    guardian_a_first_name: "Morgan",
    guardian_a_last_name: "Example",
    guardian_a_relationship: "Mother",
    guardian_a_email: "guardian@example.test",
    guardian_a_mobile: "0400000000",
    guardian_a_contact_role: "Primary contact",
    guardian_a_legal_responsibility: "Yes",
    care_arrangement: "Both parents together",
    court_orders: "No",
    emergency_first_name: "Taylor",
    emergency_last_name: "Example",
    emergency_relationship: "Aunt",
    emergency_mobile: "0411000000",
    guardian_completeness: "Yes",
    additional_needs: "No",
    medical_needs: "No",
    immunisation_status: "Up to date and available",
    previous_school_permission: "Yes",
    previous_school_name: "Example Early Learning",
    student_name_permission: "First name only",
    fee_responsibility: "Joint",
    referral_source: "Current or founding family",
    decision_factors: ["Faith and character", "Academic approach"],
    information_declaration: "Yes",
    privacy_acknowledgement: "Yes",
    authority_declaration: "Yes",
    review_ready: "Yes",
    documents: []
  };
}

function pngDataUrl() {
  const bytes = Buffer.alloc(220, 1);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function api(request, method, path, body, token) {
  const response = await request.fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `browser-${crypto.randomUUID()}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    data: body
  });
  const payload = await response.json();
  expect(response.ok(), `${method} ${path}: ${JSON.stringify(payload)}`).toBe(true);
  return payload;
}

test("preview is visibly synthetic and performs no service writes", async ({ page }) => {
  const serviceRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/v2/")) serviceRequests.push(request.url());
  });
  await openPreview(page);
  await expect(page.locator(".draft-banner")).toContainText("not open for real applications");
  await expect(page.locator("#save-state")).toContainText("Preview only");
  await page.waitForTimeout(250);
  expect(serviceRequests).toEqual([]);
});

test("desktop journey remains readable and the active content is not clipped", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop layout assertion");
  await openPreview(page);
  const panel = page.locator(".journey-panel");
  const box = await panel.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.height).toBeLessThanOrEqual(1000);
  await expect(page.locator("#save-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Everything you need, before you begin." })).toBeVisible();
});

test("mobile introduces the journey before the form and has no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile layout assertion");
  await page.goto("/pages/rosewood-enrolment-v2.html?preview=1");
  const story = page.locator(".access-story");
  const panel = page.locator(".access-panel");
  const storyBox = await story.boundingBox();
  const panelBox = await panel.boundingBox();
  expect(storyBox.y).toBeLessThan(panelBox.y);
  await expect(page.getByText("Your family’s", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await openPreview(page);
  await expect(page.locator(".mobile-progress")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("validation is explicit and conditional questions appear only when relevant", async ({ page }) => {
  await openPreview(page);
  await page.getByRole("button", { name: "Tell us about your child" }).click();
  await expect(page.locator("#global-errors")).toBeVisible();
  await expect(page.locator("#global-errors")).toContainText("required");
  await page.locator('[name="readiness_acknowledgement"]').check();
  await page.getByRole("button", { name: "Tell us about your child" }).click();
  await expect(page.locator('[data-stage="1"]')).toBeVisible();
  const visaGroup = page.locator('[data-show-when^="residency_status:"]');
  await expect(visaGroup).toBeHidden();
  await page.locator('[name="residency_status"]').selectOption("Temporary resident");
  await expect(visaGroup).toBeVisible();
  await expect(page.locator('[name="visa_subclass"]')).toHaveAttribute("required", "");
});

test("document requirements adapt to school, residency, orders and anaphylaxis", async ({ page }) => {
  await openPreview(page);
  const schoolReport = page.locator('[data-document-card="school_report"]');
  const residency = page.locator('[data-document-card="residency"]');
  const courtOrder = page.locator('[data-document-card="court_order"]');
  const medicalPlan = page.locator('[data-document-card="medical_plan"]');

  await page.locator('[data-go-stage="1"]').dispatchEvent("click");
  await page.locator('[name="current_year_level"]').selectOption("Grade 1");
  await page.locator('[name="residency_status"]').selectOption("Temporary resident");
  await page.locator('[data-go-stage="2"]').dispatchEvent("click");
  await page.locator('[name="court_orders"]').selectOption("Yes");
  await page.locator('[data-go-stage="3"]').dispatchEvent("click");
  await page.locator('[name="medical_needs"][value="Yes"]').check();
  await page.locator('[name="anaphylaxis"][value="Yes"]').check();
  await page.locator('[data-go-stage="5"]').dispatchEvent("click");

  for (const card of [schoolReport, residency, courtOrder, medicalPlan]) {
    await expect(card).toBeVisible();
    await expect(card.locator('[data-document-status]')).toHaveText("Required - not uploaded");
  }
});

test("a selected document can be removed before submission", async ({ page }) => {
  await openPreview(page);
  await page.locator('[data-go-stage="5"]').dispatchEvent("click");
  const card = page.locator('[data-document-card="birth_certificate"]');
  await card.locator('input[type="file"]').setInputFiles({ name: "synthetic-birth.pdf", mimeType: "application/pdf", buffer: Buffer.from("synthetic") });
  await expect(card.locator('[data-document-status]')).toHaveText("synthetic-birth.pdf");
  await expect(card.locator('[data-remove-document]')).toBeVisible();
  await card.locator('[data-remove-document]').click();
  await expect(card.locator('[data-document-status]')).toHaveText("Required - not uploaded");
  await expect(card.locator('[data-remove-document]')).toBeHidden();
});

test("adding a guardian adapts the family section and clears completeness", async ({ page }) => {
  await openPreview(page);
  await page.locator('[data-go-stage="2"]').dispatchEvent("click");
  await page.locator('[name="guardian_completeness"]').check();
  await page.getByRole("button", { name: "Add another parent, guardian or carer" }).click();
  await expect(page.locator('[data-guardian="b"]')).toBeVisible();
  await expect(page.locator('[name="guardian_completeness"]')).not.toBeChecked();
  await expect(page.locator('[name="guardian_b_required_signer"]')).toBeChecked();
  await page.getByRole("button", { name: "Add another parent, guardian or carer" }).click();
  await page.locator('[data-guardian="b"] .remove-guardian').click();
  await page.getByRole("button", { name: "Add another parent, guardian or carer" }).click();
  await expect(page.locator('[data-guardian="b"]')).toHaveCount(1);
  await expect(page.locator('[data-guardian="c"]')).toHaveCount(1);
  await expect(page.locator('[name="guardian_b_first_name"]')).toHaveCount(1);
  await expect(page.locator('[name="guardian_c_first_name"]')).toHaveCount(1);
});

test("a server-saved additional guardian is reconstructed on resume", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "One server-resume canary is sufficient; mobile guardian controls are covered separately.");
  const invitationToken = "playwright-v2-guardian-resume-token";
  const email = "guardian@example.test";
  const otp = await api(request, "POST", "/v2/access/request-otp", { invitationToken, email });
  const access = await api(request, "POST", "/v2/access/verify-otp", { invitationToken, challengeId: otp.challengeId, code: otp.testCode });
  await api(request, "PUT", "/v2/draft", {
    schemaVersion: "rosewood-v2-2026-08-02",
    policyVersion: "draft-2026-08-02",
    baseRevision: 0,
    clientRevision: 1,
    currentStage: 2,
    application: {
      ...browserApplication(),
      guardian_b_first_name: "Jordan",
      guardian_b_last_name: "Example",
      guardian_b_relationship: "Father",
      guardian_b_email: "second@example.test",
      guardian_b_mobile: "0422000000",
      guardian_b_contact_role: "Secondary contact",
      guardian_b_required_signer: "Yes",
      guardian_b_contact_permission: "Yes"
    }
  }, access.sessionToken);

  await page.goto("/");
  await page.evaluate(({ sessionToken, inviteToken }) => {
    sessionStorage.setItem("rosewood_v2_session", sessionToken);
    sessionStorage.setItem("rosewood_v2_invite", inviteToken);
  }, { sessionToken: access.sessionToken, inviteToken: invitationToken });
  await page.goto("/pages/rosewood-enrolment-v2.html");
  await expect(page.locator("#application-view")).toBeVisible();
  await page.locator('[data-go-stage="2"]').dispatchEvent("click");
  await expect(page.locator('[data-guardian="b"]')).toBeVisible();
  await expect(page.locator('[name="guardian_b_first_name"]')).toHaveValue("Jordan");
  await expect(page.locator('[name="guardian_b_email"]')).toHaveValue("second@example.test");
  await expect(page.locator('[name="guardian_b_required_signer"]')).toBeChecked();
  await page.locator('[data-go-stage="6"]').dispatchEvent("click");
  await expect(page.locator("#review-family")).toContainText("Jordan Example");
  await expect(page.locator("#review-policy-version")).toHaveText("draft-2026-08-02");
});

test("a newer device fallback is recovered over an older server draft", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "One recovery canary is sufficient; mobile draft status is covered by layout tests.");
  const invitationToken = "playwright-v2-local-recovery-token";
  const email = "guardian@example.test";
  const otp = await api(request, "POST", "/v2/access/request-otp", { invitationToken, email });
  const access = await api(request, "POST", "/v2/access/verify-otp", { invitationToken, challengeId: otp.challengeId, code: otp.testCode });
  const serverApplication = { ...browserApplication(), student_preferred_name: "Server copy" };
  const saved = await api(request, "PUT", "/v2/draft", { schemaVersion: "rosewood-v2-2026-08-02", policyVersion: "draft-2026-08-02", baseRevision: 0, clientRevision: 1, currentStage: 1, application: serverApplication }, access.sessionToken);

  await page.goto("/");
  await page.evaluate(({ sessionToken, inviteToken, data, revision }) => {
    sessionStorage.setItem("rosewood_v2_session", sessionToken);
    sessionStorage.setItem("rosewood_v2_invite", inviteToken);
    localStorage.setItem("rosewood_v2_draft_invite-local-recovery-v2", JSON.stringify({
      schemaVersion: "rosewood-v2-2026-08-02",
      savedAt: new Date(Date.now() + 60_000).toISOString(),
      data: { ...data, student_preferred_name: "Device-only copy" },
      stage: 1,
      baseRevision: revision
    }));
  }, { sessionToken: access.sessionToken, inviteToken: invitationToken, data: serverApplication, revision: saved.revision });
  await page.goto("/pages/rosewood-enrolment-v2.html");
  await expect(page.locator("#application-view")).toBeVisible();
  await page.locator('[data-go-stage="1"]').dispatchEvent("click");
  await expect(page.locator('[name="student_preferred_name"]')).toHaveValue("Device-only copy");
  await expect(page.locator("#save-state")).toContainText("Recovered on this device");

  const saveResponse = page.waitForResponse((response) => response.url().endsWith("/v2/draft") && response.request().method() === "PUT");
  await page.locator('[name="student_preferred_name"]').fill("Recovered and edited");
  expect((await saveResponse).ok()).toBe(true);
  await expect(page.locator("#save-state")).toContainText("Saved securely");

  await page.evaluate((data) => {
    localStorage.setItem("rosewood_v2_draft_invite-local-recovery-v2", JSON.stringify({
      schemaVersion: "rosewood-v2-2026-08-02",
      savedAt: "2020-01-01T00:00:00.000Z",
      data: { ...data, student_preferred_name: "Stale device copy" },
      stage: 1,
      baseRevision: 0
    }));
  }, serverApplication);
  await page.reload();
  await expect(page.locator("#application-view")).toBeVisible();
  await page.locator('[data-go-stage="1"]').dispatchEvent("click");
  await expect(page.locator('[name="student_preferred_name"]')).toHaveValue("Recovered and edited");
  await expect(page.locator("#save-state")).toContainText("Saved securely");
});

test("optional communications default off and fee responsibility is exclusive", async ({ page }) => {
  await openPreview(page);
  await page.locator('[data-go-stage="4"]').dispatchEvent("click");
  await expect(page.locator('[name="community_updates"]')).not.toBeChecked();
  await expect(page.locator('[name="media_permissions"]:checked')).toHaveCount(0);
  await page.locator('[name="fee_responsibility"][value="Joint"]').check();
  await page.locator('[name="fee_responsibility"][value="Single account holder"]').check();
  await expect(page.locator('[name="fee_responsibility"]:checked')).toHaveCount(1);
  await expect(page.locator('[name="fee_responsibility"][value="Single account holder"]')).toBeChecked();
});

test("signature canvas is a separate gated stage", async ({ page }) => {
  await openPreview(page);
  await page.locator('[data-go-stage="7"]').dispatchEvent("click");
  const canvas = page.locator("#signature-canvas");
  await expect(canvas).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("#signature-overlay")).toBeVisible();
  await page.locator("#signature-record-declaration").check();
  await expect(canvas).toHaveAttribute("aria-disabled", "true");
  await page.locator("#signature-consent-declaration").check();
  await expect(canvas).toHaveAttribute("aria-disabled", "false");
  await expect(page.locator("#signature-overlay")).toBeHidden();
});

test("policy links resolve and placeholder status is unmistakable", async ({ page }) => {
  await page.goto("/pages/rosewood-policy-drafts-v2.html");
  await expect(page.getByRole("heading", { name: "A transparent place to begin." })).toBeVisible();
  await expect(page.locator("#enrolment-policy")).toBeVisible();
  await expect(page.locator("#privacy-collection")).toBeVisible();
  await expect(page.locator("#signing-guidance")).toContainText("Separated parents");
  await expect(page.locator("#signing-guidance")).toContainText("informal carer", { ignoreCase: true });
  await expect(page.locator("body")).toContainText("not approved", { ignoreCase: true });
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("https://*.lambda-url.ap-southeast-2.on.aws");
  expect(await page.locator("[onclick], [onload], [onerror], [onsubmit]").count()).toBe(0);
});

test("static V2 pages are compatible with their strict script policy", () => {
  for (const file of ["rosewood-enrolment-v2.html", "rosewood-sign-v2.html", "rosewood-receipt-v2.html", "rosewood-policy-drafts-v2.html"]) {
    const source = readFileSync(new URL(`../../../../pages/${file}`, import.meta.url), "utf8");
    expect(source, file).toContain('http-equiv="Content-Security-Policy"');
    expect(source, file).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(source, file).not.toMatch(/\son(?:click|load|error|submit)=/i);
  }
});

test("main preview has no serious or critical automated accessibility findings", async ({ page }) => {
  await openPreview(page);
  await page.waitForTimeout(500);
  await page.addScriptTag({ url: axeUrl });
  const results = await page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
  const severe = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  expect(severe, severe.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
});

test("remote guardian review and signature stages are unambiguous", async ({ page }) => {
  await page.goto("/pages/rosewood-sign-v2.html?preview=1");
  await page.getByRole("button", { name: "Enter synthetic signer preview" }).click();
  await page.locator('[name="detailsConfirmed"]').check();
  await page.getByRole("button", { name: "Save details and review" }).click();
  await expect(page.getByRole("heading", { name: "One frozen revision, arranged for reading." })).toBeVisible();
  await expect(page.locator("#remote-signature-canvas")).toBeHidden();
  await page.locator('[name="reviewConfirmed"]').check();
  await page.getByRole("button", { name: "Continue to my signature" }).click();
  await expect(page.locator("#remote-signature-canvas")).toBeVisible();
  await expect(page.locator("#remote-signature-canvas")).toHaveAttribute("aria-disabled", "true");
  await page.locator("#remote-audit").check();
  await page.locator("#remote-intent").check();
  await expect(page.locator("#remote-signature-canvas")).toHaveAttribute("aria-disabled", "false");
});

test("receipt preview is minimal, responsive and performs no service writes", async ({ page }) => {
  const serviceRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/v2/")) serviceRequests.push(request.url());
  });
  await page.goto("/pages/rosewood-receipt-v2.html?preview=1");
  await page.getByRole("button", { name: "Open synthetic receipt preview" }).click();
  await expect(page.getByRole("heading", { name: "Application complete." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#receipt-title")).toBeFocused();
  await expect(page.locator("#receipt-reference")).toHaveText("RW-2026-PREVIEW");
  await expect(page.locator("#receipt-signature-count")).toHaveText("2 of 2 complete");
  await expect(page.locator("body")).not.toContainText("1 Example Street");
  await expect(page.locator("body")).not.toContainText("Date of birth");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(serviceRequests).toEqual([]);
});

test("receipt preview has no serious or critical accessibility findings", async ({ page }) => {
  await page.goto("/pages/rosewood-receipt-v2.html?preview=1");
  await page.getByRole("button", { name: "Open synthetic receipt preview" }).click();
  await page.addScriptTag({ url: axeUrl });
  const results = await page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
  const severe = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  expect(severe, severe.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
});

test("real local completion email opens an OTP-protected receipt", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "One full backend canary is sufficient; mobile receipt layout is covered by preview.");
  const invitationToken = "playwright-v2-receipt-invitation-token";
  const email = "guardian@example.test";
  const otp = await api(request, "POST", "/v2/access/request-otp", { invitationToken, email });
  const access = await api(request, "POST", "/v2/access/verify-otp", { invitationToken, challengeId: otp.challengeId, code: otp.testCode });
  const sessionToken = access.sessionToken;
  const saved = await api(request, "PUT", "/v2/draft", { schemaVersion: "rosewood-v2-2026-08-02", policyVersion: "draft-2026-08-02", baseRevision: 0, clientRevision: 1, currentStage: 7, application: browserApplication() }, sessionToken);

  for (const category of ["birth_certificate", "immunisation", "proof_of_address"]) {
    const upload = await api(request, "POST", "/v2/documents/session", { category, fileName: `${category}.pdf`, mimeType: "application/pdf", size: 1000 }, sessionToken);
    const uploaded = await request.put(upload.uploadUrl, { headers: { "Content-Type": "application/pdf" }, data: Buffer.alloc(1000, 1) });
    expect(uploaded.ok()).toBe(true);
    const file = await uploaded.json();
    await api(request, "POST", "/v2/documents/confirm", { category, documentId: file.id }, sessionToken);
  }

  const submitted = await api(request, "POST", "/v2/applications/submit", {
    expectedRevision: saved.revision,
    declarations: { information: "Yes", privacy: "Yes", authority: "Yes", audit: "Yes", intent: "Yes" },
    signerName: "Morgan Example",
    signatureDataUrl: pngDataUrl()
  }, sessionToken);
  expect(submitted.status).toBe("submitted");

  const messagesResponse = await request.get("/__test/messages");
  const messages = await messagesResponse.json();
  const completion = messages.findLast((message) => message.subject.includes("All signatures complete") && message.to === email);
  expect(completion).toBeTruthy();
  const href = completion.html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&");
  const privateReceiptToken = new URL(href).searchParams.get("receipt");
  expect(privateReceiptToken).toBeTruthy();

  await page.goto(href);
  await expect(page).not.toHaveURL(/receipt=/);
  await page.locator("#receipt-email").fill(email);
  const receiptOtpResponse = page.waitForResponse((response) => response.url().endsWith("/v2/receipts/request-otp"));
  await page.getByRole("button", { name: "Send my receipt code" }).click();
  const receiptOtp = await (await receiptOtpResponse).json();
  expect(receiptOtp.testCode).toMatch(/^\d{6}$/);
  await page.locator("#receipt-otp").fill(receiptOtp.testCode);
  await page.getByRole("button", { name: "Verify and open receipt" }).click();
  await expect(page.locator("#receipt-view")).toBeVisible();
  await expect(page.locator("#receipt-reference")).toHaveText(submitted.reference);
  await expect(page.locator("#receipt-student")).toHaveText("Ava Example");
  await expect(page.locator("#receipt-signature-count")).toHaveText("1 of 1 complete");
  await expect(page.locator("body")).not.toContainText("1 Example Street");
  expect(await page.evaluate(() => sessionStorage.getItem("rosewood_v2_receipt"))).toBeNull();
  expect(await page.evaluate(() => Boolean(sessionStorage.getItem("rosewood_v2_receipt_session")))).toBe(true);
});

test("real local additional guardian independently reviews and signs", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "One full remote-signature backend canary is sufficient; mobile signing layout is covered by preview.");
  const invitationToken = "playwright-v2-remote-signer-token";
  const primaryEmail = "guardian@example.test";
  const secondEmail = "second@example.test";
  const otp = await api(request, "POST", "/v2/access/request-otp", { invitationToken, email: primaryEmail });
  const access = await api(request, "POST", "/v2/access/verify-otp", { invitationToken, challengeId: otp.challengeId, code: otp.testCode });
  const application = {
    ...browserApplication(),
    guardian_b_first_name: "Jordan",
    guardian_b_last_name: "Example",
    guardian_b_relationship: "Father",
    guardian_b_email: secondEmail,
    guardian_b_mobile: "0422000000",
    guardian_b_contact_role: "Secondary contact",
    guardian_b_required_signer: "Yes",
    guardian_b_contact_permission: "Yes"
  };
  const saved = await api(request, "PUT", "/v2/draft", { schemaVersion: "rosewood-v2-2026-08-02", policyVersion: "draft-2026-08-02", baseRevision: 0, clientRevision: 1, currentStage: 7, application }, access.sessionToken);
  for (const category of ["birth_certificate", "immunisation", "proof_of_address"]) {
    const upload = await api(request, "POST", "/v2/documents/session", { category, fileName: `${category}.pdf`, mimeType: "application/pdf", size: 1000 }, access.sessionToken);
    const uploaded = await request.put(upload.uploadUrl, { headers: { "Content-Type": "application/pdf" }, data: Buffer.alloc(1000, 1) });
    const file = await uploaded.json();
    await api(request, "POST", "/v2/documents/confirm", { category, documentId: file.id }, access.sessionToken);
  }
  const primarySubmission = await api(request, "POST", "/v2/applications/submit", {
    expectedRevision: saved.revision,
    declarations: { information: "Yes", privacy: "Yes", authority: "Yes", audit: "Yes", intent: "Yes" },
    signerName: "Morgan Example",
    signatureDataUrl: pngDataUrl()
  }, access.sessionToken);
  expect(primarySubmission.status).toBe("pending_signatures");

  const messages = await (await request.get("/__test/messages")).json();
  const invitation = messages.findLast((message) => message.to === secondEmail && message.subject.includes("signature is required"));
  expect(invitation).toBeTruthy();
  const taskHref = invitation.html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&");
  await page.goto(taskHref);
  await expect(page).not.toHaveURL(/task=/);
  await page.locator("#sign-email").fill(secondEmail);
  const signatureOtpResponse = page.waitForResponse((response) => response.url().endsWith("/v2/signatures/request-otp"));
  await page.getByRole("button", { name: "Send my secure code" }).click();
  const signatureOtp = await (await signatureOtpResponse).json();
  await page.locator("#sign-otp").fill(signatureOtp.testCode);
  await page.getByRole("button", { name: "Verify and review" }).click();
  await expect(page.locator("#sign-application-view")).toBeVisible();
  await page.locator('[name="detailsConfirmed"]').check();
  await page.getByRole("button", { name: "Save details and review" }).click();
  await expect(page.getByRole("heading", { name: "One frozen revision, arranged for reading." })).toBeVisible();
  await expect(page.locator("#sign-review-content")).toContainText("second@example.test");
  await expect(page.locator("#sign-review-content")).toContainText("Primary declaration and signature");
  await expect(page.locator("#sign-review-content")).toContainText("Morgan Example");
  await page.locator('[name="reviewConfirmed"]').check();
  await page.getByRole("button", { name: "Continue to my signature" }).click();
  await page.locator("#remote-audit").check();
  await page.locator("#remote-intent").check();
  await page.locator('[name="signerName"]').fill("Jordan Example");
  const canvas = page.locator("#remote-signature-canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 80, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 60, { steps: 8 });
  await page.mouse.move(box.x + 260, box.y + 130, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Submit my signature" }).click();
  await expect(page.getByRole("heading", { name: "Your signature is complete." })).toBeVisible();
  await expect(page.locator("#aggregate-sign-status")).toHaveClass(/is-complete/);
  expect(await page.evaluate(() => sessionStorage.getItem("rosewood_v2_task"))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem("rosewood_v2_sign_session"))).toBeNull();
  await expect.poll(async () => {
    const delivered = await (await request.get("/__test/messages")).json();
    return delivered.some((message) => message.to === secondEmail && message.subject.includes("All signatures complete"));
  }).toBe(true);
});

test("real local OTP opens the invited record and acknowledges a secure revision", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "One complete backend canary is sufficient; mobile access and form behavior are covered independently.");
  const invitation = "playwright-v2-invitation-token";
  await page.goto(`/pages/rosewood-enrolment-v2.html?invite=${invitation}`);
  await page.locator("#access-email").fill("guardian@example.test");
  const otpResponsePromise = page.waitForResponse((response) => response.url().endsWith("/v2/access/request-otp"));
  await page.getByRole("button", { name: "Send my secure code" }).click();
  const otpPayload = await (await otpResponsePromise).json();
  expect(otpPayload.testCode).toMatch(/^\d{6}$/);
  await page.locator("#otp-code").fill(otpPayload.testCode);
  await page.getByRole("button", { name: "Verify and open application" }).click();
  await expect(page.locator("#application-view")).toBeVisible();
  await expect(page.locator('[name="student_first_name"]')).toHaveValue("Ava");
  await expect(page.locator('[name="guardian_a_email"]')).toHaveValue("guardian@example.test");
  await page.locator('[name="readiness_acknowledgement"]').check();
  const saveResponsePromise = page.waitForResponse((response) => response.url().endsWith("/v2/draft") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Tell us about your child" }).click();
  expect((await saveResponsePromise).ok()).toBe(true);
  await expect(page.locator("#save-state")).toContainText("Saved securely");
});
