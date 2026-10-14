import {SITE_HALF,terrainHeight,landingPad,type LandingSite,SAMPLE} from './excursion';
import {FIELD_SITES} from './survey';
import {SUPPLY_CACHE} from './supplies';
import {SHUTTLE_HATCH_Z} from './shuttle';
import type {Progress} from './state';
export const PIN_LIMIT=SITE_HALF-3;
export function surfacePin(x:number,z:number){return Number.isFinite(x)&&Number.isFinite(z)?{x:Math.max(-PIN_LIMIT,Math.min(PIN_LIMIT,x)),z:Math.max(-PIN_LIMIT,Math.min(PIN_LIMIT,z))}:undefined;}
export function mapPoint(u:number,v:number){return surfacePin((u*2-1)*SITE_HALF,(v*2-1)*SITE_HALF);}
export function mapUV(x:number,z:number){return {u:(x/SITE_HALF+1)/2,v:(z/SITE_HALF+1)/2};}
let relief:HTMLCanvasElement|undefined;
export function drawSurveyMap(canvas:HTMLCanvasElement,p:Progress,visitor?:{x:number;z:number;yaw:number},pin?:{x:number;z:number},site:LandingSite='survey'){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 if(!relief){relief=document.createElement('canvas');relief.width=relief.height=256;const c=relief.getContext('2d')!;const pixels=c.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const h=terrainHeight((x/255*2-1)*SITE_HALF,(y/255*2-1)*SITE_HALF),shade=Math.max(0,Math.min(1,(h+2)/7)),i=(y*256+x)*4;pixels.data.set([12+shade*38,34+shade*63,43+shade*63,255],i);}c.putImageData(pixels,0,0);
 }
 canvas.width=canvas.height=256;ctx.drawImage(relief,0,0);ctx.strokeStyle='#9acbce33';ctx.lineWidth=1;
 for(let n=0;n<=4;n++){ctx.beginPath();ctx.moveTo(n*64,0);ctx.lineTo(n*64,256);ctx.moveTo(0,n*64);ctx.lineTo(256,n*64);ctx.stroke();}
 ctx.font='10px system-ui';ctx.fillStyle='#d4f8ff';ctx.fillText('N ↑',118,13);ctx.fillText('128 m · NYSA SECTOR',8,247);
 const pad=landingPad(site),other=landingPad(site==='arch'?'survey':'arch');
 const points=[{label:visitor?'KESTREL':'ACTIVE PAD',x:pad.x,z:pad.z+SHUTTLE_HATCH_Z,done:true},{label:site==='arch'?'MAIN PAD':'ARCH PAD',x:other.x,z:other.z,done:true},{label:'SAMPLE',...SAMPLE,done:p.surveyed},...FIELD_SITES.map(s=>({...s,label:s.id==='arch'?'ARCH':'WEATHER',done:p.fieldScans.includes(s.id)})),{label:'SUPPLIES',...SUPPLY_CACHE,done:p.supplies.cacheClaimed}];
 for(const point of points){const {u,v}=mapUV(point.x,point.z),x=u*256,y=v*256;ctx.fillStyle=point.done?'#83f0c1':'#ffc983';ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();ctx.fillText(point.label,Math.min(196,x+6),y-6);}
 if(pin){const {u,v}=mapUV(pin.x,pin.z);ctx.strokeStyle='#fff';ctx.strokeRect(u*256-4,v*256-4,8,8);}
 if(visitor){const {u,v}=mapUV(visitor.x,visitor.z);ctx.save();ctx.translate(u*256,v*256);ctx.rotate(-visitor.yaw);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-4,5);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();}
}
