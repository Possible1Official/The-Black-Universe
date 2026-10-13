// One bounded survey site, in local meters. Render and physics use the same mesh.
export const SURFACE_ORIGIN=400;
export const SITE_HALF=32;
export const LANDING={x:0,z:20};
export const SAMPLE={x:9,z:-9};
export function terrainHeight(x:number,z:number):number {
  const relief=1.2*Math.sin(x*.12)*Math.cos(z*.1)+.45*Math.sin((x+z)*.22);
  const padBlend=Math.min(1,Math.max(0,(Math.hypot(x-LANDING.x,z-LANDING.z)-4)/6));
  return padBlend===0?0:relief*padBlend;
}
export function terrainMesh(segments=48){
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
