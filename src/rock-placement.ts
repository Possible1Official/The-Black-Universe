import * as THREE from 'three';
import {ROCK_HULL_VERTICES} from './rock-hull';
/** Seat the rotated hull against the same triangles as rendering/physics. */
export function seatRock(transform:THREE.Object3D,ground:(x:number,z:number)=>number,radius:number){
 const x=transform.position.x,z=transform.position.z;transform.position.y=0;transform.updateMatrix();let support=-Infinity;const contact=new THREE.Vector3();
 for(let i=0;i<ROCK_HULL_VERTICES.length;i+=3){const p=new THREE.Vector3().fromArray(ROCK_HULL_VERTICES,i).applyMatrix4(transform.matrix);const height=ground(p.x,p.z)-p.y;if(height>support){support=height;contact.copy(p);}}
 transform.position.y=support-.06*radius;transform.updateMatrix();contact.y+=transform.position.y;return contact;
}
