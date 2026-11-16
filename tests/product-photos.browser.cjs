/* Optional visual regression: requires Playwright and Chromium.
   Build and serve dist first, then:
   MEVA_TEST_URL=http://127.0.0.1:8020 node tests/product-photos.browser.cjs
   Screenshots go to /tmp/meva-product-photos/; no source images are modified. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.MEVA_TEST_URL||'http://127.0.0.1:8020';
const selector='.catalog-gallery .slide.active img,.season-img img,.chosen-photo img,.cuadro-real img,.mini-photo img';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();fs.mkdirSync('/tmp/meva-product-photos',{recursive:true});
  let checked=0;
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const name of ['index','accesorios','organizacion','infantil','packs','cuadros','navidad','eventos','disena-producto']){
    await page.goto(`${base}/${name}.html`);
    await page.addStyleTag({content:'html { scroll-behavior: auto !important; }'});
    await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>{x.loading='eager';return x.decode().catch(()=>{})})));
    // Walk every slide, not only the first photograph of each product.
    const cars=await page.locator('[data-carousel]').count();
    for(let c=0;c<cars;c++){
     const car=page.locator('[data-carousel]').nth(c), count=await car.locator('.slide').count();
     await car.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
     for(let i=0;i<count;i++){
      if(i)await car.locator('.next').click();
      await checkVisibleImages(page);checked++;
     }
     if(count>1)await car.locator('.next').click();
    }
    await checkVisibleImages(page);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`/tmp/meva-product-photos/${name}-${width}.png`,fullPage:true});
   }
  }
  // Same markup as /admin-generated products: verify wide, tall, square and
  // small original dimensions in all fixed-size photo slots, without upscaling.
  await page.goto(`${base}/navidad.html`);
  for(const [w,h] of [[1200,400],[400,1200],[800,800],[60,40]]){
   for(const frame of ['catalog-gallery','season-img','chosen-photo','product-media','category-image','mini-photo']){
    await page.evaluate(({frame,w,h})=>{
     document.getElementById('photo-fixture')?.remove();
     const box=document.createElement('div');box.id='photo-fixture';box.className=frame;
     box.style.cssText='position:relative;width:300px;height:180px';
     const img=new Image();img.src='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="1" y="1" width="${w-2}" height="${h-2}" fill="lightblue" stroke="black"/><text x="5" y="20">${w} × ${h}</text></svg>`);
     if(frame==='catalog-gallery'){const slide=document.createElement('div');slide.className='slide active';slide.append(img);box.append(slide)}else box.append(img);
     document.querySelector('main').prepend(box);
    },{frame,w,h});
    await page.locator('#photo-fixture img').evaluate(i=>i.decode());
    await checkVisibleImages(page,'#photo-fixture img');checked++;
    if(frame==='catalog-gallery')await page.locator('#photo-fixture').screenshot({path:`/tmp/meva-product-photos/format-${w}-${h}.png`});
   }
  }
  await page.screenshot({path:'/tmp/meva-product-photos/small-photo.png',fullPage:true});
  console.log(`PASS: ${checked} slide/format cases, 9 pages at desktop/mobile widths; complete, centered, proportional images without upscaling.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
async function checkVisibleImages(page,custom=selector){
 const results=await page.locator(custom).evaluateAll(xs=>xs.filter(i=>i.naturalWidth&&i.getBoundingClientRect().width).map(i=>{
  const slot=i.closest('.catalog-gallery,.season-img,.chosen-photo,.cuadro-real,.mini-photo,.product-media,.category-image');
  const a=i.getBoundingClientRect(), b=slot.getBoundingClientRect(), css=getComputedStyle(i);
  return {src:i.getAttribute('src'),w:a.width,h:a.height,nw:i.naturalWidth,nh:i.naturalHeight,fit:css.objectFit,inside:a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1,centerX:Math.abs((a.left+a.right-b.left-b.right)/2),centerY:Math.abs((a.top+a.bottom-b.top-b.bottom)/2),slotHeight:b.height,catalog:slot.classList.contains('catalog-gallery')};
 }));
 for(const r of results){
  assert(r.inside,`Clipped: ${JSON.stringify(r)}`);
  assert.equal(r.fit,'contain');
  assert(r.w<=r.nw+1&&r.h<=r.nh+1,`Upscaled: ${r.src}`);
  assert(Math.abs(r.w/r.h-r.nw/r.nh)<0.02,`Distorted: ${r.src}`);
  assert(r.centerX<=1&&r.centerY<=1,`Off center: ${JSON.stringify(r)}`);
  if(r.catalog)assert([180,220].some(h=>Math.abs(r.slotHeight-h)<1),`Resized slot: ${r.slotHeight}`);
 }
}
