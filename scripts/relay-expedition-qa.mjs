// Focused expansion QA. Existing orbital transit and original mission are not replayed.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
let page;
try{
 page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('black-universe-v2'))localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,fieldScans:['arch'],power:{profile:'balanced',heat:24,tripped:false}}));});
 const hooks=`
 window.__relaySurface=()=>travel(true);
 window.__relayAim=()=>{pitch=-.25;};
 window.__relayOrbit=()=>{travel(false);flight={...startFlight('nysa'),phase:'flying',position:{...flightGoal(startFlight('nysa'))},velocity:{x:0,y:0,z:0}};pilot={yaw:0,pitch:0};speedDemand=0;};
 window.__relayRead=()=>({network:progress.network,outpost:relayOutpost.snapshot(),camera:camera.position.toArray(),position:player.translation(),site:landingSite,flight:flight?{site:flight.site,phase:flight.phase}:null});`;
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+hooks});});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.click('#play');await page.evaluate(()=>window.__relaySurface());await page.waitForFunction(()=>window.__relayRead().outpost.loaded);console.log('Textured outpost loaded');
 await fs.mkdir('.local/qa',{recursive:true});
 await page.evaluate(()=>window.__erebus.place(476,-71));await page.evaluate(()=>window.__relayAim());
 await page.waitForFunction(()=>Math.abs(window.__relayRead().camera[2]+71)<.1);await page.screenshot({path:'.local/qa/relay-outpost-exterior.png'});
 // Walk the actual entrance/deck with production collision and input.
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__relayRead().position.z< -80.5);await page.keyboard.up('KeyW');
 await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Activate outpost uplink');await page.screenshot({path:'.local/qa/relay-outpost-interior.png'});
 await page.keyboard.press('KeyE');await page.waitForSelector('#dialogue:not([hidden])');assert.match(await page.locator('#speech').textContent(),/Carrier missing.*Dune relay.*Basalt relay/);await page.click('#closeDialogue');
 await page.keyboard.press('KeyH');await page.keyboard.press('KeyJ');await page.waitForSelector('#relayExpedition');
 assert.equal(await page.locator('#surveyMap').evaluate(e=>e.getBoundingClientRect().right<=innerWidth),true);await page.locator('[data-track=network]').click();await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='network-dune');
 for(const label of ['Repair dune relay','Repair basalt relay']){
  await page.evaluate(name=>window.__erebus.target(name),label);await page.waitForFunction(name=>window.__erebus.snapshot().nearest===name,label);await page.keyboard.press('KeyE');await page.waitForSelector('#dialogue:not([hidden])');await page.screenshot({path:'.local/qa/relay-'+(label.includes('dune')?'dune':'basalt')+'.png'});await page.click('#closeDialogue');
 }
 assert.deepEqual((await page.evaluate(()=>window.__relayRead())).network,{repairs:['dune','basalt'],online:false});
 await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='network-uplink');
 await page.evaluate(()=>window.__erebus.target('Activate outpost uplink'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Activate outpost uplink');await page.keyboard.press('KeyE');await page.waitForSelector('#dialogue:not([hidden])');assert.match(await page.locator('#speech').textContent(),/NETWORK RESTORED.*Relay landing pad/);await page.click('#closeDialogue');
 await page.waitForFunction(()=>window.__relayRead().outpost.online&&window.__relayRead().outpost.antenna>0);console.log('Three physical interactions unlock relay pad');
 await page.evaluate(()=>window.__relayOrbit());await page.waitForSelector('#flightPad:not([hidden])');await page.keyboard.press('KeyL');assert.match(await page.locator('#flightPad').textContent(),/ARCH/);await page.keyboard.press('KeyL');assert.match(await page.locator('#flightPad').textContent(),/RELAY/);
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__relayRead().flight?.phase==='descending');await page.waitForFunction(()=>window.__relayRead().flight===null&&window.__relayRead().site==='relay');
 const landed=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(Math.abs(landed.position.x-472.2)<1);assert.ok(Math.abs(landed.position.z+53)<1);assert.equal(landed.progress.surveyed,true);assert.deepEqual(landed.progress.fieldScans,['arch']);
 await page.keyboard.press('KeyJ');await page.waitForSelector('#relayExpedition');assert.match(await page.locator('#relayExpedition').textContent(),/NETWORK ONLINE/);await page.screenshot({path:'.local/qa/relay-field-log.png'});await page.click('#closeFieldLog');
 await page.click('#menu');await page.reload();await page.waitForSelector('canvas[data-ready=true]');assert.equal((await page.evaluate(()=>window.__relayRead())).network.online,true);assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).onSurface,false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({texturedOutpost:true,actualEntranceWalk:true,uplinkPrerequisite:true,twoRepairs:true,mapTracking:true,padUnlocked:true,guidedRelayLanding:true,compatibleReload:true,errors,limitations:'software-rendered portrait touch emulation; fixture moves between distant sites and skips unchanged orbital travel; no hardware FPS claim'}));
}catch(e){console.log(JSON.stringify({error:e.message}));if(page){console.log(await page.evaluate(()=>window.__relayRead?.()).catch(()=>null));await page.screenshot({path:'.local/qa/relay-failed.png',timeout:15000}).catch(()=>{});}process.exitCode=1;}
finally{await browser.close();}
