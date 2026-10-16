// Only changed Nysa contact presentation; private fixture skips unchanged travel.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const qualityOnly=process.argv.includes('--quality-only'),slopeOnly=qualityOnly||process.argv.includes('--slope-only');
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);const errors=[],shaderErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')shaderErrors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('erebus-camera','third');localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,power:{profile:'balanced',heat:24,tripped:false}}));});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.__contactOff=false;const contactUpdate=surface.contact.update.bind(surface.contact);surface.contact.update=(...args)=>{if(!window.__contactOff)contactUpdate(...args);};
window.__contactSetup=async()=>{travel(true);await Promise.all([...vehicleVisuals].map(([k,m])=>attachRequested(k,m)));await loadAuthoredAsset('craft',[landedShuttle]);window.__erebus.place(SURFACE_ORIGIN-8,31,0);};
window.__contactRead=()=>({contacts:surface.contact.snapshot(),surface:surface.group.visible,roverOrigin:vehicleVisuals.get('rover').getWorldPosition(new THREE.Vector3()).toArray(),quality:$('quality').value,shadowMap:renderer.shadowMap.enabled,avatar:avatar.visible,progress:progress.surveyed,programErrors:renderer.info.programs.filter(p=>p.diagnostics&&!p.diagnostics.runnable).length});
window.__contactSlope=()=>{groundVehicles.get('rover').relocate({x:SURFACE_ORIGIN+42,y:vehicleGround(42,-38),z:-38});groundVehicles.get('rover').yaw=.8;window.__erebus.place(SURFACE_ORIGIN+42,-33,0);};
window.__contactStation=()=>travel(false);`});});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.waitForFunction(()=>window.__erebus.snapshot().avatar.source==='biker');await page.click('#play');await page.evaluate(()=>window.__contactSetup());await page.waitForFunction(()=>window.__contactRead().contacts.every(c=>c.pose[2]>0));
 await fs.mkdir('.local/qa',{recursive:true});let s=await page.evaluate(()=>window.__contactRead());assert.equal(s.quality,'low');assert.equal(s.shadowMap,false);assert.equal(s.programErrors,0);const grounded=s.contacts[0].pose[2];let jump;
 if(!slopeOnly){
 // Same frozen game state, contact on/off; pause overlay hidden for visual review.
 await page.click('#menu');await page.locator('#overlay').evaluate(e=>e.style.visibility='hidden');
 await page.screenshot({path:'.local/qa/contact-performance.png'});
 await page.evaluate(()=>window.__contactOff=true);await page.waitForFunction(()=>window.__contactRead().contacts.every(c=>c.pose[2]===0));await page.screenshot({path:'.local/qa/contact-disabled.png'});await page.evaluate(()=>window.__contactOff=false);
 await page.locator('#overlay').evaluate(e=>e.style.visibility='');await page.click('#play');
 await page.keyboard.press('Space');await page.waitForFunction(v=>{const c=window.__contactRead().contacts[0];return c.pose[2]>0&&c.pose[2]<v*.7;},grounded);jump=await page.evaluate(()=>window.__contactRead().contacts[0]);await page.waitForFunction(v=>window.__contactRead().contacts[0].pose[2]>v*.95,grounded);
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>window.__contactRead().contacts[0].pose[2]===0);await page.keyboard.press('KeyC');await page.waitForFunction(()=>window.__contactRead().contacts[0].pose[2]>0);
 console.log('Performance A/B, actual jump fade/landing and first-person visibility passed');
 }
 if(!qualityOnly){
 await page.evaluate(()=>window.__contactSlope());await page.waitForFunction(()=>Math.abs(window.__contactRead().roverOrigin[0]-442)<1&&Math.abs(window.__contactRead().contacts[2].ellipse[0]-window.__contactRead().roverOrigin[0])<1e-6);s=await page.evaluate(()=>window.__contactRead());assert.ok(Math.abs(s.contacts[2].pose[1]-Math.sin(.8))<1e-6);assert.ok(s.contacts[2].pose[2]>.2);await page.screenshot({path:'.local/qa/contact-slope.png'});
 console.log('Sloped world-origin/heading/contact check passed');
 }
 await page.click('#menu');if(!await page.locator('details').evaluate(e=>e.open))await page.locator('summary').click();await page.selectOption('#quality','high');await page.click('#play');await page.waitForFunction(()=>window.__contactRead().quality==='high'&&window.__contactRead().contacts[2].pose[2]>.2);await page.screenshot({path:'.local/qa/contact-high.png'});
 await page.click('#menu');await page.selectOption('#quality','low');await page.click('#play');await page.evaluate(()=>window.__contactStation());await page.waitForFunction(()=>!window.__contactRead().surface&&window.__contactRead().contacts.every(c=>c.pose[2]===0));assert.ok((await page.evaluate(()=>window.__contactRead())).progress);assert.deepEqual(errors,[]);assert.deepEqual(shaderErrors,[]);
 console.log(JSON.stringify({touchViewport:'390x844',loadedCGTraderModels:true,performanceWithoutShadowMap:true,groundPadShadersCompiled:true,pausedVisualAB:!slopeOnly,jumpFades:jump,firstPersonHidesPlayerContact:!slopeOnly,slopedTerrainAndYaw:!qualityOnly,qualityRecompile:true,stationClears:true,surveyRetained:true,errors,shaderErrors,limits:'software Chromium; no physical mobile GPU/FPS/memory, hosted render or silhouette-shadow claim'}));
}finally{await browser.close();}
