import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Shader Error|VALIDATE_STATUS.*false/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,fieldScans:['arch','weather'],supplies:{coolant:1,cacheClaimed:true},power:{profile:'balanced',heat:24,tripped:false}}));localStorage.setItem('erebus-camera','third');const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(()=>setTimeout(()=>f(performance.now()),100));});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
 await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.click('#touchAction');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying'&&window.__erebus.snapshot().authored.craft);
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().feedback.power>.45);await page.keyboard.up('KeyW');let base=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(base.feedback.orbitalVisible,true);
 await page.keyboard.down('ShiftLeft');await page.waitForFunction(()=>window.__erebus.snapshot().feedback.power>.7);await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/kestrel-boost-plumes.png'});
 await page.keyboard.down('Space');await page.waitForFunction(()=>window.__erebus.snapshot().feedback.power===0&&!window.__erebus.snapshot().feedback.orbitalVisible);await page.keyboard.up('ShiftLeft');await page.keyboard.up('Space');
 await page.keyboard.down('KeyA');await page.waitForFunction(()=>Math.abs(window.__erebus.snapshot().feedback.bank)>.03);await page.keyboard.up('KeyA');await page.waitForFunction(()=>Math.abs(window.__erebus.snapshot().feedback.bank)<.025);
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>!window.__erebus.snapshot().feedback.orbitalVisible);await page.keyboard.press('KeyC');
 // QA walking fixtures do not change flight poses; relaunch from reset makes a clean outbound leg.
 await page.click('#menu');const paused=await page.evaluate(()=>window.__erebus.snapshot().feedback);await page.waitForTimeout(400);assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().feedback),paused);await page.getByText('Controls & settings',{exact:true}).click();await page.click('#reset');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).feedback.orbitalVisible,false);assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).feedback.surfaceVisible,false);
 await page.reload();await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
 const target=async name=>{await page.evaluate(name=>window.__erebus.target(name),name);await page.waitForFunction(name=>window.__erebus.snapshot().nearest===name,name);await page.click('#touchAction');};
 await target('Launch survey shuttle');const outward=flyLeg(page);await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='descending'&&window.__erebus.snapshot().feedback.surfaceVisible);assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).feedback.power,.35);await page.screenshot({path:'.local/qa/kestrel-lift-plumes.png'});await outward;
 let landed=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(landed.feedback.orbitalVisible,false);assert.equal(landed.feedback.surfaceVisible,false);
 await target('Board shuttle for Erebus');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='ascending'&&window.__erebus.snapshot().feedback.surfaceVisible);assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).feedback.power,.55);await flyLeg(page);
 const docked=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(docked.feedback.orbitalVisible,false);assert.equal(docked.feedback.surfaceVisible,false);assert.equal(docked.progress.fieldScans.length,2);assert.equal(docked.progress.supplies.coolant,1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({authoredCraft:true,throttle:true,boost:true,brakeCutsEmission:true,banking:true,firstPersonHides:true,pauseFrozen:true,resetHides:true,guidedLift:true,roundTrip:true,onFootHides:true,savesPreserved:true,errors}));
}finally{await browser.close();}
