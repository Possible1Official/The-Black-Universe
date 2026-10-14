import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[],warnings=[],requests={craft:0,station:0};page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/asset unavailable/.test(m.text()))warnings.push(m.text());});
 for(const kind of ['craft','station'])await page.route(`**/*${kind}*.glb`,route=>++requests[kind]===1?route.abort('failed'):route.continue());
 await page.addInitScript(()=>{localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,fieldScans:['arch','weather'],supplies:{coolant:1,cacheClaimed:false},power:{profile:'balanced',heat:24,tripped:false}}));localStorage.setItem('erebus-camera','third');const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(()=>setTimeout(()=>f(performance.now()),100));});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');assert.deepEqual(requests,{craft:0,station:0});
 const target=async name=>{await page.evaluate(name=>window.__erebus.target(name),name);await page.waitForFunction(name=>window.__erebus.snapshot().nearest===name,name);await page.click('#touchAction');};
 await target('Launch survey shuttle');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying');
 let s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.authored.craft,false);assert.equal(s.authored.station,false);assert.equal(s.authored.flightCraftVisible,true);assert.deepEqual(requests,{craft:1,station:1});
 await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/asset-fallback-flight.png'});console.log('Initial failures preserve third-person fallback; no frame-driven retry');
 await flyLeg(page);assert.deepEqual(requests,{craft:1,station:1});await target('Board shuttle for Erebus');await page.waitForFunction(()=>window.__erebus.snapshot().authored.craft&&window.__erebus.snapshot().authored.station);
 assert.deepEqual(requests,{craft:2,station:2});await page.screenshot({path:'.local/qa/asset-recovered-ascent.png'});console.log('Boarding retries both failed assets and installs authored views');
 await flyLeg(page);s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.onSurface,false);assert.equal(s.progress.surveyed,true);assert.equal(s.progress.fieldScans.length,2);assert.equal(s.progress.supplies.coolant,1);
 await target('Launch survey shuttle');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying');assert.deepEqual(requests,{craft:2,station:2});
 await page.click('#menu');assert.deepEqual(errors,[]);assert.equal(warnings.length,2);console.log(JSON.stringify({deferredStartup:true,injectedFailures:true,playableFallback:true,noFrameRetry:true,outwardFlight:true,boardingRecovery:true,authoredReturn:true,docked:true,successfulCacheReused:true,savesPreserved:true,requests,warnings,errors}));
}finally{await browser.close();}
