// Visual-only follow-up after lighting/screens changed; does not replay the expedition.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const floorOnly=process.argv.includes('--floor-only');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:640,height:480},hasTouch:true});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,network:{repairs:['dune','basalt'],online:true},power:{profile:'balanced',heat:24,tripped:false}})));
 await page.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+`
window.__relayVisualSetup=()=>travel(true);window.__relayPose=(x,z,angle)=>{window.__erebus.place(x,z);pitch=angle;};window.__relayVisualRead=()=>({loaded:relayOutpost.snapshot().loaded,position:camera.position.toArray(),body:player.translation()});`});});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.click('#play');await page.evaluate(()=>window.__relayVisualSetup());await page.waitForFunction(()=>window.__relayVisualRead().loaded);
 await fs.mkdir('.local/qa',{recursive:true});
 if(floorOnly){
  await page.evaluate(()=>window.__relayPose(476,-74.5,-.6));await page.waitForFunction(()=>Math.abs(window.__relayVisualRead().position[2]+74.5)<.01);await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__relayVisualRead().body.z< -79.5);await page.keyboard.up('KeyW');await page.screenshot({path:'.local/qa/relay-raised-deck.png'});await page.keyboard.down('KeyS');await page.waitForFunction(()=>window.__relayVisualRead().body.z> -79);await page.keyboard.up('KeyS');await page.screenshot({path:'.local/qa/relay-raised-deck-moving.png'});
 }else{
 for(const [name,x,z,pitch]of [['overview',476,-62,.08],['lit-interior',476,-80.6,-.12],['dune-receiver',324,68,-.12],['basalt-receiver',317,-74,-.12]]){
  await page.evaluate(([x,z,p])=>window.__relayPose(x,z,p),[x,z,pitch]);await page.waitForFunction(z=>Math.abs(window.__relayVisualRead().position[2]-z)<.01,z);await page.screenshot({path:'.local/qa/relay-'+name+'.png'});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__relayPose(476,-80.6,-.12));await page.waitForFunction(()=>Math.abs(window.__relayVisualRead().position[2]+80.6)<.01);await page.screenshot({path:'.local/qa/relay-lit-interior-portrait.png'});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({floorWalkFollowup:floorOnly,lightingAndScreenFollowup:!floorOnly,errors,limits:'pose-only software-rendered image checks; progression/flight were verified before these appearance-only edits'}));
}finally{await browser.close();}
