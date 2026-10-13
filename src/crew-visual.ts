import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Source Walking clip travels 1.313 m in one 26-frame cycle (30 FPS).
export const WALK_STRIDE = 1.313094;
export class CrewVisual {
  readonly mixer: THREE.AnimationMixer;
  private idle: THREE.AnimationAction;
  private walk: THREE.AnimationAction;
  constructor(readonly root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    const idle=clips.find(c=>c.name==='Idle'),walk=clips.find(c=>c.name==='Walking');
    if(!idle||!walk)throw new Error('Crew asset needs Idle and Walking clips');
    this.mixer=new THREE.AnimationMixer(root);
    this.idle=this.mixer.clipAction(idle).play();
    this.walk=this.mixer.clipAction(walk).play();
    this.idle.paused=this.walk.paused=true;
    this.update(0,0,0);
  }
  update(dt:number,distance:number,blend:number){
    this.idle.time=(this.idle.time+dt)%this.idle.getClip().duration;
    this.walk.time=(this.walk.time+Math.max(0,distance)/WALK_STRIDE*this.walk.getClip().duration)%this.walk.getClip().duration;
    this.idle.setEffectiveWeight(1-THREE.MathUtils.clamp(blend,0,1));
    this.walk.setEffectiveWeight(THREE.MathUtils.clamp(blend,0,1));
    this.mixer.update(0);
  }
  snapshot(){return {idleTime:this.idle.time,walkTime:this.walk.time,walkWeight:this.walk.getEffectiveWeight()};}
}
export async function loadCrewVisuals(actors:THREE.Group[]):Promise<CrewVisual[]> {
  const gltf=await new GLTFLoader().loadAsync(new URL('./assets/ely.glb',import.meta.url).href);
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
