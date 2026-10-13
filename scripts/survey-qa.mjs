import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {flyLeg} from './flight-qa-helpers.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('black-universe-v2'))localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,power:{profile:'balanced',heat:24,tripped:false}}));});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
 assert.equal(await page.locator('#fieldLog').textContent(),'FIELD LOG / J · 0/2');await page.keyboard.press('KeyJ');assert.equal(await page.locator('#surveyPanel').isVisible(),true);await page.click('#closeDialogue');
 await page.evaluate(()=>window.__erebus.target('Launch survey shuttle'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Launch survey shuttle');await page.keyboard.press('KeyE');await flyLeg(page);
 await fs.mkdir('.local/qa',{recursive:true});const positions=[];
 for(const site of [{id:'arch',name:'resonance arch',x:363,z:-32},{id:'weather',name:'ridge weather station',x:440,z:-39}]){
  await page.click('#fieldLog');assert.equal(await page.locator('#surveyPanel').isVisible(),true);
  const paused=await page.evaluate(()=>window.__erebus.snapshot().position);await page.waitForTimeout(400);assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().position),paused);
  await page.click(`[data-track="${site.id}"]`);await page.waitForFunction(id=>document.getElementById('navigationHud').dataset.destination===`field-${id}`,site.id);
  // Walking setup only. Movement into scanner range uses normal controls.
  await page.evaluate(s=>window.__erebus.place(s.x,s.z+12),site);await page.waitForTimeout(300);await page.screenshot({path:`.local/qa/survey-${site.id}-overview.png`});await page.keyboard.down('KeyW');
  await page.waitForFunction(z=>window.__erebus.snapshot().position.z<z+3.15,site.z,{timeout:30000});await page.keyboard.up('KeyW');
  await page.waitForFunction(name=>window.__erebus.snapshot().nearest===`Scan ${name}`,site.name);
  positions.push(await page.evaluate(()=>window.__erebus.snapshot().position));await page.screenshot({path:`.local/qa/survey-${site.id}.png`});
  await page.keyboard.press('KeyE');assert.equal(await page.locator('#dialogue').isVisible(),true);assert.match(await page.locator('#speech').textContent(),site.id==='arch'?/17.4 Hz/:/0.83 bar/);
  const progress=await page.evaluate(()=>window.__erebus.snapshot().progress);assert.ok(progress.fieldScans.includes(site.id));assert.equal(progress.surveyed,true);
  await page.click('#closeDialogue');await page.waitForFunction(()=>document.getElementById('navigationHud').dataset.destination==='extraction');
 }
 assert.ok(positions[0].x<368&&positions[1].x>432,'both destinations are beyond the previous site');assert.ok(positions[1].y>2,'ridge height supports walking');
 await page.click('#menu');await page.getByText('Controls & settings',{exact:true}).click();await page.selectOption('#quality','high');await page.selectOption('#quality','low');await page.getByText('Controls & settings',{exact:true}).click();await page.click('#play');
 for(const viewport of [{width:390,height:844},{width:667,height:375}]){
  await page.setViewportSize(viewport);await page.waitForFunction(width=>innerWidth===width,viewport.width);await page.click('#fieldLog');assert.equal(await page.locator('#surveyPanel').isVisible(),true);assert.equal(await page.locator('#dialogue').evaluate(e=>e.scrollTop),0);
  assert.equal(await page.locator('[data-track="arch"]').isDisabled(),true);assert.equal(await page.locator('[data-track="weather"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const box=await page.locator('#dialogue').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+.1&&box.y+box.height<=viewport.height+.1,JSON.stringify({viewport,box}));
  await page.screenshot({path:`.local/qa/survey-log-${viewport.width}.png`});await page.click('#trackMission');
 }
 await page.setViewportSize({width:960,height:600});assert.equal(await page.locator('#fieldLog').textContent(),'FIELD LOG / J · 2/2');
 await page.evaluate(()=>window.__erebus.target('Board shuttle for Erebus'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Board shuttle for Erebus');await page.keyboard.press('KeyE');await flyLeg(page);
 assert.equal(await page.evaluate(()=>window.__erebus.snapshot().shipHidden),false);await page.click('#fieldLog');assert.equal(await page.locator('[data-track="arch"]').isDisabled(),true);await page.click('#closeDialogue');
 await page.reload();await page.waitForSelector('canvas[data-ready="true"]');assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().progress.fieldScans),['arch','weather']);assert.equal(await page.evaluate(()=>window.__erebus.snapshot().onSurface),false);
 await page.getByText('Controls & settings',{exact:true}).click();await page.click('#reset');assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().progress.fieldScans),[]);await page.reload();await page.waitForSelector('canvas[data-ready="true"]');assert.deepEqual(await page.evaluate(()=>window.__erebus.snapshot().progress.fieldScans),[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({positions,scans:2,fieldLog:true,dialoguePause:true,qualitySwitch:true,mobileLayouts:true,docked:true,reloadAndReset:true,errors}));
}finally{await browser.close();}
