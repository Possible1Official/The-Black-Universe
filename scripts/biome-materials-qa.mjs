// Focused mobile surface fixture: no replay of unchanged flight/mission routes.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
 window.__biomeEnter=()=>travel(true);window.__biomePose=(x,z)=>{window.__erebus.place(SURFACE_ORIGIN+x,z,0);pitch=-.6;};
 window.__biomeRead=()=>({colliders:world.colliders.len(),ground:surface.materialSnapshot(),weights:Array.from(surface.group.children.find(m=>m.isMesh&&m.geometry?.getAttribute('groundBlend')).geometry.getAttribute('groundBlend').array.slice(0,9))});
 `});});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.click('#play');await page.evaluate(()=>window.__biomeEnter());
 await page.waitForFunction(()=>window.__erebus.snapshot().onSurface);
 await fs.mkdir('.local/qa',{recursive:true});const samples=[];
 const poses=[['dunes',2,-12],['basalt',-35,-20],['wetland',30,18],['highland',38,-34]];
 for(const [name,x,z] of poses){
   await page.evaluate(([x,z])=>window.__biomePose(x,z),[x,z]);await page.waitForTimeout(900);
   await page.click('#menu');await page.locator('#overlay').evaluate(e=>e.style.visibility='hidden');
   await page.screenshot({path:'.local/qa/biome-'+name+'-low.png'});
   const s=await page.evaluate(()=>window.__biomeRead());assert.equal(s.ground.cpuBytes,65536);assert.equal(s.ground.biomePatterns,3);assert.equal(s.ground.bumpMap,false);samples.push({name,...s});
   await page.locator('#overlay').evaluate(e=>e.style.visibility='');await page.click('#play');
 }
 await page.click('#menu');await page.locator('summary').click();await page.selectOption('#quality','high');await page.click('#play');
 await page.waitForFunction(()=>window.__biomeRead().ground.bumpMap);await page.waitForTimeout(500);await page.click('#menu');await page.locator('#overlay').evaluate(e=>e.style.visibility='hidden');await page.screenshot({path:'.local/qa/biome-highland-high.png'});
 const high=await page.evaluate(()=>window.__biomeRead());assert.equal(high.ground.roughnessMap,true);assert.equal(high.colliders,samples[0].colliders);
 await page.locator('#overlay').evaluate(e=>e.style.visibility='');await page.selectOption('#quality','low');await page.click('#play');await page.waitForFunction(()=>!window.__biomeRead().ground.bumpMap);
 assert.deepEqual(errors,[]);assert.ok(samples.every(s=>s.colliders===high.colliders));
 console.log(JSON.stringify({viewport:'390x844',samples,high,qualityRoundtrip:true,errors,limits:'Software Chromium/touch emulation; no physical-device frame budget or hosted browser QA. Terrain remains procedural.'}));
}finally{await browser.close();}
