import {test} from 'node:test';import assert from 'node:assert/strict';import RAPIER from '@dimforge/rapier3d-compat';
import {VesperSurface} from '../src/vesper-surface';import {VESPER_APPROACH,VESPER_HALF,vesperMesh} from '../src/vesper';import {terrainSampler} from '../src/vehicle-stance';
const idle={x:0,z:0,yaw:0,run:false,jump:false};
function place(s:VesperSurface,x:number,z:number){const p={x,y:s.vehicles.ground(x,z)+.9,z};s.player.setTranslation(p,true);s.player.setNextKinematicTranslation(p);s.world.step();}

test('Vesper vehicle support samples the actual smaller mesh rather than Nysa coordinates',async()=>{
 await RAPIER.init();const s=new VesperSurface();try{const ground=terrainSampler(vesperMesh().vertices,VESPER_HALF);for(const [x,z]of [[7.13,29.14],[-12.27,13.51],[24.16,-15.25],[-32.4,-30.8]]){const hit=s.world.castRay(new RAPIER.Ray({x,y:30,z},{x:0,y:-1,z:0}),50,true,undefined,undefined,undefined,undefined,c=>c.handle===s.terrain.handle);assert.ok(hit);assert.ok(Math.abs(ground(x,z)-(30-hit.timeOfImpact))<.0001);}}finally{s.world.free();}
});
test('real Vesper vehicle mounting is local and occlusion checked; braking gates safe dismount and walking resumes',async()=>{
 await RAPIER.init();const s=new VesperSurface();s.load=()=>undefined;s.phase='walking';try{
  assert.equal(s.vehicles.interact(0,-.2),null);place(s,7,31.7);const wall=s.world.createCollider(RAPIER.ColliderDesc.cuboid(1,2,.1).setTranslation(7,1,30.9));s.world.step();assert.equal(s.vehicles.interact(0,-.2),null);s.world.removeCollider(wall,true);s.world.step();
  assert.equal(s.interact(0,-.2)?.mounted,true);assert.equal(s.collider.isEnabled(),false);const bike=s.vehicles.riding!;const before=bike.body.translation();s.vehicles.demand=.6;for(let i=0;i<100;i++)s.step(1/60,{...idle});assert.ok(bike.distance>3);assert.ok(bike.body.translation().z<before.z-3);assert.equal(s.step(1/60,idle).distance,0);assert.match(s.interact(0,-.2)!.message,/Brake/);assert.equal(s.vehicles.riding,bike);
  for(let i=0;i<100;i++)s.step(1/60,{...idle,brake:true});assert.ok(bike.speed<.01);const exit=s.interact(.3,-.2);assert.equal(exit?.heading,bike.yaw+.3);assert.equal(s.vehicles.riding,null);assert.equal(s.collider.isEnabled(),true);const p=s.player.translation();for(let i=0;i<60;i++)s.step(1/60,{...idle,x:1});assert.ok(Math.hypot(s.player.translation().x-p.x,s.player.translation().z-p.z)>.5);
 }finally{s.world.free();}
});
test('rover steering stays independent of camera look, pause clears demand, re-entry restores capsule and bounded equipment',async()=>{
 await RAPIER.init();const s=new VesperSurface();s.load=()=>undefined;s.phase='walking';try{
  place(s,-8,31.8);assert.equal(s.interact(0,-.2)?.mounted,true);const rover=s.vehicles.riding!;assert.equal(rover.kind,'rover');s.vehicles.demand=.6;for(let i=0;i<90;i++)s.step(1/60,{...idle,yaw:1.8});assert.equal(rover.yaw,0,'camera look never drives steering');for(let i=0;i<30;i++)s.step(1/60,{...idle,x:.4});assert.ok(rover.yaw<-.1);s.clearMotion();assert.equal(s.vehicles.demand,0);assert.equal(rover.speed,0);
  const n=s.world.colliders.len();s.arrive(VESPER_APPROACH,[],false,{yaw:0,pitch:0},true);assert.equal(s.vehicles.riding,null);assert.equal(s.collider.isEnabled(),true);assert.equal(s.vehicles.vehicles.get('rover')!.maxSpeed,16);for(let i=0;i<3;i++)s.arrive(VESPER_APPROACH,[],false);assert.equal(s.world.colliders.len(),n);for(const v of s.vehicles.vehicles.values()){assert.equal(v.speed,0);assert.equal(v.distance,0);assert.equal(v.yaw,0);}
 }finally{s.world.free();}
});
