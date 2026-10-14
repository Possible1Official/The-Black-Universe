import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {flyLeg} from './flight-qa-helpers.mjs';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
let page;
try{
page=await browser.newPage({viewport:{width:390,height:700},isMobile:true,hasTouch:true});page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('erebus-camera','third');localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}}));});
await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');console.log('Ready');await page.click('#play');
const cdp=await page.context().newCDPSession(page);
async function dragAt(x,y,dx,dy){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy,id:1}]});await page.waitForTimeout(250);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
async function snapshot(){return page.evaluate(()=>window.__erebus.snapshot());}
async function interact(name){await page.evaluate(n=>window.__erebus.target(n),name);await page.waitForFunction(n=>window.__erebus.snapshot().nearest===n,name);await page.keyboard.press('KeyE');}
await page.waitForFunction(()=>window.__erebus.snapshot().avatar.source==='biker');await page.evaluate(()=>window.__erebus.place(0,-2));
await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/cyber-walk-mobile.png'});
console.log('Player model loaded');await interact('Launch survey shuttle');console.log('Launched');await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying');
assert.equal(await page.locator('#speedControl').isVisible(),true);const left=await page.locator('#speedControl').boundingBox(),right=await page.locator('#stick').boundingBox();assert.ok(left.x<195&&right.x>195);
const before=await snapshot();await dragAt(190,200,80,30);
await page.waitForTimeout(300);const looked=await snapshot();assert.equal(looked.pilot.yaw,before.pilot.yaw);assert.equal(looked.pilot.pitch,before.pilot.pitch);
await page.locator('#vehicleSpeed').evaluate(e=>{e.value='45';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(()=>window.__erebus.snapshot().flight.throttle>.1);assert.equal((await snapshot()).speedDemand,.45);
await page.keyboard.down('Space');await page.waitForFunction(()=>window.__erebus.snapshot().flight.throttle===0);await page.keyboard.up('Space');
// Reset free view with inverse drag, then the actual keyboard flight and landing flow.
await dragAt(270,230,-80,-30);
await flyLeg(page);console.log('Landed');await page.screenshot({path:'.local/qa/nysa-terrain-mobile.png'});
for(const kind of ['bike','rover']){
 await interact(kind==='bike'?'Ride Turbo Bike':'Drive Sci-fi Rover');await page.waitForFunction(k=>window.__erebus.snapshot().riding===k,kind);await page.waitForFunction(()=>window.__erebus.snapshot().avatar.visual.ridingWeight===1);
 console.log('Mounted',kind);await page.locator('#vehicleSpeed').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(k=>window.__erebus.snapshot().vehicles.find(v=>v.kind===k).distance>3,kind);
 const stickBox=await page.locator('#stick').boundingBox();await dragAt(stickBox.x+stickBox.width/2,stickBox.y+stickBox.height/2,28,0);assert.ok(Math.abs((await snapshot()).vehicles.find(v=>v.kind===kind).yaw)>.01);
 await page.keyboard.down('Space');await page.waitForFunction(k=>window.__erebus.snapshot().vehicles.find(v=>v.kind===k).speed<.2,kind);await page.keyboard.up('Space');await page.screenshot({path:`.local/qa/${kind}-riding-mobile.png`});await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__erebus.snapshot().riding===null);assert.equal(await page.locator('#speedControl').isVisible(),false);
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({mobileLayout:true,freeLookPreservesHeading:true,speedSlider:true,brakePriority:true,actualFlightLanding:true,bikeDriveDismount:true,roverDriveDismount:true,errors}));
}catch(error){if(page){console.log('Failure state:',JSON.stringify(await page.evaluate(()=>window.__erebus?.snapshot()).catch(()=>null)));await page.screenshot({path:'.local/qa/nysa-vehicles-failure.png'}).catch(()=>{});}throw error;}finally{await browser.close();}
