// Verify the built game's fingerprinted GLB and native WebP decoder, without dev hooks.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const report=JSON.parse(await fs.readFile('public/assets/crew/optimization.json','utf8'));
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:640,height:400},isMobile:true,hasTouch:true});page.setDefaultTimeout(60000);
  const errors=[],warnings=[],models=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type())&&/Crew asset|GLTFLoader/i.test(m.text()))warnings.push(m.text());});
  page.on('request',r=>{if(/\/ely[^/]*\.glb/.test(r.url()))models.push(r.url());});
  const modelResponse=page.waitForResponse(r=>/\/ely-[^/]+\.glb/.test(r.url()));
  await page.goto('http://localhost:4173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
  await page.getByText('Controls & settings',{exact:true}).click();await page.selectOption('#quality','low');
  await page.getByText('Controls & settings',{exact:true}).click();await page.click('#play');
  const response=await modelResponse,model=await response.body();assert.equal(response.status(),200);assert.equal(model.length,report.output_bytes);
  assert.equal(createHash('sha256').update(model).digest('hex'),report.output_sha256);
  const length=model.readUInt32LE(12),json=JSON.parse(model.subarray(20,20+length).toString()),bin=model.subarray(28+length);
  const images=json.images.map(image=>{const view=json.bufferViews[image.bufferView];return Array.from(bin.subarray(view.byteOffset,view.byteOffset+view.byteLength));});
  const decoded=await page.evaluate(async images=>Promise.all(images.map(async bytes=>{
    const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/webp'}));
    const result={width:bitmap.width,height:bitmap.height};bitmap.close();return result;
  })),images);
  assert.ok(decoded.every(i=>i.width===1024&&i.height===1024));
  await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>typeof window.__erebus),'undefined');
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.equal(models.length,1);
  assert.equal(await page.locator('#navigationHud').isVisible(),true);
  console.log(JSON.stringify({url:new URL(response.url()).pathname,modelBytes:model.length,decoded,requests:models.length,errors,warnings,productionHooks:false}));
}finally{await browser.close();}
