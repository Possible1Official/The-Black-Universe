import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
/** Static authored room triangles follow the exact rendered world transform. */
export function meshColliders(world:RAPIER.World,root:THREE.Object3D){
 root.updateWorldMatrix(true,true);const colliders:RAPIER.Collider[]=[],point=new THREE.Vector3();
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.getAttribute('position');if(!p?.count)return;
 const vertices=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);vertices.set([point.x,point.y,point.z],i*3);}
 const indices=o.geometry.index?Uint32Array.from(o.geometry.index.array):Uint32Array.from({length:p.count},(_,i)=>i);
 colliders.push(world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,indices)));
 });return colliders;
}
