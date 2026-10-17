// Focused navigation/appearance QA; skips unchanged missions and orbital travel.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});let page;const errors=[],consoleErrors=[];
try{
 page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});await fs.mkdir('.local/qa',{recursive:true});
 await page.addInitScript(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,network:{repairs:['dune','basalt'],online:true},droneRecovered:true,power:{profile:'balanced',heat:24,tripped:false}})));
 const hooks=`
 window.__detourEnter=()=>travel(true);
 window.__detourSetup=()=>{
  const x=SURFACE_ORIGIN+76,z=-80;player.setTranslation({x:x+6.6,y:vehicleGround(82.6,z+2.8)+1.05,z:z+2.8},true);player.setNextKinematicTranslation(player.translation());world.step();
  surveyDrone.hold();surveyDrone.root.position.set(x+2.5,1.39,z+1);yaw=Math.PI;pitch=-.1;clearInput();window.__detourCorner={x:x+4.75,z:z+4.2};
 };
 window.__detourRead=()=>({...surveyDrone.snapshot(),player:player.translation(),corner:window.__detourCorner,colliders:world.colliders.len()});
 window.__detourFollow=()=>surveyDrone.startFollowing(surveyDrone.visitor(world,player.translation(),playerCollider));
 window.__detourInspect=()=>{active=false;$('overlay').hidden=true;const p=surveyDrone.root.position;camera.position.copy(p).add(new THREE.Vector3(2,1.3,2.5));camera.lookAt(p);};`;
 await page.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+hooks});});
 console.log('boot');await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.click('#play');await page.evaluate(()=>window.__detourEnter());await page.waitForFunction(()=>window.__erebus.snapshot().drone.loaded&&window.__erebus.snapshot().outpost.loaded);await page.evaluate(()=>window.__detourSetup());
 const start=await page.evaluate(()=>window.__detourRead());console.log('actual outpost corner fixture',JSON.stringify(start));await page.evaluate(()=>window.__detourFollow());await page.waitForFunction(()=>window.__detourRead().status==='detouring');
 await page.click('#menu');const paused=await page.evaluate(()=>window.__detourRead());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.deepEqual(await page.evaluate(()=>window.__detourRead()),paused);console.log('detour and pause passed');await page.click('#play');
 await page.waitForFunction(()=>{const d=window.__detourRead();return d.status==='waiting'&&d.position[0]>d.corner.x;});
 const arrived=await page.evaluate(()=>window.__detourRead());assert.equal(arrived.command,'follow');assert.ok(arrived.detours>=1);assert.ok(arrived.lastSearch.sweeps<=160);assert.ok(arrived.lastSearch.samples<=80);assert.equal(arrived.colliders,start.colliders);assert.ok(Math.hypot(arrived.player.x-arrived.position[0],arrived.player.z-arrived.position[2])<3);console.log('actual outpost detour resumed',JSON.stringify(arrived));
 // Actual command UI after detouring; then reuse the same shot for source inspection.
 await page.evaluate(()=>window.__erebus.target('Speak to ECHO'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Speak to ECHO');await page.keyboard.press('KeyE');await page.waitForSelector('#dronePanel:not([hidden])');assert.match(await page.locator('#speech').textContent(),/detours/);await page.click('#droneHold');assert.equal((await page.evaluate(()=>window.__detourRead())).command,'hold');
 await page.setViewportSize({width:640,height:480});await page.evaluate(()=>window.__detourInspect());await page.screenshot({path:'.local/qa/echo-detour-source.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);console.log(JSON.stringify({actualOutpostDetour:true,pause:true,resumedFollow:true,realHoldUI:true,actualSourceVisual:true,arrived,errors,consoleErrors,limits:'390x844 touch Chromium/SwiftShader and640x480 source view; setup fixtures skip travel, no physical-device FPS or hosted render check'}));
}catch(e){console.log(JSON.stringify({error:e.message,errors,consoleErrors}));if(page){console.log(await page.evaluate(()=>window.__detourRead?.()).catch(()=>null));await page.screenshot({path:'.local/qa/echo-detour-failed.png',timeout:15000}).catch(()=>{});}process.exitCode=1;}finally{await browser.close();}
