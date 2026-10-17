import * as THREE from 'three';import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {requestedAsset} from './requested-assets';import {WAYFINDER} from './orbital-layout';
/** Incorporated CGTrader recorder module; generated panels/antenna are game-authored. */
export class OrbitalProbe{
 readonly root=new THREE.Group();private readonly fallback:THREE.Mesh;private readonly status:THREE.MeshBasicMaterial;
 private loaded=false;private attempted=false;private pending?:Promise<void>;
 constructor(){
  this.root.name='Wayfinder orbital relay';this.root.position.set(WAYFINDER.x,WAYFINDER.y,WAYFINDER.z);
  const alloy=new THREE.MeshStandardMaterial({color:0x657983,metalness:.65,roughness:.45});
  this.fallback=new THREE.Mesh(new THREE.CylinderGeometry(.58,.58,2.4,12),alloy);this.root.add(this.fallback);
  const panels=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,.055,1.05),new THREE.MeshStandardMaterial({color:0x1b3555,metalness:.35,roughness:.42}),2);
  const m=new THREE.Matrix4();for(const [i,x]of [-2,2].entries())panels.setMatrixAt(i,m.makeTranslation(x,0,0));this.root.add(panels);
  const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(.024,.065,1.05),alloy,12);let i=0;for(const side of [-1,1])for(let n=0;n<6;n++)rails.setMatrixAt(i++,m.makeTranslation(side*(1.25+n*.3),0,0));this.root.add(rails);
  const spar=new THREE.Mesh(new THREE.BoxGeometry(4.1,.12,.12),alloy);this.root.add(spar);
  const aerial=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,2.4,8),alloy);aerial.position.y=1.2;this.root.add(aerial);
  this.status=new THREE.MeshBasicMaterial({color:0xffbb72});const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(.12),this.status);lamp.position.y=2.43;this.root.add(lamp);
 }
 setRecovered(value:boolean){this.status.color.setHex(value?0x83f0c1:0xffbb72);}
 load(retry=false,loader:()=>Promise<GLTF>=()=>requestedAsset('canister')){
  if(this.pending)return this.pending;if(this.loaded||(this.attempted&&!retry))return;this.attempted=true;
  this.pending=loader().then(asset=>{
   const model=asset.scene.clone(true);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),longest=Math.max(size.x,size.y,size.z);
   if(!Number.isFinite(longest)||longest<=0)throw Error('Invalid receiver bounds');const fit=new THREE.Group();fit.scale.setScalar(2.4/longest);model.position.sub(bounds.getCenter(new THREE.Vector3()));fit.add(model);this.root.add(fit);this.fallback.visible=false;this.loaded=true;
  }).catch(()=>console.warn('Wayfinder recorder unavailable; bounded receiver fallback retained.')).finally(()=>{this.pending=undefined;});return this.pending;
 }
 snapshot(){return {loaded:this.loaded,position:this.root.position.toArray(),fallback:this.fallback.visible};}
}
