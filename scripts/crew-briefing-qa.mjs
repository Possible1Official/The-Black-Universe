import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('black-universe-v2'))localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,surveyed:true,fieldScans:['arch'],supplies:{coolant:0,cacheClaimed:true},power:{profile:'balanced',heat:24,tripped:false}}));});
 await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');console.log('Entered');
 async function officer(name){await page.evaluate(name=>window.__erebus.target('Speak with '+name),name);await page.waitForFunction(name=>window.__erebus.snapshot().nearest==='Speak with '+name,name,{timeout:30000});await page.click('#touchAction');}
 console.log('Vega');await officer('VEGA');assert.match(await page.locator('#speech').innerText(),/weather station is still unscanned/);
 await page.click('[data-briefing="survey"]');assert.match(await page.locator('#speech').innerText(),/1\/2.*17.4 Hz/);assert.ok(!(await page.locator('#speech').innerText()).includes('0.83 bar'));assert.equal(await page.locator('[data-briefing="survey"]').getAttribute('aria-pressed'),'true');
 for(const size of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);for(const button of await page.locator('#crewPanel button').all()){await button.scrollIntoViewIfNeeded();const r=await button.boundingBox();assert.ok(r&&r.width>=44&&r.height>=44&&r.x>=0&&r.x+r.width<=size.width&&r.y>=0&&r.y+r.height<=size.height);}await page.locator('#closeDialogue').scrollIntoViewIfNeeded();const r=await page.locator('#closeDialogue').boundingBox();assert.ok(r&&r.y+r.height<=size.height);}
 await page.setViewportSize({width:960,height:600});await page.click('[data-briefing="systems"]');assert.match(await page.locator('#speech').innerText(),/BALANCED.*reserve 0\/2.*already recovered/);
 await fs.mkdir('.local/qa',{recursive:true});await page.screenshot({path:'.local/qa/crew-briefing.png'});
 await page.click('#closeDialogue');assert.equal(await page.locator('#crewPanel').isVisible(),false);
 console.log('Ion');await officer('ION');assert.match(await page.locator('#speech').innerText(),/Genesis is stable.*BALANCED/);await page.click('#closeDialogue');
 await page.evaluate(()=>window.__erebus.target('Scan the new world'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Scan the new world');await page.click('#touchAction');assert.equal(await page.locator('#crewPanel').isVisible(),false);await page.click('#closeDialogue');
 await page.click('#menu');await page.reload();await page.waitForSelector('canvas[data-ready="true"]');const p=await page.evaluate(()=>window.__erebus.snapshot().progress);assert.deepEqual(p.fieldScans,['arch']);assert.equal(p.supplies.coolant,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({contextualMission:true,recordedReadingsOnly:true,actualSystems:true,bothOfficers:true,portraitLandscape:true,modalIsolation:true,saveReload:true,errors}));
}finally{await browser.close();}
