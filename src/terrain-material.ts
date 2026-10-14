import * as THREE from 'three';
import {biomeWeights} from './biomes';

export const GROUND_MAP_SIZE=128;
export const GROUND_TILE_METERS=4;
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function hash(x:number,y:number){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^8204;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(u:number,v:number,cells:number){
  const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const smooth=(t:number)=>t*t*(3-2*t),wrap=(n:number)=>(n%cells+cells)%cells;
  return mix(mix(hash(wrap(ix),wrap(iy)),hash(wrap(ix+1),wrap(iy)),smooth(fx)),mix(hash(wrap(ix),wrap(iy+1)),hash(wrap(ix+1),wrap(iy+1)),smooth(fx)),smooth(fy));
}
/** Periodic height detail in normalized tile coordinates, unrelated to collision relief. */
export function groundDetail(u:number,v:number){return .5*noise(u,v,4)+.28*noise(u,v,16)+.16*noise(u,v,64)+.06*noise(u,v,128);}
export function groundMapData(size=GROUND_MAP_SIZE){
  const heights=new Float32Array(size*size),albedo=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)heights[y*size+x]=groundDetail(x/size,y/size);
  const height=(x:number,y:number)=>heights[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,h=height(x,y),tone=Math.round(175+h*65);
    albedo.set([tone,Math.round(tone*.98),Math.round(tone*.92),255],i);
    const nx=(height(x-1,y)-height(x+1,y))*2,ny=(height(x,y-1)-height(x,y+1))*2,length=Math.hypot(nx,ny,1);
    normal.set([Math.round((nx/length*.5+.5)*255),Math.round((ny/length*.5+.5)*255),Math.round((1/length*.5+.5)*255),255],i);
    const r=Math.round(232+h*22);roughness.set([r,r,r,255],i);
  }
  return {size,albedo,normal,roughness};
}
const soil=new THREE.Color(0x8a8069),moss=new THREE.Color(0x526b59),rock=new THREE.Color(0x687078);
export function groundTint(height:number,normalY:number,x?:number,z?:number){
  if(x!==undefined&&z!==undefined){
    const weights=biomeWeights(x,z),tint=new THREE.Color(0,0,0);
    for(const [region,hex] of Object.entries({dunes:0xb59c73,basalt:0x454e59,wetland:0x527568,highland:0x8c9390}))tint.add(new THREE.Color(hex).multiplyScalar(weights[region as keyof typeof weights]));
    return tint.lerp(rock,clamp((1-normalY)*6)).lerp(new THREE.Color(0xcbd7d8),weights.highland*clamp((height-7)/4));
  }
  const rocky=clamp((1-normalY)*14),lowland=clamp((.65-height)/2);
  return soil.clone().lerp(moss,lowland).lerp(rock,rocky);
}
export function createGroundMaterial(){
  const data=groundMapData();
  const texture=(bytes:Uint8Array,color=false)=>{
    const t=new THREE.DataTexture(bytes,data.size,data.size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=2;
    if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
  };
  const albedo=texture(data.albedo,true),normal=texture(data.normal),roughness=texture(data.roughness);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,map:albedo,normalMap:normal,roughnessMap:roughness,roughness:1,normalScale:new THREE.Vector2(.65,.65)});
  let high=true;
  return {material,setQuality(value:boolean){
    if(value===high)return;high=value;material.normalMap=high?normal:null;material.roughnessMap=high?roughness:null;material.needsUpdate=true;
  },snapshot(){return {tileMeters:GROUND_TILE_METERS,mapSize:data.size,normalMap:!!material.normalMap,roughnessMap:!!material.roughnessMap,albedo:!!material.map,cpuBytes:data.albedo.byteLength+data.normal.byteLength+data.roughness.byteLength};}};
}
