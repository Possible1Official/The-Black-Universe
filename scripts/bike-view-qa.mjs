import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
let page;
try{
 page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('erebus-camera','first'));
 const hooks=`
 window.__bikeSetup=async()=>{travel(true);await attachRequested('bike',vehicleVisuals.get('bike'));};
 window.__bikeRead=()=>({pitch,viewPitch:camera.rotation.x-(vehicleVisuals.get('bike')?.rotation.x??0),eye:camera.position.toArray(),fov:camera.fov,near:camera.near,body:avatarVisual.snapshot().bikeFirstPerson,torso:avatarVisual.root.getObjectByName('biker_vest')?.visible,legs:avatarVisual.root.getObjectByName('bottom_parts')?.visible,
 hands:[new THREE.Vector3(-.45,1.273,-.56),new THREE.Vector3(.45,1.29,-.534)].map(v=>vehicleVisuals.get('bike').localToWorld(v).project(camera).toArray()),
 lowerBody:['Hips','LeftLeg','RightLeg'].map(s=>avatarVisual.root.getObjectByName('mixamorig'+s).getWorldPosition(new THREE.Vector3()).project(camera).toArray()),contact:avatarVisual.snapshot().contact});`;
 await page.route('**/src/main.ts*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+hooks});
 });
 await page.goto('http://localhost:5173/?qa');
 await page.waitForSelector('canvas[data-ready=true]');
 await page.waitForFunction(()=>window.__erebus.snapshot().avatar.source==='biker');
 await page.click('#play');await page.evaluate(()=>window.__bikeSetup());
 await page.evaluate(()=>window.__erebus.target('Ride Turbo Bike'));
 await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Ride Turbo Bike');
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__bikeRead().contact?.active);
 const cdp=await page.context().newCDPSession(page);
 async function lookDown(pixels){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:360,y:190}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:360,y:190+pixels}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>Math.abs(window.__bikeRead().pitch-window.__bikeRead().viewPitch)<.005);
 }

 const bars=await page.evaluate(()=>window.__bikeRead());
 console.log('Bars',JSON.stringify(bars));
 assert.equal(bars.near,.02);assert.equal(bars.body,true);assert.equal(bars.torso,true);assert.equal(bars.legs,true);

 await fs.mkdir('.local/qa',{recursive:true});
 await page.screenshot({path:'.local/qa/bike-body-handlebars.png'});
 await lookDown(240);
 const down=await page.evaluate(()=>window.__bikeRead());
 console.log('Body',JSON.stringify(down));
 assert.ok(down.pitch< -1.1);
 assert.ok(down.lowerBody.every(h=>Math.abs(h[0])<1&&Math.abs(h[1])<1));
 await page.screenshot({path:'.local/qa/bike-full-body-first-person.png'});
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>!window.__bikeRead().body);
 assert.equal((await page.evaluate(()=>window.__bikeRead())).near,.08);await page.screenshot({path:'.local/qa/bike-full-body-third-person.png'});
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>window.__bikeRead().body);
 await page.locator('#vehicleSpeed').evaluate(e=>{e.value='20';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.keyboard.down('KeyD');
 await page.waitForFunction(()=>window.__erebus.snapshot().vehicles.find(v=>v.kind==='bike').distance>2);
 await page.keyboard.up('KeyD');
 assert.ok((await page.evaluate(()=>window.__bikeRead())).contact.palmErrors.every(e=>e<.003));
 await page.keyboard.down('Space');await page.waitForFunction(()=>window.__erebus.snapshot().vehicles.find(v=>v.kind==='bike').speed<.1);
 await page.keyboard.up('Space');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__erebus.snapshot().riding===null&&!window.__bikeRead().body);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({firstPersonBody:true,realTouchLookDown:true,viewToggle:true,bankedGripContact:true,brakeDismountRestores:true,errors}));
}catch(error){
 console.log(JSON.stringify({error:error.message}));
 if(page){console.log(await page.evaluate(()=>window.__bikeRead?.()).catch(()=>null));await page.screenshot({path:'.local/qa/bike-body-failed.png',timeout:15000}).catch(()=>{});}
 process.exitCode=1;
}finally{await browser.close();}
