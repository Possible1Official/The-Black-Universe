import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {requestedAsset,attachRequested} from './requested-assets';
import {meshColliders} from './mesh-colliders';
import {RunwayDoor} from './runway-door';
import {VAULT,carrierReading,type VaultProgress} from './signal-vault';
const loadKit=()=>requestedAsset('corridor');
/** Shared source kit/materials and original Door_Open motion; sealed fallback. */
export class SignalVaultScene{
 readonly root=new THREE.Group();readonly terminals:{id:'receiver'|'archive';label:string;position:THREE.Vector3;mesh:THREE.Mesh;collider?:RAPIER.Collider}[]=[];
 private world?:RAPIER.World;private solids:THREE.Mesh[]=[];private floor:THREE.Mesh;private doorFallback:THREE.Mesh;private floorCollider?:RAPIER.Collider;private doorCollider?:RAPIER.Collider;
 private kit=new THREE.Group();private door?:RunwayDoor;private cargo:THREE.Group[]=[];private core=new THREE.Group();private loaded=false;private attempted=false;private pending?:Promise<void>;
 private open=false;private fraction=0;private archived=false;private dish=new THREE.Group();private bearing=0;
 private lamp=new THREE.PointLight(0xb7ddea,75,16,2);private porch=new THREE.PointLight(0xffd9ab,75,10,2);private indicator=new THREE.MeshBasicMaterial({color:0xffb85c});
 private screen?:{canvas:HTMLCanvasElement;map:THREE.CanvasTexture};
 constructor(private readonly origin=0){
  this.root.name='Signal Vault';this.root.position.set(VAULT.x,0,VAULT.z);
  const shell=new THREE.MeshStandardMaterial({color:0x647783,metalness:.1,roughness:.72}),trim=new THREE.MeshStandardMaterial({color:0x7d939b,metalness:.45,roughness:.55});
  const box=(parent:THREE.Object3D,size:[number,number,number],at:[number,number,number],mat:THREE.Material=shell,solid=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...at);m.castShadow=m.receiveShadow=true;parent.add(m);if(solid)this.solids.push(m);return m;};
  this.floor=box(this.root,[9.6,.16,12.4],[0,-.065,0]);
  for(const side of [-1,1]){box(this.root,[.3,4.2,12.4],[side*4.75,1.95,0]);box(this.root,[3.1,3.6,.3],[side*3.25,1.8,6.15]);}
  box(this.root,[9.8,.25,12.6],[0,4.1,0]);box(this.root,[9.6,4.2,.3],[0,1.95,-6.15]);box(this.root,[9.6,.7,.3],[0,3.75,6.15]);
  this.doorFallback=box(this.root,[3.4,3.4,.2],[0,1.74,6.15]);
  const terminal=(id:'receiver'|'archive',label:string,x:number,z:number)=>{const m=box(this.root,[.85,.85,.5],[x,.465,z]);box(m,[.72,.3,.035],[0,.15,.267],this.indicator,false);this.terminals.push({id,label,mesh:m,position:new THREE.Vector3(this.origin+VAULT.x+x,1.04,VAULT.z+z+.28)});return m;};
  const receiver=terminal('receiver','Tune vault receiver',2.7,6.9);terminal('archive','Recover vault archive',0,-4.6);
  this.lamp.position.set(0,2.9,-.8);this.lamp.visible=false;this.root.add(this.lamp);this.porch.position.set(0,4.2,7.4);this.porch.visible=false;this.root.add(this.porch);box(this.root,[.12,.3,.12],[0,4.3,6.2],trim,false);box(this.root,[.12,.12,1],[0,4.45,6.65],trim,false);box(this.root,[1.2,.06,.16],[0,4.25,7.1],new THREE.MeshBasicMaterial({color:0xffd9ab}),false);
  this.dish.position.set(2.7,4.7,1);this.root.add(this.dish);box(this.root,[.18,1.3,.18],[2.7,4.3,1],trim);
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.95,16,8,0,Math.PI*2,0,Math.PI*.38),trim);bowl.rotation.x=-Math.PI*.3;this.dish.add(bowl);box(this.dish,[.08,.08,1.25],[0,.2,-.4],this.indicator,false);
  for(const x of [-3,3]){const cargo=new THREE.Group();cargo.position.set(x,.04,-2);this.root.add(cargo);box(cargo,[1.25,.6,1],[0,.3,0],trim);this.cargo.push(cargo);}
  this.core.position.set(0,.89,-4.6);this.root.add(this.core);box(this.core,[.18,.48,.18],[0,.24,0],this.indicator,false);
  this.root.add(this.kit);
  if(typeof document!=='undefined'){
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;this.screen={canvas,map};const screen=receiver.children[0] as THREE.Mesh;screen.material=new THREE.MeshBasicMaterial({map});
   const sign=document.createElement('canvas');sign.width=512;sign.height=128;const c=sign.getContext('2d')!;c.fillStyle='#10232d';c.fillRect(0,0,512,128);c.fillStyle='#d9f4f3';c.font='bold 34px system-ui';c.fillText('SIGNAL VAULT / 04',24,54);c.fillStyle='#ffc582';c.font='22px system-ui';c.fillText('RECEIVER →    SEALED ARCHIVE',24,98);const sm=new THREE.CanvasTexture(sign);sm.colorSpace=THREE.SRGBColorSpace;box(this.root,[5.8,.7,.045],[0,3.75,6.34],new THREE.MeshBasicMaterial({map:sm}),false);
  }
  this.tune(15,0);
 }
 init(world:RAPIER.World){if(this.world)return;this.world=world;this.root.updateWorldMatrix(true,true);for(const m of this.solids){const b=new THREE.Box3().setFromObject(m),h=b.getSize(new THREE.Vector3()).multiplyScalar(.5),p=b.getCenter(new THREE.Vector3()),c=world.createCollider(RAPIER.ColliderDesc.cuboid(h.x,h.y,h.z).setTranslation(p.x,p.y,p.z));if(m===this.floor)this.floorCollider=c;if(m===this.doorFallback)this.doorCollider=c;const terminal=this.terminals.find(t=>t.mesh===m);if(terminal)terminal.collider=c;}if(this.loaded){meshColliders(world,this.kit);this.door?.init(world);this.floorCollider?.setEnabled(false);this.doorCollider?.setEnabled(false);}}
 load(retry=false,loader:()=>Promise<GLTF>=loadKit){
  if(this.pending)return this.pending;if(this.loaded||(this.attempted&&!retry))return;this.attempted=true;
  this.pending=loader().then(asset=>{
   const source=asset.scene.children.find(o=>o.name==='Erebus_Runway_Segment_0');if(!source)throw Error('Missing kit cell');const door=new RunwayDoor(asset,3.4,3.4,6.15);door.root.position.y=.04;
   for(const z of [-4,0,4]){const cell=source.clone(true);cell.position.set(0,.04,z);cell.scale.set(VAULT.width/3.5,VAULT.height/3.4,1);cell.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});this.kit.add(cell);}
   this.root.add(door.root);this.door=door;door.update(this.fraction);if(this.world){meshColliders(this.world,this.kit);door.init(this.world);this.floorCollider?.setEnabled(false);this.doorCollider?.setEnabled(false);}this.floor.visible=this.doorFallback.visible=false;this.loaded=true;
  }).catch(()=>{this.kit.clear();console.warn('Vault kit unavailable; sealed playable fallback retained.');}).finally(()=>{this.pending=undefined;});
  if(loader===loadKit){for(const cargo of this.cargo)void attachRequested('cargo',cargo).catch(()=>{});void attachRequested('canister',this.core).catch(()=>{});}return this.pending;
 }
 tune(frequency:number,bearing:number){if(!Number.isFinite(frequency)||!Number.isFinite(bearing))return;this.bearing=((bearing%360)+360)%360;this.dish.rotation.y=-this.bearing*Math.PI/180;const strength=Math.round(carrierReading(frequency,bearing).strength*100);if(this.screen){const c=this.screen.canvas.getContext('2d')!;c.fillStyle='#10232d';c.fillRect(0,0,256,128);c.fillStyle='#ffc582';c.font='bold 21px system-ui';c.fillText('VAULT / RECEIVER',10,30);c.fillStyle='#d9f4f3';c.font='19px system-ui';c.fillText(frequency.toFixed(1)+' Hz / '+this.bearing+'°',10,66);c.fillText(strength+'% CARRIER',10,99);this.screen.map.needsUpdate=true;}}
 setState(p:VaultProgress,snap=false){this.open=p.calibrated;this.archived=p.archived;this.indicator.color.setHex(p.archived?0x82efc6:p.calibrated?0x8edfeb:0xffb85c);if(snap){this.fraction=this.open?1:0;this.syncDoor();}}
 private syncDoor(){this.door?.update(this.fraction);this.doorFallback.position.y=1.74+this.fraction*3.6;this.root.updateWorldMatrix(true,true);if(this.doorCollider){const p=this.doorFallback.getWorldPosition(new THREE.Vector3());this.doorCollider.setTranslation(p);}}
 update(dt:number,active:boolean,observer?:THREE.Vector3){if(observer){const p=this.root.getWorldPosition(new THREE.Vector3()),d=Math.hypot(observer.x-p.x,observer.z-p.z);this.lamp.visible=d<(this.lamp.visible?30:26);this.porch.visible=this.lamp.visible;}if(!active||!Number.isFinite(dt)||dt<=0)return;const next=Math.min(1,this.fraction+(this.open?Math.min(dt,.05)/1.6:0));if(next!==this.fraction){this.fraction=next;this.syncDoor();}}
 snapshot(){return {loaded:this.loaded,calibrated:this.open,archived:this.archived,door:this.fraction,bearing:this.bearing};}
}
