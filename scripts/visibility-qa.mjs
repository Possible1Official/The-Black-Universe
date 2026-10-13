import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
  const page=await browser.newPage({viewport:{width:640,height:400},isMobile:true,hasTouch:true});page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
  await page.evaluate(()=>window.__erebus.place(-12,3.2,-Math.PI/2));await page.waitForFunction(()=>window.__erebus.snapshot().position.x< -11.5);await page.waitForTimeout(500);
  assert.notEqual((await page.evaluate(()=>window.__erebus.snapshot())).nearest,'Toggle bulkhead');await page.keyboard.press('KeyE');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).doors[0].open,false);
  if(process.argv[3])await page.screenshot({path:process.argv[3]});
  await page.evaluate(()=>window.__erebus.target('Toggle bulkhead'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Toggle bulkhead');await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__erebus.snapshot().doors[0].open);
  await page.evaluate(()=>window.__erebus.target('Speak with VEGA'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Speak with VEGA'&&window.__erebus.snapshot().crew[0].visitorVisible&&window.__erebus.snapshot().crew[0].mode==='attending');await page.keyboard.press('KeyE');assert.equal(await page.locator('#speaker').textContent(),'OFFICER VEGA');
  assert.deepEqual(errors,[]);const result={wallInteractionBlocked:true,clearPanelWorks:true,visibleCrewAttendsAndSpeaks:true,errors};console.log(JSON.stringify(result));if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2));
}finally{await browser.close();}
