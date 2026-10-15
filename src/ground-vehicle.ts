import {PLAYER_SHAPE} from './player-shape';
import RAPIER from '@dimforge/rapier3d-compat';
export type VehicleKind='bike'|'rover';
export const VEHICLE_SPEC={bike:{half:[.57,.75,1.25],maxSpeed:12,seat:.9},rover:{half:[1.05,1,1.8],maxSpeed:14,seat:1.8}} as const;
function spawnGround(world:RAPIER.World,position:{x:number;y:number;z:number},half:readonly number[],exclude?:RAPIER.Collider){
 let height=position.y;
 for(const dx of [-half[0],0,half[0]])for(const dz of [-half[2],0,half[2]]){
  const from={x:position.x+dx,y:position.y+3,z:position.z+dz};const hit=world.castRay(new RAPIER.Ray(from,{x:0,y:-1,z:0}),8,true,undefined,undefined,exclude);
  if(hit)height=Math.max(height,from.y-hit.timeOfImpact);
 }
 return height+.04;
}
export class GroundVehicle{
 readonly body:RAPIER.RigidBody;readonly collider:RAPIER.Collider;readonly controller:RAPIER.KinematicCharacterController;
 yaw=0;speed=0;vertical=0;distance=0;turnRate=0;
 constructor(readonly kind:VehicleKind,readonly world:RAPIER.World,position:{x:number;y:number;z:number}){
  const h=VEHICLE_SPEC[kind].half;this.body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x,spawnGround(world,position,h)+h[1],position.z));this.collider=world.createCollider(RAPIER.ColliderDesc.cuboid(h[0],h[1],h[2]),this.body);
  this.controller=world.createCharacterController(.025);this.controller.enableSnapToGround(.5);this.controller.enableAutostep(kind==='rover'?1:.45,kind==='rover'?.35:.3,true);this.controller.setMaxSlopeClimbAngle(kind==='rover'?Math.PI*.28:Math.PI*.23);
 }
 relocate(position:{x:number;y:number;z:number}){const h=VEHICLE_SPEC[this.kind].half;this.body.setTranslation({x:position.x,y:spawnGround(this.world,position,h,this.collider)+h[1],z:position.z},true);this.body.setNextKinematicTranslation(this.body.translation());this.speed=this.vertical=this.turnRate=0;this.yaw=0;this.body.setRotation({x:0,y:0,z:0,w:1},true);this.body.setNextKinematicRotation({x:0,y:0,z:0,w:1});}
 step(steer:number,throttle:number,brake:boolean,dt:number,passenger?:RAPIER.Collider){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
  const target=brake?0:Math.max(0,Math.min(1,throttle))*VEHICLE_SPEC[this.kind].maxSpeed;this.speed+=(target-this.speed)*(1-Math.exp(-(brake?8:2)*dt));
  this.turnRate=-Math.max(-1,Math.min(1,steer))*Math.min(1,this.speed/2)*1.2;this.yaw+=this.turnRate*dt;
  this.body.setNextKinematicRotation({x:0,y:Math.sin(this.yaw/2),z:0,w:Math.cos(this.yaw/2)});
  this.vertical=this.controller.computedGrounded()?-.4:Math.max(-20,this.vertical-9.81*dt);
  const p=this.body.translation(),h=VEHICLE_SPEC[this.kind].half;let lift=this.vertical*dt;
  // Round stones do not provide the flat top required by Rapier autostep.
  // Probe the leading footprint and request a bounded, collision-resolved lift.
  if(this.speed>.1){const sin=Math.sin(this.yaw),cos=Math.cos(this.yaw),ahead=h[2]+this.speed*dt+.12;
   for(const side of [-.8,0,.8]){const height=this.supportHeight(p.x+side*h[0]*cos-ahead*sin,p.z-side*h[0]*sin-ahead*cos,passenger);if(height===undefined)continue;const rise=height-(p.y-h[1]);if(rise>0&&rise<=(this.kind==='rover'?1:.45))lift=Math.max(lift,rise+.025);}
  }
  this.controller.computeColliderMovement(this.collider,{x:-Math.sin(this.yaw)*this.speed*dt,y:lift,z:-Math.cos(this.yaw)*this.speed*dt},undefined,undefined,c=>c.handle!==passenger?.handle);const m=this.controller.computedMovement();
  this.body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});this.distance+=Math.hypot(m.x,m.z);
  if(this.speed>1&&Math.hypot(m.x,m.z)<this.speed*dt*.15)this.speed=0;
 }
 supportHeight(x:number,z:number,passenger?:RAPIER.Collider){
  const p=this.body.translation(),from={x,y:p.y+1.5,z};
  const hit=this.world.castRay(new RAPIER.Ray(from,{x:0,y:-1,z:0}),VEHICLE_SPEC[this.kind].half[1]+4,true,undefined,undefined,this.collider,undefined,c=>c.handle!==passenger?.handle);
  return hit?from.y-hit.timeOfImpact:undefined;
 }
 snapshot(){return {kind:this.kind,position:this.body.translation(),yaw:this.yaw,speed:this.speed,distance:this.distance,turnRate:this.turnRate};}
}
// Try clear nearby ground, never force a dismount through another solid.
export function dismountPosition(world:RAPIER.World,vehicle:GroundVehicle,observer:RAPIER.Collider,ground:(x:number,z:number)=>number){
 const p=vehicle.body.translation(),radius=vehicle.kind==='rover'?3.1:2.4;
 for(const angle of [Math.PI/2,-Math.PI/2,Math.PI,-Math.PI/4,Math.PI/4]){
  const x=p.x+Math.sin(vehicle.yaw+angle)*radius,z=p.z+Math.cos(vehicle.yaw+angle)*radius,y=ground(x,z)+.9;
  let blocked=false;world.intersectionsWithShape({x,y,z},{x:0,y:0,z:0,w:1},new RAPIER.Capsule(PLAYER_SHAPE.halfHeight,PLAYER_SHAPE.radius),()=>{blocked=true;return false;},undefined,undefined,observer,undefined,c=>c.handle!==vehicle.collider.handle);
  if(!blocked)return {x,y,z};
 }
 return null;
}
