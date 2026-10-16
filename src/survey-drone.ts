import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {requestedAsset} from './requested-assets';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {DroneFollow,type TrailPoint} from './drone-follow';
import {OUTPOST} from './relay-expedition';
import {SURFACE_ORIGIN} from './excursion';
import {isFieldScan,type FieldScan} from './survey';
export const DRONE_DOCK={x:OUTPOST.x+2.9,z:OUTPOST.z+6.5};
export const DRONE_RADIUS=.56,DRONE_HEIGHT=1.35;
/** Nonblocking companion: query a swept volume against the world, add no collider. */
export function droneMotion(world:RAPIER.World,position:TrailPoint,delta:TrailPoint,observer?:RAPIER.Collider){
 const length=Math.hypot(delta.x,delta.y,delta.z);if(length<1e-8)return new THREE.Vector3();
 const direction=new THREE.Vector3(delta.x,delta.y,delta.z).divideScalar(length);
 const hit=world.castShape(position,{x:0,y:0,z:0,w:1},direction,new RAPIER.Ball(DRONE_RADIUS),0,length,true,undefined,undefined,observer);
 return direction.multiplyScalar(hit?Math.max(0,hit.time_of_impact-.015):length);
}
export function droneScanSite(position:TrailPoint,recorded:readonly FieldScan[],anchors:readonly {id:FieldScan;position:TrailPoint}[],visible:(anchor:TrailPoint,id:FieldScan)=>boolean){
 return anchors.filter(a=>!recorded.includes(a.id)&&Math.hypot(a.position.x-position.x,a.position.y-position.y,a.position.z-position.z)<=8&&visible(a.position,a.id)).sort((a,b)=>Math.hypot(a.position.x-position.x,a.position.z-position.z)-Math.hypot(b.position.x-position.x,b.position.z-position.z))[0]?.id;
}
export class SurveyDrone{
 readonly root=new THREE.Group();readonly follow=new DroneFollow();private readonly visual=new THREE.Group();
 private readonly fallback:THREE.Mesh;private mixer?:THREE.AnimationMixer;private loaded=false;private attempted=false;private pending?:Promise<void>;
 private powered=false;private time=0;private scan?:{id:FieldScan;remaining:number};
 constructor(private readonly ground:(x:number,z:number)=>number){
  this.root.name='ECHO survey companion';this.root.visible=false;this.root.add(this.visual);
  this.fallback=new THREE.Mesh(new THREE.OctahedronGeometry(.3,1),new THREE.MeshStandardMaterial({color:0xc0ccd2,metalness:.25,roughness:.55}));this.visual.add(this.fallback);this.arrive(false,{x:0,z:0});
 }
 arrive(recovered:boolean,pad:{x:number;z:number}){
  this.powered=recovered;this.hold();const at=recovered?{x:pad.x-5.6,z:pad.z+5.8}:DRONE_DOCK;
  this.root.position.set(SURFACE_ORIGIN+at.x,this.ground(at.x,at.z)+DRONE_HEIGHT,at.z);this.root.rotation.set(0,0,0);this.visual.position.y=0;this.time=0;this.mixer?.setTime(0);
 }
 recover(){this.powered=true;}
 hold(){this.follow.hold();this.scan=undefined;}
 startFollowing(visitor:TrailPoint){if(!this.powered)return;this.scan=undefined;this.follow.follow(visitor);}
 startScan(id:FieldScan){if(!this.powered||!isFieldScan(id))return;this.hold();this.scan={id,remaining:2};}
 visitor(world:RAPIER.World,position:TrailPoint,observer:RAPIER.Collider){
  const hit=world.castRay(new RAPIER.Ray({x:position.x,y:position.y+.1,z:position.z},{x:0,y:-1,z:0}),5,true,undefined,undefined,observer);
  return {x:position.x,y:(hit?position.y+.1-hit.timeOfImpact:this.ground(position.x-SURFACE_ORIGIN,position.z))+DRONE_HEIGHT,z:position.z};
 }
 step(world:RAPIER.World,visitor:TrailPoint,observer:RAPIER.Collider,dt:number,onFoot=true):FieldScan|undefined{
  if(!this.powered||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
  if(!onFoot){this.hold();return;}
  if(this.scan){this.scan.remaining=Math.max(0,this.scan.remaining-dt);if(this.scan.remaining<=1e-8){const id=this.scan.id;this.scan=undefined;return id;}return;}
  if(this.follow.command!=='follow')return;
  const goal=this.visitor(world,visitor,observer),delta=this.follow.plan(this.root.position,goal,dt),step=droneMotion(world,this.root.position,delta,observer);
  this.root.position.add(step);this.follow.record(Math.hypot(delta.x,delta.y,delta.z),step.length(),dt);
  if(Math.hypot(step.x,step.z)>.0001){const desired=Math.atan2(-step.x,-step.z),angle=Math.atan2(Math.sin(desired-this.root.rotation.y),Math.cos(desired-this.root.rotation.y));this.root.rotation.y+=THREE.MathUtils.clamp(angle,-3*dt,3*dt);}
 }
 animate(dt:number,active:boolean){if(!active||!Number.isFinite(dt)||dt<=0)return;this.time+=Math.min(dt,.25);this.mixer?.update(Math.min(dt,.25));this.visual.position.y=Math.sin(this.time*2)*.025;}
 load(retry=false,loader:()=>Promise<GLTF>=()=>requestedAsset('drone')){
  if(this.pending)return this.pending;if(this.loaded||(this.attempted&&!retry))return;this.attempted=true;
  this.pending=loader().then(asset=>{const model=clone(asset.scene);model.name='CGTrader ECHO';model.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});this.visual.add(model);this.fallback.visible=false;this.loaded=true;this.mixer=new THREE.AnimationMixer(model);for(const clip of asset.animations)this.mixer.clipAction(clip).play();}).catch(()=>console.warn('Survey drone asset unavailable; simple companion fallback retained.')).finally(()=>{this.pending=undefined;});return this.pending;
 }
 snapshot(){return {loaded:this.loaded,powered:this.powered,position:this.root.position.toArray(),...this.follow.snapshot(),scan:this.scan?{...this.scan}:null,time:this.time};}
 waypoint(){return {id:'drone',label:'ECHO survey drone',x:this.root.position.x,z:this.root.position.z,hint:this.powered?'Approach ECHO and press E for Follow, Hold or Scan.':'Bring the relay network online, then reactivate ECHO beside the outpost.'};}
}
