// One bounded survey site, in local meters. Render and physics use the same mesh.
import {FIELD_SITES} from './survey';
export const SURFACE_ORIGIN=400;
export const SITE_HALF=64;
export const LANDING={x:0,z:20};
export const LANDING_PADS={survey:{...LANDING,label:'Survey pad'},arch:{x:-34,z:-15,label:'Arch pad'}} as const;
export type LandingSite=keyof typeof LANDING_PADS;
export const LANDING_PLAN=Object.values(LANDING_PADS);
export const landingPad=(site:LandingSite='survey')=>LANDING_PADS[site]??LANDING_PADS.survey;
export const SAMPLE={x:9,z:-9};
export function surfaceRocks(){
  const points=[...LANDING_PLAN,SAMPLE,...FIELD_SITES],rocks:{x:number;z:number;radius:number}[]=[];
  const distanceToSegment=(x:number,z:number,a:typeof LANDING,b:typeof LANDING)=>{
    const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
  };
  for(let i=0;i<128;i++){
    const spread=i<64?29:SITE_HALF-4,x=Math.sin(i*127.1+3)*spread,z=Math.cos(i*311.7+7)*spread;
    if(points.some(p=>Math.hypot(x-p.x,z-p.z)<6))continue;
    if(points.some((a,j)=>points.slice(j+1).some(b=>distanceToSegment(x,z,a,b)<3)))continue;
    rocks.push({x,z,radius:.35+(i%7)*.12});
  }
  return rocks;
}
export function terrainHeight(x:number,z:number):number {
  const ridge=3*Math.exp(-((x-40)**2+(z+39)**2)/280);
  const relief=1.2*Math.sin(x*.12)*Math.cos(z*.1)+.45*Math.sin((x+z)*.22)+ridge;
  let distance=Infinity;for(const pad of LANDING_PLAN)distance=Math.min(distance,Math.hypot(x-pad.x,z-pad.z));
  const padBlend=Math.min(1,Math.max(0,(distance-4)/6));
  return padBlend===0?0:relief*padBlend;
}
export function terrainMesh(segments=96){
  const vertices=new Float32Array((segments+1)**2*3),indices=new Uint32Array(segments**2*6);
  for(let z=0;z<=segments;z++)for(let x=0;x<=segments;x++){
    const px=-SITE_HALF+x*SITE_HALF*2/segments,pz=-SITE_HALF+z*SITE_HALF*2/segments;
    vertices.set([px,terrainHeight(px,pz),pz],(z*(segments+1)+x)*3);
  }
  for(let z=0;z<segments;z++)for(let x=0;x<segments;x++){
    const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;
    indices.set([a,c,b,b,c,d],(z*segments+x)*6);
  }
  return {vertices,indices};
}
export function landingBlock(forged:boolean,tripped:boolean):string|null {
  return !forged?'Create Nysa at the architect before deploying.':tripped?'Containment is tripped. Reset engineering before deploying.':null;
}
