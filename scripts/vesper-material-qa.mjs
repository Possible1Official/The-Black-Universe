// Rendering-only fixture: direct Vesper entry/site placement; no replay of unchanged missions.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:640,height:760},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('erebus-audio','muted'));
 await page.route('**/src/main.ts*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+`
 window.__vmEnter=()=>{vesperWorld??=new VesperSurface(starfield);vesperWorld.arrive(VESPER_APPROACH,[],false);vesperTrip=vesperWorld;vesperTrip.phase='walking';flight=null;thirdPerson=false;clearInput();};
 window.__vmSite=(x,z)=>{const p={x,y:vesperTrip.vehicles.ground(x,z)+.9,z};vesperTrip.player.setTranslation(p,true);vesperTrip.player.setNextKinematicTranslation(p);vesperTrip.world.step();yaw=0;pitch=-.65;clearInput();};
 window.__vmRead=()=>({state:vesperTrip.snapshot(),render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},terrain:vesperTrip.scene.getObjectByName('Vesper survey terrain').geometry.getAttribute('vesperBlend').count});
 `});});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.click('#play');await page.evaluate(()=>window.__vmEnter());await page.waitForFunction(()=>window.__vmRead().state.rocks.status==='ready'&&window.__vmRead().state.shelter.loaded);await fs.mkdir('.local/qa',{recursive:true});
 const evidence=[];
 for(const quality of ['low','high']){
  await page.selectOption('#quality',{value:quality}, {force:true});
  for(const [name,x,z] of [['frost',-23,6],['fissure',20,-14]]){
   await page.evaluate(([x,z])=>window.__vmSite(x,z),[x,z]);await page.waitForFunction(q=>window.__vmRead().state.ground.bump===(q==='high'),quality);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const e=await page.evaluate(()=>window.__vmRead());assert.equal(e.terrain,9409);assert.equal(e.state.ground.cpuBytes,65536);assert.equal(e.state.colliders,56);evidence.push({quality,site:name,...e.state.ground,render:e.render});await page.screenshot({path:'.local/qa/vesper-material-'+name+'-'+quality+'.png'});
  }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({evidence,errors,limits:'640x760 Chromium/SwiftShader, direct-entry/site fixtures. No physical-device or orbital gameplay replay.'}));
}finally{await browser.close();}
