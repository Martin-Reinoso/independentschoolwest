import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

process.env.BILLING_BROWSER_DATA_DIR ||= mkdtempSync(join(tmpdir(), 'rosewood-billing-browser-'));
process.env.BILLING_BROWSER_PASSWORD ||= randomBytes(24).toString('base64url');
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4329',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'off',
    browserName: 'chromium',
  },
  webServer: {
    command: 'node tests/browser-server.mjs',
    url: 'http://127.0.0.1:4329/api/health',
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      BILLING_BROWSER_DATA_DIR: process.env.BILLING_BROWSER_DATA_DIR,
      BILLING_BROWSER_PASSWORD: process.env.BILLING_BROWSER_PASSWORD,
    },
  },
});
