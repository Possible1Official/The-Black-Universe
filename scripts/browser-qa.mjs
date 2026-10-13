import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
const page=await browser.newPage({viewport:{width:960,height:600}});
page.setDefaultTimeout(45000);
await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(()=>setTimeout(()=>callback(performance.now()),100));});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]',{timeout:60000});
await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/intro.png'});
// Pointer lock is not supplied by headless contexts: emulate its successful state to test keyboard gameplay.
async function installPointerLock(){await page.evaluate(()=>{Object.defineProperty(document,'pointerLockElement',{get:()=>document.querySelector('canvas'),configurable:true});HTMLCanvasElement.prototype.requestPointerLock=async()=>{};document.exitPointerLock=()=>{};});}
await installPointerLock();
await page.click('summary');await page.selectOption('#quality','high');
await page.waitForFunction(()=>window.__erebus.snapshot().render.lighting.visibleSources===9&&window.__erebus.snapshot().render.lighting.visibleProxies===0);
await page.selectOption('#quality','low');
await page.waitForFunction(()=>window.__erebus.snapshot().render.lighting.visibleSources===0&&window.__erebus.snapshot().render.lighting.visibleProxies===4);
await page.click('#play');
await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='navigation');assert.equal(await page.locator('#navigationHud').isVisible(),true);
await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().position.z<13.5,{},{timeout:30000});await page.keyboard.up('KeyW');
let s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.position.z<14,'keyboard moves player forward');assert.ok(s.position.y>.8&&s.position.y<1,'floor supports player');
// Low render rates must consume several fixed physics steps, never one large step.
const pacing=await page.evaluate(()=>window.__erebus.snapshot().timing);assert.ok(pacing.lastMotionSteps<=15);
await page.waitForFunction(()=>window.__erebus.snapshot().timing.lastMotionSteps>3,{},{timeout:30000});
await page.keyboard.press('Space');await page.waitForFunction(()=>window.__erebus.snapshot().position.y>1.3,{},{timeout:15000});
await page.waitForFunction(()=>window.__erebus.snapshot().position.y<1,{},{timeout:15000});
await page.click('#menu');const paused=await page.evaluate(()=>window.__erebus.snapshot());await page.waitForTimeout(1000);
assert.equal((await page.evaluate(()=>window.__erebus.snapshot().timing.motionStepsTotal)),paused.timing.motionStepsTotal,'pause consumes no movement time');
await page.click('#play');await page.waitForTimeout(500);
assert.ok(Math.hypot((await page.evaluate(()=>window.__erebus.snapshot().position.x))-paused.position.x,(await page.evaluate(()=>window.__erebus.snapshot().position.z))-paused.position.z)<.02,'resume discards cached movement');
console.log('Checked: bounded fixed-step catch-up, jump/landing, paused clock and clean resume');
await page.evaluate(()=>window.__erebus.place(0,-14));await page.keyboard.down('KeyW');await page.waitForTimeout(1800);await page.keyboard.up('KeyW');s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.position.z> -15.6,'forward window collision holds');
async function interact(name){await page.evaluate(name=>window.__erebus.target(name),name);await page.waitForFunction(name=>window.__erebus.snapshot().nearest===name,name,{timeout:30000});assert.equal(await page.evaluate(()=>window.__erebus.snapshot().nearest),name);await page.keyboard.press('KeyE');await page.waitForTimeout(300);console.log('Checked:',name);}
// Crew walks through physics, yields to the visitor, and has a solid body.
const patrolStart=await page.evaluate(()=>window.__erebus.snapshot().crew[0]);
await page.waitForFunction(before=>Math.abs(window.__erebus.snapshot().crew[0].position.z-before.position.z)>.2,patrolStart,{timeout:30000});
await page.evaluate(()=>window.__erebus.target('Speak with VEGA'));
await page.waitForFunction(()=>window.__erebus.snapshot().crew[0].mode==='attending',{},{timeout:30000});
const stopped=await page.evaluate(()=>window.__erebus.snapshot().crew[0]);
await page.waitForTimeout(400);
const stoppedLater=await page.evaluate(()=>window.__erebus.snapshot().crew[0]);
assert.ok(Math.hypot(stopped.position.x-stoppedLater.position.x,stopped.position.z-stoppedLater.position.z)<.02,'crew yields without drifting');
await page.keyboard.down('KeyW');await page.waitForFunction(()=>{const s=window.__erebus.snapshot();return Math.hypot(s.position.x-s.crew[0].position.x,s.position.z-s.crew[0].position.z)<.7;},{},{timeout:30000});
await page.waitForTimeout(400);await page.keyboard.up('KeyW');
const contact=await page.evaluate(()=>window.__erebus.snapshot());
assert.ok(Math.hypot(contact.position.x-contact.crew[0].position.x,contact.position.z-contact.crew[0].position.z)>.5,'crew body blocks player');
await interact('Speak with VEGA');assert.equal(await page.locator('#dialogue').isVisible(),true);
await page.screenshot({path:'.local/qa/crew-dialogue.png'});await page.click('#closeDialogue');
console.log('Checked: physical crew patrol, yielding, body collision and conversation');
// Access-panel consoles used to be missing from the collider list.
await page.evaluate(()=>window.__erebus.place(-10,4.85));await page.keyboard.down('KeyW');
await page.waitForFunction(()=>window.__erebus.snapshot().position.z<4.15,{},{timeout:30000});
await page.waitForTimeout(400);await page.keyboard.up('KeyW');
assert.ok((await page.evaluate(()=>window.__erebus.snapshot())).position.z>3.95,'access console blocks passage through its mesh');
console.log('Checked: access console collision');
await interact('Initialize universe forge');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.forged,false);
await interact('Restore navigation relay');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.waypoint==='Port-panel');
// Occupied-door safety release is reached sooner with corrected movement timing.
await page.evaluate(()=>window.__erebus.place(-9,6,Math.PI/2));assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).doors[0].open,false);
await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().doors[0].open,{},{timeout:30000});await page.keyboard.up('KeyW');
assert.ok((await page.evaluate(()=>window.__erebus.snapshot())).position.y>.8,'safety approach stays grounded');
// Close from the unoccupied panel, then explicitly reopen with E.
await page.evaluate(()=>window.__erebus.place(0,-9));await interact('Toggle bulkhead');await page.waitForFunction(()=>!window.__erebus.snapshot().doors[0].open&&window.__erebus.snapshot().doors[0].height<1.7,{},{timeout:30000});
await interact('Toggle bulkhead');await page.waitForFunction(()=>window.__erebus.snapshot().doors[0].height>4,{},{timeout:30000});s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.doors[0].open&&s.doors[0].height>4,'bulkhead animates open');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.waypoint==='Port-enter');
await page.evaluate(()=>window.__erebus.place(0,-9));await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.waypoint==='Port-outside');
await page.evaluate(()=>window.__erebus.place(-9,6,Math.PI/2));await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().position.x< -11.6,{},{timeout:30000});await page.keyboard.up('KeyW');s=await page.evaluate(()=>window.__erebus.snapshot());assert.ok(s.position.x< -11.5,'open doorway permits passage');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.waypoint==='engineering');
await interact('Restore engineering relay');await interact('Restore navigation relay');await interact('Restore observatory relay');
await interact('Initialize universe forge');s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.progress.forged,true);assert.equal(s.progress.relays.length,3);assert.equal(await page.locator('#objective').textContent(),'A universe begins');
await interact('Scan the new world');assert.equal(await page.locator('#navigationHud').isVisible(),false,'dialogue hides guidance');assert.match(await page.locator('#speech').textContent(),/NYSA/);await page.click('#closeDialogue');
// Deploy through actual science controls, walk over the terrain, survey and extract.
await interact('Scan the new world');assert.equal(await page.locator('#deployNysa').isEnabled(),true);
await page.click('#deployNysa');await page.waitForFunction(()=>window.__erebus.snapshot().onSurface);
await page.waitForFunction(()=>window.__erebus.snapshot().position.y<.95);
// Quality changes while away must not enable ship lights or restore stale flags on return.
await page.click('#menu');await page.selectOption('#quality','high');
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).surfaceMaterials.normalMap,true);
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).render.lighting.visibleSources,0);
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).render.lighting.visibleProxies,0);
await page.click('#play');
assert.match(await page.locator('#location').textContent(),/NYSA/);await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='sample');assert.equal(await page.locator('#navLabel').textContent(),'Luminous outcrop');const initialDistance=Number((await page.locator('#navDistance').textContent()).split(' m')[0]);
await page.screenshot({path:'.local/qa/nysa-landing.png'});console.log('Render sample: Nysa',JSON.stringify((await page.evaluate(()=>window.__erebus.snapshot())).render));
const landed=await page.evaluate(()=>window.__erebus.snapshot().position);
await page.keyboard.down('KeyW');await page.waitForFunction(z=>window.__erebus.snapshot().position.z<z-3,landed.z,{timeout:30000});await page.keyboard.up('KeyW');
assert.ok((await page.evaluate(()=>window.__erebus.snapshot().position.y))>0,'terrain supports moving capsule');assert.ok(Number((await page.locator('#navDistance').textContent()).split(' m')[0])<initialDistance,'sample distance decreases while approaching');
// Perimeter collision, then the real sample interaction (teleport is QA setup only).
await page.evaluate(()=>window.__erebus.place(430,0,-Math.PI/2));await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__erebus.snapshot().position.x>431.4,{},{timeout:30000});await page.waitForTimeout(500);await page.keyboard.up('KeyW');
assert.ok((await page.evaluate(()=>window.__erebus.snapshot().position.x))<431.8,'basalt perimeter blocks leaving survey site');
await interact('Survey luminous outcrop');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.surveyed,true);
assert.equal(await page.locator('#objective').textContent(),'Return to Erebus');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='extraction');assert.equal(await page.locator('#navLabel').textContent(),'Extraction beacon');await page.screenshot({path:'.local/qa/nysa-sample.png'});
await interact('Extract to Erebus');await page.waitForFunction(()=>!window.__erebus.snapshot().onSurface);
await page.waitForFunction(()=>window.__erebus.snapshot().render.lighting.visibleSources===9&&window.__erebus.snapshot().render.lighting.visibleProxies===0);
await page.click('#menu');await page.selectOption('#quality','low');await page.click('#play');
await page.waitForFunction(()=>window.__erebus.snapshot().render.lighting.visibleSources===0&&window.__erebus.snapshot().render.lighting.visibleProxies===4);
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).surfaceMaterials.normalMap,false);
console.log('Checked: High 9 / performance 4 / surface 0 light policy, surface quality change and extraction restore');
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.forged,true);
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.surveyed,true);
// Reloading from the surface starts safely aboard while preserving the sample.
await interact('Scan the new world');await page.click('#deployNysa');await page.click('#menu');
await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).onSurface,false);assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.surveyed,true);
await installPointerLock();await page.click('#play');
console.log('Checked: Nysa deployment, terrain walking, perimeter, sample, extraction and safe surface reload');
await page.evaluate(()=>window.__erebus.place(0,-5));await page.waitForTimeout(300);await page.screenshot({path:'.local/qa/bridge.png'});console.log('Render sample: bridge',JSON.stringify((await page.evaluate(()=>window.__erebus.snapshot())).render));
console.log('Checking reload');await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.progress.forged,true,'saved progression restores');
// Legacy completed saves migrate without overwriting the old release's save slot.
await page.evaluate(()=>{localStorage.removeItem('black-universe-v2');localStorage.setItem('black-universe-v1',JSON.stringify({version:1,relays:['engineering','navigation','observatory'],forged:true}));});
await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');
s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.progress.version,2);assert.equal(s.progress.forged,true);
await installPointerLock();await page.click('#play');await page.click('#menu');
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('black-universe-v1')).version),1);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('black-universe-v2')).version),2);
// Critical-state fixture: actual simulation crosses the trip threshold while playing.
await page.evaluate(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:false,power:{profile:'genesis',heat:94,tripped:false}})));
await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');
await installPointerLock();await page.click('#play');
await page.waitForFunction(()=>window.__erebus.snapshot().progress.power.tripped,{},{timeout:30000});
await page.waitForFunction(()=>document.getElementById('system').textContent==='CONTAINMENT TRIPPED');
assert.equal(await page.locator('#system').textContent(),'CONTAINMENT TRIPPED');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='diagnostics');
await interact('Initialize universe forge');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.forged,false);
await interact('Scan the new world');assert.equal(await page.locator('#expeditionPanel').isVisible(),false);await page.click('#closeDialogue');
await interact('Open engineering diagnostics');
assert.equal(await page.locator('#powerPanel').isVisible(),true);assert.equal(await page.locator('#resetContainment').isDisabled(),true);
await page.screenshot({path:'.local/qa/containment-trip.png'});
const hotState=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(hotState.reactorColor,0xff4c32);
await page.waitForFunction(()=>window.__erebus.snapshot().render.lighting.slots.some(s=>s.source===8&&s.color===0xff4c32&&s.intensity>0));
await page.click('[data-profile="cooling"]');
await page.waitForFunction(()=>window.__erebus.snapshot().progress.power.heat<=40,{},{timeout:60000});
assert.equal(await page.locator('#resetContainment').isEnabled(),true);
await page.click('#resetContainment');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.power.tripped,false);
await page.locator('[data-profile="genesis"]').focus();await page.keyboard.press('Space');await page.waitForTimeout(400);
assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.power.profile,'genesis','power profiles support keyboard activation');
assert.ok((await page.evaluate(()=>window.__erebus.snapshot())).habitatLight<80,'Genesis diverts habitat lighting');
await page.click('[data-profile="cooling"]');await page.click('#closeDialogue');
await interact('Initialize universe forge');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.forged,false,'cooling cannot power forge');
await interact('Open engineering diagnostics');await page.click('[data-profile="balanced"]');await page.screenshot({path:'.local/qa/power-balanced.png'});await page.click('#closeDialogue');
await interact('Initialize universe forge');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.forged,true,'recovered system can initialize genesis');
console.log('Checked: v1 migration, legacy rollback save, thermal trip, isolation, lighting diversion, cooling/reset and forge recovery');
await page.click('#menu'); // Freeze autosave before installing a corrupt-load fixture.
await page.evaluate(()=>localStorage.setItem('black-universe-v2','{bad'));console.log('Checking reload');await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');assert.equal((await page.evaluate(()=>window.__erebus.snapshot())).progress.relays.length,0,'corrupt save resets safely');
assert.deepEqual(errors,[],'no browser exceptions');
await page.close();console.log('Checking mobile');const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto('http://localhost:5173/?qa');await mobile.waitForSelector('canvas[data-ready="true"]');await mobile.click('summary');await mobile.selectOption('#quality','low');await mobile.click('#play');await mobile.screenshot({path:'.local/qa/mobile.png'});assert.equal(await mobile.locator('#touchAction').isVisible(),true);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile fits viewport');
// Pause before seeding so visibility/pause saving cannot overwrite the completed fixture.
await mobile.click('#menu');
// Seed completed progress so an accidental menu-reset click cannot hide behind fresh state.
await mobile.evaluate(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}})));
await mobile.reload({waitUntil:'domcontentloaded'});await mobile.waitForSelector('canvas[data-ready="true"]');assert.equal((await mobile.evaluate(()=>window.__erebus.snapshot())).progress.forged,true,'completed fixture loads');await mobile.click('summary');await mobile.click('#play');
const start=await mobile.evaluate(()=>window.__erebus.snapshot().position.z);
await mobile.touchscreen.tap(80,650); // Real touch device context.
const cdp=await mobile.context().newCDPSession(mobile);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:668}]});
await mobile.waitForFunction(z=>window.__erebus.snapshot().position.z<z-.25,start,{timeout:30000});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.ok((await mobile.evaluate(()=>window.__erebus.snapshot().position.z))<start-.25,'touch joystick moves player');
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:668}]});
await mobile.waitForFunction(()=>window.__erebus.snapshot().touchMove.y<0);
await mobile.evaluate(()=>document.getElementById('menu').click());
assert.deepEqual(await mobile.evaluate(()=>window.__erebus.snapshot().touchMove),{x:0,y:0});
assert.equal(await mobile.locator('#thumb').evaluate(e=>e.style.transform),'');
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await mobile.click('#play');
assert.equal((await mobile.evaluate(()=>window.__erebus.snapshot())).progress.forged,true,'joystick release across pause must not activate Reset');
const afterPause=await mobile.evaluate(()=>window.__erebus.snapshot().position.z);
await mobile.waitForTimeout(400);
assert.ok(Math.abs((await mobile.evaluate(()=>window.__erebus.snapshot().position.z))-afterPause)<.2,'resume does not keep stale touch motion');
console.log('Checked: held touch input clears on pause');
await mobile.evaluate(()=>window.__erebus.target('Open engineering diagnostics'));
await mobile.waitForFunction(()=>window.__erebus.snapshot().nearest==='Open engineering diagnostics');
await mobile.click('#touchAction');await mobile.click('[data-profile="cooling"]');
assert.equal((await mobile.evaluate(()=>window.__erebus.snapshot())).progress.power.profile,'cooling');
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await mobile.screenshot({path:'.local/qa/power-mobile.png'});await mobile.click('#closeDialogue');
console.log('Checked: mobile engineering power controls');
await mobile.evaluate(()=>window.__erebus.target('Scan the new world'));
await mobile.waitForFunction(()=>window.__erebus.snapshot().nearest==='Scan the new world');
await mobile.click('#touchAction');assert.equal(await mobile.locator('#deployNysa').isEnabled(),true);
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'surface controls fit mobile viewport');
await mobile.click('#deployNysa');await mobile.waitForFunction(()=>window.__erebus.snapshot().onSurface);
await mobile.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='sample');assert.equal(await mobile.locator('#navigationHud').isVisible(),true);
const surfaceStart=await mobile.evaluate(()=>window.__erebus.snapshot().position.z);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:668}]});
await mobile.waitForFunction(z=>window.__erebus.snapshot().position.z<z-.7,surfaceStart,{timeout:30000});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await mobile.evaluate(()=>window.__erebus.target('Survey luminous outcrop'));
await mobile.waitForFunction(()=>window.__erebus.snapshot().nearest==='Survey luminous outcrop');
await mobile.click('#touchAction');assert.equal((await mobile.evaluate(()=>window.__erebus.snapshot())).progress.surveyed,true);
await mobile.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='extraction');await mobile.screenshot({path:'.local/qa/nysa-mobile.png'});
await mobile.evaluate(()=>window.__erebus.target('Extract to Erebus'));
await mobile.waitForFunction(()=>window.__erebus.snapshot().nearest==='Extract to Erebus');
await mobile.click('#touchAction');await mobile.waitForFunction(()=>!window.__erebus.snapshot().onSurface);
assert.equal((await mobile.evaluate(()=>window.__erebus.snapshot())).progress.surveyed,true);
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
console.log('Checked: mobile surface deployment, real touch walking, sample and extraction');
for(const viewport of [{width:390,height:640},{width:844,height:390}]){
  await mobile.setViewportSize(viewport);await mobile.waitForTimeout(500);
  const boxes=await mobile.evaluate(()=>Object.fromEntries(['navigationHud','stick','touchAction','mission'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,right:r.right,bottom:r.bottom}];})));
  const guide=boxes.navigationHud;assert.ok(guide.x>=0&&guide.y>=0&&guide.right<=viewport.width&&guide.bottom<=viewport.height,'guidance fits small viewport');
  const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
  assert.equal(overlaps(guide,boxes.stick),false,'guide clears joystick');assert.equal(overlaps(guide,boxes.touchAction),false,'guide clears action button');
  await mobile.screenshot({path:`.local/qa/navigation-${viewport.width}x${viewport.height}.png`});
}
console.log('Checked: mission compass/distance, doorway guidance, sample-to-extraction, modal visibility and compact mobile layout');
assert.deepEqual(errors,[],'no desktop or mobile browser exceptions');

console.log('PASS: keyboard movement, floor/window/door collisions, open passage, forge gating, all relays, genesis, scan dialogue, save reload, corrupt save, Nysa terrain/sample/extraction/reload, desktop rendering, mobile layout and touch UI.');

} finally { await browser.close(); }
