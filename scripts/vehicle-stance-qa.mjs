// Focused actual-game surface fixture; skips unrelated flight through a private
// Playwright response override, never a production application hook.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const dismountOnly=process.argv.includes('--dismount-only');
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('erebus-camera','third');localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}}));});
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`
window.__stanceSetup=async(kind,x,z)=>{await attachRequested(kind,vehicleVisuals.get(kind));travel(true);groundVehicles.get(kind).relocate({x:SURFACE_ORIGIN+x,y:vehicleGround(x,z),z});world.step();};
window.__stanceRead=kind=>{const m=vehicleVisuals.get(kind);m.updateWorldMatrix(true,false);const anchor=m.localToWorld(new THREE.Vector3(0,VEHICLE_SPEC[kind].seat-.9,.43)),q=m.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI));return {pitch:m.rotation.x,roll:m.rotation.z,anchorError:avatar.position.distanceTo(anchor),orientationError:1-Math.abs(avatar.quaternion.dot(q)),avatarTilt:Math.abs(avatar.rotation.x)+Math.abs(avatar.rotation.z),cameraRoll:camera.rotation.z,avatarYaw:avatar.rotation.y,vehicleYaw:groundVehicles.get(kind).yaw};};`});});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.waitForFunction(()=>window.__erebus.snapshot().avatar.source==='biker');await page.click('#play');await fs.mkdir('.local/qa',{recursive:true});
 const poses={};
 for(const [kind,x,z] of [['bike',-16,23],['rover',-22,20]]){
  await page.evaluate(([k,x,z])=>window.__stanceSetup(k,x,z),[kind,x,z]);await page.waitForTimeout(350);
  await page.evaluate(n=>window.__erebus.target(n),kind==='bike'?'Ride Turbo Bike':'Drive Sci-fi Rover');await page.waitForFunction(n=>window.__erebus.snapshot().nearest===n,kind==='bike'?'Ride Turbo Bike':'Drive Sci-fi Rover');await page.keyboard.press('KeyE');await page.waitForFunction(k=>window.__erebus.snapshot().riding===k,kind);
  await page.waitForFunction(k=>Math.abs(window.__stanceRead(k).pitch)>.02,kind);const pose=await page.evaluate(k=>window.__stanceRead(k),kind);assert.ok(Math.abs(pose.pitch)<.385&&Math.abs(pose.roll)<.385);assert.ok(pose.anchorError<.0001&&pose.orientationError<.0001);poses[kind]=pose;
  if(!dismountOnly){
  await page.screenshot({path:'.local/qa/'+kind+'-terrain-stance.png'});
  await page.locator('#vehicleSpeed').evaluate(e=>{e.value='35';e.dispatchEvent(new Event('input',{bubbles:true}));});const before=await page.evaluate(k=>window.__erebus.snapshot().vehicles.find(v=>v.kind===k).distance,kind);await page.waitForFunction(([k,d])=>window.__erebus.snapshot().vehicles.find(v=>v.kind===k).distance>d+2,[kind,before]);
  await page.keyboard.down('Space');await page.waitForFunction(k=>window.__erebus.snapshot().vehicles.find(v=>v.kind===k).speed<.2,kind);await page.locator('#vehicleSpeed').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.keyboard.up('Space');
  await page.keyboard.press('KeyC');await page.waitForFunction(()=>!window.__erebus.snapshot().camera.thirdPerson);const first=await page.evaluate(k=>window.__stanceRead(k),kind);assert.ok(Math.abs(first.cameraRoll)<.0001,'camera horizon stays independent of chassis roll');await page.keyboard.press('KeyC');
  await page.click('#menu');const paused=await page.evaluate(k=>window.__stanceRead(k),kind);await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(k=>window.__stanceRead(k),kind),paused);await page.click('#play');
  }
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__erebus.snapshot().riding===null);await page.waitForFunction(k=>window.__stanceRead(k).avatarTilt<.0001,kind);const dismounted=await page.evaluate(k=>window.__stanceRead(k),kind);assert.ok(Math.abs(Math.atan2(Math.sin(dismounted.avatarYaw-dismounted.vehicleYaw-Math.PI),Math.cos(dismounted.avatarYaw-dismounted.vehicleYaw-Math.PI)))<.01,'dismount preserves facing');console.log('Passed',kind);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({terrainPitchRoll:true,riderFollowsSeat:true,driveBrakeDismount:!dismountOnly,levelFirstPersonHorizon:!dismountOnly,pauseStable:!dismountOnly,dismountResetsTilt:true,dismountPreservesFacing:true,poses,errors}));
}finally{await browser.close();}
