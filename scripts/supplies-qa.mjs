import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('black-universe-v2'))localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,fieldScans:['arch','weather'],supplies:{coolant:2,cacheClaimed:false},power:{profile:'genesis',heat:96,tripped:true}}));localStorage.setItem('erebus-camera','third');const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(()=>setTimeout(()=>f(performance.now()),100));});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
 await page.evaluate(()=>window.__erebus.target('Open auxiliary coolant reserve'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Open auxiliary coolant reserve');await page.click('#touchAction');
 let before=await page.evaluate(()=>window.__erebus.snapshot().progress);await page.click('#dischargeCoolant');let after=await page.evaluate(()=>window.__erebus.snapshot().progress);
 assert.equal(after.supplies.coolant,1);assert.equal(after.power.tripped,true);assert.ok(before.power.heat-after.power.heat>=24&&before.power.heat-after.power.heat<30);
 await page.click('#dischargeCoolant');after=await page.evaluate(()=>window.__erebus.snapshot().progress);assert.equal(after.supplies.coolant,0);assert.equal(await page.locator('#dischargeCoolant').isDisabled(),true);
 await page.screenshot({path:'.local/qa/auxiliary-coolant.png'});await page.click('#closeDialogue');
 await page.evaluate(()=>window.__erebus.target('Open engineering diagnostics'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Open engineering diagnostics');await page.click('#touchAction');await page.click('[data-profile="cooling"]');await page.waitForFunction(()=>window.__erebus.snapshot().progress.power.heat<=40);await page.click('#resetContainment');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.power.tripped,false);await page.click('#closeDialogue');
 await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.click('#touchAction');await flyLeg(page);
 await page.keyboard.press('KeyJ');await page.click('[data-track="supplies"]');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='supplies');
 await page.evaluate(()=>window.__erebus.target('Inspect coolant supply cache'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Inspect coolant supply cache');await page.click('#touchAction');await page.click('#recoverCoolant');
 after=await page.evaluate(()=>window.__erebus.snapshot().progress);assert.deepEqual(after.supplies,{coolant:2,cacheClaimed:true});assert.equal(await page.locator('#recoverCoolant').isDisabled(),true);assert.equal(after.fieldScans.length,2);assert.equal(after.surveyed,true);
 await page.screenshot({path:'.local/qa/nysa-supply-cache.png'});await page.click('#closeDialogue');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='extraction');
 await page.click('#menu');await page.reload();await page.waitForSelector('canvas[data-ready="true"]');assert.deepEqual((await page.evaluate(()=>window.__erebus.snapshot().progress)).supplies,{coolant:2,cacheClaimed:true});assert.equal(await page.locator('#cameraToggle').textContent(),'3P');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({twoFiniteDischarges:true,tripLatchPreserved:true,normalCoolingReset:true,actualFlight:true,cacheTracking:true,oneTimeRefill:true,sampleScansPreserved:true,reload:true,hiddenDefaultPanels:true,thirdPerson:true,errors}));
}finally{await browser.close();}
