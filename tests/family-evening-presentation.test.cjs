/* Run against a local HTTP server: NODE_PATH=<bundled node_modules> node tests/family-evening-presentation.test.cjs [base URL] */
const assert = require('node:assert/strict');
const { chromium, webkit, request } = require('playwright');
const engine = process.env.PRESENTATION_BROWSER === 'webkit' ? webkit : chromium;
const base = process.argv[2] || 'http://127.0.0.1:8876';
const url = `${base}/family-evening/presentation/`;
(async () => {
  const browser = await engine.launch({ headless:true });
  const api = await request.newContext();
  try {
    const manifestResponse = await api.get(`${url}slides.json`);
    assert.equal(manifestResponse.status(), 200);
    const manifest = await manifestResponse.json();
    assert.equal(manifest.slides.length, 37);
    const responses = await Promise.all(manifest.slides.flatMap(s => [s.src,s.small]).map(s => api.get(url+s)));
    responses.forEach(r => assert.equal(r.status(),200));
    const pdf = await api.get(url + manifest.pdf);
    assert.equal(pdf.status(),200);
    assert.equal((await pdf.body()).length,manifest.pdfBytes);
    assert((await pdf.body()).subarray(0,5).equals(Buffer.from('%PDF-')));
    for (const viewport of [{width:1280,height:1000},{width:1440,height:900},{width:1280,height:720},{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
      const page = await browser.newPage({viewport, deviceScaleFactor:viewport.width===390?3:1, hasTouch:viewport.width!==1280});
      const errors=[], slideRequests=[];
      page.on('pageerror', e=>errors.push(e.message));
      page.on('request', r=>{if(r.url().includes('/slides/'))slideRequests.push(r.url());});
      await page.goto(url);
      await page.locator('#controls').waitFor({state:'visible'});
      await page.waitForFunction(()=>document.querySelector('#slide').complete && document.querySelector('#slide').naturalWidth>0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert(slideRequests.length<=3,`Too many initial image requests: ${slideRequests.length}`);
      const layout = await page.evaluate(()=>{
        const stage=document.querySelector('#slide-stage').getBoundingClientRect();
        const image=document.querySelector('#slide').getBoundingClientRect();
        const viewer=document.querySelector('#presentation');
        const style=getComputedStyle(viewer);
        return {stage:stage.toJSON(),image:image.toJSON(),
          contentWidth:viewer.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),
          controlsBottom:document.querySelector('#controls').getBoundingClientRect().bottom};
      });
      assert(Math.abs(layout.stage.width-layout.contentWidth)<2,'Slide stage must fill the viewer width');
      assert(Math.abs(layout.image.width-layout.stage.width)<2,'Image must fill its stage, not retain an intrinsic width');
      assert(Math.abs(layout.image.height-layout.stage.height)<2,'Image must fit the height-limited stage');
      assert(Math.abs(layout.image.x-layout.stage.x)<2,'Slide must not be offset to one side');
      if(viewport.width>=1000) {
        assert(layout.stage.y<250,'Compact header should show the slide promptly');
        assert(layout.controlsBottom<=viewport.height,'Desktop navigation should fit without scrolling');
        assert(layout.stage.height>=Math.min(layout.contentWidth*9/16,viewport.height-320)-2,'Slide should use available desktop height up to its natural aspect ratio');
      }
      assert.equal(await page.locator('.lead, .hint, .archive-note').count(),0);
      assert(await page.locator('#slide-number').evaluate(el=>el.getBoundingClientRect().height>=44),'Slide selector must remain easy to tap in WebKit too');
      assert.equal(await page.locator('#previous').getAttribute('aria-disabled'),'true');
      await page.screenshot({path:`/tmp/ffe-presentation-${viewport.width}.png`,fullPage:true});
      await page.locator('#next').click();
      assert.equal(await page.locator('#slide-number').inputValue(),'1');
      await page.locator('#slide-stage').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#slide-number').inputValue(),'2');
      await page.locator('#slide-number').selectOption({value:'31'});
      await page.waitForFunction(()=>document.querySelector('#slide').complete && document.querySelector('#slide').naturalWidth>0);
      assert((await page.locator('#slide').getAttribute('src')).endsWith('slide-32.webp'));
      assert((await page.locator('#image-link').getAttribute('href')).endsWith('slide-32.webp'));
      await page.reload();
      await page.locator('#controls').waitFor({state:'visible'});
      assert.equal(await page.locator('#slide-number').inputValue(),'31');
      // Exercise the mobile full-window fallback even where native fullscreen is available.
      await page.evaluate(()=>{document.querySelector('#presentation').requestFullscreen=undefined;});
      await page.locator('#expand').click();
      assert.equal(await page.locator('#expand').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#presentation').evaluate(el=>Math.round(el.getBoundingClientRect().top)),0);
      assert(await page.locator('#slide-stage').evaluate(el=>el.getBoundingClientRect().height>innerHeight-170),'Expanded slide should use the viewport height');
      await page.screenshot({path:`/tmp/ffe-presentation-expanded-${viewport.width}.png`,fullPage:false});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#expand').getAttribute('aria-pressed'),'false');
      await page.locator('#slide-stage').focus();
      await page.keyboard.press('End');
      assert.equal(await page.locator('#next').getAttribute('aria-disabled'),'true');
      await page.locator('#next').click({force:true});
      assert.equal(await page.locator('#slide-number').inputValue(),'36');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${viewport.width}x${viewport.height}: responsive layout, lazy images, navigation, deep link, fullscreen fallback, boundaries`);
      await page.close();
    }
    const native = await browser.newPage();
    await native.goto(url);
    await native.locator('#expand').waitFor({state:'visible'});
    await native.locator('#expand').click();
    await native.waitForFunction(()=>!!document.fullscreenElement || document.querySelector('#presentation').classList.contains('expanded'));
    await native.locator('#expand').click();
    await native.waitForFunction(()=>!document.fullscreenElement);
    assert.equal(await native.evaluate(()=>!!document.fullscreenElement),false);
    await native.evaluate(()=>{
      const target=document.querySelector('#slide-stage');
      // WebKit desktop does not expose a constructible Touch; exercise the
      // swipe handler with equivalent event data rather than a native gesture.
      const start={identifier:1,target,clientX:250,clientY:100};
      const end={identifier:1,target,clientX:100,clientY:102};
      for(const [type,touches,changedTouches] of [['touchstart',[start],[start]],['touchend',[],[end]]]) {
        const event=new Event(type);
        Object.defineProperties(event,{touches:{value:touches},changedTouches:{value:changedTouches}});
        target.dispatchEvent(event);
      }
    });
    assert.equal(await native.locator('#slide-number').inputValue(),'1');
    console.log('PASS fullscreen entry/exit and swipe event navigation');
    await native.close();
    const noJS = await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
    await noJS.goto(url);
    assert(await noJS.locator('noscript').isVisible());
    assert(await noJS.locator('#pdf-link').isVisible());
    await noJS.close();
    const offline = await browser.newPage();
    await offline.route('**/slides.json',route=>route.abort());
    await offline.goto(url);
    await offline.locator('#error').waitFor({state:'visible'});
    assert(await offline.locator('#pdf-link').isVisible());
    console.log('PASS 74 image URLs, PDF, JavaScript-disabled and manifest-error fallbacks');
  } finally {await browser.close();await api.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
