import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[],warnings=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/asset unavailable|GLTFLoader/.test(m.text()))warnings.push(m.text());});page.on('request',r=>{if(/\.glb/.test(r.url()))requests.push(r.url());});
 await page.addInitScript(()=>{localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,fieldScans:['arch','weather'],power:{profile:'balanced',heat:24,tripped:false}}));const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(()=>setTimeout(()=>callback(performance.now()),100));});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
 for(const id of ['mission','powerHud','navigationHud','interaction','toast'])assert.equal(await page.locator('#'+id).isVisible(),false);
 assert.equal(await page.locator('#infoToggle').getAttribute('aria-pressed'),'false');assert.equal(requests.length,1,'walking startup only requests the shared crew skin');
 await page.click('#infoToggle');assert.equal(await page.locator('#mission').isVisible(),true);await page.keyboard.press('KeyH');assert.equal(await page.locator('#mission').isVisible(),false);
 await page.click('#cameraToggle');await page.waitForFunction(()=>window.__erebus.snapshot().avatar.visible&&window.__erebus.snapshot().avatar.visual);
 const before=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(before.camera.thirdPerson,true);assert.ok(before.camera.clearance>3);
 await page.keyboard.down('KeyW');await page.waitForFunction(z=>window.__erebus.snapshot().position.z<z-4,before.position.z);await page.keyboard.up('KeyW');
 const walked=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(walked.avatar.visual.walkWeight>.5);assert.notEqual(walked.avatar.visual.walkTime,before.avatar.visual.walkTime);
 await page.screenshot({path:'.local/qa/third-person-character.png'});
 console.log('Checked hidden panels, walking avatar, shared skin and actual-distance animation');
 await page.evaluate(()=>window.__erebus.place(0,21));await page.waitForFunction(()=>window.__erebus.snapshot().camera.clearance<.8);assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).avatar.visible,false);
 assert.ok((await page.evaluate(()=>window.__erebus.snapshot())).camera.z<21.6);
 await page.evaluate(()=>window.__erebus.place(0,21,Math.PI));await page.waitForFunction(()=>window.__erebus.snapshot().avatar.visible);assert.ok((await page.evaluate(()=>window.__erebus.snapshot())).camera.clearance>3);
 console.log('Checked wall camera retraction and recovery');
 await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='flying'&&window.__erebus.snapshot().authored.craft&&window.__erebus.snapshot().authored.station);
 let s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.cockpitVisible,false);assert.equal(s.authored.flightCraftVisible,true);assert.ok(s.camera.clearance>12);
 await page.screenshot({path:'.local/qa/third-person-shuttle.png'});
 console.log('Checked imported spacecraft and station loaded');
 const cdp=await page.context().newCDPSession(page);
 const drag=async(from,to)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y:320}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to,y:320}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 await drag(800,15);await page.waitForFunction(()=>{const s=window.__erebus.snapshot();return s.camera.z<s.flight.position.z-10;});
 await page.screenshot({path:'.local/qa/authored-station.png'});
 await drag(15,800);await page.waitForFunction(()=>{const s=window.__erebus.snapshot();return s.camera.z>s.flight.position.z+10;});
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>window.__erebus.snapshot().cockpitVisible);assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).authored.flightCraftVisible,false);
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>window.__erebus.snapshot().authored.flightCraftVisible);
 assert.equal(await page.locator('#flightBrake').isVisible(),true);assert.equal(await page.locator('#flightTelemetry').isVisible(),false);
 console.log('Starting third-person outward flight');await flyLeg(page);s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.onSurface,true);assert.equal(s.avatar.visible,true);assert.equal(s.authored.surfaceCraftVisible,false);console.log('Checked third-person landing');
 await page.screenshot({path:'.local/qa/third-person-nysa.png'});
 await page.evaluate(()=>window.__erebus.target('Board shuttle for Erebus'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Board shuttle for Erebus');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__erebus.snapshot().flight?.phase==='ascending'&&window.__erebus.snapshot().authored.surfaceCraftVisible);
 await page.screenshot({path:'.local/qa/third-person-ascent.png'});console.log('Starting third-person return flight');await flyLeg(page);console.log('Checked third-person docking');
 s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.onSurface,false);assert.equal(s.avatar.visible,true);assert.equal(s.progress.surveyed,true);assert.equal(s.progress.fieldScans.length,2);
 await page.click('#menu');const paused=await page.evaluate(()=>window.__erebus.snapshot());await page.waitForTimeout(500);assert.deepEqual((await page.evaluate(()=>window.__erebus.snapshot())).camera,paused.camera);
 await page.reload();await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');assert.equal(await page.locator('#cameraToggle').textContent(),'3P');assert.equal(await page.locator('#infoToggle').getAttribute('aria-pressed'),'false');
 await page.waitForFunction(()=>window.__erebus.snapshot().avatar.visible);assert.equal(requests.filter(u=>/ely/.test(u)).length,2,'one shared skin request per page');
 assert.equal(requests.filter(u=>/craft/.test(u)).length,1);assert.equal(requests.filter(u=>/station/.test(u)).length,1);
 for(const size of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);await page.waitForTimeout(400);
  for(const id of ['infoToggle','cameraToggle','menu','stick','touchAction']){const r=await page.locator('#'+id).boundingBox();assert.ok(r&&r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.x+r.width<=size.width&&r.y+r.height<=size.height);}
  const stick=await page.locator('#stick').boundingBox(),start=await page.evaluate(()=>window.__erebus.snapshot().position.z);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stick.x+stick.width/2,y:stick.y+stick.height/2-25}]});
  await page.waitForFunction(z=>window.__erebus.snapshot().position.z<z-.3,start);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual((await page.evaluate(()=>window.__erebus.snapshot())).touchMove,{x:0,y:0});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`.local/qa/clear-view-mobile-${size.width}.png`});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);console.log(JSON.stringify({panelsDefaultHidden:true,oneClickPanels:true,walkingThirdPerson:true,distanceDrivenAnimation:true,wallCameraClearance:true,firstThirdFlightSwitch:true,authoredCraftAndStation:true,hiddenPanelFlightControls:true,thirdPersonRoundTrip:true,savesPreserved:true,pauseFrozen:true,preferencesPersist:true,portraitLandscapeControls:true,requests,errors,warnings}));
}finally{await browser.close();}
