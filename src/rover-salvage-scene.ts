import {clearSight} from './visibility';
import * as THREE from 'three';import RAPIER from '@dimforge/rapier3d-compat';import {requestedAsset} from './requested-assets';import {clone} from 'three/addons/utils/SkeletonUtils.js';import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {SALVAGE_PICKUP,SALVAGE_DEPOT,SALVAGE_SIZE,salvagePallet,type SalvagePhase} from './rover-salvage';import {RoverRack} from './rover-rack';
/** One physical crate transfers field -> rack -> depot; no colliding mounted cargo. */
export class RoverSalvageScene{
 readonly root=new THREE.Group();readonly crate=new THREE.Group();readonly rack=new RoverRack();readonly sites:{id:'load'|'deliver';position:THREE.Vector3;base:number;collider?:RAPIER.Collider}[]=[];
 private phase:SalvagePhase='waiting';private world?:RAPIER.World;private cargoCollider?:RAPIER.Collider;private palletMeshes:THREE.Mesh[]=[];private screens:{canvas:HTMLCanvasElement;map:THREE.CanvasTexture;id:'load'|'deliver'}[]=[];private loaded=false;private attempted=false;private pending?:Promise<void>;private fallback:THREE.Mesh;
 constructor(ground:(x:number,z:number)=>number,private readonly origin=0){
  this.root.name='Rover salvage contract';const metal=new THREE.MeshStandardMaterial({color:0x536974,metalness:.2,roughness:.75});
  for(const [i,site]of [SALVAGE_PICKUP,SALVAGE_DEPOT].entries()){
   const plan=salvagePallet(site,ground),pallet=new THREE.Mesh(new THREE.BoxGeometry(1.2,plan.height,1),metal);pallet.position.set(site.x,plan.bottom+plan.height/2,site.z);pallet.castShadow=pallet.receiveShadow=true;this.root.add(pallet);this.palletMeshes.push(pallet);
   const terminal=new THREE.Mesh(new THREE.BoxGeometry(.42,.9,.28),metal);terminal.position.set(site.x+1.2,ground(site.x+1.2,site.z)+.45,site.z);terminal.castShadow=true;this.root.add(terminal);this.palletMeshes.push(terminal);const id=i===0?'load':'deliver';this.sites.push({id,base:plan.top,position:new THREE.Vector3(origin+site.x+1.2,terminal.position.y+.35,site.z+.16)});
   let screenMaterial=new THREE.MeshBasicMaterial({color:0x9de3d5});if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;screenMaterial=new THREE.MeshBasicMaterial({map});this.screens.push({canvas,map,id});}
   const screen=new THREE.Mesh(new THREE.PlaneGeometry(.38,.22),screenMaterial);screen.position.set(0,.23,.145);terminal.add(screen);
  }
  this.fallback=new THREE.Mesh(new THREE.BoxGeometry(1.25,.6,1),metal.clone());this.fallback.position.y=.3;this.crate.add(this.fallback);this.crate.name='Salvaged survey recorder';this.root.add(this.crate);this.setState('waiting');
 }
 init(world:RAPIER.World){if(this.world)return;this.world=world;this.root.updateWorldMatrix(true,true);for(const [i,m]of this.palletMeshes.entries()){const b=new THREE.Box3().setFromObject(m),h=b.getSize(new THREE.Vector3()).multiplyScalar(.5),p=b.getCenter(new THREE.Vector3()),c=world.createCollider(RAPIER.ColliderDesc.cuboid(h.x,h.y,h.z).setTranslation(p.x,p.y,p.z));if(i===1)this.sites[0].collider=c;if(i===3)this.sites[1].collider=c;}
  this.cargoCollider=world.createCollider(RAPIER.ColliderDesc.cuboid(SALVAGE_SIZE.width/2,SALVAGE_SIZE.height/2,SALVAGE_SIZE.depth/2));this.syncCollider();
 }
 setState(phase:SalvagePhase){this.phase=phase;this.rack.setLoaded(phase==='loaded');
  if(phase==='loaded'){this.rack.cargo.add(this.crate);this.crate.position.set(0,0,0);this.crate.scale.setScalar(1);}else{const site=phase==='waiting'?SALVAGE_PICKUP:SALVAGE_DEPOT,base=this.sites[phase==='waiting'?0:1].base;this.root.add(this.crate);this.crate.position.set(site.x,base,site.z);this.crate.scale.setScalar(.6);}
  this.syncCollider();for(const s of this.screens){const c=s.canvas.getContext('2d')!;c.fillStyle='#142c36';c.fillRect(0,0,256,128);c.fillStyle='#9de3d5';c.font='bold 21px system-ui';c.fillText(s.id==='load'?'SALVAGE / RECORDER':'OUTPOST / CARGO',10,32);c.font='18px system-ui';c.fillText(phase==='delivered'?'DELIVERY COMPLETE':phase==='loaded'?'SECURED ON ROVER':'PARK ROVER / E',10,72);c.font='15px system-ui';c.fillText('BRAKE · DISMOUNT · E',10,108);s.map.needsUpdate=true;}
 }
 private syncCollider(){if(!this.cargoCollider)return;this.cargoCollider.setEnabled(this.phase!=='loaded');this.root.updateWorldMatrix(true,true);const p=this.crate.getWorldPosition(new THREE.Vector3());this.cargoCollider.setTranslation({x:p.x,y:p.y+SALVAGE_SIZE.height/2,z:p.z});}
 attach(actor:THREE.Object3D){if(this.rack.root.parent!==actor)actor.add(this.rack.root);this.rack.root.visible=true;try{this.rack.fit(actor);}catch{console.warn('Source rear-deck fit unavailable; bounded fallback rack retained.');}this.rack.setLoaded(this.phase==='loaded');}
 visibleFrom(from:{x:number;y:number;z:number},observer:RAPIER.Collider,id:'load'|'deliver'){if(!this.world)return false;const i=id==='load'?0:1,s=i===0?SALVAGE_PICKUP:SALVAGE_DEPOT;return clearSight(this.world,from,{x:this.origin+s.x,y:this.sites[i].base+SALVAGE_SIZE.height/2,z:s.z},observer,this.cargoCollider);}
 load(retry=false,loader:()=>Promise<GLTF>=()=>requestedAsset('cargo')){if(this.pending)return this.pending;if(this.loaded||(this.attempted&&!retry))return;this.attempted=true;this.pending=loader().then(a=>{const model=clone(a.scene);model.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});this.crate.add(model);this.fallback.visible=false;this.loaded=true;}).catch(()=>console.warn('Salvage recorder model unavailable; bounded crate fallback retained.')).finally(()=>{this.pending=undefined;});return this.pending;}
 snapshot(){return {phase:this.phase,loaded:this.loaded,rack:this.rack.snapshot(),crateVisible:this.crate.visible,crateParent:this.crate.parent?.name,physicalCrate:this.cargoCollider?.isEnabled()??false};}
}
