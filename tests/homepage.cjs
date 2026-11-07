/* npm install --prefix /tmp/home-test playwright
 * PLAYWRIGHT_PATH=/tmp/home-test/node_modules/playwright node tests/homepage.cjs
 * HOME_TEST_ORIGIN defaults to a staged local server, or use the production origin.
 */
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const origin=process.env.HOME_TEST_ORIGIN||'http://127.0.0.1:8891';
const out=process.env.HOME_TEST_OUTPUT||'/workspace/chica-home-local';
try{
for(const [name,width,height] of [['desktop',1280,800],['mobile',390,844]])for(const lang of ['en','es']){
 const context=await browser.newContext({viewport:{width,height},locale:lang==='es'?'es-MX':'en-US'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__homeMutations=[];window.__homeShifts=[];
  new MutationObserver(ms=>{for(const m of ms){let target=m.target.nodeType===3?m.target.parentElement:m.target;if(target?.closest?.('#home-title,#home-add-sale,#home-calendar,#chica-hoods'))window.__homeMutations.push({t:Math.round(performance.now()),target:target.id,type:m.type});}}).observe(document,{subtree:true,childList:true,characterData:true});
  new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__homeShifts.push({t:e.startTime,value:e.value});})).observe({type:'layout-shift',buffered:true});
 });
 await page.goto(origin+(lang==='es'?'/es/':'/'),{waitUntil:'commit'});
 await page.locator('#home-title').waitFor({state:'visible'});
 const start=Date.now(),samples=[];
 for(const t of [0,300,1000,3000]){
  await page.waitForTimeout(Math.max(0,t-(Date.now()-start)));
  samples.push(await page.evaluate(()=>({t:performance.now(),title:document.getElementById('home-title').textContent,cta:document.getElementById('home-add-sale').getBoundingClientRect().toJSON(),hoods:document.querySelectorAll('#chica-hoods li a').length,calendar:document.getElementById('home-calendar').getAttribute('href')})));
  await page.screenshot({path:out+'-'+name+'-'+lang+'-'+t+'.png'});
 }
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(new Set(samples.map(s=>s.title)).size,1,'Headline flashes/changes');
 for(const sample of samples){assert(sample.cta.top>=0&&sample.cta.bottom<=height,'Add sale CTA below fold');assert.equal(sample.hoods,13);}
 assert.equal(await page.locator('#home-add-sale').innerText(),lang==='es'?'Agregar mi venta':'Add my sale');
 assert.equal(await page.locator('#home-add-sale').getAttribute('href'),lang==='es'?'/es/submit/':'/submit/');
 assert.equal(await page.locator('#home-calendar').getAttribute('href'),lang==='es'?'/es/calendar/':'/calendar/');
 assert(await page.locator('#chica-home-mini-leaflet.leaflet-container').count(),'Live mini-map failed');
 const data=await page.evaluate(()=>({mutations:window.__homeMutations,shifts:window.__homeShifts,lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth}));
 assert(!data.overflow,'Horizontal overflow');
 assert(data.shifts.reduce((n,e)=>n+e.value,0)<0.001,'Unexpected layout shift: '+JSON.stringify(data.shifts));
 assert(!data.mutations.some(m=>m.type==='characterData'),'Essential copy mutated after paint');
 await page.locator('#home-theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('#home-theme').click();
 await page.locator('a[href="#chica-hoods"]').click();await page.locator('#chica-hoods-h').waitFor({state:'visible'});
 await page.waitForTimeout(500);assert.equal(await page.locator('#chica-hoods li a').count(),13);
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);
 if(lang==='en')await page.screenshot({path:'/workspace/chica-home-after-'+name+'.png'});
 fs.writeFileSync(out+'-'+name+'-'+lang+'.json',JSON.stringify({samples,...data,errors},null,2));
 console.log(name,lang,'PASS; CTA top/bottom',samples[0].cta.top,samples[0].cta.bottom,'CLS',data.shifts.reduce((n,e)=>n+e.value,0));
 await context.close();
}
// Essential navigation and all neighborhood cards also work with JavaScript off.
for(const lang of ['en','es']){
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await context.newPage();
 await page.goto(origin+(lang==='es'?'/es/':'/'));assert.equal(await page.locator('#chica-hoods li a').count(),13);assert(await page.locator('#home-add-sale').isVisible());assert(await page.locator('#home-calendar').isVisible());await context.close();
}
console.log('No-JavaScript EN/ES essentials PASS');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
