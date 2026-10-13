import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
 await page.evaluate(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:false,power:{profile:'balanced',heat:24,tripped:false}})));
 await page.reload();await page.waitForSelector('canvas[data-ready="true"]');await page.getByText('Controls & settings',{exact:true}).click();await page.selectOption('#quality','low');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#play');
 await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying');
 await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/kestrel-flight.png'});
 await page.click('#menu');const frozen=await page.evaluate(()=>window.__erebus.snapshot().flight);await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().flight),frozen);await page.click('#play');
 await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__erebus.snapshot().onSurface),false,'remote landing is rejected');
 await flyLeg(page);await page.screenshot({path:'.local/qa/kestrel-landed.png'});
 await page.evaluate(()=>window.__erebus.target('Survey luminous outcrop'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Survey luminous outcrop');await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__erebus.snapshot().progress.surveyed),true);
 await page.evaluate(()=>window.__erebus.target('Board shuttle for Erebus'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Board shuttle for Erebus');await page.keyboard.press('KeyE');await flyLeg(page);
 const returned=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(returned.progress.surveyed,true);assert.equal(returned.onSurface,false);assert.equal(returned.flight,null);
 await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.click('#touchAction');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying');
 // Actual touch joystick increases throttle and advances the shuttle; no flight-pose hook exists.
 const box=await page.locator('#stick').boundingBox(),session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+52,y:box.y+25,id:1}]});
 await page.waitForFunction(()=>window.__erebus.snapshot().flight?.speed>15);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.click('#menu');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#reset');assert.equal(await page.evaluate(()=>window.__erebus.snapshot().flight),null);assert.equal(await page.evaluate(()=>window.__erebus.snapshot().onSurface),false);
 await page.reload();await page.waitForSelector('canvas[data-ready="true"]');assert.equal(await page.evaluate(()=>window.__erebus.snapshot().flight),null);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({returned:{position:returned.position,surveyed:returned.progress.surveyed},touchFlight:true,pause:true,remoteLandingRejected:true,reset:true,errors}));
}finally{await browser.close();}
