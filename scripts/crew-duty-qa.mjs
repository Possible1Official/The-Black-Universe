import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
  await page.evaluate(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:false,power:{profile:'balanced',heat:35,tripped:true}})));
  await page.reload();await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
  await page.waitForFunction(()=>window.__erebus.snapshot().crew[1].mode==='inspecting',{},{timeout:90000});
  const watch=await page.evaluate(()=>window.__erebus.snapshot().crew[1]);assert.equal(watch.duty,'containment-watch');assert.ok(Math.hypot(watch.position.x+14.6,watch.position.z-10.8)<.12);
  await page.waitForTimeout(500);const held=await page.evaluate(()=>window.__erebus.snapshot().crew[1]);assert.ok(Math.hypot(held.position.x-watch.position.x,held.position.z-watch.position.z)<.02);
  await page.evaluate(()=>window.__erebus.place(-17,12.5,-.95));await page.waitForTimeout(500);if(process.argv[3])await page.screenshot({path:process.argv[3]});
  // A visitor interrupts the duty, then leaving resumes inspection without losing its goal.
  await page.evaluate(()=>window.__erebus.place(-16.2,10.8,-Math.PI/2));await page.waitForFunction(()=>window.__erebus.snapshot().crew[1].mode==='attending'&&window.__erebus.snapshot().nearest==='Speak with ION');
  await page.keyboard.press('KeyE');await page.waitForSelector('#dialogue:not([hidden])');assert.equal(await page.locator('#speaker').textContent(),'OFFICER ION');assert.match(await page.locator('#speech').textContent(),/containment|cool/i);await page.click('#closeDialogue');
  await page.evaluate(()=>window.__erebus.place(0,16));await page.waitForFunction(()=>window.__erebus.snapshot().crew[1].mode==='inspecting');
  await page.evaluate(()=>window.__erebus.target('Open engineering diagnostics'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Open engineering diagnostics');await page.keyboard.press('KeyE');
  await page.click('#resetContainment');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.power.tripped,false);await page.click('#closeDialogue');
  await page.evaluate(()=>window.__erebus.place(0,16));await page.waitForFunction(()=>window.__erebus.snapshot().crew[1].duty==='returning-to-patrol');
  await page.waitForFunction(()=>window.__erebus.snapshot().crew[1].duty==='patrol',{},{timeout:90000});
  const returned=await page.evaluate(()=>window.__erebus.snapshot().crew[1]);assert.ok(returned.position.z<8.7);assert.deepEqual(errors,[]);
  const result={watch,returned,errors};console.log(JSON.stringify(result));if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2));
}finally{await browser.close();}
