import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
const page=await browser.newPage({viewport:{width:960,height:600}});
page.setDefaultTimeout(45000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]',{timeout:60000});
await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/intro.png'});
// Pointer lock is not supplied by headless contexts: emulate its successful state to test keyboard gameplay.
await page.evaluate(()=>{Object.defineProperty(document,'pointerLockElement',{get:()=>document.querySelector('canvas'),configurable:true});HTMLCanvasElement.prototype.requestPointerLock=async()=>{};document.exitPointerLock=()=>{};});
await page.click('summary');await page.selectOption('#quality','low');await page.click('#play');
await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().position.z<13.5,{},{timeout:30000});await page.keyboard.up('KeyW');
let s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.position.z<14,'keyboard moves player forward');assert.ok(s.position.y>.8&&s.position.y<1,'floor supports player');
await page.evaluate(()=>window.__erebus.place(0,-14));await page.keyboard.down('KeyW');await page.waitForTimeout(1800);await page.keyboard.up('KeyW');s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.position.z> -15.6,'forward window collision holds');
async function interact(name){await page.evaluate(name=>window.__erebus.target(name),name);await page.waitForFunction(name=>window.__erebus.snapshot().nearest===name,name,{timeout:30000});assert.equal(await page.evaluate(()=>window.__erebus.snapshot().nearest),name);await page.keyboard.press('KeyE');await page.waitForTimeout(300);console.log('Checked:',name);}
await interact('Initialize universe forge');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.forged,false);
// Closed bulkhead must block, then open access with the real keyboard interaction.
await page.evaluate(()=>window.__erebus.place(-9,6,Math.PI/2));await page.keyboard.down('KeyW');await page.waitForTimeout(1200);await page.keyboard.up('KeyW');s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.position.x> -10.6,'closed bulkhead blocks passage');
await interact('Toggle bulkhead');await page.waitForFunction(()=>window.__erebus.snapshot().doors[0].height>4,{},{timeout:30000});s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.doors[0].open&&s.doors[0].height>4,'bulkhead animates open');
await page.evaluate(()=>window.__erebus.place(-9,6,Math.PI/2));await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().position.x< -11.6,{},{timeout:30000});await page.keyboard.up('KeyW');s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.position.x< -11.5,'open doorway permits passage');
await interact('Restore engineering relay');await interact('Restore navigation relay');await interact('Restore observatory relay');
await interact('Initialize universe forge');s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.progress.forged,true);assert.equal(s.progress.relays.length,3);assert.equal(await page.locator('#objective').textContent(),'A universe begins');
await interact('Scan the new world');assert.match(await page.locator('#speech').textContent(),/NYSA/);await page.click('#closeDialogue');
await page.evaluate(()=>window.__erebus.place(0,-5));await page.waitForTimeout(300);await page.screenshot({path:'.local/qa/bridge.png'});
console.log('Checking reload');await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.progress.forged,true,'saved progression restores');
await page.evaluate(()=>localStorage.setItem('black-universe-v1','{bad'));console.log('Checking reload');await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.relays.length,0,'corrupt save resets safely');
assert.deepEqual(errors,[],'no browser exceptions');
await page.close();console.log('Checking mobile');const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.goto('http://localhost:5173/?qa');await mobile.waitForSelector('canvas[data-ready="true"]');await mobile.click('summary');await mobile.selectOption('#quality','low');await mobile.click('#play');await mobile.screenshot({path:'.local/qa/mobile.png'});assert.equal(await mobile.locator('#touchAction').isVisible(),true);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile fits viewport');
const start=await mobile.evaluate(()=>window.__erebus.snapshot().position.z);
await mobile.touchscreen.tap(80,650); // Real touch device context.
const cdp=await mobile.context().newCDPSession(mobile);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:668}]});
await mobile.waitForFunction(z=>window.__erebus.snapshot().position.z<z-.25,start,{timeout:30000});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.ok((await mobile.evaluate(()=>window.__erebus.snapshot().position.z))<start-.25,'touch joystick moves player');
console.log('PASS: keyboard movement, floor/window/door collisions, open passage, forge gating, all relays, genesis, scan dialogue, save reload, corrupt save, desktop rendering, mobile layout and touch UI.');

} finally { await browser.close(); }
