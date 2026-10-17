import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {GroundVehicle,VEHICLE_SPEC,dismountPosition,type VehicleKind} from './ground-vehicle';
import {VehicleStance} from './vehicle-stance';
import {VehicleSuspension} from './vehicle-suspension';
import {attachRequested} from './requested-assets';
import {TurboFeedback} from './turbo-feedback';
import {targetThrottle} from './pilot-controls';
import {BIKE_RIDER_SEAT} from './rider-contact';
import {BIKE_EYE,bikeViewFov} from './bike-view';
import {flightCamera,surfaceCameraDistance} from './view-camera';
import type {CrewVisual} from './crew-visual';
import type {SurfaceContact} from './surface-contact';

const parking={bike:{x:7,z:29},rover:{x:-8,z:29}};
export class VesperVehicles{
 readonly vehicles=new Map<VehicleKind,GroundVehicle>();readonly actors=new Map<VehicleKind,THREE.Group>();
 private stances=new Map<VehicleKind,VehicleStance>();private springs=new Map<VehicleKind,VehicleSuspension>();
 private pending?:Promise<void>;private turbo=new TurboFeedback();private braking=false;riding:GroundVehicle|null=null;demand=0;
 constructor(readonly world:RAPIER.World,scene:THREE.Scene,readonly player:RAPIER.RigidBody,readonly collider:RAPIER.Collider,readonly ground:(x:number,z:number)=>number){
  for(const kind of ['bike','rover'] as const){const p=parking[kind],vehicle=new GroundVehicle(kind,world,{...p,y:ground(p.x,p.z)}),actor=new THREE.Group(),h=VEHICLE_SPEC[kind].half;actor.name='Vesper '+kind;
   const fallback=new THREE.Mesh(new THREE.BoxGeometry(h[0]*2,h[1],h[2]*2),new THREE.MeshStandardMaterial({color:0x62747b,metalness:.6,roughness:.5}));fallback.position.y=h[1];actor.add(fallback);scene.add(actor);this.vehicles.set(kind,vehicle);this.actors.set(kind,actor);this.stances.set(kind,new VehicleStance());this.springs.set(kind,new VehicleSuspension(kind));
  }
  world.step();
 }
 load(){if(this.pending)return this.pending;this.pending=Promise.all([...this.actors].map(([kind,actor])=>actor.userData.requested?undefined:attachRequested(kind,actor).catch(()=>console.warn('Vesper '+kind+' fallback retained; re-entry retries.')))).then(()=>{}).finally(()=>{this.pending=undefined;});return this.pending;}
 reset(calibrated=false){this.riding=null;this.demand=0;this.collider.setEnabled(true);for(const [kind,v]of this.vehicles){const p=parking[kind];v.relocate({...p,y:this.ground(p.x,p.z)});v.distance=0;v.driveCalibrated=kind==='rover'&&calibrated;this.stances.set(kind,new VehicleStance());}this.world.step();}
 stop(){this.demand=0;this.braking=true;if(this.riding){this.riding.speed=0;this.riding.turnRate=0;}}
 private candidate(yaw:number,pitch:number){const p=this.player.translation(),eye=new THREE.Vector3(p.x,p.y+.74,p.z),forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));let found:GroundVehicle|undefined,best=3.4;
  for(const v of this.vehicles.values()){const q=v.body.translation(),delta=new THREE.Vector3(q.x,q.y+.25,q.z).sub(eye),distance=delta.length();if(distance>=best||delta.normalize().dot(forward)<.45)continue;const hit=this.world.castRay(new RAPIER.Ray(eye,delta),distance,true,undefined,undefined,this.collider,undefined,c=>c.handle!==v.collider.handle);if(!hit){found=v;best=distance;}}
  return found;
 }
 prompt(yaw:number,pitch:number){if(this.riding)return this.riding.speed>.6?'Brake to dismount':'Dismount '+this.riding.kind;const v=this.candidate(yaw,pitch);return v?'Ride '+v.kind:'';}
 interact(yaw:number,pitch:number):{message:string;mounted?:boolean;heading?:number}|null{
  if(this.riding){const v=this.riding;if(v.speed>.6)return {message:'Brake before dismounting.'};const p=dismountPosition(this.world,v,this.collider,this.ground);if(!p)return {message:'No clear ground beside the vehicle. Move to an open area.'};this.stop();this.player.setTranslation(p,true);this.player.setNextKinematicTranslation(p);this.collider.setEnabled(true);this.riding=null;this.world.step();return {message:'On foot / Vesper.',heading:v.yaw+yaw};}
  const v=this.candidate(yaw,pitch);if(!v)return null;this.riding=v;this.demand=0;v.speed=0;this.collider.setEnabled(false);this.carry();return {message:'Left slider: speed. Right joystick: steering. Brake, then E to dismount.',mounted:true};
 }
 private carry(){const v=this.riding!;const p=v.body.translation(),q={x:p.x,y:p.y+VEHICLE_SPEC[v.kind].seat,z:p.z};this.player.setTranslation(q,true);this.player.setNextKinematicTranslation(q);}
 step(steer:number,throttle:number,brake:boolean,dt:number){if(!this.riding)return;this.braking=brake;this.demand=targetThrottle(this.demand,throttle,dt);if(brake)this.demand=Math.max(0,this.demand-dt*1.8);this.riding.step(steer,this.demand,brake,dt,this.collider);this.world.step();this.carry();}
 present(dt:number,camera:THREE.PerspectiveCamera,avatar:THREE.Group,visual:CrewVisual|undefined,yaw:number,pitch:number,third:boolean,contact:SurfaceContact){
  for(const [kind,v]of this.vehicles){const actor=this.actors.get(kind)!,p=v.body.translation(),support=(x:number,z:number)=>v.supportHeight(x,z,this.collider)??this.ground(x,z);this.stances.get(kind)!.update(kind,actor,p.x,p.y,p.z,v.yaw,support,dt,v.turnRate,v.speed);
   if(kind==='rover'&&actor.userData.requested)for(const side of ['FrontLeft','FrontRight','RearLeft','RearRight']){const wheel=actor.getObjectByName('Rover_Wheel_'+side),knuckle=actor.getObjectByName('Rover_Knuckle_'+side),front=side.startsWith('Front');if(wheel)wheel.rotation.set(-v.distance/(front?.398:.501),0,0);if(knuckle)knuckle.rotation.y=front?THREE.MathUtils.clamp(Math.atan(v.turnRate*2.62/Math.max(v.speed,1)),-.45,.45):0;}
   const spring=this.springs.get(kind)!;spring.update(actor,support,dt);if(kind==='bike'){if(this.turbo.root.parent!==actor)actor.add(this.turbo.root);this.turbo.update(this.riding===v,third&&actor.userData.requested==='bike',this.braking,this.demand,v.speed,dt);this.turbo.root.position.y=.409+spring.podOffset;}
   contact.update(kind,{x:actor.position.x,y:actor.position.y,z:actor.position.z,yaw:v.yaw,visible:true},this.ground(p.x,p.z));
  }
  const v=this.riding;if(!v)return;contact.update('player',{x:0,y:0,z:0,yaw:0,visible:false},0);const actor=this.actors.get(v.kind)!;actor.updateWorldMatrix(true,false);const bike=v.kind==='bike',fit=bike&&avatar.userData.requested==='biker'&&actor.userData.requested==='bike';
  camera.fov=bike&&!third?bikeViewFov(camera.aspect):68;camera.near=bike&&!third?.02:.08;camera.updateProjectionMatrix();camera.position.copy(actor.localToWorld(bike&&!third?BIKE_EYE.clone():new THREE.Vector3(0,VEHICLE_SPEC[v.kind].half[1]+1.2,0)));camera.rotation.set(pitch,v.yaw+yaw,0,'YXZ');
  avatar.visible=bike;avatar.position.copy(actor.localToWorld(fit?BIKE_RIDER_SEAT.clone():new THREE.Vector3(0,VEHICLE_SPEC[v.kind].seat-.9,.43)));actor.getWorldQuaternion(avatar.quaternion);avatar.rotateY(Math.PI);
  if(fit){visual?.fitBikeContact(actor);visual?.setBikeFirstPerson(!third);if(!third){visual?.bikeEye(camera.position);camera.rotation.set(pitch+actor.rotation.x,v.yaw+yaw,actor.rotation.z,'YXZ');}}
  if(third){const pose=flightCamera(camera.position,new THREE.Euler(pitch,v.yaw+yaw,0,'YXZ'),(a,b)=>surfaceCameraDistance(this.world,a,b,this.collider,v.collider));camera.position.copy(pose.position);camera.lookAt(pose.target);}
 }
 snapshot(){return {riding:this.riding?.kind??null,demand:this.demand,vehicles:[...this.vehicles].map(([kind,v])=>({...v.snapshot(),loaded:!!this.actors.get(kind)!.userData.requested,suspension:this.springs.get(kind)!.snapshot()}))};}
}
