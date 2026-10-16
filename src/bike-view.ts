import * as THREE from 'three';
// Loading-failure fallback; the licensed rider uses its actual skinned eyes.
export const BIKE_EYE=new THREE.Vector3(0,1.98,.38);
export function bikeViewFov(aspect:number){
 const halfHorizontal=Math.tan(THREE.MathUtils.degToRad(55));
 return Math.max(68,THREE.MathUtils.radToDeg(2*Math.atan(halfHorizontal/Math.max(aspect,.25))));
}
const headPart=(name:string)=>/^(face$|Hair$|eye|24_mouth)|glass/i.test(name);
/** Full original body/garments; only face parts around the camera hide in 1P. */
export class RiderBodyVisibility{
 private readonly head:THREE.Mesh[]=[];
 private readonly saved=new Map<THREE.Mesh,boolean>();
 private eyeMesh?:THREE.SkinnedMesh;private readonly eyeCenter=new THREE.Vector3();
 firstPerson=false;
 constructor(root:THREE.Object3D){
  root.traverse(o=>{if(o instanceof THREE.Mesh&&headPart(o.name))this.head.push(o);});
  const right=root.getObjectByName('eye_R'),left=root.getObjectByName('eye_L_1');
  if(right instanceof THREE.SkinnedMesh&&left instanceof THREE.SkinnedMesh){
   right.geometry.computeBoundingBox();left.geometry.computeBoundingBox();
   this.eyeCenter.copy(right.geometry.boundingBox!.getCenter(new THREE.Vector3())).add(left.geometry.boundingBox!.getCenter(new THREE.Vector3())).multiplyScalar(.5);
   // Both meshes share model-local coordinates. Right-eye vertices use the
   // head joint; apply that same binding to the midpoint between both eyes.
   this.eyeMesh=right;
  }
 }
 eye(target:THREE.Vector3,root:THREE.Object3D){
  if(!this.eyeMesh)return root.getObjectByName('mixamorigHead')?.getWorldPosition(target)??target;
  const eye=this.eyeMesh;eye.updateWorldMatrix(true,false);eye.updateMatrixWorld(true);
  target.copy(this.eyeCenter);eye.applyBoneTransform(0,target);eye.localToWorld(target);
  // Small helmet-camera clearance keeps the close collar outside the lens.
  const rotation=root.getWorldQuaternion(new THREE.Quaternion());
  return target.addScaledVector(new THREE.Vector3(0,0,1).applyQuaternion(rotation),.10);
 }
 setFirstPerson(first:boolean){
  this.firstPerson=first;
  if(first){for(const mesh of this.head){if(!this.saved.has(mesh))this.saved.set(mesh,mesh.visible);mesh.visible=false;}}
  else{for(const [mesh,visible]of this.saved)mesh.visible=visible;this.saved.clear();}
 }
}
