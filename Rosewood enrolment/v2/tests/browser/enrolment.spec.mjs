import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function openPreview(page) {
  await page.goto("/pages/rosewood-enrolment-v2.html?preview=1");
  await page.getByRole("button", { name: "Enter synthetic content preview" }).click();
  await expect(page.locator("#application-view")).toBeVisible();
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

test("adding a guardian adapts the family section and clears completeness", async ({ page }) => {
  await openPreview(page);
  await page.locator('[data-go-stage="2"]').dispatchEvent("click");
  await page.locator('[name="guardian_completeness"]').check();
  await page.getByRole("button", { name: "Add another parent, guardian or carer" }).click();
  await expect(page.locator('[data-guardian="b"]')).toBeVisible();
  await expect(page.locator('[name="guardian_completeness"]')).not.toBeChecked();
  await expect(page.locator('[name="guardian_b_required_signer"]')).toBeChecked();
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
});

test("main preview has no serious or critical automated accessibility findings", async ({ page }) => {
  await openPreview(page);
  await page.waitForTimeout(500);
  await page.addScriptTag({ content: axeSource });
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

test("real local OTP opens the invited record and acknowledges a secure revision", async ({ page }) => {
  await page.goto("/pages/rosewood-enrolment-v2.html?invite=playwright-v2-invitation-token");
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
