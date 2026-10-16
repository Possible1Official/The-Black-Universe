import * as THREE from 'three';
import {biomeWeights,WATER_LEVEL} from './biomes';
import {FIELD_SITES} from './survey';
import {LANDING_PLAN,SAMPLE,surfaceRocks} from './excursion';

export type PlantSite={x:number;y:number;z:number;yaw:number;scale:number};
/** Fixed bounded scattering; roots use the rendered terrain, never the water plane. */
export function wetlandPlants(ground:(x:number,z:number)=>number):PlantSite[]{
 const result:PlantSite[]=[],rocks=surfaceRocks();
 for(let i=0;i<1400&&result.length<64;i++){
  const x=32+Math.sin(i*127.1+19)*24,z=34+Math.cos(i*311.7+29)*24,y=ground(x,z);
  if(biomeWeights(x,z).wetland<.85||y<WATER_LEVEL+.08||y>WATER_LEVEL+1.55)continue;
  if([...LANDING_PLAN,SAMPLE,...FIELD_SITES].some(p=>Math.hypot(x-p.x,z-p.z)<6))continue;
  if(rocks.some(r=>Math.hypot(x-r.x,z-r.z)<r.radius+1))continue;
  if(result.some(p=>Math.hypot(x-p.x,z-p.z)<1.15))continue;
  const support=[ground(x-.3,z),ground(x+.3,z),ground(x,z-.3),ground(x,z+.3),y];
  if(Math.max(...support)-Math.min(...support)>.16)continue;
  result.push({x,y:Math.min(...support)-.025,z,yaw:i*2.399963,scale:.8+(i%7)*.055});
 }
 return result;
}

import {requestedAsset} from './requested-assets';
type GrassSource={geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial};
async function loadGrass():Promise<GrassSource[]>{
 const source=await requestedAsset('grass');if(source.animations.length)throw Error('Expected reviewed static plants');source.scene.updateMatrixWorld(true);const result:GrassSource[]=[];
 source.scene.traverse(o=>{if(o instanceof THREE.Mesh){if(Array.isArray(o.material)||!(o.material instanceof THREE.MeshStandardMaterial))throw Error('Invalid plant material');result.push({geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material:o.material.clone()});}});
 if(result.length!==2)throw Error('Expected two reviewed plant variants');return result;
}
function fallbackGrass(){
 const positions:number[]=[],indices:number[]=[];
 for(let i=0;i<6;i++){
  const a=i*2.399963,r=.06+(i%3)*.025,x=Math.sin(a)*r,z=Math.cos(a)*r,h=.32+(i%3)*.07,dx=Math.cos(a)*.025,dz=Math.sin(a)*.025,base=positions.length/3;
  positions.push(x-dx,0,z-dz,x+dx,0,z+dz,x-dx*.6+.06,h*.6,z-dz*.6,x+dx*.6+.06,h*.6,z+dz*.6,x+.09,h,z);
  indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);
 }
 const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export class WetlandScenery{
 readonly root=new THREE.Group();private readonly clock={value:0};private status='idle';private pending?:Promise<boolean>;private batches:THREE.InstancedMesh[]=[];
 constructor(readonly sites:readonly PlantSite[],private readonly loader=loadGrass){
  this.root.name='NysaWetlandPlants';const fallback=new THREE.InstancedMesh(fallbackGrass(),new THREE.MeshStandardMaterial({color:0x788348,roughness:.85,side:THREE.DoubleSide}),sites.length);fallback.name='PlantFallback';this.populate(fallback,sites);this.root.add(fallback);this.batches=[fallback];
 }
 private populate(mesh:THREE.InstancedMesh,sites:readonly PlantSite[]){
  const t=new THREE.Object3D();for(const [i,p]of sites.entries()){t.position.set(p.x,p.y,p.z);t.rotation.set(0,p.yaw,0);t.scale.setScalar(p.scale);t.updateMatrix();mesh.setMatrixAt(i,t.matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=.06;
 }
 private wind(material:THREE.MeshStandardMaterial,height:number){
  const before=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=(shader,renderer)=>{
   before.call(material,shader,renderer);shader.uniforms.plantTime=this.clock;shader.uniforms.plantHeight={value:height};
   shader.vertexShader='uniform float plantTime; uniform float plantHeight;\n'+shader.vertexShader;
   // The source Blend mixes translucent and opaque leaf shading; GLB omitted translucency.
   // Approximate thin-leaf diffuse scattering using incoming light, never emission.
   const physical=THREE.ShaderChunk.lights_physical_pars_fragment.replace(
    'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
    `float leafDot = dot(geometryNormal, directLight.direction);
     float leafDiffuse = max(0.0, (leafDot + 0.5) / 1.5) + 0.25 * saturate(-leafDot);
     reflectedLight.directDiffuse += leafDiffuse * directLight.color * BRDF_Lambert(material.diffuseColor);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_pars_fragment>',physical);
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float plantPhase = instanceMatrix[3].x * 0.71 + instanceMatrix[3].z * 0.43;
    float plantY = clamp(position.y / plantHeight, 0.0, 1.0);
    float plantWeight = plantY * plantY;
    transformed.x += sin(plantTime * 1.4 + plantPhase + plantY * 1.5) * 0.035 * plantWeight;
    transformed.z += cos(plantTime * 0.9 + plantPhase) * 0.018 * plantWeight;
   `);
  };material.customProgramCacheKey=()=>key+'/rooted-plant-wind-leaf-v1';material.needsUpdate=true;
 }
 load(retry=false):Promise<boolean>{
  if(this.status==='ready')return Promise.resolve(true);if(this.pending)return this.pending;if(this.status==='failed'&&!retry)return Promise.resolve(false);
  this.status='loading';this.pending=Promise.resolve().then(()=>this.loader()).then(sources=>{
   const batches=sources.map((s,j)=>{s.geometry.computeBoundingBox();this.wind(s.material,Math.max(.01,s.geometry.boundingBox!.max.y));const sites=this.sites.filter((_,i)=>i%sources.length===j),m=new THREE.InstancedMesh(s.geometry,s.material,sites.length);m.name='AuthoredGrass'+j;this.populate(m,sites);return m;});
   for(const m of this.batches){this.root.remove(m);m.geometry.dispose();(m.material as THREE.Material).dispose();m.dispose();}this.batches=batches;this.root.add(...batches);this.status='ready';return true;
  }).catch(()=>{this.status='failed';console.warn('Wetland plant asset unavailable; rooted fallback retained.');return false;}).finally(()=>{this.pending=undefined;});return this.pending;
 }
 update(dt:number,active:boolean){if(active&&Number.isFinite(dt))this.clock.value+=THREE.MathUtils.clamp(dt,0,.05);}
 snapshot(){return {status:this.status,count:this.sites.length,batches:this.batches.length,time:this.clock.value};}
}
