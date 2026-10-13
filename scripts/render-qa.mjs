import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const high=process.argv[4]==='high';
const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},isMobile:true,hasTouch:true});page.setDefaultTimeout(45000);
 // Observe Three.js's compiled direct-light loop size without exporting renderer internals.
 await page.addInitScript(()=>{
   window.__pointLightLoops=new Set();const counts=new WeakMap(),use=WebGL2RenderingContext.prototype.useProgram;
   WebGL2RenderingContext.prototype.useProgram=function(program){
     if(program){
       if(!counts.has(program)){
         let count=null;for(const shader of this.getAttachedShaders(program)??[]){
           const match=this.getShaderSource(shader)?.match(/#if \( (\d+) > 0 \) && defined\( RE_Direct \)/);
           if(match)count=Number(match[1]);
         }counts.set(program,count);
       }const count=counts.get(program);if(count!==null)window.__pointLightLoops.add(count);
     }return use.call(this,program);
   };
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173/?qa');await page.waitForSelector('canvas[data-ready="true"]');
 await page.evaluate(()=>localStorage.setItem('black-universe-v2',JSON.stringify({version:2,relays:['engineering','navigation','observatory'],forged:true,power:{profile:'balanced',heat:24,tripped:false}})));
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-ready="true"]');if(high)await page.selectOption('#quality','high',{force:true});await page.click('#play');
 const samples=[];
 for(const [name,x,z] of [['bridge',0,-5],['concourse',0,16],['engineering',-16,11],['observatory',16,11]]){
   await page.evaluate(({x,z})=> (window.__pointLightLoops.clear(),window.__erebus.place(x,z)),{x,z});if(!high)await page.waitForFunction(()=>{const slots=window.__erebus.snapshot().render.lighting.slots;return slots.length===4&&slots.every(s=>s.pending<0&&s.gain===1);});await page.waitForTimeout(600);
   const sample=await page.evaluate(()=>({render:window.__erebus.snapshot().render,fps:document.querySelector('canvas').dataset.fps,pointLightLoops:[...window.__pointLightLoops]}));samples.push({name,...sample});
   if(process.argv[3])await page.screenshot({path:`${process.argv[3]}/${name}.png`});
 }
 assert.deepEqual(errors,[],'no browser exceptions');
 for(const sample of samples)assert.deepEqual(sample.pointLightLoops,[high?9:4],`${sample.name}: compiled point-light loop budget`);
 const result={viewport:'960x600',mode:high?'high':'performance',samples,errors};console.log(JSON.stringify(result));if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(result,null,2));
}finally{await browser.close();}
