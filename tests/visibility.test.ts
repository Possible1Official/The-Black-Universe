import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {clearSight,attendVisitor} from '../src/visibility';
import {freshPatrol,planPatrol} from '../src/patrol';
import {planEngineeringDuty} from '../src/crew-duty';

test('Rapier sight blocks the observed wall/panel exploit and follows a moving door',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  const wall=world.createCollider(RAPIER.ColliderDesc.cuboid(.2,2.75,10).setTranslation(-11,2.5,-6));
  const panel=world.createCollider(RAPIER.ColliderDesc.cuboid(.9,.55,.5).setTranslation(-10,.55,3.2));world.step();
  assert.equal(clearSight(world,{x:-12,y:1.64,z:3.2},{x:-10,y:1.1,z:3.2},undefined,panel),false);
  assert.equal(clearSight(world,{x:-10,y:1.64,z:4.85},{x:-10,y:1.1,z:3.2},undefined,panel),true);
  const door=world.createCollider(RAPIER.ColliderDesc.cuboid(.14,1.6,1.95).setTranslation(-11,1.6,6));world.step();
  const from={x:-12,y:1.7,z:6},to={x:-10,y:1.7,z:6};assert.equal(clearSight(world,from,to),false);
  door.setTranslation({x:-11,y:5.3,z:6});world.step();assert.equal(clearSight(world,from,to),true);
  wall.setTranslation({x:-11,y:2.5,z:6});world.step();assert.equal(clearSight(world,from,to),false);world.free();
});
test('sight ignores endpoint bodies while another crew body still obstructs',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  const observer=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3).setTranslation(0,.9,0));
  const target=world.createCollider(RAPIER.ColliderDesc.capsule(.67,.24).setTranslation(0,.925,2));world.step();
  const from={x:0,y:1.64,z:0},to={x:0,y:1.375,z:2};
  assert.equal(clearSight(world,from,to),false);assert.equal(clearSight(world,from,to,observer,target),true);
  const blocker=world.createCollider(RAPIER.ColliderDesc.capsule(.67,.24).setTranslation(0,.925,1));world.step();
  assert.equal(clearSight(world,from,to,observer,target),false);blocker.setTranslation({x:2,y:.925,z:1});world.step();assert.equal(clearSight(world,from,to,observer,target),true);
  assert.equal(clearSight(world,from,from,observer,target),true);world.free();
});
test('surface sample/beacon own colliders do not make their interaction anchors unreachable',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  const sample=world.createCollider(RAPIER.ColliderDesc.ball(.6).setTranslation(9,.45,-9));
  const beacon=world.createCollider(RAPIER.ColliderDesc.cuboid(.16,1.2,.16).setTranslation(0,1.2,22.4));world.step();
  assert.equal(clearSight(world,{x:9,y:1.7,z:-7.35},{x:9,y:.8,z:-9},undefined,sample),true);
  assert.equal(clearSight(world,{x:0,y:1.7,z:24.05},{x:0,y:1.2,z:22.4},undefined,beacon),true);world.free();
});
test('occluded visitors do not attract patrol/duty attention; personal space, conversation and visible hysteresis remain',()=>{
  assert.equal(attendVisitor(1.6,false,false,false),false);assert.equal(attendVisitor(2,true,false,true),true);assert.equal(attendVisitor(2.3,true,false,true),false);
  assert.equal(attendVisitor(.6,false,false,false),true);assert.equal(attendVisitor(10,false,true,false),true);
  const route=[{x:-16,z:7},{x:-14.5,z:8.5}] as const,p={x:-15,z:8},visitor={x:-15,z:9.5};
  assert.equal(planPatrol(freshPatrol(),p,route,visitor,1/60,false,false).state.mode,'patrolling');
  const duty=planEngineeringDuty(null,freshPatrol(),p,route,visitor,1/60,true,false,false);assert.equal(duty.state.mode,'patrolling');
  const visible=planEngineeringDuty(duty.duty,duty.state,p,route,visitor,1/60,true,false,true);assert.equal(visible.state.mode,'attending');
  const hidden=planEngineeringDuty(visible.duty,visible.state,p,route,visitor,1/60,true,false,false);assert.equal(hidden.state.mode,'patrolling');assert.deepEqual(hidden.duty?.path,visible.duty?.path);
});
