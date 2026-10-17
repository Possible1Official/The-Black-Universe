import * as THREE from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Four real chassis contacts; local queries remain invariant through vehicle tilt. */
export function roverRackFit(actor:THREE.Object3D){
 const body=actor.getObjectByName('Rover_Chassis');if(!body)throw Error('Authored rover chassis unavailable');actor.updateWorldMatrix(true,true);
 const direction=new THREE.Vector3(0,-1,0).transformDirection(actor.matrixWorld),ray=new THREE.Raycaster(),feet:THREE.Vector3[]=[];
 for(const x of [-.3,.3])for(const z of [.27,.73]){ray.set(actor.localToWorld(new THREE.Vector3(x,5,z)),direction);const hit=ray.intersectObject(body,true)[0];if(!hit)throw Error('Rover rear deck has no support');feet.push(actor.worldToLocal(hit.point.clone()));}
 const floor=Math.max(...feet.map(p=>p.y))+.06;if(floor+.03+.36>2.005)throw Error('Cargo exceeds existing rover proxy');return {floor,feet};
}
export class RoverRack{
 readonly root=new THREE.Group();readonly cargo=new THREE.Group();private fitted=false;private attempted?:THREE.Object3D;
 constructor(){this.root.name='Rover rear cargo rack';this.root.add(this.cargo);this.build(1.6,[-.3,.3].flatMap(x=>[.27,.73].map(z=>new THREE.Vector3(x,1.53,z))));}
 fit(actor:THREE.Object3D){const body=actor.getObjectByName('Rover_Chassis');if(this.fitted||!body||body===this.attempted)return;this.attempted=body;const f=roverRackFit(actor);this.build(f.floor,f.feet);this.fitted=true;}
 private build(floor:number,feet:THREE.Vector3[]){
  for(const child of [...this.root.children])if(child!==this.cargo){this.root.remove(child);if(child instanceof THREE.Mesh){child.geometry.dispose();(child.material as THREE.Material).dispose();}}
  const geometry=(parts:{size:[number,number,number];at:[number,number,number]}[])=>mergeGeometries(parts.map(p=>new THREE.BoxGeometry(...p.size).translate(...p.at)))!;
  const parts:{size:[number,number,number];at:[number,number,number]}[]=[{size:[.85,.06,.72],at:[0,floor,.5]}];
  for(const p of feet){const h=Math.max(.025,floor-.03-p.y);parts.push({size:[.045,h,.045],at:[p.x,p.y+h/2,p.z]});}
  const deck=new THREE.Mesh(geometry(parts),new THREE.MeshStandardMaterial({color:0x354853,metalness:.25,roughness:.75}));deck.castShadow=deck.receiveShadow=true;this.root.add(deck);
  const straps:{size:[number,number,number];at:[number,number,number]}[]=[];for(const z of [.3,.7]){straps.push({size:[.79,.025,.035],at:[0,floor+.407,z]});for(const x of [-.395,.395])straps.push({size:[.025,.39,.035],at:[x,floor+.21,z]});}
  const bands=new THREE.Mesh(geometry(straps),new THREE.MeshStandardMaterial({color:0x20282b,roughness:.95}));bands.name='Cargo tie-downs';bands.castShadow=true;this.root.add(bands);this.cargo.position.set(0,floor+.03,.5);this.cargo.scale.setScalar(.6);
 }
 setLoaded(loaded:boolean){this.cargo.visible=loaded;const bands=this.root.getObjectByName('Cargo tie-downs');if(bands)bands.visible=loaded;}
 snapshot(){return {fitted:this.fitted,cargo:this.cargo.visible,cargoLocal:this.cargo.position.toArray()};}
}
