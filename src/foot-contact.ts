import * as THREE from 'three';
import {solveArm} from './rider-contact';

const up=new THREE.Vector3(0,1,0),point=(o:THREE.Object3D)=>o.getWorldPosition(new THREE.Vector3());
export const BOOT_ANKLE_HEIGHT=.126;
const MAX_SHIFT=.18,MAX_DROP=.10;
type Leg={upper:THREE.Bone;lower:THREE.Bone;foot:THREE.Bone;toe:THREE.Bone};
/** Local animation correction for the reviewed biker, not world-space foot locking. */
export class FootContact{
 private readonly legs:Leg[]=[];private hips?:THREE.Bone;
 private readonly rotations=new Map<THREE.Object3D,THREE.Quaternion>();private hipPosition?:THREE.Vector3;
 private results:{weight:number;shift:number;error:number}[]=[];private drop=0;
 constructor(readonly root:THREE.Object3D){
  const bones=new Map<string,THREE.Bone>();root.traverse(o=>{if(o instanceof THREE.Bone)bones.set(o.name.replace(':',''),o);});
  this.hips=bones.get('mixamorigHips');
  for(const side of ['Left','Right']){const b=(suffix:string)=>bones.get('mixamorig'+side+suffix),upper=b('UpLeg'),lower=b('Leg'),foot=b('Foot'),toe=b('ToeBase');if(upper&&lower&&foot&&toe)this.legs.push({upper,lower,foot,toe});}
 }
 restore(){for(const [bone,q]of this.rotations)bone.quaternion.copy(q);this.rotations.clear();if(this.hipPosition&&this.hips)this.hips.position.copy(this.hipPosition);this.hipPosition=undefined;this.results=[];this.drop=0;}
 apply(ground:(x:number,z:number)=>number){
  this.restore();if(!this.hips||this.legs.length!==2)return;this.root.updateWorldMatrix(true,true);
  const origin=point(this.root),rootY=origin.y,support=ground(origin.x,origin.z);
  // Height-field IK must not pull a player standing on a rock/prop into it.
  if(!Number.isFinite(support)||Math.abs(rootY-support)>.25)return;
  const plans=this.legs.map(leg=>{
   const ankle=point(leg.foot),toe=point(leg.toe),h=ground(ankle.x,ankle.z),hx=ground(ankle.x+.12,ankle.z)-ground(ankle.x-.12,ankle.z),hz=ground(ankle.x,ankle.z+.12)-ground(ankle.x,ankle.z-.12);
   // Keep swinging boots in their captured pose. Fade the last 6 cm of lift.
   const lift=ankle.y-rootY-BOOT_ANKLE_HEIGHT,weight=1-THREE.MathUtils.smoothstep(lift,.035,.095);
   const normal=new THREE.Vector3(-hx/.24,1,-hz/.24).normalize();
   const tilt=new THREE.Quaternion().setFromUnitVectors(up,normal),angle=tilt.angleTo(new THREE.Quaternion());if(angle>Math.PI/9)tilt.slerp(new THREE.Quaternion(),1-(Math.PI/9)/angle);
   tilt.slerp(new THREE.Quaternion(),1-weight);
   const toeOffset=toe.clone().sub(ankle).applyQuaternion(tilt),heelOffset=new THREE.Vector3(0,-BOOT_ANKLE_HEIGHT,0).applyQuaternion(tilt);
   const heelY=ground(ankle.x+heelOffset.x,ankle.z+heelOffset.z)-heelOffset.y,toeY=ground(ankle.x+toeOffset.x,ankle.z+toeOffset.z)-toeOffset.y;
   const shift=THREE.MathUtils.clamp(Math.max(heelY,toeY)-ankle.y,-MAX_SHIFT,MAX_SHIFT)*weight;
   return {leg,pole:point(leg.lower),ankle,target:ankle.clone().add(new THREE.Vector3(0,shift,0)),tilt,weight,shift,valid:[h,hx,hz,shift].every(Number.isFinite)};
  });
  if(plans.some(p=>!p.valid)||plans.every(p=>Math.abs(p.shift)<.002&&p.tilt.angleTo(new THREE.Quaternion())<.002))return;
  this.drop=THREE.MathUtils.clamp(Math.min(...plans.map(p=>p.shift)), -MAX_DROP,0);
  this.hipPosition=this.hips.position.clone();const hip=point(this.hips).add(new THREE.Vector3(0,this.drop,0));this.hips.position.copy(this.hips.parent!.worldToLocal(hip));this.root.updateWorldMatrix(true,true);
  for(const p of plans){
   const {upper,lower,foot}=p.leg;for(const bone of [upper,lower,foot])this.rotations.set(bone,bone.quaternion.clone());
   const q=foot.getWorldQuaternion(new THREE.Quaternion()),pole=p.pole;
   // Even a swinging leg follows the pelvis adjustment to retain its source path.
   solveArm(upper,lower,foot,p.target,pole);
   const parent=foot.parent!.getWorldQuaternion(new THREE.Quaternion());foot.quaternion.copy(parent.invert().multiply(p.tilt.clone().multiply(q)));foot.updateWorldMatrix(false,true);
   this.results.push({weight:p.weight,shift:p.shift,error:point(foot).distanceTo(p.target)});
  }
 }
 snapshot(){return {active:this.rotations.size>0,drop:this.drop,legs:this.results.map(p=>({...p}))};}
}
