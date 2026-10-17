import type {FlightState,Vec3} from './flight';
export const VESPER={x:710,y:130,z:-1230},VESPER_RADIUS=92;
export const VESPER_APPROACH={x:710,y:130,z:-1090};
export const VESPER_CAPTURE={x:710,y:130,z:-1130};
export const VESPER_HALF=48,VESPER_PAD={x:0,z:22};
export const VESPER_SITES=[{id:'ice',label:'Frost shelf',x:-23,z:2,reading:'Subsurface water ice beneath an insulating mineral crust.'},{id:'vent',label:'Warm fissure',x:20,z:-18,reading:'Geothermal warmth; dormant organic compounds survive below the frost.'}] as const;
export type VesperReading=typeof VESPER_SITES[number]['id'];
export const VESPER_ARCHIVE='ARCHIVE 06 / VESPER · This basin sheltered the surviving biosphere recorded by Wayfinder. Geothermal pockets kept water beneath the frozen crust through a previous forge cycle. The forge preserves older worlds instead of replacing them. This landing survey is one small basin; the rest of Vesper remains unexplored.';
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
/** Broad frozen basin, fractured eastern ridge, smoothly prepared landing apron. */
export function vesperHeight(x:number,z:number){
 const r=Math.hypot(x,z),rim=8*smooth((r-32)/15),waves=.5*Math.sin(x*.14)*Math.cos(z*.11),ridge=3*Math.exp(-((x-22)**2/100+(z+18)**2/180));
 const pad=1-smooth((Math.hypot(x-VESPER_PAD.x,z-VESPER_PAD.z)-7)/7);
 return (rim+waves+ridge)*(1-pad);
}
export function vesperMesh(n=96){
 const vertices=new Float32Array((n+1)**2*3),indices=new Uint32Array(n*n*6);let v=0,t=0;
 for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){const px=-VESPER_HALF+x*VESPER_HALF*2/n,pz=-VESPER_HALF+z*VESPER_HALF*2/n;vertices.set([px,vesperHeight(px,pz),pz],v);v+=3;}
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+n+1;indices.set([a,b,a+1,a+1,b,b+1],t);t+=6;}return {vertices,indices};
}
export function vesperBlock(f:FlightState,unlocked:boolean):string|null{
 if(!unlocked)return 'Recover Wayfinder Archive05 to chart Vesper.';
 if(f.phase!=='flying')return 'Manual flight required.';
 const p=f.position,d=Math.hypot(p.x-VESPER_APPROACH.x,p.y-VESPER_APPROACH.y,p.z-VESPER_APPROACH.z),r=Math.hypot(p.x-VESPER.x,p.y-VESPER.y,p.z-VESPER.z),speed=Math.hypot(f.velocity.x,f.velocity.y,f.velocity.z);
 if(!Number.isFinite(d)||!Number.isFinite(r)||d>100||r<VESPER_RADIUS+8-1e-6)return 'Reach Vesper’s near-side approach ring.';
 if(!Number.isFinite(speed)||speed>18)return 'Brake below18m/s before landing on Vesper.';return null;
}
export function vesperCapture(from:Vec3,t:number):Vec3{
 const u=smooth(t/3),dx=from.x-VESPER.x,dy=from.y-VESPER.y,dz=from.z-VESPER.z,r=Math.hypot(dx,dy,dz),nx=dx/Math.max(r,.001)*(1-u),ny=dy/Math.max(r,.001)*(1-u),nz=dz/Math.max(r,.001)*(1-u)+u,len=Math.hypot(nx,ny,nz),radius=Math.max(100,r+(100-r)*u);
 return {x:VESPER.x+nx/Math.max(len,.001)*radius,y:VESPER.y+ny/Math.max(len,.001)*radius,z:VESPER.z+nz/Math.max(len,.001)*radius};
}
export function parseVesper(readings:unknown,archive:unknown,key:boolean){return {readings:key&&Array.isArray(readings)?[...new Set<VesperReading>(readings.filter((v):v is VesperReading=>VESPER_SITES.some(s=>s.id===v)))]:[],archived:key&&archive===true&&Array.isArray(readings)&&VESPER_SITES.every(s=>readings.includes(s.id))};}
