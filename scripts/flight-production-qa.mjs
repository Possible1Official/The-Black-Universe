import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const faultMode=process.env.ASSET_FAILURE_QA==='1',assetRequests={craft:0,station:0},assetWarnings=[];
 if(faultMode){
  page.on('console',m=>{if(/asset unavailable/.test(m.text()))assetWarnings.push(m.text());});
  for(const kind of ['craft','station'])await page.route(`**/*${kind}*.glb`,route=>++assetRequests[kind]===1?route.abort('failed'):route.continue());
 }
 await page.addInitScript(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:false,power:{profile:'balanced',heat:24,tripped:false}})));
 await page.addInitScript(()=>{localStorage.setItem('erebus-information','visible');localStorage.setItem('erebus-camera','third');});
 await page.goto('http://localhost:4173/');await page.waitForSelector('canvas[data-ready="true"]');assert.equal(await page.evaluate(()=>typeof window.__erebus),'undefined');
 await page.getByText('Controls & settings',{exact:true}).click();await page.selectOption('#quality','low');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#play');
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>document.getElementById('interaction').textContent.includes('Launch survey shuttle'));await page.keyboard.up('KeyD');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>document.getElementById('flightStatus').textContent.includes('Approach ring'));await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>parseFloat(document.getElementById('navDistance').textContent)<85,{},{timeout:120000});await page.waitForFunction(()=>document.getElementById('flightHud').dataset.approach==='brake');assert.equal(await page.locator('#velocityMarker').isVisible(),true);await page.keyboard.up('KeyW');await page.keyboard.down('Space');
 await page.waitForFunction(()=>parseFloat(document.getElementById('flightTelemetry').textContent)<10);await page.keyboard.up('Space');
 await page.waitForFunction(()=>document.getElementById('flightHud').dataset.approach==='ready');await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/kestrel-approach.png'});
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>{const t=document.getElementById('flightTelemetry').textContent;const alt=parseFloat(t.split(' ')[2]);return t.startsWith('RADAR ALT')&&alt<35&&alt>4;});
 assert.match(await page.locator('#flightStatus').textContent(),/GUIDED DESCENT/);assert.equal(await page.locator('#flightHud').isVisible(),true);
 await page.screenshot({path:'.local/qa/descent-production.png'});
 await page.waitForFunction(()=>document.getElementById('location').textContent.includes('SURVEY SITE'));assert.equal(await page.locator('#flightHud').isVisible(),false);assert.equal(await page.locator('#velocityMarker').isVisible(),false);
 await page.screenshot({path:'.local/qa/kestrel-production-landed.png'});
 await page.keyboard.press('KeyJ');assert.equal(await page.locator('#surveyPanel').isVisible(),true);assert.equal(await page.locator('#dialogue').evaluate(e=>e.scrollTop),0);assert.equal(await page.locator('[data-track="arch"]').isEnabled(),true);
 await page.click('[data-track="arch"]');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='field-arch');assert.equal(await page.locator('#navLabel').textContent(),'Resonance arch');
 await page.keyboard.press('KeyJ');assert.equal(await page.locator('#dialogue').evaluate(e=>e.scrollTop),0);await page.click('#trackMission');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='sample');
 // Actual on-foot hatch approach, return piloting and bay ingress, without pose hooks.
 await page.keyboard.down('KeyS');await page.waitForFunction(()=>parseFloat(document.getElementById('coordinates').textContent.split(' Z ')[1])>24);await page.keyboard.up('KeyS');
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>document.getElementById('interaction').textContent.includes('Board shuttle for Erebus'));await page.keyboard.up('KeyD');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>document.getElementById('flightStatus').textContent.includes('Approach ring'));await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>parseFloat(document.getElementById('navDistance').textContent)<85,{},{timeout:120000});await page.keyboard.up('KeyW');await page.keyboard.down('Space');await page.waitForFunction(()=>parseFloat(document.getElementById('flightTelemetry').textContent)<10);await page.keyboard.up('Space');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>document.getElementById('flightStatus').textContent.includes('GUIDED BAY ALIGNMENT'));
 await page.waitForFunction(()=>parseFloat(document.getElementById('navDistance').textContent.split(' ')[1])>65&&document.getElementById('flightStatus').textContent.includes('GUIDED BAY ALIGNMENT'));
 assert.match(await page.locator('#flightTelemetry').textContent(),/GUIDED CAPTURE/);await page.screenshot({path:'.local/qa/capture-production-ingress.png'});
 await page.waitForFunction(()=>document.getElementById('location').textContent.includes('HABITAT CONCOURSE'));assert.equal(await page.locator('#flightHud').isVisible(),false);assert.deepEqual(errors,[]);
 if(faultMode){assert.deepEqual(assetRequests,{craft:2,station:2});assert.equal(assetWarnings.length,2);}
 console.log(JSON.stringify({assetFailureRecovery:faultMode,assetRequests: faultMode?assetRequests:undefined,productionHooks:false,actualWalking:true,actualPiloting:true,visibleDescent:true,landed:true,keyboardFieldLog:true,fieldTracking:true,missionGuidanceRestore:true,actualHatchBoarding:true,returnPiloting:true,guidedBayIngress:true,docked:true,errors}));
}finally{await browser.close();}
