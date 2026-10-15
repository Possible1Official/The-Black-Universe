import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {JUMP_SPEED} from './pilot-controls';
import {requestedAsset} from './requested-assets';
import {BikeRiderContact} from './rider-contact';

// Source Walking clip travels 1.313 m in one 26-frame cycle (30 FPS).
export const WALK_STRIDE = 1.313094;
export class CrewVisual {
  readonly mixer: THREE.AnimationMixer;
  private idle: THREE.AnimationAction;
  private walk: THREE.AnimationAction;
  private run?:THREE.AnimationAction;private ride?:THREE.AnimationAction;private jump?:THREE.AnimationAction;private airBlend=0;
  private bikeContact?:BikeRiderContact;
  constructor(readonly root: THREE.Object3D, clips: THREE.AnimationClip[],private readonly walkStride=WALK_STRIDE,private readonly runStride=2.2) {
    const idle=clips.find(c=>c.name==='Idle'),walk=clips.find(c=>c.name==='Walking');
    if(!idle||!walk)throw new Error('Crew asset needs Idle and Walking clips');
    this.mixer=new THREE.AnimationMixer(root);
    this.idle=this.mixer.clipAction(idle).play();
    this.walk=this.mixer.clipAction(walk).play();
    const run=clips.find(c=>c.name==='Running'),ride=clips.find(c=>c.name==='Riding');if(run){this.run=this.mixer.clipAction(run).play();this.run.paused=true;}if(ride){this.ride=this.mixer.clipAction(ride).play();this.ride.paused=true;}const jump=clips.find(c=>c.name==='Jump');if(jump){this.jump=this.mixer.clipAction(jump).play();this.jump.paused=true;}this.idle.paused=this.walk.paused=true;
    this.update(0,0,0);
  }
  update(dt:number,distance:number,blend:number,running=0,riding=false,airborne=false,verticalSpeed=0){
    this.releaseBikeContact();
    this.idle.time=(this.idle.time+dt)%this.idle.getClip().duration;
    this.walk.time=(this.walk.time+Math.max(0,distance)/this.walkStride*this.walk.getClip().duration)%this.walk.getClip().duration;
    this.airBlend=THREE.MathUtils.damp(this.airBlend,this.jump&&airborne&&!riding?1:0,22,Math.max(0,dt));
    const ground=1-this.airBlend;
    const b=THREE.MathUtils.clamp(blend,0,1),r=this.run?THREE.MathUtils.clamp(running,0,1):0,mounted=riding&&this.ride?1:0;this.idle.setEffectiveWeight((1-b)*(1-mounted)*ground);this.walk.setEffectiveWeight(b*(1-r)*(1-mounted)*ground);if(this.run){this.run.time=(this.run.time+Math.max(0,distance)/this.runStride*this.run.getClip().duration)%this.run.getClip().duration;this.run.setEffectiveWeight(b*r*(1-mounted)*ground);}if(this.ride){this.ride.time=0;this.ride.setEffectiveWeight(mounted);}
    if(this.jump){this.jump.time=(airborne?THREE.MathUtils.clamp((JUMP_SPEED-verticalSpeed)/(2*JUMP_SPEED),0,1):1)*this.jump.getClip().duration;this.jump.setEffectiveWeight(this.airBlend*(1-mounted));}
    this.mixer.update(0);
  }
  fitBikeContact(bike:THREE.Object3D){(this.bikeContact??=new BikeRiderContact(this.root)).apply(bike);}
  releaseBikeContact(){this.bikeContact?.restore();}
  snapshot(){return {idleTime:this.idle.time,walkTime:this.walk.time,walkWeight:this.walk.getEffectiveWeight(),runWeight:this.run?.getEffectiveWeight()??0,ridingWeight:this.ride?.getEffectiveWeight()??0,jumpWeight:this.jump?.getEffectiveWeight()??0,jumpTime:this.jump?.time??0,contact:this.bikeContact?.snapshot()??null};}
}
let crewAsset:ReturnType<GLTFLoader['loadAsync']>|undefined;
export async function loadCrewVisuals(actors:THREE.Group[]):Promise<CrewVisual[]> {
  const gltf=await (crewAsset??=new GLTFLoader().loadAsync(new URL('./assets/ely.glb',import.meta.url).href));
  // Validate before changing any actor so a failed asset keeps both fallback androids.
  if(!gltf.animations.some(c=>c.name==='Idle')||!gltf.animations.some(c=>c.name==='Walking'))throw new Error('Invalid crew animations');
  return actors.map(actor=>{
    const root=clone(gltf.scene);
    root.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.castShadow=true;obj.receiveShadow=true;obj.frustumCulled=false;}});
    const visual=new CrewVisual(root,gltf.animations);
    for(const child of actor.children)child.visible=false;
    actor.add(root);
    return visual;
  });
}

export async function loadPlayerVisual(actor:THREE.Group){const gltf=await requestedAsset('biker');const root=clone(gltf.scene);root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});const visual=new CrewVisual(root,gltf.animations,1.465755,3.50991);for(const c of actor.children)c.visible=false;root.name='requested-biker';actor.add(root);actor.userData.requested='biker';return visual;}
