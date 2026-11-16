/* Optional browser checks: serve dist, then run with Playwright + Chromium.
   MEVA_TEST_URL=http://127.0.0.1:8040 node tests/instagram.browser.cjs
   API/media fixtures below are synthetic tests only; never production content. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const base=process.env.MEVA_TEST_URL||'http://127.0.0.1:8040';
 try {
  for(const [width,columns] of [[1440,3],[390,2]]){
   const page=await browser.newPage({viewport:{width,height:1000}});let requests=0;
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/.netlify/functions/instagram',route=>{
    requests++;
    return route.fulfill({json:{status:'ok',posts:Array.from({length:6},(_,i)=>({id:String(i),type:i===0?'VIDEO':i===1?'CAROUSEL_ALBUM':'IMAGE',image:`https://test.cdninstagram.com/${i}.jpg`,permalink:`https://www.instagram.com/p/TEST${i}/`,caption:i===0?'<script>window.injected=true</script>':'Test fixture'}))}});
   });
   await page.route('https://test.cdninstagram.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="gray"/></svg>'}));
   await page.goto(base+'/');assert.equal(requests,0,'Feed should not fetch before scrolling near section');
   await page.locator('[data-instagram-feed]').scrollIntoViewIfNeeded();
   await page.waitForSelector('.instagram-feed-post');
   assert.equal(await page.locator('.instagram-feed-post').count(),6);assert.equal(requests,1);
   assert.equal(await page.locator('.instagram-feed-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),columns);
   assert.equal(await page.locator('.instagram-feed-badge').count(),2);
   assert.equal(await page.locator('.instagram-feed-post').first().getAttribute('target'),'_blank');
   assert.equal(await page.locator('.instagram-feed-post').first().getAttribute('href'),'https://www.instagram.com/p/TEST0/');
   assert.equal(await page.evaluate(()=>window.injected),undefined);assert.deepEqual(errors,[]);
   assert.equal(await page.locator('[data-instagram-status]').isVisible(),false);
   assert.equal(await page.locator('.instagram-feed-post img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain');
   await page.close();
  }
  const page=await browser.newPage();
  await page.route('**/.netlify/functions/instagram',route=>route.fulfill({status:503,json:{status:'unavailable',posts:[]}}));
  await page.goto(base+'/');await page.locator('[data-instagram-feed]').scrollIntoViewIfNeeded();
  await page.getByText('Ahora no podemos cargar las publicaciones.',{exact:false}).waitFor();
  assert.equal(await page.locator('.instagram-feed-post').count(),0);
  assert(await page.locator('.instagram-feed-footer a').isVisible());
  await page.screenshot({path:'/tmp/meva-instagram-unconfigured.png',fullPage:true});
  await page.close();
  console.log('PASS: Instagram 3/2 columns, 6 links, official preview/badges, lazy fetch, escaped captions, and unconfigured fallback. Fixtures only; no live Meta authentication tested.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
