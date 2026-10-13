import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('black-universe-v2'))localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,power:{profile:'balanced',heat:24,tripped:false}}));});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
 await page.getByText('Controls & settings',{exact:true}).click();await page.selectOption('#quality','low');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#play');
 const startDescent=async()=>{
  await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying');await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>window.__erebus.snapshot().flight?.distance<85,{},{timeout:120000});await page.keyboard.up('KeyW');await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.__erebus.snapshot().flight?.speed<8);await page.keyboard.up('Space');await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>{const f=window.__erebus.snapshot().flight;return f?.phase==='descending'&&f.timer>1;});
 };
 await startDescent();const descent=await page.evaluate(()=>window.__erebus.snapshot());
 assert.equal(descent.surfaceView,true);assert.equal(descent.shipHidden,true);assert.equal(descent.shuttleVisible,false);assert.equal(descent.cockpitVisible,true);assert.ok(descent.camera.x>380);assert.ok(descent.camera.y>2&&descent.camera.y<47.65);
 assert.match(await page.locator('#flightTelemetry').textContent(),/RADAR ALT/);
 await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/descent-view.png'});
 await page.click('#menu');const paused=await page.evaluate(()=>window.__erebus.snapshot());await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().flight),paused.flight);assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().camera),paused.camera);
 await page.getByText('Controls & settings',{exact:true}).click();await page.selectOption('#quality','high');await page.selectOption('#quality','low');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#play');
 await page.waitForFunction(()=>!window.__erebus.snapshot().flight&&window.__erebus.snapshot().onSurface);
 const landed=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(landed.shuttleVisible,true);assert.equal(landed.cockpitVisible,false);assert.equal(landed.shipHidden,true);assert.equal(landed.progress.surveyed,true);
 await page.evaluate(()=>window.__erebus.target('Board shuttle for Erebus'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Board shuttle for Erebus');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>{const f=window.__erebus.snapshot().flight;return f?.phase==='ascending'&&f.timer>1;});
 const ascent=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(ascent.surfaceView,true);assert.equal(ascent.shuttleVisible,false);assert.equal(ascent.cockpitVisible,true);assert.ok(ascent.camera.y>2);
 await page.screenshot({path:'.local/qa/ascent-view.png'});await flyLeg(page);
 const returned=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(returned.surfaceView,false);assert.equal(returned.shipHidden,false);assert.equal(returned.cockpitVisible,false);assert.equal(returned.progress.surveyed,true);assert.equal(returned.render.lighting.visibleProxies,4);
 await startDescent();await page.click('#menu');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#reset');
 const reset=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(reset.flight,null);assert.equal(reset.surfaceView,false);assert.equal(reset.shipHidden,false);assert.equal(reset.progress.forged,false);
 await page.reload();await page.waitForSelector('canvas[data-ready="true"]');assert.equal(await page.evaluate(()=>window.__erebus.snapshot().flight),null);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({descentCamera:descent.camera,ascentCamera:ascent.camera,returned:{position:returned.position,shipHidden:returned.shipHidden,surfaceView:returned.surfaceView},pause:true,qualitySwitch:true,resetDuringDescent:true,errors}));
}finally{await browser.close();}
