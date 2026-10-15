import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log(m.type(),m.text());});
 await page.addInitScript(()=>{localStorage.setItem('erebus-camera','third');localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}}));});
 await page.goto('http://localhost:5173/?qa',{waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready=true]');console.log('Ready',await page.evaluate(()=>window.__erebus.snapshot().authored));await page.waitForFunction(()=>window.__erebus.snapshot().authored.resident);await page.waitForFunction(()=>window.__erebus.snapshot().avatar.source==='biker');await page.click('#play');console.log('Resident loaded');await fs.mkdir('.local/qa',{recursive:true});
 await page.evaluate(()=>window.__erebus.place(0,1.8));await page.waitForTimeout(700);await page.screenshot({path:'.local/qa/character-corrected.png'});
 // Walk across the widened lounge through the former wall, with real physics.
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.__erebus.snapshot().position.x>2.75);await page.keyboard.up('KeyD');assert.ok((await page.evaluate(()=>window.__erebus.snapshot())).position.y>.7);
 await page.screenshot({path:'.local/qa/launch-lounge-widened.png'});console.log('Lounge crossed');
 await page.evaluate(()=>window.__erebus.place(0,-16));await page.keyboard.press('KeyC');await page.waitForTimeout(500);await page.screenshot({path:'.local/qa/bow-viewport.png'});
 await page.evaluate(()=>window.__erebus.place(0,32,Math.PI));await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().position.z>34);await page.keyboard.up('KeyW');await page.waitForTimeout(500);await page.screenshot({path:'.local/qa/cabin-resident.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({authoredPlayer:true,wideLoungeWalking:true,bedroomEntryWalking:true,cabinResident:true,errors}));
}finally{await browser.close();}
