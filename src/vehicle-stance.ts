import * as THREE from 'three';
import type {VehicleKind} from './ground-vehicle';
import {VEHICLE_SPEC} from './ground-vehicle';
import {SITE_HALF} from './excursion';

// Sample the same two triangles per grid cell used by render/Rapier, rather
// than evaluating a curved analytic height between the exported vertices.
export function terrainSampler(vertices:Float32Array,half=SITE_HALF){
 const segments=Math.sqrt(vertices.length/3)-1,spacing=half*2/segments;
 return (x:number,z:number)=>{
  const gx=THREE.MathUtils.clamp((x+half)/spacing,0,segments),gz=THREE.MathUtils.clamp((z+half)/spacing,0,segments);
  const ix=Math.min(segments-1,Math.floor(gx)),iz=Math.min(segments-1,Math.floor(gz)),u=gx-ix,v=gz-iz;
  const a=(iz*(segments+1)+ix)*3+1,b=a+3,c=a+(segments+1)*3,d=c+3;
  return u+v<=1?vertices[a]+u*(vertices[b]-vertices[a])+v*(vertices[c]-vertices[a]):vertices[d]+(1-u)*(vertices[c]-vertices[d])+(1-v)*(vertices[b]-vertices[d]);
 };
}
export const STANCE_LIMIT=22*Math.PI/180;
const supports={bike:{width:.32,front:-.8,rear:.8},rover:{width:.79,front:-1.365,rear:1.254}};
export function terrainStance(kind:VehicleKind,x:number,z:number,yaw:number,baseHeight:number,ground:(x:number,z:number)=>number){
 const s=supports[kind],sin=Math.sin(yaw),cos=Math.cos(yaw);
 const height=(dx:number,dz:number)=>ground(x+dx*cos+dz*sin,z-dx*sin+dz*cos);
 const fl=height(-s.width,s.front),fr=height(s.width,s.front),rl=height(-s.width,s.rear),rr=height(s.width,s.rear);
 const mean=Math.max((fl+fr+rl+rr)/4,ground(x,z)-(kind==='rover'?.4:.16));
 // Never pull a falling/airborne vehicle toward the terrain with a visual pose.
 if(baseHeight-mean>.7)return {pitch:0,roll:0,offset:0};
 return {pitch:THREE.MathUtils.clamp(Math.atan2((fl+fr-rl-rr)/2,s.rear-s.front),-STANCE_LIMIT,STANCE_LIMIT),roll:THREE.MathUtils.clamp(Math.atan2((fr+rr-fl-rl)/2,s.width*2),-STANCE_LIMIT,STANCE_LIMIT),offset:THREE.MathUtils.clamp(mean+.04-baseHeight,kind==='rover'?-.9:-.5,.5)};
}
// Visual-only support fit; upright Rapier proxy is retained, rather than rigid-body suspension.
export class VehicleStance{
 pitch=0;roll=0;offset=0;private x=Infinity;private z=Infinity;private height=0;
 update(kind:VehicleKind,mesh:THREE.Object3D,x:number,y:number,z:number,yaw:number,ground:(x:number,z:number)=>number,dt:number,turnRate=0,speed=0){
  const halfHeight=VEHICLE_SPEC[kind].half[1],target=terrainStance(kind,x,z,yaw,y-halfHeight,ground);
  const reset=Math.hypot(x-this.x,z-this.z)>8,blend=reset?1:1-Math.exp(-5*Math.max(0,Math.min(dt,.1)));
  if(kind==='bike')target.roll+=THREE.MathUtils.clamp(Math.atan(speed*turnRate/9.81)*.7,-.42,.42);
  this.pitch+=(target.pitch-this.pitch)*blend;this.roll+=(target.roll-this.roll)*blend;this.offset+=(target.offset-this.offset)*blend;this.x=x;this.z=z;
  const desired=y+this.offset;this.height=reset?desired:this.height+(desired-this.height)*blend;this.height=THREE.MathUtils.clamp(this.height,y-(kind==='rover'?.9:.5),y+.5);
  mesh.rotation.set(this.pitch,yaw,this.roll,'YXZ');
  mesh.position.set(0,-halfHeight,0).applyQuaternion(mesh.quaternion).add(new THREE.Vector3(x,this.height,z));
 }
}
