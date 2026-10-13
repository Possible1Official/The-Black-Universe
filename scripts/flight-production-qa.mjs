import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:false,power:{profile:'balanced',heat:24,tripped:false}})));
 await page.goto('http://localhost:4173/');await page.waitForSelector('canvas[data-ready="true"]');assert.equal(await page.evaluate(()=>typeof window.__erebus),'undefined');
 await page.getByText('Controls & settings',{exact:true}).click();await page.selectOption('#quality','low');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#play');
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>document.getElementById('interaction').textContent.includes('Launch survey shuttle'));await page.keyboard.up('KeyD');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>document.getElementById('flightStatus').textContent.includes('Approach ring'));await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>parseFloat(document.getElementById('navDistance').textContent)<85,{},{timeout:120000});await page.keyboard.up('KeyW');await page.keyboard.down('Space');
 await page.waitForFunction(()=>parseFloat(document.getElementById('flightTelemetry').textContent)<10);await page.keyboard.up('Space');
 await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/kestrel-approach.png'});
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>{const t=document.getElementById('flightTelemetry').textContent;const alt=parseFloat(t.split(' ')[2]);return t.startsWith('RADAR ALT')&&alt<35&&alt>4;});
 assert.match(await page.locator('#flightStatus').textContent(),/GUIDED DESCENT/);assert.equal(await page.locator('#flightHud').isVisible(),true);
 await page.screenshot({path:'.local/qa/descent-production.png'});
 await page.waitForFunction(()=>document.getElementById('location').textContent.includes('SURVEY SITE'));assert.equal(await page.locator('#flightHud').isVisible(),false);
 await page.screenshot({path:'.local/qa/kestrel-production-landed.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({productionHooks:false,actualWalking:true,actualPiloting:true,visibleDescent:true,landed:true,errors}));
}finally{await browser.close();}
