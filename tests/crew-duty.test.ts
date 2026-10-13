import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {engineeringPath,planEngineeringDuty,recordDutyMovement,type EngineeringDuty} from '../src/crew-duty';
import {freshPatrol} from '../src/patrol';
const route=[{x:-16,z:7},{x:-14.5,z:8.5}] as const,far={x:0,z:16};

test('engineering graph routes both patrol endpoints to watch and returns through the safe junction',()=>{
  assert.deepEqual(engineeringPath(route[0]),['patrol','junction','watch']);
  assert.deepEqual(engineeringPath(route[1]),['junction','watch']);
  assert.deepEqual(engineeringPath({x:-14.6,z:10.8},'junction'),['watch','junction']);
});
test('watch holds at diagnostics; visitor/conversation yield preserves task and route; reset starts return',()=>{
  const p={x:-14.6,z:10.8},original=freshPatrol();
  const watching=planEngineeringDuty(null,original,p,route,far,1/60,true);
  assert.equal(watching.state.mode,'inspecting');assert.deepEqual(watching.displacement,{x:0,z:0});
  const stopped=planEngineeringDuty(watching.duty,watching.state,p,route,{x:p.x,z:p.z+1},1/60,true);
  assert.equal(stopped.state.mode,'attending');assert.deepEqual(stopped.duty?.path,watching.duty?.path);
  const speaking=planEngineeringDuty(stopped.duty,stopped.state,p,route,far,1/60,true,true);assert.equal(speaking.state.mode,'attending');
  const resumed=planEngineeringDuty(speaking.duty,speaking.state,p,route,far,1/60,true);assert.equal(resumed.state.mode,'inspecting');
  const returning=planEngineeringDuty(resumed.duty,resumed.state,p,route,far,1/60,false);
  assert.equal(returning.duty?.phase,'return');assert.equal(returning.state.mode,'patrolling');assert.ok(returning.displacement.z<0);
  const retripped=planEngineeringDuty(returning.duty,returning.state,p,route,far,1/60,true);assert.equal(retripped.duty?.phase,'watch');
  assert.deepEqual(original,freshPatrol(),'task planning does not mutate the saved patrol goal');
});
test('blocked task pauses and replans without teleporting or dropping the emergency goal',()=>{
  let duty=planEngineeringDuty(null,freshPatrol(),route[0],route,far,1/60,true).duty!;
  for(let i=0;i<121;i++)duty=recordDutyMovement(duty,.01,0,1/60,route[0]);
  assert.equal(duty.phase,'watch');assert.ok(duty.retry>0);
  const paused=planEngineeringDuty(duty,freshPatrol(),route[0],route,far,1/60,true);assert.deepEqual(paused.displacement,{x:0,z:0});
  assert.equal(recordDutyMovement({...duty,blocked:1},.01,.01,1/60,route[0]).blocked,0);
});
test('Rapier duty traverses engineering consoles, holds watch and returns to normal patrol',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(4,.15,7).setTranslation(-15,-.15,7));
  for(const [x,z] of [[-16,10],[-13.5,11.7]])world.createCollider(RAPIER.ColliderDesc.cuboid(.9,.55,.5).setTranslation(x,.55,z));
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-16,.94,7));
  const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.67,.24),body),controller=world.createCharacterController(.015);controller.enableSnapToGround(.2);controller.enableAutostep(.25,.2,true);
  let state=freshPatrol(),duty:EngineeringDuty|null=null,inspected=false,returned=false;
  for(let i=0;i<1500;i++){
    const p=body.translation(),plan=planEngineeringDuty(duty,state,p,route,far,1/60,i<700);state=plan.state;duty=plan.duty;
    controller.computeColliderMovement(collider,{...plan.displacement,y:-.2/60});const m=controller.computedMovement();
    const intended=Math.hypot(plan.displacement.x,plan.displacement.z),actual=intended>0?Math.max(0,(m.x*plan.displacement.x+m.z*plan.displacement.z)/intended):0;
    if(duty)duty=recordDutyMovement(duty,intended,actual,1/60,p);
    body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
    assert.ok(body.translation().y>.88&&body.translation().y<1,'duty stays grounded');
    if(state.mode==='inspecting'){inspected=true;assert.ok(Math.hypot(p.x+14.6,p.z-10.8)<.12);}
    if(i>700&&!duty){returned=true;assert.ok(p.z<8.7,'return clears relay before patrol resumes');}
  }
  assert.ok(inspected);assert.ok(returned);world.free();
});
