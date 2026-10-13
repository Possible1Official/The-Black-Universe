import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
 await page.waitForFunction(()=>window.__erebus.snapshot().crew.every(c=>c.visual));await page.click('#play');
 await page.waitForFunction(()=>window.__erebus.snapshot().crew[0].visual.walkWeight>.8);
 const moving=await page.evaluate(()=>window.__erebus.snapshot().crew[0]);await page.waitForTimeout(600);
 const later=await page.evaluate(()=>window.__erebus.snapshot().crew[0]);assert.notEqual(moving.visual.walkTime,later.visual.walkTime);
 await page.evaluate(()=>window.__erebus.target('Speak with VEGA'));await page.waitForFunction(()=>window.__erebus.snapshot().crew[0].mode==='attending');
 await page.waitForFunction(()=>window.__erebus.snapshot().crew[0].visual.walkWeight<.02);
 await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/mixamo-vega.png'});
 const resting=await page.evaluate(()=>window.__erebus.snapshot().crew[0]);assert.ok(Math.hypot(resting.position.x-later.position.x,resting.position.z-later.position.z)<1.5);
 await page.keyboard.press('KeyE');await page.waitForSelector('#dialogue:not([hidden])');assert.equal(await page.locator('#speaker').textContent(),'OFFICER VEGA');await page.click('#closeDialogue');
 await page.click('#menu');const paused=await page.evaluate(()=>window.__erebus.snapshot().crew[0].visual);await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().crew[0].visual),paused);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({moving,later,resting,errors}));
 // Failed local asset must keep the mission playable and both procedural actors intact.
 const fallback=await browser.newPage({viewport:{width:640,height:400},isMobile:true,hasTouch:true});
 await fallback.route('**/assets/crew/ely.glb',route=>route.abort());await fallback.goto('http://localhost:5173/?qa');await fallback.waitForSelector('canvas[data-ready="true"]');await fallback.click('#play');await fallback.waitForTimeout(500);
 assert.ok((await fallback.evaluate(()=>window.__erebus.snapshot())).crew.every(c=>c.visual===null));console.log('Asset-failure fallback remains playable');
}finally{await browser.close();}
