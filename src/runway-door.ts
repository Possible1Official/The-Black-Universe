import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
/** Original CGTrader Door_Open clip, sampled by the safety interlock fraction. */
export class RunwayDoor{
 readonly root=new THREE.Group();private fraction=-1;private readonly mixer:THREE.AnimationMixer;private readonly action:THREE.AnimationAction;private readonly leaves:THREE.Object3D[];private readonly colliders:RAPIER.Collider[]=[];
 constructor(asset:GLTF,width:number,height:number,z:number){
  const source=asset.scenes.find(s=>s.name==='Sliding_door_library');const clip=asset.animations.find(c=>c.name==='Door_Open');if(!source||!clip)throw Error('Runway kit needs its original door clip');
  const model=clone(source);this.root.add(model);this.root.position.z=z;this.root.scale.set(width/1.8,height/2.6,1);
  this.leaves=['L','R'].map(side=>{const leaf=model.getObjectByName('SM_SF_Corridor_Door_Door'+side);if(!leaf)throw Error('Missing source door leaf');return leaf;});
  this.mixer=new THREE.AnimationMixer(model);this.action=this.mixer.clipAction(clip).setLoop(THREE.LoopOnce,1).play();this.action.paused=true;this.action.clampWhenFinished=true;this.update(0);
 }
 init(world:RAPIER.World){for(const leaf of this.leaves){const box=new THREE.Box3().setFromObject(leaf),half=box.getSize(new THREE.Vector3()).multiplyScalar(.5),center=box.getCenter(new THREE.Vector3());this.colliders.push(world.createCollider(RAPIER.ColliderDesc.cuboid(half.x,half.y,half.z).setTranslation(center.x,center.y,center.z)));}}
 update(fraction:number){fraction=THREE.MathUtils.clamp(fraction,0,1);if(fraction===this.fraction)return;this.fraction=fraction;this.action.time=fraction*this.action.getClip().duration;this.mixer.update(0);this.root.updateWorldMatrix(true,true);this.leaves.forEach((leaf,i)=>{const center=new THREE.Box3().setFromObject(leaf).getCenter(new THREE.Vector3());this.colliders[i]?.setTranslation(center);});}
}
