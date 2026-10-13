import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
  await page.evaluate(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}})));
  await page.reload();await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
  await page.evaluate(()=>window.__erebus.target('Scan the new world'));await page.waitForFunction(()=>window.__erebus.snapshot().nearest==='Scan the new world');
  await page.keyboard.press('KeyE');await page.click('#deployNysa');await page.waitForFunction(()=>window.__erebus.snapshot().onSurface);
  const samples=[];
  for(const quality of ['low','high','low']){
    await page.click('#menu');await page.selectOption('#quality',quality,{force:true});await page.click('#play');
    for(const [name,x,z,yaw] of [['landing',400,20,0],['outcrop',406,-3,-Math.PI/8]]){
      await page.evaluate(({x,z,yaw})=>window.__erebus.place(x,z,yaw),{x,z,yaw});await page.waitForTimeout(700);
      const s=await page.evaluate(()=>window.__erebus.snapshot());assert.equal(s.onSurface,true);assert.equal(s.render.lighting.visibleSources+s.render.lighting.visibleProxies,0);
      assert.equal(s.surfaceMaterials.albedo,true);assert.equal(s.surfaceMaterials.normalMap,quality==='high');assert.equal(s.surfaceMaterials.roughnessMap,quality==='high');assert.equal(s.surfaceMaterials.cpuBytes,196608);
      samples.push({quality,name,render:s.render,materials:s.surfaceMaterials});
      if(process.argv[3])await page.screenshot({path:`${process.argv[3]}/${quality}-${name}.png`});
    }
  }
  assert.deepEqual(errors,[]);const result={viewport:'960x600',samples,errors};console.log(JSON.stringify(result));if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2));
}finally{await browser.close();}
