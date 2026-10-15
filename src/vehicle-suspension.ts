import * as THREE from 'three';
import type {VehicleKind} from './ground-vehicle';
const housingGeo=new THREE.CylinderGeometry(.045,.045,1,8),rodGeo=new THREE.CylinderGeometry(.018,.018,1,8);
const coilPoints=Array.from({length:49},(_,i)=>new THREE.Vector3(Math.cos(i/48*Math.PI*8)*.055,i/48-.5,Math.sin(i/48*Math.PI*8)*.055));
const coilGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints),48,.009,4,false);
const housingMaterial=new THREE.MeshStandardMaterial({color:0x333b40,metalness:.65,roughness:.55});
const steelMaterial=new THREE.MeshStandardMaterial({color:0x889197,metalness:.8,roughness:.4});
export function springStep(value:number,velocity:number,target:number,dt:number,limit:number){
 for(let remaining=Math.min(Math.max(dt,0),.1);remaining>0;){const h=Math.min(remaining,1/120);velocity+=((target-value)*180-velocity*26)*h;value+=velocity*h;remaining-=h;}
 if(Math.abs(value)>limit){value=THREE.MathUtils.clamp(value,-limit,limit);velocity=0;}return {value,velocity};
}
export class VehicleSuspension{
 readonly root=new THREE.Group();private joints:THREE.Object3D[]=[];private rests:THREE.Vector3[]=[];private velocities:number[]=[];readonly offsets:number[]=[];podOffset=0;
 private pod?:THREE.Group;private built=false;
 private readonly housing:THREE.InstancedMesh;private readonly rods:THREE.InstancedMesh;private readonly coils:THREE.InstancedMesh;
 constructor(readonly kind:VehicleKind){const count=kind==='rover'?4:2;this.root.name='VehicleSuspension';this.housing=new THREE.InstancedMesh(housingGeo,housingMaterial,count);this.rods=new THREE.InstancedMesh(rodGeo,steelMaterial,count);this.coils=new THREE.InstancedMesh(coilGeo,steelMaterial,count);for(const m of [this.housing,this.rods,this.coils]){m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;this.root.add(m);}}
 private bind(actor:THREE.Group){
  if(this.built||!actor.userData.requested)return;this.built=true;actor.add(this.root);
  if(this.kind==='rover')this.joints=['FrontLeft','FrontRight','RearLeft','RearRight'].map(s=>actor.getObjectByName('Rover_Wheel_'+s)!);
  else {const source=actor.children.find(o=>o.name==='requested-bike');const engine=source?.children.find(o=>o.name.startsWith('uploads_files_2776142'));if(engine){this.pod=new THREE.Group();this.pod.name='BikeSuspensionPod';actor.add(this.pod);this.pod.attach(engine);}this.joints=[];}
  this.rests=this.joints.map(o=>o.position.clone());this.velocities=Array(this.kind==='rover'?4:1).fill(0);this.offsets.push(...this.velocities);
 }
 update(actor:THREE.Group,ground:(x:number,z:number)=>number,dt:number){
  this.bind(actor);if(!this.built||dt<=0)return;actor.updateWorldMatrix(true,true);const up=new THREE.Vector3(0,1,0).applyQuaternion(actor.quaternion),scratch=new THREE.Object3D(),top=new THREE.Vector3(),bottom=new THREE.Vector3();
  if(this.kind==='rover')for(let i=0;i<4;i++){
   const rest=this.rests[i],world=actor.localToWorld(rest.clone()),radius=i<2?.398:.501,target=THREE.MathUtils.clamp((ground(world.x,world.z)+radius-world.y)/Math.max(.5,up.y),-.55,.55),spring=springStep(this.offsets[i],this.velocities[i],target,dt,.55);this.offsets[i]=spring.value;this.velocities[i]=spring.velocity;this.joints[i].position.y=rest.y+spring.value;
  }else if(this.pod){
   const a=actor.localToWorld(new THREE.Vector3(0,0,-.8)),b=actor.localToWorld(new THREE.Vector3(0,0,.8)),target=THREE.MathUtils.clamp(((ground(a.x,a.z)-a.y)+(ground(b.x,b.z)-b.y))/2/Math.max(.5,up.y),-.22,.22),spring=springStep(this.offsets[0],this.velocities[0],target,dt,.22);this.offsets[0]=spring.value;this.velocities[0]=spring.velocity;this.podOffset=spring.value;this.pod.position.y=spring.value;
  }
  for(let i=0;i<(this.kind==='rover'?4:2);i++){
   if(this.kind==='rover'){const r=this.rests[i];top.set(Math.sign(r.x)*.5,.95,r.z);bottom.copy(r);bottom.y+=this.offsets[i];}
   else{top.set(.19,.72,i===0?-.6:.6);bottom.set(.19,.38+this.podOffset,i===0?-.6:.6);}
   const direction=bottom.clone().sub(top),length=direction.length();scratch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
   for(const [mesh,fraction,at] of [[this.housing,.55,.275],[this.rods,.75,.625],[this.coils,.65,.4]] as const){scratch.position.copy(top).lerp(bottom,at);scratch.scale.set(1,length*fraction,1);scratch.updateMatrix();mesh.setMatrixAt(i,scratch.matrix);mesh.instanceMatrix.needsUpdate=true;}
  }
 }
 snapshot(){return {offsets:[...this.offsets],podOffset:this.podOffset};}
}
