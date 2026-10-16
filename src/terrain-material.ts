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
/** Three independent scalar surfaces, packed as linear RGB, not an albedo image. */
export function biomeDetail(u:number,v:number){
  const grain=noise(u,v,64),broad=noise(u,v,8);
  const ripple=.5+.5*Math.cos(2*Math.PI*(v*12+.3*Math.sin(u*Math.PI*2)));
  const fractures=Math.pow(Math.abs(noise(u,v,16)-.5)*2,.35);
  return [clamp(.22+.4*ripple+.22*grain+.12*broad),
    clamp(.16+.5*fractures+.24*grain+.1*broad),
    clamp(.15+.55*noise(u,v,32)+.3*broad)];
}
export function groundMapData(size=GROUND_MAP_SIZE){
  const packed=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const h=biomeDetail(x/size,y/size);packed.set([...h.map(v=>Math.round(v*255)),255],(y*size+x)*4);
  }
  return {size,packed};
}
/** Sand / exposed stone / organic soil; slope exposes stone in every region. */
export function groundBlend(x:number,z:number,normalY:number){
  const w=biomeWeights(x,z),steep=clamp((1-normalY)*6);
  return [(w.dunes+w.highland*.2)*(1-steep),
    (w.basalt+w.highland*.8)*(1-steep)+steep,w.wetland*(1-steep)];
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
  const data=groundMapData(),packed=new THREE.DataTexture(data.packed,data.size,data.size,THREE.RGBAFormat);
  packed.wrapS=packed.wrapT=THREE.RepeatWrapping;packed.magFilter=THREE.LinearFilter;
  packed.minFilter=THREE.LinearMipmapLinearFilter;packed.generateMipmaps=true;packed.anisotropy=2;packed.needsUpdate=true;
  // The shared map is linear scalar data. Shader chunks turn it into tint, roughness and bump.
  const material=new THREE.MeshStandardMaterial({vertexColors:true,map:packed,bumpMap:packed,roughnessMap:packed,bumpScale:.16,roughness:1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec3 groundBlend; varying vec3 vGroundBlend; varying vec2 vGroundUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundBlend = groundBlend; vGroundUv = position.xz / 4.0;');
    shader.fragmentShader='varying vec3 vGroundBlend; varying vec2 vGroundUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 groundWeights = max(vGroundBlend, vec3(0.0));
      groundWeights /= max(dot(groundWeights, vec3(1.0)), 0.0001);
      vec3 groundFine = texture2D(map, vGroundUv).rgb;
      // Rotated incommensurate scale breaks the obvious four-meter repeat; no per-frame noise.
      vec2 groundBroadUv = mat2(0.8, 0.6, -0.6, 0.8) * vGroundUv * 0.173 + vec2(0.37, 0.19);
      vec3 groundBroad = texture2D(map, groundBroadUv).rgb;
      float groundHeight = dot(groundFine, groundWeights);
      float groundMacro = dot(groundBroad, groundWeights);
      diffuseColor.rgb *= (0.62 + 0.62 * groundHeight) * (0.82 + 0.30 * groundMacro);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
      float roughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        roughnessFactor *= clamp(0.96 - 0.19 * groundWeights.z + 0.06 * (groundHeight - 0.5), 0.7, 1.0);
      #endif
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
      #ifdef USE_BUMPMAP
        normal = perturbNormalArb(-vViewPosition, normal,
          bumpScale * vec2(dFdx(groundHeight), dFdy(groundHeight)), faceDirection);
      #endif
    `);
  };
  material.customProgramCacheKey=()=> 'nysa-biome-ground-v1';
  let high=true;
  return {material,setQuality(value:boolean){
    if(value===high)return;high=value;material.bumpMap=high?packed:null;material.roughnessMap=high?packed:null;material.needsUpdate=true;
  },snapshot(){return {tileMeters:GROUND_TILE_METERS,mapSize:data.size,normalMap:false,bumpMap:!!material.bumpMap,roughnessMap:!!material.roughnessMap,albedo:!!material.map,biomePatterns:3,macroBlend:true,cpuBytes:data.packed.byteLength};}};
}
