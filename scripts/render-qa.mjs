import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(45000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
 await page.evaluate(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}})));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');await page.click('#play');
 const samples=[];
 for(const [name,x,z] of [['bridge',0,-5],['concourse',0,16],['engineering',-16,11],['observatory',16,11]]){
   await page.evaluate(({x,z})=>window.__erebus.place(x,z),{x,z});await page.waitForTimeout(600);
   const sample=await page.evaluate(()=>({render:window.__erebus.snapshot().render,fps:document.querySelector('canvas').dataset.fps}));samples.push({name,...sample});
   if(process.argv[3])await page.screenshot({path:`${process.argv[3]}/${name}.png`});
 }
 const result={viewport:'960x600',mode:'performance',samples,errors};console.log(JSON.stringify(result));if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2));
}finally{await browser.close();}
