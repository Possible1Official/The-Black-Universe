import * as THREE from 'three';
import {ROCK_HULL_VERTICES} from './rock-hull';
export const ROCK_TILT_LIMIT=12*Math.PI/180;
/** Keep the scan on its broad side; only yaw varies freely. */
export function orientRock(transform:THREE.Object3D,ground:(x:number,z:number)=>number,radius:number,yaw:number){
 const {x,z}=transform.position,d=Math.max(.2,radius*.6),normal=new THREE.Vector3(ground(x-d,z)-ground(x+d,z),2*d,ground(x,z-d)-ground(x,z+d)).normalize();
 const tilt=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal),angle=2*Math.acos(THREE.MathUtils.clamp(tilt.w,-1,1));
 if(angle>ROCK_TILT_LIMIT)tilt.slerp(new THREE.Quaternion(),1-ROCK_TILT_LIMIT/angle);
 transform.quaternion.copy(tilt).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
}
/** Bury a broad lower band instead of balancing the lowest single vertex on the ground. */
export function seatRock(transform:THREE.Object3D,ground:(x:number,z:number)=>number,radius:number){
 transform.position.y=0;transform.updateMatrix();let support=-Infinity,low=Infinity,high=-Infinity;const points:THREE.Vector3[]=[];
 for(let i=0;i<ROCK_HULL_VERTICES.length;i+=3){const p=new THREE.Vector3().fromArray(ROCK_HULL_VERTICES,i).applyMatrix4(transform.matrix);support=Math.max(support,ground(p.x,p.z)-p.y);low=Math.min(low,p.y);high=Math.max(high,p.y);points.push(p);}
 const burial=Math.max(.12*radius,(high-low)*.24);transform.position.y=support-burial;transform.updateMatrix();
 const contact=new THREE.Vector3();let count=0;
 for(const p of points){p.y+=transform.position.y;if(p.y<=ground(p.x,p.z)+.015){contact.add(p);count++;}}
 return count?contact.multiplyScalar(1/count):new THREE.Vector3(transform.position.x,ground(transform.position.x,transform.position.z),transform.position.z);
}
