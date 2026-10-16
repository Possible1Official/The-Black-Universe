import * as THREE from 'three';
export const SPACE_COLOR=0x02050d;
export const FORGE_CENTER=[430,120,-550] as const;
/** One set of space objects survives local/orbital render-scene changes. */
export class SharedSpace{
 readonly root=new THREE.Group();
 constructor(readonly stars:THREE.Points,...bodies:THREE.Object3D[]){this.root.name='Shared orbital backdrop';this.root.add(stars,...bodies);}
 present(scene:THREE.Scene,observer:THREE.Vector3){
  // Both game scene roots use sector coordinates. Reparent, never clone or
  // recreate materials/animations. Keep visibility owned by surface travel.
  if(this.root.parent!==scene)scene.add(this.root);
  // Distant stars have angular directions, not meter-scale travel parallax.
  this.stars.position.copy(observer);
 }
}
