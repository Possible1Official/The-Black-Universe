import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:640,height:480}});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}})));
 const hooks=`
 window.__spaceSetup=mode=>{window.__spaceFreeze=true;active=false;clearInput();if(mode==='surface'){travel(true);flight=null;return;}setSurfaceView(false);onSurface=false;flight=mode==='flight'?startRunwayFlight():null;camera.position.set(0,1.46,-49);camera.lookAt(new THREE.Vector3(...FORGE_CENTER));camera.updateMatrixWorld();};
 window.__spaceRead=()=>({frame:window.__spaceFrame??0,parent:sharedSpace.root.parent===flightWorld.scene?'flight':'station',visible:sharedSpace.root.visible,root:sharedSpace.root.uuid,forge:forge.uuid,core:forgeLight.uuid,geometry:forgeLight.geometry.uuid,material:forgeLight.material.uuid,map:planetMat.map.uuid,coreColor:forgeLight.material.color.toArray(),projected:forge.getWorldPosition(new THREE.Vector3()).project(camera).toArray(),ring:rings[0].quaternion.toArray(),clouds:clouds.rotation.y,planetVisible:planet.visible});`;
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();const body=(await response.text()).replace(/clock.getDelta\(\)/g,'(window.__spaceFreeze?0:clock.getDelta())').replace(/sharedSpace\.present\(renderPass\.scene,\s*camera\.position\);/,'sharedSpace.present(renderPass.scene,camera.position);window.__spaceFrame=(window.__spaceFrame??0)+1;')+hooks;assert.ok(body.includes('window.__spaceFrame=('),'render-boundary fixture injection');await route.fulfill({response,body});});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready=true]');await page.locator('#overlay').evaluate(e=>e.style.visibility='hidden');await fs.mkdir('.local/qa',{recursive:true});
 const records=[];
 for(const mode of ['station','flight','surface','station']){
  const frame=await page.evaluate(()=>window.__spaceRead().frame);await page.evaluate(m=>window.__spaceSetup(m),mode);await page.waitForFunction(n=>window.__spaceRead().frame>n,frame);const record=await page.evaluate(()=>window.__spaceRead());records.push({mode,...record});
  if(mode!=='surface')await page.screenshot({path:'.local/qa/shared-space-'+mode+'.png'});
 }
 const [a,b,s,r]=records;
 for(const key of ['root','forge','core','geometry','material','map']){assert.equal(a[key],b[key]);assert.equal(a[key],r[key]);}
 assert.equal(a.parent,'station');assert.equal(b.parent,'flight');assert.equal(s.visible,false);assert.equal(r.visible,true);assert.deepEqual(a.projected,b.projected);assert.deepEqual(a.coreColor,b.coreColor);assert.deepEqual(a.ring,b.ring);assert.equal(a.clouds,b.clouds);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({sameObjectsAcrossHandoff:true,projectionPreserved:true,animationPowerPreserved:true,surfaceHideRestore:true,records,errors,limits:'paused render-boundary fixture; not an unchanged full flight/mission replay or hardware FPS measurement'}));
}finally{await browser.close();}
