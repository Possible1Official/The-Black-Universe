import * as THREE from 'three';
import {biomeDetail,GROUND_MAP_SIZE} from './terrain-material';

const clamp=(v:number)=>THREE.MathUtils.clamp(v,0,1);
const ice=new THREE.Color(0xabc9d3),basalt=new THREE.Color(0x36434e),mineral=new THREE.Color(0x94715a);
/** Frost / basalt / geothermal mineral deposits. Cosmetic: never changes support height. */
export function vesperBlend(x:number,z:number,normalY:number){
 const warm=Math.exp(-((x-20)**2/70+(z+18)**2/140));
 const shelf=Math.exp(-((x+23)**2/150+(z-2)**2/190));
 const frost=clamp(.50-x/85+shelf*.46+.10*Math.sin(x*.17+z*.09))*(1-warm)*clamp((normalY-.65)/.35);
 const deposit=warm*.85;
 return [frost,(1-frost)*(1-deposit),(1-frost)*deposit];
}
export function vesperTint(weights:number[]){return ice.clone().multiplyScalar(weights[0]).add(basalt.clone().multiplyScalar(weights[1])).add(mineral.clone().multiplyScalar(weights[2]));}
/** Periodic scalar channels: fractured ice / granular stone / banded mineral. */
export function vesperDetail(u:number,v:number){
 const d=biomeDetail(u,v);
 // Jittered periodic cells avoid the regular crossed lines of a tiled floor.
 const x=u*5+.14*Math.sin(v*4*Math.PI),y=v*5+.14*Math.sin(u*4*Math.PI);
 const hash=(a:number,b:number)=>{a=(a%5+5)%5;b=(b%5+5)%5;let n=Math.imul(a+19,374761393)^Math.imul(b+31,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 let first=Infinity,second=Infinity;
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const a=Math.floor(x)+i,b=Math.floor(y)+j,dx=a+.15+.7*hash(a,b)-x,dy=b+.15+.7*hash(b+2,a+1)-y,r=dx*dx+dy*dy;if(r<first){second=first;first=r;}else if(r<second)second=r;}
 const edge=Math.sqrt(second)-Math.sqrt(first),fracture=1-THREE.MathUtils.smoothstep(edge,.015,.075);
 return [clamp(.46+.40*d[2]-.34*fracture),d[1],clamp(.25+.44*d[1]+.15*Math.sin(v*12*Math.PI+Math.sin(u*2*Math.PI)))];
}
export function createVesperMaterial(){
 const size=GROUND_MAP_SIZE,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)pixels.set([...vesperDetail(x/size,y/size).map(v=>Math.round(v*255)),255],(y*size+x)*4);
 const map=new THREE.DataTexture(pixels,size,size);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=2;map.needsUpdate=true;
 const material=new THREE.MeshStandardMaterial({vertexColors:true,map,bumpMap:map,roughnessMap:map,bumpScale:.065,roughness:1});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec3 vesperBlend; varying vec3 vVesperBlend; varying vec2 vVesperUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvVesperBlend = vesperBlend; vVesperUv = position.xz / 3.0;');
  shader.fragmentShader='varying vec3 vVesperBlend; varying vec2 vVesperUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   vec3 vesperWeights = max(vVesperBlend, vec3(0.0));
   vesperWeights /= max(dot(vesperWeights, vec3(1.0)), 0.0001);
   vec3 vesperFine = texture2D(map, vVesperUv).rgb;
   vec3 vesperBroad = texture2D(map, mat2(0.8,0.6,-0.6,0.8)*vVesperUv*0.137+vec2(0.37,0.19)).rgb;
   float vesperHeight = dot(vesperFine, vesperWeights);
   diffuseColor.rgb *= (0.65+0.65*vesperHeight)*(0.82+0.32*dot(vesperBroad,vesperWeights));
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
   float roughnessFactor = roughness;
   #ifdef USE_ROUGHNESSMAP
    roughnessFactor *= clamp(dot(vesperWeights,vec3(0.48,0.94,0.82)) + 0.08*(vesperHeight-0.5),0.42,1.0);
   #endif
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
   #ifdef USE_BUMPMAP
    normal = perturbNormalArb(-vViewPosition, normal, bumpScale*vec2(dFdx(vesperHeight),dFdy(vesperHeight)),faceDirection);
   #endif
  `);
 };
 material.customProgramCacheKey=()=> 'vesper-surfaces-v1';
 let high=true;
 return {material,setQuality(value:boolean){if(value===high)return;high=value;material.bumpMap=high?map:null;material.roughnessMap=high?map:null;material.needsUpdate=true;},snapshot(){return {regions:3,cpuBytes:pixels.byteLength,bump:!!material.bumpMap,roughness:!!material.roughnessMap};}};
}
