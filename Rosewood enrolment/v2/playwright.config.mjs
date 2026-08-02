import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "TEST_INVITATION_TOKEN=playwright-v2-invitation-token TEST_RECIPIENT_EMAIL=guardian@example.test node lambda/scripts/local-server.mjs",
    url: "http://127.0.0.1:4173/pages/rosewood-enrolment-v2.html?preview=1",
    reuseExistingServer: false,
    timeout: 20_000
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium" } }
  ]
});
