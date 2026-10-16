import * as THREE from 'three';
export const BIKE_EYE=new THREE.Vector3(0,1.98,.38);
/** Preserve a readable horizontal grip span in portrait without changing 3P. */
export function bikeViewFov(aspect:number){
 const halfHorizontal=Math.tan(THREE.MathUtils.degToRad(33));
 return Math.max(68,THREE.MathUtils.radToDeg(2*Math.atan(halfHorizontal/Math.max(aspect,.25))));
}
/** Share the actual posed skin/maps, render only arm-weighted triangles in 1P. */
export class RiderArmsVisibility{
 private readonly originals:THREE.Mesh[]=[];private readonly arms:THREE.SkinnedMesh[]=[];private readonly saved=new Map<THREE.Mesh,boolean>();
 constructor(root:THREE.Object3D){
  root.traverse(o=>{if(o instanceof THREE.Mesh)this.originals.push(o);});
  for(const mesh of this.originals){
   if(!(mesh instanceof THREE.SkinnedMesh))continue;
   const g=mesh.geometry,weights=g.getAttribute('skinWeight'),joints=g.getAttribute('skinIndex');if(!weights||!joints)continue;
   const armBones=new Set(mesh.skeleton.bones.flatMap((b,i)=>/mixamorig:?(Left|Right)(Arm|ForeArm|Hand)/.test(b.name)?[i]:[]));
   const index=g.index,indices:number[]=[];
   const armVertex=(v:number)=>{let sum=0;for(let a=0;a<4;a++)if(armBones.has(joints.getComponent(v,a)))sum+=weights.getComponent(v,a);return sum>.55;};
   for(let i=0;i<(index?.count??g.getAttribute('position').count);i+=3){const triangle=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(triangle.every(armVertex))indices.push(...triangle);}
   if(!indices.length)continue;
   const geometry=new THREE.BufferGeometry();for(const [name,attribute]of (Object.entries(g.attributes) as [string,THREE.BufferAttribute|THREE.InterleavedBufferAttribute][]))geometry.setAttribute(name,attribute);geometry.setIndex(indices);
   const arms=mesh.clone(false);arms.name='FirstPersonRiderArms';arms.geometry=geometry;arms.visible=false;arms.castShadow=false;arms.frustumCulled=false;mesh.parent!.add(arms);this.arms.push(arms);
  }
 }
 setFirstPerson(first:boolean){
  if(first){for(const mesh of this.originals){if(!this.saved.has(mesh))this.saved.set(mesh,mesh.visible);mesh.visible=false;}}
  else{for(const [mesh,visible]of this.saved)mesh.visible=visible;this.saved.clear();}
  for(const mesh of this.arms)mesh.visible=first;
 }
}
