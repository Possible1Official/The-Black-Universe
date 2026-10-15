// Asset-focused browser fixture: actual game decoder/loader, Nysa light/exposure.
// Does not exercise unrelated flight or certify hardware/mobile performance.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__rover_material_qa',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0;background:#678b9a}canvas{display:block}</style><script type="module">
 import * as THREE from '/node_modules/three/build/three.module.js';
 import {requestedAsset} from '/src/requested-assets.ts';
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,720);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x678b9a);const hemi=new THREE.HemisphereLight(0xa8c4da,0x10151f,1.1);scene.add(hemi);const sun=new THREE.DirectionalLight(0xcbe6ff,2.5);sun.position.set(30,50,-70);scene.add(sun);
 const rover=(await requestedAsset('rover')).scene;scene.add(rover);
 const camera=new THREE.PerspectiveCamera(40,960/720,.1,100);const wheels=['FrontLeft','FrontRight','RearLeft','RearRight'].map(s=>rover.getObjectByName('Rover_Wheel_'+s));
 const bounds=new THREE.Box3().setFromObject(rover),materials=[];rover.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!materials.includes(m))materials.push(m);});
 const albedo=materials[0].map.image,canvas=document.createElement('canvas');canvas.width=albedo.width;canvas.height=albedo.height;const ctx=canvas.getContext('2d');ctx.drawImage(albedo,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let green=0,dark=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+1]>pixels[i]*1.2&&pixels[i+1]>pixels[i+2]*1.05&&pixels[i+1]>45)green++;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])<45)dark++;}
 window.fixture={inspect:()=>({albedoPixels:{green,dark},size:bounds.getSize(new THREE.Vector3()).toArray(),wheels:wheels.length,materials:materials.map(m=>({name:m.name,map:!!m.map,normal:!!m.normalMap,roughness:!!m.roughnessMap,emission:!!m.emissiveMap,colorSpace:m.map?.colorSpace,normalSpace:m.normalMap?.colorSpace,normalScale:m.normalScale.toArray()}))}),view:(back=false,dusk=false,roll=0)=>{camera.position.set(back?-4.8:4.8,3.5,back?5.6:-5.6);camera.lookAt(0,1,0);sun.intensity=dusk?.4:2.5;hemi.intensity=dusk?.35:1.1;for(const w of wheels)w.rotation.x=roll;renderer.render(scene,camera);}};
 fixture.view();window.ready=true;
 </script>`}));
 await page.goto('http://localhost:5173/__rover_material_qa');await page.waitForFunction(()=>window.ready,{},{timeout:90000});
 const result=await page.evaluate(()=>fixture.inspect());assert.equal(result.wheels,4);assert.ok(result.albedoPixels.green>200&&result.albedoPixels.dark>1000,'source green panels and dark rubber must survive');assert.ok(result.size[0]<=2.11&&Math.abs(result.size[2]-3.6)<.01);
 for(const m of result.materials){assert.ok(m.map&&m.normal&&m.roughness&&m.emission);assert.equal(m.colorSpace,'srgb');assert.equal(m.normalSpace,'');assert.ok(m.normalScale.every(x=>Math.abs(Math.abs(x)-.65)<.001));}
 await fs.mkdir('.local/qa',{recursive:true});
 for(const [name,back,dusk,roll] of [['front',false,false,0],['rear',true,false,.8],['dusk',false,true,1.6]]){await page.evaluate(([b,d,r])=>fixture.view(b,d,r),[back,dusk,roll]);await page.screenshot({path:'.local/qa/rover-material-'+name+'.png'});}
 await page.close();
 const game=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});game.setDefaultTimeout(90000);game.on('pageerror',e=>errors.push(e.message));
 await game.addInitScript(()=>{localStorage.setItem('erebus-camera','third');localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}}));});
 // Test-only source-response instrumentation skips unrelated flight. No hooks
 // or altered application source are included in the release.
 await game.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`
window.__roverSetup=async()=>{await attachRequested('rover',vehicleVisuals.get('rover'));travel(true);};window.__roverWheels=()=>['FrontLeft','FrontRight','RearLeft','RearRight'].map(s=>vehicleVisuals.get('rover').getObjectByName('Rover_Wheel_'+s).rotation.x);`});});
 await game.goto('http://localhost:5173/?qa');await game.waitForSelector('canvas[data-ready=true]');await game.click('#play');await game.evaluate(()=>window.__roverSetup());await game.waitForFunction(()=>window.__erebus.snapshot().onSurface&&window.__erebus.snapshot().authored.vehicles.includes('rover'));
 await game.evaluate(()=>window.__erebus.target('Drive Sci-fi Rover'));await game.waitForFunction(()=>window.__erebus.snapshot().nearest==='Drive Sci-fi Rover');await game.keyboard.press('KeyE');await game.waitForFunction(()=>window.__erebus.snapshot().riding==='rover');
 await game.locator('#vehicleSpeed').evaluate(e=>{e.value='35';e.dispatchEvent(new Event('input',{bubbles:true}));});await game.waitForFunction(()=>window.__erebus.snapshot().vehicles.find(v=>v.kind==='rover').distance>2);
 assert.ok((await game.evaluate(()=>window.__roverWheels())).every(x=>Math.abs(x)>.1));await game.keyboard.down('Space');await game.waitForFunction(()=>window.__erebus.snapshot().vehicles.find(v=>v.kind==='rover').speed<.2);await game.keyboard.up('Space');
 await game.screenshot({path:'.local/qa/rover-material-game-mobile.png'});await game.keyboard.press('KeyE');await game.waitForFunction(()=>window.__erebus.snapshot().riding===null);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({actualGameLoader:true,mobileSurfaceDriveBrakeDismount:true,actualDistanceWheels:true,nysaLightingFixture:true,frontRearDusk:true,textureBindings:true,wheelPivots:true,...result,errors}));
}finally{await browser.close();}
