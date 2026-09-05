// Usage: NODE_PATH=<playwright node_modules> node tests/email09-v2.test.cjs [base URL]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium, request } = require('playwright');
const root = path.resolve(__dirname,'..');
const base = process.argv[2] || 'http://127.0.0.1:8876';
const source = fs.readFileSync(path.join(root,'emails/email09-v2.html'),'utf8');
assert(!/\[COUNT\]|\[Student|\[Parent|file:\/\//i.test(source),'Unresolved or local-only email content');
assert(!/<script|<iframe/i.test(source),'Email must not depend on JavaScript or frames');
const previous = fs.readFileSync(path.join(root,'emails/email09.html'));
assert.equal(crypto.createHash('sha256').update(previous).digest('hex'),'acb6b924eb404cccd45c67db71026d15d4f77d79206cdd05e754ae6e65071892','Original comparison email changed');
(async()=>{
  const browser=await chromium.launch();
  const api=await request.newContext();
  try {
    let links=[];
    for(const width of [1280,390,320]){
      const page=await browser.newPage({viewport:{width,height:1000}});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`${base}/emails/email09-v2.html`);
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert((await page.locator('#application-count').innerText()).includes('17 completed Applications for Enrolment'));
      const words=await page.evaluate(()=>document.body.innerText.trim().split(/\s+/).length);
      assert(words<330,`Email too wordy: ${words}`);
      const buttons=await page.locator('.mobile-button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
      assert(buttons.every(h=>h>=44),'A primary button is too short');
      const flyer=page.locator('img[src*="emotion-coaching"]');
      assert.equal(await flyer.locator('..').getAttribute('href'),'https://www.trybooking.com/DOXAP');
      links=await page.locator('a').evaluateAll(es=>es.map(e=>e.href));
      assert(links.every(h=>/^https:\/\/|^mailto:/.test(h)));
      assert(links.some(h=>h.includes('/presentation/?from=email09-v2')));
      assert.deepEqual(errors,[]);
      await page.screenshot({path:`/tmp/email09-v2-final-${width}.png`,fullPage:true});
      console.log(`PASS ${width}px: ${words} words, no overflow, all images loaded, 44px buttons`);
      await page.close();
    }
    for(const link of new Set(links.filter(h=>h.startsWith('https:')))){
      const response=await api.get(link);
      assert(response.ok(),`Broken link: ${link} (${response.status()})`);
    }
    const page=await browser.newPage();
    await page.goto(`${base}/family-evening/presentation/?from=email09-v2`);
    await page.locator('#controls').waitFor({state:'visible'});
    assert((await page.locator('.back-link').getAttribute('href')).endsWith('/email09-v2.html'));
    await page.goto(`${base}/family-evening/presentation/?from=https://example.com`);
    await page.locator('#controls').waitFor({state:'visible'});
    assert((await page.locator('.back-link').getAttribute('href')).endsWith('/email09.html'));
    console.log('PASS all destinations, original email unchanged, safe viewer return links');
  }finally{await browser.close();await api.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
