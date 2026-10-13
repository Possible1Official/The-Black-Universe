import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,fieldScans:['arch','weather'],power:{profile:'balanced',heat:24,tripped:false}})));
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
 const launch=async()=>{await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying');};
 await launch();await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.speed>135);
 assert.equal(await page.locator('#velocityMarker').isVisible(),true);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:650,y:290,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:710,y:290,id:1}]});
 await page.waitForFunction(()=>{const r=document.getElementById('velocityMarker').getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)>12&&!document.getElementById('velocityMarker').hidden;});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:650,y:290,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.keyboard.press('KeyT');await page.waitForFunction(()=>document.getElementById('flightHud').dataset.approach==='receding');await page.keyboard.press('KeyT');
 await page.waitForFunction(()=>document.getElementById('flightHud').dataset.approach==='brake');
 const warning=await page.evaluate(()=>window.__erebus.snapshot().flight);assert.ok(warning.distance>100);await fs.mkdir('.local/qa',{recursive:true});
 // Held thrust and boost remain pressed while actual braking takes priority.
 await page.keyboard.down('Space');await page.screenshot({path:'.local/qa/approach-warning.png'});await page.waitForFunction(()=>window.__erebus.snapshot().flight?.speed<.5);
 const stopped=await page.evaluate(()=>window.__erebus.snapshot().flight);assert.equal(stopped.throttle,0);assert.equal(stopped.collisions,0);
 await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');await page.keyboard.up('Space');
 await page.click('#menu');const frozen=await page.evaluate(()=>window.__erebus.snapshot().flight);await page.waitForTimeout(400);assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().flight),frozen);assert.equal(await page.locator('#velocityMarker').isVisible(),false);await page.click('#play');
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.distance<85);await page.keyboard.up('KeyW');await page.keyboard.down('Space');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.speed<10);await page.keyboard.up('Space');
 await page.waitForFunction(()=>document.getElementById('flightHud').dataset.approach==='ready');await page.screenshot({path:'.local/qa/approach-ready.png'});await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__erebus.snapshot().onSurface&&!window.__erebus.snapshot().flight);assert.equal(await page.locator('#velocityMarker').isVisible(),false);
 await page.evaluate(()=>window.__erebus.target('Board shuttle for Erebus'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Board shuttle for Erebus');await page.keyboard.press('KeyE');await flyLeg(page);
 assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().progress.fieldScans),['arch','weather']);
 await launch();const stick=await page.locator('#stick').boundingBox(),brake=await page.locator('#flightBrake').boundingBox(),boost=await page.locator('#flightBoost').boundingBox();
 const thrust={x:stick.x+52,y:stick.y+25,id:1};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thrust]});await page.waitForFunction(()=>window.__erebus.snapshot().flight?.speed>20);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thrust,{x:boost.x+boost.width/2,y:boost.y+boost.height/2,id:2},{x:brake.x+brake.width/2,y:brake.y+brake.height/2,id:3}]});
 await page.waitForFunction(()=>window.__erebus.snapshot().flight?.throttle===0&&window.__erebus.snapshot().flight?.speed<.5);assert.ok(await page.evaluate(()=>window.__erebus.snapshot().touchMove.y<-.5));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.click('#menu');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#reset');assert.equal(await page.evaluate(()=>window.__erebus.snapshot().flight),null);await page.reload();await page.waitForSelector('canvas[data-ready="true"]');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({warning:{distance:warning.distance,speed:warning.speed},stopped:{distance:stopped.distance,speed:stopped.speed},velocityDrift:true,targetReceding:true,heldKeyboardBrake:true,heldTouchBrake:true,pause:true,landedAndDocked:true,savePreserved:true,reset:true,errors}));
}finally{await browser.close();}
