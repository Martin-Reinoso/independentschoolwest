// Navigation only: never submits a form or sends an invitation.
const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8877';
(async () => {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      for (const width of [1280, 390]) {
        for (const reducedMotion of ['reduce', 'no-preference']) {
          const page = await browser.newPage({viewport:{width,height:844},reducedMotion});
          await page.goto(`${base}/#application-link-request`);
          async function check() {
            await page.waitForFunction(() => {
              const card = document.querySelector('#application-link-request');
              const heading = card.querySelector('h3').getBoundingClientRect();
              const input = card.querySelector('#requester-name').getBoundingClientRect();
              return getComputedStyle(card).opacity === '1' && heading.top >= 90 && input.bottom < innerHeight;
            });
            assert.equal(await page.locator('#application-link-request').count(), 1);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          }
          await check();
          await page.reload();
          await check();
          await page.goto(`${base}/`);
          await page.locator('.hero a[href="#application-link-request"], a.btn-gold[href="#application-link-request"]').first().click();
          await check();
          console.log(`PASS ${engine.name()} ${width}px ${reducedMotion}: direct link, reload and homepage button land on visible form`);
          await page.close();
        }
      }
    } finally { await browser.close(); }
  }
})().catch(error => {console.error(error);process.exitCode=1;});
